# Security Specification — 100-Day Bodybuilding Transformation Tracker

## 1. Data Invariants

1. **Identity Isolation & Ownership**: Every document under `/users/{userId}`, `/users/{userId}/workouts/{sessionId}`, and `/users/{userId}/metrics/{logId}` belongs exclusively to `userId` (`request.auth.uid == userId`) and requires `request.auth.token.email_verified == true`.
2. **Master Gate Relational Sync**: Subcollections (`workouts` and `metrics`) verify that the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`) and that `incoming().uid == userId`.
3. **Immutable Fields**: `uid`, `createdAt`, `sessionId`, and `logId` cannot be altered on update.
4. **Temporal Integrity**: `createdAt` must equal `request.time` on `create`, and `updatedAt` must equal `request.time` on both `create` and `update`.
5. **Bounded Arrays & Strings**: `exercises` array in `WorkoutSession` is bounded to `size() <= 20`. All string fields enforce strict `.size()` limits and regex validation where applicable.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create `/users/{userId}`.
2. **Cross-Tenant Read/List**: User A (`uid: "user_a"`) attempting to `get` or `list` `/users/user_b/workouts`.
3. **Identity Spoofing on Create**: User A creating `/users/user_a/workouts/sess_1` with payload `uid: "user_b"`.
4. **Orphaned Subcollection Write**: User A creating `/users/user_a/workouts/sess_1` before `/users/user_a` parent document exists.
5. **Shadow Field Injection on Create**: Creating `/users/user_a` with an undeclared field `isAdmin: true`.
6. **Shadow Field Injection on Update**: Updating `/users/user_a/workouts/sess_1` with an extra field `hacked: "yes"` not in `affectedKeys().hasOnly(...)`.
7. **Immutable Field Mutation (`createdAt`)**: Updating `/users/user_a/workouts/sess_1` with a modified `createdAt` timestamp.
8. **Immutable Field Mutation (`uid`)**: Updating `/users/user_a/metrics/2026-10-07` with a modified `uid`.
9. **Client Timestamp Forgery**: Creating a workout where `createdAt` or `updatedAt` is a forged past/future timestamp instead of `request.time`.
10. **Denial-of-Wallet String Overflow**: Submitting a `notes` string of 50,000 characters on `WorkoutSession` (exceeding max 1000).
11. **Unbounded Array Poisoning**: Submitting an `exercises` array with 100 items on `WorkoutSession` (exceeding max 20).
12. **ID Poisoning Attack**: Creating a workout document with a 500-character ID or invalid special characters outside `^[a-zA-Z0-9_\-]+$`.
