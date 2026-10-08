export type SplitId =
  | 'custom'
  | 'pull_a'
  | 'legs_a'
  | 'push_a'
  | 'pull_b'
  | 'legs_b'
  | 'push_b'
  | 'rest';

export type FitnessGoal =
  | 'muscle_gain'
  | 'weight_gain'
  | 'fat_loss'
  | 'hypertrophy'
  | 'strength'
  | 'general_fitness'
  | 'body_recomposition';

export type WorkoutMode = 'gym' | 'home';
export type PhysiqueFocus =
  | 'aesthetic_physique'
  | 'maximum_muscle_development'
  | 'strength'
  | 'balanced_athletic';
export type PhysiquePriority =
  | 'shoulders'
  | 'upper_chest'
  | 'back_v_taper'
  | 'arms'
  | 'legs'
  | 'balanced';
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseRecommendationLabel =
  | 'Excellent match'
  | 'Strong match'
  | 'Good match'
  | 'Suitable option';
export type TrainingGoalSuitability = Record<FitnessGoal, number>;

export interface PrescribedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
  notes?: string;
  isMajorLift?: boolean;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: string;
  alternativeExerciseIds: string[];
  bodyParts: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  trainingModes: WorkoutMode[];
  movementPattern: string;
  difficulty: ExerciseDifficulty;
  recommendedRepRange: { min: number; max: number };
  recommendedSets: number;
  recommendedRestSeconds: number;
  hypertrophySuitability: number;
  strengthSuitability: number;
  shortDescription: string;
  setup: string;
  execution: string;
  formCues: string[];
  commonMistakes: string[];
  progression: string;
  regression: string;
  evidenceSummary: string;
  recommendationFactors: {
    rangeOfMotion: number;
    stability: number;
    progressiveOverload: number;
    resistanceProfile: number;
    practicality: number;
    difficulty: number;
    fatigueCost: number;
    technicalComplexity: number;
  };
  goalSuitability: TrainingGoalSuitability;
}

export interface ProgramExerciseSelection {
  exerciseId: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
  order?: number;
  notes?: string;
}

export interface UserProgramDay {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  dayName: string;
  isRestDay: boolean;
  name: string;
  bodyParts: string[];
  exercises: ProgramExerciseSelection[];
}

export interface UserProgramRecord {
  uid: string;
  programId: string;
  split?: string;
  version?: number;
  goal: FitnessGoal;
  workoutMode: WorkoutMode;
  status: 'draft' | 'active';
  days: UserProgramDay[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExerciseRecommendationProfile {
  goal: FitnessGoal;
  physiqueFocus: PhysiqueFocus;
  workoutMode: WorkoutMode;
  availableEquipment: string[];
  physiquePriorities: PhysiquePriority[];
  programDays: UserProgramDay[];
  selectedDayOfWeek: UserProgramDay['dayOfWeek'];
}

export interface ExerciseRecommendationScore {
  exercise: ExerciseDefinition;
  score: number;
  programmingScore: number;
  personalizationScore: number;
  priorityScore: number;
  equipmentScore: number;
  label: ExerciseRecommendationLabel;
  isForYou: boolean;
}

export interface PersonalizationPreferences {
  goal: FitnessGoal;
  physiqueFocus: PhysiqueFocus;
  availableEquipment: string[];
  physiquePriorities: PhysiquePriority[];
  workoutMode?: WorkoutMode;
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
  name?: string;
  email?: string;
  photoURL?: string;
  goal?: FitnessGoal;
  workoutMode?: WorkoutMode;
  physiqueFocus?: PhysiqueFocus;
  availableEquipment?: string[];
  physiquePriorities?: PhysiquePriority[];
  onboardingCompleted?: boolean;
  programId?: string;
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
