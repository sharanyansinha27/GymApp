import type { RankedExercise } from './exerciseLibrary';

export const ONBOARDING_STEP_COUNT = 4;

export type OnboardingStep =
  | 'goal'
  | 'location'
  | 'program'
  | 'schedule'
  | 'exercises'
  | 'summary';

const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  'goal',
  'location',
  'program',
  'schedule',
  'exercises',
  'summary',
];

export function getOnboardingStepProgress(step: OnboardingStep): number {
  switch (step) {
    case 'goal':
      return 1;
    case 'location':
      return 2;
    case 'summary':
      return ONBOARDING_STEP_COUNT;
    case 'program':
    case 'schedule':
    case 'exercises':
      return 3;
  }
}

export function getNextOnboardingStep(step: OnboardingStep): OnboardingStep {
  const index = ONBOARDING_STEP_ORDER.indexOf(step);
  return ONBOARDING_STEP_ORDER[Math.min(index + 1, ONBOARDING_STEP_ORDER.length - 1)];
}

export function getPreviousOnboardingStep(step: OnboardingStep): OnboardingStep {
  const index = ONBOARDING_STEP_ORDER.indexOf(step);
  return ONBOARDING_STEP_ORDER[Math.max(index - 1, 0)];
}

export function isValidWorkoutDayCount(workoutDayCount: number): boolean {
  return Number.isInteger(workoutDayCount) &&
    workoutDayCount >= 1 &&
    workoutDayCount <= 7;
}

export interface ExerciseRecommendationGroup {
  title: string;
  exercises: RankedExercise[];
}

export function groupExerciseRecommendations(
  recommendations: RankedExercise[],
  bodyPart: string
): ExerciseRecommendationGroup[] {
  const forYou = recommendations.filter(({ isForYou }) => isForYou);
  const more = recommendations.filter(({ isForYou }) => !isForYou);
  const groups: ExerciseRecommendationGroup[] = [];

  if (forYou.length > 0) {
    groups.push({ title: 'Recommended For You ⭐', exercises: forYou });
  }
  if (more.length > 0) {
    groups.push({ title: `More ${bodyPart} Exercises`, exercises: more });
  }
  return groups;
}
