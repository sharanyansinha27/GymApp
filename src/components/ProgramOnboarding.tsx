import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Check, ChevronDown, ChevronUp, LogOut, Plus, Brain } from 'lucide-react';
import { db } from '../firebase';
import {
  ExerciseDefinition,
  ExerciseRecommendationProfile,
  FitnessGoal,
  PersonalizationPreferences,
  PhysiqueFocus,
  PhysiquePriority,
  ProgramExerciseSelection,
  UserProfileRecord,
  UserProgramDay,
  UserProgramRecord,
  WorkoutMode,
} from '../types';
import {
  EXERCISE_LIBRARY,
  RankedExercise,
  rankExercises,
} from '../data/exerciseLibrary';
import { ExerciseFactModal } from './ExerciseFactModal';

interface ProgramOnboardingProps {
  profile: UserProfileRecord;
  onSavePreferences: (preferences: PersonalizationPreferences) => Promise<void>;
  onSaveDraft: (
    goal: FitnessGoal,
    workoutMode: WorkoutMode,
    days: UserProgramDay[]
  ) => Promise<void>;
  onSignOut: () => void;
}

type OnboardingStep = 'goal' | 'location' | 'program' | 'schedule' | 'exercises';

const WEEKDAYS: UserProgramDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
].map((dayName, index) => ({
  dayOfWeek: (index + 1) as UserProgramDay['dayOfWeek'],
  dayName,
  isRestDay: true,
  name: '',
  bodyParts: [],
  exercises: [],
}));

const GOALS: { id: FitnessGoal; label: string; description: string }[] = [
  { id: 'muscle_gain', label: 'Muscle Gain / Hypertrophy', description: 'Build muscle and increase size.' },
  { id: 'strength', label: 'Strength', description: 'Focus on getting stronger.' },
  { id: 'fat_loss', label: 'Fat Loss', description: 'Support a fat-loss training goal.' },
  { id: 'general_fitness', label: 'General Fitness', description: 'Build a balanced training habit.' },
];

const PHYSIQUE_FOCI: { id: PhysiqueFocus; label: string }[] = [
  { id: 'aesthetic_physique', label: 'Aesthetic Physique' },
  { id: 'maximum_muscle_development', label: 'Maximum Muscle Development' },
  { id: 'strength', label: 'Strength' },
  { id: 'balanced_athletic', label: 'Balanced / Athletic' },
];

const PHYSIQUE_PRIORITIES: { id: PhysiquePriority; label: string }[] = [
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'upper_chest', label: 'Upper Chest' },
  { id: 'back_v_taper', label: 'Back / V-Taper' },
  { id: 'arms', label: 'Arms' },
  { id: 'legs', label: 'Legs' },
  { id: 'balanced', label: 'Balanced' },
];

const BODY_PARTS = [
  'Chest',
  'Upper Chest',
  'Back',
  'Lats',
  'Upper Back',
  'Shoulders',
  'Front Delts',
  'Lateral Delts',
  'Rear Delts',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abs/Core',
];

const PROGRAM_ID = 'current';

const isFitnessGoal = (value: unknown): value is FitnessGoal =>
  value === 'muscle_gain' ||
  value === 'weight_gain' ||
  value === 'fat_loss' ||
  value === 'hypertrophy' ||
  value === 'strength' ||
  value === 'general_fitness' ||
  value === 'body_recomposition';

const normalizeGoal = (value: FitnessGoal | undefined): FitnessGoal | null => {
  if (!value) return null;
  if (value === 'hypertrophy' || value === 'weight_gain') return 'muscle_gain';
  if (value === 'body_recomposition') return 'fat_loss';
  return value;
};

const isWorkoutMode = (value: unknown): value is WorkoutMode =>
  value === 'gym' || value === 'home';

const isProgramDay = (value: unknown): value is UserProgramDay => {
  if (!value || typeof value !== 'object') return false;
  const day = value as Partial<UserProgramDay>;
  return (
    typeof day.dayOfWeek === 'number' &&
    day.dayOfWeek >= 1 &&
    day.dayOfWeek <= 7 &&
    typeof day.dayName === 'string' &&
    typeof day.isRestDay === 'boolean' &&
    typeof day.name === 'string' &&
    Array.isArray(day.bodyParts) &&
    day.bodyParts.every((part) => typeof part === 'string') &&
    Array.isArray(day.exercises) &&
    day.exercises.every(
      (exercise) =>
        Boolean(exercise) &&
        typeof exercise === 'object' &&
        typeof (exercise as ProgramExerciseSelection).exerciseId === 'string'
    )
  );
};

