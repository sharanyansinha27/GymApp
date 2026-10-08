import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  WorkoutSessionRecord,
  LoggedExercise,
  LoggedSet,
  UserProfileRecord,
} from '../types';
import {
  getSplitForDate,
  getDateForChallengeDay,
} from '../data/workoutSplit';
import {
  getPreviousExerciseRecord,
  generateProgressionRecommendation,
  evaluateSetPerformance,
  computeAllExercisePRs,
  calculateExerciseVolume,
} from '../utils/progression';
import {
  Check,
  Plus,
  Minus,
  Timer,
  Flame,
  SkipForward,
  RotateCcw,
  Trophy,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Trash2,
} from 'lucide-react';

interface WorkoutLoggerViewProps {
  profile: UserProfileRecord;
  activeDayNumber: number;
  onSelectDayNumber: (day: number) => void;
  session: WorkoutSessionRecord | null;
  allSessions: WorkoutSessionRecord[];
  onSaveSession: (updatedSession: WorkoutSessionRecord) => Promise<void>;
  isSaving: boolean;
}

const MUSCLE_GROUPS = [
  'Lats',
  'Upper Back',
  'Mid Back',
  'Rear Delts',
  'Biceps',
  'Quadriceps',
  'Hamstrings',
  'Hamstrings / Glutes',
  'Calves',
  'Abs',
  'Chest',
  'Shoulders',
  'Side Delts',
  'Triceps',
  'Forearms',
  'Full Body',
];

function slugifyExerciseId(name: string, fallbackIndex: number): string {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean.length > 0 ? clean.slice(0, 64) : `custom_exercise_${fallbackIndex}`;
}

