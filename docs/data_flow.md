# Data Flow

## Overview
This document traces the data movement within the HIT Student Accommodation Portal, specifically focusing on Write and Read operations to the Firebase Firestore backend.

## Tracing a "Write" Operation: Student Room Allocation

1. **User Action (UI Component)**: A student clicks "Confirm Room Selection" in the UI (`components/room-selection.tsx`).
2. **Local Validation**: The component checks if the user is authenticated, has a valid registration number, and if a hostel is selected. It fetches the hostel ID and valid room ID.
3. **Service Layer Call**: The component calls `allocateRoom(regNumber, selectedRoom.id, selectedHostel)` from `data/hostel-data.ts`.
4. **Data Layer Validation (Firestore Reads)**:
   - `fetchHostelById(hostelId)` is called to retrieve the current hostel document from the `hostels` collection.
   - The room is verified within the hostel's `floors` -> `rooms` array.
   - It checks room availability (`isAvailable`, `occupants.length < capacity`).
5. **Business Logic & Timestamping**: The current time is recorded, and a payment deadline is calculated based on hostel settings (fetched via `fetchHostelSettings()`).
6. **Firestore Write (Transaction/Atomic Operations)**:
   - **Create Record**: An `addDoc` operation creates a new document in the `roomAllocations` collection containing `studentRegNumber`, `roomId`, `hostelId`, `allocatedAt`, `paymentStatus` (Pending), `paymentDeadline`, `semester`, and `academicYear`.
   - **Update Record**: An `updateDoc` operation is performed on the `hostels` document (`updateHostel(hostelId, updatedHostel)`) to append the `studentRegNumber` to the room's `occupants` array and update `isAvailable` if the room hits its capacity.
7. **UI Update**: After the async functions complete, a success toast is shown, and `loadHostels()` / `checkExistingAllocation()` are triggered to refresh the UI state.

## Tracing a "Write" Operation: Student Application

1. **User Action**: Student submits an application form.
2. **Service Layer Call**: Usually handled by a function in `data/firebase-data.ts` (or similar file handling applications).
3. **Firestore Write**: The data is sent via `setDoc` or `addDoc` to the `applications` collection, linking the student's registration number to their application details (name, gender, programme, status as "Pending").
4. **Subsequent Admin Review**: An admin updates the status by calling `updateApplicationStatus(regNumber, "Accepted")` which uses `updateDoc` on the specific document in the `applications` collection.

## Tracing a "Read" Operation: Fetching Hostels & Rooms

1. **UI Component Initialization**: `RoomSelection` component (`components/room-selection.tsx`) mounts.
2. **Data Fetching (One-Time Get)**: The `useEffect` hook triggers `loadHostels()`, which calls `fetchHostels()` from `data/hostel-data.ts`.
3. **Firestore Read**: `getDocs` is called on the `hostels` collection.
4. **Data Transformation**: The snapshot is mapped into an array of `Hostel` objects.
5. **Local State Update**: The `hostels` array is stored in the React state (`setHostels`).
6. **Filtering (Local)**: The `useRoomFiltering` hook filters the `hostels` list based on the user's selected filters (hostel, floor, price, search term, gender) locally in memory.

## Real-time Subscriptions (Snapshots) vs. One-Time Gets

The system currently relies predominantly on **One-Time Gets** rather than real-time subscriptions for its core data fetching.

### One-Time Gets (`getDoc`, `getDocs`):
- **Hostel Data**: Fetching all hostels (`fetchHostels`), fetching available rooms, getting specific hostel details.
- **Student Applications**: Fetching all applications (`fetchAllApplications`), fetching students.
- **Room Allocations**: Fetching student allocations (`fetchStudentAllocations`).
- **Payments**: Fetching pending, approved, or student-specific payments.
- **Settings**: Fetching hostel settings (`fetchHostelSettings`).

### Real-Time Subscriptions (`onAuthStateChanged`, `onSnapshot`):
- **Authentication**: `hooks/useAuth.ts` uses `onAuthStateChanged` to listen for real-time authentication state changes from Firebase Auth.
- **Firestore Snapshots**: The codebase primarily avoids `onSnapshot` for its general data layer, opting to re-fetch data manually after write operations (e.g., calling `loadHostels()` again after allocating a room).

*Note: Transitioning to MongoDB will require mimicking these "One-Time Gets" via API endpoints (or Server Actions/tRPC) and managing local cache invalidation (e.g., using React Query or SWR, which is already partly listed in dependencies).*