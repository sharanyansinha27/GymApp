import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExerciseRecommendationGroups } from '../components/ExerciseRecommendationGroups';
import { ForYouBadge } from '../components/ForYouBadge';
import {
  EXERCISE_LIBRARY,
  getExerciseRecommendationPipeline,
} from './exerciseLibrary';
import {
  groupExerciseRecommendations,
  getNextOnboardingStep,
  getOnboardingStepProgress,
  isValidWorkoutDayCount,
  ONBOARDING_STEP_COUNT,
  OnboardingStep,
} from './programOnboardingFlow';
import { ExerciseRecommendationProfile } from '../types';

const allSteps: OnboardingStep[] = [
  'goal',
  'location',
  'program',
  'schedule',
  'exercises',
  'summary',
];

const recommendationProfile = (
  availableEquipment: string[]
): ExerciseRecommendationProfile => ({
  goal: 'muscle_gain',
  physiqueFocus: 'aesthetic_physique',
  workoutMode: 'gym',
  availableEquipment,
  physiquePriorities: [],
  programDays: [],
  selectedDayOfWeek: 1,
});

test('onboarding progress stays within four steps and Review/Save is the final step', () => {
  for (const step of allSteps) {
    const progress = getOnboardingStepProgress(step);
    assert.ok(progress >= 1 && progress <= ONBOARDING_STEP_COUNT);
  }

  assert.equal(getOnboardingStepProgress('summary'), ONBOARDING_STEP_COUNT);
  assert.equal(getNextOnboardingStep('summary'), 'summary');
});

test('exercise selection is not limited to bodyweight exercises by default', () => {
  const pipeline = getExerciseRecommendationPipeline(
    'Chest',
    recommendationProfile(['Bodyweight'])
  );
  const results = pipeline.ranked;
  const forYou = results.filter(({ isForYou }) => isForYou);
  const more = results.filter(({ isForYou }) => !isForYou);

  assert.deepEqual(
    {
      library: pipeline.catalogCount,
      bodyPart: pipeline.bodyPartCount,
      workoutMode: pipeline.workoutModeCount,
      equipment: pipeline.equipmentCount,
      ranked: results.length,
      rendered: forYou.length + more.length,
    },
    {
      library: EXERCISE_LIBRARY.length,
      bodyPart: EXERCISE_LIBRARY.filter((exercise) =>
        exercise.bodyParts.some((part) => part.toLowerCase() === 'chest')
      ).length,
      workoutMode: EXERCISE_LIBRARY.filter(
        (exercise) =>
          exercise.bodyParts.some((part) => part.toLowerCase() === 'chest') &&
          exercise.trainingModes.includes('gym')
      ).length,
      equipment: pipeline.workoutModeCount,
      ranked: pipeline.workoutModeCount,
      rendered: pipeline.workoutModeCount,
    }
  );
  assert.ok(results.length > 2);
  assert.ok(results.some(({ exercise }) => exercise.equipment.includes('Dumbbells')));
  assert.equal(forYou.length + more.length, results.length);
});

test('selecting equipment still filters exercises to compatible options', () => {
  const pipeline = getExerciseRecommendationPipeline(
    'Chest',
    recommendationProfile(['Dumbbells'])
  );
  const results = pipeline.ranked;

  assert.ok(results.length > 0);
  assert.ok(pipeline.equipmentCount < pipeline.workoutModeCount);
  assert.ok(
    results.every(({ exercise }) =>
      exercise.equipment.every(
        (equipment) => equipment === 'Bodyweight' || equipment === 'Dumbbells'
      )
    )
  );
});

test('valid lower-ranked exercises remain available regardless of goal and priorities', () => {
  const baseline = getExerciseRecommendationPipeline(
    'Shoulders',
    recommendationProfile([])
  ).ranked;
  const prioritizedProfile = recommendationProfile([]);
  prioritizedProfile.goal = 'strength';
  prioritizedProfile.physiquePriorities = ['shoulders'];
  const prioritized = getExerciseRecommendationPipeline(
    'Shoulders',
    prioritizedProfile
  ).ranked;

  assert.deepEqual(
    new Set(prioritized.map(({ exercise }) => exercise.id)),
    new Set(baseline.map(({ exercise }) => exercise.id))
  );
  assert.notDeepEqual(
    prioritized.map(({ exercise }) => exercise.id),
    baseline.map(({ exercise }) => exercise.id)
  );

  const lowerRankedExercise = prioritized.at(-1);
  assert.ok(lowerRankedExercise);
  assert.ok(prioritized.some(({ exercise }) => exercise.id === lowerRankedExercise.exercise.id));
});

