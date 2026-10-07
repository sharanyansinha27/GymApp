import {
  WorkoutSessionRecord,
  LoggedExercise,
  LoggedSet,
  ExercisePRSummary,
  SetComparisonTag,
  BodyMetricRecord,
} from '../types';

/**
 * Epley 1RM Formula: weight * (1 + reps / 30)
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculateExerciseVolume(exercise: LoggedExercise): number {
  if (exercise.skipped) return 0;
  return exercise.sets
    .filter((s) => s.completed && s.weight > 0 && s.reps > 0)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function calculateSessionVolume(exercises: LoggedExercise[]): number {
  return Math.round(exercises.reduce((sum, ex) => sum + calculateExerciseVolume(ex), 0) * 10) / 10;
}

/**
 * Finds the most recent previous LoggedExercise for a given exerciseId before a given session
 */
export function getPreviousExerciseRecord(
  exerciseId: string,
  allSessions: WorkoutSessionRecord[],
  currentSessionId: string,
  currentDate: string
): { session: WorkoutSessionRecord; exercise: LoggedExercise } | null {
  // Sort completed or prior sessions descending by date, then sessionNumber
  const priorSessions = allSessions
    .filter(
      (s) =>
        s.sessionId !== currentSessionId &&
        s.date <= currentDate &&
        s.exercises.some(
          (ex) => ex.exerciseId === exerciseId && !ex.skipped && ex.sets.some((st) => st.completed)
        )
    )
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.sessionNumber - a.sessionNumber;
    });

  for (const session of priorSessions) {
    const found = session.exercises.find(
      (ex) => ex.exerciseId === exerciseId && !ex.skipped && ex.sets.some((st) => st.completed)
    );
    if (found) {
      return { session, exercise: found };
    }
  }
  return null;
}

/**
 * Finds the all-time best performance for a given exerciseId across all sessions
 */
export function getBestExerciseRecord(
  exerciseId: string,
  allSessions: WorkoutSessionRecord[],
  excludeSessionId?: string
): { session: WorkoutSessionRecord; exercise: LoggedExercise; best1RM: number; bestVolume: number } | null {
  let bestResult: {
    session: WorkoutSessionRecord;
    exercise: LoggedExercise;
    best1RM: number;
    bestVolume: number;
  } | null = null;

  for (const session of allSessions) {
    if (excludeSessionId && session.sessionId === excludeSessionId) continue;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId || ex.skipped) continue;
      const completedSets = ex.sets.filter((s) => s.completed && s.reps > 0);
      if (completedSets.length === 0) continue;

      const max1RM = Math.max(...completedSets.map((s) => calculateEstimated1RM(s.weight, s.reps)));
      const vol = calculateExerciseVolume(ex);

      if (!bestResult || max1RM > bestResult.best1RM || (max1RM === bestResult.best1RM && vol > bestResult.bestVolume)) {
        bestResult = {
          session,
          exercise: ex,
          best1RM: max1RM,
          bestVolume: vol,
        };
      }
    }
  }

  return bestResult;
}

/**
 * Generates an intelligent double-progression recommendation based on the previous performance
 */
