import { SplitDayDefinition, SplitId, LoggedExercise, PrescribedExercise } from '../types';

export const WEEKLY_SPLIT: SplitDayDefinition[] = [
  {
    splitId: 'pull_a',
    dayOfWeek: 1,
    dayName: 'Monday',
    title: 'MONDAY — PULL A',
    subtitle: 'Back Thickness, Width, Rear Delts & Biceps',
    exercises: [
      {
        exerciseId: 'lat_pulldown',
        name: 'Lat Pulldown',
        muscleGroup: 'Lats',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'chest_supported_row',
        name: 'Chest-Supported Row',
        muscleGroup: 'Upper Back',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'single_arm_cable_row',
        name: 'Single-Arm Cable Row',
        muscleGroup: 'Lats',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'reverse_pec_deck',
        name: 'Reverse Pec Deck',
        muscleGroup: 'Rear Delts',
        targetSets: 3,
        minReps: 12,
        maxReps: 20,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'ez_bar_curl',
        name: 'EZ-Bar Curl',
        muscleGroup: 'Biceps',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 120,
        isMajorLift: true,
      },
      {
        exerciseId: 'cable_curl',
        name: 'Cable Curl',
        muscleGroup: 'Biceps',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
    ],
  },
  {
    splitId: 'legs_a',
    dayOfWeek: 2,
    dayName: 'Tuesday',
    title: 'TUESDAY — LEGS A',
    subtitle: 'Quad Focus, Hamstrings, Calves & Core',
    exercises: [
      {
        exerciseId: 'smith_machine_squat',
        name: 'Smith Machine Squat',
        muscleGroup: 'Quadriceps',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 180,
        isMajorLift: true,
      },
      {
        exerciseId: 'leg_press',
        name: 'Leg Press',
        muscleGroup: 'Quadriceps',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'leg_extension',
        name: 'Leg Extension',
        muscleGroup: 'Quadriceps',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
      {
        exerciseId: 'lying_leg_curl',
        name: 'Lying Leg Curl',
        muscleGroup: 'Hamstrings',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 120,
      },
      {
        exerciseId: 'smith_machine_calf_raise',
        name: 'Smith Machine Calf Raise',
        muscleGroup: 'Calves',
        targetSets: 3,
        minReps: 8,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'cable_crunch',
        name: 'Cable Crunch',
        muscleGroup: 'Abs',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
    ],
  },
  {
    splitId: 'push_a',
    dayOfWeek: 3,
    dayName: 'Wednesday',
    title: 'WEDNESDAY — PUSH A',
    subtitle: 'Upper Chest, Deltoids & Triceps',
    exercises: [
      {
        exerciseId: 'incline_dumbbell_press',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'incline_chest_press_machine',
        name: 'Incline Chest Press Machine',
        muscleGroup: 'Chest',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 120,
      },
      {
        exerciseId: 'seated_cable_fly',
        name: 'Seated Cable Fly',
        muscleGroup: 'Chest',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
      {
        exerciseId: 'smith_machine_military_press',
        name: 'Smith Machine Military Press',
        muscleGroup: 'Shoulders',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'cable_lateral_raise',
        name: 'Cable Lateral Raise',
        muscleGroup: 'Side Delts',
        targetSets: 3,
        minReps: 12,
        maxReps: 20,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'overhead_cable_triceps_extension',
        name: 'Overhead Cable Triceps Extension',
        muscleGroup: 'Triceps',
        targetSets: 3,
        minReps: 8,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'cable_triceps_pressdown',
        name: 'Cable Triceps Pressdown',
        muscleGroup: 'Triceps',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
    ],
  },
  {
    splitId: 'pull_b',
    dayOfWeek: 4,
    dayName: 'Thursday',
    title: 'THURSDAY — PULL B',
    subtitle: 'Vertical Pull, Mid-Back Density & Bicep Peak',
    exercises: [
      {
        exerciseId: 'pull_ups',
        name: 'Pull-Ups / Assisted Pull-Ups',
        muscleGroup: 'Lats',
        targetSets: 3,
        minReps: 6,
        maxReps: 10,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 't_bar_row',
        name: 'T-Bar Row',
        muscleGroup: 'Mid Back',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'lat_pulldown',
        name: 'Lat Pulldown',
        muscleGroup: 'Lats',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 120,
      },
      {
        exerciseId: 'reverse_pec_deck',
        name: 'Reverse Pec Deck',
        muscleGroup: 'Rear Delts',
        targetSets: 2,
        minReps: 12,
        maxReps: 20,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'ez_bar_curl',
        name: 'EZ-Bar Curl',
        muscleGroup: 'Biceps',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 120,
      },
      {
        exerciseId: 'preacher_curl',
        name: 'Preacher Curl',
        muscleGroup: 'Biceps',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
    ],
  },
  {
    splitId: 'legs_b',
    dayOfWeek: 5,
    dayName: 'Friday',
    title: 'FRIDAY — LEGS B',
    subtitle: 'Hack Squat, Posterior Chain & Lower Abs',
    exercises: [
      {
        exerciseId: 'smith_machine_squat',
        name: 'Smith Machine Squat',
        muscleGroup: 'Quadriceps',
        targetSets: 2,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 180,
      },
      {
        exerciseId: 'hack_squat',
        name: 'Hack Squat',
        muscleGroup: 'Quadriceps',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'lying_leg_curl',
        name: 'Lying Leg Curl',
        muscleGroup: 'Hamstrings',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 120,
      },
      {
        exerciseId: 'dumbbell_rdl',
        name: 'Dumbbell Romanian Deadlift',
        muscleGroup: 'Hamstrings / Glutes',
        targetSets: 2,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 150,
        isMajorLift: true,
      },
      {
        exerciseId: 'leg_extension',
        name: 'Leg Extension',
        muscleGroup: 'Quadriceps',
        targetSets: 2,
        minReps: 12,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
      {
        exerciseId: 'smith_machine_calf_raise',
        name: 'Smith Machine Calf Raise',
        muscleGroup: 'Calves',
        targetSets: 3,
        minReps: 10,
        maxReps: 20,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'hanging_knee_raise',
        name: 'Hanging Knee Raise',
        muscleGroup: 'Abs',
        targetSets: 2,
        minReps: 8,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
    ],
  },
  {
    splitId: 'push_b',
    dayOfWeek: 6,
    dayName: 'Saturday',
    title: 'SATURDAY — PUSH B',
    subtitle: 'Heavy Bench, Chest Hypertrophy, Delts & Arm Specialization',
    exercises: [
      {
        exerciseId: 'flat_barbell_bench_press',
        name: 'Flat Barbell Bench Press',
        muscleGroup: 'Chest',
        targetSets: 3,
        minReps: 5,
        maxReps: 8,
        targetRir: 1,
        restSeconds: 180,
        isMajorLift: true,
      },
      {
        exerciseId: 'incline_dumbbell_press',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        targetSets: 2,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 150,
      },
      {
        exerciseId: 'dips',
        name: 'Dips',
        muscleGroup: 'Chest / Triceps',
        targetSets: 2,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 120,
      },
      {
        exerciseId: 'pec_deck',
        name: 'Pec Deck',
        muscleGroup: 'Chest',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
      {
        exerciseId: 'cable_lateral_raise',
        name: 'Cable/Dumbbell Lateral Raise',
        muscleGroup: 'Side Delts',
        targetSets: 4,
        minReps: 12,
        maxReps: 20,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'overhead_cable_triceps_extension',
        name: 'Overhead Triceps Extension',
        muscleGroup: 'Triceps',
        targetSets: 3,
        minReps: 8,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'cable_triceps_pressdown',
        name: 'Cable Triceps Pressdown',
        muscleGroup: 'Triceps',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
      {
        exerciseId: 'cable_curl',
        name: 'Cable Curl',
        muscleGroup: 'Biceps',
        targetSets: 3,
        minReps: 10,
        maxReps: 15,
        targetRir: 1,
        restSeconds: 90,
      },
      {
        exerciseId: 'preacher_curl',
        name: 'Preacher Curl / Incline Dumbbell Curl',
        muscleGroup: 'Biceps',
        targetSets: 2,
        minReps: 10,
        maxReps: 15,
        targetRir: 0,
        restSeconds: 90,
      },
    ],
  },
  {
    splitId: 'rest',
    dayOfWeek: 7,
    dayName: 'Sunday',
    title: 'SUNDAY — REST',
    subtitle: 'Active Recovery, Mobility, Nutrition & Sleep',
    exercises: [],
  },
];

export function getSplitForDate(dateStr: string): SplitDayDefinition {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const jsDay = dateObj.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const isoDay = jsDay === 0 ? 7 : jsDay;
  return WEEKLY_SPLIT.find((s) => s.dayOfWeek === isoDay) || WEEKLY_SPLIT[0];
}

export function getSplitById(splitId: SplitId): SplitDayDefinition {
  return WEEKLY_SPLIT.find((s) => s.splitId === splitId) || WEEKLY_SPLIT[0];
}

export function getDateForChallengeDay(startDateStr: string, dayNumber: number): string {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + (dayNumber - 1));
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getChallengeDayFromDate(startDateStr: string, currentDateStr: string): number {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [cy, cm, cd] = currentDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const curr = new Date(cy, cm - 1, cd);
  const diffDays = Math.floor((curr.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(100, diffDays));
}

export function getTodayDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function createInitialExercisesForSplit(
  split: SplitDayDefinition,
  previousExercisesMap: Record<string, LoggedExercise>
): LoggedExercise[] {
  return split.exercises.map((prescribed: PrescribedExercise) => {
    const prev = previousExercisesMap[prescribed.exerciseId];
    const sets = Array.from({ length: prescribed.targetSets }, (_, idx) => {
      const prevSet = prev?.sets?.[idx] || prev?.sets?.[prev.sets.length - 1];
      return {
        setNumber: idx + 1,
        weight: prevSet ? prevSet.weight : 20,
        reps: prevSet ? prevSet.reps : prescribed.minReps,
        rir: prescribed.targetRir,
        reachedFailure: false,
        restTimeSeconds: prescribed.restSeconds,
        completed: false,
      };
    });

    return {
      exerciseId: prescribed.exerciseId,
      name: prescribed.name,
      muscleGroup: prescribed.muscleGroup,
      targetSets: prescribed.targetSets,
      minReps: prescribed.minReps,
      maxReps: prescribed.maxReps,
      targetRir: prescribed.targetRir,
      restSeconds: prescribed.restSeconds,
      skipped: false,
      notes: '',
      sets,
    };
  });
}

export const ALL_UNIQUE_EXERCISES: { exerciseId: string; name: string; muscleGroup: string; isMajorLift?: boolean }[] = (() => {
  const map = new Map<string, { exerciseId: string; name: string; muscleGroup: string; isMajorLift?: boolean }>();
  for (const split of WEEKLY_SPLIT) {
    for (const ex of split.exercises) {
      if (!map.has(ex.exerciseId)) {
        map.set(ex.exerciseId, {
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          isMajorLift: ex.isMajorLift,
        });
      }
    }
  }
  return Array.from(map.values());
})();
