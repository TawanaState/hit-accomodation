# System Migration Plan: Firebase to MongoDB & NextAuth

## 1. Executive Summary & System Analysis

This document outlines the comprehensive strategy and step-by-step execution plan to migrate the HIT Student Accommodation Portal from a heavily coupled Firebase architecture (Firestore, Firebase Auth) to a robust, self-hosted Next.js application utilizing MongoDB (via Mongoose), NextAuth.js for authentication, and Docker-backed local storage for file management.

### 1.1 Current Architecture Analysis

The existing system is deeply intertwined with Firebase across the stack:
*   **Database (Firestore):** A schema-less NoSQL database utilizing deep sub-collections (e.g., `hostels -> floors -> rooms`). This structure is difficult to query globally and poses limits on document sizes.
*   **Authentication (Firebase Auth):** Manages user sessions, heavily relying on `onAuthStateChanged` and `signInWithPopup` (Google Auth). Role management is handled by cross-referencing a `users` collection in Firestore.
*   **Data Fetching:** The frontend heavily utilizes direct client-to-database calls via the Firebase JS SDK (e.g., `getDocs`, `setDoc`, `runTransaction`). This skips the traditional backend middleware layer, putting business logic in the client/React hooks.
*   **File Storage:** Implied use of external storage for images and attachments.
*   **Automated Jobs:** A standalone Docker container (`rez-payment-checker`) runs a cron job hitting an API route to check payment deadlines, bridging serverless and containerized paradigms.

### 1.2 Identified Risks, Falling States & Breakage Points

*   **Data Synchronization:** Moving from real-time optimistic updates (Firebase) to standard HTTP requests introduces the risk of stale data if caching (React Query) is not aggressively invalidated.
*   **Transaction Integrity:** Firestore's `runTransaction` handles concurrent room bookings. Transitioning to MongoDB requires replica sets (which Docker simplifies) to use Mongoose transactions, otherwise race conditions *will* occur during peak booking periods.
*   **Authentication State:** Migrating active user sessions is impossible; users will need to re-authenticate. The NextAuth `SessionProvider` must cleanly replace the custom `useAuth` hook without breaking conditional renders (`role === 'admin'`).
*   **Deep Nested Queries:** Existing UI components expect a deeply nested hostel structure. Refactoring this into normalized Mongoose models (Hostel -> Floor -> Room) requires significant data transformation in the API layer before sending it to the client to avoid breaking the UI.
*   **Admin Handling Breakage:** Currently, an admin is just a user document with `role: 'admin'`. If the new auth flow fails to sync the NextAuth profile with the MongoDB `users` collection upon first login, admins will lose access to the dashboard.

---

## 2. Target Architecture

*   **Database:** MongoDB running in a Docker container.
*   **ORM/ODM:** Mongoose for strict schema enforcement, validation, and managing relationships.
*   **Authentication:** NextAuth.js configured with Google Provider (and potentially Credentials provider if required later). Session strategy will be JWT.
*   **API Layer:** Next.js 14 Server Actions (for mutations/form submissions) and standard API Routes (`app/api/...`) or Server Components (for data fetching). This provides a fast, efficient, and secure barrier between the client and the database.
*   **File Storage:** Local file system mapped to a Docker volume for persistent storage of user uploads (receipts, hostel images).

---

## 3. Phased Execution Guide & Task Breakdown

This migration is divided into isolated, testable jobs to ensure system stability throughout the process.

### Phase 1: Infrastructure & Foundation (The "Setup")

**Goal:** Establish the new environment without breaking the existing Firebase implementation.

*   **Task 1.1: Dockerize MongoDB & Storage Volumes**
    *   **Action:** Update `docker-compose.yaml` to include a `mongodb` service (image: `mongo:latest`) with persistent volumes. Create a volume mapping for file uploads (e.g., `./uploads:/app/uploads`).
    *   **Testing Strategy:** Run `docker-compose up -d mongodb`. Connect using a tool like MongoDB Compass to ensure the database is accessible and persistent across container restarts. Check if the `/uploads` directory is accessible by the Next.js container.
*   **Task 1.2: Implement Mongoose Connection**
    *   **Action:** Install `mongoose`. Create `lib/mongodb.ts` containing the connection logic, ensuring it handles hot-reloading in development (caching the connection).
    *   **Testing Strategy:** Create a temporary API route (`/api/health-db`) that connects to MongoDB and returns a success status. Call it to verify the connection.
*   **Task 1.3: Define Mongoose Schemas**
    *   **Action:** Translate the schema definitions from `docs/schema_mapping.md` into strict Mongoose models (`models/User.ts`, `models/Hostel.ts`, `models/Room.ts`, `models/Application.ts`, `models/Allocation.ts`, `models/Payment.ts`).
    *   **Crucial Detail:** Normalize `Hostels` and `Rooms`. Rooms should reference their parent Hostel via `Schema.Types.ObjectId`.
    *   **Testing Strategy:** Write a simple script (e.g., `scripts/seed-test.js`) that uses the models to insert dummy data into MongoDB and verify schema validation catches errors (e.g., missing required fields, wrong data types).

### Phase 2: Authentication Migration

**Goal:** Replace Firebase Auth with NextAuth.js.

