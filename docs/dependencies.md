# Firebase Locked Dependencies

## Overview
This document outlines the critical libraries in the current project (`package.json`) that are fundamentally tied to the Firebase ecosystem, and thus will need to be replaced, refactored, or carefully managed during the transition to MongoDB.

## 1. Firebase Client SDK
- **Package**: `firebase` (`^11.2.0`)
- **Usage**: Core library used extensively across the frontend for authentication, reading/writing to Firestore, and managing local Firebase state.
- **Replacement Strategy**: Will be entirely removed. This touches almost every file in `/data`, `/hooks/useAuth.ts`, and direct imports in various components (`components/room-selection.tsx`, etc.). Will likely be replaced by `mongodb` on the server and an API layer (or tRPC) for the client.

## 2. Authentication Context Providers
While the application does not explicitly rely on a third-party React-Firebase binding (e.g., `react-firebase-hooks`), it builds its own custom auth hooks (`hooks/useAuth.ts`) that heavily depend on Firebase Auth methods (`onAuthStateChanged`, `signInWithPopup`, `GoogleAuthProvider`, `signOut`).
- **Replacement Strategy**: Will need to be swapped with a robust authentication solution like `Auth.js` (NextAuth), `Clerk`, or a custom JWT implementation.

## 3. Storage and Files
- Although `firebase-admin` is not listed in `package.json`, there is an implied reliance on Firebase Storage for image uploads based on type definitions (e.g., `attachments?: string[]` for payments, `images?: string[]` for hostels).
- **Replacement Strategy**: The image hosting will need to migrate to AWS S3, Cloudinary, or Vercel Blob, as MongoDB only stores references (URLs), not large binary data efficiently.

## 4. Implicit Real-time Expectations
The UI and hooks currently expect data to be fetched and updated synchronously on the client, relying on Firebase's optimistic updates and transactional nature.
- **Replacement Strategy**: The frontend will need a robust state-management library that handles cache invalidation and optimistic updates. Currently, `react-query` (`^3.39.3`) is installed and can be expanded to fill the void left by Firebase's direct data fetching patterns.

## 5. Potential Animation Triggers
- **Packages**: `framer-motion` (`^11.17.0`), `tailwindcss-animate` (`^1.0.7`)
- While not explicitly tied to Firebase, components utilizing these animation libraries often trigger based on state changes (e.g., successful room allocation, authentication state loading). During the migration, the timing of these state changes will shift from Firebase client-side promises to standard HTTP fetch requests. This should be monitored to ensure animations don't break due to longer or differently-structured loading states.