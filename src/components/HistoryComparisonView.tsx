import React, { useState, useMemo } from 'react';
import {
  WorkoutSessionRecord,
  UserProfileRecord,
  LoggedExercise,
} from '../types';
import {
  calculateEstimated1RM,
  calculateExerciseVolume,
  getPreviousExerciseRecord,
  getBestExerciseRecord,
} from '../utils/progression';
import {
  Calendar,
  Trophy,
  ArrowLeftRight,
  CheckCircle2,
  Dumbbell,
  Clock,
} from 'lucide-react';

interface HistoryComparisonViewProps {
  profile: UserProfileRecord;
  workouts: WorkoutSessionRecord[];
  onOpenWorkoutInLogger: (dayNumber: number) => void;
}

type ComparisonMode =
  | 'today_vs_last'
  | 'today_vs_best'
  | 'week_to_week'
  | 'day1_vs_current';

export const HistoryComparisonView: React.FC<HistoryComparisonViewProps> = ({
  profile,
  workouts,
  onOpenWorkoutInLogger,
}) => {
  const sortedWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.sessionNumber - a.sessionNumber;
    });
  }, [workouts]);

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sortedWorkouts[0]?.sessionId || ''
  );
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>('today_vs_last');
  const [compareWeekA, setCompareWeekA] = useState<number>(1);
  const [compareWeekB, setCompareWeekB] = useState<number>(2);

  const selectedSession =
    sortedWorkouts.find((w) => w.sessionId === selectedSessionId) ||
    sortedWorkouts[0] ||
    null;

  // Find earliest session of the same split (Day 1 baseline for that split)
  const earliestSameSplitSession = useMemo(() => {
    if (!selectedSession) return null;
    const sameSplit = [...workouts]
      .filter(
        (w) =>
          w.splitId === selectedSession.splitId &&
          w.sessionId !== selectedSession.sessionId
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    return sameSplit[0] || null;
  }, [workouts, selectedSession]);

  // Weekly aggregation for Week-to-Week comparison
  const weeklySummaries = useMemo(() => {
    const map = new Map<
      number,
      {
        week: number;
        sessionsCount: number;
        totalVolume: number;
        totalSets: number;
        prCount: number;
      }
    >();

    for (let wk = 1; wk <= 15; wk++) {
      map.set(wk, {
        week: wk,
        sessionsCount: 0,
        totalVolume: 0,
        totalSets: 0,
        prCount: 0,
      });
    }

    for (const w of workouts) {
      const wk = Math.min(15, Math.max(1, Math.ceil(w.dayNumber / 7)));
      const item = map.get(wk)!;
      if (w.status === 'completed' || w.totalVolume > 0) {
        item.sessionsCount += 1;
        item.totalVolume += Math.round(w.totalVolume);
        item.prCount += w.prCount || 0;
        item.totalSets += w.exercises.reduce(
          (s, ex) => s + (ex.skipped ? 0 : ex.sets.filter((st) => st.completed).length),
          0
        );
      }
    }

    return Array.from(map.values());
  }, [workouts]);

  const formatSetSummary = (ex: LoggedExercise | null | undefined) => {
    if (!ex || ex.skipped) return 'Skipped / Not Logged';
    const done = ex.sets.filter((s) => s.completed && s.reps > 0);
    if (done.length === 0) return 'No completed sets';
    return done
      .map(
        (s) =>
          `${s.weight}${profile.weightUnit} × ${s.reps} (${
            s.reachedFailure ? 'Fail' : `${s.rir}RIR`
          })`
      )
      .join('  ·  ');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Comparison Mode Selector */}
      <section className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold mb-1">
              PERMANENT WORKOUT ARCHIVE & COMPARISON ENGINE
            </div>
            <h1 className="text-2xl font-bold text-white">
              Workout History & Objective Progression
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Every completed workout is permanently preserved. Select any session to inspect sets or compare progression.
            </p>
          </div>

          {/* 4 Comparison Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'today_vs_last', label: 'Session vs Last' },
                { id: 'today_vs_best', label: 'Session vs Best' },
                { id: 'day1_vs_current', label: 'Day 1 vs Current' },
                { id: 'week_to_week', label: 'Week-to-Week' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setComparisonMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  comparisonMode === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {comparisonMode === 'week_to_week' ? (
        <section className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Week-to-Week Performance Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Compare training volume, working sets, and consistency across any two weeks of your 100 days.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={compareWeekA}
                onChange={(e) => setCompareWeekA(parseInt(e.target.value, 10))}
                className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              >
                {weeklySummaries.map((w) => (
                  <option key={w.week} value={w.week}>
                    Week {w.week} (Days {(w.week - 1) * 7 + 1}–
                    {Math.min(100, w.week * 7)})
                  </option>
                ))}
              </select>
              <span className="text-slate-500">vs</span>
              <select
                value={compareWeekB}
                onChange={(e) => setCompareWeekB(parseInt(e.target.value, 10))}
                className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
              >
                {weeklySummaries.map((w) => (
                  <option key={w.week} value={w.week}>
                    Week {w.week} (Days {(w.week - 1) * 7 + 1}–
                    {Math.min(100, w.week * 7)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const wkA = weeklySummaries[compareWeekA - 1];
            const wkB = weeklySummaries[compareWeekB - 1];
            const volDelta = wkB.totalVolume - wkA.totalVolume;
            const setsDelta = wkB.totalSets - wkA.totalSets;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">
                    Week {wkA.week} Baseline
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
                    {wkA.totalVolume.toLocaleString()} {profile.weightUnit}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                    {wkA.sessionsCount} workouts · {wkA.totalSets} sets · {wkA.prCount} PRs
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">
                    Week {wkB.week} Performance
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                    {wkB.totalVolume.toLocaleString()} {profile.weightUnit}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                    {wkB.sessionsCount} workouts · {wkB.totalSets} sets · {wkB.prCount} PRs
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Net Progression Delta</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                      volDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {volDelta >= 0 ? '+' : ''}
                    {volDelta.toLocaleString()} {profile.weightUnit}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                    {setsDelta >= 0 ? '+' : ''}
                    {setsDelta} working sets difference
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      ) : null}

      {/* Main Archive Split Layout: Left Session Selector List + Right Detailed Session & Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: All Logged Workouts List */}
        <div className="lg:col-span-4 rounded-2xl bg-[#111827] border border-slate-800/80 p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Logged Sessions ({sortedWorkouts.length})</span>
            </h2>
          </div>

          {sortedWorkouts.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              No workouts logged yet. Start your Day 1 workout from the Dashboard or Logger tab!
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {sortedWorkouts.map((w) => {
                const isSelected = selectedSession?.sessionId === w.sessionId;
                return (
                  <button
                    key={w.sessionId}
                    onClick={() => setSelectedSessionId(w.sessionId)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-400 text-white'
                        : 'bg-slate-900/60 border-slate-800/90 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400 mb-1">
                      <span className="text-emerald-400 font-semibold">
                        Day {w.dayNumber} · Session #{w.sessionNumber}
                      </span>
                      <span>{w.date}</span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {w.splitName}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                      <span>
                        {Math.round(w.totalVolume).toLocaleString()} {profile.weightUnit}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{w.prCount} PRs</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">
                        {w.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Workout Details & Side-by-Side Comparison */}
        <div className="lg:col-span-8">
          {!selectedSession ? (
            <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-8 text-center text-sm text-slate-400">
              Select a workout session on the left to inspect its complete set-by-set history and comparisons.
            </div>
          ) : (
            <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400 mb-1">
                    <span className="text-emerald-400 font-semibold">
                      DAY {selectedSession.dayNumber} / 100
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Session #{selectedSession.sessionNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedSession.date}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {selectedSession.splitName}
                  </h2>
                  {selectedSession.notes && (
                    <p className="text-xs text-slate-300 mt-1">
                      Note: “{selectedSession.notes}”
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenWorkoutInLogger(selectedSession.dayNumber)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
                  >
                    Open in Logger
                  </button>
                </div>
              </div>

              {/* Exercise-by-Exercise Breakdown with Side-by-Side Comparison */}
              <div className="space-y-4">
                {selectedSession.exercises.map((ex, idx) => {
                  const currentVol = calculateExerciseVolume(ex);
                  const doneSets = ex.sets.filter((s) => s.completed && s.reps > 0);
                  const currentBest1RM =
                    doneSets.length > 0
                      ? Math.max(
                          ...doneSets.map((s) =>
                            calculateEstimated1RM(s.weight, s.reps)
                          )
                        )
                      : 0;

                  // Determine benchmark exercise based on selected comparisonMode
                  let benchmarkTitle = 'Last Session';
                  let benchmarkExercise: LoggedExercise | null = null;
                  let benchmarkDate = '';

                  if (comparisonMode === 'today_vs_last') {
                    const prev = getPreviousExerciseRecord(
                      ex.exerciseId,
                      workouts,
                      selectedSession.sessionId,
                      selectedSession.date
                    );
                    benchmarkTitle = 'Previous Session';
                    benchmarkExercise = prev?.exercise || null;
                    benchmarkDate = prev?.session.date || '';
                  } else if (comparisonMode === 'today_vs_best') {
                    const best = getBestExerciseRecord(
                      ex.exerciseId,
                      workouts,
                      selectedSession.sessionId
                    );
                    benchmarkTitle = 'All-Time Best Performance';
                    benchmarkExercise = best?.exercise || null;
                    benchmarkDate = best?.session.date || '';
                  } else if (comparisonMode === 'day1_vs_current') {
                    benchmarkTitle = 'First Logged Session (Day 1 Baseline)';
                    benchmarkExercise =
                      earliestSameSplitSession?.exercises.find(
                        (e) => e.exerciseId === ex.exerciseId
                      ) || null;
                    benchmarkDate = earliestSameSplitSession?.date || '';
                  }

                  const benchmarkVol = benchmarkExercise
                    ? calculateExerciseVolume(benchmarkExercise)
                    : 0;
                  const volDiff = currentVol - benchmarkVol;

                  return (
                    <div
                      key={`${ex.exerciseId}-${idx}`}
                      className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-white">
                            {idx + 1}. {ex.name}
                          </span>
                          <span className="text-xs text-slate-400 ml-2 font-mono tabular-nums">
                            ({ex.targetSets} × {ex.minReps}–{ex.maxReps})
                          </span>
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-300">
                          Vol: <strong className="text-white">{currentVol} {profile.weightUnit}</strong>
                          {currentBest1RM > 0 && (
                            <>
                              <span className="mx-1.5 text-slate-600">·</span>
                              <span>Est. 1RM: </span>
                              <strong className="text-emerald-400">
                                {currentBest1RM} {profile.weightUnit}
                              </strong>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Current Sets */}
                      <div className="text-xs font-mono tabular-nums text-slate-200">
                        <span className="text-slate-400">This Session: </span>
                        {formatSetSummary(ex)}
                      </div>

                      {/* Benchmark Comparison Row */}
                      {comparisonMode !== 'week_to_week' && (
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                          <div className="text-slate-400">
                            <span>
                              {benchmarkTitle}
                              {benchmarkDate ? ` (${benchmarkDate})` : ''}:{' '}
                            </span>
                            <span className="text-slate-300">
                              {benchmarkExercise
                                ? formatSetSummary(benchmarkExercise)
                                : 'No prior benchmark session'}
                            </span>
                          </div>
                          {benchmarkExercise && benchmarkVol > 0 && (
                            <span
                              className={
                                volDiff >= 0
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-amber-400'
                              }
                            >
                              {volDiff >= 0 ? '+' : ''}
                              {Math.round(volDiff * 10) / 10} {profile.weightUnit} vol
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
