# Schema Mapping (WIP MongoDB Migration)

## Overview
The application is currently migrating from a NoSQL document model (Firebase Firestore) to a relational-like model using MongoDB and Mongoose. Below is the reverse-engineered schema representing the core collections and their inferred TypeScript interfaces from Firebase, along with notes on the ongoing MongoDB migrations.

**[WIP] New Feature: Sessions**
In the new MongoDB schema, a `Session` model has been introduced to track academic years or terms. This prevents the need to clear the database at the start of every new term. `Application`, `Allocation`, and `Payment` models now all carry a `session` ObjectId reference. This is a work in progress and requires changes across the UI and data layers to fully implement filtering by active session.

## 1. Users Collection (`users`)
Stores authentication and role data.
- **Firebase Status**: Maps an authenticated `uid` to a system role (`user` or `admin`).
- **MongoDB Status**: Migrated to `models/User.ts`. Uses `firebaseUid` field.

## 2. Students Collection (`students`)
Stores student profiles, often fetched by their registration number.
- **Key Access**: Document ID is typically the student's registration number (e.g., `HIT1234`).
- **MongoDB Status**: TBD. Currently handled by generic User models or left external.

## 3. Applications Collection (`applications`)
Stores student accommodation applications.
- **Key Access**: Document ID is the student's registration number.
- **MongoDB Status**: Migrated to `models/Application.ts`.
- **WIP Change**: Now references a `Session` (`ObjectId`). Added compound index `{ regNumber: 1, session: 1 }` to enforce one application per session per student.

## 4. Hostels Collection (`hostels`)
Stores the hierarchy of hostels, floors, and rooms.
- **Firebase Status**: The `floors` array contains `rooms` arrays.
- **MongoDB Status**: Migrated to `models/Hostel.ts` and `models/Room.ts`.
- **WIP Change**: Normalized. `Hostel` documents contain `floors` (just metadata), while `Room` documents are independent and reference a `Hostel` and a specific `floor` via `ObjectId`.

## 5. Room Allocations Collection (`roomAllocations`)
Tracks which student is assigned to which room, bridging the `students` and `hostels` collections.
- **MongoDB Status**: Migrated to `models/Allocation.ts`.
- **WIP Change**: Now references a `Session` (`ObjectId`). Added compound index `{ studentRegNumber: 1, session: 1 }`. References normalized `Room` and `Hostel` objects.

## 6. Payments Collection (`payments`)
Stores payment submissions and their review status.
- **MongoDB Status**: Migrated to `models/Payment.ts`.
- **WIP Change**: Now references a `Session` (`ObjectId`) alongside the `Allocation`.

## 7. Settings Collection (`settings`)
Stores global application settings.
- **MongoDB Status**: TBD. May be folded into `Session` objects or kept as global singletons.
