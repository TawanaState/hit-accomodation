# Schema Mapping

## Overview
The application currently uses a NoSQL document model (Firebase Firestore). Below is the reverse-engineered schema representing the core collections and their inferred TypeScript interfaces.

## 1. Users Collection (`users`)
Stores authentication and role data.
- **Role**: Maps an authenticated `uid` to a system role (`user` or `admin`).
- **Schema**:
  ```typescript
  interface User {
    id: string; // Firebase UID
    displayName: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string; // ISO Date String
  }
  ```

## 2. Students Collection (`students`)
Stores student profiles, often fetched by their registration number.
- **Key Access**: Document ID is typically the student's registration number (e.g., `HIT1234`).
- **Schema**:
  ```typescript
  interface Student {
    regNumber: string; // Document ID
    name: string;
    gender: 'Male' | 'Female';
    programme: string;
    part: number;
    email: string;
    phone?: string;
  }
  ```

## 3. Applications Collection (`applications`)
Stores student accommodation applications.
- **Key Access**: Document ID is the student's registration number.
- **Hot Path**: High activity during application periods (reading/updating statuses).
- **Schema**:
  ```typescript
  interface Application {
    regNumber: string; // Document ID
    status: 'Pending' | 'Accepted' | 'Archived';
    submittedAt: string; // ISO Date String
    paymentStatus: string; // 'Not Paid', etc.
    reference: string;
  }
  // The frontend merges this with `Student` data to form an `Applications` type.
  ```

## 4. Hostels Collection (`hostels`)
Stores the hierarchy of hostels, floors, and rooms in a nested structure.
- **Complex Nested Structure**: The `floors` array contains `rooms` arrays. This is an anti-pattern for large-scale queries in Firestore but works here due to bounded sizes (few hostels).
- **Hot Path**: Read heavily by all students during room selection.
- **Schema**:
  ```typescript
  interface Room {
    id: string; // E.g., hostelId_floorId_roomNumber
    number: string;
    floor: string;
    floorName: string;
    hostelName: string;
    price: number;
    capacity: number;
    occupants: string[]; // Array of student registration numbers
    gender: 'Male' | 'Female' | 'Mixed';
    isReserved: boolean;
    reservedBy?: string;
    reservedUntil?: string; // ISO Date String
    isAvailable: boolean;
    features?: string[];
  }

  interface Floor {
    id: string;
    number: string;
    name: string;
    rooms: Room[]; // Sub-document array
  }

  interface Hostel {
    id: string; // Document ID
    name: string;
    description: string;
    totalCapacity: number;
    currentOccupancy: number;
    gender: 'Male' | 'Female' | 'Mixed';
    floors: Floor[]; // Sub-document array
    isActive: boolean;
    pricePerSemester: number;
    features: string[];
    images?: string[];
  }
  ```

## 5. Room Allocations Collection (`roomAllocations`)
Tracks which student is assigned to which room, bridging the `students` and `hostels` collections.
- **Hot Path**: Read frequently to check a student's current assignment and payment deadlines.
- **Schema**:
  ```typescript
  interface RoomAllocation {
    id: string; // Document ID
    studentRegNumber: string;
    roomId: string;
    hostelId: string;
    allocatedAt: string; // ISO Date String
    paymentStatus: 'Pending' | 'Paid' | 'Overdue';
    paymentDeadline: string; // ISO Date String
    semester: string;
    academicYear: string;
    paymentId?: string; // Reference to approved payment
  }
  ```

## 6. Payments Collection (`payments`)
Stores payment submissions and their review status.
- **Key Access**: Linked to a `studentRegNumber` and an `allocationId`.
- **Schema**:
  ```typescript
  interface Payment {
    id: string; // Document ID
    studentRegNumber: string;
    allocationId: string;
    receiptNumber: string;
    amount: number;
    paymentMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash' | 'Card' | 'Other';
    submittedAt: string; // ISO Date String
    status: 'Pending' | 'Approved' | 'Rejected';
    approvedBy?: string;
    approvedAt?: string; // ISO Date String
    rejectionReason?: string;
    attachments?: string[];
    notes?: string;
  }
  ```

## 7. Settings Collection (`settings`)
Stores global application settings.
- **Key Access**: Single document `hostelSettings` inside the `settings` collection.
- **Schema**:
  ```typescript
  interface HostelSettings {
    paymentGracePeriod: number; // Hours
    autoRevokeUnpaidAllocations: boolean;
    maxRoomCapacity: number;
    allowMixedGender: boolean;
    allowRoomChanges: boolean;
  }
  ```