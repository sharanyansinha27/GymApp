import React, { useState, useMemo } from 'react';
import {
  UserProfileRecord,
  BodyMetricRecord,
  WorkoutSessionRecord,
} from '../types';
import {
  ALL_UNIQUE_EXERCISES,
  getDateForChallengeDay,
} from '../data/workoutSplit';
import {
  calculateBodyweightAnalytics,
  calculateEstimated1RM,
} from '../utils/progression';
import {
  Scale,
  Ruler,
  Camera,
  Moon,
  Footprints,
  Flame,
  Beef,
  TrendingUp,
  Check,
  Calendar,
} from 'lucide-react';

interface TransformationProgressViewProps {
  profile: UserProfileRecord;
  metrics: BodyMetricRecord[];
  workouts: WorkoutSessionRecord[];
  selectedDayNumber: number;
  onSelectDayNumber: (day: number) => void;
  onSaveMetric: (metric: BodyMetricRecord) => Promise<void>;
}

/**
 * Clean, responsive SVG Line Chart component with tabular tooltips and axis labels
 */
const SvgLineChart: React.FC<{
  title: string;
  subtitle: string;
  data: { label: string; primary: number; secondary?: number }[];
  primaryLabel: string;
  secondaryLabel?: string;
  unit: string;
  primaryColor?: string;
  secondaryColor?: string;
}> = ({
  title,
  subtitle,
  data,
  primaryLabel,
  secondaryLabel,
  unit,
  primaryColor = '#10B981',
  secondaryColor = '#F59E0B',
}) => {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
        <div className="h-44 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-xs text-slate-500">
          Log at least 1 entry to render chart progression.
        </div>
      </div>
    );
  }

  const allValues = data.flatMap((d) =>
    d.secondary !== undefined && d.secondary > 0
      ? [d.primary, d.secondary]
      : [d.primary]
  );
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = Math.max(1, (maxVal - minVal) * 0.15);
  const yMin = Math.max(0, Math.floor((minVal - padding) * 10) / 10);
  const yMax = Math.ceil((maxVal + padding) * 10) / 10;
  const range = Math.max(1, yMax - yMin);

  const width = 600;
  const height = 190;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    data.length === 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (data.length - 1)) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - yMin) / range) * plotH;

  const primaryPoints = data.map((d, i) => `${getX(i)},${getY(d.primary)}`).join(' ');
  const secondaryPoints = data
    .filter((d) => d.secondary !== undefined && d.secondary > 0)
    .map((d, i) => `${getX(i)},${getY(d.secondary!)}`)
    .join(' ');

  const latest = data[data.length - 1];

  return (
    <div className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="text-right text-xs font-mono tabular-nums">
          <span className="text-slate-400">{primaryLabel}: </span>
          <strong className="text-white">
            {latest.primary} {unit}
          </strong>
          {secondaryLabel && latest.secondary !== undefined && (
            <>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-slate-400">{secondaryLabel}: </span>
              <strong className="text-amber-400">
                {latest.secondary} {unit}
              </strong>
            </>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48 overflow-visible"
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((t) => {
          const val = Math.round((yMin + t * range) * 10) / 10;
          const y = getY(val);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#1E293B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Primary Polyline */}
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPoints}
          />
        )}

        {/* Secondary Polyline */}
        {secondaryPoints && data.length > 1 && (
          <polyline
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={secondaryPoints}
          />
        )}

        {/* Data Points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={getX(i)}
              cy={getY(d.primary)}
              r={3.5}
              fill={primaryColor}
            />
            {d.secondary !== undefined && d.secondary > 0 && (
              <circle
                cx={getX(i)}
                cy={getY(d.secondary)}
                r={3}
                fill={secondaryColor}
              />
            )}
            {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
              <text
                x={getX(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export const TransformationProgressView: React.FC<
  TransformationProgressViewProps
> = ({
  profile,
  metrics,
  workouts,
  selectedDayNumber,
  onSelectDayNumber,
  onSaveMetric,
}) => {
  const selectedDate = getDateForChallengeDay(
    profile.startDate,
    selectedDayNumber
  );
  const existingLog = metrics.find(
    (m) => m.dayNumber === selectedDayNumber || m.date === selectedDate
  );

  const [bodyweight, setBodyweight] = useState<string>(
    existingLog?.bodyweight ? String(existingLog.bodyweight) : ''
  );
  const [waist, setWaist] = useState<string>(
    existingLog?.waist ? String(existingLog.waist) : ''
  );
  const [chest, setChest] = useState<string>(
    existingLog?.chest ? String(existingLog.chest) : ''
  );
  const [arm, setArm] = useState<string>(
    existingLog?.arm ? String(existingLog.arm) : ''
  );
  const [thigh, setThigh] = useState<string>(
    existingLog?.thigh ? String(existingLog.thigh) : ''
  );
  const [sleepHours, setSleepHours] = useState<string>(
    existingLog?.sleepHours ? String(existingLog.sleepHours) : ''
  );
  const [steps, setSteps] = useState<string>(
    existingLog?.steps ? String(existingLog.steps) : ''
  );
  const [calories, setCalories] = useState<string>(
    existingLog?.calories ? String(existingLog.calories) : ''
  );
  const [protein, setProtein] = useState<string>(
    existingLog?.protein ? String(existingLog.protein) : ''
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(
    existingLog?.photoDataUrl || ''
  );
  const [notes, setNotes] = useState<string>(existingLog?.notes || '');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [selectedLiftId, setSelectedLiftId] = useState<string>(
    ALL_UNIQUE_EXERCISES[0]?.exerciseId || 'incline_dumbbell_press'
  );
  const [selectedMeasurementKey, setSelectedMeasurementKey] = useState<
    'waist' | 'chest' | 'arm' | 'thigh'
  >('waist');

  // Sync form state when user changes selected day
  React.useEffect(() => {
    const found = metrics.find(
      (m) => m.dayNumber === selectedDayNumber || m.date === selectedDate
    );
    setBodyweight(found?.bodyweight ? String(found.bodyweight) : '');
    setWaist(found?.waist ? String(found.waist) : '');
    setChest(found?.chest ? String(found.chest) : '');
    setArm(found?.arm ? String(found.arm) : '');
    setThigh(found?.thigh ? String(found.thigh) : '');
    setSleepHours(found?.sleepHours ? String(found.sleepHours) : '');
    setSteps(found?.steps ? String(found.steps) : '');
    setCalories(found?.calories ? String(found.calories) : '');
    setProtein(found?.protein ? String(found.protein) : '');
    setPhotoDataUrl(found?.photoDataUrl || '');
    setNotes(found?.notes || '');
  }, [selectedDayNumber, selectedDate, metrics]);

  const bwAnalytics = useMemo(
    () => calculateBodyweightAnalytics(metrics, profile.startingWeight),
    [metrics, profile.startingWeight]
  );

  // Compress uploaded progress photo onto a small canvas so it fits comfortably in Firestore (<200KB)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 540;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          if (compressed.length <= 340000) {
            setPhotoDataUrl(compressed);
          }
        }
      };
      if (typeof ev.target?.result === 'string') {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const record: BodyMetricRecord = {
        uid: profile.uid,
        logId: selectedDate,
        dayNumber: selectedDayNumber,
        date: selectedDate,
        bodyweight: Math.min(350, Math.max(0, parseFloat(bodyweight) || 0)),
        waist: Math.min(300, Math.max(0, parseFloat(waist) || 0)),
        chest: Math.min(300, Math.max(0, parseFloat(chest) || 0)),
        arm: Math.min(150, Math.max(0, parseFloat(arm) || 0)),
        thigh: Math.min(200, Math.max(0, parseFloat(thigh) || 0)),
        sleepHours: Math.min(24, Math.max(0, parseFloat(sleepHours) || 0)),
        steps: Math.min(200000, Math.max(0, parseInt(steps, 10) || 0)),
        calories: Math.min(30000, Math.max(0, parseInt(calories, 10) || 0)),
        protein: Math.min(1000, Math.max(0, parseInt(protein, 10) || 0)),
        photoDataUrl: photoDataUrl.slice(0, 350000),
        notes: notes.slice(0, 500),
      };
      await onSaveMetric(record);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // Chart 1: Bodyweight over the 100 days (Daily vs 7-Day Rolling Average)
  const bwChartData = bwAnalytics.dailySeries.map((d) => ({
    label: `D${d.dayNumber}`,
    primary: d.weight,
    secondary: d.rolling7DayAvg,
  }));

  // Chart 2: Weekly average bodyweight
  const weeklyBwChartData = bwAnalytics.weeklyAverages.map((w) => ({
    label: `Wk ${w.weekNumber}`,
    primary: w.avgWeight,
  }));

  const allSelectableExercises = useMemo(() => {
    const map = new Map<string, { exerciseId: string; name: string; muscleGroup: string }>();
    for (const ex of ALL_UNIQUE_EXERCISES) {
      map.set(ex.exerciseId, ex);
    }
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.exerciseId && ex.name && !map.has(ex.exerciseId)) {
          map.set(ex.exerciseId, {
            exerciseId: ex.exerciseId,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [workouts]);
  const strengthChartData = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
    const points: { label: string; primary: number; secondary: number }[] = [];
    for (const s of sorted) {
      const ex = s.exercises.find(
        (e) =>
          e.exerciseId === selectedLiftId &&
          !e.skipped &&
          e.sets.some((st) => st.completed && st.reps > 0)
      );
      if (!ex) continue;
      const done = ex.sets.filter((st) => st.completed && st.reps > 0);
      const topWeight = Math.max(...done.map((st) => st.weight));
      const best1RM = Math.max(
        ...done.map((st) => calculateEstimated1RM(st.weight, st.reps))
      );
      points.push({
        label: `D${s.dayNumber}`,
        primary: topWeight,
        secondary: best1RM,
      });
    }
    return points;
  }, [workouts, selectedLiftId]);

  // Chart 4: Training volume over time
  const volumeChartData = useMemo(() => {
    return [...workouts]
      .filter((w) => w.totalVolume > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((w) => ({
        label: `D${w.dayNumber}`,
        primary: Math.round(w.totalVolume),
      }));
  }, [workouts]);

  // Chart 5: Measurements over time
  const measurementChartData = useMemo(() => {
    return [...metrics]
      .filter((m) => m[selectedMeasurementKey] > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        label: `D${m.dayNumber}`,
        primary: m[selectedMeasurementKey],
      }));
  }, [metrics, selectedMeasurementKey]);

  const photosGallery = useMemo(() => {
    return [...metrics]
      .filter((m) => m.photoDataUrl && m.photoDataUrl.startsWith('data:image'))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [metrics]);

  return (
    <div className="space-y-6 pb-24">
      {/* Bodyweight Summary Header (7-Day Average Focus) */}
      <section className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs text-emerald-400 font-mono tabular-nums font-semibold mb-1">
              100-DAY PHYSIQUE & BIOMETRIC ANALYTICS
            </div>
            <h1 className="text-2xl font-bold text-white">
              Bodyweight, Measurements & Recovery
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Progress is judged strictly on 7-day rolling averages and weekly trends—never a single day’s weigh-in.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Select Day:</label>
            <select
              value={selectedDayNumber}
              onChange={(e) => onSelectDayNumber(parseInt(e.target.value, 10))}
              className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono tabular-nums text-white"
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d} ({getDateForChallengeDay(profile.startDate, d)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Day 1 Starting Weight</div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
              {profile.startingWeight} {profile.weightUnit}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">7-Day Rolling Average</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
              {bwAnalytics.sevenDayAvg} {profile.weightUnit}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Weekly Avg Change</div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
              {bwAnalytics.weeklyWeightChange > 0 ? '+' : ''}
              {bwAnalytics.weeklyWeightChange} {profile.weightUnit}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Total Change Since Day 1</div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
              {bwAnalytics.totalChangeFromStart > 0 ? '+' : ''}
              {bwAnalytics.totalChangeFromStart} {profile.weightUnit}
            </div>
          </div>
        </div>
      </section>

      {/* Daily Transformation Logger Form */}
      <section className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Log Day {selectedDayNumber} Biometrics & Nutrition
            </h2>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              Date: {selectedDate}
            </p>
          </div>
          {savedNotice && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved for Day {selectedDayNumber}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bodyweight ({profile.weightUnit})</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 81.4"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-slate-400" />
                <span>Waist (cm)</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 79.5"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Chest (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 108.0"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Arm (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 40.5"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Thigh (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 61.0"
                value={thigh}
                onChange={(e) => setThigh(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sleep (hours)</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 7.8"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                <span>Daily Steps</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 10500"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Calories (kcal)</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 2650"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Beef className="w-3.5 h-3.5 text-rose-400" />
                <span>Protein (g)</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 195"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Progress Photo (Day {selectedDayNumber})</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Daily Physique / Recovery Note
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="Visual fullness, soreness, digestion..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>
                {saving
                  ? 'Saving Entry...'
                  : `Save Day ${selectedDayNumber} Check-In`}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* 5 Required Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Bodyweight over the 100 days */}
        <SvgLineChart
          title="1. Bodyweight Over the 100 Days"
          subtitle="Daily weigh-ins (solid green) vs 7-day rolling average (dashed amber)"
          data={bwChartData}
          primaryLabel="Daily"
          secondaryLabel="7d Avg"
          unit={profile.weightUnit}
        />

        {/* Chart 2: Weekly Average Bodyweight */}
        <SvgLineChart
          title="2. Weekly Average Bodyweight"
          subtitle="True week-to-week mass trend across Weeks 1–15"
          data={weeklyBwChartData}
          primaryLabel="Weekly Avg"
          unit={profile.weightUnit}
          primaryColor="#38BDF8"
        />
      </div>

      {/* Chart 3: Strength Progression for Each Major Exercise */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#111827] border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              Select Exercise for Strength Curve:
            </span>
          </div>
          <select
            value={selectedLiftId}
            onChange={(e) => setSelectedLiftId(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-medium"
          >
            {allSelectableExercises.map((ex) => (
              <option key={ex.exerciseId} value={ex.exerciseId}>
                {ex.name} ({ex.muscleGroup})
              </option>
            ))}
          </select>
        </div>

        <SvgLineChart
          title={`3. Strength Progression — ${
            allSelectableExercises.find((e) => e.exerciseId === selectedLiftId)
              ?.name || ''
          }`}
          subtitle="Top working set weight (solid green) & Estimated 1RM (dashed amber)"
          data={strengthChartData}
          primaryLabel="Top Set Weight"
          secondaryLabel="Est. 1RM"
          unit={profile.weightUnit}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 4: Training Volume Over Time */}
        <SvgLineChart
          title="4. Training Volume Over Time"
          subtitle="Total tonnage lifted per workout session"
          data={volumeChartData}
          primaryLabel="Session Tonnage"
          unit={profile.weightUnit}
          primaryColor="#A855F7"
        />

        {/* Chart 5: Measurements Over Time */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#111827] border border-slate-800/80 rounded-2xl px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-300">
              Measurement Site:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg">
              {(['waist', 'chest', 'arm', 'thigh'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMeasurementKey(key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors cursor-pointer ${
                    selectedMeasurementKey === key
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <SvgLineChart
            title={`5. ${
              selectedMeasurementKey.charAt(0).toUpperCase() +
              selectedMeasurementKey.slice(1)
            } Measurement Over Time`}
            subtitle="Tape circumference progression in centimeters"
            data={measurementChartData}
            primaryLabel={selectedMeasurementKey.toUpperCase()}
            unit="cm"
            primaryColor="#F43F5E"
          />
        </div>
      </div>

      {/* Progress Photos Timeline */}
      {photosGallery.length > 0 && (
        <section className="rounded-2xl bg-[#111827] border border-slate-800/80 p-5">
          <h3 className="text-base font-bold text-white mb-1">
            100-Day Visual Check-In Gallery
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Compare Day 1 vs current physique check-ins
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photosGallery.map((m) => (
              <div
                key={m.logId}
                className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800"
              >
                <img
                  src={m.photoDataUrl}
                  alt={`Day ${m.dayNumber} check-in`}
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover"
                />
                <div className="p-2.5 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="font-bold text-white">Day {m.dayNumber}</span>
                  <span className="text-emerald-400">
                    {m.bodyweight > 0 ? `${m.bodyweight} ${profile.weightUnit}` : m.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
