import {
  ExerciseDefinition,
  ExerciseDifficulty,
  ExerciseRecommendationProfile,
  ExerciseRecommendationScore,
  FitnessGoal,
  WorkoutMode,
} from '../types';
import {
  getBackResearchForExercise,
  getBackResearchSources,
} from './backExerciseResearch';
import {
  getChestResearchForExercise,
  getChestResearchSources,
} from './chestExerciseResearch';

const GOALS: FitnessGoal[] = [
  'muscle_gain',
  'weight_gain',
  'fat_loss',
  'hypertrophy',
  'strength',
  'general_fitness',
  'body_recomposition',
];

type ExerciseSeed = {
  id: string;
  name: string;
  category?: string;
  alternatives?: string[];
  bodyParts: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment: string[];
  trainingModes?: WorkoutMode[];
  movementPattern: string;
  difficulty?: ExerciseDifficulty;
  repRange?: [number, number];
  sets?: number;
  rest?: number;
  hypertrophy?: number;
  strength?: number;
  rangeOfMotion?: number;
  stability?: number;
  overload?: number;
  resistanceProfile?: number;
  practicality?: number;
  fatigueCost?: number;
  shortDescription?: string;
};

const HOME_EQUIPMENT = new Set([
  'Bodyweight',
  'Dumbbell',
  'Dumbbells',
  'Resistance Band',
  'Incline bench',
  'Flat bench',
  'Bench',
  'Pull-up bar',
  'Ab wheel',
  'Dip bars',
  'Dumbbell or kettlebell',
]);

const VALID_BODY_PARTS = new Set([
  'Chest', 'Upper Chest', 'Back', 'Lats', 'Upper Back', 'Shoulders',
  'Front Delts', 'Lateral Delts', 'Rear Delts', 'Biceps', 'Triceps',
  'Forearms', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abs/Core',
]);
const VALID_MUSCLES = new Set([
  'abdominals', 'adductors', 'biceps', 'brachialis', 'brachioradialis',
  'calves', 'chest', 'core', 'external rotators', 'forearm extensors',
  'forearms', 'front delts', 'gastrocnemius', 'glutes', 'gluteus medius',
  'gluteus minimus', 'grip', 'hamstrings', 'hip flexors', 'lateral delts',
  'lats', 'obliques', 'quadriceps', 'rear delts', 'shoulders', 'soleus',
  'lower back', 'spinal erectors', 'traps', 'triceps', 'upper back', 'upper chest',
  'wrist extensors', 'wrist flexors',
]);
const VALID_EQUIPMENT = new Set([
  '45-degree back extension bench', 'Ab wheel', 'Abdominal crunch machine',
  'Ankle strap', 'Assisted dip machine', 'Assisted pull-up machine', 'Back extension machine',
  'Bar or rope attachment',
  'Barbell', 'Belt squat machine', 'Bench', 'Bodyweight', 'Cable machine',
  'Captain’s chair', 'Chest press machine', 'Chest-supported row machine',
  'Close-grip pulldown handle', 'Decline bench', 'Dip bars',
  'Donkey calf raise machine', 'Dumbbell', 'Dumbbell or kettlebell',
  'Dumbbells', 'EZ-bar', 'EZ-bar or dumbbells', 'Elevated flat bench',
  'Flat bench', 'Furniture sliders', 'Hack squat machine', 'Handle',
  'High row machine', 'Hip abduction machine', 'Incline bench',
  'Incline chest press machine', 'Landmine attachment', 'Lat pulldown bar',
  'Lateral raise machine', 'Leg extension machine', 'Leg press machine',
  'Low row machine', 'Lying leg curl machine', 'Neutral-grip pull-up station',
  'Neutral-grip pulldown handle', 'Nordic curl anchor', 'Pec deck machine',
  'Plates', 'Preacher bench', 'Pull-up bar', 'Rack', 'Raised platform',
  'Resistance Band', 'Reverse hyperextension machine',
  'Reverse pec deck machine', 'Rope attachment', 'Row handle', 'Shrug machine',
  'Seated calf raise machine', 'Seated leg curl machine',
  'Shoulder press machine', 'Single handle', 'Single handles',
  'Sissy squat bench', 'Smith machine', 'Stability ball',
  'Standing calf raise machine', 'Standing leg curl machine', 'Step platform',
  'Straight bar attachment', 'Suspension trainer', 'T-bar row machine',
  'Towel', 'Weight plate', 'Weight plates', 'Wrist roller',
]);

const makeExercise = (seed: ExerciseSeed): ExerciseDefinition => {
  const equipment = seed.equipment;
  const trainingModes: WorkoutMode[] =
    seed.trainingModes ||
    (equipment.every((item) => HOME_EQUIPMENT.has(item))
      ? ['gym', 'home']
      : ['gym']);
  const goalSuitability: Record<FitnessGoal, number> = {
    muscle_gain: seed.hypertrophy ?? 4,
    weight_gain: seed.hypertrophy ?? 4,
    fat_loss: seed.hypertrophy ?? 4,
    hypertrophy: seed.hypertrophy ?? 4,
    strength: seed.strength ?? 3,
    general_fitness: seed.practicality ?? 3,
    body_recomposition: seed.hypertrophy ?? 4,
  };

  return {
    id: seed.id,
    name: seed.name,
    category: seed.category ?? seed.bodyParts[0],
    alternativeExerciseIds: seed.alternatives ?? [],
    bodyParts: seed.bodyParts,
    primaryMuscles: seed.primaryMuscles,
    secondaryMuscles: seed.secondaryMuscles || [],
    equipment,
    trainingModes,
    movementPattern: seed.movementPattern,
    difficulty: seed.difficulty || 'intermediate',
    recommendedRepRange: {
      min: seed.repRange?.[0] ?? 8,
      max: seed.repRange?.[1] ?? 12,
    },
    recommendedSets: seed.sets ?? 3,
    recommendedRestSeconds: seed.rest ?? 120,
    hypertrophySuitability: seed.hypertrophy ?? 4,
    strengthSuitability: seed.strength ?? 3,
    shortDescription:
      seed.shortDescription ??
      `${seed.name} is a ${seed.movementPattern.toLowerCase()} exercise that trains ${seed.primaryMuscles.join(', ')}.`,
    setup: `Set up the ${equipment.join(' and ').toLowerCase()} securely and choose a load or variation that allows controlled repetitions.`,
    execution: `Move through a comfortable range while keeping the target muscles engaged. Control the return and stop if you feel sharp pain.`,
    formCues: [
      'Use a controlled, repeatable range of motion.',
      'Keep the trunk and joints in a comfortable position.',
      'Finish each set with the prescribed effort in mind.',
    ],
    commonMistakes: [
      'Using momentum instead of controlling the movement.',
      'Shortening the range to move more load.',
      'Adding load before the repetitions remain consistent.',
    ],
    progression: 'When all prescribed sets reach the top of the rep range with consistent technique, increase resistance by a small manageable amount.',
    regression: 'Reduce resistance, shorten the range to a comfortable level, or use an easier variation.',
    evidenceSummary: 'This is a practical exercise-selection summary, not an exercise-specific research claim. Individual response and comfort vary.',
    recommendationFactors: {
      rangeOfMotion: seed.rangeOfMotion ?? 3,
      stability: seed.stability ?? 3,
      progressiveOverload: seed.overload ?? 3,
      resistanceProfile: seed.resistanceProfile ?? 3,
      practicality: seed.practicality ?? 3,
      difficulty: seed.difficulty === 'advanced' ? 2 : seed.difficulty === 'beginner' ? 5 : 3,
      fatigueCost:
        seed.fatigueCost ??
        (seed.strength && seed.strength >= 4
          ? 4
          : seed.primaryMuscles.length > 1
            ? 3
            : 2),
      technicalComplexity:
        seed.difficulty === 'advanced' ? 5 : seed.difficulty === 'beginner' ? 1 : 3,
    },
    goalSuitability,
  };
};

