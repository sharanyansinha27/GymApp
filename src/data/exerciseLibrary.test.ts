import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXERCISE_LIBRARY,
  getCompatibleExerciseAlternatives,
  rankExercises,
  scoreExerciseRecommendation,
  validateExerciseCatalog,
} from './exerciseLibrary';
import {
  EXERCISE_SCIENCE_SOURCES,
  getExerciseScienceContent,
} from './exerciseScience';
import {
  ExerciseRecommendationProfile,
  PhysiquePriority,
} from '../types';

const allEquipment = [
  ...new Set(EXERCISE_LIBRARY.flatMap((exercise) => exercise.equipment)),
];

const makeProfile = (
  overrides: Partial<ExerciseRecommendationProfile> = {}
): ExerciseRecommendationProfile => ({
  goal: 'muscle_gain',
  physiqueFocus: 'aesthetic_physique',
  workoutMode: 'gym',
  availableEquipment: allEquipment,
  physiquePriorities: [],
  programDays: [],
  selectedDayOfWeek: 1,
  ...overrides,
});

const scoreFor = (
  exerciseId: string,
  bodyPart: string,
  profile: ExerciseRecommendationProfile
) => {
  const exercise = EXERCISE_LIBRARY.find((item) => item.id === exerciseId);
  assert.ok(exercise, `Expected catalog exercise ${exerciseId}`);
  return scoreExerciseRecommendation(bodyPart, exercise, profile);
};

const scoreDifference = (
  exerciseId: string,
  bodyPart: string,
  priority: PhysiquePriority,
  withPriorityBodyPart: string
) => {
  const base = makeProfile();
  const prioritised = makeProfile({ physiquePriorities: [priority] });
  return (
    scoreFor(exerciseId, withPriorityBodyPart, prioritised).personalizationScore -
    scoreFor(exerciseId, withPriorityBodyPart, base).personalizationScore
  );
};

test('goal changes the score and ranking based on goal-specific suitability', () => {
  const muscleProfile = makeProfile();
  const strengthProfile = makeProfile({
    goal: 'strength',
    physiqueFocus: 'strength',
  });
  const muscleRanked = rankExercises('Chest', muscleProfile);
  const strengthRanked = rankExercises('Chest', strengthProfile);
  const benchMuscleScore = scoreFor(
    'barbell-bench-press',
    'Chest',
    muscleProfile
  ).score;
  const benchStrengthScore = scoreFor(
    'barbell-bench-press',
    'Chest',
    strengthProfile
  ).score;

  assert.notEqual(benchMuscleScore, benchStrengthScore);
  assert.notEqual(muscleRanked[0].exercise.id, strengthRanked[0].exercise.id);
  assert.equal(strengthRanked[0].exercise.id, 'barbell-bench-press');
});

test('physique focus has its own effect beyond the primary goal', () => {
  const aesthetic = makeProfile({ physiqueFocus: 'aesthetic_physique' });
  const strengthFocus = makeProfile({ physiqueFocus: 'strength' });
  const exerciseId = 'incline-dumbbell-press';

  assert.notEqual(
    scoreFor(exerciseId, 'Chest', aesthetic).personalizationScore,
    scoreFor(exerciseId, 'Chest', strengthFocus).personalizationScore
  );
});

test('priorities mainly affect the muscle groups they target', () => {
  const backPriority = makeProfile({ physiquePriorities: ['back_v_taper'] });
  const noPriority = makeProfile();
  const backGain =
    scoreFor('lat-pulldown', 'Back', backPriority).personalizationScore -
    scoreFor('lat-pulldown', 'Back', noPriority).personalizationScore;
  const chestGain =
    scoreFor('flat-dumbbell-press', 'Chest', backPriority).personalizationScore -
    scoreFor('flat-dumbbell-press', 'Chest', noPriority).personalizationScore;
  const upperChestPriority = makeProfile({ physiquePriorities: ['upper_chest'] });
  const inclineGain =
    scoreFor('incline-dumbbell-press', 'Chest', upperChestPriority).personalizationScore -
    scoreFor('incline-dumbbell-press', 'Chest', noPriority).personalizationScore;
  const flatGain =
    scoreFor('flat-dumbbell-press', 'Chest', upperChestPriority).personalizationScore -
    scoreFor('flat-dumbbell-press', 'Chest', noPriority).personalizationScore;
  const lateralDeltVtaperGain =
    scoreFor('dumbbell-lateral-raise', 'Lateral Delts', backPriority).personalizationScore -
    scoreFor('dumbbell-lateral-raise', 'Lateral Delts', noPriority).personalizationScore;
  const bicepsArmGain = scoreDifference(
    'dumbbell-curl',
    'Biceps',
    'arms',
    'Biceps'
  );

  assert.ok(backGain >= 14);
  assert.equal(
    scoreFor('lat-pulldown', 'Back', backPriority).priorityScore,
    backGain
  );
  assert.ok(lateralDeltVtaperGain >= 10);
  assert.ok(chestGain > 0 && chestGain < 3);
  assert.ok(inclineGain >= 10);
  assert.equal(flatGain, 0);
  assert.ok(bicepsArmGain >= 14);
});