export function generateProgressionRecommendation(
  currentEx: LoggedExercise,
  prevEx: LoggedExercise | null,
  unit: 'kg' | 'lbs'
): { headline: string; instruction: string; suggestWeightIncrease: boolean } {
  if (!prevEx) {
    return {
      headline: 'Baseline Session',
      instruction: `Establish your working weight for ${currentEx.targetSets} × ${currentEx.minReps}–${currentEx.maxReps} at ${currentEx.targetRir} RIR.`,
      suggestWeightIncrease: false,
    };
  }

  const completedSets = prevEx.sets.filter((s) => s.completed);
  if (completedSets.length === 0) {
    return {
      headline: 'Baseline Session',
      instruction: `Target ${currentEx.targetSets} sets of ${currentEx.minReps}–${currentEx.maxReps} reps at ${currentEx.targetRir} RIR.`,
      suggestWeightIncrease: false,
    };
  }

  const weights = completedSets.map((s) => s.weight);
  const primaryWeight = weights[0];
  const repsList = completedSets.map((s) => s.reps).join(', ');
  const lastTimeSummary = `Last time: ${primaryWeight} ${unit} × ${repsList}.`;

  // Check if all prescribed sets reached the top of the rep range with appropriate RIR
  const allHitTop =
    completedSets.length >= currentEx.targetSets &&
    completedSets
      .slice(0, currentEx.targetSets)
      .every((s) => s.reps >= currentEx.maxReps && s.rir >= currentEx.targetRir);

  if (allHitTop) {
    const increment = unit === 'kg' ? 2.5 : 5;
    const nextWeight = primaryWeight + increment;
    return {
      headline: lastTimeSummary,
      instruction: `Top of rep range hit across all sets! Increase weight to ${nextWeight} ${unit} and aim for ${currentEx.minReps}+ reps.`,
      suggestWeightIncrease: true,
    };
  }

  // Find the first set that didn't hit maxReps
  const targetSetIdx = completedSets.findIndex((s) => s.reps < currentEx.maxReps);
  if (targetSetIdx !== -1) {
    const targetSet = completedSets[targetSetIdx];
    const setLabel =
      targetSetIdx === completedSets.length - 1
        ? 'the final set'
        : `Set ${targetSet.setNumber}`;
    return {
      headline: lastTimeSummary,
      instruction: `Today: Keep ${targetSet.weight} ${unit} and try to beat ${targetSet.reps} reps on ${setLabel}.`,
      suggestWeightIncrease: false,
    };
  }

  return {
    headline: lastTimeSummary,
    instruction: `Today: Match or add 1 rep across sets while maintaining ${currentEx.targetRir} RIR.`,
    suggestWeightIncrease: false,
  };
}

/**
 * Evaluates a single set against previous session's corresponding set & all-time PRs
 */
export function evaluateSetPerformance(
  set: LoggedSet,
  prevSet: LoggedSet | undefined,
  minReps: number,
  maxReps: number,
  historicalPR: ExercisePRSummary | undefined
): { tags: SetComparisonTag[]; isPR: boolean; prReasons: string[] } {
  const tags: SetComparisonTag[] = [];
  const prReasons: string[] = [];

  if (!set.completed || set.reps <= 0) {
    return { tags, isPR: false, prReasons };
  }

  const current1RM = calculateEstimated1RM(set.weight, set.reps);

  // Check PRs against historical data
  if (historicalPR && historicalPR.heaviestWeight > 0) {
    if (set.weight > historicalPR.heaviestWeight) {
      prReasons.push('Heaviest Weight');
    }
    if (current1RM > historicalPR.bestEstimated1RM) {
      prReasons.push('Est. 1RM PR');
    }
    const prevBestAtWeight = historicalPR.maxRepsByWeight[String(set.weight)];
    if (prevBestAtWeight && set.reps > prevBestAtWeight.reps) {
      prReasons.push(`Rep PR @ ${set.weight}`);
    }
  }

  const isPR = prReasons.length > 0;
  if (isPR) {
    tags.push({ label: 'PR', type: 'pr' });
  }

  // Compare with previous session's set
  if (prevSet && prevSet.completed) {
    if (set.weight > prevSet.weight) {
      tags.push({ label: `+${Math.round((set.weight - prevSet.weight) * 10) / 10} wt`, type: 'increased_weight' });
      if (set.reps >= prevSet.reps || current1RM > calculateEstimated1RM(prevSet.weight, prevSet.reps)) {
        tags.push({ label: 'Beat Prev', type: 'beat_previous' });
      }
    } else if (set.weight === prevSet.weight) {
      if (set.reps > prevSet.reps) {
        tags.push({ label: `+${set.reps - prevSet.reps} reps`, type: 'increased_reps' });
        tags.push({ label: 'Beat Prev', type: 'beat_previous' });
      } else if (set.reps === prevSet.reps) {
        tags.push({ label: 'Matched', type: 'matched' });
      } else {
        tags.push({ label: `${set.reps - prevSet.reps} reps`, type: 'decreased_reps' });
      }
    } else {
      // Lower weight
      if (set.reps > prevSet.reps) {
        tags.push({ label: `+${set.reps - prevSet.reps} reps`, type: 'increased_reps' });
      } else {
        tags.push({ label: 'Lower load', type: 'decreased_reps' });
      }
    }
  }

  if (set.reps >= maxReps) {
    tags.push({ label: 'Top of Range', type: 'top_of_range' });
  }

  return { tags, isPR, prReasons };
}