const EXERCISE_SEEDS: ExerciseSeed[] = [
  { id: 'incline-cable-chest-press', name: 'Incline Cable Chest Press', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Chest', 'Upper chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Cable machine', 'Bench'], movementPattern: 'Incline push', repRange: [8, 15], rest: 120, rangeOfMotion: 4, stability: 3, overload: 4, practicality: 3, alternatives: ['incline-dumbbell-press', 'incline-barbell-press', 'machine-chest-press'] },
  { id: 'assisted-chest-dip', name: 'Assisted Chest Dip', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front delts'], equipment: ['Assisted dip machine'], movementPattern: 'Compound push', repRange: [8, 15], rest: 120, strength: 3, rangeOfMotion: 4, stability: 4, overload: 4, practicality: 4, alternatives: ['chest-dip', 'push-up', 'machine-chest-press'] },
  { id: 'cable-chest-press', name: 'Cable Chest Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Cable machine', 'Single handles'], movementPattern: 'Horizontal push', repRange: [8, 15], rest: 120, rangeOfMotion: 4, stability: 3, overload: 4, practicality: 4, alternatives: ['barbell-bench-press', 'machine-chest-press', 'incline-cable-chest-press'] },
  { id: 'dumbbell-fly', name: 'Dumbbell Fly', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'], equipment: ['Dumbbells', 'Flat bench'], movementPattern: 'Horizontal adduction', trainingModes: ['gym', 'home'], repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 4, stability: 2, overload: 3, practicality: 3, alternatives: ['cable-chest-fly', 'pec-deck', 'incline-dumbbell-press'] },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Upper chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Dumbbells', 'Incline bench'], movementPattern: 'Horizontal push', repRange: [6, 12], rest: 150, strength: 3, rangeOfMotion: 5, stability: 3, overload: 4, practicality: 4, alternatives: ['incline-barbell-press', 'smith-incline-press', 'incline-machine-chest-press'] },
  { id: 'flat-dumbbell-press', name: 'Flat Dumbbell Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Dumbbells', 'Flat bench'], movementPattern: 'Horizontal push', repRange: [6, 12], rest: 150, rangeOfMotion: 5, stability: 3, overload: 4, alternatives: ['barbell-bench-press', 'machine-chest-press', 'smith-bench-press'] },
  { id: 'barbell-bench-press', name: 'Barbell Bench Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Barbell', 'Bench', 'Rack'], movementPattern: 'Horizontal push', difficulty: 'intermediate', repRange: [4, 10], rest: 180, strength: 5, rangeOfMotion: 3, stability: 4, overload: 5, alternatives: ['flat-dumbbell-press', 'machine-chest-press', 'smith-bench-press'] },
  { id: 'incline-barbell-press', name: 'Incline Barbell Press', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Upper chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Barbell', 'Incline bench', 'Rack'], movementPattern: 'Incline push', repRange: [5, 10], rest: 180, strength: 4, rangeOfMotion: 3, stability: 4, overload: 5, alternatives: ['incline-dumbbell-press', 'smith-incline-press', 'incline-machine-chest-press'] },
  { id: 'machine-chest-press', name: 'Machine Chest Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Chest press machine'], movementPattern: 'Horizontal push', repRange: [8, 15], rangeOfMotion: 4, stability: 5, overload: 4, practicality: 4, alternatives: ['barbell-bench-press', 'flat-dumbbell-press', 'smith-bench-press'] },
  { id: 'cable-chest-fly', name: 'Cable Chest Fly', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'], equipment: ['Cable machine'], movementPattern: 'Horizontal adduction', repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 5, stability: 3, overload: 3, alternatives: ['pec-deck', 'cable-low-to-high-fly', 'cable-high-to-low-fly'] },
  { id: 'pec-deck', name: 'Pec Deck', bodyParts: ['Chest'], primaryMuscles: ['Chest'], equipment: ['Pec deck machine'], movementPattern: 'Horizontal adduction', repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 4, stability: 5, practicality: 4, alternatives: ['cable-chest-fly', 'band-chest-fly'] },
  { id: 'chest-dip', name: 'Dips', bodyParts: ['Chest', 'Triceps'], primaryMuscles: ['Chest', 'Triceps'], secondaryMuscles: ['Front delts'], equipment: ['Dip bars'], movementPattern: 'Compound push', difficulty: 'advanced', repRange: [6, 15], rest: 150, strength: 4, rangeOfMotion: 4, stability: 3, overload: 4, alternatives: ['close-grip-bench-press', 'push-up', 'decline-barbell-press'] },
  { id: 'push-up', name: 'Push-Ups', bodyParts: ['Chest', 'Triceps'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps', 'Core'], equipment: ['Bodyweight'], movementPattern: 'Horizontal push', difficulty: 'beginner', repRange: [8, 25], rest: 90, strength: 2, rangeOfMotion: 4, stability: 3, overload: 3, practicality: 5, alternatives: ['diamond-push-up', 'band-chest-press'] },
  { id: 'lat-pulldown', name: 'Lat Pulldown', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Upper back'], equipment: ['Cable machine', 'Lat pulldown bar'], movementPattern: 'Vertical pull', repRange: [8, 15], rangeOfMotion: 4, stability: 5, overload: 4, alternatives: ['pull-up', 'assisted-pull-up', 'neutral-grip-lat-pulldown'] },
  { id: 'pull-up', name: 'Pull-Ups', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats', 'Upper back'], secondaryMuscles: ['Biceps', 'Core'], equipment: ['Pull-up bar'], movementPattern: 'Vertical pull', difficulty: 'advanced', repRange: [4, 12], rest: 150, strength: 5, stability: 3, overload: 3, practicality: 4, alternatives: ['assisted-pull-up', 'chin-up', 'lat-pulldown'] },
  { id: 'assisted-pull-up', name: 'Assisted Pull-Ups', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats', 'Upper back'], secondaryMuscles: ['Biceps'], equipment: ['Assisted pull-up machine'], movementPattern: 'Vertical pull', repRange: [6, 12], rest: 150, strength: 4, rangeOfMotion: 4, stability: 4, overload: 4, alternatives: ['pull-up', 'lat-pulldown', 'neutral-grip-lat-pulldown'] },
  { id: 'chest-supported-row', name: 'Chest-Supported Row', bodyParts: ['Back', 'Upper Back', 'Lats'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Lats', 'Biceps', 'Rear delts'], equipment: ['Chest-supported row machine'], movementPattern: 'Horizontal pull', repRange: [6, 15], rest: 150, stability: 5, overload: 4, alternatives: ['chest-supported-dumbbell-row', 'seal-row', 'seated-cable-row'] },
  { id: 'seated-cable-row', name: 'Seated Cable Row', bodyParts: ['Back', 'Upper Back', 'Lats'], primaryMuscles: ['Upper back', 'Lats'], secondaryMuscles: ['Biceps', 'Rear delts'], equipment: ['Cable machine', 'Row handle'], movementPattern: 'Horizontal pull', repRange: [8, 15], rangeOfMotion: 4, stability: 4, overload: 4, alternatives: ['chest-supported-row', 'one-arm-dumbbell-row', 'single-arm-cable-row'] },
  { id: 't-bar-row', name: 'T-Bar Row', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Lats', 'Biceps'], equipment: ['T-bar row machine'], movementPattern: 'Horizontal pull', repRange: [6, 12], rest: 150, strength: 4, stability: 4, overload: 4, alternatives: ['barbell-row', 'chest-supported-row', 'machine-high-row'] },
  { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Upper back', 'Biceps'], equipment: ['Dumbbell', 'Bench'], movementPattern: 'Horizontal pull', repRange: [8, 15], trainingModes: ['gym', 'home'], stability: 3, overload: 4, practicality: 4, alternatives: ['single-arm-cable-row', 'chest-supported-dumbbell-row', 'lat-pulldown'] },
  { id: 'barbell-row', name: 'Barbell Row', bodyParts: ['Back', 'Upper Back', 'Lats'], primaryMuscles: ['Upper back', 'Lats'], secondaryMuscles: ['Biceps', 'Spinal erectors'], equipment: ['Barbell', 'Plates'], movementPattern: 'Horizontal pull', difficulty: 'advanced', repRange: [5, 12], rest: 150, strength: 4, stability: 2, overload: 5, alternatives: ['t-bar-row', 'chest-supported-row', 'seal-row'] },
  { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', bodyParts: ['Shoulders', 'Lateral Delts'], primaryMuscles: ['Lateral delts'], equipment: ['Dumbbells'], movementPattern: 'Shoulder abduction', difficulty: 'beginner', repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 4, stability: 3, overload: 3, practicality: 5, alternatives: ['cable-lateral-raise', 'machine-lateral-raise', 'band-lateral-raise'] },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', bodyParts: ['Shoulders', 'Lateral Delts'], primaryMuscles: ['Lateral delts'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Shoulder abduction', repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 5, stability: 3, overload: 3, alternatives: ['dumbbell-lateral-raise', 'machine-lateral-raise', 'band-lateral-raise'] },
  { id: 'smith-overhead-press', name: 'Smith Machine Overhead Press', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Lateral delts', 'Triceps'], equipment: ['Smith machine'], movementPattern: 'Vertical push', repRange: [6, 12], rest: 150, strength: 4, stability: 5, overload: 4, alternatives: ['barbell-overhead-press', 'dumbbell-shoulder-press', 'machine-shoulder-press'] },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Lateral delts', 'Triceps'], equipment: ['Dumbbells', 'Bench'], movementPattern: 'Vertical push', repRange: [6, 12], rest: 150, strength: 4, stability: 3, overload: 4, alternatives: ['smith-overhead-press', 'barbell-overhead-press', 'machine-shoulder-press'] },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', bodyParts: ['Shoulders', 'Rear Delts'], primaryMuscles: ['Rear delts'], secondaryMuscles: ['Upper back'], equipment: ['Dumbbells'], movementPattern: 'Horizontal abduction', difficulty: 'beginner', repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 4, practicality: 4, alternatives: ['cable-rear-delt-fly', 'reverse-pec-deck'] },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', bodyParts: ['Shoulders', 'Rear Delts', 'Upper Back'], primaryMuscles: ['Rear delts'], secondaryMuscles: ['Upper back'], equipment: ['Reverse pec deck machine'], movementPattern: 'Horizontal abduction', repRange: [10, 20], rest: 90, strength: 2, stability: 5, practicality: 4, alternatives: ['rear-delt-fly', 'cable-rear-delt-fly'] },
  { id: 'face-pull', name: 'Face Pull', bodyParts: ['Shoulders', 'Rear Delts', 'Upper Back'], primaryMuscles: ['Rear delts', 'Upper back'], secondaryMuscles: ['External rotators'], equipment: ['Cable machine', 'Rope attachment'], movementPattern: 'Horizontal pull', difficulty: 'beginner', repRange: [12, 20], rest: 90, strength: 2, practicality: 4, alternatives: ['reverse-pec-deck', 'cable-rear-delt-fly'] },
  { id: 'ez-bar-curl', name: 'EZ-Bar Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['EZ-bar', 'Plates'], movementPattern: 'Elbow flexion', repRange: [6, 15], strength: 3, stability: 4, overload: 4, alternatives: ['barbell-curl', 'dumbbell-curl', 'cable-curl'] },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Dumbbells'], movementPattern: 'Elbow flexion', difficulty: 'beginner', repRange: [8, 15], strength: 2, stability: 3, overload: 4, practicality: 5, alternatives: ['barbell-curl', 'alternating-dumbbell-curl', 'cable-curl'] },
  { id: 'cable-curl', name: 'Cable Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Cable machine', 'Handle'], movementPattern: 'Elbow flexion', repRange: [10, 20], rest: 90, strength: 2, resistanceProfile: 4, alternatives: ['ez-bar-curl', 'barbell-curl', 'bayesian-cable-curl'] },
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Dumbbells', 'Incline bench'], movementPattern: 'Elbow flexion', repRange: [8, 15], rest: 90, strength: 2, rangeOfMotion: 5, stability: 3, alternatives: ['bayesian-cable-curl', 'alternating-dumbbell-curl', 'dumbbell-curl'] },
  { id: 'preacher-curl', name: 'Preacher Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], equipment: ['Preacher bench', 'EZ-bar or dumbbells'], movementPattern: 'Elbow flexion', repRange: [8, 15], rest: 90, strength: 2, stability: 5, practicality: 3, alternatives: ['cable-preacher-curl', 'cable-curl', 'concentration-curl'] },
  { id: 'hammer-curl', name: 'Hammer Curl', bodyParts: ['Biceps', 'Forearms'], primaryMuscles: ['Brachialis', 'Brachioradialis'], secondaryMuscles: ['Biceps'], equipment: ['Dumbbells'], movementPattern: 'Neutral-grip elbow flexion', difficulty: 'beginner', repRange: [8, 15], strength: 3, stability: 3, overload: 4, practicality: 5, alternatives: ['cross-body-hammer-curl', 'reverse-curl'] },
  { id: 'cable-pushdown', name: 'Cable Pushdown', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Bar or rope attachment'], movementPattern: 'Elbow extension', difficulty: 'beginner', repRange: [8, 20], rest: 90, strength: 2, stability: 5, practicality: 4, alternatives: ['rope-triceps-pressdown', 'straight-bar-pressdown', 'single-arm-cable-pressdown'] },
  { id: 'overhead-cable-extension', name: 'Overhead Cable Extension', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Rope attachment'], movementPattern: 'Overhead elbow extension', repRange: [10, 20], rest: 90, strength: 2, rangeOfMotion: 5, resistanceProfile: 4, alternatives: ['dumbbell-overhead-extension', 'single-arm-overhead-cable-extension'] },
  { id: 'dumbbell-overhead-extension', name: 'Dumbbell Overhead Extension', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Dumbbell'], movementPattern: 'Overhead elbow extension', difficulty: 'beginner', repRange: [8, 15], rest: 90, strength: 2, rangeOfMotion: 4, practicality: 4, alternatives: ['single-dumbbell-overhead-extension', 'overhead-cable-extension'] },
  { id: 'ez-bar-skull-crusher', name: 'EZ-Bar Skull Crusher', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['EZ-bar', 'Bench'], movementPattern: 'Elbow extension', difficulty: 'intermediate', repRange: [8, 15], rest: 120, strength: 3, rangeOfMotion: 4, stability: 3, alternatives: ['overhead-cable-extension', 'close-grip-bench-press'] },
  { id: 'back-squat', name: 'Back Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes', 'Adductors', 'Spinal erectors'], equipment: ['Barbell', 'Rack', 'Plates'], movementPattern: 'Squat', difficulty: 'advanced', repRange: [4, 10], rest: 180, strength: 5, stability: 3, overload: 5, practicality: 3, alternatives: ['front-squat', 'hack-squat', 'smith-machine-squat'] },
  { id: 'hack-squat', name: 'Hack Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes'], equipment: ['Hack squat machine'], movementPattern: 'Squat', repRange: [6, 15], rest: 150, strength: 4, rangeOfMotion: 4, stability: 5, overload: 4, alternatives: ['leg-press', 'belt-squat', 'back-squat'] },
  { id: 'leg-press', name: 'Leg Press', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes'], equipment: ['Leg press machine'], movementPattern: 'Squat', repRange: [8, 15], rest: 150, strength: 4, rangeOfMotion: 4, stability: 5, overload: 5, alternatives: ['hack-squat', 'belt-squat', 'back-squat'] },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Dumbbells', 'Bench'], movementPattern: 'Single-leg squat', difficulty: 'advanced', repRange: [6, 15], rest: 150, strength: 4, rangeOfMotion: 5, stability: 2, overload: 3, practicality: 3, alternatives: ['reverse-lunge', 'walking-lunge', 'dumbbell-step-up'] },
  { id: 'leg-extension', name: 'Leg Extension', bodyParts: ['Quadriceps'], primaryMuscles: ['Quadriceps'], equipment: ['Leg extension machine'], movementPattern: 'Knee extension', difficulty: 'beginner', repRange: [10, 20], rest: 90, strength: 2, stability: 5, resistanceProfile: 4, alternatives: ['single-leg-leg-extension', 'band-leg-extension', 'sissy-squat'] },
  { id: 'goblet-squat', name: 'Goblet Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes', 'Core'], equipment: ['Dumbbell or kettlebell'], movementPattern: 'Squat', difficulty: 'beginner', repRange: [8, 15], rest: 120, strength: 3, stability: 4, overload: 2, practicality: 5, alternatives: ['front-squat', 'smith-machine-squat', 'dumbbell-step-up'] },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Spinal erectors'], equipment: ['Barbell', 'Plates'], movementPattern: 'Hip hinge', difficulty: 'intermediate', repRange: [6, 12], rest: 180, strength: 5, rangeOfMotion: 4, overload: 5, alternatives: ['dumbbell-romanian-deadlift', 'smith-romanian-deadlift', 'stiff-leg-deadlift'] },
  { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Spinal erectors'], equipment: ['Dumbbells'], movementPattern: 'Hip hinge', repRange: [8, 15], rest: 150, strength: 4, rangeOfMotion: 4, overload: 4, practicality: 4, alternatives: ['romanian-deadlift', 'smith-romanian-deadlift', 'single-leg-dumbbell-rdl'] },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', bodyParts: ['Hamstrings'], primaryMuscles: ['Hamstrings'], equipment: ['Lying leg curl machine'], movementPattern: 'Knee flexion', difficulty: 'beginner', repRange: [8, 15], rest: 120, strength: 2, stability: 5, practicality: 4, alternatives: ['seated-leg-curl', 'standing-leg-curl', 'nordic-hamstring-curl'] },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', bodyParts: ['Hamstrings'], primaryMuscles: ['Hamstrings'], equipment: ['Seated leg curl machine'], movementPattern: 'Knee flexion', difficulty: 'beginner', repRange: [8, 15], rest: 120, strength: 2, stability: 5, rangeOfMotion: 4, alternatives: ['lying-leg-curl', 'standing-leg-curl', 'nordic-hamstring-curl'] },
  { id: 'good-morning', name: 'Good Morning', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Spinal erectors'], equipment: ['Barbell', 'Rack'], movementPattern: 'Hip hinge', difficulty: 'advanced', repRange: [6, 12], rest: 180, strength: 4, stability: 2, overload: 4, practicality: 2, alternatives: ['romanian-deadlift', 'stiff-leg-deadlift', 'smith-romanian-deadlift'] },
  { id: 'hip-thrust', name: 'Hip Thrust', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Barbell', 'Bench', 'Plates'], movementPattern: 'Hip extension', repRange: [6, 15], rest: 150, strength: 4, stability: 4, overload: 5, resistanceProfile: 4, alternatives: ['barbell-glute-bridge', 'smith-machine-hip-thrust', 'dumbbell-hip-thrust'] },
  { id: 'cable-kickback', name: 'Cable Kickback', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], equipment: ['Cable machine', 'Ankle strap'], movementPattern: 'Hip extension', difficulty: 'beginner', repRange: [10, 20], rest: 90, strength: 2, stability: 3, practicality: 3, alternatives: ['band-hip-abduction', 'hip-thrust', '45-degree-back-extension-glute-bias'] },
  { id: 'standing-calf-raise', name: 'Standing Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Gastrocnemius', 'Soleus'], equipment: ['Standing calf raise machine'], movementPattern: 'Plantar flexion', difficulty: 'beginner', repRange: [8, 20], rest: 90, strength: 3, stability: 5, overload: 4, alternatives: ['smith-machine-calf-raise', 'leg-press-calf-raise', 'single-leg-standing-calf-raise'] },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Soleus', 'Gastrocnemius'], equipment: ['Seated calf raise machine'], movementPattern: 'Plantar flexion', difficulty: 'beginner', repRange: [10, 20], rest: 90, strength: 2, stability: 5, practicality: 4, alternatives: ['single-leg-seated-calf-raise', 'standing-calf-raise'] },
  { id: 'smith-machine-calf-raise', name: 'Smith Machine Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Gastrocnemius', 'Soleus'], equipment: ['Smith machine', 'Raised platform'], movementPattern: 'Plantar flexion', repRange: [8, 20], rest: 90, strength: 3, stability: 4, overload: 4, alternatives: ['standing-calf-raise', 'leg-press-calf-raise', 'donkey-calf-raise'] },
  { id: 'cable-crunch', name: 'Cable Crunch', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], equipment: ['Cable machine', 'Rope attachment'], movementPattern: 'Trunk flexion', difficulty: 'beginner', repRange: [10, 20], rest: 90, strength: 2, stability: 4, overload: 4, alternatives: ['machine-crunch', 'decline-sit-up', 'weighted-sit-up'] },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals', 'Hip flexors'], equipment: ['Pull-up bar'], movementPattern: 'Trunk flexion', difficulty: 'advanced', repRange: [6, 15], rest: 120, strength: 3, rangeOfMotion: 4, stability: 2, practicality: 3, alternatives: ['hanging-knee-raise', 'captains-chair-knee-raise', 'reverse-crunch'] },
  { id: 'reverse-crunch', name: 'Reverse Crunch', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], equipment: ['Bodyweight'], movementPattern: 'Trunk flexion', difficulty: 'beginner', repRange: [10, 20], rest: 60, strength: 1, practicality: 5, alternatives: ['hanging-knee-raise', 'cable-crunch', 'dead-bug'] },
  { id: 'ab-wheel', name: 'Ab Wheel', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Shoulders', 'Lats'], equipment: ['Ab wheel'], movementPattern: 'Anti-extension', difficulty: 'advanced', repRange: [5, 15], rest: 120, strength: 3, stability: 2, practicality: 4, alternatives: ['plank', 'dead-bug'] },
  { id: 'plank', name: 'Plank', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Shoulders', 'Glutes'], equipment: ['Bodyweight'], movementPattern: 'Anti-extension isometric', difficulty: 'beginner', repRange: [20, 60], rest: 60, strength: 2, practicality: 5, alternatives: ['dead-bug', 'ab-wheel', 'side-plank'] },
  { id: 'incline-machine-chest-press', name: 'Incline Machine Chest Press', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Upper chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Incline chest press machine'], movementPattern: 'Incline push', repRange: [8, 15], stability: 5, overload: 4, practicality: 4, alternatives: ['incline-dumbbell-press', 'incline-barbell-press'] },
  { id: 'smith-incline-press', name: 'Smith Machine Incline Press', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Upper chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Smith machine', 'Incline bench'], movementPattern: 'Incline push', repRange: [6, 12], strength: 4, stability: 5, overload: 4, alternatives: ['incline-barbell-press', 'incline-machine-chest-press'] },
  { id: 'smith-bench-press', name: 'Smith Machine Bench Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Smith machine', 'Flat bench'], movementPattern: 'Horizontal push', repRange: [6, 12], strength: 4, stability: 5, overload: 4, alternatives: ['barbell-bench-press', 'machine-chest-press'] },
  { id: 'decline-barbell-press', name: 'Decline Barbell Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front delts'], equipment: ['Barbell', 'Decline bench', 'Rack'], movementPattern: 'Decline push', repRange: [5, 10], strength: 4, stability: 4, overload: 5, alternatives: ['barbell-bench-press', 'chest-dip'] },
  { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front delts'], equipment: ['Dumbbells', 'Decline bench'], movementPattern: 'Decline push', repRange: [8, 12], rangeOfMotion: 4, stability: 3, overload: 4, alternatives: ['decline-barbell-press', 'flat-dumbbell-press'] },
  { id: 'neutral-grip-dumbbell-press', name: 'Neutral-Grip Dumbbell Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps', 'Front delts'], equipment: ['Dumbbells', 'Flat bench'], movementPattern: 'Horizontal push', repRange: [8, 15], rangeOfMotion: 4, stability: 3, practicality: 4, alternatives: ['flat-dumbbell-press', 'machine-chest-press'] },
  { id: 'dumbbell-floor-press', name: 'Dumbbell Floor Press', bodyParts: ['Chest', 'Triceps'], primaryMuscles: ['Chest', 'Triceps'], secondaryMuscles: ['Front delts'], equipment: ['Dumbbells'], movementPattern: 'Horizontal push', repRange: [6, 15], trainingModes: ['gym', 'home'], strength: 4, stability: 4, overload: 4, alternatives: ['flat-dumbbell-press', 'barbell-bench-press'] },
  { id: 'cable-low-to-high-fly', name: 'Low-to-High Cable Fly', bodyParts: ['Chest', 'Upper Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'], equipment: ['Cable machine', 'Single handles'], movementPattern: 'Horizontal adduction', repRange: [10, 20], rangeOfMotion: 5, resistanceProfile: 4, alternatives: ['cable-chest-fly', 'pec-deck'] },
  { id: 'cable-high-to-low-fly', name: 'High-to-Low Cable Fly', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'], equipment: ['Cable machine', 'Single handles'], movementPattern: 'Horizontal adduction', repRange: [10, 20], rangeOfMotion: 5, resistanceProfile: 4, alternatives: ['cable-chest-fly', 'pec-deck'] },
  { id: 'band-chest-press', name: 'Resistance-Band Chest Press', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts', 'Triceps'], equipment: ['Resistance Band'], movementPattern: 'Horizontal push', trainingModes: ['home'], repRange: [10, 25], strength: 2, practicality: 5, alternatives: ['push-up', 'flat-dumbbell-press'] },
  { id: 'band-chest-fly', name: 'Resistance-Band Chest Fly', bodyParts: ['Chest'], primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'], equipment: ['Resistance Band'], movementPattern: 'Horizontal adduction', trainingModes: ['home'], repRange: [12, 25], rangeOfMotion: 4, practicality: 5, alternatives: ['cable-chest-fly', 'pec-deck'] },
  { id: 'neutral-grip-lat-pulldown', name: 'Neutral-Grip Lat Pulldown', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Upper back'], equipment: ['Cable machine', 'Neutral-grip pulldown handle'], movementPattern: 'Vertical pull', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['lat-pulldown', 'pull-up'] },
  { id: 'close-grip-lat-pulldown', name: 'Close-Grip Lat Pulldown', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Upper back'], equipment: ['Cable machine', 'Close-grip pulldown handle'], movementPattern: 'Vertical pull', repRange: [8, 15], rangeOfMotion: 4, stability: 5, alternatives: ['lat-pulldown', 'neutral-grip-lat-pulldown'] },
  { id: 'wide-grip-lat-pulldown', name: 'Wide-Grip Lat Pulldown', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Upper back'], equipment: ['Cable machine', 'Lat pulldown bar'], movementPattern: 'Vertical pull', repRange: [8, 15], rangeOfMotion: 3, stability: 5, alternatives: ['lat-pulldown', 'pull-up'] },
  { id: 'single-arm-cable-pulldown', name: 'Single-Arm Cable Pulldown', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Vertical pull', repRange: [10, 15], rangeOfMotion: 5, stability: 3, practicality: 4, alternatives: ['lat-pulldown', 'one-arm-dumbbell-row'] },
  { id: 'straight-arm-pulldown', name: 'Straight-Arm Cable Pulldown', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats'], secondaryMuscles: ['Triceps', 'Core'], equipment: ['Cable machine', 'Bar or rope attachment'], movementPattern: 'Shoulder extension', repRange: [10, 20], strength: 2, stability: 4, alternatives: ['lat-pulldown', 'single-arm-cable-pulldown'] },
  { id: 'chin-up', name: 'Chin-Ups', bodyParts: ['Back', 'Lats', 'Biceps'], primaryMuscles: ['Lats', 'Biceps'], secondaryMuscles: ['Upper back', 'Core'], equipment: ['Pull-up bar'], movementPattern: 'Vertical pull', difficulty: 'advanced', repRange: [4, 12], rest: 150, strength: 5, overload: 3, trainingModes: ['gym', 'home'], alternatives: ['pull-up', 'assisted-pull-up'] },
  { id: 'neutral-grip-pull-up', name: 'Neutral-Grip Pull-Ups', bodyParts: ['Back', 'Lats'], primaryMuscles: ['Lats', 'Upper back'], secondaryMuscles: ['Biceps', 'Core'], equipment: ['Neutral-grip pull-up station'], movementPattern: 'Vertical pull', difficulty: 'advanced', repRange: [4, 12], rest: 150, strength: 5, overload: 3, alternatives: ['pull-up', 'chin-up'] },
  { id: 'inverted-row', name: 'Inverted Row', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Lats', 'Biceps', 'Rear delts'], equipment: ['Suspension trainer'], movementPattern: 'Horizontal pull', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [8, 20], practicality: 5, alternatives: ['seated-cable-row', 'chest-supported-row'] },
  { id: 'seal-row', name: 'Barbell Seal Row', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Lats', 'Biceps', 'Rear delts'], equipment: ['Barbell', 'Elevated flat bench', 'Plates'], movementPattern: 'Horizontal pull', repRange: [6, 12], strength: 4, stability: 5, alternatives: ['chest-supported-row', 'barbell-row'] },
  { id: 'single-arm-cable-row', name: 'Single-Arm Cable Row', bodyParts: ['Back', 'Lats', 'Upper Back'], primaryMuscles: ['Lats', 'Upper back'], secondaryMuscles: ['Biceps', 'Rear delts'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Horizontal pull', repRange: [8, 15], rangeOfMotion: 5, stability: 3, alternatives: ['seated-cable-row', 'one-arm-dumbbell-row'] },
  { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Lats', 'Biceps', 'Rear delts'], equipment: ['Dumbbells', 'Incline bench'], movementPattern: 'Horizontal pull', repRange: [8, 15], stability: 5, trainingModes: ['gym', 'home'], alternatives: ['chest-supported-row', 'one-arm-dumbbell-row'] },
  { id: 'machine-high-row', name: 'Machine High Row', bodyParts: ['Back', 'Upper Back', 'Lats'], primaryMuscles: ['Lats', 'Upper back'], secondaryMuscles: ['Biceps', 'Rear delts'], equipment: ['High row machine'], movementPattern: 'Horizontal pull', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['chest-supported-row', 'lat-pulldown'] },
  { id: 'machine-low-row', name: 'Machine Low Row', bodyParts: ['Back', 'Lats', 'Upper Back'], primaryMuscles: ['Lats'], secondaryMuscles: ['Upper back', 'Biceps'], equipment: ['Low row machine'], movementPattern: 'Horizontal pull', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['seated-cable-row', 'chest-supported-row'] },
  { id: 'barbell-shrug', name: 'Barbell Shrug', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Traps'], secondaryMuscles: ['Forearms'], equipment: ['Barbell', 'Plates'], movementPattern: 'Scapular elevation', repRange: [8, 15], strength: 4, overload: 5, alternatives: ['dumbbell-shrug', 'face-pull'] },
  { id: 'dumbbell-shrug', name: 'Dumbbell Shrug', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Traps'], secondaryMuscles: ['Forearms'], equipment: ['Dumbbells'], movementPattern: 'Scapular elevation', trainingModes: ['gym', 'home'], repRange: [10, 20], practicality: 5, alternatives: ['barbell-shrug', 'face-pull'] },
  { id: 'dumbbell-pullover', name: 'Dumbbell Pullover', bodyParts: ['Back'], primaryMuscles: ['Chest'], secondaryMuscles: ['Lats'], equipment: ['Dumbbells', 'Flat bench'], movementPattern: 'Shoulder extension', shortDescription: 'Lower a dumbbell behind your head in a controlled arc while lying on a bench.', repRange: [8, 15], rangeOfMotion: 4, stability: 3, alternatives: ['cable-chest-fly', 'straight-arm-pulldown', 'lat-pulldown'] },
  { id: 'machine-shrug', name: 'Machine Shrug', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Traps'], secondaryMuscles: ['Upper back'], equipment: ['Shrug machine'], movementPattern: 'Scapular elevation', shortDescription: 'Raise your shoulders against machine resistance, then lower them slowly.', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['barbell-shrug', 'dumbbell-shrug'] },
  { id: 'cable-shrug', name: 'Cable Shrug', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Traps'], secondaryMuscles: ['Upper back', 'Forearms'], equipment: ['Cable machine'], movementPattern: 'Scapular elevation', shortDescription: 'Raise your shoulders against cable resistance, then lower them with control.', repRange: [10, 20], stability: 4, practicality: 4, alternatives: ['barbell-shrug', 'dumbbell-shrug', 'machine-shrug'] },
  { id: 'prone-y-raise', name: 'Prone Y Raise', bodyParts: ['Back', 'Upper Back', 'Shoulders'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Shoulders'], equipment: ['Bodyweight'], trainingModes: ['gym', 'home'], movementPattern: 'Overhead scapular control', shortDescription: 'Lie face down and lift your arms into a Y shape with controlled movement.', difficulty: 'beginner', repRange: [10, 20], practicality: 5, alternatives: ['incline-y-raise', 'cable-y-raise', 'face-pull'] },
  { id: 'incline-y-raise', name: 'Incline Y Raise', bodyParts: ['Back', 'Upper Back', 'Shoulders'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Shoulders'], equipment: ['Dumbbells', 'Incline bench'], trainingModes: ['gym', 'home'], movementPattern: 'Overhead scapular control', shortDescription: 'Lie chest-supported on an incline bench and raise your arms in a Y shape.', difficulty: 'beginner', repRange: [10, 20], stability: 4, alternatives: ['prone-y-raise', 'cable-y-raise', 'face-pull'] },
  { id: 'cable-y-raise', name: 'Cable Y Raise', bodyParts: ['Back', 'Upper Back', 'Shoulders'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Shoulders'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Overhead scapular control', shortDescription: 'Raise cable handles in a Y shape with a comfortable, controlled range.', difficulty: 'beginner', repRange: [10, 20], rangeOfMotion: 4, alternatives: ['prone-y-raise', 'incline-y-raise', 'face-pull'] },
  { id: 'prone-cobra', name: 'Prone Cobra', bodyParts: ['Back', 'Upper Back'], primaryMuscles: ['Upper back'], secondaryMuscles: ['Lower back'], equipment: ['Bodyweight'], trainingModes: ['gym', 'home'], movementPattern: 'Scapular retraction and extension', shortDescription: 'Lie face down and gently lift your chest and arms while staying controlled.', difficulty: 'beginner', repRange: [10, 20], practicality: 5, alternatives: ['prone-y-raise', 'incline-y-raise', 'face-pull'] },
  { id: 'back-extension-45', name: '45-Degree Back Extension', bodyParts: ['Back'], primaryMuscles: ['Lower back'], secondaryMuscles: ['Glutes', 'Hamstrings'], equipment: ['45-degree back extension bench'], movementPattern: 'Trunk extension or hip hinge', shortDescription: 'Raise your torso from a bent position on a back-extension bench through a comfortable range.', repRange: [8, 15], stability: 4, overload: 4, alternatives: ['machine-lumbar-extension', 'romanian-deadlift', '45-degree-back-extension-glute-bias'] },
  { id: 'machine-lumbar-extension', name: 'Machine Back Extension', bodyParts: ['Back'], primaryMuscles: ['Lower back'], secondaryMuscles: ['Lower back'], equipment: ['Back extension machine'], movementPattern: 'Trunk extension', shortDescription: 'Straighten your torso against the machine resistance with controlled repetitions.', repRange: [10, 15], stability: 5, overload: 4, alternatives: ['back-extension-45', '45-degree-back-extension-glute-bias', 'romanian-deadlift'] },
  { id: 'deadlift', name: 'Deadlift', bodyParts: ['Back', 'Hamstrings', 'Glutes', 'Quadriceps'], primaryMuscles: ['Glutes', 'Hamstrings', 'Quadriceps'], secondaryMuscles: ['Lower back', 'Traps', 'Forearms', 'Lats'], equipment: ['Barbell', 'Plates', 'Rack'], movementPattern: 'Compound hip hinge', shortDescription: 'Lift a bar from the floor by standing tall and keeping the load close.', difficulty: 'advanced', repRange: [3, 8], rest: 210, strength: 5, stability: 2, overload: 5, fatigueCost: 5, alternatives: ['romanian-deadlift', 'good-morning', 'back-extension-45'] },
  { id: 'barbell-overhead-press', name: 'Barbell Overhead Press', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Lateral delts', 'Triceps'], equipment: ['Barbell', 'Rack'], movementPattern: 'Vertical push', repRange: [4, 10], rest: 150, strength: 5, stability: 3, overload: 5, alternatives: ['smith-overhead-press', 'dumbbell-shoulder-press'] },
  { id: 'arnold-press', name: 'Arnold Press', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Lateral delts', 'Triceps'], equipment: ['Dumbbells', 'Bench'], movementPattern: 'Vertical push', repRange: [8, 15], rangeOfMotion: 4, stability: 3, trainingModes: ['gym', 'home'], alternatives: ['dumbbell-shoulder-press', 'machine-shoulder-press'] },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Lateral delts', 'Triceps'], equipment: ['Shoulder press machine'], movementPattern: 'Vertical push', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['smith-overhead-press', 'dumbbell-shoulder-press'] },
  { id: 'half-kneeling-landmine-press', name: 'Half-Kneeling Landmine Press', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Triceps', 'Core'], equipment: ['Barbell', 'Landmine attachment'], movementPattern: 'Angled vertical push', repRange: [8, 12], stability: 3, practicality: 4, alternatives: ['dumbbell-shoulder-press', 'barbell-overhead-press'] },
  { id: 'dumbbell-front-raise', name: 'Dumbbell Front Raise', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], secondaryMuscles: ['Upper chest'], equipment: ['Dumbbells'], movementPattern: 'Shoulder flexion', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [10, 20], rangeOfMotion: 4, alternatives: ['cable-front-raise', 'dumbbell-shoulder-press'] },
  { id: 'cable-front-raise', name: 'Cable Front Raise', bodyParts: ['Shoulders', 'Front Delts'], primaryMuscles: ['Front delts'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Shoulder flexion', repRange: [10, 20], resistanceProfile: 4, alternatives: ['dumbbell-front-raise', 'dumbbell-shoulder-press'] },
  { id: 'machine-lateral-raise', name: 'Machine Lateral Raise', bodyParts: ['Shoulders', 'Lateral Delts'], primaryMuscles: ['Lateral delts'], equipment: ['Lateral raise machine'], movementPattern: 'Shoulder abduction', difficulty: 'beginner', repRange: [10, 20], stability: 5, overload: 4, alternatives: ['dumbbell-lateral-raise', 'cable-lateral-raise'] },
  { id: 'leaning-cable-lateral-raise', name: 'Leaning Cable Lateral Raise', bodyParts: ['Shoulders', 'Lateral Delts'], primaryMuscles: ['Lateral delts'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Shoulder abduction', repRange: [10, 20], rangeOfMotion: 5, resistanceProfile: 4, alternatives: ['cable-lateral-raise', 'machine-lateral-raise'] },
  { id: 'band-lateral-raise', name: 'Resistance-Band Lateral Raise', bodyParts: ['Shoulders', 'Lateral Delts'], primaryMuscles: ['Lateral delts'], equipment: ['Resistance Band'], movementPattern: 'Shoulder abduction', trainingModes: ['home'], difficulty: 'beginner', repRange: [12, 25], practicality: 5, alternatives: ['dumbbell-lateral-raise', 'cable-lateral-raise'] },
  { id: 'cable-rear-delt-fly', name: 'Cable Rear-Delt Fly', bodyParts: ['Shoulders', 'Rear Delts'], primaryMuscles: ['Rear delts'], secondaryMuscles: ['Upper back'], equipment: ['Cable machine', 'Single handles'], movementPattern: 'Horizontal abduction', repRange: [12, 20], resistanceProfile: 4, alternatives: ['rear-delt-fly', 'reverse-pec-deck'] },
  { id: 'barbell-curl', name: 'Barbell Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Barbell', 'Plates'], movementPattern: 'Elbow flexion', repRange: [6, 12], strength: 4, overload: 5, alternatives: ['ez-bar-curl', 'dumbbell-curl'] },
  { id: 'alternating-dumbbell-curl', name: 'Alternating Supinating Dumbbell Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Dumbbells'], movementPattern: 'Elbow flexion', trainingModes: ['gym', 'home'], repRange: [8, 15], practicality: 5, alternatives: ['dumbbell-curl', 'incline-dumbbell-curl'] },
  { id: 'concentration-curl', name: 'Concentration Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Dumbbell', 'Bench'], movementPattern: 'Elbow flexion', trainingModes: ['gym', 'home'], repRange: [10, 15], stability: 4, practicality: 4, alternatives: ['dumbbell-curl', 'preacher-curl'] },
  { id: 'cross-body-hammer-curl', name: 'Cross-Body Hammer Curl', bodyParts: ['Biceps', 'Forearms'], primaryMuscles: ['Brachialis', 'Brachioradialis'], secondaryMuscles: ['Biceps'], equipment: ['Dumbbells'], movementPattern: 'Neutral-grip elbow flexion', trainingModes: ['gym', 'home'], repRange: [8, 15], overload: 4, alternatives: ['hammer-curl', 'reverse-curl'] },
  { id: 'reverse-curl', name: 'Reverse Curl', bodyParts: ['Biceps', 'Forearms'], primaryMuscles: ['Brachioradialis'], secondaryMuscles: ['Biceps', 'Forearm extensors'], equipment: ['EZ-bar', 'Plates'], movementPattern: 'Pronated elbow flexion', repRange: [8, 15], stability: 4, alternatives: ['hammer-curl', 'barbell-curl'] },
  { id: 'cable-preacher-curl', name: 'Cable Preacher Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Cable machine', 'Preacher bench', 'Single handle'], movementPattern: 'Elbow flexion', repRange: [10, 15], stability: 5, resistanceProfile: 4, alternatives: ['preacher-curl', 'cable-curl'] },
  { id: 'bayesian-cable-curl', name: 'Bayesian Cable Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Elbow flexion', repRange: [10, 15], rangeOfMotion: 5, resistanceProfile: 4, alternatives: ['incline-dumbbell-curl', 'cable-curl'] },
  { id: 'band-biceps-curl', name: 'Resistance-Band Biceps Curl', bodyParts: ['Biceps'], primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'], equipment: ['Resistance Band'], movementPattern: 'Elbow flexion', trainingModes: ['home'], difficulty: 'beginner', repRange: [12, 25], practicality: 5, alternatives: ['dumbbell-curl', 'cable-curl'] },
  { id: 'rope-triceps-pressdown', name: 'Rope Triceps Pressdown', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Rope attachment'], movementPattern: 'Elbow extension', repRange: [10, 20], stability: 5, alternatives: ['cable-pushdown', 'single-arm-cable-pressdown'] },
  { id: 'straight-bar-pressdown', name: 'Straight-Bar Triceps Pressdown', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Straight bar attachment'], movementPattern: 'Elbow extension', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['cable-pushdown', 'rope-triceps-pressdown'] },
  { id: 'single-arm-cable-pressdown', name: 'Single-Arm Cable Pressdown', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Elbow extension', repRange: [10, 20], practicality: 4, alternatives: ['cable-pushdown', 'rope-triceps-pressdown'] },
  { id: 'cross-body-cable-triceps-extension', name: 'Cross-Body Cable Triceps Extension', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Elbow extension', repRange: [10, 20], resistanceProfile: 4, alternatives: ['single-arm-cable-pressdown', 'overhead-cable-extension'] },
  { id: 'single-dumbbell-overhead-extension', name: 'Single-Dumbbell Overhead Triceps Extension', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Dumbbell'], movementPattern: 'Overhead elbow extension', trainingModes: ['gym', 'home'], repRange: [8, 15], rangeOfMotion: 4, alternatives: ['dumbbell-overhead-extension', 'overhead-cable-extension'] },
  { id: 'single-arm-overhead-cable-extension', name: 'Single-Arm Overhead Cable Extension', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Overhead elbow extension', repRange: [10, 20], rangeOfMotion: 5, resistanceProfile: 4, alternatives: ['overhead-cable-extension', 'single-dumbbell-overhead-extension'] },
  { id: 'close-grip-bench-press', name: 'Close-Grip Bench Press', bodyParts: ['Triceps', 'Chest'], primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest', 'Front delts'], equipment: ['Barbell', 'Bench', 'Rack'], movementPattern: 'Horizontal push', repRange: [5, 10], strength: 5, overload: 5, alternatives: ['barbell-bench-press', 'chest-dip'] },
  { id: 'bench-dip', name: 'Bench Dip', bodyParts: ['Triceps'], primaryMuscles: ['Triceps'], secondaryMuscles: ['Front delts', 'Chest'], equipment: ['Bench'], movementPattern: 'Compound push', difficulty: 'intermediate', repRange: [8, 20], trainingModes: ['gym', 'home'], practicality: 5, alternatives: ['chest-dip', 'close-grip-bench-press'] },
  { id: 'diamond-push-up', name: 'Diamond Push-Up', bodyParts: ['Triceps', 'Chest'], primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest', 'Front delts', 'Core'], equipment: ['Bodyweight'], movementPattern: 'Horizontal push', trainingModes: ['gym', 'home'], difficulty: 'intermediate', repRange: [6, 20], practicality: 5, alternatives: ['push-up', 'bench-dip'] },
  { id: 'front-squat', name: 'Front Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes', 'Core', 'Spinal erectors'], equipment: ['Barbell', 'Rack', 'Plates'], movementPattern: 'Squat', difficulty: 'advanced', repRange: [4, 10], rest: 180, strength: 5, overload: 5, alternatives: ['back-squat', 'hack-squat'] },
  { id: 'smith-machine-squat', name: 'Smith Machine Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes'], equipment: ['Smith machine'], movementPattern: 'Squat', repRange: [6, 15], stability: 5, overload: 4, alternatives: ['back-squat', 'hack-squat'] },
  { id: 'belt-squat', name: 'Belt Squat', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes'], equipment: ['Belt squat machine'], movementPattern: 'Squat', repRange: [8, 15], stability: 5, practicality: 4, alternatives: ['hack-squat', 'leg-press'] },
  { id: 'sissy-squat', name: 'Sissy Squat', bodyParts: ['Quadriceps'], primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Core'], equipment: ['Sissy squat bench'], movementPattern: 'Knee-dominant squat', difficulty: 'advanced', repRange: [8, 15], rangeOfMotion: 5, alternatives: ['leg-extension', 'hack-squat'] },
  { id: 'walking-lunge', name: 'Walking Lunge', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Core'], equipment: ['Bodyweight'], movementPattern: 'Lunge', trainingModes: ['gym', 'home'], repRange: [8, 16], stability: 2, practicality: 5, alternatives: ['reverse-lunge', 'bulgarian-split-squat'] },
  { id: 'dumbbell-walking-lunge', name: 'Dumbbell Walking Lunge', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Core'], equipment: ['Dumbbells'], movementPattern: 'Lunge', trainingModes: ['gym', 'home'], repRange: [8, 16], stability: 2, overload: 4, alternatives: ['walking-lunge', 'bulgarian-split-squat'] },
  { id: 'reverse-lunge', name: 'Reverse Lunge', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Core'], equipment: ['Bodyweight'], movementPattern: 'Lunge', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [8, 16], practicality: 5, alternatives: ['walking-lunge', 'bulgarian-split-squat'] },
  { id: 'dumbbell-step-up', name: 'Dumbbell Step-Up', bodyParts: ['Quadriceps', 'Glutes'], primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings', 'Core'], equipment: ['Dumbbells', 'Step platform'], movementPattern: 'Step-up', trainingModes: ['gym', 'home'], repRange: [8, 15], stability: 3, practicality: 4, alternatives: ['bulgarian-split-squat', 'reverse-lunge'] },
  { id: 'single-leg-leg-extension', name: 'Single-Leg Leg Extension', bodyParts: ['Quadriceps'], primaryMuscles: ['Quadriceps'], equipment: ['Leg extension machine'], movementPattern: 'Knee extension', difficulty: 'beginner', repRange: [10, 20], stability: 5, alternatives: ['leg-extension', 'band-leg-extension'] },
  { id: 'band-leg-extension', name: 'Resistance-Band Leg Extension', bodyParts: ['Quadriceps'], primaryMuscles: ['Quadriceps'], equipment: ['Resistance Band', 'Ankle strap'], movementPattern: 'Knee extension', trainingModes: ['home'], difficulty: 'beginner', repRange: [12, 25], practicality: 4, alternatives: ['leg-extension', 'single-leg-leg-extension'] },
  { id: 'stiff-leg-deadlift', name: 'Stiff-Leg Deadlift', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Spinal erectors'], equipment: ['Barbell', 'Plates'], movementPattern: 'Hip hinge', difficulty: 'advanced', repRange: [6, 12], rest: 180, strength: 5, overload: 5, alternatives: ['romanian-deadlift', 'smith-romanian-deadlift'] },
  { id: 'smith-romanian-deadlift', name: 'Smith Machine Romanian Deadlift', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Spinal erectors'], equipment: ['Smith machine'], movementPattern: 'Hip hinge', repRange: [8, 12], stability: 5, overload: 4, alternatives: ['romanian-deadlift', 'dumbbell-romanian-deadlift'] },
  { id: 'single-leg-dumbbell-rdl', name: 'Single-Leg Dumbbell Romanian Deadlift', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Core'], equipment: ['Dumbbell'], movementPattern: 'Single-leg hip hinge', trainingModes: ['gym', 'home'], difficulty: 'advanced', repRange: [8, 12], stability: 2, alternatives: ['dumbbell-romanian-deadlift', 'romanian-deadlift'] },
  { id: 'cable-pull-through', name: 'Cable Pull-Through', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Spinal erectors'], equipment: ['Cable machine', 'Rope attachment'], movementPattern: 'Hip hinge', repRange: [10, 20], practicality: 4, alternatives: ['romanian-deadlift', 'hip-thrust'] },
  { id: 'nordic-hamstring-curl', name: 'Nordic Hamstring Curl', bodyParts: ['Hamstrings'], primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Calves'], equipment: ['Nordic curl anchor'], movementPattern: 'Knee flexion', difficulty: 'advanced', repRange: [3, 8], rest: 150, strength: 4, rangeOfMotion: 5, alternatives: ['assisted-nordic-curl', 'lying-leg-curl'] },
  { id: 'assisted-nordic-curl', name: 'Assisted Nordic Hamstring Curl', bodyParts: ['Hamstrings'], primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Calves'], equipment: ['Nordic curl anchor', 'Resistance Band'], movementPattern: 'Knee flexion', difficulty: 'intermediate', repRange: [5, 10], rangeOfMotion: 5, alternatives: ['nordic-hamstring-curl', 'lying-leg-curl'] },
  { id: 'swiss-ball-leg-curl', name: 'Swiss-Ball Leg Curl', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Glutes', 'Core'], equipment: ['Stability ball'], movementPattern: 'Knee flexion', trainingModes: ['gym', 'home'], repRange: [8, 20], stability: 2, practicality: 4, alternatives: ['lying-leg-curl', 'slider-leg-curl'] },
  { id: 'slider-leg-curl', name: 'Sliding Leg Curl', bodyParts: ['Hamstrings', 'Glutes'], primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Glutes', 'Core'], equipment: ['Furniture sliders'], movementPattern: 'Knee flexion', trainingModes: ['home'], repRange: [8, 20], stability: 2, practicality: 5, alternatives: ['swiss-ball-leg-curl', 'lying-leg-curl'] },
  { id: 'standing-leg-curl', name: 'Standing Single-Leg Curl', bodyParts: ['Hamstrings'], primaryMuscles: ['Hamstrings'], equipment: ['Standing leg curl machine'], movementPattern: 'Knee flexion', repRange: [10, 20], stability: 5, alternatives: ['lying-leg-curl', 'seated-leg-curl'] },
  { id: 'band-leg-curl', name: 'Resistance-Band Leg Curl', bodyParts: ['Hamstrings'], primaryMuscles: ['Hamstrings'], equipment: ['Resistance Band', 'Ankle strap'], movementPattern: 'Knee flexion', trainingModes: ['home'], repRange: [12, 25], practicality: 4, alternatives: ['lying-leg-curl', 'slider-leg-curl'] },
  { id: 'barbell-glute-bridge', name: 'Barbell Glute Bridge', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Barbell', 'Plates', 'Flat bench'], movementPattern: 'Hip extension', repRange: [8, 15], stability: 4, overload: 5, alternatives: ['hip-thrust', 'dumbbell-glute-bridge'] },
  { id: 'dumbbell-glute-bridge', name: 'Dumbbell Glute Bridge', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Dumbbell'], movementPattern: 'Hip extension', trainingModes: ['gym', 'home'], repRange: [10, 20], practicality: 5, alternatives: ['barbell-glute-bridge', 'hip-thrust'] },
  { id: 'single-leg-hip-thrust', name: 'Single-Leg Hip Thrust', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Bench'], movementPattern: 'Hip extension', trainingModes: ['gym', 'home'], repRange: [8, 15], stability: 2, alternatives: ['hip-thrust', 'dumbbell-glute-bridge'] },
  { id: 'smith-machine-hip-thrust', name: 'Smith Machine Hip Thrust', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Smith machine', 'Bench'], movementPattern: 'Hip extension', repRange: [8, 15], stability: 5, overload: 4, alternatives: ['hip-thrust', 'barbell-glute-bridge'] },
  { id: 'dumbbell-hip-thrust', name: 'Dumbbell Hip Thrust', bodyParts: ['Glutes'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings'], equipment: ['Dumbbell', 'Bench'], movementPattern: 'Hip extension', trainingModes: ['gym', 'home'], repRange: [10, 20], practicality: 4, alternatives: ['hip-thrust', 'single-leg-hip-thrust'] },
  { id: 'machine-hip-abduction', name: 'Seated Hip Abduction Machine', bodyParts: ['Glutes'], primaryMuscles: ['Gluteus medius'], secondaryMuscles: ['Gluteus minimus'], equipment: ['Hip abduction machine'], movementPattern: 'Hip abduction', repRange: [12, 25], stability: 5, practicality: 4, alternatives: ['cable-hip-abduction', 'band-hip-abduction'] },
  { id: 'cable-hip-abduction', name: 'Cable Hip Abduction', bodyParts: ['Glutes'], primaryMuscles: ['Gluteus medius'], secondaryMuscles: ['Gluteus minimus'], equipment: ['Cable machine', 'Ankle strap'], movementPattern: 'Hip abduction', repRange: [12, 20], stability: 3, alternatives: ['machine-hip-abduction', 'band-hip-abduction'] },
  { id: 'band-hip-abduction', name: 'Resistance-Band Hip Abduction', bodyParts: ['Glutes'], primaryMuscles: ['Gluteus medius'], secondaryMuscles: ['Gluteus minimus'], equipment: ['Resistance Band'], movementPattern: 'Hip abduction', trainingModes: ['home'], difficulty: 'beginner', repRange: [15, 30], practicality: 5, alternatives: ['machine-hip-abduction', 'cable-hip-abduction'] },
  { id: '45-degree-back-extension-glute-bias', name: '45-Degree Back Extension (Glute Bias)', bodyParts: ['Glutes', 'Hamstrings'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings', 'Spinal erectors'], equipment: ['45-degree back extension bench'], movementPattern: 'Hip extension', repRange: [8, 15], stability: 4, alternatives: ['cable-kickback', 'hip-thrust'] },
  { id: 'reverse-hyperextension', name: 'Reverse Hyperextension', bodyParts: ['Glutes', 'Hamstrings'], primaryMuscles: ['Glutes'], secondaryMuscles: ['Hamstrings', 'Spinal erectors'], equipment: ['Reverse hyperextension machine'], movementPattern: 'Hip extension', repRange: [10, 20], stability: 4, alternatives: ['cable-kickback', '45-degree-back-extension-glute-bias'] },
  { id: 'leg-press-calf-raise', name: 'Leg Press Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Gastrocnemius', 'Soleus'], equipment: ['Leg press machine'], movementPattern: 'Plantar flexion', repRange: [10, 20], stability: 5, overload: 4, alternatives: ['standing-calf-raise', 'smith-machine-calf-raise'] },
  { id: 'single-leg-standing-calf-raise', name: 'Single-Leg Standing Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Gastrocnemius', 'Soleus'], equipment: ['Bodyweight', 'Raised platform'], movementPattern: 'Plantar flexion', trainingModes: ['gym', 'home'], repRange: [10, 20], stability: 3, practicality: 5, alternatives: ['standing-calf-raise', 'single-leg-seated-calf-raise'] },
  { id: 'single-leg-seated-calf-raise', name: 'Single-Leg Seated Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Soleus'], secondaryMuscles: ['Gastrocnemius'], equipment: ['Seated calf raise machine'], movementPattern: 'Plantar flexion', repRange: [10, 20], stability: 5, alternatives: ['seated-calf-raise', 'single-leg-standing-calf-raise'] },
  { id: 'donkey-calf-raise', name: 'Donkey Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Gastrocnemius', 'Soleus'], equipment: ['Donkey calf raise machine'], movementPattern: 'Plantar flexion', repRange: [10, 20], rangeOfMotion: 5, alternatives: ['standing-calf-raise', 'leg-press-calf-raise'] },
  { id: 'bodyweight-calf-raise', name: 'Bodyweight Calf Raise', bodyParts: ['Calves'], primaryMuscles: ['Gastrocnemius', 'Soleus'], equipment: ['Bodyweight'], movementPattern: 'Plantar flexion', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [15, 30], practicality: 5, alternatives: ['single-leg-standing-calf-raise', 'standing-calf-raise'] },
  { id: 'machine-crunch', name: 'Machine Abdominal Crunch', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], equipment: ['Abdominal crunch machine'], movementPattern: 'Spinal flexion', repRange: [10, 20], stability: 5, overload: 4, alternatives: ['cable-crunch', 'reverse-crunch'] },
  { id: 'decline-sit-up', name: 'Decline Sit-Up', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Hip flexors'], equipment: ['Decline bench'], movementPattern: 'Spinal flexion', repRange: [8, 20], alternatives: ['cable-crunch', 'machine-crunch'] },
  { id: 'weighted-sit-up', name: 'Weighted Sit-Up', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Hip flexors'], equipment: ['Weight plate'], movementPattern: 'Spinal flexion', repRange: [8, 15], overload: 4, alternatives: ['decline-sit-up', 'cable-crunch'] },
  { id: 'hanging-knee-raise', name: 'Hanging Knee Raise', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Hip flexors'], equipment: ['Pull-up bar'], movementPattern: 'Trunk flexion', difficulty: 'intermediate', repRange: [8, 15], alternatives: ['hanging-leg-raise', 'reverse-crunch'] },
  { id: 'captains-chair-knee-raise', name: 'Captain’s Chair Knee Raise', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Hip flexors'], equipment: ['Captain’s chair'], movementPattern: 'Trunk flexion', repRange: [8, 15], stability: 5, alternatives: ['hanging-knee-raise', 'reverse-crunch'] },
  { id: 'dead-bug', name: 'Dead Bug', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Hip flexors'], equipment: ['Bodyweight'], movementPattern: 'Anti-extension', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [8, 16], practicality: 5, alternatives: ['plank', 'ab-wheel'] },
  { id: 'bird-dog', name: 'Bird Dog', bodyParts: ['Abs/Core'], primaryMuscles: ['Abdominals'], secondaryMuscles: ['Glutes', 'Spinal erectors'], equipment: ['Bodyweight'], movementPattern: 'Anti-rotation', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [8, 16], practicality: 5, alternatives: ['dead-bug', 'plank'] },
  { id: 'pallof-press', name: 'Pallof Press', bodyParts: ['Abs/Core'], primaryMuscles: ['Obliques'], secondaryMuscles: ['Abdominals'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Anti-rotation', repRange: [8, 15], stability: 4, alternatives: ['band-pallof-press', 'side-plank'] },
  { id: 'band-pallof-press', name: 'Resistance-Band Pallof Press', bodyParts: ['Abs/Core'], primaryMuscles: ['Obliques'], secondaryMuscles: ['Abdominals'], equipment: ['Resistance Band'], movementPattern: 'Anti-rotation', trainingModes: ['home'], difficulty: 'beginner', repRange: [10, 20], practicality: 5, alternatives: ['pallof-press', 'side-plank'] },
  { id: 'side-plank', name: 'Side Plank', bodyParts: ['Abs/Core'], primaryMuscles: ['Obliques'], secondaryMuscles: ['Abdominals', 'Shoulders'], equipment: ['Bodyweight'], movementPattern: 'Anti-lateral flexion isometric', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [20, 60], practicality: 5, alternatives: ['pallof-press', 'plank'] },
  { id: 'cable-woodchop', name: 'Cable Wood Chop', bodyParts: ['Abs/Core'], primaryMuscles: ['Obliques'], secondaryMuscles: ['Abdominals'], equipment: ['Cable machine', 'Single handle'], movementPattern: 'Trunk rotation', repRange: [8, 15], alternatives: ['pallof-press', 'band-woodchop'] },
  { id: 'band-woodchop', name: 'Resistance-Band Wood Chop', bodyParts: ['Abs/Core'], primaryMuscles: ['Obliques'], secondaryMuscles: ['Abdominals'], equipment: ['Resistance Band'], movementPattern: 'Trunk rotation', trainingModes: ['home'], repRange: [10, 20], practicality: 5, alternatives: ['cable-woodchop', 'band-pallof-press'] },
  { id: 'wrist-curl', name: 'Wrist Curl', bodyParts: ['Forearms'], primaryMuscles: ['Wrist flexors'], equipment: ['Dumbbells'], movementPattern: 'Wrist flexion', trainingModes: ['gym', 'home'], repRange: [12, 25], practicality: 5, alternatives: ['barbell-wrist-curl', 'reverse-wrist-curl'] },
  { id: 'reverse-wrist-curl', name: 'Reverse Wrist Curl', bodyParts: ['Forearms'], primaryMuscles: ['Wrist extensors'], equipment: ['Dumbbells'], movementPattern: 'Wrist extension', trainingModes: ['gym', 'home'], repRange: [12, 25], practicality: 5, alternatives: ['barbell-reverse-wrist-curl', 'wrist-curl'] },
  { id: 'barbell-wrist-curl', name: 'Barbell Wrist Curl', bodyParts: ['Forearms'], primaryMuscles: ['Wrist flexors'], equipment: ['Barbell', 'Plates'], movementPattern: 'Wrist flexion', repRange: [12, 25], alternatives: ['wrist-curl', 'reverse-wrist-curl'] },
  { id: 'barbell-reverse-wrist-curl', name: 'Barbell Reverse Wrist Curl', bodyParts: ['Forearms'], primaryMuscles: ['Wrist extensors'], equipment: ['Barbell', 'Plates'], movementPattern: 'Wrist extension', repRange: [12, 25], alternatives: ['reverse-wrist-curl', 'barbell-wrist-curl'] },
  { id: 'farmer-carry', name: 'Farmer Carry', bodyParts: ['Forearms', 'Abs/Core'], primaryMuscles: ['Grip', 'Forearms'], secondaryMuscles: ['Traps', 'Core'], equipment: ['Dumbbells'], movementPattern: 'Carry', trainingModes: ['gym', 'home'], repRange: [20, 60], strength: 4, practicality: 5, alternatives: ['suitcase-carry', 'dead-hang'] },
  { id: 'dead-hang', name: 'Dead Hang', bodyParts: ['Forearms'], primaryMuscles: ['Grip', 'Forearms'], secondaryMuscles: ['Lats', 'Shoulders'], equipment: ['Pull-up bar'], movementPattern: 'Grip isometric', trainingModes: ['gym', 'home'], difficulty: 'beginner', repRange: [15, 60], practicality: 4, alternatives: ['farmer-carry', 'towel-hang'] },
  { id: 'wrist-roller', name: 'Wrist Roller', bodyParts: ['Forearms'], primaryMuscles: ['Wrist flexors', 'Wrist extensors'], equipment: ['Wrist roller'], movementPattern: 'Wrist flexion and extension', repRange: [1, 4], practicality: 4, alternatives: ['wrist-curl', 'reverse-wrist-curl'] },
  { id: 'plate-pinch-carry', name: 'Plate Pinch Carry', bodyParts: ['Forearms'], primaryMuscles: ['Grip'], secondaryMuscles: ['Forearms'], equipment: ['Weight plates'], movementPattern: 'Pinch grip carry', repRange: [15, 45], strength: 4, alternatives: ['farmer-carry', 'dead-hang'] },
  { id: 'suitcase-carry', name: 'Suitcase Carry', bodyParts: ['Forearms', 'Abs/Core'], primaryMuscles: ['Grip', 'Obliques'], secondaryMuscles: ['Forearms', 'Core'], equipment: ['Dumbbell'], movementPattern: 'Unilateral carry', trainingModes: ['gym', 'home'], repRange: [20, 60], practicality: 5, alternatives: ['farmer-carry', 'pallof-press'] },
  { id: 'towel-hang', name: 'Towel Hang', bodyParts: ['Forearms'], primaryMuscles: ['Grip', 'Forearms'], secondaryMuscles: ['Lats'], equipment: ['Pull-up bar', 'Towel'], movementPattern: 'Grip isometric', difficulty: 'advanced', repRange: [10, 45], trainingModes: ['gym', 'home'], alternatives: ['dead-hang', 'farmer-carry'] },
];

export const EXERCISE_LIBRARY: ExerciseDefinition[] = EXERCISE_SEEDS.map(
  makeExercise
).map((exercise) => {
  const research = getBackResearchForExercise(exercise.id);
  const chestResearch = getChestResearchForExercise(exercise.id);
  const researchBodyParts = [
    ...(research?.visibleTags || []),
    ...(chestResearch?.visibleTags || []),
  ].map((tag) => (tag === 'Quads' ? 'Quadriceps' : tag));
  return researchBodyParts.length > 0
    ? {
        ...exercise,
        bodyParts: [...new Set([...exercise.bodyParts, ...researchBodyParts])],
      }
    : exercise;
});

export function validateExerciseCatalog(
  catalog: readonly ExerciseDefinition[] = EXERCISE_LIBRARY
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const catalogIds = new Set(catalog.map(({ id }) => id));

  for (const exercise of catalog) {
    const normalizedName = exercise.name.trim().toLocaleLowerCase();
    if (ids.has(exercise.id)) errors.push(`Duplicate exercise ID: ${exercise.id}`);
    if (names.has(normalizedName)) errors.push(`Duplicate exercise name: ${exercise.name}`);
    ids.add(exercise.id);
    names.add(normalizedName);

    if (!exercise.id.trim()) errors.push(`Missing exercise ID: ${exercise.name}`);
    if (!exercise.name.trim()) errors.push(`Missing exercise name: ${exercise.id}`);
    if (!VALID_BODY_PARTS.has(exercise.category)) {
      errors.push(`Invalid or missing category: ${exercise.id}`);
    }
    if (exercise.bodyParts.length === 0) errors.push(`Missing category/body part: ${exercise.id}`);
    for (const bodyPart of exercise.bodyParts) {
      if (!VALID_BODY_PARTS.has(bodyPart)) errors.push(`Invalid body part "${bodyPart}": ${exercise.id}`);
    }
    if (exercise.primaryMuscles.length === 0) {
      errors.push(`Missing primary muscle: ${exercise.id}`);
    }
    for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
      if (!VALID_MUSCLES.has(muscle.toLocaleLowerCase())) {
        errors.push(`Invalid muscle "${muscle}": ${exercise.id}`);
      }
    }
    if (!exercise.movementPattern.trim()) errors.push(`Missing movement pattern: ${exercise.id}`);
    if (exercise.equipment.length === 0) errors.push(`Missing equipment: ${exercise.id}`);
    for (const equipment of exercise.equipment) {
      if (!VALID_EQUIPMENT.has(equipment)) errors.push(`Invalid equipment "${equipment}": ${exercise.id}`);
    }
    if (exercise.trainingModes.length === 0) errors.push(`Missing environment compatibility: ${exercise.id}`);
    if (!exercise.evidenceSummary.trim()) errors.push(`Missing evidence metadata: ${exercise.id}`);
    if (exercise.alternativeExerciseIds.length === 0) {
      errors.push(`Missing alternative exercises: ${exercise.id}`);
    }
    if (
      Object.values(exercise.recommendationFactors).some(
        (value) => !Number.isFinite(value) || value < 1 || value > 5
      ) ||
      Object.values(exercise.goalSuitability).some(
        (value) => !Number.isFinite(value) || value < 1 || value > 5
      )
    ) {
      errors.push(`Missing or invalid ranking metadata: ${exercise.id}`);
    }
    if (new Set(exercise.alternativeExerciseIds).size !== exercise.alternativeExerciseIds.length) {
      errors.push(`Duplicate alternative reference: ${exercise.id}`);
    }
    for (const alternativeId of exercise.alternativeExerciseIds) {
      if (alternativeId === exercise.id || !catalogIds.has(alternativeId)) {
        errors.push(`Invalid alternative "${alternativeId}": ${exercise.id}`);
      }
    }
  }

  return errors;
}

export type RankedExercise = ExerciseRecommendationScore;

const priorityMuscles: Record<string, string[]> = {
  shoulders: ['shoulder', 'front delt', 'lateral delt', 'rear delt'],
  upper_chest: ['upper chest'],
  back_v_taper: ['lat', 'upper back', 'lateral delt', 'rear delt'],
  arms: ['bicep', 'tricep', 'forearm'],
  legs: ['quadricep', 'hamstring', 'glute', 'calf'],
};

const priorityRelevanceToTarget = (priority: string, bodyPart: string): number => {
  const target = bodyPart.toLowerCase();
  if (priority === 'balanced') return 0.15;
  if (priority === 'back_v_taper') {
    if (['back', 'lats', 'upper back'].includes(target)) return 1;
    if (['shoulders', 'lateral delts', 'rear delts'].includes(target)) return 0.75;
    if (target === 'chest') return 0.15;
  }
  if (priority === 'upper_chest') {
    if (target === 'upper chest') return 1;
    if (target === 'chest') return 0.85;
  }
  if (priority === 'arms') {
    if (['biceps', 'triceps', 'forearms'].includes(target)) return 1;
    if (target === 'chest') return 0.15;
  }
  if (priority === 'shoulders' && ['shoulders', 'front delts', 'lateral delts', 'rear delts'].includes(target)) return 1;
  if (priority === 'legs' && ['quadriceps', 'hamstrings', 'glutes', 'calves'].includes(target)) return 1;
  return 0;
};

const priorityExerciseMatch = (
  exercise: ExerciseDefinition,
  priority: string,
  bodyPart: string
): number => {
  if (priority === 'balanced') return 0.4;
  if (
    priority === 'back_v_taper' &&
    exercise.bodyParts.some((part) => part.toLowerCase() === 'chest')
  ) return 0.35;
  const targets = priorityMuscles[priority] || [];
  const primaryTargets = exercise.primaryMuscles.filter((muscle) =>
    targets.some((target) => muscle.toLowerCase().includes(target))
  );
  const secondaryTargets = exercise.secondaryMuscles.filter((muscle) =>
    targets.some((target) => muscle.toLowerCase().includes(target))
  );
  const primaryMatch = (muscle: string) => {
    const normalized = muscle.toLowerCase();
    if (priority === 'shoulders') {
      if (normalized.includes('lateral delt')) return 1.2;
      if (normalized.includes('rear delt')) return 1;
      if (normalized.includes('front delt')) return 0.75;
    }
    if (priority === 'back_v_taper') {
      if (normalized.includes('lat')) return 1.2;
      if (normalized.includes('upper back')) return 0.8;
    }
    if (priority === 'upper_chest' && normalized.includes('upper chest')) return 1.2;
    return 1;
  };
  const primaryScore = primaryTargets.reduce(
    (score, muscle) => Math.max(score, primaryMatch(muscle)),
    0
  );
  if (primaryScore > 0) return primaryScore;
  if (secondaryTargets.length === 0) return 0;
  if (
    priority === 'shoulders' &&
    bodyPart.toLowerCase() === 'shoulders' &&
    secondaryTargets.some((muscle) => muscle.toLowerCase().includes('lateral delt'))
  ) {
    return 0.55;
  }
  return 0.5;
};

const scoreTargetRelevance = (exercise: ExerciseDefinition, bodyPart: string) => {
  const target = bodyPart.toLowerCase();
  const primary = exercise.primaryMuscles.map((muscle) => muscle.toLowerCase());
  const secondary = exercise.secondaryMuscles.map((muscle) => muscle.toLowerCase());
  const primaryHas = (needle: string) =>
    primary.some((muscle) => muscle.includes(needle));
  const secondaryHas = (needle: string) =>
    secondary.some((muscle) => muscle.includes(needle));

  if (target === 'upper chest') {
    if (primaryHas('upper chest')) return 5;
    if (secondaryHas('upper chest')) return 3.5;
    if (primaryHas('chest')) return 3.5;
  }
  if (target === 'chest') {
    if (primary.some((muscle) => muscle === 'chest')) return 5;
    if (primaryHas('upper chest')) return 4.5;
  }
  if (target === 'shoulders') {
    if (primary.some((muscle) => /^(front|lateral|rear) delts?$/.test(muscle))) return 5;
    if (secondary.some((muscle) => /^(front|lateral|rear) delts?$/.test(muscle))) return 3.5;
  }
  if (target === 'lateral delts' && primaryHas('lateral delt')) return 5;
  if (target === 'front delts' && primaryHas('front delt')) return 5;
  if (target === 'rear delts' && primaryHas('rear delt')) return 5;
  if (target === 'back') {
    if (primaryHas('lat') || primaryHas('upper back')) return 4.6;
    if (secondaryHas('lat') || secondaryHas('upper back')) return 3.5;
  }
  if (target === 'lats' && primaryHas('lat')) return 5;
  if (target === 'upper back' && primaryHas('upper back')) return 5;
  if (target === 'quadriceps' && primaryHas('quadricep')) return 5;
  if (target === 'hamstrings' && primaryHas('hamstring')) return 5;

  if (primary.some((muscle) =>
    muscle === target || muscle.includes(target.replace(/s$/, ''))
  )) return 5;
  if (exercise.bodyParts.some((part) => part.toLowerCase() === target)) return 4;
  const secondaryMatches = exercise.secondaryMuscles.some(
    (muscle) => muscle.toLowerCase() === target || muscle.toLowerCase().includes(target.replace(/s$/, ''))
  );
  return secondaryMatches ? 3 : 2;
};

const scoreBackResearchFit = (
  bodyPart: string,
  exerciseId: string,
  profile: ExerciseRecommendationProfile
): number => {
  const research = getBackResearchForExercise(exerciseId);
  if (!research) return 0;

  const targetFocus: Record<string, string[]> = {
    back: [
      'general_back',
      'lats',
      'upper_back',
      'upper_back_accessory',
      'rear_delts',
      'upper_traps',
      'lower_traps',
      'lower_back',
      'posterior_chain',
    ],
    lats: ['lats', 'general_back'],
    'upper back': [
      'upper_back',
      'upper_back_accessory',
      'rear_delts',
      'upper_traps',
      'lower_traps',
    ],
  };
  const target = bodyPart.toLowerCase();
  const matchingFocus = research.candidateFocus.filter((focus) =>
    targetFocus[target]?.includes(focus)
  );
  let score = matchingFocus.length > 0 ? (target === 'back' ? 1 : 2) : -0.5;

  const primaryTargetsByBodyPart: Record<string, string[]> = {
    back: [
      'latissimus_dorsi',
      'trapezius_upper',
      'trapezius_middle',
      'trapezius_lower',
      'rhomboids',
      'erector_spinae',
      'rear_deltoid',
    ],
    lats: ['latissimus_dorsi'],
    'upper back': [
      'trapezius_upper',
      'trapezius_middle',
      'trapezius_lower',
      'rhomboids',
      'rear_deltoid',
    ],
  };
  const selectedTargets = primaryTargetsByBodyPart[target] || [];
  if (research.primaryTargets.some((item) => selectedTargets.includes(item))) {
    score += 1.5;
  } else if (
    research.secondaryTargets.some((item) => selectedTargets.includes(item))
  ) {
    score += 0.5;
  }

  const role = research.recommendationRole;
  if (role.startsWith('core_pick')) score += 1;
  else if (role.includes('strong_alternative')) score += 0.6;
  else if (role.includes('targeted_accessory')) {
    score += target === 'upper back' ? 0.4 : -0.8;
  } else if (role.includes('compound')) {
    score += profile.goal === 'strength' || profile.physiqueFocus === 'strength'
      ? 1
      : -1;
  } else if (role === 'additional_option') {
    score -= 1.2;
  } else {
    score -= 0.3;
  }

  const fitValue = (fit: string) => {
    if (fit === 'high') return 2;
    if (fit === 'medium_to_high') return 1.5;
    if (fit === 'medium') return 1;
    if (fit === 'low_to_medium') return 0.5;
    return 0;
  };
  const practicalFit = research.practicalFit;
  score +=
    fitValue(practicalFit.progression) * 0.35 +
    fitValue(practicalFit.stability) * 0.25 -
    fitValue(practicalFit.skillDemand) * 0.2 -
    fitValue(practicalFit.fatigueDemand) *
      (profile.goal === 'strength' ? 0.1 : 0.2);

  if (
    profile.physiquePriorities.includes('back_v_taper') &&
    research.candidateFocus.includes('lats')
  ) {
    score += 1.5;
  } else if (
    profile.physiquePriorities.includes('back_v_taper') &&
    research.candidateFocus.includes('upper_back')
  ) {
    score += 0.5;
  }

  const citedSources = getBackResearchSources(research.evidenceRefs);
  const evidenceNotes = [
    research.finding,
    ...research.limitations,
    ...citedSources.map((source) => source.type),
  ].join(' ').toLowerCase();
  if (
    /acute emg|does not establish|not establish|not proven|limited direct evidence/.test(
      evidenceNotes
    )
  ) {
    score -= 0.5;
  }

  return score;
};

const scoreChestResearchFit = (
  bodyPart: string,
  exerciseId: string,
  profile: ExerciseRecommendationProfile
): { programmingScore: number; personalizationScore: number; priorityScore: number } => {
  const research = getChestResearchForExercise(exerciseId);
  const target = bodyPart.toLowerCase();
  if (!research || !['chest', 'upper chest'].includes(target)) {
    return { programmingScore: 0, personalizationScore: 0, priorityScore: 0 };
  }

  const targetIds =
    target === 'upper chest'
      ? ['pectoralis_major_clavicular']
      : ['pectoralis_major_sternocostal', 'pectoralis_major_clavicular'];
  let programmingScore = research.primaryTargets.some((item) =>
    targetIds.includes(item)
  )
    ? 1.5
    : research.secondaryTargets.some((item) => targetIds.includes(item))
      ? 0.5
      : 0;

  if (target === 'upper chest') {
    if (research.candidateFocus.includes('upper_chest')) programmingScore += 2;
    else if (research.candidateFocus.includes('overall_chest')) programmingScore += 0.5;
  } else if (research.candidateFocus.includes('overall_chest')) {
    programmingScore += 1.25;
  }

  if (research.recommendationRole === 'core_pick') programmingScore += 1.25;
  else if (research.recommendationRole === 'upper_chest_pick') {
    programmingScore += target === 'upper chest' ? 1.25 : 0.25;
  } else if (research.recommendationRole === 'strong_option') {
    programmingScore += 0.75;
  } else if (research.recommendationRole === 'home_option') {
    programmingScore += profile.workoutMode === 'home' ? 0.75 : 0.25;
  } else if (research.recommendationRole === 'accessory') {
    programmingScore += 0.25;
  } else {
    programmingScore -= 0.25;
  }

  const fitValue: Record<string, number> = {
    low: 0,
    low_to_moderate: 0.5,
    low_to_medium: 0.5,
    medium: 1,
    medium_to_high: 1.5,
    moderate: 1,
    moderate_to_high: 1.5,
    high: 2,
  };
  programmingScore +=
    (fitValue[research.practicalFit.progression] || 0) * 0.25 +
    (fitValue[research.practicalFit.stability] || 0) * 0.2 -
    (fitValue[research.practicalFit.skillDemand] || 0) * 0.1 -
    (fitValue[research.practicalFit.fatigueDemand] || 0) * 0.1;

  const evidenceNotes = [
    research.finding,
    ...research.limitations,
    ...getChestResearchSources(research.evidenceRefs).map((source) => source.type),
  ].join(' ').toLowerCase();
  if (/acute emg|not establish|not proven|limited direct|not chest-specific/.test(evidenceNotes)) {
    programmingScore -= 0.2;
  }

  let personalizationScore = 0;
  if (
    (profile.goal === 'strength' || profile.physiqueFocus === 'strength') &&
    research.candidateFocus.includes('strength')
  ) {
    personalizationScore += 1.5;
  }
  if (
    (profile.goal === 'muscle_gain' || profile.goal === 'hypertrophy') &&
    research.candidateFocus.includes('hypertrophy')
  ) {
    personalizationScore += 0.75;
  }
  if (
    profile.physiqueFocus === 'aesthetic_physique' &&
    research.candidateFocus.includes('upper_chest')
  ) {
    personalizationScore += 0.5;
  }
  if (
    profile.workoutMode === 'home' &&
    research.candidateFocus.some((focus) =>
      ['home', 'home_or_gym_progression', 'bodyweight', 'resistance_band'].includes(focus)
    )
  ) {
    personalizationScore += 0.5;
  }

  const priorityScore =
    profile.physiquePriorities.includes('upper_chest') &&
    research.primaryTargets.includes('pectoralis_major_clavicular') &&
    research.candidateFocus.includes('upper_chest')
      ? target === 'upper chest'
        ? 1.5
        : 0.75
      : 0;

  return { programmingScore, personalizationScore, priorityScore };
};

const scoreGoalFit = (
  exercise: ExerciseDefinition,
  goal: ExerciseRecommendationProfile['goal']
) => {
  if (goal === 'strength') return exercise.strengthSuitability;
  if (goal === 'general_fitness' || goal === 'fat_loss') {
    return exercise.recommendationFactors.practicality;
  }
  return exercise.goalSuitability[goal];
};

const scoreFocusFit = (
  exercise: ExerciseDefinition,
  focus: ExerciseRecommendationProfile['physiqueFocus']
) => {
  if (focus === 'strength') return exercise.strengthSuitability;
  if (focus === 'balanced_athletic') return exercise.recommendationFactors.practicality;
  return exercise.hypertrophySuitability;
};

const scoreFocusSpecificCharacteristics = (
  exercise: ExerciseDefinition,
  focus: ExerciseRecommendationProfile['physiqueFocus']
) => {
  const factors = exercise.recommendationFactors;
  if (focus === 'strength') {
    return (
      (exercise.strengthSuitability - 3) * 3 +
      (factors.progressiveOverload - 3) * 2 +
      (factors.resistanceProfile - 3) * 1.5 +
      (5 - factors.technicalComplexity - 2) * 1.5
    );
  }
  if (focus === 'balanced_athletic') {
    return (
      (factors.practicality - 3) * 3 +
      (factors.stability - 3) * 2 +
      (5 - factors.technicalComplexity - 2) * 2 -
      (factors.fatigueCost - 3)
    );
  }
  return (
    (exercise.hypertrophySuitability - 3) * 3 +
    (factors.stability - 3) * 2 +
    (factors.rangeOfMotion - 3) * 2 +
    (factors.progressiveOverload - 3) * 2 +
    (5 - factors.fatigueCost - 2) * 2 +
    (5 - factors.technicalComplexity - 2)
  );
};

const scoreExercise = (
  bodyPart: string,
  exercise: ExerciseDefinition,
  profile: ExerciseRecommendationProfile
) => {
  const factors = exercise.recommendationFactors;
  const availableEquipment = new Set(profile.availableEquipment);
  availableEquipment.add('Bodyweight');
  const hasEquipmentFilter = profile.availableEquipment.some(
    (item) => item !== 'Bodyweight'
  );
  const requiredEquipment = exercise.equipment.filter((item) => item !== 'Bodyweight');
  const missingEquipmentCount = hasEquipmentFilter
    ? requiredEquipment.filter((item) => !availableEquipment.has(item)).length
    : 0;
  const equipmentScore =
    (requiredEquipment.length === 0 ? 8 : Math.max(0, 10 - requiredEquipment.length * 1.5)) -
    missingEquipmentCount * 12;
  const targetFit = scoreTargetRelevance(exercise, bodyPart);
  const chestResearchFit = scoreChestResearchFit(bodyPart, exercise.id, profile);
  const programmingScore =
    targetFit * 4 +
    scoreBackResearchFit(bodyPart, exercise.id, profile) +
    chestResearchFit.programmingScore +
    factors.stability * 3 +
    factors.rangeOfMotion * 3 +
    factors.progressiveOverload * 3 +
    factors.resistanceProfile * 2 +
    factors.practicality * 2 +
    (5 - factors.fatigueCost) * 3 +
    (5 - factors.technicalComplexity) * 2;

  const goalFit = scoreGoalFit(exercise, profile.goal);
  const focusFit = scoreFocusFit(exercise, profile.physiqueFocus);
  const goalWeight =
    profile.goal === 'strength'
      ? 7
      : profile.goal === 'general_fitness' || profile.goal === 'fat_loss'
        ? 4
        : 6;
  const focusWeight = profile.physiqueFocus === 'strength' ? 6 : 5;
  let priorityScore = chestResearchFit.priorityScore;
  let personalizationScore =
    (goalFit - 3) * goalWeight +
    (focusFit - 3) * focusWeight +
    scoreFocusSpecificCharacteristics(exercise, profile.physiqueFocus) +
    equipmentScore;
  personalizationScore += chestResearchFit.personalizationScore;

  for (const priority of profile.physiquePriorities) {
    const targetRelevance = priorityRelevanceToTarget(priority, bodyPart);
    if (targetRelevance > 0) {
      priorityScore += 18 * targetRelevance * priorityExerciseMatch(exercise, priority, bodyPart);
    }
  }
  personalizationScore += priorityScore;

  const selectedDay = profile.programDays.find(
    (day) => day.dayOfWeek === profile.selectedDayOfWeek
  );
  const adjacentDayNumbers = [
    profile.selectedDayOfWeek === 1 ? 7 : profile.selectedDayOfWeek - 1,
    profile.selectedDayOfWeek === 7 ? 1 : profile.selectedDayOfWeek + 1,
  ];
  const splitRepeat = profile.programDays.some(
    (day) =>
      day.dayOfWeek !== profile.selectedDayOfWeek &&
      day.exercises.some((selection) => selection.exerciseId === exercise.id)
  );
  const adjacentMuscleOverlap = profile.programDays.some(
    (day) =>
      adjacentDayNumbers.includes(day.dayOfWeek) &&
      !day.isRestDay &&
      day.bodyParts.some((part) => exercise.bodyParts.includes(part))
  );
  const inDayPatternRepeat = Boolean(
    selectedDay?.exercises.some((selection) => {
      const selectedExercise = EXERCISE_LIBRARY.find(
        (candidate) => candidate.id === selection.exerciseId
      );
      return selectedExercise?.movementPattern === exercise.movementPattern;
    })
  );
  personalizationScore -=
    (splitRepeat ? 8 : 0) +
    (adjacentMuscleOverlap ? 3 : 0) +
    (inDayPatternRepeat ? 2 : 0);

  return {
    programmingScore,
    personalizationScore,
    priorityScore,
    equipmentScore,
    score: programmingScore + personalizationScore,
  };
};

export function scoreExerciseRecommendation(
  bodyPart: string,
  exercise: ExerciseDefinition,
  profile: ExerciseRecommendationProfile
): RankedExercise {
  const componentScores = scoreExercise(bodyPart, exercise, profile);
  const score = componentScores.score;
  const label =
    score >= 100
      ? 'Excellent match'
      : score >= 85
        ? 'Strong match'
        : score >= 70
          ? 'Good match'
          : 'Suitable option';
  const personalizationThreshold =
    profile.goal === 'strength' || profile.physiqueFocus === 'strength' ? 16 : 14;
  const personalizedFit =
    (scoreGoalFit(exercise, profile.goal) - 3) +
    (scoreFocusFit(exercise, profile.physiqueFocus) - 3) +
    scoreFocusSpecificCharacteristics(exercise, profile.physiqueFocus) / 5 +
    componentScores.priorityScore / 5 +
    (scoreTargetRelevance(exercise, bodyPart) - 3) * 0.75;
  return {
    exercise,
    ...componentScores,
    label,
    isForYou:
      componentScores.personalizationScore >= personalizationThreshold &&
      personalizedFit >= 5 &&
      scoreTargetRelevance(exercise, bodyPart) >= 4,
  };
}

export function rankExercises(
  bodyPart: string,
  profile: ExerciseRecommendationProfile
): RankedExercise[] {
  return getExerciseRecommendationPipeline(bodyPart, profile).ranked;
}

export interface ExerciseRecommendationPipeline {
  catalogCount: number;
  bodyPartCount: number;
  workoutModeCount: number;
  equipmentCount: number;
  ranked: RankedExercise[];
}

export function getExerciseRecommendationPipeline(
  bodyPart: string,
  profile: ExerciseRecommendationProfile
): ExerciseRecommendationPipeline {
  const availableEquipment = new Set(profile.availableEquipment);
  availableEquipment.add('Bodyweight');
  const hasEquipmentFilter = profile.availableEquipment.some(
    (item) => item !== 'Bodyweight'
  );
  const bodyPartMatches = EXERCISE_LIBRARY.filter((exercise) =>
    exercise.bodyParts.some((part) => part.toLowerCase() === bodyPart.toLowerCase())
  );
  const workoutModeMatches = bodyPartMatches.filter((exercise) =>
    exercise.trainingModes.includes(profile.workoutMode)
  );
  const equipmentMatches = workoutModeMatches.filter(
    (exercise) =>
      !hasEquipmentFilter ||
      exercise.equipment.every((equipment) => availableEquipment.has(equipment))
  );
  const scored = equipmentMatches
    .map((exercise) => scoreExerciseRecommendation(bodyPart, exercise, profile))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.exercise.name.localeCompare(right.exercise.name)
    );
  return {
    catalogCount: EXERCISE_LIBRARY.length,
    bodyPartCount: bodyPartMatches.length,
    workoutModeCount: workoutModeMatches.length,
    equipmentCount: equipmentMatches.length,
    ranked: scored,
  };
}

export function getCompatibleExerciseAlternatives(
  exercise: ExerciseDefinition,
  workoutMode: WorkoutMode,
  availableEquipment: string[]
): ExerciseDefinition[] {
  const equipment = new Set(availableEquipment);
  equipment.add('Bodyweight');

  return exercise.alternativeExerciseIds
    .map((alternativeId) => EXERCISE_LIBRARY.find(({ id }) => id === alternativeId))
    .filter(
      (alternative): alternative is ExerciseDefinition =>
        alternative !== undefined &&
        alternative.trainingModes.includes(workoutMode) &&
        alternative.equipment.every((item) => equipment.has(item))
    );
}
