# Migration Strategy: Firebase to MongoDB

## Overview
This document outlines the transition roadmap for migrating the HIT Student Accommodation Portal from Firebase (Firestore/Auth) to a MongoDB-based architecture.

## 1. Database Shift: Firestore to MongoDB

### Schema Redesign
Firestore's document model with deep sub-collections (`hostels` -> `floors` -> `rooms`) is an anti-pattern for large-scale MongoDB queries and can lead to unbound document growth (the 16MB BSON limit). We must adopt a normalized approach.

- **Hostels Collection**: Store basic hostel metadata.
- **Rooms Collection**: Create a dedicated `rooms` collection. Each room document will store `hostelId`, `floorNumber`, and its attributes (`capacity`, `price`, `gender`, `isAvailable`, `occupants` array containing `studentRegNumber`).
- **Students & Applications**: Can be merged or kept separate. `applications` will reference `studentRegNumber`.
- **Allocations & Payments**: Dedicated collections referencing `studentRegNumber`, `roomId`, and `hostelId` via ObjectIds or string references.

### Data Fetching
- **Current**: Direct client-to-database queries using Firebase SDK.
- **Target**: Build robust Next.js API Routes (`app/api/`) or Server Actions to handle CRUD operations. Use `mongoose` or the native `mongodb` driver.
- **Client Cache**: Leverage the existing `react-query` to handle data fetching, caching, and optimistic UI updates on the frontend.

## 2. Authentication Strategy

### Shift from Firebase Auth
- **Current**: `hooks/useAuth.ts` uses `signInWithPopup`, `GoogleAuthProvider`, and listens to `onAuthStateChanged`. The `users` collection in Firestore dictates roles.
- **Target**: Implement **Auth.js (NextAuth)**.
  - **Providers**: Configure Google Provider to match existing functionality.
  - **Database Adapter**: Use the MongoDB Adapter so NextAuth automatically creates `users`, `accounts`, and `sessions` collections in MongoDB.
  - **Roles**: Embed role logic (`admin`, `user`) directly into the NextAuth callbacks (e.g., `jwt` and `session` callbacks), or fetch it from a `profiles` collection during session creation.

## 3. Critical Files Requiring Intensive Refactoring

The following files represent the highest risk and effort during the migration due to their deep integration with Firebase:

1. **`lib/firebase.ts`**: The core initialization file. Will be replaced by a `lib/mongodb.ts` connection utility.
2. **`hooks/useAuth.ts`**: Must be rewritten to use NextAuth's `useSession` hook.
3. **`data/hostel-data.ts`**: The most complex data logic. Every `getDocs`, `getDoc`, `setDoc`, `updateDoc`, and particularly `runTransaction` (used for `allocateRoom` and `changeRoomAllocation`) must be rewritten into server-side endpoints executing MongoDB atomic updates (e.g., `$push`, `$pull`, `$set`).
4. **`data/payment-data.ts`**: Similar to `hostel-data.ts`. Requires rewriting query logic to MongoDB aggregation pipelines or `.find()` methods exposed via an API.
5. **`components/room-selection.tsx`**: Heavy client-side logic handling room allocation. Needs to be refactored to call API endpoints instead of direct data functions.
6. **`app/api/check-payment-deadlines/route.ts`**: The automated cron job must swap `firebase-admin` logic for a MongoDB connection to query overdue `roomAllocations` and update statuses.

## 4. The "Clean-Up" Plan (Abstracting the Data Layer)

To minimize UI breakage and downtime, we will abstract the data layer in phases:

### Phase 1: Interface Isolation (Immediate)
- Ensure all components only rely on the strongly typed models defined in `types/hostel.ts`.
- The UI should not know if it's interacting with Firebase or MongoDB.

### Phase 2: API Wrapper Implementation
- Build a new set of data fetching functions (e.g., `data/api-client.ts`) that utilize `fetch()` or `axios` to hit generic endpoints.
- Map the existing function signatures in `data/hostel-data.ts` (e.g., `allocateRoom(regNumber, roomId, hostelId)`) to these new API wrappers.

### Phase 3: Server-Side Logic (The Backend)
- Develop the Next.js API routes (`app/api/hostels/route.ts`, `app/api/allocations/route.ts`) that connect to MongoDB and execute the required business logic.
- Ensure MongoDB transactions (using replica sets) are used to handle concurrent room allocations, mirroring the safety of Firestore transactions.

### Phase 4: Swap and Test
- Update the UI components to import from `data/api-client.ts` instead of `data/hostel-data.ts`.
- Run comprehensive integration tests to ensure data flows correctly from the UI, through the new API, into MongoDB.