export const ProgramOnboarding: React.FC<ProgramOnboardingProps> = ({
  profile,
  onSavePreferences,
  onSaveDraft,
  onSignOut,
}) => {
  const [step, setStep] = useState<OnboardingStep>('goal');
  const [goal, setGoal] = useState<FitnessGoal | null>(
    isFitnessGoal(profile.goal) ? normalizeGoal(profile.goal) : null
  );
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode | null>(
    isWorkoutMode(profile.workoutMode) ? profile.workoutMode : null
  );
  const [physiqueFocus, setPhysiqueFocus] = useState<PhysiqueFocus>(
    profile.physiqueFocus || 'balanced_athletic'
  );
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(
    profile.availableEquipment?.length ? profile.availableEquipment : ['Bodyweight']
  );
  const [physiquePriorities, setPhysiquePriorities] = useState<PhysiquePriority[]>(
    profile.physiquePriorities || []
  );
  const [days, setDays] = useState<UserProgramDay[]>(WEEKDAYS);
  const [selectedDayOfWeek, setSelectedDayOfWeek] =
    useState<UserProgramDay['dayOfWeek']>(1);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [nerdFactExerciseId, setNerdFactExerciseId] = useState<string | null>(null);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isActive = true;
    const programRef = doc(db, 'users', profile.uid, 'programs', PROGRAM_ID);

    getDoc(programRef)
      .then((snapshot) => {
        if (!isActive || !snapshot.exists()) return;
        const program = snapshot.data() as Partial<UserProgramRecord>;
        if (
          program.uid !== profile.uid ||
          !Array.isArray(program.days) ||
          program.days.length !== 7 ||
          !program.days.every(isProgramDay)
        ) {
          throw new Error('The saved program draft has an invalid format.');
        }

        setDays(program.days);
        if (!profile.goal && isFitnessGoal(program.goal)) {
          setGoal(normalizeGoal(program.goal));
        }
        if (!profile.workoutMode && isWorkoutMode(program.workoutMode)) {
          setWorkoutMode(program.workoutMode);
        }
        setSaved(true);
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? `Saved program draft could not be loaded: ${loadError.message}`
              : 'Saved program draft could not be loaded.'
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingDraft(false);
      });

    return () => {
      isActive = false;
    };
  }, [profile.uid]);

  const activeDays = days.filter((day) => !day.isRestDay);
  const currentStep = ['goal', 'location', 'program', 'schedule', 'exercises'].indexOf(step) + 1;
  const selectedDay = days.find((day) => day.dayOfWeek === selectedDayOfWeek) || days[0];
  const recommendationProfile: ExerciseRecommendationProfile | null =
    workoutMode && goal
      ? {
          goal,
          physiqueFocus,
          workoutMode,
          availableEquipment,
          physiquePriorities,
          programDays: days,
          selectedDayOfWeek,
        }
      : null;
  const recommendations: RankedExercise[] =
    recommendationProfile && selectedBodyPart
      ? rankExercises(selectedBodyPart, recommendationProfile)
      : [];
  const personalizedRecommendations = recommendations.filter(({ isForYou }) => isForYou);
  const moreRecommendations = recommendations.filter(({ isForYou }) => !isForYou);
  const equipmentOptions = workoutMode
    ? [...new Set(
        EXERCISE_LIBRARY
          .filter((exercise) => exercise.trainingModes.includes(workoutMode))
          .flatMap((exercise) => exercise.equipment)
      )].sort((left, right) => left.localeCompare(right))
    : [];
  const selectedExerciseIds = new Set(
    selectedDay?.exercises.map((exercise) => exercise.exerciseId) || []
  );
  const selectedFact = EXERCISE_LIBRARY.find(
    (exercise) => exercise.id === nerdFactExerciseId
  );
  const selectedFactRecommendation = recommendations.find(
    ({ exercise }) => exercise.id === nerdFactExerciseId
  );

  useEffect(() => {
    if (!selectedDay) return;
    const firstBodyPart = selectedDay.bodyParts[0] || '';
    if (!selectedDay.bodyParts.includes(selectedBodyPart)) {
      setSelectedBodyPart(firstBodyPart);
    }
  }, [selectedDayOfWeek, days, selectedBodyPart, selectedDay]);

  const updateDay = (dayOfWeek: UserProgramDay['dayOfWeek'], updates: Partial<UserProgramDay>) => {
    setDays((current) =>
      current.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) return day;
        const updated = { ...day, ...updates };
        if (updates.isRestDay) {
          updated.name = '';
          updated.bodyParts = [];
          updated.exercises = [];
        } else if (updates.isRestDay === false && !updated.name) {
          updated.name = `${updated.dayName} Workout`;
        }
        return updated;
      })
    );
    setSaved(false);
  };

  const selectWorkoutMode = (mode: WorkoutMode) => {
    const compatibleEquipment = new Set(
      EXERCISE_LIBRARY
        .filter((exercise) => exercise.trainingModes.includes(mode))
        .flatMap((exercise) => exercise.equipment)
    );
    setWorkoutMode(mode);
    setAvailableEquipment((current) => [
      'Bodyweight',
      ...current.filter((equipment) => equipment !== 'Bodyweight' && compatibleEquipment.has(equipment)),
    ]);
    setSaved(false);
  };

  const togglePhysiquePriority = (priority: PhysiquePriority) => {
    setPhysiquePriorities((current) =>
      priority === 'balanced'
        ? current.includes('balanced') ? [] : ['balanced']
        : current.includes(priority)
          ? current.filter((item) => item !== priority)
          : [...current.filter((item) => item !== 'balanced'), priority]
    );
    setSaved(false);
  };

  const toggleEquipment = (equipment: string) => {
    if (equipment === 'Bodyweight') return;
    setAvailableEquipment((current) =>
      current.includes(equipment)
        ? current.filter((item) => item !== equipment)
        : [...current, equipment]
    );
    setSaved(false);
  };

  const toggleBodyPart = (day: UserProgramDay, bodyPart: string) => {
    const bodyParts = day.bodyParts.includes(bodyPart)
      ? day.bodyParts.filter((part) => part !== bodyPart)
      : [...day.bodyParts, bodyPart];
    updateDay(day.dayOfWeek, { bodyParts });
  };

  const saveSchedule = async (continueToExercises = false) => {
    if (!goal || !workoutMode) {
      setError('Choose a training goal and location before saving your schedule.');
      return;
    }
    if (activeDays.length < 3 || activeDays.length > 7) {
      setError('Choose between 3 and 7 workout days for your weekly schedule.');
      return;
    }
    if (
      activeDays.some(
        (day) => !day.name.trim() || day.bodyParts.length === 0
      )
    ) {
      setError('Give every workout day a name and select at least one body part.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSaveDraft(goal, workoutMode, days);
      setSaved(true);
      if (continueToExercises) {
        setSelectedDayOfWeek(activeDays[0].dayOfWeek);
        setSelectedBodyPart(activeDays[0].bodyParts[0]);
        setStep('exercises');
      }
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? `Your schedule could not be saved: ${saveError.message}`
          : 'Your schedule could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveExerciseSelection = async (
    exercise: ExerciseDefinition,
    remove: boolean
  ) => {
    if (!selectedDay || !goal || !workoutMode) return;

    const existing = selectedDay.exercises.find(
      (item) => item.exerciseId === exercise.id
    );
    if (!remove && existing) return;
    if (remove && !existing) return;

    setPendingExerciseId(exercise.id);
    setError(null);
    const exercises = remove
      ? selectedDay.exercises.filter((item) => item.exerciseId !== exercise.id)
      : [
          ...selectedDay.exercises,
          {
            exerciseId: exercise.id,
            targetSets: exercise.recommendedSets,
            minReps: exercise.recommendedRepRange.min,
            maxReps: exercise.recommendedRepRange.max,
            targetRir: 2,
            restSeconds: exercise.recommendedRestSeconds,
          },
        ];
    const nextDays = days.map((day) =>
      day.dayOfWeek === selectedDay.dayOfWeek ? { ...day, exercises } : day
    );

    try {
      await onSaveDraft(goal, workoutMode, nextDays);
      setDays(nextDays);
      setSaved(true);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? `Exercise selection could not be saved: ${saveError.message}`
          : 'Exercise selection could not be saved.'
      );
    } finally {
      setPendingExerciseId(null);
    }
  };

  const savePreferencesAndContinue = async (
    nextStep: OnboardingStep,
    requireWorkoutMode = false
  ) => {
    if (!goal || (requireWorkoutMode && !workoutMode)) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSavePreferences({
        goal,
        ...(workoutMode ? { workoutMode } : {}),
        physiqueFocus,
        availableEquipment,
        physiquePriorities,
      });
      setStep(nextStep);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? `Your setup could not be saved: ${saveError.message}`
          : 'Your setup could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'location') setStep('goal');
    else if (step === 'program') setStep('location');
    else if (step === 'schedule') setStep('program');
  };

  const renderExerciseCard = (
    { exercise, label, isForYou }: RankedExercise,
    index: number
  ) => {
    const isAdded = selectedExerciseIds.has(exercise.id);
    const isPending = pendingExerciseId === exercise.id;
    return (
      <article
        key={exercise.id}
        className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            aria-expanded={expandedExerciseId === exercise.id}
            onClick={() =>
              setExpandedExerciseId((current) =>
                current === exercise.id ? null : exercise.id
              )
            }
            className="min-h-[44px] flex-1 text-left"
          >
            <span className="block font-semibold text-white">
              <span className="mr-2 text-emerald-400">#{index + 1}</span>
              {exercise.name}
            </span>
            {isForYou && (
              <span className="mt-1 inline-flex rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-200">
                FOR YOU ⭐
              </span>
            )}
            <span className="mt-1 block text-xs text-emerald-300">{label}</span>
            <span className="mt-1 block text-xs text-slate-400">
              {exercise.primaryMuscles.join(', ')} · {exercise.equipment.join(', ')}
            </span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={Boolean(pendingExerciseId)}
              onClick={() => void saveExerciseSelection(exercise, isAdded)}
              className={`min-h-[44px] rounded-lg border px-3 text-xs font-bold ${
                isAdded
                  ? 'border-emerald-500/50 text-emerald-200'
                  : 'border-emerald-400 bg-emerald-500 text-slate-950'
              } disabled:opacity-50`}
            >
              {isPending ? 'Saving…' : isAdded ? '✓ Added' : <><Plus className="mr-1 inline h-3.5 w-3.5" />Add</>}
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setNerdFactExerciseId(exercise.id)}
              className="min-h-[44px] rounded-lg border border-slate-600 px-3 text-xs font-semibold text-slate-200"
            >
              <Brain className="mr-1 inline h-3.5 w-3.5" />
              Fact / Nerd Fact
            </button>
          </div>
        </div>

        {expandedExerciseId === exercise.id && (
          <div className="mt-4 space-y-3 border-t border-slate-700 pt-4 text-sm">
            <p className="text-slate-300">{exercise.shortDescription}</p>
            <p><span className="font-semibold text-white">Primary muscles:</span> {exercise.primaryMuscles.join(', ')}</p>
            <p><span className="font-semibold text-white">Secondary muscles:</span> {exercise.secondaryMuscles.join(', ') || 'None specified'}</p>
            <p><span className="font-semibold text-white">Movement / difficulty:</span> {exercise.movementPattern} · {exercise.difficulty}</p>
            <p><span className="font-semibold text-white">Equipment:</span> {exercise.equipment.join(', ')}</p>
            <p><span className="font-semibold text-white">Recommended:</span> {exercise.recommendedSets} sets · {exercise.recommendedRepRange.min}–{exercise.recommendedRepRange.max} reps · {exercise.recommendedRestSeconds}s rest</p>
            <p><span className="font-semibold text-white">Setup:</span> {exercise.setup}</p>
            <p><span className="font-semibold text-white">Execution:</span> {exercise.execution}</p>
            <p><span className="font-semibold text-white">Form cues:</span> {exercise.formCues.join(' ')}</p>
            <p><span className="font-semibold text-white">Common mistakes:</span> {exercise.commonMistakes.join(' ')}</p>
            <p><span className="font-semibold text-white">Progression:</span> {exercise.progression}</p>
            <p><span className="font-semibold text-white">Regression:</span> {exercise.regression}</p>
          </div>
        )}
      </article>
    );
  };

  return (
    <main className="min-h-screen bg-[#090D16] text-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <a href="#top" className="text-lg font-extrabold tracking-tight text-white">
            IRON100
          </a>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[44px] rounded-lg px-3 text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="mr-2 inline h-4 w-4" />
            Sign out
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-xs font-mono text-emerald-400">SET UP YOUR PROGRAM</p>
            <p className="text-xs text-slate-400">Step {currentStep} of 4</p>
          </div>

          {step === 'goal' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-white">What is your primary goal?</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Choose a focus for your training recommendations.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={goal === option.id}
                    onClick={() => {
                      setGoal(option.id);
                      setSaved(false);
                    }}
                    className={`min-h-[80px] rounded-xl border p-4 text-left transition-colors ${
                      goal === option.id
                        ? 'border-emerald-400 bg-emerald-400/10'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                    }`}
                  >
                    <span className="block font-semibold text-white">{option.label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                  </button>
                ))}
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-white">Physique / training focus</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PHYSIQUE_FOCI.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={physiqueFocus === id}
                      onClick={() => {
                        setPhysiqueFocus(id);
                        setSaved(false);
                      }}
                      className={`min-h-[44px] rounded-lg border px-3 text-left text-sm ${
                        physiqueFocus === id
                          ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                          : 'border-slate-700 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-white">Optional physique priorities</legend>
                <div className="flex flex-wrap gap-2">
                  {PHYSIQUE_PRIORITIES.map(({ id, label }) => {
                    const selected = physiquePriorities.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => togglePhysiquePriority(id)}
                        className={`min-h-[40px] rounded-full border px-3 text-xs ${
                          selected
                            ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                            : 'border-slate-700 text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!goal || isSaving}
                  onClick={() => void savePreferencesAndContinue('location')}
                  className="min-h-[44px] rounded-lg bg-emerald-500 px-5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Next'}
                </button>
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-white">Where do you train?</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Equipment-aware recommendations will use this choice.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['gym', 'Gym', 'Access to gym equipment.'],
                  ['home', 'Home', 'Train with the equipment available at home.'],
                ] as const).map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={workoutMode === value}
                    onClick={() => {
                      selectWorkoutMode(value);
                    }}
                    className={`min-h-[100px] rounded-xl border p-4 text-left ${
                      workoutMode === value
                        ? 'border-emerald-400 bg-emerald-400/10'
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                    }`}
                  >
                    <span className="block font-semibold text-white">{label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{description}</span>
                  </button>
                ))}
              </div>
              {workoutMode && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-white">
                    Equipment you actually have
                  </legend>
                  <p className="text-xs leading-5 text-slate-400">
                    Recommendations only include exercises whose required equipment is selected. Bodyweight is always available.
                  </p>
                  <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-700 p-3 sm:grid-cols-3">
                    {equipmentOptions.map((equipment) => {
                      const selected = availableEquipment.includes(equipment);
                      return (
                        <label
                          key={equipment}
                          className="flex min-h-[40px] items-center gap-2 rounded-lg px-2 text-xs text-slate-200 hover:bg-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={equipment === 'Bodyweight'}
                            onChange={() => toggleEquipment(equipment)}
                            className="accent-emerald-400"
                          />
                          {equipment}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              <div className="flex justify-between">
                <button type="button" onClick={goBack} className="min-h-[44px] px-4 text-sm text-slate-300">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!workoutMode || isSaving}
                  onClick={() => void savePreferencesAndContinue('program', true)}
                  className="min-h-[44px] rounded-lg bg-emerald-500 px-5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Next'}
                </button>
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === 'program' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-white">How do you want to build your program?</h1>
                <p className="mt-2 text-sm text-slate-400">
                  You can control your training days and choose the body parts for each workout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('schedule')}
                className="min-h-[100px] w-full rounded-xl border border-emerald-400 bg-emerald-400/10 p-5 text-left"
              >
                <span className="block font-semibold text-white">Build My Own Split</span>
                <span className="mt-1 block text-sm text-slate-300">
                  Create your weekly workout and rest-day schedule.
                </span>
              </button>
              <div className="min-h-[76px] rounded-xl border border-slate-700 bg-slate-900/40 p-5">
                <span className="block font-semibold text-slate-300">Recommended Split</span>
                <span className="mt-1 block text-sm text-slate-500">Coming Soon</span>
              </div>
              <div className="flex justify-start">
                <button type="button" onClick={goBack} className="min-h-[44px] px-4 text-sm text-slate-300">
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 'schedule' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-white">Build your weekly split</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Choose 3–7 workout days. Each day can be a rest day or a workout you name and configure.
                </p>
              </div>
              <p className="text-sm font-medium text-emerald-300">
                {activeDays.length} workout {activeDays.length === 1 ? 'day' : 'days'} selected
              </p>

              {isLoadingDraft ? (
                <p className="py-8 text-center text-sm text-slate-400">Loading your saved schedule…</p>
              ) : (
                <div className="space-y-4">
                  {days.map((day) => (
                    <article key={day.dayOfWeek} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-semibold text-white">{day.dayName}</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-pressed={day.isRestDay}
                            onClick={() => updateDay(day.dayOfWeek, { isRestDay: true })}
                            className={`min-h-[40px] rounded-lg border px-3 text-xs font-semibold ${
                              day.isRestDay ? 'border-emerald-400 text-emerald-300' : 'border-slate-600 text-slate-300'
                            }`}
                          >
                            Rest Day
                          </button>
                          <button
                            type="button"
                            aria-pressed={!day.isRestDay}
                            onClick={() => updateDay(day.dayOfWeek, { isRestDay: false })}
                            className={`min-h-[40px] rounded-lg border px-3 text-xs font-semibold ${
                              !day.isRestDay ? 'border-emerald-400 text-emerald-300' : 'border-slate-600 text-slate-300'
                            }`}
                          >
                            Workout Day
                          </button>
                        </div>
                      </div>

                      {!day.isRestDay && (
                        <div className="mt-4 space-y-4">
                          <label className="block space-y-2">
                            <span className="text-xs font-medium text-slate-300">Workout name</span>
                            <input
                              value={day.name}
                              maxLength={64}
                              onChange={(event) =>
                                updateDay(day.dayOfWeek, { name: event.target.value })
                              }
                              placeholder="e.g. Push, Upper, Legs"
                              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 text-sm text-white outline-none focus:border-emerald-400"
                            />
                          </label>
                          <fieldset>
                            <legend className="mb-2 text-xs font-medium text-slate-300">
                              Body parts trained
                            </legend>
                            <div className="flex flex-wrap gap-2">
                              {BODY_PARTS.map((part) => {
                                const selected = day.bodyParts.includes(part);
                                return (
                                  <button
                                    key={part}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => toggleBodyPart(day, part)}
                                    className={`min-h-[40px] rounded-full border px-3 text-xs ${
                                      selected
                                        ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                                    }`}
                                  >
                                    {part}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {saved && (
                <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                  Weekly schedule saved. Exercise selection and program activation are the next setup step.
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-between gap-3">
                <button type="button" onClick={goBack} className="min-h-[44px] px-4 text-sm text-slate-300">
                  Back
                </button>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={isLoadingDraft || isSaving}
                    onClick={() => void saveSchedule()}
                    className="min-h-[44px] rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save weekly schedule'}
                  </button>
                  <button
                    type="button"
                    disabled={isLoadingDraft || isSaving}
                    onClick={() => void saveSchedule(true)}
                    className="min-h-[44px] rounded-lg bg-emerald-500 px-5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Choose exercises'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'exercises' && selectedDay && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-white">Choose exercises</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Recommendations are personalized to your goal, physique focus, selected equipment, priorities, and weekly split. “For You” is an IRON 100 personalized recommendation, not a claim of scientific superiority.
                </p>
              </div>

              <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="min-w-[180px] flex-1 space-y-1">
                    <span className="text-xs text-slate-400">Workout day</span>
                    <select
                      value={selectedDayOfWeek}
                      onChange={(event) =>
                        setSelectedDayOfWeek(Number(event.target.value) as UserProgramDay['dayOfWeek'])
                      }
                      className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 text-sm text-white"
                    >
                      {activeDays.map((day) => (
                        <option key={day.dayOfWeek} value={day.dayOfWeek}>
                          {day.dayName} — {day.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="min-w-[180px] flex-1">
                    <p className="text-xs text-slate-400">Your recommendation profile</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {goal?.replaceAll('_', ' ')} · {physiqueFocus.replaceAll('_', ' ')} · {workoutMode === 'gym' ? 'Gym' : 'Home'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {physiquePriorities.length ? physiquePriorities.map((priority) => PHYSIQUE_PRIORITIES.find((item) => item.id === priority)?.label).join(', ') : 'No additional physique priority'} · {availableEquipment.length} equipment item{availableEquipment.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDay.bodyParts.map((part) => (
                    <button
                      key={part}
                      type="button"
                      aria-pressed={selectedBodyPart === part}
                      onClick={() => setSelectedBodyPart(part)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold ${
                        selectedBodyPart === part
                          ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                <h2 className="font-semibold text-white">
                  {selectedDay.dayName.toUpperCase()} — {selectedDay.name}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{selectedDay.bodyParts.join(' + ')}</p>
                {selectedDay.exercises.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No exercises selected yet.</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {selectedDay.exercises.map((selection) => {
                      const exercise = EXERCISE_LIBRARY.find(
                        (item) => item.id === selection.exerciseId
                      );
                      if (!exercise) return null;
                      return (
                        <li
                          key={selection.exerciseId}
                          className="flex min-h-[40px] items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/30 px-3 text-xs text-emerald-100"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {exercise.name}
                          <button
                            type="button"
                            aria-label={`Remove ${exercise.name}`}
                            disabled={Boolean(pendingExerciseId)}
                            onClick={() => void saveExerciseSelection(exercise, true)}
                            className="ml-1 font-bold text-slate-300 hover:text-white disabled:opacity-50"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {selectedBodyPart ? (
                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-white">{selectedBodyPart.toUpperCase()}</h2>
                  {recommendations.length === 0 ? (
                    <p className="rounded-xl border border-slate-700 p-4 text-sm text-slate-400">
                      No exercises match your selected training mode and available equipment. Update the equipment selection in onboarding to see compatible options.
                    </p>
                  ) : (
                    <>
                      {personalizedRecommendations.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-base font-bold text-amber-200">Recommended For You ⭐</h3>
                          {personalizedRecommendations.map((item, index) =>
                            renderExerciseCard(item, index + 1)
                          )}
                        </div>
                      )}
                      {moreRecommendations.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="pt-2 text-base font-bold text-white">
                            More {selectedBodyPart} Exercises
                          </h3>
                          {moreRecommendations.map((item, index) =>
                            renderExerciseCard(item, personalizedRecommendations.length + index + 1)
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              ) : (
                <p className="rounded-xl border border-slate-700 p-4 text-sm text-slate-400">
                  Choose a body part above to see exercise options.
                </p>
              )}

              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">
                  {error}
                </p>
              )}
              {saved && (
                <p role="status" className="text-xs text-emerald-200">
                  Your selected exercise references are saved to your private program.
                </p>
              )}
              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setStep('schedule')} className="min-h-[44px] px-4 text-sm text-slate-300">
                  <ChevronUp className="mr-1 inline h-4 w-4" />
                  Back to schedule
                </button>
                <button
                  type="button"
                  onClick={() => setStep('schedule')}
                  className="min-h-[44px] rounded-lg bg-emerald-500 px-5 font-semibold text-slate-950"
                >
                  Continue
                  <ChevronDown className="ml-1 inline h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      {selectedFact && selectedFactRecommendation && selectedBodyPart && workoutMode && (
        <ExerciseFactModal
          exercise={selectedFact}
          recommendationLabel={selectedFactRecommendation.label}
          selectedBodyPart={selectedBodyPart}
          workoutMode={workoutMode}
          availableEquipment={availableEquipment}
          onClose={() => setNerdFactExerciseId(null)}
        />
      )}
    </main>
  );
};