export const WorkoutLoggerView: React.FC<WorkoutLoggerViewProps> = ({
  profile,
  activeDayNumber,
  onSelectDayNumber,
  session: sourceSession,
  allSessions,
  onSaveSession,
  isSaving,
}) => {
  const [draftSession, setDraftSession] =
    useState<WorkoutSessionRecord | null>(null);
  const draftSessionRef = useRef<WorkoutSessionRecord | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const onSaveSessionRef = useRef(onSaveSession);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const activeSaveCountRef = useRef(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('saved');
  const [numericInputDrafts, setNumericInputDrafts] = useState<
    Record<string, string>
  >({});
  const [restTimerRemaining, setRestTimerRemaining] = useState<number | null>(null);
  const [restTimerTotal, setRestTimerTotal] = useState<number>(120);
  const [restTimerExerciseName, setRestTimerExerciseName] = useState<string>('');
  const [elapsedWorkoutSeconds, setElapsedWorkoutSeconds] = useState<number>(
    sourceSession?.durationSeconds || 0
  );
  const session = draftSession;

  const localDraftKey = (uid: string, sessionId: string) =>
    `iron100-workout-draft:${uid}:${sessionId}`;

  const saveDraft = (updated: WorkoutSessionRecord): Promise<void> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSaveError(null);
    activeSaveCountRef.current += 1;
    setIsSavingDraft(true);
    const saveTask = saveQueueRef.current.then(
      () => onSaveSessionRef.current(updated),
      () => onSaveSessionRef.current(updated)
    ).then(
      () => {
        const currentDraft = draftSessionRef.current;
        if (
          currentDraft === updated ||
          currentDraft?.sessionId !== updated.sessionId
        ) {
          try {
            localStorage.removeItem(localDraftKey(updated.uid, updated.sessionId));
          } catch (error) {
            setSaveError(
              error instanceof Error
                ? `Workout saved, but its local draft could not be cleared: ${error.message}`
                : 'Workout saved, but its local draft could not be cleared.'
            );
          }
        }
        if (currentDraft === updated) {
          dirtyRef.current = false;
          setSaveState('saved');
        }
      },
      (error: unknown) => {
        if (draftSessionRef.current === updated) {
          setSaveState('error');
          let message = error instanceof Error ? error.message : String(error);
          try {
            const parsed = JSON.parse(message) as { error?: string };
            if (parsed.error) message = parsed.error;
          } catch {
            // Keep the original Firebase error when it is not structured JSON.
          }
          setSaveError(`Workout was not saved: ${message}`);
        }
        throw error;
      }
    ).finally(() => {
      activeSaveCountRef.current -= 1;
      setIsSavingDraft(activeSaveCountRef.current > 0);
    });

    saveQueueRef.current = saveTask.then(
      () => undefined,
      () => undefined
    );
    return saveTask;
  };

  const updateDraft = (
    updated: WorkoutSessionRecord,
    saveImmediately = false
  ): Promise<void> => {
    draftSessionRef.current = updated;
    setDraftSession(updated);
    dirtyRef.current = true;
    setSaveError(null);
    setSaveState('pending');
    try {
      localStorage.setItem(
        localDraftKey(updated.uid, updated.sessionId),
        JSON.stringify(updated)
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? `Local recovery copy could not be stored: ${error.message}`
          : 'Local recovery copy could not be stored.'
      );
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveImmediately) return saveDraft(updated);

    saveTimerRef.current = setTimeout(() => {
      void saveDraft(updated).catch(() => undefined);
    }, 600);
    return Promise.resolve();
  };

  useEffect(() => {
    onSaveSessionRef.current = onSaveSession;
  }, [onSaveSession]);

  useEffect(() => {
    if (!sourceSession) {
      if (draftSessionRef.current && dirtyRef.current) {
        void saveDraft(draftSessionRef.current).catch(() => undefined);
      }
      draftSessionRef.current = null;
      setDraftSession(null);
      dirtyRef.current = false;
      return;
    }

    const previousDraft = draftSessionRef.current;
    if (
      previousDraft?.sessionId !== sourceSession.sessionId ||
      previousDraft?.uid !== sourceSession.uid
    ) {
      const sameUser = previousDraft?.uid === sourceSession.uid;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (previousDraft && dirtyRef.current && sameUser) {
        void saveDraft(previousDraft).catch(() => undefined);
      }

      let restoredDraft: WorkoutSessionRecord | null = null;
      try {
        const stored = localStorage.getItem(
          localDraftKey(sourceSession.uid, sourceSession.sessionId)
        );
        if (stored) {
          const parsed = JSON.parse(stored) as WorkoutSessionRecord;
          if (
            parsed.uid === sourceSession.uid &&
            parsed.sessionId === sourceSession.sessionId &&
            Array.isArray(parsed.exercises) &&
            parsed.exercises.every((exercise) => Array.isArray(exercise.sets))
          ) {
            restoredDraft = parsed;
          }
        }
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? `Saved local workout draft could not be restored: ${error.message}`
            : 'Saved local workout draft could not be restored.'
        );
      }

      const nextSession = restoredDraft || sourceSession;
      draftSessionRef.current = nextSession;
      setDraftSession(nextSession);
      dirtyRef.current = Boolean(restoredDraft);
      if (restoredDraft) {
        setSaveState('pending');
        saveTimerRef.current = setTimeout(() => {
          void saveDraft(restoredDraft!).catch(() => undefined);
        }, 100);
      } else {
        setSaveState('saved');
      }
      setElapsedWorkoutSeconds(nextSession.durationSeconds || 0);
      setNumericInputDrafts({});
      return;
    }

    if (!dirtyRef.current) {
      draftSessionRef.current = sourceSession;
      setDraftSession(sourceSession);
      setSaveState('saved');
    }
  }, [sourceSession]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (draftSessionRef.current && dirtyRef.current) {
        void saveDraft(draftSessionRef.current).catch(() => undefined);
      }
    },
    []
  );

  useEffect(() => {
    const retryPendingDraft = () => {
      const latestDraft = draftSessionRef.current;
      if (latestDraft && dirtyRef.current) {
        void saveDraft(latestDraft).catch(() => undefined);
      }
    };
    window.addEventListener('online', retryPendingDraft);
    return () => window.removeEventListener('online', retryPendingDraft);
  }, []);

  // Sync elapsed duration when session changes
  useEffect(() => {
    setElapsedWorkoutSeconds(session?.durationSeconds || 0);
  }, [session?.sessionId]);

  // Increment workout elapsed timer when session is in progress
  useEffect(() => {
    if (!session || session.status === 'completed') return;
    const interval = setInterval(() => {
      setElapsedWorkoutSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.sessionId, session?.status]);

  // Rest countdown timer
  useEffect(() => {
    if (restTimerRemaining === null || restTimerRemaining <= 0) return;
    const timer = setInterval(() => {
      setRestTimerRemaining((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restTimerRemaining]);

  const historicalPRs = useMemo(() => {
    return computeAllExercisePRs(allSessions, session?.sessionId);
  }, [allSessions, session?.sessionId]);

  // Collect all known exercise names (prescribed + any previously logged custom exercises) for quick autocomplete suggestions
  const knownExerciseTemplates = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        muscleGroup: string;
        targetSets: number;
        minReps: number;
        maxReps: number;
        targetRir: number;
        restSeconds: number;
      }
    >();
    for (const s of allSessions) {
      for (const ex of s.exercises) {
        if (ex.name && ex.name.trim()) {
          map.set(ex.name.trim().toLowerCase(), {
            name: ex.name.trim(),
            muscleGroup: ex.muscleGroup,
            targetSets: ex.targetSets,
            minReps: ex.minReps,
            maxReps: ex.maxReps,
            targetRir: ex.targetRir,
            restSeconds: ex.restSeconds,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [allSessions]);

  const dateStr = getDateForChallengeDay(profile.startDate, activeDayNumber);
  const split = getSplitForDate(dateStr);

  if (!session) {
    return (
      <div className="rounded-2xl bg-[#111827] border border-slate-800 p-8 text-center my-6">
        <h2 className="text-xl font-bold text-white mb-2">{split.title}</h2>
        <p className="text-sm text-slate-400 mb-4">{split.subtitle}</p>
        <p className="text-xs text-slate-400">Initializing workout session...</p>
      </div>
    );
  }

  const persistChanges = async (
    exercises: LoggedExercise[],
    notes: string,
    status: 'in_progress' | 'completed',
    saveImmediately = false
  ) => {
    const currentSession = draftSessionRef.current ?? session;
    if (!currentSession) return;
    const updated: WorkoutSessionRecord = {
      ...currentSession,
      exercises,
      notes,
      status,
      durationSeconds: elapsedWorkoutSeconds,
      totalVolume: Math.round(
        exercises.reduce(
          (total, exercise) =>
            total +
            (exercise.skipped
              ? 0
              : exercise.sets.reduce(
                  (volume, set) =>
                    volume +
                    (set.completed && set.weight > 0 && set.reps > 0
                      ? set.weight * set.reps
                      : 0),
                  0
                )),
          0
        ) * 10
      ) / 10,
    };
    await updateDraft(updated, saveImmediately);
  };

  const updateExercise = async (
    exIdx: number,
    updater: (ex: LoggedExercise) => LoggedExercise
  ) => {
    const currentSession = draftSessionRef.current ?? session;
    if (!currentSession) return;
    const updatedExercises = currentSession.exercises.map((ex, i) =>
      i === exIdx ? updater(ex) : ex
    );
    await persistChanges(updatedExercises, currentSession.notes, currentSession.status);
  };

  // Immediately appends a new exercise card with all columns & set rows pre-populated
  const handleAddExerciseToDay = async () => {
    if (session.exercises.length >= 20) return;

    const defaultMuscle =
      session.splitId.startsWith('pull')
        ? 'Lats'
        : session.splitId.startsWith('legs')
        ? 'Quadriceps'
        : session.splitId.startsWith('push')
        ? 'Chest'
        : 'Full Body';

    const newIndex = session.exercises.length + 1;
    const defaultTargetSets = 3;
    const defaultMinReps = 8;
    const defaultMaxReps = 12;
    const defaultRir = 1;
    const defaultRest = 120;

    const initialSets: LoggedSet[] = Array.from(
      { length: defaultTargetSets },
      (_, idx) => ({
        setNumber: idx + 1,
        weight: 20,
        reps: defaultMinReps,
        rir: defaultRir,
        reachedFailure: false,
        restTimeSeconds: defaultRest,
        completed: false,
      })
    );

    const newExercise: LoggedExercise = {
      exerciseId: `custom_exercise_${Date.now()}`,
      name: '',
      muscleGroup: defaultMuscle,
      targetSets: defaultTargetSets,
      minReps: defaultMinReps,
      maxReps: defaultMaxReps,
      targetRir: defaultRir,
      restSeconds: defaultRest,
      skipped: false,
      isCustom: true,
      notes: '',
      sets: initialSets,
    };

    const currentSession = draftSessionRef.current ?? session;
    if (!currentSession) return;
    const nextExercises = [...currentSession.exercises, newExercise];
    await persistChanges(nextExercises, currentSession.notes, currentSession.status);
  };

  const handleRemoveCustomExercise = async (exIdx: number) => {
    const currentSession = draftSessionRef.current ?? session;
    if (!currentSession) return;
    const nextExercises = currentSession.exercises.filter((_, idx) => idx !== exIdx);
    await persistChanges(nextExercises, currentSession.notes, currentSession.status);
  };

  // Updates custom exercise name & syncs exerciseId so previous performance / PRs automatically match if logged before
  const handleCustomExerciseNameChange = async (exIdx: number, newName: string) => {
    const trimmed = newName.slice(0, 100);
    const derivedId = slugifyExerciseId(trimmed, exIdx + 1);

    // Check if there is a known previous record for this exerciseId so we can pre-fill working weights if sets aren't completed yet
    const prevRec = getPreviousExerciseRecord(
      derivedId,
      allSessions,
      session.sessionId,
      session.date
    );

    const matchedTemplate = knownExerciseTemplates.find(
      (t) => t.name.toLowerCase() === trimmed.trim().toLowerCase()
    );

    await updateExercise(exIdx, (ex) => {
      const updatedSets = ex.sets.map((s, idx) => {
        if (s.completed) return s;
        const prevSet =
          prevRec?.exercise.sets[idx] ||
          prevRec?.exercise.sets[prevRec.exercise.sets.length - 1];
        if (prevSet && prevSet.weight > 0) {
          return {
            ...s,
            weight: prevSet.weight,
            reps: prevSet.reps,
          };
        }
        return s;
      });

      return {
        ...ex,
        name: trimmed,
        exerciseId: derivedId,
        muscleGroup: matchedTemplate ? matchedTemplate.muscleGroup : ex.muscleGroup,
        sets: updatedSets,
      };
    });
  };

  // Adjusts targetSets count on an exercise and automatically adds/trims uncompleted set rows to match
  const handleTargetSetsCountChange = async (exIdx: number, newTargetSets: number) => {
    const clamped = Math.min(12, Math.max(1, newTargetSets));
    await updateExercise(exIdx, (ex) => {
      let updatedSets = [...ex.sets];
      if (clamped > updatedSets.length) {
        const lastSet = updatedSets[updatedSets.length - 1];
        for (let i = updatedSets.length; i < clamped; i++) {
          updatedSets.push({
            setNumber: i + 1,
            weight: lastSet ? lastSet.weight : 20,
            reps: lastSet ? lastSet.reps : ex.minReps,
            rir: ex.targetRir,
            reachedFailure: false,
            restTimeSeconds: ex.restSeconds,
            completed: false,
          });
        }
      } else if (clamped < updatedSets.length) {
        updatedSets = updatedSets.slice(0, clamped);
      }
      return {
        ...ex,
        targetSets: clamped,
        sets: updatedSets,
      };
    });
  };

  const handleSetChange = async (
    exIdx: number,
    setIdx: number,
    changes: Partial<LoggedSet>,
    triggerRestTimer?: { seconds: number; exName: string }
  ) => {
    await updateExercise(exIdx, (ex) => {
      const newSets = ex.sets.map((set, idx) =>
        idx === setIdx ? { ...set, ...changes } : set
      );
      return { ...ex, sets: newSets };
    });

    if (triggerRestTimer) {
      setRestTimerTotal(triggerRestTimer.seconds);
      setRestTimerRemaining(triggerRestTimer.seconds);
      setRestTimerExerciseName(triggerRestTimer.exName || 'Extra Exercise');
    }
  };

  const handleAddExtraSet = async (exIdx: number) => {
    await updateExercise(exIdx, (ex) => {
      if (ex.sets.length >= 12) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const nextSet: LoggedSet = {
        setNumber: ex.sets.length + 1,
        weight: lastSet ? lastSet.weight : 20,
        reps: lastSet ? lastSet.reps : ex.minReps,
        rir: ex.targetRir,
        reachedFailure: false,
        restTimeSeconds: ex.restSeconds,
        completed: false,
      };
      return { ...ex, sets: [...ex.sets, nextSet] };
    });
  };

  const handleRemoveLastSet = async (exIdx: number) => {
    await updateExercise(exIdx, (ex) => {
      if (ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.slice(0, -1) };
    });
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${String(rem).padStart(2, '0')}`;
  };

  const totalCompletedSets = session.exercises.reduce(
    (sum, ex) => sum + (ex.skipped ? 0 : ex.sets.filter((s) => s.completed).length),
    0
  );
  const totalPrescribedSets = session.exercises.reduce(
    (sum, ex) => sum + (ex.skipped ? 0 : ex.sets.length),
    0
  );

  const weightStep = profile.weightUnit === 'kg' ? 2.5 : 5;
  const isWorkoutSaving = isSaving || isSavingDraft;

  const getSetInputKey = (
    exercise: LoggedExercise,
    set: LoggedSet,
    field: 'weight' | 'reps'
  ) => `${session.sessionId}:${exercise.exerciseId}:${set.setNumber}:${field}`;

  const changeSetNumberInput = (
    exIdx: number,
    setIdx: number,
    key: string,
    value: string,
    field: 'weight' | 'reps'
  ) => {
    setNumericInputDrafts((current) => ({ ...current, [key]: value }));
    if (value.trim() === '') return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    void handleSetChange(exIdx, setIdx, {
      [field]: field === 'reps' ? Math.floor(parsed) : parsed,
    });
  };

  const commitSetNumberInput = (
    exIdx: number,
    setIdx: number,
    key: string,
    field: 'weight' | 'reps',
    value: string,
    fallback: number
  ) => {
    const parsed = value.trim() === '' ? fallback : Number(value);
    const committed = Number.isFinite(parsed) && parsed >= 0
      ? field === 'reps' ? Math.floor(parsed) : parsed
      : fallback;
    setNumericInputDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    void handleSetChange(exIdx, setIdx, { [field]: committed });
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Datalist for quick exercise name autocomplete if desired */}
      <datalist id="iron100-exercise-suggestions">
        {knownExerciseTemplates.map((item) => (
          <option key={item.name} value={item.name} />
        ))}
      </datalist>

      {/* Top Sticky Gym Session Header */}
      <div className="rounded-2xl bg-[#111827] border border-slate-800/90 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectDayNumber(Math.max(1, activeDayNumber - 1))}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  DAY {session.dayNumber} / 100
                </span>
                <span aria-hidden="true">·</span>
                <span>Session #{session.sessionNumber}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{session.date}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {session.splitName}
              </h1>
            </div>
            <button
              onClick={() => onSelectDayNumber(Math.min(100, activeDayNumber + 1))}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="text-right mr-1">
              <div className="text-[11px] text-slate-400">
              {isWorkoutSaving
                ? 'Saving workout...'
                : saveState === 'pending'
                ? 'Changes pending'
                : saveState === 'error'
                ? 'Save failed'
                : 'All changes saved'} · Duration{' '}
                <span className="font-mono tabular-nums text-slate-200">
                  {formatTime(elapsedWorkoutSeconds)}
                </span>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-300">
                Sets: <strong className="text-white">{totalCompletedSets}/{totalPrescribedSets}</strong> · Vol:{' '}
                <strong className="text-emerald-400">
                  {session.totalVolume.toLocaleString()} {profile.weightUnit}
                </strong>{' '}
                · PRs: <strong className="text-amber-400">{session.prCount}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddExerciseToDay}
              disabled={session.exercises.length >= 20}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>

            <button
              onClick={() =>
                void persistChanges(
                  session.exercises,
                  session.notes,
                  session.status === 'completed' ? 'in_progress' : 'completed',
                  true
                ).catch(() => undefined)
              }
              disabled={isWorkoutSaving}
              className={`min-h-[44px] px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                session.status === 'completed'
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {session.status === 'completed' ? 'Workout Completed' : 'Finish Workout'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-sm text-rose-200 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="min-w-0 break-words">{saveError}</span>
          <button
            type="button"
            disabled={isWorkoutSaving}
            onClick={() => {
              const latestDraft = draftSessionRef.current;
              if (latestDraft) void saveDraft(latestDraft).catch(() => undefined);
            }}
            className="min-h-[40px] shrink-0 rounded-lg bg-rose-500/20 px-3 text-xs font-semibold text-rose-100 hover:bg-rose-500/30 disabled:opacity-50"
          >
            Retry save
          </button>
        </div>
      )}

      {/* Automatic Rest Timer Banner (shows when active or finished) */}
      {restTimerRemaining !== null && (
        <div
          className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 transition-colors ${
            restTimerRemaining === 0
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
              : 'bg-slate-900/95 border-amber-500/50 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Timer
              className={`w-5 h-5 ${
                restTimerRemaining === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <div>
              <div className="text-xs text-slate-400">
                Rest Timer · {restTimerExerciseName}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                {restTimerRemaining === 0
                  ? 'REST COMPLETE — READY FOR NEXT SET!'
                  : `${formatTime(restTimerRemaining)} / ${formatTime(restTimerTotal)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setRestTimerRemaining((prev) => Math.max(0, (prev || 0) - 15))
              }
              className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
            >
              -15s
            </button>
            <button
              onClick={() =>
                setRestTimerRemaining((prev) => (prev || 0) + 15)
              }
              className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
            >
              +15s
            </button>
            <button
              onClick={() => setRestTimerRemaining(restTimerTotal)}
              className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1 cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRestTimerRemaining(null)}
              className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
              title="Dismiss Timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state if Sunday Rest Day has no exercises yet */}
      {session.exercises.length === 0 && (
        <div className="rounded-2xl bg-[#111827] border border-slate-800/90 p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-white">
            Scheduled Rest Day — Optional Bonus Session
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No prescribed exercises are scheduled for Sunday, but you can click{' '}
            <strong className="text-emerald-400">+ Add an Exercise</strong> below to log any extra
            work with full set, rep, weight, and RIR tracking.
          </p>
        </div>
      )}

      {/* Exercise Cards */}
      {session.exercises.map((exercise, exIdx) => {
        const prevRecord = getPreviousExerciseRecord(
          exercise.exerciseId,
          allSessions,
          session.sessionId,
          session.date
        );
        const prevExercise = prevRecord?.exercise || null;
        const recommendation = generateProgressionRecommendation(
          exercise,
          prevExercise,
          profile.weightUnit
        );
        const histPR = historicalPRs[exercise.exerciseId];
        const currentExVolume = calculateExerciseVolume(exercise);
        const isVolumePR =
          histPR && histPR.bestVolume > 0 && currentExVolume > histPR.bestVolume;

        return (
          <section
            key={`${exercise.exerciseId}-${exIdx}`}
            className={`rounded-2xl bg-[#111827] border transition-colors ${
              exercise.skipped
                ? 'border-slate-800/50 opacity-60'
                : exercise.isCustom
                ? 'border-emerald-500/40'
                : 'border-slate-800/90'
            } p-4 sm:p-6`}
          >
            {/* Exercise Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1.5">
                  <span className="font-mono tabular-nums text-slate-500">
                    {String(exIdx + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true">·</span>
                  {exercise.isCustom ? (
                    <span className="text-emerald-400 font-semibold">
                      Added Exercise
                    </span>
                  ) : (
                    <span>{exercise.muscleGroup}</span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-semibold font-mono tabular-nums">
                    Target: {exercise.targetSets} × {exercise.minReps}–{exercise.maxReps}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Target {exercise.targetRir} RIR</span>
                  <span aria-hidden="true">·</span>
                  <span>Rest {exercise.restSeconds}s</span>
                </div>

                {exercise.isCustom ? (
                  <div className="space-y-3 mt-2">
                    {/* Inline Name & Muscle Group Input for Added Exercise */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Exercise Name
                        </label>
                        <input
                          type="text"
                          list="iron100-exercise-suggestions"
                          placeholder="Enter exercise name (e.g., Barbell Shrug, Face Pull)..."
                          value={exercise.name}
                          onChange={(e) =>
                            handleCustomExerciseNameChange(exIdx, e.target.value)
                          }
                          className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-emerald-500/60 text-base font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Muscle Group
                        </label>
                        <select
                          value={exercise.muscleGroup}
                          onChange={(e) =>
                            updateExercise(exIdx, (ex) => ({
                              ...ex,
                              muscleGroup: e.target.value,
                            }))
                          }
                          className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                        >
                          {MUSCLE_GROUPS.map((mg) => (
                            <option key={mg} value={mg}>
                              {mg}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={exercise.targetSets}
                            onChange={(e) =>
                              handleTargetSetsCountChange(
                                exIdx,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-full h-11 text-center rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono tabular-nums text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            Min Rep
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={exercise.minReps}
                            onChange={(e) =>
                              updateExercise(exIdx, (ex) => ({
                                ...ex,
                                minReps: Math.max(1, parseInt(e.target.value, 10) || 1),
                              }))
                            }
                            className="w-full h-11 text-center rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono tabular-nums text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            Max Rep
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={exercise.maxReps}
                            onChange={(e) =>
                              updateExercise(exIdx, (ex) => ({
                                ...ex,
                                maxReps: Math.max(
                                  ex.minReps,
                                  parseInt(e.target.value, 10) || ex.minReps
                                ),
                              }))
                            }
                            className="w-full h-11 text-center rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono tabular-nums text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {exercise.name}
                    </h2>
                    {isVolumePR && (
                      <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> VOLUME PR ({currentExVolume}{' '}
                        {profile.weightUnit})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    updateExercise(exIdx, (ex) => ({ ...ex, skipped: !ex.skipped }))
                  }
                  className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>{exercise.skipped ? 'Unskip' : 'Skip'}</span>
                </button>

                {exercise.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomExercise(exIdx)}
                    title="Remove Added Exercise"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-xs font-medium text-rose-300 hover:bg-rose-900/50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {!exercise.skipped && (
              <>
                {/* Progression Recommendation & Side-by-Side Previous Performance Summary */}
                <div className="my-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Progression Coach Box */}
                  <div
                    className={`p-3.5 rounded-xl border ${
                      recommendation.suggestWeightIncrease
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-slate-900/70 border-slate-800/90'
                    }`}
                  >
                    <div className="text-xs font-mono tabular-nums text-slate-400 mb-0.5">
                      {recommendation.headline}
                    </div>
                    <div className="text-sm font-semibold text-emerald-300">
                      {recommendation.instruction}
                    </div>
                    {histPR && histPR.heaviestWeight > 0 && (
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-1.5">
                        All-Time Best: {histPR.heaviestWeight} {profile.weightUnit} ×{' '}
                        {histPR.heaviestWeightReps} (Est. 1RM: {histPR.bestEstimated1RM}{' '}
                        {profile.weightUnit})
                      </div>
                    )}
                  </div>

                  {/* Direct Previous Session Performance Display */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/90">
                    <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Previous Performance</span>
                      {prevRecord && (
                        <span className="font-mono tabular-nums text-[11px] text-slate-400">
                          Day {prevRecord.session.dayNumber} ({prevRecord.session.date})
                        </span>
                      )}
                    </div>
                    {prevExercise && prevExercise.sets.some((s) => s.completed) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {prevExercise.sets
                          .filter((s) => s.completed)
                          .map((ps) => (
                            <div
                              key={ps.setNumber}
                              className="text-xs font-mono tabular-nums text-slate-300"
                            >
                              <span className="text-slate-500">Set {ps.setNumber}:</span>{' '}
                              <strong className="text-white">
                                {ps.weight} {profile.weightUnit} × {ps.reps}
                              </strong>{' '}
                              — {ps.reachedFailure ? 'Failure (0 RIR)' : `${ps.rir} RIR`}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {exercise.isCustom && !exercise.name.trim()
                          ? 'Type the exercise name above—if you have logged it before, previous sets will appear automatically.'
                          : 'No prior logged sets yet. Today sets your baseline benchmark!'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sets Input Table / Mobile Rows */}
                <div className="space-y-3">
                  {exercise.sets.map((set, setIdx) => {
                    const prevSet = prevExercise?.sets?.[setIdx];
                    const weightInputKey = getSetInputKey(exercise, set, 'weight');
                    const repsInputKey = getSetInputKey(exercise, set, 'reps');
                    const evaluation = evaluateSetPerformance(
                      set,
                      prevSet,
                      exercise.minReps,
                      exercise.maxReps,
                      histPR
                    );

                    return (
                      <div
                        key={set.setNumber}
                        className={`rounded-xl border p-3 transition-colors ${
                          set.completed
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        {/* Top row inside set card: Set # + Previous Set Reference + Live Status Indicators */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono tabular-nums text-white">
                              SET {set.setNumber}
                            </span>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-xs font-mono tabular-nums text-slate-400">
                              Prev:{' '}
                              {prevSet && prevSet.completed
                                ? `${prevSet.weight} ${profile.weightUnit} × ${prevSet.reps} (${prevSet.rir} RIR)`
                                : '—'}
                            </span>
                          </div>

                          {/* Automatic Progression & PR Status Indicators */}
                          {evaluation.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
                              {evaluation.tags.map((t, tidx) => (
                                <React.Fragment key={t.label}>
                                  {tidx > 0 && (
                                    <span aria-hidden="true" className="text-slate-600">
                                      ·
                                    </span>
                                  )}
                                  <span
                                    className={
                                      t.type === 'pr'
                                        ? 'text-amber-400 font-bold flex items-center gap-0.5'
                                        : t.type === 'beat_previous' ||
                                          t.type === 'increased_weight' ||
                                          t.type === 'increased_reps' ||
                                          t.type === 'top_of_range'
                                        ? 'text-emerald-400 font-semibold'
                                        : t.type === 'decreased_reps'
                                        ? 'text-rose-400'
                                        : 'text-slate-300'
                                    }
                                  >
                                    {t.type === 'pr' && <Trophy className="w-3 h-3 inline mr-0.5" />}
                                    {t.label}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Interactive Controls Row: Weight (+/-), Reps (+/-), RIR Selector, Failure Toggle, Complete Button */}
                        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-center">
                          {/* Weight Input with Large +/- Buttons (4 cols) */}
                          <div className="col-span-2 min-w-0 sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Weight ({profile.weightUnit})
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setNumericInputDrafts((current) => {
                                    const next = { ...current };
                                    delete next[weightInputKey];
                                    return next;
                                  });
                                  void handleSetChange(exIdx, setIdx, {
                                    weight: Math.max(0, Math.round((set.weight - weightStep) * 10) / 10),
                                  });
                                }}
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                aria-label="Decrease weight"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={numericInputDrafts[weightInputKey] ?? String(set.weight)}
                                onChange={(e) =>
                                  changeSetNumberInput(
                                    exIdx,
                                    setIdx,
                                    weightInputKey,
                                    e.target.value,
                                    'weight'
                                  )
                                }
                                onBlur={(e) =>
                                  commitSetNumberInput(
                                    exIdx,
                                    setIdx,
                                    weightInputKey,
                                    'weight',
                                    e.target.value,
                                    set.weight
                                  )
                                }
                                className="min-w-0 w-full h-[44px] text-center rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setNumericInputDrafts((current) => {
                                    const next = { ...current };
                                    delete next[weightInputKey];
                                    return next;
                                  });
                                  void handleSetChange(exIdx, setIdx, {
                                    weight: Math.round((set.weight + weightStep) * 10) / 10,
                                  });
                                }}
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                aria-label="Increase weight"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Reps Input with Large +/- Buttons (3 cols) */}
                          <div className="col-span-2 min-w-0 sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Reps (Target {exercise.minReps}–{exercise.maxReps})
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setNumericInputDrafts((current) => {
                                    const next = { ...current };
                                    delete next[repsInputKey];
                                    return next;
                                  });
                                  void handleSetChange(exIdx, setIdx, {
                                    reps: Math.max(0, set.reps - 1),
                                  });
                                }}
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                aria-label="Decrease reps"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={numericInputDrafts[repsInputKey] ?? String(set.reps)}
                                onChange={(e) =>
                                  changeSetNumberInput(
                                    exIdx,
                                    setIdx,
                                    repsInputKey,
                                    e.target.value,
                                    'reps'
                                  )
                                }
                                onBlur={(e) =>
                                  commitSetNumberInput(
                                    exIdx,
                                    setIdx,
                                    repsInputKey,
                                    'reps',
                                    e.target.value,
                                    set.reps
                                  )
                                }
                                className="min-w-0 w-full h-[44px] text-center rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setNumericInputDrafts((current) => {
                                    const next = { ...current };
                                    delete next[repsInputKey];
                                    return next;
                                  });
                                  void handleSetChange(exIdx, setIdx, {
                                    reps: set.reps + 1,
                                  });
                                }}
                                className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                aria-label="Increase reps"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* RIR Selector & Failure Toggle (3 cols) */}
                          <div className="col-span-1 min-w-0 grid grid-cols-2 gap-1.5 sm:col-span-3">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                RIR
                              </label>
                              <select
                                value={set.rir}
                                onChange={(e) => {
                                  const newRir = parseInt(e.target.value, 10);
                                  handleSetChange(exIdx, setIdx, {
                                    rir: newRir,
                                    reachedFailure: newRir === 0 ? set.reachedFailure : false,
                                  });
                                }}
                                className="w-full h-[44px] px-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                              >
                                <option value={0}>0 RIR</option>
                                <option value={1}>1 RIR</option>
                                <option value={2}>2 RIR</option>
                                <option value={3}>3 RIR</option>
                                <option value={4}>4+ RIR</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Failure
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextFail = !set.reachedFailure;
                                  handleSetChange(exIdx, setIdx, {
                                    reachedFailure: nextFail,
                                    rir: nextFail ? 0 : set.rir,
                                  });
                                }}
                                className={`w-full h-[44px] rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                  set.reachedFailure
                                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>{set.reachedFailure ? 'Fail' : 'No'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Complete Set Checkbox Button (2 cols) */}
                          <div className="col-span-1 min-w-0 sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Complete
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const nextCompleted = !set.completed;
                                handleSetChange(
                                  exIdx,
                                  setIdx,
                                  {
                                    completed: nextCompleted,
                                    completedAt: nextCompleted
                                      ? new Date().toISOString()
                                      : undefined,
                                  },
                                  nextCompleted
                                    ? {
                                        seconds: set.restTimeSeconds || exercise.restSeconds,
                                        exName: exercise.name || 'Added Exercise',
                                      }
                                    : undefined
                                );
                              }}
                              className={`w-full h-[44px] rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
                                set.completed
                                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>{set.completed ? 'Done' : 'Log Set'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Extra Set Controls & Exercise Notes */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddExtraSet(exIdx)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-emerald-400 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extra Set</span>
                    </button>
                    {exercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLastSet(exIdx)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        Remove Set
                      </button>
                    )}
                  </div>

                  <div className="flex-1 sm:max-w-md">
                    <input
                      type="text"
                      maxLength={250}
                      placeholder="Exercise notes (seat height, cable attachment, cues...)"
                      value={exercise.notes}
                      onChange={(e) =>
                        updateExercise(exIdx, (ex) => ({
                          ...ex,
                          notes: e.target.value.slice(0, 250),
                        }))
                      }
                      className="w-full h-[40px] px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        );
      })}

      {/* Prominent "+ Add an Exercise to Today's Workout" Action Card */}
      {session.exercises.length < 20 && (
        <button
          type="button"
          onClick={handleAddExerciseToDay}
          className="w-full min-h-[56px] rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-[#111827]/70 hover:bg-[#111827] text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add an Exercise to Day {session.dayNumber} ({session.splitName})</span>
        </button>
      )}

      {/* Overall Workout Session Notes & Finish Bar */}
      <section className="rounded-2xl bg-[#111827] border border-slate-800/90 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Workout Session Notes (Pump, Energy, Recovery, Joint Feel)
          </label>
          <textarea
            rows={2}
            maxLength={1000}
            placeholder="Record overall session takeaways..."
            value={session.notes}
            onChange={(e) =>
              persistChanges(
                session.exercises,
                e.target.value.slice(0, 1000),
                session.status
              )
            }
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            void persistChanges(
              session.exercises,
              session.notes,
              'completed',
              true
            ).catch(() => undefined)
          }
          disabled={isWorkoutSaving}
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>
            {session.status === 'completed'
              ? 'Session Saved & Completed — Update Record'
              : 'Complete & Permanently Save Workout'}
          </span>
        </button>
      </section>
    </div>
  );
};
