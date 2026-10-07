/**
 * Firestore Security Rules Test Suite — "Dirty Dozen" Verification
 */
export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof',
    collection: '/users/user_a',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: false },
    payload: { uid: 'user_a', startDate: '2026-10-07', startingWeight: 80, targetWeight: 75, weightUnit: 'kg' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant Read/List',
    collection: '/users/user_b/workouts',
    operation: 'list',
    auth: { uid: 'user_a', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Create',
    collection: '/users/user_a/workouts/sess_1',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { uid: 'user_b', sessionId: 'sess_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Orphaned Subcollection Write without Parent User Doc',
    collection: '/users/user_no_profile/workouts/sess_1',
    operation: 'create',
    auth: { uid: 'user_no_profile', email_verified: true },
    payload: { uid: 'user_no_profile', sessionId: 'sess_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Create',
    collection: '/users/user_a',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { uid: 'user_a', startDate: '2026-10-07', startingWeight: 80, targetWeight: 75, weightUnit: 'kg', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on Update',
    collection: '/users/user_a/workouts/sess_1',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    payload: { hacked: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Field Mutation (createdAt)',
    collection: '/users/user_a/workouts/sess_1',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Mutation (uid)',
    collection: '/users/user_a/metrics/2026-10-07',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    payload: { uid: 'user_b' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    collection: '/users/user_a/workouts/sess_1',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z', updatedAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Denial-of-Wallet String Overflow',
    collection: '/users/user_a/workouts/sess_1',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { notes: 'x'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded Array Poisoning',
    collection: '/users/user_a/workouts/sess_1',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { exercises: new Array(50).fill({}) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'ID Poisoning Attack',
    collection: '/users/user_a/workouts/invalid$id!@#',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    payload: { sessionId: 'invalid$id!@#' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