test('equipment selection changes the equipment and total scores and filters unavailable exercises', () => {
  const fullKit = makeProfile();
  const missingRack = makeProfile({
    availableEquipment: allEquipment.filter((item) => item !== 'Rack'),
  });
  const fullScore = scoreFor(
    'barbell-bench-press',
    'Chest',
    fullKit
  );
  const noRackScore = scoreFor(
    'barbell-bench-press',
    'Chest',
    missingRack
  );

  assert.ok(noRackScore.equipmentScore < fullScore.equipmentScore);
  assert.ok(noRackScore.score < fullScore.score);
  assert.ok(
    !rankExercises('Chest', missingRack).some(
      ({ exercise }) => exercise.id === 'barbell-bench-press'
    )
  );
});

test('programming and personalization scores are separate, differentiated components', () => {
  const profile = makeProfile();
  const barbellPress = scoreFor('barbell-bench-press', 'Chest', profile);
  const cableFly = scoreFor('cable-chest-fly', 'Chest', profile);

  assert.equal(barbellPress.score, barbellPress.programmingScore + barbellPress.personalizationScore);
  assert.notEqual(barbellPress.programmingScore, cableFly.programmingScore);
  assert.notEqual(barbellPress.score, cableFly.score);
});

test('For You requires a strong user-specific score, not programming score alone', () => {
  const muscleProfile = makeProfile();
  const strengthProfile = makeProfile({
    goal: 'strength',
    physiqueFocus: 'strength',
  });
  const benchForMuscleProfile = scoreFor(
    'barbell-bench-press',
    'Chest',
    muscleProfile
  );
  const benchForStrengthProfile = scoreFor(
    'barbell-bench-press',
    'Chest',
    strengthProfile
  );

  assert.ok(benchForStrengthProfile.personalizationScore > benchForMuscleProfile.personalizationScore);
  assert.ok(
    !benchForMuscleProfile.isForYou ||
      benchForMuscleProfile.personalizationScore >= 14
  );
  assert.ok(benchForStrengthProfile.isForYou);

  const vTaperProfile = makeProfile({ physiquePriorities: ['back_v_taper'] });
  assert.equal(
    scoreFor('flat-dumbbell-press', 'Chest', vTaperProfile).isForYou,
    false
  );
  assert.equal(
    scoreFor('lat-pulldown', 'Back', vTaperProfile).isForYou,
    true
  );
});

test('expanded catalog has complete, unique metadata and valid alternatives', () => {
  assert.ok(EXERCISE_LIBRARY.length >= 150 && EXERCISE_LIBRARY.length <= 200);
  assert.deepEqual(validateExerciseCatalog(), []);

  for (const exercise of EXERCISE_LIBRARY) {
    for (const alternativeId of exercise.alternativeExerciseIds) {
      assert.ok(
        EXERCISE_LIBRARY.some(({ id }) => id === alternativeId),
        `${exercise.id} alternative ${alternativeId} must exist`
      );
    }
    assert.ok(exercise.category);
    assert.ok(exercise.primaryMuscles.length > 0);
    assert.ok(exercise.equipment.length > 0);
    assert.ok(exercise.trainingModes.length > 0);
    assert.ok(exercise.alternativeExerciseIds.length > 0);
  }

  const primaryAlternatives = EXERCISE_LIBRARY.find(
    ({ id }) => id === 'incline-dumbbell-press'
  );
  assert.ok(primaryAlternatives?.alternativeExerciseIds.includes('incline-barbell-press'));
  assert.ok(primaryAlternatives?.alternativeExerciseIds.includes('incline-machine-chest-press'));
});