test('goal changes ranking, not exercise eligibility', () => {
  const hypertrophy = recommendationProfile([]);
  const strength = {
    ...hypertrophy,
    goal: 'strength' as const,
    physiqueFocus: 'strength' as const,
  };
  const hypertrophyPipeline = getExerciseRecommendationPipeline('Chest', hypertrophy);
  const strengthPipeline = getExerciseRecommendationPipeline('Chest', strength);

  assert.equal(strengthPipeline.equipmentCount, hypertrophyPipeline.equipmentCount);
  assert.deepEqual(
    new Set(strengthPipeline.ranked.map(({ exercise }) => exercise.id)),
    new Set(hypertrophyPipeline.ranked.map(({ exercise }) => exercise.id))
  );
  assert.notDeepEqual(
    strengthPipeline.ranked.map(({ exercise }) => exercise.id),
    hypertrophyPipeline.ranked.map(({ exercise }) => exercise.id)
  );
});

test('physique priorities change ranking, not exercise eligibility', () => {
  const baseline = getExerciseRecommendationPipeline(
    'Shoulders',
    recommendationProfile([])
  );
  const prioritized = getExerciseRecommendationPipeline('Shoulders', {
    ...recommendationProfile([]),
    physiquePriorities: ['shoulders'],
  });

  assert.equal(prioritized.equipmentCount, baseline.equipmentCount);
  assert.deepEqual(
    new Set(prioritized.ranked.map(({ exercise }) => exercise.id)),
    new Set(baseline.ranked.map(({ exercise }) => exercise.id))
  );
  assert.notEqual(
    prioritized.ranked.find(({ exercise }) => exercise.id === 'dumbbell-lateral-raise')?.priorityScore,
    baseline.ranked.find(({ exercise }) => exercise.id === 'dumbbell-lateral-raise')?.priorityScore
  );
});

test('user-selected workout frequency can differ from any suggested frequency', () => {
  const suggestedWorkoutDays = 4;
  const userSelectedWorkoutDays = 2;

  assert.notEqual(userSelectedWorkoutDays, suggestedWorkoutDays);
  assert.equal(isValidWorkoutDayCount(userSelectedWorkoutDays), true);
  assert.equal(isValidWorkoutDayCount(1), true);
  assert.equal(isValidWorkoutDayCount(7), true);
  assert.equal(isValidWorkoutDayCount(0), false);
  assert.equal(isValidWorkoutDayCount(8), false);
});

test('recommendation display groups retain every ranked exercise with group titles', () => {
  const recommendations = getExerciseRecommendationPipeline(
    'Chest',
    recommendationProfile([])
  ).ranked;
  const groups = groupExerciseRecommendations(recommendations, 'Chest');

  assert.equal(
    groups.reduce((count, group) => count + group.exercises.length, 0),
    recommendations.length
  );
  assert.ok(groups.every((group) => group.exercises.length > 0));
  assert.ok(
    groups.every((group) =>
      ['Recommended For You ⭐', 'More Chest Exercises'].includes(group.title)
    )
  );
});

test('the React recommendation renderer emits every eligible card in scrollable groups', () => {
  const recommendations = getExerciseRecommendationPipeline(
    'Chest',
    recommendationProfile([])
  ).ranked;
  const groups = groupExerciseRecommendations(recommendations, 'Chest');
  const html = renderToStaticMarkup(
    React.createElement(ExerciseRecommendationGroups, {
      groups,
      renderExerciseCard: (item, index) =>
        React.createElement(
          'article',
          { key: item.exercise.id, 'data-exercise-id': item.exercise.id },
          `${index}. ${item.exercise.name}`,
          React.createElement('button', { type: 'button' }, 'Add')
        ),
    })
  );
  const renderedCardCount = (html.match(/<article\b/g) || []).length;
  const lowerRankedExerciseId = recommendations.at(-1)?.exercise.id;

  assert.equal(renderedCardCount, recommendations.length);
  assert.ok(lowerRankedExerciseId);
  assert.ok(html.includes(`data-exercise-id="${lowerRankedExerciseId}"`));
  assert.match(html, /<button[^>]*>Add<\/button>/);
});

test('qualified exercises render a FOR YOU badge after initial render and keep it on rerender', () => {
  const profile: ExerciseRecommendationProfile = {
    ...recommendationProfile([]),
    physiquePriorities: ['upper_chest'],
  };
  const recommendations = getExerciseRecommendationPipeline(
    'Chest',
    profile
  ).ranked;
  const inclinePress = recommendations.find(
    ({ exercise }) => exercise.id === 'incline-barbell-press'
  );
  assert.ok(inclinePress?.isForYou);

  const render = () =>
    renderToStaticMarkup(
      React.createElement('article', { 'data-exercise-id': inclinePress.exercise.id },
        React.createElement(ForYouBadge)
      )
    );
  const firstRender = render();
  const secondRender = render();

  assert.match(firstRender, /FOR YOU ⭐/);
  assert.equal(secondRender, firstRender);
});

