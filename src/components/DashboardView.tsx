import React, { useEffect, useState } from 'react';
import {
  WorkoutSessionRecord,
  UserProfileRecord,
  BodyMetricRecord,
} from '../types';
import {
  WEEKLY_SPLIT,
  getDateForChallengeDay,
  getSplitForDate,
} from '../data/workoutSplit';
import {
  calculateBodyweightAnalytics,
  computeAllExercisePRs,
} from '../utils/progression';
import {
  Play,
  Flame,
  Trophy,
  Scale,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Dumbbell,
  Settings,
  ArrowRight,
  Plus,
} from 'lucide-react';

// TEMP DASHBOARD ANIMATION DEMO: Replace these targets with Firebase-backed values when ready.
const DASHBOARD_ANIMATION_DEMO = {
  workouts: 42,
  volume: 8250,
  volumeUnit: 'kg',
  day: 47,
  progress: 47,
} as const;
const DASHBOARD_ANIMATION_DURATION_MS = 1600;

interface DashboardViewProps {
  profile: UserProfileRecord;
  workouts: WorkoutSessionRecord[];
  metrics: BodyMetricRecord[];
  currentChallengeDay: number;
  selectedDayNumber: number;
  onSelectDayNumber: (day: number) => void;
  onStartWorkoutForDay: (dayNumber: number) => void;
  onQuickLogWeight: (weight: number, date: string, dayNumber: number) => Promise<void>;
  onUpdateProfile: (updates: Partial<UserProfileRecord>) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  workouts,
  metrics,
  currentChallengeDay,
  selectedDayNumber,
  onSelectDayNumber,
  onStartWorkoutForDay,
  onQuickLogWeight,
  onUpdateProfile,
}) => {
  const [animatedDashboardValues, setAnimatedDashboardValues] = useState({
    workouts: 0,
    volume: 0,
    day: 0,
    progress: 0,
  });
  const [quickWeightInput, setQuickWeightInput] = useState<string>('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editStartDate, setEditStartDate] = useState(profile.startDate);
  const [editStartingWeight, setEditStartingWeight] = useState(String(profile.startingWeight));
  const [editTargetWeight, setEditTargetWeight] = useState(String(profile.targetWeight));
  const [editUnit, setEditUnit] = useState<'kg' | 'lbs'>(profile.weightUnit);

  // TEMP DEMO: Animate all dashboard targets together with a shared ease-out duration.
  useEffect(() => {
    let frameId = 0;
    let startTime: number | null = null;

    const animateDashboardValues = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min(
        (timestamp - startTime) / DASHBOARD_ANIMATION_DURATION_MS,
        1
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedDashboardValues({
        workouts: Math.round(DASHBOARD_ANIMATION_DEMO.workouts * easedProgress),
        volume: Math.round(DASHBOARD_ANIMATION_DEMO.volume * easedProgress),
        day: Math.round(DASHBOARD_ANIMATION_DEMO.day * easedProgress),
        progress: DASHBOARD_ANIMATION_DEMO.progress * easedProgress,
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animateDashboardValues);
      }
    };

    frameId = window.requestAnimationFrame(animateDashboardValues);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const selectedDate = getDateForChallengeDay(profile.startDate, selectedDayNumber);
  const selectedSplit = getSplitForDate(selectedDate);
  const selectedDaySession = workouts.find((w) => w.dayNumber === selectedDayNumber);

  const totalPRsAllTime = workouts.reduce((sum, w) => sum + (w.prCount || 0), 0);
  const prSummaryMap = computeAllExercisePRs(workouts);
  const uniqueExercisesWithPRs = Object.keys(prSummaryMap).length;

  // Calculate current workout streak (consecutive non-Sunday training days completed or active)
  const streakCount = (() => {
    let streak = 0;
    for (let d = currentChallengeDay; d >= 1; d--) {
      const dateStr = getDateForChallengeDay(profile.startDate, d);
      const split = getSplitForDate(dateStr);
      if (split.splitId === 'rest') {
        continue; // Rest days preserve streak
      }
      const sess = workouts.find(
        (w) =>
          (w.dayNumber === d || w.date === dateStr) &&
          (w.status === 'completed' || w.totalVolume > 0)
      );
      if (sess) {
        streak++;
      } else if (d < currentChallengeDay) {
        break;
      }
    }
    return streak;
  })();

  // Weekly training consistency (current 7-day block of challenge)
  const currentWeekIdx = Math.floor((selectedDayNumber - 1) / 7);
  const weekStartDay = currentWeekIdx * 7 + 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dNum = Math.min(100, weekStartDay + i);
    const dStr = getDateForChallengeDay(profile.startDate, dNum);
    const sp = getSplitForDate(dStr);
    const sess = workouts.find((w) => w.dayNumber === dNum || w.date === dStr);
    return {
      dayNumber: dNum,
      date: dStr,
      split: sp,
      session: sess,
    };
  });

  const completedInCurrentWeek = weekDays.filter(
    (wd) => wd.split.splitId !== 'rest' && wd.session && (wd.session.status === 'completed' || wd.session.totalVolume > 0)
  ).length;

  const bwAnalytics = calculateBodyweightAnalytics(metrics, profile.startingWeight);
  const todayMetric = metrics.find((m) => m.dayNumber === selectedDayNumber || m.date === selectedDate);

  const handleSaveQuickWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quickWeightInput);
    if (isNaN(val) || val < 20 || val > 350) return;
    setSavingWeight(true);
    try {
      await onQuickLogWeight(val, selectedDate, selectedDayNumber);
      setQuickWeightInput('');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const sw = parseFloat(editStartingWeight);
    const tw = parseFloat(editTargetWeight);
    if (isNaN(sw) || isNaN(tw)) return;
    await onUpdateProfile({
      startDate: editStartDate,
      startingWeight: sw,
      targetWeight: tw,
      weightUnit: editUnit,
    });
    setShowProfileEdit(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top 100-Day Transformation Banner & Progress Bar */}
      <section className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                DAY {animatedDashboardValues.day} / 100
              </span>
              <span aria-hidden="true">·</span>
              <span>Week {Math.ceil(selectedDayNumber / 7)} of 15</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{selectedDate}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {selectedSplit.title}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{selectedSplit.subtitle}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowProfileEdit(!showProfileEdit)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700/80 bg-slate-800/60 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Settings className="w-4 h-4" />
              <span>Challenge Setup</span>
            </button>
            {selectedSplit.splitId !== 'rest' && (
              <button
                onClick={() => onStartWorkoutForDay(selectedDayNumber)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-transform active:scale-[0.98] flex items-center gap-2 whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {selectedDaySession
                    ? selectedDaySession.status === 'completed'
                      ? 'Review / Edit Workout'
                      : 'Resume Workout'
                    : 'Start Today’s Workout'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Edit Drawer */}
        {showProfileEdit && (
          <form
            onSubmit={handleSaveProfile}
            className="mb-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs text-slate-400 mb-1">Day 1 Start Date</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Starting Weight</label>
              <input
                type="number"
                step="0.1"
                value={editStartingWeight}
                onChange={(e) => setEditStartingWeight(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Day 100 Goal Weight</label>
              <input
                type="number"
                step="0.1"
                value={editTargetWeight}
                onChange={(e) => setEditTargetWeight(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unit</label>
              <select
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value as 'kg' | 'lbs')}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lbs">Pounds (lbs)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 h-11 px-4 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs whitespace-nowrap"
              >
                Save Setup
              </button>
              <button
                type="button"
                onClick={() => setShowProfileEdit(false)}
                className="h-11 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Day 1 -> Day 100 Progress Bar & Interactive 100-Day Grid */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              100-Day Transformation Timeline ·{' '}
              <strong className="text-white font-mono tabular-nums">
                {Math.round(animatedDashboardValues.progress)}%
              </strong>{' '}
              Elapsed
            </span>
            <div className="flex items-center gap-3 text-slate-400">
              <button
                onClick={() => onSelectDayNumber(Math.max(1, selectedDayNumber - 1))}
                className="hover:text-white underline cursor-pointer"
              >
                Prev Day
              </button>
              <button
                onClick={() => onSelectDayNumber(currentChallengeDay)}
                className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                Today (Day {currentChallengeDay})
              </button>
              <button
                onClick={() => onSelectDayNumber(Math.min(100, selectedDayNumber + 1))}
                className="hover:text-white underline cursor-pointer"
              >
                Next Day
              </button>
            </div>
          </div>

          {/* Smooth 100-Day Progress Bar */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 origin-left"
              style={{ transform: `scaleX(${animatedDashboardValues.progress / 100})` }}
            />
          </div>

          {/* 100-Day Interactive Matrix */}
          <div className="grid grid-cols-20 sm:grid-cols-25 gap-1 pt-1">
            {Array.from({ length: 100 }, (_, i) => {
              const d = i + 1;
              const sess = workouts.find((w) => w.dayNumber === d);
              const isCompleted = sess && (sess.status === 'completed' || sess.totalVolume > 0);
              const isSelected = d === selectedDayNumber;
              const isToday = d === currentChallengeDay;

              let cellStyle = 'bg-slate-900/90 text-slate-500 border-slate-800/80 hover:border-slate-600';
              if (isCompleted) {
                cellStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
              } else if (isToday) {
                cellStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/60';
              }

              if (isSelected) {
                cellStyle += ' ring-2 ring-emerald-400 text-white font-bold';
              }

              return (
                <button
                  key={d}
                  onClick={() => onSelectDayNumber(d)}
                  title={`Day ${d} (${getDateForChallengeDay(profile.startDate, d)})`}
                  className={`h-6 rounded text-[10px] font-mono tabular-nums border transition-colors flex items-center justify-center ${cellStyle}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Telemetry Stat Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Streak & Workouts */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Workout Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
            {streakCount} <span className="text-sm font-normal text-slate-400">days</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-slate-200 font-semibold">
              {animatedDashboardValues.workouts}
            </span>
            <span>total workouts completed</span>
          </div>
        </div>

        {/* Card 2: Bodyweight & 7-Day Average */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>7-Day Avg Weight</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
            {bwAnalytics.sevenDayAvg}{' '}
            <span className="text-sm font-normal text-slate-400">{profile.weightUnit}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>Start: {profile.startingWeight}{profile.weightUnit}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-mono tabular-nums font-medium ${
                bwAnalytics.totalChangeFromStart === 0
                  ? 'text-slate-300'
                  : bwAnalytics.totalChangeFromStart > 0
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {bwAnalytics.totalChangeFromStart > 0 ? '+' : ''}
              {bwAnalytics.totalChangeFromStart} {profile.weightUnit}
            </span>
          </div>
        </div>

        {/* Card 3: Total Training Volume */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Cumulative Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
            {animatedDashboardValues.volume.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-400">
              {DASHBOARD_ANIMATION_DEMO.volumeUnit}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across {workouts.length} logged sessions
          </div>
        </div>

        {/* Card 4: Personal Records */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Personal Records</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
            {totalPRsAllTime + uniqueExercisesWithPRs}{' '}
            <span className="text-sm font-normal text-slate-400">PRs</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {uniqueExercisesWithPRs} exercises tracked
          </div>
        </div>
      </section>

      {/* Weekly Training Consistency Strip + Daily Quick Bodyweight Entry */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Consistency */}
        <div className="lg:col-span-2 rounded-2xl bg-[#111827] border border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Week {currentWeekIdx + 1} Training Consistency
              </h2>
              <p className="text-xs text-slate-400">
                6-Day Pull / Legs / Push Split ·{' '}
                <span className="text-emerald-400 font-mono tabular-nums font-semibold">
                  {completedInCurrentWeek} / 6
                </span>{' '}
                sessions completed
              </p>
            </div>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((item) => {
              const isSelected = item.dayNumber === selectedDayNumber;
              const isDone =
                item.session &&
                (item.session.status === 'completed' || item.session.totalVolume > 0);
              const isRest = item.split.splitId === 'rest';

              return (
                <button
                  key={item.dayNumber}
                  onClick={() => onSelectDayNumber(item.dayNumber)}
                  className={`min-h-[76px] p-2 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-400 text-white'
                      : isDone
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-medium">
                      {item.split.dayName.slice(0, 3)}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      D{item.dayNumber}
                    </span>
                  </div>
                  <div className="my-1">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isRest ? (
                      <span className="text-[10px] text-slate-500">Rest</span>
                    ) : (
                      <Dumbbell className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  <div className="text-[10px] font-semibold truncate w-full">
                    {item.split.splitId.replace('_', ' ').toUpperCase()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Weigh-in & 7-Day Moving Average */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white">Day {selectedDayNumber} Weigh-In</h2>
              <span className="text-xs font-mono tabular-nums text-slate-400">{selectedDate}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Progress is evaluated via your 7-day rolling average—never a single day’s fluctuation.
            </p>

            {todayMetric && todayMetric.bodyweight > 0 ? (
              <div className="mb-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Logged for Day {selectedDayNumber}</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
                    {todayMetric.bodyweight} {profile.weightUnit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Weekly Change</span>
                  <span className="text-sm font-mono tabular-nums text-slate-200">
                    {bwAnalytics.weeklyWeightChange > 0 ? '+' : ''}
                    {bwAnalytics.weeklyWeightChange} {profile.weightUnit}/wk
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSaveQuickWeight} className="flex gap-2">
            <input
              type="number"
              step="0.1"
              placeholder={
                todayMetric?.bodyweight
                  ? `Update (${todayMetric.bodyweight} ${profile.weightUnit})`
                  : `Enter weight (${profile.weightUnit})`
              }
              value={quickWeightInput}
              onChange={(e) => setQuickWeightInput(e.target.value)}
              className="flex-1 h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              required
            />
            <button
              type="submit"
              disabled={savingWeight}
              className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{savingWeight ? 'Saving...' : 'Save'}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Today's Prescribed Split Preview & Full 7-Day Split Reference */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Selected Day Workout Prescription */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Day {selectedDayNumber} Prescribed Session
              </h2>
              <p className="text-xs text-slate-400">{selectedSplit.title}</p>
            </div>
            {selectedSplit.splitId !== 'rest' && (
              <button
                onClick={() => onStartWorkoutForDay(selectedDayNumber)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Logger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedSplit.exercises.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <p className="text-sm font-medium text-slate-200 mb-1">Active Recovery & Growth</p>
              <p className="text-xs text-slate-400">
                Sunday is your dedicated rest day. Hit your protein target, get 8+ hours of sleep,
                and log your morning bodyweight.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {selectedSplit.exercises.map((ex, idx) => {
                const pr = prSummaryMap[ex.exerciseId];
                return (
                  <div
                    key={`${ex.exerciseId}-${idx}`}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {idx + 1}. {ex.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{ex.muscleGroup}</span>
                        <span aria-hidden="true">·</span>
                        <span>Target {ex.targetRir} RIR</span>
                        <span aria-hidden="true">·</span>
                        <span>Rest {ex.restSeconds}s</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono tabular-nums font-semibold text-emerald-400">
                        {ex.targetSets} × {ex.minReps}–{ex.maxReps}
                      </div>
                      {pr && pr.heaviestWeight > 0 && (
                        <div className="text-[11px] font-mono tabular-nums text-slate-400">
                          Best: {pr.heaviestWeight}
                          {profile.weightUnit} × {pr.heaviestWeightReps}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Complete 7-Day Master Program Split Overview */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">Weekly Master Split</h2>
            <p className="text-xs text-slate-400">
              Automatically scheduled across all 100 days of your transformation
            </p>
          </div>
          <div className="divide-y divide-slate-800/80">
            {WEEKLY_SPLIT.map((sp) => {
              const isCurrentSplit = sp.splitId === selectedSplit.splitId;
              return (
                <div
                  key={sp.splitId}
                  className={`py-2.5 first:pt-0 last:pb-0 flex items-center justify-between ${
                    isCurrentSplit ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>{sp.title}</span>
                      {isCurrentSplit && (
                        <span className="text-[11px] font-normal text-emerald-400">
                          · Active Day
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{sp.subtitle}</div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                    {sp.exercises.length > 0 ? `${sp.exercises.length} exercises` : 'Recovery'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