test('catalog validation detects duplicate, missing, invalid, and broken metadata', () => {
  const invalidExercise = {
    ...EXERCISE_LIBRARY[0],
    id: 'invalid-exercise',
    name: 'Incline Dumbbell Press',
    category: '',
    primaryMuscles: [],
    secondaryMuscles: ['Not a muscle'],
    bodyParts: ['Imaginary body part'],
    movementPattern: '',
    equipment: ['Imaginary machine'],
    trainingModes: [],
    alternativeExerciseIds: ['missing-exercise'],
    recommendationFactors: {
      ...EXERCISE_LIBRARY[0].recommendationFactors,
      stability: 0,
    },
  };

  const errors = validateExerciseCatalog([
    EXERCISE_LIBRARY[0],
    { ...invalidExercise, id: EXERCISE_LIBRARY[0].id },
  ]);
  assert.ok(errors.some((error) => error.startsWith('Duplicate exercise ID:')));
  assert.ok(errors.some((error) => error.startsWith('Duplicate exercise name:')));
  assert.ok(errors.some((error) => error.startsWith('Missing primary muscle:')));
  assert.ok(errors.some((error) => error.startsWith('Invalid muscle')));
  assert.ok(errors.some((error) => error.startsWith('Invalid body part')));
  assert.ok(errors.some((error) => error.startsWith('Invalid or missing category:')));
  assert.ok(errors.some((error) => error.startsWith('Missing movement pattern:')));
  assert.ok(errors.some((error) => error.startsWith('Missing environment compatibility:')));
  assert.ok(errors.some((error) => error.startsWith('Invalid equipment')));
  assert.ok(errors.some((error) => error.startsWith('Invalid alternative')));
  assert.ok(errors.some((error) => error.startsWith('Missing or invalid ranking metadata:')));
});

test('gym and home browsing only returns exercises compatible with the selected environment and kit', () => {
  const homeProfile = makeProfile({
    workoutMode: 'home',
    availableEquipment: allEquipment,
  });
  const gymProfile = makeProfile({
    workoutMode: 'gym',
    availableEquipment: allEquipment,
  });
  const homeChest = rankExercises('Chest', homeProfile);
  const gymChest = rankExercises('Chest', gymProfile);

  assert.ok(homeChest.length > 0);
  assert.ok(gymChest.length > 0);
  assert.ok(homeChest.every(({ exercise }) => exercise.trainingModes.includes('home')));
  assert.ok(gymChest.every(({ exercise }) => exercise.trainingModes.includes('gym')));
  assert.ok(homeChest.some(({ exercise }) => exercise.id === 'band-chest-press'));
  assert.ok(!homeChest.some(({ exercise }) => exercise.id === 'barbell-bench-press'));
  assert.ok(rankExercises('Forearms', homeProfile).length > 0);

  const noBandProfile = makeProfile({
    workoutMode: 'home',
    availableEquipment: allEquipment.filter((equipment) => equipment !== 'Resistance Band'),
  });
  assert.ok(
    !rankExercises('Chest', noBandProfile).some(
      ({ exercise }) => exercise.id === 'band-chest-press'
    )
  );
});

test('alternative suggestions are filtered against the selected environment and equipment', () => {
  const pushUp = EXERCISE_LIBRARY.find(
    ({ id }) => id === 'push-up'
  );
  assert.ok(pushUp);

  const homeAlternatives = getCompatibleExerciseAlternatives(
    pushUp,
    'home',
    ['Bodyweight', 'Resistance Band']
  );
  const gymAlternatives = getCompatibleExerciseAlternatives(
    pushUp,
    'gym',
    ['Bodyweight', 'Resistance Band']
  );

  assert.deepEqual(homeAlternatives.map(({ id }) => id), ['diamond-push-up', 'band-chest-press']);
  assert.deepEqual(gymAlternatives.map(({ id }) => id), ['diamond-push-up']);
});

test('exercise science facts reference real catalogued sources and avoid exercise-specific claims', () => {
  const sourceIds = new Set(EXERCISE_SCIENCE_SOURCES.map(({ id }) => id));

  for (const exercise of EXERCISE_LIBRARY) {
    const content = getExerciseScienceContent(exercise);
    assert.ok(content.facts.length > 0);
    for (const fact of content.facts) {
      assert.ok(fact.sourceIds.length > 0);
      assert.ok(fact.sourceIds.every((sourceId) => sourceIds.has(sourceId)));
    }
  }
  for (const source of EXERCISE_SCIENCE_SOURCES) {
    assert.match(source.doi, /^10\./);
    assert.match(source.pubmedUrl, /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//);
    assert.match(source.doiUrl, /^https:\/\/doi\.org\//);
  }
});
