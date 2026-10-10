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
  BACK_RESEARCH_CATALOG_MAPPINGS,
  getBackResearchCatalogIds,
  getBackResearchForExercise,
  getBackResearchSources,
} from './backExerciseResearch';
import {
  CHEST_RESEARCH_CATALOG_MAPPINGS,
  getChestResearchCatalogIds,
  getChestResearchForExercise,
  getChestResearchSources,
} from './chestExerciseResearch';
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
  assert.deepEqual(
    new Set(muscleRanked.map(({ exercise }) => exercise.id)),
    new Set(strengthRanked.map(({ exercise }) => exercise.id))
  );
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
  assert.ok(
    Math.abs(scoreFor('lat-pulldown', 'Back', backPriority).priorityScore - backGain) < 1e-9
  );
  assert.ok(lateralDeltVtaperGain >= 10);
  assert.ok(chestGain > 0 && chestGain < 3);
  assert.ok(inclineGain >= 10);
  assert.equal(flatGain, 0);
  assert.ok(bicepsArmGain >= 14);
});

test('upper-chest priority promotes incline pressing without hiding flat pressing', () => {
  const profile = makeProfile({ physiquePriorities: ['upper_chest'] });
  const ranked = rankExercises('Chest', profile);
  const rankedIds = ranked.map(({ exercise }) => exercise.id);
  const forYouIds = ranked
    .filter(({ isForYou }) => isForYou)
    .map(({ exercise }) => exercise.id);

  assert.ok(rankedIds.indexOf('incline-dumbbell-press') < rankedIds.indexOf('flat-dumbbell-press'));
  assert.ok(rankedIds.indexOf('incline-barbell-press') < rankedIds.indexOf('flat-dumbbell-press'));
  assert.ok(forYouIds.includes('incline-dumbbell-press'));
  assert.ok(forYouIds.includes('incline-machine-chest-press'));
  assert.ok(rankedIds.includes('flat-dumbbell-press'));
});

test('shoulder priority favors lateral-delt movements and keeps other shoulder lifts', () => {
  const profile = makeProfile({ physiquePriorities: ['shoulders'] });
  const ranked = rankExercises('Shoulders', profile);
  const rankedIds = ranked.map(({ exercise }) => exercise.id);
  const forYouIds = ranked
    .filter(({ isForYou }) => isForYou)
    .map(({ exercise }) => exercise.id);

  assert.ok(rankedIds.indexOf('dumbbell-lateral-raise') < rankedIds.indexOf('barbell-overhead-press'));
  assert.ok(rankedIds.indexOf('cable-lateral-raise') < rankedIds.indexOf('barbell-overhead-press'));
  assert.ok(forYouIds.includes('dumbbell-lateral-raise'));
  assert.ok(forYouIds.includes('cable-lateral-raise'));
  assert.ok(rankedIds.includes('barbell-overhead-press'));
});

test('a single profile receives different rankings for different selected muscles', () => {
  const profile = makeProfile();
  const chestRanked = rankExercises('Chest', profile);
  const upperChestRanked = rankExercises('Upper Chest', profile);

  assert.notEqual(chestRanked[0].exercise.id, upperChestRanked[0].exercise.id);
  assert.equal(chestRanked[0].exercise.id, 'machine-chest-press');
  assert.equal(upperChestRanked[0].exercise.id, 'incline-machine-chest-press');
});

test('For You uses profile and muscle-relative scoring rather than a universal exercise list', () => {
  const upperChestProfile = makeProfile({
    physiquePriorities: ['upper_chest'],
  });
  const shoulderProfile = makeProfile({
    physiquePriorities: ['shoulders'],
  });
  const upperChestRecommendations = rankExercises('Chest', upperChestProfile);
  const shoulderRecommendations = rankExercises('Shoulders', shoulderProfile);
  const upperChestForYou = upperChestRecommendations.filter(({ isForYou }) => isForYou);
  const shoulderForYou = shoulderRecommendations.filter(({ isForYou }) => isForYou);

  assert.ok(upperChestForYou.length > 1);
  assert.ok(shoulderForYou.length > 1);
  assert.notDeepEqual(
    new Set(upperChestForYou.map(({ exercise }) => exercise.id)),
    new Set(shoulderForYou.map(({ exercise }) => exercise.id))
  );
});