test('profile initialization and updates produce stable qualified recommendations', async () => {
  let profile: ExerciseRecommendationProfile | null = null;
  const getForYouIds = (selectedMuscle: string) =>
    profile
      ? getExerciseRecommendationPipeline(selectedMuscle, profile).ranked
          .filter(({ isForYou }) => isForYou)
          .map(({ exercise }) => exercise.id)
      : [];

  assert.deepEqual(getForYouIds('Chest'), []);

  const loadedProfile: ExerciseRecommendationProfile = await Promise.resolve({
    ...recommendationProfile([]),
    physiquePriorities: ['upper_chest'],
  });
  profile = loadedProfile;
  const loadedIds = getForYouIds('Chest');
  assert.ok(loadedIds.includes('incline-dumbbell-press'));
  assert.ok(loadedIds.includes('incline-barbell-press'));
  assert.deepEqual(getForYouIds('Chest'), loadedIds);

  profile = {
    ...profile,
    goal: 'strength',
    physiqueFocus: 'strength',
  };
  const updatedIds = getForYouIds('Chest');
  assert.ok(updatedIds.length > 0);
  assert.deepEqual(getForYouIds('Chest'), updatedIds);
});

test('changing selected muscle updates FOR YOU matches while other groups still qualify', () => {
  const profile = recommendationProfile([]);
  const shoulderProfile: ExerciseRecommendationProfile = {
    ...recommendationProfile([]),
    physiquePriorities: ['shoulders'],
  };
  const backProfile: ExerciseRecommendationProfile = {
    ...recommendationProfile([]),
    physiquePriorities: ['back_v_taper'],
  };
  const getForYouIds = (
    muscle: string,
    profile: ExerciseRecommendationProfile
  ) => getExerciseRecommendationPipeline(muscle, profile).ranked
    .filter(({ isForYou }) => isForYou)
    .map(({ exercise }) => exercise.id);

  const chest = getForYouIds('Chest', profile);
  const upperChest = getForYouIds('Upper Chest', profile);
  const chestTop = getExerciseRecommendationPipeline('Chest', profile).ranked[0];
  const upperChestTop = getExerciseRecommendationPipeline('Upper Chest', profile).ranked[0];
  const shoulders = getForYouIds('Shoulders', shoulderProfile);
  const back = getForYouIds('Back', backProfile);

  assert.ok(chest.includes('incline-dumbbell-press'));
  assert.ok(upperChest.includes('incline-dumbbell-press'));
  assert.notEqual(chestTop?.exercise.id, upperChestTop?.exercise.id);
  assert.ok(shoulders.includes('dumbbell-lateral-raise'));
  assert.ok(back.includes('lat-pulldown'));
});

test('lower-ranked valid choices remain selectable and non-qualifying exercises lack the badge', () => {
  const profile: ExerciseRecommendationProfile = {
    ...recommendationProfile([]),
    physiquePriorities: ['upper_chest'],
  };
  const recommendations = getExerciseRecommendationPipeline(
    'Chest',
    profile
  ).ranked;
  const groups = groupExerciseRecommendations(recommendations, 'Chest');
  const lowerRanked = recommendations.at(-1);
  const nonQualifyingExercise = recommendations.find(
    ({ exercise }) => exercise.id === 'chest-dip'
  );
  assert.ok(lowerRanked);
  assert.ok(nonQualifyingExercise);
  assert.equal(nonQualifyingExercise.isForYou, false);

  const html = renderToStaticMarkup(
    React.createElement(ExerciseRecommendationGroups, {
      groups,
      renderExerciseCard: (item) =>
        React.createElement(
          'article',
          { key: item.exercise.id, 'data-exercise-id': item.exercise.id },
          item.isForYou ? React.createElement(ForYouBadge) : null,
          React.createElement('button', { type: 'button' }, 'Add')
        ),
    })
  );

  assert.ok(html.includes(`data-exercise-id="${lowerRanked.exercise.id}"`));
  assert.ok(html.includes(`data-exercise-id="${nonQualifyingExercise.exercise.id}"`));
  assert.match(html, /<button[^>]*>Add<\/button>/);
  const nonQualifyingMarkup = html
    .split('<article')
    .find((markup) =>
      markup.includes(`data-exercise-id="${nonQualifyingExercise.exercise.id}"`)
    );
  assert.ok(nonQualifyingMarkup);
  assert.doesNotMatch(nonQualifyingMarkup, /FOR YOU ⭐/);
});
