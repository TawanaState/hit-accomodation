# Phase 5 Migration Plan: Final Cutover & Cleanup

**Goal:** Remove all traces of Firebase, adopt the new MongoDB architecture, implement `session` context across components, ensure the automated cron job works, and guarantee system stability and maintainability.

## Strategy
This plan categorizes the remaining work into distinct stages. Because `components` contains many files deeply tied to Firebase, they have been grouped logically. Each task must be addressed independently, ensuring to replace Firebase queries with centralized API/service calls mapped to our MongoDB schema (especially incorporating the `session` logic).

### Task 5.1: API & Automated Jobs Refactoring
- **5.1.1 Refactor Automated Payment Checker**
  - **Action:** Refactor `app/api/check-payment-deadlines/route.ts` to query MongoDB (`models/Allocation.ts`, `models/Payment.ts`, etc.) instead of Firestore.
  - **Action:** Remove all Firebase imports (`lib/firebase`, `firebase/firestore`).
  - **Testing Strategy:** Manually trigger the cron job API endpoint and verify it correctly identifies and revokes overdue allocations in MongoDB.

### Task 5.2: Shared State & Session Context
- **5.2.1 Introduce Session Context**
  - **Action:** Create a `SessionContext` (or use Zustand/Redux if already present) to globally manage the active academic session.
  - **Action:** Update the UI layout to include a Session Selector for Admins, and automatically apply the "Active" session for Students.
  - **Testing Strategy:** Ensure that switching sessions updates the context value correctly.

### Task 5.3: Refactor Core Application & Profile Components
- **Action:** Refactor the following components and pages to replace Firebase queries with API calls mapped to MongoDB, respecting the active `session`.
  - `components/student-application.tsx`
  - `components/student-profile.tsx`
  - `components/applications.tsx`
  - `app/(dashboard)/layout.tsx`
  - `app/countdown/page.tsx`
- **Goal:** Switch profile, application, and layout/countdown (settings) reading/writing to MongoDB endpoints. Ensure applications are strictly bound to a session.

### Task 5.4: Refactor Room Selection & Allocation Management
- **Action:** Refactor the following components and pages to interact with the new normalized `Room` and `Hostel` MongoDB schema via API routes.
  - `components/room-selection.tsx`
  - `components/room-selection/current-allocation-card.tsx`
  - `components/accepted.tsx`
  - `components/archived.tsx`
  - `app/(dashboard)/student/room-selection/page.tsx`
- **Goal:** Replace complex Firebase transaction and query logic for room availability and allocation with robust backend API equivalents.

### Task 5.5: Refactor Payment Management Components
- **Action:** Refactor the following components to use MongoDB payment records.
  - `components/student-payment-management.tsx`
  - `components/admin-payment-management.tsx`
  - `components/payment-modal.tsx`
- **Goal:** Migrate payment proofs and review statuses to MongoDB. Update references to use ObjectIds appropriately for allocations and sessions.

### Task 5.6: Refactor Admin & System Management Components
- **Action:** Refactor administrative components and pages to support the new normalized database structure.
  - `components/admin-hostel-management.tsx`
  - `components/accounts-management.tsx`
  - `components/settings.tsx`
  - `components/activity-logs.tsx`
  - `app/(dashboard)/admin/reports/page.tsx`
- **Goal:** Ensure hostel creation, settings management, activity logging, and report generation function entirely without Firebase.

### Task 5.7: Data Layer Cleanup
- **5.7.1 Refactor/Remove Firebase Data Utilities**
  - **Action:** Refactor `data/firebase-data.ts`, `data/firebase-student-data.ts`, `data/hostel-data.ts`, and `data/payment-data.ts` to become pure API wrappers (e.g., `services/hostel.service.ts`), entirely decoupled from Firebase.
  - **Action:** Delete `lib/firebase.ts` once all dependent files are migrated.

### Task 5.8: Final Purge & System Validation
- **5.8.1 Uninstall Firebase**
  - **Action:** Run `npm uninstall firebase`.
  - **Action:** Search the entire codebase (`grep -rnw -e 'firebase'`) to ensure no lingering imports or references exist.
- **5.8.2 Final Linting & Pre-commit**
  - **Action:** Run linting, type checking, and format code. Address any warnings or errors.
- **5.8.3 End-to-End Testing**
  - **Action:** Run a full application build (`npm run build`). Perform a comprehensive end-to-end manual test of the entire platform (Login -> Apply -> Allocate Room -> Submit Payment -> Admin Review) targeting the local MongoDB instance.

## Execution Rules
- Never break existing functionality; always provide a fallback or ensure the MongoDB equivalent is fully tested before swapping.
- Aggressively test workflows, assume errors, and create proper guard rails. Ensure high performance, well-commented code, good error handling (with console logs), and highly modular code.