/**
 * Computes all-time PR summaries for every exercise up to (and optionally excluding) a session
 */
export function computeAllExercisePRs(
  sessions: WorkoutSessionRecord[],
  excludeSessionId?: string
): Record<string, ExercisePRSummary> {
  const prMap: Record<string, ExercisePRSummary> = {};

  // Sort oldest to newest
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  for (const session of sorted) {
    if (excludeSessionId && session.sessionId === excludeSessionId) continue;

    for (const ex of session.exercises) {
      if (ex.skipped) continue;
      const completedSets = ex.sets.filter((s) => s.completed && s.reps > 0);
      if (completedSets.length === 0) continue;

      if (!prMap[ex.exerciseId]) {
        prMap[ex.exerciseId] = {
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          heaviestWeight: 0,
          heaviestWeightReps: 0,
          heaviestWeightDate: session.date,
          bestEstimated1RM: 0,
          best1RMWeight: 0,
          best1RMReps: 0,
          best1RMDate: session.date,
          bestVolume: 0,
          bestVolumeDate: session.date,
          maxRepsByWeight: {},
        };
      }

      const summary = prMap[ex.exerciseId];
      const sessionExVolume = calculateExerciseVolume(ex);

      if (sessionExVolume > summary.bestVolume) {
        summary.bestVolume = sessionExVolume;
        summary.bestVolumeDate = session.date;
      }

      for (const s of completedSets) {
        if (
          s.weight > summary.heaviestWeight ||
          (s.weight === summary.heaviestWeight && s.reps > summary.heaviestWeightReps)
        ) {
          summary.heaviestWeight = s.weight;
          summary.heaviestWeightReps = s.reps;
          summary.heaviestWeightDate = session.date;
        }

        const est1RM = calculateEstimated1RM(s.weight, s.reps);
        if (est1RM > summary.bestEstimated1RM) {
          summary.bestEstimated1RM = est1RM;
          summary.best1RMWeight = s.weight;
          summary.best1RMReps = s.reps;
          summary.best1RMDate = session.date;
        }

        const wKey = String(s.weight);
        if (!summary.maxRepsByWeight[wKey] || s.reps > summary.maxRepsByWeight[wKey].reps) {
          summary.maxRepsByWeight[wKey] = { reps: s.reps, date: session.date };
        }
      }
    }
  }

  return prMap;
}

/**
 * Counts how many PRs were achieved in a given session compared to all sessions prior to it
 */
export function countSessionPRs(
  session: WorkoutSessionRecord,
  allSessions: WorkoutSessionRecord[]
): number {
  const priorSessions = allSessions.filter(
    (s) =>
      s.sessionId !== session.sessionId &&
      (s.date < session.date || (s.date === session.date && s.sessionNumber < session.sessionNumber))
  );
  if (priorSessions.length === 0) return 0;

  const priorPRs = computeAllExercisePRs(priorSessions);
  let prCount = 0;

  for (const ex of session.exercises) {
    if (ex.skipped) continue;
    const hist = priorPRs[ex.exerciseId];
    if (!hist) continue;

    let exHadPR = false;
    const vol = calculateExerciseVolume(ex);
    if (vol > hist.bestVolume && hist.bestVolume > 0) {
      exHadPR = true;
    }

    for (const s of ex.sets) {
      if (!s.completed || s.reps <= 0) continue;
      const evalRes = evaluateSetPerformance(s, undefined, ex.minReps, ex.maxReps, hist);
      if (evalRes.isPR) {
        exHadPR = true;
      }
    }

    if (exHadPR) prCount += 1;
  }

  return prCount;
}

