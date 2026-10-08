import React, { useState, useEffect, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  UserProfileRecord,
  WorkoutSessionRecord,
  BodyMetricRecord,
  LoggedExercise,
  FitnessGoal,
  UserProgramDay,
  UserProgramRecord,
  PersonalizationPreferences,
  WorkoutMode,
} from './types';
import {
  getTodayDateStr,
  getChallengeDayFromDate,
  getDateForChallengeDay,
  getSplitForDate,
  createInitialExercisesForSplit,
} from './data/workoutSplit';
import {
  calculateSessionVolume,
  countSessionPRs,
  getPreviousExerciseRecord,
} from './utils/progression';
import { DashboardView } from './components/DashboardView';
import { WorkoutLoggerView } from './components/WorkoutLoggerView';
import { TransformationProgressView } from './components/TransformationProgressView';
import { HistoryComparisonView } from './components/HistoryComparisonView';
import { ProgramOnboarding } from './components/ProgramOnboarding';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import {
  LayoutDashboard,
  Dumbbell,
  LineChart,
  History,
  LogIn,
  LogOut,
  CheckCircle2,
  Trophy,
  Flame,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'workout' | 'progress' | 'history';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSessionRecord[]>([]);
  const [metrics, setMetrics] = useState<BodyMetricRecord[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const reportFirestoreError = (
    error: unknown,
    operationType: OperationType,
    path: string
  ) => {
    try {
      handleFirestoreError(error, operationType, path);
    } catch (reportedError) {
      let message =
        reportedError instanceof Error
          ? reportedError.message
          : String(reportedError);
      try {
        const parsed = JSON.parse(message) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        // Preserve the original message when the error is not structured JSON.
      }
      setFirestoreError(`Firebase data request failed: ${message}`);
    }
  };

  // Track Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      setAuthReady(true);
      setProfile(null);
      setWorkouts([]);
      setMetrics([]);
      setSelectedDayNumber(1);
      setIsSaving(false);
      setFirestoreError(null);

      if (currUser) {
        const userRef = doc(db, 'users', currUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (auth.currentUser?.uid !== currUser.uid) return;

          if (!snap.exists()) {
            const today = getTodayDateStr();
            const initialProfile = {
              uid: currUser.uid,
              startDate: today,
              startingWeight: 80,
              targetWeight: 75,
              weightUnit: 'kg' as const,
              ...(currUser.displayName ? { name: currUser.displayName } : {}),
              ...(currUser.email ? { email: currUser.email } : {}),
              ...(currUser.photoURL ? { photoURL: currUser.photoURL } : {}),
              onboardingCompleted: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, initialProfile);
          }
        } catch (err) {
          if (auth.currentUser?.uid === currUser.uid) {
            reportFirestoreError(err, OperationType.GET, `users/${currUser.uid}`);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Attach Firestore Real-Time Listeners once authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const userPath = `users/${user.uid}`;
    const workoutsPath = `users/${user.uid}/workouts`;
    const metricsPath = `users/${user.uid}/metrics`;
    const isCurrentUser = () => auth.currentUser?.uid === user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!isCurrentUser()) return;

        if (snap.exists()) {
          const data = snap.data() as UserProfileRecord;
          if (data.uid !== user.uid) return;

          setProfile(data);
          const todayDay = getChallengeDayFromDate(
            data.startDate,
            getTodayDateStr()
          );
          setSelectedDayNumber(todayDay);
        } else {
          setProfile(null);
        }
      },
      (err) => {
        if (isCurrentUser()) {
          reportFirestoreError(err, OperationType.GET, userPath);
        }
      }
    );

    const unsubWorkouts = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'workouts'),
        where('uid', '==', user.uid)
      ),
      (snap) => {
        if (!isCurrentUser()) return;

        const list: WorkoutSessionRecord[] = [];
        snap.forEach((d: any) => list.push(d.data() as WorkoutSessionRecord));
        setWorkouts(list);
        setFirestoreError(null);
      },
      (err) => {
        if (isCurrentUser()) {
          reportFirestoreError(err, OperationType.LIST, workoutsPath);
        }
      }
    );

    const unsubMetrics = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'metrics'),
        where('uid', '==', user.uid)
      ),
      (snap) => {
        if (!isCurrentUser()) return;

        const list: BodyMetricRecord[] = [];
        snap.forEach((d: any) => list.push(d.data() as BodyMetricRecord));
        setMetrics(list);
        setFirestoreError(null);
      },
      (err) => {
        if (isCurrentUser()) {
          reportFirestoreError(err, OperationType.LIST, metricsPath);
        }
      }
    );

    return () => {
      unsubProfile();
      unsubWorkouts();
      unsubMetrics();
    };
  }, [authReady, user]);

  const currentChallengeDay = useMemo(() => {
    if (!profile) return 1;
    return getChallengeDayFromDate(profile.startDate, getTodayDateStr());
  }, [profile]);

  // Get or dynamically generate the workout session for the selected day
  const activeDaySession = useMemo<WorkoutSessionRecord | null>(() => {
    if (!profile || !user) return null;
    const dateStr = getDateForChallengeDay(profile.startDate, selectedDayNumber);
    const existing = workouts.find(
      (w) => w.dayNumber === selectedDayNumber || w.date === dateStr
    );
    if (existing) return existing;

    const split = getSplitForDate(dateStr);

    const sessionId = `day_${selectedDayNumber}`;
    const prevExercisesMap: Record<string, LoggedExercise> = {};
    for (const ex of split.exercises) {
      const prevRec = getPreviousExerciseRecord(
        ex.exerciseId,
        workouts,
        sessionId,
        dateStr
      );
      if (prevRec) {
        prevExercisesMap[ex.exerciseId] = prevRec.exercise;
      }
    }

    const exercises = createInitialExercisesForSplit(split, prevExercisesMap);
    return {
      uid: user.uid,
      sessionId,
      dayNumber: selectedDayNumber,
      sessionNumber: workouts.length + 1,
      date: dateStr,
      splitId: split.splitId,
      splitName: split.title,
      status: 'in_progress',
      totalVolume: 0,
      prCount: 0,
      durationSeconds: 0,
      notes: '',
      exercises,
    };
  }, [profile, user, selectedDayNumber, workouts]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in could not be completed.'
      );
    }
  };

  const handleSaveProgramDraft = async (
    goal: FitnessGoal,
    workoutMode: WorkoutMode,
    days: UserProgramDay[]
  ) => {
    if (!user || !profile || auth.currentUser?.uid !== user.uid) {
      throw new Error('Your signed-in account changed. Please sign in again.');
    }

    const programPath = `users/${user.uid}/programs/current`;
    const programRef = doc(db, 'users', user.uid, 'programs', 'current');
    try {
      const existingProgram = await getDoc(programRef);
      if (auth.currentUser?.uid !== user.uid) {
        throw new Error('Your signed-in account changed. Please sign in again.');
      }

      const program: UserProgramRecord = {
        uid: user.uid,
        programId: 'current',
        goal,
        workoutMode,
        status: 'draft',
        days,
        createdAt: existingProgram.exists()
          ? existingProgram.data()?.createdAt ?? serverTimestamp()
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(programRef, program);
      await updateDoc(doc(db, 'users', user.uid), {
        goal,
        workoutMode,
        onboardingCompleted: false,
        programId: 'current',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.WRITE, programPath);
      throw err;
    }
  };

  const handleSaveOnboardingPreferences = async (
    preferences: PersonalizationPreferences
  ) => {
    if (!user || !profile || auth.currentUser?.uid !== user.uid) {
      throw new Error('Your signed-in account changed. Please sign in again.');
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        goal: preferences.goal,
        ...(preferences.workoutMode ? { workoutMode: preferences.workoutMode } : {}),
        physiqueFocus: preferences.physiqueFocus,
        availableEquipment: preferences.availableEquipment,
        physiquePriorities: preferences.physiquePriorities,
        onboardingCompleted: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      throw err;
    }
  };

  const handleSaveWorkoutSession = async (updated: WorkoutSessionRecord) => {
    if (!user || updated.uid !== user.uid) {
      throw new Error('Workout session does not belong to the current user.');
    }
    setIsSaving(true);
    const sessionPath = `users/${user.uid}/workouts/${updated.sessionId}`;
    const docRef = doc(db, 'users', user.uid, 'workouts', updated.sessionId);

    const computedVolume = calculateSessionVolume(updated.exercises);
    const computedPRs = countSessionPRs(updated, workouts);

    // Sanitize exercise array to strictly adhere to schema limits
    const sanitizedExercises = updated.exercises.slice(0, 20).map((ex, idx) => ({
      exerciseId: (ex.exerciseId || `custom_exercise_${idx + 1}`).slice(0, 64),
      name: (ex.name || `Added Exercise ${idx + 1}`).slice(0, 100),
      muscleGroup: (ex.muscleGroup || 'Full Body').slice(0, 64),
      targetSets: ex.targetSets,
      minReps: ex.minReps,
      maxReps: ex.maxReps,
      targetRir: ex.targetRir,
      restSeconds: ex.restSeconds,
      skipped: Boolean(ex.skipped),
      ...(ex.isCustom ? { isCustom: true } : {}),
      notes: (ex.notes || '').slice(0, 250),
      sets: ex.sets.slice(0, 15).map((s) => ({
        setNumber: s.setNumber,
        weight: Math.min(2000, Math.max(0, Number(s.weight) || 0)),
        reps: Math.min(500, Math.max(0, Number(s.reps) || 0)),
        rir: Math.min(10, Math.max(0, Number(s.rir) || 0)),
        reachedFailure: Boolean(s.reachedFailure),
        restTimeSeconds: Math.min(3600, Math.max(0, Number(s.restTimeSeconds) || 90)),
        completed: Boolean(s.completed),
        ...(s.completedAt ? { completedAt: s.completedAt } : {}),
      })),
    }));

    try {
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(docRef);
        const sessionData = {
          dayNumber: Math.min(365, Math.max(1, updated.dayNumber)),
          sessionNumber: Math.min(1000, Math.max(1, updated.sessionNumber)),
          date: updated.date,
          splitId: updated.splitId,
          splitName: updated.splitName.slice(0, 64),
          status: updated.status,
          totalVolume: Math.min(1000000, Math.max(0, computedVolume)),
          prCount: Math.min(200, Math.max(0, computedPRs)),
          durationSeconds: Math.min(86400, Math.max(0, updated.durationSeconds)),
          notes: (updated.notes || '').slice(0, 1000),
          exercises: sanitizedExercises,
          updatedAt: serverTimestamp(),
        };

        if (existing.exists()) {
          transaction.update(docRef, sessionData);
        } else {
          transaction.set(docRef, {
            uid: user.uid,
            sessionId: updated.sessionId,
            ...sessionData,
            createdAt: serverTimestamp(),
          });
        }
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.WRITE, sessionPath);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMetric = async (metric: BodyMetricRecord) => {
    if (!user || metric.uid !== user.uid) {
      throw new Error('Body metric does not belong to the current user.');
    }
    const logPath = `users/${user.uid}/metrics/${metric.logId}`;
    const docRef = doc(db, 'users', user.uid, 'metrics', metric.logId);

    try {
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(docRef);
        const metricData = {
          dayNumber: Math.min(365, Math.max(1, metric.dayNumber)),
          date: metric.date,
          bodyweight: Math.min(350, Math.max(0, metric.bodyweight)),
          waist: Math.min(300, Math.max(0, metric.waist)),
          chest: Math.min(300, Math.max(0, metric.chest)),
          arm: Math.min(150, Math.max(0, metric.arm)),
          thigh: Math.min(200, Math.max(0, metric.thigh)),
          sleepHours: Math.min(24, Math.max(0, metric.sleepHours)),
          steps: Math.min(200000, Math.max(0, metric.steps)),
          calories: Math.min(30000, Math.max(0, metric.calories)),
          protein: Math.min(1000, Math.max(0, metric.protein)),
          photoDataUrl: (metric.photoDataUrl || '').slice(0, 350000),
          notes: (metric.notes || '').slice(0, 500),
          updatedAt: serverTimestamp(),
        };

        if (existing.exists()) {
          transaction.update(docRef, metricData);
        } else {
          transaction.set(docRef, {
            uid: user.uid,
            logId: metric.logId,
            ...metricData,
            createdAt: serverTimestamp(),
          });
        }
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.WRITE, logPath);
      throw err;
    }
  };

  const handleQuickLogWeight = async (
    weight: number,
    date: string,
    dayNumber: number
  ) => {
    if (!user) return;
    const existing = metrics.find((m) => m.logId === date);
    const record: BodyMetricRecord = existing
      ? { ...existing, bodyweight: weight, dayNumber, date }
      : {
          uid: user.uid,
          logId: date,
          dayNumber,
          date,
          bodyweight: weight,
          waist: 0,
          chest: 0,
          arm: 0,
          thigh: 0,
          sleepHours: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          photoDataUrl: '',
          notes: '',
        };
    await handleSaveMetric(record);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfileRecord>) => {
    if (!user || !profile) return;
    const userPath = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        startDate: updates.startDate || profile.startDate,
        startingWeight: updates.startingWeight ?? profile.startingWeight,
        targetWeight: updates.targetWeight ?? profile.targetWeight,
        weightUnit: updates.weightUnit || profile.weightUnit,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, userPath);
      throw err;
    }
  };

  // Loading state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center p-6">
        <div className="text-sm font-mono text-slate-400">
          Initializing Iron100 Transformation Tracker...
        </div>
      </div>
    );
  }

  // Unauthenticated Landing Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 max-w-6xl mx-auto w-full">
          <a href="#top" className="text-xl font-bold tracking-tight text-white font-display">
            IRON100
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#split" className="hover:text-white transition-colors">
              6-Day Split
            </a>
            <a href="#overload" className="hover:text-white transition-colors">
              Progressive Overload
            </a>
            <a href="#analytics" className="hover:text-white transition-colors">
              100-Day Analytics
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <PWAInstallButton />
            <button
              onClick={handleSignIn}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-12 sm:py-20 space-y-12">
          <div className="max-w-2xl space-y-5">
            <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
              100-DAY BODYBUILDING TRANSFORMATION SYSTEM · PULL / LEGS / PUSH
            </div>
            <h1
              className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Objective Progressive Overload Across Every Set for 100 Days.
            </h1>
            <p className="text-base text-slate-400 leading-relaxed">
              Built specifically for your 6-day Pull A / Legs A / Push A / Pull B / Legs B / Push B
              transformation split. Automatically tracks previous performance right beside your
              active sets, flags personal records in real time, and calculates 7-day rolling
              bodyweight trends without ever overwriting your workout history.
            </p>
            {authError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/40 rounded-xl p-3">
                {authError}
              </p>
            )}
            <div className="pt-2">
              <button
                onClick={handleSignIn}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Start & Sync Your 100-Day Transformation</span>
              </button>
            </div>
          </div>

          <div
            id="split"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80"
          >
            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800/80 space-y-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Pre-Built 6-Day PPL Split
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every exercise, target set count, rep range, and RIR prescription for Pull A/B,
                Legs A/B, and Push A/B is automatically generated for Day 1 through Day 100.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800/80 space-y-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Live PR & Rep-Range Coach
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Displays your exact previous weight, reps, and RIR next to every set and tells you
                whether to beat reps on the final set or increase load.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800/80 space-y-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Permanent Cloud History
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Never overwrites previous sessions. Compare Today vs Last Session, Today vs All-Time
                Best, Week-to-Week tonnage, and Day 1 vs Current performance.
              </p>
            </div>
          </div>
        </main>

        <footer className="px-6 py-6 border-t border-slate-900 text-xs text-slate-500 text-center">
          Iron100 Transformation Tracker · Permanent Progressive Overload Log
        </footer>
      </div>
    );
  }

  if (profile?.onboardingCompleted === false) {
    return (
      <ProgramOnboarding
        profile={profile}
        onSavePreferences={handleSaveOnboardingPreferences}
        onSaveDraft={handleSaveProgramDraft}
        onSignOut={() => void signOut(auth)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100">
      {/* 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 min-h-14 bg-[#090D16]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="shrink-0 text-lg font-extrabold tracking-tight text-white font-display"
        >
          IRON100
        </a>

        {/* Zone 2: Clean text navigation links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'text-white underline underline-offset-8 decoration-emerald-400 decoration-2'
                : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('workout')}
            className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'workout'
                ? 'text-white underline underline-offset-8 decoration-emerald-400 decoration-2'
                : ''
            }`}
          >
            Workout Logger
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'progress'
                ? 'text-white underline underline-offset-8 decoration-emerald-400 decoration-2'
                : ''
            }`}
          >
            100-Day Progress
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'text-white underline underline-offset-8 decoration-emerald-400 decoration-2'
                : ''
            }`}
          >
            History & Compare
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>
          <button
            onClick={() => setActiveTab('workout')}
            className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span className="hidden sm:inline">Day {selectedDayNumber} Workout</span>
            <span className="sm:hidden">Day {selectedDayNumber}</span>
          </button>
          <button
            onClick={() => signOut(auth)}
            title="Sign Out"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <OfflineIndicator />
      {firestoreError && (
        <div
          role="alert"
          className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/50 bg-rose-950/50 px-4 py-3 text-sm text-rose-200 sm:mx-6"
        >
          <span className="min-w-0 break-words">{firestoreError}</span>
          <button
            type="button"
            onClick={() => setFirestoreError(null)}
            className="min-h-[40px] shrink-0 rounded-lg px-3 text-xs font-semibold text-rose-100 hover:bg-rose-500/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {!profile ? (
          <div className="p-8 rounded-2xl bg-[#111827] border border-slate-800 text-center text-xs text-slate-400 font-mono">
            Loading your 100-day transformation profile...
          </div>
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            profile={profile}
            workouts={workouts}
            metrics={metrics}
            currentChallengeDay={currentChallengeDay}
            selectedDayNumber={selectedDayNumber}
            onSelectDayNumber={setSelectedDayNumber}
            onStartWorkoutForDay={(day) => {
              setSelectedDayNumber(day);
              setActiveTab('workout');
            }}
            onQuickLogWeight={handleQuickLogWeight}
            onUpdateProfile={handleUpdateProfile}
          />
        ) : activeTab === 'workout' ? (
          <WorkoutLoggerView
            key={user.uid}
            profile={profile}
            activeDayNumber={selectedDayNumber}
            onSelectDayNumber={setSelectedDayNumber}
            session={activeDaySession}
            allSessions={workouts}
            onSaveSession={handleSaveWorkoutSession}
            isSaving={isSaving}
          />
        ) : activeTab === 'progress' ? (
          <TransformationProgressView
            profile={profile}
            metrics={metrics}
            workouts={workouts}
            selectedDayNumber={selectedDayNumber}
            onSelectDayNumber={setSelectedDayNumber}
            onSaveMetric={handleSaveMetric}
          />
        ) : (
          <HistoryComparisonView
            profile={profile}
            workouts={workouts}
            onOpenWorkoutInLogger={(day) => {
              setSelectedDayNumber(day);
              setActiveTab('workout');
            }}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Ergonomic Anchor, <=15% total sticky height) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#090D16]/95 backdrop-blur-md border-t border-slate-800/90 grid grid-cols-4 items-center">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            Dashboard
          </span>
        </button>

        <button
          onClick={() => setActiveTab('workout')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeTab === 'workout' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            Workout
          </span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeTab === 'progress' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <LineChart className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            100-Day Log
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeTab === 'history' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
            History
          </span>
        </button>
      </nav>
    </div>
  );
}
