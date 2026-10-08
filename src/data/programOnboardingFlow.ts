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