/**
 * Calculates 7-day rolling bodyweight averages, weekly change, and total weight change since Day 1.
 */
export function calculateBodyweightAnalytics(
  metrics: BodyMetricRecord[],
  startingWeight: number
): {
  latestWeight: number;
  sevenDayAvg: number;
  previousSevenDayAvg: number;
  weeklyWeightChange: number;
  totalChangeFromStart: number;
  dailySeries: { date: string; dayNumber: number; weight: number; rolling7DayAvg: number }[];
  weeklyAverages: { weekNumber: number; avgWeight: number; change: number; entriesCount: number }[];
} {
  const validWeightLogs = [...metrics]
    .filter((m) => m.bodyweight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (validWeightLogs.length === 0) {
    return {
      latestWeight: startingWeight,
      sevenDayAvg: startingWeight,
      previousSevenDayAvg: startingWeight,
      weeklyWeightChange: 0,
      totalChangeFromStart: 0,
      dailySeries: [],
      weeklyAverages: [],
    };
  }

  const dailySeries = validWeightLogs.map((log, idx) => {
    const windowLogs = validWeightLogs.slice(Math.max(0, idx - 6), idx + 1);
    const avg =
      Math.round(
        (windowLogs.reduce((sum, item) => sum + item.bodyweight, 0) / windowLogs.length) * 100
      ) / 100;
    return {
      date: log.date,
      dayNumber: log.dayNumber,
      weight: log.bodyweight,
      rolling7DayAvg: avg,
    };
  });

  const latestWeight = validWeightLogs[validWeightLogs.length - 1].bodyweight;
  const last7 = validWeightLogs.slice(-7);
  const sevenDayAvg =
    Math.round((last7.reduce((s, m) => s + m.bodyweight, 0) / last7.length) * 100) / 100;

  const prev7 = validWeightLogs.slice(Math.max(0, validWeightLogs.length - 14), Math.max(0, validWeightLogs.length - 7));
  const previousSevenDayAvg =
    prev7.length > 0
      ? Math.round((prev7.reduce((s, m) => s + m.bodyweight, 0) / prev7.length) * 100) / 100
      : startingWeight;

  const weeklyWeightChange = Math.round((sevenDayAvg - previousSevenDayAvg) * 100) / 100;
  // Base total change on the 7-day rolling average vs Day 1 starting weight so single-day water fluctuations don't skew judgment
  const totalChangeFromStart = Math.round((sevenDayAvg - startingWeight) * 100) / 100;

  // Group by week of the 100-day challenge (Week 1 = Days 1-7, Week 2 = Days 8-14, etc.)
  const weekBuckets = new Map<number, number[]>();
  for (const log of validWeightLogs) {
    const wk = Math.max(1, Math.ceil(log.dayNumber / 7));
    if (!weekBuckets.has(wk)) weekBuckets.set(wk, []);
    weekBuckets.get(wk)!.push(log.bodyweight);
  }

  const sortedWeeks = Array.from(weekBuckets.keys()).sort((a, b) => a - b);
  const weeklyAverages: { weekNumber: number; avgWeight: number; change: number; entriesCount: number }[] = [];

  for (let i = 0; i < sortedWeeks.length; i++) {
    const wk = sortedWeeks[i];
    const vals = weekBuckets.get(wk)!;
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    const prevAvg = i === 0 ? startingWeight : weeklyAverages[i - 1].avgWeight;
    weeklyAverages.push({
      weekNumber: wk,
      avgWeight: avg,
      change: Math.round((avg - prevAvg) * 100) / 100,
      entriesCount: vals.length,
    });
  }

  return {
    latestWeight,
    sevenDayAvg,
    previousSevenDayAvg,
    weeklyWeightChange,
    totalChangeFromStart,
    dailySeries,
    weeklyAverages,
  };
}