test('pipeline preserves each exercise qualification instead of gating it by rank distance', () => {
  const profile = makeProfile({ physiquePriorities: ['upper_chest'] });
  const ranked = rankExercises('Chest', profile);
  const inclineBarbellPress = ranked.find(
    ({ exercise }) => exercise.id === 'incline-barbell-press'
  );
  assert.ok(inclineBarbellPress);
  assert.equal(
    inclineBarbellPress.isForYou,
    scoreFor('incline-barbell-press', 'Chest', profile).isForYou
  );
  assert.equal(inclineBarbellPress.isForYou, true);

  for (const item of ranked) {
    assert.equal(
      item.isForYou,
      scoreExerciseRecommendation('Chest', item.exercise, profile).isForYou
    );
  }
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
    scoreFor('chest-dip', 'Chest', vTaperProfile).isForYou,
    false
  );
  assert.equal(
    scoreFor('lat-pulldown', 'Back', vTaperProfile).isForYou,
    true
  );
});

test('an unrelated targeted priority does not veto strong matches for another muscle', () => {
  const upperChestPriorityProfile = makeProfile({
    physiquePriorities: ['upper_chest'],
  });
  const backRecommendations = rankExercises('Back', upperChestPriorityProfile);
  const baselineBackExercises = rankExercises('Back', makeProfile());

  assert.ok(backRecommendations.some(({ isForYou }) => isForYou));
  assert.deepEqual(
    backRecommendations.map(({ exercise }) => exercise.id),
    baselineBackExercises.map(({ exercise }) => exercise.id)
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
    name: EXERCISE_LIBRARY[0].name,
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

test('Back research imports without duplicate exercise records and reuses current category IDs', () => {
  const exerciseIds = new Set(EXERCISE_LIBRARY.map(({ id }) => id));
  const researchCatalogIds = BACK_RESEARCH_CATALOG_MAPPINGS.flatMap(
    ({ catalogIds }) => catalogIds
  );

  assert.equal(new Set(researchCatalogIds).size, researchCatalogIds.length);
  for (const mapping of BACK_RESEARCH_CATALOG_MAPPINGS) {
    const matchedIds = getBackResearchCatalogIds(mapping.researchId);
    assert.deepEqual(matchedIds, mapping.catalogIds);
    assert.ok(matchedIds.length > 0);
    assert.ok(matchedIds.every((id) => exerciseIds.has(id)));
    const research = getBackResearchForExercise(matchedIds[0]);
    assert.ok(research);
    const visibleTags = research.visibleTags.map((tag) =>
      tag === 'Quads' ? 'Quadriceps' : tag
    );
    assert.ok(
      matchedIds.every((id) => {
        const exercise = EXERCISE_LIBRARY.find((item) => item.id === id);
        return exercise?.bodyParts.every((part) => part !== 'Quads') &&
          visibleTags.every((tag) => exercise?.bodyParts.includes(tag));
      })
    );
  }

  assert.ok(
    EXERCISE_LIBRARY.some(({ id }) => id === 'single-arm-cable-pulldown')
  );
  assert.ok(!EXERCISE_LIBRARY.some(({ id }) => id === 'one-arm-cable-pulldown'));
  assert.ok(EXERCISE_LIBRARY.some(({ id }) => id === 'single-arm-cable-row'));
  assert.ok(!EXERCISE_LIBRARY.some(({ id }) => id === 'one-arm-cable-row'));

  const newlyAddedIds = [
    'dumbbell-pullover',
    'machine-shrug',
    'cable-shrug',
    'prone-y-raise',
    'incline-y-raise',
    'cable-y-raise',
    'prone-cobra',
    'back-extension-45',
    'machine-lumbar-extension',
    'deadlift',
  ];
  const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const id of newlyAddedIds) {
    const exercise = EXERCISE_LIBRARY.find((item) => item.id === id);
    assert.ok(exercise);
    assert.equal(
      EXERCISE_LIBRARY.filter(
        (item) => normalizeName(item.name) === normalizeName(exercise.name)
      ).length,
      1,
      `${exercise.name} is not duplicated by normalized name`
    );
  }
});

test('Back, Lats, and Upper Back eligible counts expand only through the merged valid catalog', () => {
  const profile = makeProfile();
  const expectedCounts = {
    Back: { before: 23, after: 38 },
    Lats: { before: 17, after: 19 },
    'Upper Back': { before: 14, after: 22 },
  };

  for (const [bodyPart, counts] of Object.entries(expectedCounts)) {
    const actual = rankExercises(bodyPart, profile).length;
    assert.equal(actual, counts.after, `${bodyPart} eligible exercise count`);
    assert.ok(actual >= counts.before);
  }
});

test('Back research improves lat and upper-back context without making recommendations eligibility filters', () => {
  const lats = rankExercises('Lats', makeProfile());
  const upperBack = rankExercises('Upper Back', makeProfile());
  const latIds = lats.map(({ exercise }) => exercise.id);
  const upperBackIds = upperBack.map(({ exercise }) => exercise.id);

  assert.ok(latIds.indexOf('lat-pulldown') < latIds.indexOf('straight-arm-pulldown'));
  assert.ok(latIds.includes('single-arm-cable-pulldown'));
  assert.ok(!latIds.includes('dumbbell-pullover'));
  assert.ok(upperBackIds.includes('machine-shrug'));
  assert.ok(upperBackIds.includes('prone-y-raise'));
  assert.ok(upperBackIds.includes('incline-y-raise'));
  assert.ok(upperBackIds.includes('cable-y-raise'));
  assert.ok(upperBackIds.includes('chest-supported-row'));
  const backIds = rankExercises('Back', makeProfile()).map(
    ({ exercise }) => exercise.id
  );
  assert.ok(backIds.includes('dumbbell-pullover'));
  assert.ok(backIds.indexOf('dumbbell-pullover') > backIds.indexOf('lat-pulldown'));
});

test('Back goal and V-taper priority change ranking without changing eligible exercises', () => {
  const base = makeProfile();
  const strength = makeProfile({ goal: 'strength', physiqueFocus: 'strength' });
  const vTaper = makeProfile({ physiquePriorities: ['back_v_taper'] });
  const baseRanked = rankExercises('Back', base);
  const strengthRanked = rankExercises('Back', strength);
  const vTaperRanked = rankExercises('Back', vTaper);
  const baseIds = new Set(baseRanked.map(({ exercise }) => exercise.id));

  assert.notEqual(baseRanked[0].exercise.id, strengthRanked[0].exercise.id);
  assert.notDeepEqual(
    baseRanked.map(({ exercise }) => exercise.id),
    vTaperRanked.map(({ exercise }) => exercise.id)
  );
  assert.deepEqual(new Set(strengthRanked.map(({ exercise }) => exercise.id)), baseIds);
  assert.deepEqual(new Set(vTaperRanked.map(({ exercise }) => exercise.id)), baseIds);
  assert.ok(
    vTaperRanked.findIndex(({ exercise }) => exercise.id === 'single-arm-cable-pulldown') <
      baseRanked.findIndex(({ exercise }) => exercise.id === 'single-arm-cable-pulldown')
  );
});

test('upper/lower trap accessories and lower-back extension roles remain distinct', () => {
  const upperBackIds = rankExercises('Upper Back', makeProfile()).map(
    ({ exercise }) => exercise.id
  );
  const backIds = rankExercises('Back', makeProfile()).map(
    ({ exercise }) => exercise.id
  );
  const extension = backIds.indexOf('back-extension-45');
  const deadlift = backIds.indexOf('deadlift');

  assert.ok(upperBackIds.indexOf('machine-shrug') < upperBackIds.indexOf('prone-y-raise'));
  assert.ok(upperBackIds.includes('cable-shrug'));
  assert.ok(upperBackIds.includes('prone-cobra'));
  assert.ok(extension >= 0);
  assert.ok(deadlift >= 0);
  assert.ok(extension < deadlift);
  assert.deepEqual(
    getBackResearchForExercise('deadlift')?.primaryTargets,
    ['gluteus_maximus', 'hamstrings', 'quadriceps']
  );
  assert.ok(
    getBackResearchForExercise('deadlift')?.secondaryTargets.includes('erector_spinae')
  );
});

test('new Back records respect gym/home and equipment compatibility', () => {
  const noShrugMachine = makeProfile({
    availableEquipment: allEquipment.filter((item) => item !== 'Shrug machine'),
  });
  const home = makeProfile({
    workoutMode: 'home',
    availableEquipment: ['Bodyweight', 'Dumbbells', 'Incline bench', 'Flat bench'],
  });
  const withoutMachineShrug = rankExercises('Upper Back', noShrugMachine);
  const homeBack = rankExercises('Back', home);

  assert.ok(!withoutMachineShrug.some(({ exercise }) => exercise.id === 'machine-shrug'));
  assert.ok(withoutMachineShrug.some(({ exercise }) => exercise.id === 'cable-shrug'));
  assert.ok(homeBack.some(({ exercise }) => exercise.id === 'prone-y-raise'));
  assert.ok(!homeBack.some(({ exercise }) => exercise.id === 'machine-shrug'));
  assert.ok(!homeBack.some(({ exercise }) => exercise.id === 'back-extension-45'));
});

test('Chest research reuses Chest categories and updates mapped exercises without duplicates', () => {
  const ids = new Set(EXERCISE_LIBRARY.map(({ id }) => id));
  const mappedCatalogIds = CHEST_RESEARCH_CATALOG_MAPPINGS.map(
    ({ catalogId }) => catalogId
  );
  const newIds = [
    'incline-cable-chest-press',
    'assisted-chest-dip',
    'cable-chest-press',
    'dumbbell-fly',
  ];

  assert.equal(new Set(mappedCatalogIds).size, mappedCatalogIds.length);
  assert.equal(EXERCISE_LIBRARY.filter(({ id }) => newIds.includes(id)).length, 4);
  assert.ok(
    CHEST_RESEARCH_CATALOG_MAPPINGS.every(({ catalogId }) => ids.has(catalogId))
  );
  assert.deepEqual(
    CHEST_RESEARCH_CATALOG_MAPPINGS.map(({ researchId, catalogId }) =>
      getChestResearchCatalogIds(researchId).includes(catalogId)
    ),
    CHEST_RESEARCH_CATALOG_MAPPINGS.map(() => true)
  );

  const normalizeName = (name: string) =>
    name.toLocaleLowerCase().normalize('NFKD')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .sort()
      .join(' ');
  for (const { catalogId, researchId } of CHEST_RESEARCH_CATALOG_MAPPINGS) {
    const exercise = EXERCISE_LIBRARY.find(({ id }) => id === catalogId);
    const research = getChestResearchForExercise(catalogId);
    assert.ok(exercise);
    assert.ok(research);
    if (catalogId !== researchId) {
      assert.ok(
        [research.name, ...research.matchAliases].some(
          (name) => normalizeName(name) === normalizeName(exercise.name)
        ) || newIds.includes(catalogId),
        `${catalogId} maps to a matching research name or is a new catalog record`
      );
    }
  }

  assert.ok(EXERCISE_LIBRARY.every(
    (exercise) =>
      EXERCISE_LIBRARY.filter(
        ({ name }) =>
          name.trim().toLocaleLowerCase() === exercise.name.trim().toLocaleLowerCase()
      ).length === 1
  ));
  assert.ok(EXERCISE_LIBRARY.some(({ id }) => id === 'incline-machine-chest-press'));
  assert.ok(!EXERCISE_LIBRARY.some(({ id }) => id === 'incline-machine-press'));
  assert.ok(EXERCISE_LIBRARY.some(({ id }) => id === 'push-up'));
  assert.ok(!EXERCISE_LIBRARY.some(({ id }) => id === 'weighted-push-up'));
  assert.ok(EXERCISE_LIBRARY.some(({ bodyParts }) => bodyParts.includes('Chest')));
  assert.ok(EXERCISE_LIBRARY.some(({ bodyParts }) => bodyParts.includes('Upper Chest')));
});

test('Chest and Upper Chest recommendation rankings use contextual research inputs', () => {
  const chestProfile = makeProfile();
  const strengthProfile = makeProfile({
    goal: 'strength',
    physiqueFocus: 'strength',
  });
  const upperChestPriority = makeProfile({
    physiquePriorities: ['upper_chest'],
  });
  const upperChestBaseline = rankExercises('Upper Chest', makeProfile());
  const chest = rankExercises('Chest', chestProfile);
  const strengthChest = rankExercises('Chest', strengthProfile);
  const upperChest = rankExercises('Upper Chest', upperChestPriority);
  const chestIds = new Set(chest.map(({ exercise }) => exercise.id));
  const strengthChestIds = new Set(strengthChest.map(({ exercise }) => exercise.id));
  const upperChestIds = new Set(upperChest.map(({ exercise }) => exercise.id));
  const upperChestBaselineIds = new Set(
    upperChestBaseline.map(({ exercise }) => exercise.id)
  );

  assert.equal(chest.length, 24);
  assert.equal(upperChest.length, 7);
  assert.ok(chestIds.has('barbell-bench-press'));
  assert.ok(chestIds.has('flat-dumbbell-press'));
  assert.ok(chest.findIndex(({ exercise }) => exercise.id === 'flat-dumbbell-press') < 8);
  assert.ok(chest.find(({ exercise }) => exercise.id === 'flat-dumbbell-press')?.isForYou);
  assert.ok(strengthChest.findIndex(({ exercise }) => exercise.id === 'barbell-bench-press') < 3);
  const stronglyRankedUpperChestPresses = new Set([
    'incline-machine-chest-press',
    'incline-dumbbell-press',
    'incline-cable-chest-press',
    'smith-incline-press',
    'incline-barbell-press',
  ]);
  assert.ok(
    upperChest.slice(0, 5).every(({ exercise }) =>
      stronglyRankedUpperChestPresses.has(exercise.id)
    )
  );
  assert.ok(upperChestIds.has('incline-cable-chest-press'));

  assert.deepEqual(strengthChestIds, chestIds);
  assert.deepEqual(upperChestIds, upperChestBaselineIds);
  const baselineUpperChestRanking = upperChestBaseline.map(
    ({ exercise }) => exercise.id
  );
  assert.notDeepEqual(upperChest.map(({ exercise }) => exercise.id), baselineUpperChestRanking);
  assert.notDeepEqual(
    chest.map(({ exercise }) => exercise.id),
    strengthChest.map(({ exercise }) => exercise.id)
  );
});

test('Chest FOR YOU badges use shared qualification and valid choices remain selectable', () => {
  const profile = makeProfile({ physiquePriorities: ['upper_chest'] });
  const qualified = rankExercises('Upper Chest', profile).find(
    ({ exercise }) => exercise.id === 'incline-dumbbell-press'
  );
  const nonQualifying = rankExercises('Chest', profile).find(
    ({ exercise }) => exercise.id === 'close-grip-bench-press'
  );
  assert.ok(qualified?.isForYou);
  assert.equal(
    scoreExerciseRecommendation('Upper Chest', qualified.exercise, profile).isForYou,
    qualified.isForYou
  );
  assert.equal(nonQualifying?.isForYou, false);
  assert.ok(rankExercises('Chest', profile).some(
    ({ exercise }) => exercise.id === 'close-grip-bench-press'
  ));
});

test('Chest Nerd Facts stay plain and link to verified relevant HTTPS sources', () => {
  for (const { catalogId } of CHEST_RESEARCH_CATALOG_MAPPINGS) {
    const exercise = EXERCISE_LIBRARY.find(({ id }) => id === catalogId);
    assert.ok(exercise);
    const research = getChestResearchForExercise(catalogId);
    assert.ok(research);
    const content = getExerciseScienceContent(exercise);
    assert.equal(content.facts.length, 1);
    assert.ok(content.facts[0].text.split(/[.!?]+/).filter(Boolean).length <= 2);
    assert.doesNotMatch(content.facts[0].text, /EMG|pectoralis|clavicular|sternocostal/i);
    const sources = getChestResearchSources(research.evidenceRefs);
    assert.ok(sources.length > 0);
    for (const source of sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.equal(content.sources.some((item) => item.id === source.id), true);
      if (source.pmid) {
        assert.equal(url.hostname, 'pubmed.ncbi.nlm.nih.gov');
        assert.equal(url.pathname.replaceAll('/', ''), source.pmid);
      } else {
        assert.equal(url.hostname, 'www.ncbi.nlm.nih.gov');
      }
      if (source.doi) {
        assert.equal(
          content.sources.find((item) => item.id === source.id)?.doiUrl,
          `https://doi.org/${source.doi}`
        );
      }
    }
  }
});

test('Chest Gym/Home and equipment constraints preserve bodyweight choices', () => {
  const homeEquipment = [
    'Bodyweight',
    'Dumbbells',
    'Flat bench',
    'Bench',
    'Incline bench',
    'Resistance Band',
    'Cable machine',
    'Single handles',
    'Assisted dip machine',
  ];
  const homeProfile = makeProfile({
    workoutMode: 'home',
    availableEquipment: homeEquipment,
  });
  const noDumbbellsProfile = makeProfile({
    workoutMode: 'home',
    availableEquipment: ['Bodyweight', 'Resistance Band'],
  });
  const homeChest = rankExercises('Chest', homeProfile);
  const homeIds = new Set(homeChest.map(({ exercise }) => exercise.id));

  assert.ok(homeIds.has('push-up'));
  assert.ok(homeIds.has('dumbbell-fly'));
  assert.ok(!homeIds.has('assisted-chest-dip'));
  assert.ok(!homeIds.has('incline-cable-chest-press'));
  assert.ok(!rankExercises('Chest', noDumbbellsProfile).some(
    ({ exercise }) => exercise.id === 'dumbbell-fly'
  ));
  assert.ok(rankExercises('Chest', noDumbbellsProfile).some(
    ({ exercise }) => exercise.id === 'push-up'
  ));
});

test('Back Nerd Facts remain short and connect only to valid HTTPS research sources', () => {
  for (const mapping of BACK_RESEARCH_CATALOG_MAPPINGS) {
    for (const catalogId of mapping.catalogIds) {
      const exercise = EXERCISE_LIBRARY.find(({ id }) => id === catalogId);
      assert.ok(exercise);
      const research = getBackResearchForExercise(catalogId);
      assert.ok(research);
      assert.ok(research.nerdFact.split(/[.!?]+/).filter(Boolean).length <= 2);
      const sources = getBackResearchSources(research.evidenceRefs);
      assert.ok(sources.length > 0);
      assert.doesNotMatch(
        research.nerdFact,
        /EMG|latissimus|trapezius|rhomboid|erector|teres major|hypertroph|latissimus_dorsi|trapezius_(upper|middle|lower)/i
      );
      for (const source of sources) {
        assert.equal(new URL(source.url).protocol, 'https:');
        assert.equal(new URL(source.url).hostname, 'pubmed.ncbi.nlm.nih.gov');
      }
    }
  }
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
  for (const exercise of EXERCISE_LIBRARY) {
    const content = getExerciseScienceContent(exercise);
    assert.ok(content.facts.length > 0);
    for (const fact of content.facts) {
      assert.ok(fact.sourceIds.length > 0);
      assert.ok(
        fact.sourceIds.every((sourceId) =>
          content.sources.some((source) => source.id === sourceId)
        )
      );
    }
    for (const source of content.sources) {
      assert.equal(new URL(source.url).protocol, 'https:');
      if (source.urlLabel === 'PubMed record') {
        assert.match(source.url, /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//);
      }
      if (source.doi) assert.match(source.doi, /^10\./);
      if (source.doiUrl) assert.match(source.doiUrl, /^https:\/\/doi\.org\//);
    }
  }
  for (const source of EXERCISE_SCIENCE_SOURCES) {
    assert.ok(source.doi);
    assert.ok(source.doiUrl);
    assert.match(source.doi, /^10\./);
    assert.match(source.url, /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//);
    assert.match(source.doiUrl, /^https:\/\/doi\.org\//);
  }
});
