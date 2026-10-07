export type SplitId =
  | 'pull_a'
  | 'legs_a'
  | 'push_a'
  | 'pull_b'
  | 'legs_b'
  | 'push_b'
  | 'rest';

export interface PrescribedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
  isMajorLift?: boolean;
}

export interface SplitDayDefinition {
  splitId: SplitId;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  dayName: string;
  title: string;
  subtitle: string;
  exercises: PrescribedExercise[];
}

export interface LoggedSet {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number;
  reachedFailure: boolean;
  restTimeSeconds: number;
  completed: boolean;
  completedAt?: string;
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
  skipped: boolean;
  isCustom?: boolean;
  notes: string;
  sets: LoggedSet[];
}

export interface WorkoutSessionRecord {
  uid: string;
  sessionId: string;
  dayNumber: number; // 1 to 100
  sessionNumber: number;
  date: string; // YYYY-MM-DD
  splitId: SplitId;
  splitName: string;
  status: 'in_progress' | 'completed';
  totalVolume: number;
  prCount: number;
  durationSeconds: number;
  notes: string;
  exercises: LoggedExercise[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfileRecord {
  uid: string;
  startDate: string; // YYYY-MM-DD (Day 1)
  startingWeight: number;
  targetWeight: number;
  weightUnit: 'kg' | 'lbs';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BodyMetricRecord {
  uid: string;
  logId: string; // YYYY-MM-DD
  dayNumber: number;
  date: string; // YYYY-MM-DD
  bodyweight: number;
  waist: number;
  chest: number;
  arm: number;
  thigh: number;
  sleepHours: number;
  steps: number;
  calories: number;
  protein: number;
  photoDataUrl: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExercisePRSummary {
  exerciseId: string;
  exerciseName: string;
  heaviestWeight: number;
  heaviestWeightReps: number;
  heaviestWeightDate: string;
  bestEstimated1RM: number;
  best1RMWeight: number;
  best1RMReps: number;
  best1RMDate: string;
  bestVolume: number;
  bestVolumeDate: string;
  maxRepsByWeight: Record<string, { reps: number; date: string }>;
}

export interface SetComparisonTag {
  label: string;
  type:
    | 'pr'
    | 'beat_previous'
    | 'increased_weight'
    | 'increased_reps'
    | 'matched'
    | 'top_of_range'
    | 'decreased_reps'
    | 'neutral';
}