*   **Task 2.1: NextAuth Configuration**
    *   **Action:** Install `next-auth`. Create `app/api/auth/[...nextauth]/route.ts`. Configure the Google Provider using environment variables.
    *   **Testing Strategy:** Verify the NextAuth sign-in page loads at `/api/auth/signin`.
*   **Task 2.2: Implement MongoDB Adapter & Role Management**
    *   **Action:** Install `@next-auth/mongodb-adapter`. Configure it in the NextAuth options. Crucially, customize the NextAuth `callbacks` (specifically `signIn` and `jwt`/`session`) to query the Mongoose `User` model to attach the `role` to the session object. If a user logs in for the first time, create their document with a default `user` role.
    *   **Testing Strategy:** Log in using a Google account. Verify in MongoDB Compass that a user document was created. Verify the session object returned by NextAuth includes `user.role`.
*   **Task 2.3: Replace `useAuth` Hook & Protect Routes**
    *   **Action:** Refactor `hooks/useAuth.ts` to wrap NextAuth's `useSession`. Replace Firebase imports with NextAuth imports across all components. Update Next.js Middleware (`middleware.ts`) to protect `/admin` and `/student` routes based on the NextAuth token role.
    *   **Testing Strategy:** Log in as a standard user. Attempt to access `/admin` and ensure redirection to an unauthorized page or dashboard. Manually change the role to `admin` in MongoDB and verify access is granted upon token refresh.

### Phase 3: Data Layer Abstraction & API Construction

**Goal:** Move all direct Firebase calls to Next.js API Routes or Server Actions.

*   **Task 4.1: Abstract Application Data**
    *   **Action:** Create Mongoose queries to replace `fetchAllApplications`, `updateApplicationStatus`, etc., in `data/firebase-data.ts`. Wrap these in Next.js Server Actions or API routes (`/api/applications`).
    *   **Testing Strategy:** Use Postman/Thunder Client to hit the new API endpoints. Verify data matches the expected Mongoose schema. Ensure the UI correctly displays the data fetched from the new endpoints.
*   **Task 4.2: Abstract Hostel & Room Data (The Hardest Part)**
    *   **Action:** This requires translating deeply nested Firestore queries into relational MongoDB queries (using `.populate()`). Create API routes (`/api/hostels`) to serve the normalized data in the structure the UI expects, or refactor the UI to handle flat arrays of rooms.
    *   **Testing Strategy:** Thoroughly test the UI rendering of the Hostel Selection screen. Ensure filtering (by gender, price, floor) works correctly using Mongoose query operators.
*   **Task 4.3: Implement Transactional Room Allocation**
    *   **Action:** Refactor `allocateRoom` to use a Mongoose Transaction (requires a MongoDB Replica Set, even a single-node one in Docker). This is critical to prevent double-booking. The transaction must check room capacity, update the room occupants, and create the Allocation document atomically.
    *   **Testing Strategy:** Write an automated test or script that attempts to allocate the same room for two different students simultaneously. Verify only one succeeds and the other receives a "Room full" error, confirming transaction integrity.

### Phase 4: File Storage Implementation

**Goal:** Replace implied cloud storage with a local Docker volume solution.

*   **Task 4.1: Create Upload API**
    *   **Action:** Implement an API route (`/api/upload`) that accepts `multipart/form-data`, saves the file to the mapped Docker volume (`/app/uploads`), and returns the local URL (e.g., `/uploads/filename.png`).
    *   **Testing Strategy:** Test uploading an image via the Next.js API route. Verify the file exists in the local filesystem and is accessible via the browser.
*   **Task 4.2: Refactor Payment & Hostel Forms**
    *   **Action:** Update the frontend forms that previously uploaded directly to Firebase Storage to use the new `/api/upload` endpoint and store the returned local URL string in the MongoDB document.

### Phase 5: Final Cutover & Cleanup

**Goal:** Remove all traces of Firebase and ensure the automated cron job works.

*   **Task 5.1: Update Automated Payment Checker**
    *   **Action:** Refactor `app/api/check-payment-deadlines/route.ts` to query MongoDB using Mongoose for expired allocations instead of Firestore.
    *   **Testing Strategy:** Manually trigger the cron job API endpoint and verify it correctly identifies and revokes overdue allocations in MongoDB.
*   **Task 5.2: Purge Firebase**
    *   **Action:** Run `npm uninstall firebase`. Delete `lib/firebase.ts` and any remaining files in the `data/` directory that have `firebase` in the name. Ensure the application compiles without errors.
    *   **Testing Strategy:** Run a full application build (`npm run build`). Perform a comprehensive end-to-end manual test of the entire platform (Login -> Apply -> Allocate Room -> Submit Payment -> Admin Review).

---

## 4. Key Considerations for Developers

*   **Mongoose Strictness:** We are moving to a strict schema. If the old Firebase data had inconsistent types (e.g., `price` as string sometimes, number others), Mongoose will throw errors during data migration scripts. We must write robust seeding/migration scripts that sanitize data.
*   **Local Caching:** Since we lose Firebase's automatic real-time listeners, we must heavily rely on `react-query`'s `invalidateQueries` functionality after every successful mutation (e.g., after allocating a room, invalidate the 'hostels' query to refresh available room counts).
*   **Docker Volumes:** Ensure the `uploads` volume has the correct permissions so the Node.js process inside the container can write to it.
