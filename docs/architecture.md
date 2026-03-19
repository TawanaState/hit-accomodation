# System Architecture

## Overview
The HIT Student Accommodation Portal is currently built using a serverless architecture relying heavily on Firebase for authentication, database, and backend logic, with Next.js serving as the frontend and API layer. The system manages student accommodation applications, room allocations, payments, and administrative functions.

## High-Level System Design

1. **Frontend**: Next.js 14 (App Router) with React 18, utilizing Tailwind CSS and shadcn/ui for components.
2. **Backend/API Layer**: Next.js API Routes (`app/api/`) serve as a lightweight middleware for specific tasks like checking payment deadlines (`/api/check-payment-deadlines`) and saving published lists (`/api/savePublishedLists`). The majority of data fetching and mutation is done directly from the client or server components to Firebase.
3. **Database**: Firebase Firestore is used as the primary database, storing collections for `users`, `students`, `applications`, `hostels`, `roomAllocations`, `payments`, and `settings`.
4. **Authentication**: Firebase Auth provides secure login, supporting Google OAuth and potentially Email/Password.
5. **Infrastructure**: The application is containerized using Docker (`Dockerfile`, `docker-compose.yaml`), which includes the main Next.js app and a separate `payment-checker` service.

## Project Structure

- `/app`: Next.js App Router containing pages, layouts, and API routes.
  - `/api`: Next.js API routes acting as middleware.
  - `/(dashboard)`: Dashboard views for students and admins.
- `/components`: Reusable React components, including generic UI (`/ui`) and feature-specific components (`/room-selection`, etc.).
- `/data`: Contains modules for interacting with Firestore. This layer abstracts direct database calls (e.g., `hostel-data.ts`, `payment-data.ts`, `firebase-data.ts`).
- `/hooks`: Custom React hooks for state management and data fetching (e.g., `useAuth.ts`, `useStudentAllocation.ts`).
- `/lib`: Utility files, including Firebase initialization (`firebase.ts`).
- `/types`: TypeScript interfaces for the domain models (e.g., `hostel.ts`).

## Core Services and Responsibilities

- **Authentication Service (`hooks/useAuth.ts`)**: Manages user sessions, authenticates via Firebase Auth, and manages roles by verifying user documents in Firestore (`users` collection).
- **Application Management (`data/firebase-data.ts`)**: Handles submitting, reading, and updating student applications for accommodation.
- **Hostel & Room Management (`data/hostel-data.ts`)**: Manages the hierarchy of Hostels -> Floors -> Rooms. Handles real-time availability, capacities, and constraints.
- **Room Allocation Service (`data/hostel-data.ts`)**: Manages assigning students to rooms, handling concurrent allocations (via Firestore transactions), and tracking payment deadlines.
- **Payment Processing (`data/payment-data.ts`)**: Tracks student payments, links them to room allocations, and provides admin approval workflows.
- **Automated Jobs (`app/api/check-payment-deadlines`)**: A scheduled service (run via Docker cron) that checks for overdue payments and revokes room allocations if necessary.

## Frontend to Firebase Relationship

The system primarily follows a "Client-to-Database" pattern with some "Server-to-Database" (via Server Components/API routes):

1. **Direct Firestore Access**: The frontend components call functions in the `/data` directory, which use the Firebase Client SDK to directly query and mutate Firestore data.
2. **Transactions**: Critical operations, such as creating a hostel or allocating a room, utilize Firestore Transactions to prevent race conditions and ensure data consistency.
3. **Authentication State**: The frontend listens to Firebase Auth state changes (`onAuthStateChanged`) and syncs it with a local React context/hook (`useAuth`).
4. **Middleware Bypass**: For most CRUD operations, there is no traditional Node.js/Express middleware. The Next.js API routes are reserved for tasks that require server-side execution (like saving files to the filesystem or scheduled cron jobs).