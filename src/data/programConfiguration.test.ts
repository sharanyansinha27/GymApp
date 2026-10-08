import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateWeeklyPlannedVolume,
  createInitialExercisesForProgramSplit,
  getProgramSplitForDate,
  normalizeProgramDays,
  normalizeUserProgram,
} from './programConfiguration';
import { getSplitForDate } from './workoutSplit';
import { UserProgramDay } from '../types';

const weeklyProgramDays = (): UserProgramDay[] =>
  normalizeProgramDays([
    {
      dayOfWeek: 1,
      isRestDay: false,
      name: 'Push',
      bodyParts: ['Chest'],
      exercises: [
        {
          exerciseId: 'barbell-bench-press',
          targetSets: 4,
          minReps: 6,
          maxReps: 8,
          targetRir: 2,
          restSeconds: 180,
          order: 1,
          notes: 'Pause each rep',
        },
        {
          exerciseId: 'incline-dumbbell-press',
          targetSets: 3,
          minReps: 8,
          maxReps: 12,
          targetRir: 1,
          restSeconds: 120,
          order: 2,
        },
      ],
    },
    {
      dayOfWeek: 4,
      isRestDay: false,
      name: 'Upper Chest',
      bodyParts: ['Chest', 'Upper Chest'],
      exercises: [
        {
          exerciseId: 'incline-barbell-press',
          targetSets: 2,
          minReps: 10,
          maxReps: 10,
          targetRir: 2,
          restSeconds: 150,
          order: 1,
        },
      ],
    },
  ]);

test('legacy or malformed program days normalize to safe defaults', () => {
  const days = normalizeProgramDays([
    {
      dayOfWeek: 1,
      isRestDay: false,
      name: 'Legacy day',
      bodyParts: ['Chest'],
      exercises: [
        { exerciseId: 'barbell-bench-press' },
        { exerciseId: 'exercise-no-longer-in-catalog', targetSets: 5 },
        null,
      ],
    },
    { dayOfWeek: 2, isRestDay: true, exercises: 'not-an-array' },
    { dayOfWeek: 3, isRestDay: false, exercises: [] },
  ]);

  assert.equal(days.length, 7);
  assert.equal(days[0].exercises.length, 1);
  assert.deepEqual(days[0].exercises[0], {
    exerciseId: 'barbell-bench-press',
    targetSets: 3,
    minReps: 4,
    maxReps: 10,
    targetRir: 2,
    restSeconds: 180,
    order: 1,
    notes: '',
  });
  assert.deepEqual(days[1].exercises, []);
  assert.equal(days[1].isRestDay, true);
  assert.deepEqual(days[2].exercises, []);
  assert.equal(days[6].dayName, 'Sunday');
  assert.deepEqual(normalizeProgramDays(null).map(({ isRestDay }) => isRestDay), [
    true, true, true, true, true, true, true,
  ]);
});

test('normalization clamps malformed values and keeps exercise order stable', () => {
  const days = normalizeProgramDays([
    {
      dayOfWeek: 1,
      isRestDay: false,
      name: 'Configured',
      bodyParts: ['Chest'],
      exercises: [
        {
          exerciseId: 'flat-dumbbell-press',
          targetSets: 50,
          minReps: 0,
          maxReps: 200,
          targetRir: 8,
          restSeconds: 9999,
          order: 2,
          notes: 'x'.repeat(200),
        },
        {
          exerciseId: 'barbell-bench-press',
          targetSets: -2,
          minReps: 8,
          maxReps: 6,
          targetRir: -1,
          restSeconds: 0,
          order: 1,
        },
      ],
    },
  ]);
  const [first, second] = days[0].exercises;

  assert.equal(first.exerciseId, 'barbell-bench-press');
  assert.equal(first.targetSets, 1);
  assert.equal(first.minReps, 8);
  assert.equal(first.maxReps, 8);
  assert.equal(first.targetRir, 0);
  assert.equal(first.restSeconds, 15);
  assert.equal(first.order, 1);
  assert.equal(second.targetSets, 10);
  assert.equal(second.minReps, 1);
  assert.equal(second.maxReps, 100);
  assert.equal(second.targetRir, 4);
  assert.equal(second.restSeconds, 600);
  assert.equal(second.notes?.length, 160);
});

test('weekly planned volume counts direct primary-target sets only', () => {
  const volume = calculateWeeklyPlannedVolume(weeklyProgramDays());
  const chest = volume.find(({ muscle }) => muscle === 'Chest');
  const upperChest = volume.find(({ muscle }) => muscle === 'Upper chest');
  const triceps = volume.find(({ muscle }) => muscle === 'Triceps');

  assert.deepEqual(chest, { muscle: 'Chest', bodyPart: 'Chest', sets: 4 });
  assert.deepEqual(upperChest, {
    muscle: 'Upper chest',
    bodyPart: 'Chest',
    sets: 5,
  });
  assert.equal(triceps, undefined);
});

test('only a valid active program for the authenticated UID is accepted', () => {
  const activeProgram = {
    uid: 'user-a',
    programId: 'current',
    goal: 'muscle_gain',
    workoutMode: 'gym',
    status: 'active',
    days: weeklyProgramDays(),
  };

  assert.equal(normalizeUserProgram(activeProgram, 'user-b'), null);
  const normalized = normalizeUserProgram(activeProgram, 'user-a');
  assert.equal(normalized?.status, 'active');
  assert.equal(normalized?.split, 'custom');
  assert.equal(normalized?.version, 1);
});

test('active custom prescriptions feed the existing workout split contract; inactive users retain the personal split', () => {
  const program = normalizeUserProgram(
    {
      uid: 'user-a',
      programId: 'current',
      goal: 'muscle_gain',
      workoutMode: 'gym',
      status: 'active',
      days: weeklyProgramDays(),
    },
    'user-a'
  );
  assert.ok(program);

  const configuredSplit = getProgramSplitForDate('2024-01-01', program);
  assert.equal(configuredSplit.splitId, 'custom');
  assert.deepEqual(
    configuredSplit.exercises.map(({ exerciseId, targetSets, minReps, maxReps, targetRir, restSeconds, notes }) => ({
      exerciseId,
      targetSets,
      minReps,
      maxReps,
      targetRir,
      restSeconds,
      notes,
    })),
    [
      {
        exerciseId: 'barbell-bench-press',
        targetSets: 4,
        minReps: 6,
        maxReps: 8,
        targetRir: 2,
        restSeconds: 180,
        notes: 'Pause each rep',
      },
      {
        exerciseId: 'incline-dumbbell-press',
        targetSets: 3,
        minReps: 8,
        maxReps: 12,
        targetRir: 1,
        restSeconds: 120,
        notes: '',
      },
    ]
  );

  const legacySplit = getSplitForDate('2024-01-01');
  assert.deepEqual(getProgramSplitForDate('2024-01-01', null), legacySplit);
  for (let day = 1; day <= 7; day++) {
    const date = `2024-01-${String(day).padStart(2, '0')}`;
    assert.deepEqual(
      getProgramSplitForDate(date, null),
      getSplitForDate(date)
    );
  }

  const initialExercises = createInitialExercisesForProgramSplit(configuredSplit, {});
  assert.equal(initialExercises[0].targetSets, 4);
  assert.equal(initialExercises[0].minReps, 6);
  assert.equal(initialExercises[0].maxReps, 8);
  assert.equal(initialExercises[0].targetRir, 2);
  assert.equal(initialExercises[0].restSeconds, 180);
  assert.equal(initialExercises[0].notes, 'Pause each rep');
});
