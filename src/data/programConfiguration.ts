import {
  FitnessGoal,
  ProgramExerciseSelection,
  SplitDayDefinition,
  UserProgramDay,
  UserProgramRecord,
  WorkoutMode,
} from '../types';
import { EXERCISE_LIBRARY } from './exerciseLibrary';
import {
  createInitialExercisesForSplit,
  getSplitForDate,
} from './workoutSplit';

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const boundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, Math.round(value)))
    : fallback;

const normalizeSelection = (
  value: unknown,
  fallbackOrder: number
): ProgramExerciseSelection | null => {
  if (!isRecord(value) || typeof value.exerciseId !== 'string') return null;
  const exercise = EXERCISE_LIBRARY.find(({ id }) => id === value.exerciseId);
  if (!exercise) return null;

  const minReps = boundedInteger(
    value.minReps,
    1,
    100,
    exercise.recommendedRepRange.min
  );
  const maxReps = boundedInteger(
    value.maxReps,
    minReps,
    100,
    Math.max(minReps, exercise.recommendedRepRange.max)
  );
  const notes = typeof value.notes === 'string' ? value.notes.slice(0, 160) : '';

  return {
    exerciseId: exercise.id,
    targetSets: boundedInteger(value.targetSets, 1, 10, exercise.recommendedSets),
    minReps,
    maxReps,
    targetRir: boundedInteger(value.targetRir, 0, 4, 2),
    restSeconds: boundedInteger(
      value.restSeconds,
      15,
      600,
      exercise.recommendedRestSeconds
    ),
    order: boundedInteger(value.order, 1, 20, fallbackOrder),
    notes,
  };
};

export function normalizeProgramDays(value: unknown): UserProgramDay[] {
  const sourceDays = Array.isArray(value) ? value : [];
  return WEEKDAY_NAMES.map((dayName, index) => {
    const dayOfWeek = (index + 1) as UserProgramDay['dayOfWeek'];
    const source = sourceDays.find(
      (candidate) =>
        isRecord(candidate) &&
        candidate.dayOfWeek === dayOfWeek
    );
    if (!isRecord(source)) {
      return {
        dayOfWeek,
        dayName,
        isRestDay: true,
        name: '',
        bodyParts: [],
        exercises: [],
      };
    }

    const selections = Array.isArray(source.exercises)
      ? source.exercises
          .map((exercise, exerciseIndex) =>
            normalizeSelection(exercise, exerciseIndex + 1)
          )
          .filter(
            (exercise): exercise is ProgramExerciseSelection =>
              exercise !== null
          )
          .sort((left, right) => (left.order || 0) - (right.order || 0))
          .map((exercise, exerciseIndex) => ({
            ...exercise,
            order: exerciseIndex + 1,
          }))
      : [];
    const bodyParts = Array.isArray(source.bodyParts)
      ? source.bodyParts.filter(
          (part): part is string =>
            typeof part === 'string' && part.length <= 64
        ).slice(0, 17)
      : [];
    const isRestDay = source.isRestDay === true;

    return {
      dayOfWeek,
      dayName,
      isRestDay,
      name:
        typeof source.name === 'string'
          ? source.name.slice(0, 64)
          : isRestDay
            ? ''
            : `${dayName} Workout`,
      bodyParts: isRestDay ? [] : bodyParts,
      exercises: isRestDay ? [] : selections,
    };
  });
}

export function normalizeUserProgram(
  value: unknown,
  expectedUid: string
): UserProgramRecord | null {
  if (
    !isRecord(value) ||
    value.uid !== expectedUid ||
    value.programId !== 'current' ||
    value.status !== 'active' ||
    (value.workoutMode !== 'gym' && value.workoutMode !== 'home')
  ) {
    return null;
  }
  const goals: FitnessGoal[] = [
    'muscle_gain',
    'weight_gain',
    'fat_loss',
    'hypertrophy',
    'strength',
    'general_fitness',
    'body_recomposition',
  ];
  if (typeof value.goal !== 'string' || !goals.includes(value.goal as FitnessGoal)) {
    return null;
  }

  return {
    uid: expectedUid,
    programId: 'current',
    split: typeof value.split === 'string' ? value.split : 'custom',
    version: boundedInteger(value.version, 1, 100, 1),
    goal: value.goal as FitnessGoal,
    workoutMode: value.workoutMode as WorkoutMode,
    status: 'active',
    days: normalizeProgramDays(value.days),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export interface PlannedMuscleVolume {
  muscle: string;
  bodyPart: string;
  sets: number;
}

export function calculateWeeklyPlannedVolume(
  days: readonly UserProgramDay[]
): PlannedMuscleVolume[] {
  const totals = new Map<string, PlannedMuscleVolume>();

  for (const day of days) {
    if (day.isRestDay) continue;
    for (const selection of day.exercises) {
      const exercise = EXERCISE_LIBRARY.find(
        ({ id }) => id === selection.exerciseId
      );
      if (!exercise) continue;
      for (const muscle of exercise.primaryMuscles) {
        const key = muscle.toLocaleLowerCase();
        const current = totals.get(key);
        totals.set(key, {
          muscle,
          bodyPart: exercise.category,
          sets: (current?.sets || 0) + selection.targetSets,
        });
      }
    }
  }

  return [...totals.values()].sort((left, right) =>
    left.muscle.localeCompare(right.muscle)
  );
}

export function getProgramSplitForDate(
  dateString: string,
  program: UserProgramRecord | null | undefined
): SplitDayDefinition {
  const personalSplit = getSplitForDate(dateString);
  if (!program || program.status !== 'active') return personalSplit;

  const [, month, day] = dateString.split('-').map(Number);
  const weekdayDate = new Date(Number(dateString.slice(0, 4)), month - 1, day);
  const weekday = weekdayDate.getDay() === 0 ? 7 : weekdayDate.getDay();
  const programDay = program.days.find(({ dayOfWeek }) => dayOfWeek === weekday);
  if (!programDay || programDay.isRestDay) {
    return {
      splitId: 'rest',
      dayOfWeek: weekday,
      dayName: programDay?.dayName || personalSplit.dayName,
      title: `${(programDay?.dayName || personalSplit.dayName).toUpperCase()} — REST`,
      subtitle: 'Rest day in your saved program',
      exercises: [],
    };
  }

  const exercises = [...programDay.exercises]
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .flatMap((selection) => {
      const exercise = EXERCISE_LIBRARY.find(
        ({ id }) => id === selection.exerciseId
      );
      if (!exercise) return [];
      return [{
        exerciseId: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.category,
        targetSets: selection.targetSets,
        minReps: selection.minReps,
        maxReps: selection.maxReps,
        targetRir: selection.targetRir,
        restSeconds: selection.restSeconds,
        notes: selection.notes || '',
      }];
    });

  return {
    splitId: 'custom',
    dayOfWeek: weekday,
    dayName: programDay.dayName,
    title: `${programDay.dayName.toUpperCase()} — ${programDay.name.toUpperCase()}`,
    subtitle: programDay.bodyParts.join(' + ') || 'Custom workout',
    exercises,
  };
}

export function createInitialExercisesForProgramSplit(
  split: SplitDayDefinition,
  previousExercises: Parameters<typeof createInitialExercisesForSplit>[1]
) {
  return createInitialExercisesForSplit(split, previousExercises).map(
    (exercise, index) => ({
      ...exercise,
      notes: split.exercises[index]?.notes || '',
    })
  );
}
