import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  getChallengeDayFromDate,
  getDateForChallengeDay,
  getSplitForDate,
  WEEKLY_SPLIT,
} from './src/data/workoutSplit';

const STORAGE_KEY = 'iron100.native.v1';
const C = {
  bg: '#0B0E0D',
  panel: '#121714',
  panel2: '#171E19',
  border: '#273129',
  text: '#F4F5F2',
  muted: '#929A91',
  green: '#C5F36A',
  greenDark: '#1B2A16',
  orange: '#F1A875',
  red: '#F08076',
};

type SetEntry = {
  weight: string;
  reps: string;
  rir: number;
  failure: boolean;
  restSeconds: number;
  completed: boolean;
};
type ExerciseEntry = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  restSeconds: number;
  isMajorLift: boolean;
  skipped: boolean;
  notes: string;
  sets: SetEntry[];
};
type Workout = {
  date: string;
  dayNumber: number;
  sessionNumber: number;
  splitId: string;
  splitName: string;
  completed: boolean;
  exercises: ExerciseEntry[];
};
type Metrics = {
  date: string;
  bodyweight: string;
  waist: string;
  chest: string;
  arm: string;
  thigh: string;
  sleep: string;
  steps: string;
  calories: string;
  protein: string;
  photoUri: string;
};
type Store = {
  startDate: string;
  startingWeight: string;
  weightUnit: 'kg' | 'lbs';
  workouts: Workout[];
  metrics: Metrics[];
};
type Tab = 'Today' | 'Train' | 'Progress' | 'History';

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const emptyMetrics = (date: string): Metrics => ({
  date, bodyweight: '', waist: '', chest: '', arm: '', thigh: '',
  sleep: '', steps: '', calories: '', protein: '', photoUri: '',
});
const challengeDay = (store: Store, date: string) =>
  getChallengeDayFromDate(store.startDate, date);
const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
const formatRest = (seconds: number) =>
  seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} sec`;
const number = (value: string | number | undefined) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};
const volumeForWorkout = (workout: Workout) => workout.exercises.reduce(
  (total, exercise) => total + (exercise.skipped ? 0 : exercise.sets.reduce(
    (sum, set) => sum + (set.completed ? number(set.weight) * number(set.reps) : 0), 0,
  )), 0,
);
const averageLastSevenDays = (metrics: Metrics[], date: string) => {
  const from = new Date(`${date}T12:00:00`);
  from.setDate(from.getDate() - 6);
  const weights = metrics.filter((metric) => number(metric.bodyweight) > 0
    && new Date(`${metric.date}T12:00:00`) >= from
    && metric.date <= date).map((metric) => number(metric.bodyweight));
  return weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : 0;
};
const exercisePerformance = (exercise: ExerciseEntry) =>
  exercise.sets.filter((set) => set.completed)
    .map((set) => `${set.weight || '—'} × ${set.reps || '—'}`)
    .join('  ·  ') || 'No completed sets';
const countNewPRs = (workouts: Workout[]) => {
  const bests: Record<string, { weight: number; e1rm: number; volume: number; reps: Record<string, number> }> = {};
  let count = 0;
  [...workouts].filter((workout) => workout.completed).sort((a, b) => a.date.localeCompare(b.date))
    .forEach((workout) => workout.exercises.forEach((exercise) => {
      if (exercise.skipped) return;
      const best = bests[exercise.exerciseId];
      const sets = exercise.sets.filter((set) => set.completed && number(set.weight) > 0 && number(set.reps) > 0);
      const volume = sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0);
      if (best && (sets.some((set) =>
        number(set.weight) > best.weight
        || number(set.weight) * (1 + number(set.reps) / 30) > best.e1rm
        || number(set.reps) > (best.reps[String(number(set.weight))] ?? 0),
      ) || volume > best.volume)) count += 1;
      const next = best ?? { weight: 0, e1rm: 0, volume: 0, reps: {} };
      sets.forEach((set) => {
        const weight = number(set.weight);
        const reps = number(set.reps);
        next.weight = Math.max(next.weight, weight);
        next.e1rm = Math.max(next.e1rm, weight * (1 + reps / 30));
        next.reps[String(weight)] = Math.max(next.reps[String(weight)] ?? 0, reps);
      });
      next.volume = Math.max(next.volume, volume);
      bests[exercise.exerciseId] = next;
    }));
  return count;
};

function makeWorkout(store: Store, date: string): Workout {
  const split = getSplitForDate(date);
  const previousWorkouts = [...store.workouts]
    .filter((workout) => workout.date < date && workout.completed)
    .sort((a, b) => b.date.localeCompare(a.date));
  const exercises = split.exercises.map((prescribed) => {
    const previous = previousWorkouts
      .flatMap((workout) => workout.exercises)
      .find((exercise) => exercise.exerciseId === prescribed.exerciseId && !exercise.skipped);
    const sets: SetEntry[] = Array.from({ length: prescribed.targetSets }, (_, index) => {
      const prior = previous?.sets[index] ?? previous?.sets[previous.sets.length - 1];
      return {
        weight: prior?.weight ?? '',
        reps: prior?.reps ?? '',
        rir: prescribed.targetRir,
        failure: false,
        restSeconds: prescribed.restSeconds,
        completed: false,
      };
    });
    return {
      exerciseId: prescribed.exerciseId,
      name: prescribed.name,
      muscleGroup: prescribed.muscleGroup,
      targetSets: prescribed.targetSets,
      minReps: prescribed.minReps,
      maxReps: prescribed.maxReps,
      targetRir: prescribed.targetRir,
      restSeconds: prescribed.restSeconds,
      isMajorLift: Boolean(prescribed.isMajorLift),
      skipped: false,
      notes: '',
      sets,
    };
  });
  return {
    date,
    dayNumber: challengeDay(store, date),
    sessionNumber: store.workouts.length + 1,
    splitId: split.splitId,
    splitName: split.title,
    completed: false,
    exercises,
  };
}

function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
function Button({
  title, onPress, secondary = false, disabled = false, style,
}: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.button, secondary && s.buttonSecondary, disabled && s.disabled, style]}
    >
      <Text style={[s.buttonText, secondary && s.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}
function Field({
  label, value, onChangeText, placeholder = '0', suffix, keyboardType = 'decimal-pad', onEndEditing,
}: {
  label: string; value: string; onChangeText: (value: string) => void;
  placeholder?: string; suffix?: string; keyboardType?: 'decimal-pad' | 'number-pad' | 'default';
  onEndEditing?: () => void;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputShell}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#687169"
          selectTextOnFocus
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}
function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {aside ? <Text style={s.sectionAside}>{aside}</Text> : null}
    </View>
  );
}
function Metric({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}<Text style={s.metricSuffix}>{suffix}</Text></Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}
function MiniChart({
  values, color = C.green, suffix = '',
}: { values: number[]; color?: string; suffix?: string }) {
  const width = 304;
  const height = 116;
  const valid = values.map((value) => (Number.isFinite(value) ? value : 0));
  if (valid.length < 2 || valid.every((value) => value === 0)) {
    return (
      <View style={s.chartEmpty}>
        <Text style={s.muted}>Log a few days to see your trend{suffix ? ` (${suffix})` : ''}.</Text>
      </View>
    );
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const points = valid.map((value, index) => ({
    x: 8 + index * (width - 16) / Math.max(1, valid.length - 1),
    y: height - 14 - ((value - min) / range) * (height - 28),
  }));
  const d = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return (
    <View style={s.chartBox}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1="8" y1="18" x2={width - 8} y2="18" stroke={C.border} strokeWidth="1" />
        <Line x1="8" y1={height / 2} x2={width - 8} y2={height / 2} stroke={C.border} strokeWidth="1" />
        <Line x1="8" y1={height - 14} x2={width - 8} y2={height - 14} stroke={C.border} strokeWidth="1" />
        <Path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r="3.5" fill={color} />
        ))}
      </Svg>
      <View style={s.chartValues}>
        <Text style={s.chartCaption}>{min.toFixed(1)}{suffix}</Text>
        <Text style={s.chartCaption}>{max.toFixed(1)}{suffix}</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [store, setStore] = useState<Store | null>(null);
  const storeRef = useRef<Store | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [startDateDraft, setStartDateDraft] = useState(todayISO());
  const [tab, setTab] = useState<Tab>('Today');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [restTimer, setRestTimer] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [expandedHistory, setExpandedHistory] = useState('');
  const [metricDraft, setMetricDraft] = useState<Metrics | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active) return;
      const saved = raw ? JSON.parse(raw) as Store : null;
      const loaded: Store = saved && Array.isArray(saved.workouts) && Array.isArray(saved.metrics)
        ? saved
        : {
          startDate: todayISO(), startingWeight: '', weightUnit: 'kg',
          workouts: [], metrics: [],
        };
      storeRef.current = loaded;
      setStore(loaded);
      setStartDateDraft(loaded.startDate);
      setMetricDraft(loaded.metrics.find((metric) => metric.date === todayISO()) ?? emptyMetrics(todayISO()));
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(`Your saved training data could not be loaded: ${message}`);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (restTimer <= 0) return;
    const timer = setTimeout(() => setRestTimer((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [restTimer]);

  const commit = (next: Store) => {
    storeRef.current = next;
    setStore(next);
    setSaveError('');
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setSaveError(`Changes could not be saved on this device: ${message}`);
      });
  };

  const selectedDay = useMemo(
    () => store ? challengeDay(store, selectedDate) : 1,
    [store, selectedDate],
  );
  const activeWorkout = useMemo(() => {
    if (!store) return null;
    return store.workouts.find((workout) => workout.date === selectedDate)
      ?? makeWorkout(store, selectedDate);
  }, [store, selectedDate]);
  const todayDay = store ? challengeDay(store, todayISO()) : 1;
  const historicalWorkouts = store ? [...store.workouts].sort((a, b) => b.date.localeCompare(a.date)) : [];
  const completedWorkouts = historicalWorkouts.filter((workout) =>
    workout.completed && workout.splitId !== 'rest',
  );
  const totalVolume = historicalWorkouts.reduce((sum, workout) => sum + volumeForWorkout(workout), 0);
  const latestMetric = store?.metrics
    .filter((metric) => number(metric.bodyweight) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const startingWeight = number(store?.startingWeight)
    || number(store?.metrics.find((metric) => metric.date === store.startDate)?.bodyweight)
    || number([...(store?.metrics ?? [])].sort((a, b) => a.date.localeCompare(b.date))[0]?.bodyweight);
  const currentWeight = number(latestMetric?.bodyweight);
  const weightChange = currentWeight && startingWeight ? currentWeight - startingWeight : 0;
  const metricDays = store ? [...store.metrics].filter((metric) => number(metric.bodyweight) > 0)
    .sort((a, b) => a.date.localeCompare(b.date)) : [];
  const weeklyAverages = useMemo(() => {
    const buckets = new Map<string, number[]>();
    metricDays.forEach((metric) => {
      const day = Math.floor((new Date(`${metric.date}T12:00:00`).getTime()
        - new Date(`${store?.startDate ?? todayISO()}T12:00:00`).getTime()) / 604800000);
      const key = `Week ${Math.max(1, day + 1)}`;
      buckets.set(key, [...(buckets.get(key) ?? []), number(metric.bodyweight)]);
    });
    return [...buckets.values()].map((values) => values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [metricDays, store?.startDate]);
  const dayVolume = historicalWorkouts.slice().reverse().map(volumeForWorkout);
  const allPRs: Record<string, { weight: number; e1rm: number; repsByWeight: Record<string, number>; volume: number }> = {};
  (store?.workouts ?? []).filter((workout) => workout.completed).forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (exercise.skipped) return;
      const pr = allPRs[exercise.exerciseId] ?? { weight: 0, e1rm: 0, repsByWeight: {}, volume: 0 };
      exercise.sets.filter((set) => set.completed).forEach((set) => {
        const weight = number(set.weight);
        const reps = number(set.reps);
        pr.weight = Math.max(pr.weight, weight);
        pr.e1rm = Math.max(pr.e1rm, weight * (1 + reps / 30));
        pr.repsByWeight[String(weight)] = Math.max(pr.repsByWeight[String(weight)] ?? 0, reps);
      });
      pr.volume = Math.max(pr.volume, exercise.sets.reduce(
        (sum, set) => sum + (set.completed ? number(set.weight) * number(set.reps) : 0), 0,
      ));
      allPRs[exercise.exerciseId] = pr;
    });
  });
  const personalRecordCount = countNewPRs(store?.workouts ?? []);

  const updateWorkout = (update: (workout: Workout) => Workout) => {
    const current = storeRef.current;
    if (!current || !activeWorkout) return;
    const existing = current.workouts.find((workout) => workout.date === selectedDate);
    if (existing?.completed) {
      Alert.alert('Workout completed', 'Completed sessions stay locked in your history.');
      return;
    }
    const base = existing ?? activeWorkout;
    const updated = update(base);
    const workouts = existing
      ? current.workouts.map((workout) => workout.date === selectedDate ? updated : workout)
      : [...current.workouts, updated];
    commit({ ...current, workouts });
  };
  const updateExercise = (exerciseId: string, update: (exercise: ExerciseEntry) => ExerciseEntry) =>
    updateWorkout((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise) =>
        exercise.exerciseId === exerciseId ? update(exercise) : exercise,
      ),
    }));
  const updateMetric = (key: keyof Metrics, value: string) => {
    if (!store || !metricDraft) return;
    const nextDraft = { ...metricDraft, [key]: value };
    setMetricDraft(nextDraft);
    const metrics = store.metrics.some((metric) => metric.date === todayISO())
      ? store.metrics.map((metric) => metric.date === todayISO() ? nextDraft : metric)
      : [...store.metrics, nextDraft];
    commit({ ...store, metrics });
  };
  const changeDay = (day: number) => {
    if (!store) return;
    const safeDay = Math.max(1, Math.min(100, day));
    setSelectedDate(getDateForChallengeDay(store.startDate, safeDay));
  };
  const toggleSet = (exerciseId: string, index: number) => {
    let completed = false;
    const exercise = activeWorkout?.exercises.find((item) => item.exerciseId === exerciseId);
    const set = exercise?.sets[index];
    if (!set) return;
    completed = !set.completed;
    updateExercise(exerciseId, (item) => ({
      ...item,
      sets: item.sets.map((entry, setIndex) =>
        setIndex === index ? { ...entry, completed, restSeconds: entry.restSeconds || item.restSeconds } : entry,
      ),
    }));
    if (completed) setRestTimer(set.restSeconds || exercise!.restSeconds);
  };

  if (!store) {
    return (
      <View style={s.loading}>
        <StatusBar barStyle="light-content" />
        {loadError
          ? <><Text style={s.errorText}>{loadError}</Text><Button title="Try again" onPress={() => {
            setLoadError('');
            AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
              const loaded = raw ? JSON.parse(raw) as Store : {
                startDate: todayISO(), startingWeight: '', weightUnit: 'kg' as const, workouts: [], metrics: [],
              };
              storeRef.current = loaded;
              setStore(loaded);
              setStartDateDraft(loaded.startDate);
              setMetricDraft(loaded.metrics.find((metric) => metric.date === todayISO()) ?? emptyMetrics(todayISO()));
            }).catch((error: unknown) => setLoadError(String(error)));
          }} /></>
          : <ActivityIndicator color={C.green} size="large" />}
      </View>
    );
  }

  const previousExerciseRecord = (exerciseId: string) => {
    for (const workout of [...store.workouts]
      .filter((item) => item.date < selectedDate && item.completed)
      .sort((a, b) => b.date.localeCompare(a.date))) {
      const exercise = workout.exercises.find((item) => item.exerciseId === exerciseId
        && !item.skipped && item.sets.some((set) => set.completed));
      if (exercise) return { workout, exercise };
    }
    return null;
  };
  const renderWorkout = () => {
    if (!activeWorkout) return null;
    const savedSession = store.workouts.find((workout) => workout.date === selectedDate);
    const isLocked = Boolean(savedSession?.completed);
    const exercises = activeWorkout.exercises;
    const restText = `${Math.floor(restTimer / 60)}:${String(restTimer % 60).padStart(2, '0')}`;
    return (
      <>
        <View style={s.pageHeading}>
          <Text style={s.eyebrow}>DAY {selectedDay} / 100  ·  SESSION {activeWorkout.sessionNumber}</Text>
          <Text style={s.pageTitle}>{activeWorkout.splitName.replace(' — ', '\n')}</Text>
          <Text style={s.muted}>{formatDate(selectedDate)}  ·  {activeWorkout.exercises.length} exercises</Text>
        </View>
        <Card style={s.dayCard}>
          <View style={s.sectionRow}>
            <Label>CHALLENGE DAY</Label>
            <Text style={s.dayDisplay}>{selectedDay}<Text style={s.dayOf}> / 100</Text></Text>
          </View>
          <View style={s.progressTrack}><View style={[s.progressFill, { width: `${selectedDay}%` }]} /></View>
          <View style={s.dayControls}>
            <Pressable onPress={() => changeDay(selectedDay - 1)} style={s.dayArrow}><Text style={s.arrowText}>‹</Text></Pressable>
            <Text style={s.muted}>{selectedDay === todayDay ? 'Today’s session' : formatDate(selectedDate)}</Text>
            <Pressable onPress={() => changeDay(selectedDay + 1)} style={s.dayArrow}><Text style={s.arrowText}>›</Text></Pressable>
          </View>
        </Card>
        {isLocked ? (
          <Card style={s.lockedCard}>
            <Text style={s.greenText}>✓  SESSION SAVED · READ ONLY</Text>
            <Text style={s.muted}>Completed training is preserved in History.</Text>
          </Card>
        ) : null}
        {activeWorkout.splitId === 'rest' ? (
          <Card>
            <Text style={s.exerciseName}>Rest & recover</Text>
            <Text style={s.muted}>A rest day is part of the plan. Log today's bodyweight and recovery in Progress.</Text>
          </Card>
        ) : exercises.map((exercise, exerciseIndex) => {
          const priorRecord = previousExerciseRecord(exercise.exerciseId);
          const prior = priorRecord?.exercise;
          const priorSets = prior?.sets.filter((set) => set.completed) ?? [];
          const hitAllTop = exercise.sets.length >= exercise.targetSets
            && exercise.sets.slice(0, exercise.targetSets).every((set) =>
              set.completed && number(set.reps) >= exercise.maxReps && set.rir >= exercise.targetRir,
            );
          const pastVolumes = store.workouts
            .filter((workout) => workout.completed && workout.date !== selectedDate)
            .flatMap((workout) => workout.exercises)
            .filter((item) => item.exerciseId === exercise.exerciseId && !item.skipped)
            .map((item) => item.sets.reduce(
              (sum, set) => sum + (set.completed ? number(set.weight) * number(set.reps) : 0), 0,
            ));
          const currentVolume = exercise.sets.reduce(
            (sum, set) => sum + (set.completed ? number(set.weight) * number(set.reps) : 0), 0,
          );
          const volumePR = pastVolumes.length > 0 && currentVolume > Math.max(...pastVolumes);
          const firstUnderTop = priorSets.find((set) => number(set.reps) < exercise.maxReps);
          const instruction = hitAllTop
            ? `All sets hit ${exercise.maxReps} reps at target RIR. Increase the load next time.`
            : firstUnderTop
              ? `Try to beat ${firstUnderTop.reps} reps on ${priorSets.length === exercise.targetSets ? 'the final set' : `set ${priorSets.indexOf(firstUnderTop) + 1}`} today.`
              : priorSets.length
                ? `Match or add a rep while keeping ${exercise.targetRir} RIR.`
                : `Find a working weight for ${exercise.minReps}–${exercise.maxReps} reps.`;
          return (
            <Card key={`${selectedDate}-${exercise.exerciseId}-${exerciseIndex}`} style={s.exerciseCard}>
              <View style={s.exerciseHead}>
                <View style={s.flex}>
                  <Text style={s.exerciseName}>{exercise.name}</Text>
                  <Text style={s.muted}>{exercise.muscleGroup}</Text>
                </View>
                <Pressable
                  disabled={isLocked}
                  onPress={() => updateExercise(exercise.exerciseId, (item) => ({ ...item, skipped: !item.skipped }))}
                  style={s.smallAction}
                >
                  <Text style={s.smallActionText}>{exercise.skipped ? 'Undo' : 'Skip'}</Text>
                </Pressable>
              </View>
              <View style={s.prescription}>
                <Text style={s.greenText}>TARGET  {exercise.targetSets} × {exercise.minReps}–{exercise.maxReps}</Text>
                <Text style={s.prescriptionText}>{exercise.targetRir} RIR  ·  {formatRest(exercise.restSeconds)} rest</Text>
              </View>
              {volumePR ? <Text style={s.prBadge}>★ EXERCISE VOLUME PR</Text> : null}
              {allPRs[exercise.exerciseId] ? (
                <Text style={s.recordLine}>
                  BEST  {allPRs[exercise.exerciseId].weight} {store.weightUnit} ·
                  {' '}{allPRs[exercise.exerciseId].e1rm.toFixed(1)} est. 1RM ·
                  {' '}{Math.round(allPRs[exercise.exerciseId].volume).toLocaleString()} best volume
                </Text>
              ) : null}
              {priorSets.length ? (
                <View style={s.previousBox}>
                  <Text style={s.previousTitle}>PREVIOUS  ·  {formatDate(priorRecord!.workout.date)}</Text>
                  <Text style={s.previousCopy}>
                    {priorSets.map((set, index) =>
                      `Set ${index + 1}: ${set.weight || '—'} ${store.weightUnit} × ${set.reps || '—'} — ${set.rir} RIR`,
                    ).join('\n')}
                  </Text>
                </View>
              ) : null}
              <View style={s.coachBox}>
                <Text style={s.coachTitle}>{hitAllTop ? '↑ LOAD UP' : 'TODAY’S TARGET'}</Text>
                <Text style={s.coachCopy}>
                  {priorSets.length
                    ? `Last time: ${priorSets[0].weight || '—'} ${store.weightUnit} × ${priorSets.map((set) => set.reps).join(', ')}.\n${instruction}`
                    : instruction}
                </Text>
              </View>
              {!exercise.skipped && exercise.sets.map((set, setIndex) => {
                const priorSet = priorSets[setIndex];
                const old = store.workouts.filter((workout) => workout.completed && workout.date !== selectedDate)
                  .flatMap((workout) => workout.exercises)
                  .filter((item) => item.exerciseId === exercise.exerciseId && !item.skipped)
                  .flatMap((item) => item.sets).filter((item) => item.completed);
                const isPr = set.completed && old.length > 0 && number(set.weight) > 0 && number(set.reps) > 0 && (
                  number(set.weight) > Math.max(0, ...old.map((item) => number(item.weight)))
                  || number(set.weight) * (1 + number(set.reps) / 30)
                    > Math.max(0, ...old.map((item) => number(item.weight) * (1 + number(item.reps) / 30)))
                  || number(set.reps) > Math.max(0, ...old.filter((item) => number(item.weight) === number(set.weight))
                    .map((item) => number(item.reps)))
                );
                const tags: string[] = [];
                if (set.completed && priorSet) {
                  if (number(set.weight) > number(priorSet.weight)) tags.push('↑ Weight');
                  if (number(set.reps) > number(priorSet.reps)) tags.push('↑ Reps');
                  else if (number(set.reps) < number(priorSet.reps)) tags.push('↓ Reps');
                  else if (number(set.weight) === number(priorSet.weight)) tags.push('Matched');
                  else tags.push('↓ Weight');
                }
                if (set.completed && number(set.reps) >= exercise.maxReps) tags.push('Top range');
                return (
                  <View key={setIndex} style={[s.setCard, set.completed && s.setDone]}>
                    <View style={s.setTop}>
                      <Text style={s.setNumber}>SET {String(setIndex + 1).padStart(2, '0')}</Text>
                      {isPr ? <Text style={s.prBadge}>★ PR</Text> : null}
                      {tags.length ? <Text style={s.comparisonTag}>{tags.join(' · ')}</Text> : null}
                      <Pressable
                        disabled={isLocked}
                        onPress={() => toggleSet(exercise.exerciseId, setIndex)}
                        style={[s.checkbox, set.completed && s.checkboxChecked]}
                      >
                        <Text style={s.checkboxText}>{set.completed ? '✓' : ''}</Text>
                      </Pressable>
                    </View>
                    <View style={s.setFields}>
                      <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>WEIGHT · {store.weightUnit}</Text>
                        <View style={s.weightControls}>
                          <Pressable disabled={isLocked} style={s.stepper} onPress={() => {
                            const step = store.weightUnit === 'kg' ? 2.5 : 5;
                            const next = Math.max(0, number(set.weight) - step);
                            updateExercise(exercise.exerciseId, (item) => ({
                              ...item, sets: item.sets.map((entry, i) => i === setIndex ? { ...entry, weight: String(next) } : entry),
                            }));
                          }}><Text style={s.stepperText}>−</Text></Pressable>
                          <TextInput
                            editable={!isLocked}
                            keyboardType="decimal-pad"
                            style={s.input}
                            value={set.weight}
                            placeholder="0"
                            placeholderTextColor="#687169"
                            onChangeText={(weight) => updateExercise(exercise.exerciseId, (item) => ({
                              ...item, sets: item.sets.map((entry, i) => i === setIndex ? { ...entry, weight } : entry),
                            }))}
                          />
                          <Pressable disabled={isLocked} style={s.stepper} onPress={() => {
                            const step = store.weightUnit === 'kg' ? 2.5 : 5;
                            const next = number(set.weight) + step;
                            updateExercise(exercise.exerciseId, (item) => ({
                              ...item, sets: item.sets.map((entry, i) => i === setIndex ? { ...entry, weight: String(next) } : entry),
                            }));
                          }}><Text style={s.stepperText}>+</Text></Pressable>
                        </View>
                      </View>
                      <Field
                        label="REPS" value={set.reps} placeholder={String(exercise.minReps)}
                        keyboardType="number-pad"
                        onChangeText={(reps) => updateExercise(exercise.exerciseId, (item) => ({
                          ...item, sets: item.sets.map((entry, i) => i === setIndex ? { ...entry, reps } : entry),
                        }))}
                      />
                    </View>
                    <View style={s.rirRow}>
                      <Text style={s.fieldLabel}>RIR</Text>
                      <View style={s.rirButtons}>
                        {[0, 1, 2, 3, 4].map((rir) => (
                          <Pressable
                            key={rir}
                            disabled={isLocked}
                            onPress={() => updateExercise(exercise.exerciseId, (item) => ({
                              ...item, sets: item.sets.map((entry, i) => i === setIndex ? { ...entry, rir } : entry),
                            }))}
                            style={[s.rirChoice, set.rir === rir && s.rirActive]}
                          ><Text style={[s.rirText, set.rir === rir && s.rirTextActive]}>{rir}</Text></Pressable>
                        ))}
                        <Text style={s.rirSuffix}>FAIL</Text>
                        <Switch
                          disabled={isLocked}
                          value={set.failure}
                          onValueChange={(failure) => updateExercise(exercise.exerciseId, (item) => ({
                            ...item, sets: item.sets.map((entry, i) => i === setIndex
                              ? { ...entry, failure, rir: failure ? 0 : entry.rir } : entry),
                          }))}
                          trackColor={{ false: C.border, true: '#66833B' }}
                          thumbColor={set.failure ? C.green : '#BEC5BB'}
                        />
                      </View>
                    </View>
                    <View style={s.restControl}>
                      <Text style={s.fieldLabel}>REST AFTER SET</Text>
                      <View style={s.restStepper}>
                        <Pressable disabled={isLocked} style={s.restButton} onPress={() => updateExercise(exercise.exerciseId, (item) => ({
                          ...item, sets: item.sets.map((entry, i) => i === setIndex
                            ? { ...entry, restSeconds: Math.max(0, entry.restSeconds - 15) } : entry),
                        }))}><Text style={s.stepperText}>−</Text></Pressable>
                        <Text style={s.restTime}>{set.restSeconds} sec</Text>
                        <Pressable disabled={isLocked} style={s.restButton} onPress={() => updateExercise(exercise.exerciseId, (item) => ({
                          ...item, sets: item.sets.map((entry, i) => i === setIndex
                            ? { ...entry, restSeconds: entry.restSeconds + 15 } : entry),
                        }))}><Text style={s.stepperText}>+</Text></Pressable>
                      </View>
                    </View>
                    {priorSet ? <Text style={s.priorInline}>LAST TIME  {priorSet.weight} {store.weightUnit} × {priorSet.reps} · {priorSet.rir} RIR</Text> : null}
                  </View>
                );
              })}
              {!isLocked && !exercise.skipped ? (
                <Pressable
                  style={s.addSet}
                  onPress={() => updateExercise(exercise.exerciseId, (item) => ({
                    ...item,
                    sets: [...item.sets, {
                      weight: item.sets[item.sets.length - 1]?.weight ?? '',
                      reps: '', rir: item.targetRir, failure: false,
                      restSeconds: item.restSeconds, completed: false,
                    }],
                  }))}
                ><Text style={s.addSetText}>＋  Add an extra set</Text></Pressable>
              ) : null}
              <TextInput
                editable={!isLocked}
                value={exercise.notes}
                onChangeText={(notes) => updateExercise(exercise.exerciseId, (item) => ({ ...item, notes }))}
                placeholder="Exercise notes..."
                placeholderTextColor="#687169"
                style={s.notesInput}
              />
            </Card>
          );
        })}
        {restTimer > 0 ? (
          <Card style={s.timerCard}>
            <Text style={s.timerLabel}>REST TIMER</Text>
            <Text style={s.timerValue}>{restText}</Text>
            <View style={s.timerActions}>
              <Button title="− 30s" secondary onPress={() => setRestTimer(Math.max(0, restTimer - 30))} />
              <Button title="Skip timer" secondary onPress={() => setRestTimer(0)} />
              <Button title="+ 30s" secondary onPress={() => setRestTimer(restTimer + 30)} />
            </View>
          </Card>
        ) : null}
        {!isLocked ? (
          <Button
            title={activeWorkout.splitId === 'rest' ? 'Complete rest day  →' : 'Finish & save workout  →'}
            onPress={() => Alert.alert(
              'Finish this session?',
              'This completed workout will be permanently saved to your history.',
              [
                { text: 'Keep training', style: 'cancel' },
                { text: 'Finish workout', onPress: () => updateWorkout((workout) => ({ ...workout, completed: true })) },
              ],
            )}
            style={s.finishButton}
          />
        ) : null}
      </>
    );
  };

  const renderToday = () => {
    const split = getSplitForDate(todayISO());
    const daysThisWeek = completedWorkouts.filter((workout) => {
      const dayDiff = Math.floor((new Date(`${todayISO()}T12:00:00`).getTime()
        - new Date(`${workout.date}T12:00:00`).getTime()) / 86400000);
      return dayDiff >= 0 && dayDiff < 7;
    }).length;
    let streak = 0;
    for (let offset = 0; offset < 100; offset += 1) {
      const date = new Date(`${todayISO()}T12:00:00`);
      date.setDate(date.getDate() - offset);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (getSplitForDate(dateStr).splitId === 'rest') continue;
      if (completedWorkouts.some((workout) => workout.date === dateStr)) streak += 1;
      else if (offset > 0) break;
    }
    const sevenDayAverage = averageLastSevenDays(metricDays, todayISO());
    return (
      <>
        <View style={s.welcome}>
          <Text style={s.eyebrow}>YOUR 100-DAY TRANSFORMATION</Text>
          <Text style={s.pageTitle}>Show up.<Text style={s.greenText}> Get stronger.</Text></Text>
          <Text style={s.muted}>{formatDate(todayISO())}  ·  Day {todayDay} of 100</Text>
        </View>
        <Card style={s.heroCard}>
          <View style={s.sectionRow}>
            <View>
              <Text style={s.heroLabel}>CHALLENGE PROGRESS</Text>
              <Text style={s.heroNumber}>DAY {todayDay}<Text style={s.heroSlash}> / 100</Text></Text>
            </View>
            <Text style={s.heroEmoji}>✳</Text>
          </View>
          <View style={s.progressTrack}><View style={[s.progressFill, { width: `${todayDay}%` }]} /></View>
          <View style={s.heroBottom}>
            <Text style={s.heroCaption}>{100 - todayDay} days to go</Text>
            <Text style={s.heroCaption}>{Math.round(todayDay)}% COMPLETE</Text>
          </View>
        </Card>
        <View style={s.metricGrid}>
          <Card style={s.statCard}><Metric label="WORKOUT STREAK" value={streak} suffix=" days" /></Card>
          <Card style={s.statCard}><Metric label="SESSIONS DONE" value={completedWorkouts.length} suffix=" / 86" /></Card>
          <Card style={s.statCard}><Metric label="BODYWEIGHT" value={currentWeight || '—'} suffix={currentWeight ? ` ${store.weightUnit}` : ''} /></Card>
          <Card style={s.statCard}><Metric label="CHANGE FROM DAY 1" value={weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` : '—'} suffix={weightChange ? ` ${store.weightUnit}` : ''} /></Card>
          <Card style={s.statCard}><Metric label="TRAINING VOLUME" value={Math.round(totalVolume).toLocaleString()} suffix={` ${store.weightUnit}`} /></Card>
          <Card style={s.statCard}><Metric label="PERSONAL RECORDS" value={personalRecordCount} /></Card>
        </View>
        <Card style={s.consistencyCard}>
          <View style={s.sectionRow}><Text style={s.sectionTitle}>This week</Text><Text style={s.greenText}>{daysThisWeek} / 6 SESSIONS</Text></View>
          <View style={s.weekDots}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
              const date = new Date(`${todayISO()}T12:00:00`);
              const mondayOffset = (date.getDay() + 6) % 7;
              date.setDate(date.getDate() - mondayOffset + index);
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const completed = completedWorkouts.some((workout) => workout.date === dateStr);
              return <View key={`${day}-${index}`} style={s.weekDay}>
                <View style={[s.weekCircle, completed && s.weekCircleDone]}><Text style={[s.weekCheck, completed && s.weekCheckDone]}>{completed ? '✓' : '·'}</Text></View>
                <Text style={s.weekDayLabel}>{day}</Text>
              </View>;
            })}
          </View>
        </Card>
        <Card>
          <SectionTitle title="Week-to-week volume" aside="LOAD × REPS" />
          {(() => {
            const today = new Date(`${todayISO()}T12:00:00`);
            const offset = (today.getDay() + 6) % 7;
            const monday = new Date(today);
            monday.setDate(today.getDate() - offset);
            const previousMonday = new Date(monday);
            previousMonday.setDate(monday.getDate() - 7);
            const weekVolume = (start: Date, end: Date) => completedWorkouts
              .filter((workout) => {
                const date = new Date(`${workout.date}T12:00:00`);
                return date >= start && date < end;
              })
              .reduce((sum, workout) => sum + volumeForWorkout(workout), 0);
            const thisWeek = weekVolume(monday, new Date(monday.getTime() + 7 * 86400000));
            const lastWeek = weekVolume(previousMonday, monday);
            const difference = thisWeek - lastWeek;
            return <View style={s.weekCompare}>
              <Metric label="THIS WEEK" value={Math.round(thisWeek).toLocaleString()} suffix={` ${store.weightUnit}`} />
              <Metric label="LAST WEEK" value={Math.round(lastWeek).toLocaleString()} suffix={` ${store.weightUnit}`} />
              <Text style={difference >= 0 ? s.greenText : s.muted}>{lastWeek ? `${difference >= 0 ? '+' : ''}${Math.round(difference).toLocaleString()} vs last week` : 'Log another week to compare'}</Text>
            </View>;
          })()}
        </Card>
        <Card style={s.nextCard}>
          <View style={s.sectionRow}>
            <View><Text style={s.heroLabel}>TODAY’S SESSION</Text><Text style={s.sessionTitle}>{split.title}</Text></View>
            <Text style={s.sessionCount}>{split.exercises.length} EXERCISES</Text>
          </View>
          <Text style={s.muted}>{split.subtitle}</Text>
          <Button title={split.splitId === 'rest' ? 'Log recovery  →' : 'Open workout  →'} onPress={() => { setSelectedDate(todayISO()); setTab('Train'); }} style={s.openWorkout} />
        </Card>
        <Card style={s.weightCard}>
          <View style={s.sectionRow}><Text style={s.sectionTitle}>Weight trend</Text><Text style={s.sectionAside}>7-DAY AVG</Text></View>
          <View style={s.weightSummary}>
            <Text style={s.weightBig}>{sevenDayAverage ? sevenDayAverage.toFixed(1) : '—'}<Text style={s.metricSuffix}> {store.weightUnit}</Text></Text>
            <Text style={s.muted}>Daily fluctuations are normal. Track the average.</Text>
          </View>
          <MiniChart values={metricDays.map((metric) => number(metric.bodyweight))} suffix={store.weightUnit} />
        </Card>
      </>
    );
  };

  const renderProgress = () => {
    const draft = metricDraft ?? emptyMetrics(todayISO());
    const exercises = WEEKLY_SPLIT.flatMap((split) => split.exercises)
      .filter((exercise, index, list) => exercise.isMajorLift
        && list.findIndex((item) => item.exerciseId === exercise.exerciseId) === index);
    const chosenId = selectedExercise || exercises[0]?.exerciseId;
    const chosen = exercises.find((exercise) => exercise.exerciseId === chosenId);
    const strengthValues = chosen ? completedWorkouts.slice().reverse().flatMap((workout) => {
      const exercise = workout.exercises.find((item) => item.exerciseId === chosen.exerciseId);
      const weights = exercise?.sets.filter((set) => set.completed)
        .map((set) => number(set.weight) * (1 + number(set.reps) / 30)) ?? [];
      return weights.length ? [Math.max(...weights)] : [];
    }) : [];
    const measurementKeys: [keyof Metrics, string][] = [
      ['waist', 'Waist'], ['chest', 'Chest'], ['arm', 'Arm'], ['thigh', 'Thigh'],
    ];
    return (
      <>
        <View style={s.pageHeading}>
          <Text style={s.eyebrow}>THE BIG PICTURE</Text>
          <Text style={s.pageTitle}>Progress</Text>
          <Text style={s.muted}>One day at a time. Trends over noise.</Text>
        </View>
        <Card style={s.dayCard}>
          <SectionTitle title="Challenge setup" aside={`DAY ${todayDay} / 100`} />
          <Text style={s.muted}>Day 1 is tied to your start date. Your history stays on this device.</Text>
          <View style={s.formRow}>
            <Field label="START DATE (YYYY-MM-DD)" value={startDateDraft} keyboardType="default"
              onChangeText={setStartDateDraft}
              onEndEditing={() => {
                const parsed = new Date(`${startDateDraft}T12:00:00`);
                const [year, month, day] = startDateDraft.split('-').map(Number);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateDraft)
                  || Number.isNaN(parsed.getTime())
                  || parsed.getFullYear() !== year
                  || parsed.getMonth() + 1 !== month
                  || parsed.getDate() !== day) {
                  setSaveError('Enter a valid start date as YYYY-MM-DD.');
                  setStartDateDraft(store.startDate);
                  return;
                }
                commit({ ...store, startDate: startDateDraft });
              }} />
            <Field label={`START WEIGHT · ${store.weightUnit}`} value={store.startingWeight} onChangeText={(startingWeight) => commit({ ...store, startingWeight })} />
          </View>
          <Pressable onPress={() => {
            const factor = store.weightUnit === 'kg' ? 2.20462 : 1 / 2.20462;
            const convert = (value: string) => value && number(value) > 0
              ? String(Math.round(number(value) * factor * 10) / 10) : value;
            const workouts = store.workouts.map((workout) => ({
              ...workout,
              exercises: workout.exercises.map((exercise) => ({
                ...exercise, sets: exercise.sets.map((set) => ({ ...set, weight: convert(set.weight) })),
              })),
            }));
            const metrics = store.metrics.map((metric) => ({ ...metric, bodyweight: convert(metric.bodyweight) }));
            const starting = convert(store.startingWeight);
            commit({
              ...store, workouts, metrics, startingWeight: starting,
              weightUnit: store.weightUnit === 'kg' ? 'lbs' : 'kg',
            });
            setMetricDraft(metrics.find((metric) => metric.date === todayISO()) ?? emptyMetrics(todayISO()));
          }} style={s.unitSwitch}>
            <Text style={s.greenText}>UNIT  ·  {store.weightUnit.toUpperCase()}  ↔  {store.weightUnit === 'kg' ? 'LBS' : 'KG'}</Text>
          </Pressable>
        </Card>
        <Card>
          <SectionTitle title="Daily check-in" aside={formatDate(todayISO())} />
          <Text style={s.muted}>Morning weigh-ins are most useful. A rolling average tells the real story.</Text>
          <View style={s.formRow}>
            <Field label={`BODYWEIGHT · ${store.weightUnit}`} value={draft.bodyweight} onChangeText={(value) => updateMetric('bodyweight', value)} />
            <Field label="SLEEP · HOURS" value={draft.sleep} onChangeText={(value) => updateMetric('sleep', value)} />
          </View>
          <View style={s.formRow}>
            <Field label="STEPS" value={draft.steps} onChangeText={(value) => updateMetric('steps', value)} keyboardType="number-pad" />
            <Field label="CALORIES" value={draft.calories} onChangeText={(value) => updateMetric('calories', value)} keyboardType="number-pad" />
            <Field label="PROTEIN · G" value={draft.protein} onChangeText={(value) => updateMetric('protein', value)} keyboardType="number-pad" />
          </View>
          <SectionTitle title="Measurements" aside="SAME CONDITIONS" />
          <View style={s.formRow}>
            {measurementKeys.map(([key, label]) => (
              <Field key={key} label={`${label.toUpperCase()} · CM`} value={draft[key]} onChangeText={(value) => updateMetric(key, value)} />
            ))}
          </View>
          <Button title="＋  Add progress photo" secondary onPress={async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Photo access needed', 'Allow photo library access to attach a progress photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'], allowsEditing: true, quality: 0.75,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              try {
                if (!FileSystem.documentDirectory) throw new Error('Photo storage is not available.');
                const extension = result.assets[0].uri.split('.').pop()?.split('?')[0] ?? 'jpg';
                const destination = `${FileSystem.documentDirectory}iron100-${todayISO()}-${Date.now()}.${extension}`;
                await FileSystem.copyAsync({ from: result.assets[0].uri, to: destination });
                updateMetric('photoUri', destination);
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                Alert.alert('Photo could not be saved', message);
              }
            }
          }} />
          {draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={s.progressPhoto} /> : null}
          {draft.photoUri ? <Button title="Remove photo" secondary onPress={() => updateMetric('photoUri', '')} /> : null}
          <Text style={s.savedHint}>✓  Check-ins save automatically on this device</Text>
        </Card>
        <Card>
          <SectionTitle title="Bodyweight trend" aside="LAST 14 ENTRIES" />
          <MiniChart values={metricDays.map((metric) => number(metric.bodyweight))} suffix={` ${store.weightUnit}`} />
          <View style={s.measureSummary}>
            <Metric label="STARTING" value={startingWeight || '—'} suffix={startingWeight ? ` ${store.weightUnit}` : ''} />
            <Metric label="CURRENT" value={currentWeight || '—'} suffix={currentWeight ? ` ${store.weightUnit}` : ''} />
            <Metric label="CHANGE" value={weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` : '—'} suffix={weightChange ? ` ${store.weightUnit}` : ''} />
          </View>
          <Text style={s.savedHint}>Latest 7-day average: {averageLastSevenDays(metricDays, todayISO()) ? averageLastSevenDays(metricDays, todayISO()).toFixed(1) : '—'} {store.weightUnit}</Text>
          {weeklyAverages.length > 1 ? <><SectionTitle title="Weekly average" /><MiniChart values={weeklyAverages} suffix={` ${store.weightUnit}`} /></> : null}
        </Card>
        <Card>
          <SectionTitle title="Strength progression" aside="EST. 1RM" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.exerciseChips}>
            {exercises.map((exercise) => (
              <Pressable key={exercise.exerciseId} onPress={() => setSelectedExercise(exercise.exerciseId)}
                style={[s.exerciseChip, chosenId === exercise.exerciseId && s.exerciseChipActive]}>
                <Text style={[s.exerciseChipText, chosenId === exercise.exerciseId && s.exerciseChipTextActive]}>{exercise.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.smallTitle}>{chosen?.name}</Text>
          <MiniChart values={strengthValues} suffix={` ${store.weightUnit}`} />
          <Text style={s.savedHint}>Estimated 1RM uses the Epley formula: weight × (1 + reps ÷ 30).</Text>
        </Card>
        <Card><SectionTitle title="Training volume" aside={`${store.weightUnit.toUpperCase()} × REPS`} /><MiniChart values={dayVolume} suffix={` ${store.weightUnit}`} /></Card>
        <Card>
          <SectionTitle title="Measurements over time" aside="CM" />
          {measurementKeys.map(([key, label]) => {
            const series = store.metrics.filter((metric) => number(metric[key]) > 0).map((metric) => number(metric[key]));
            return <View key={key} style={s.measureChart}><Text style={s.smallTitle}>{label}</Text><MiniChart values={series} suffix=" cm" /></View>;
          })}
        </Card>
      </>
    );
  };

  const renderHistory = () => (
    <>
      <View style={s.pageHeading}>
        <Text style={s.eyebrow}>EVERY REP COUNTS</Text>
        <Text style={s.pageTitle}>History</Text>
        <Text style={s.muted}>{completedWorkouts.length} completed sessions · records stay saved</Text>
      </View>
      <View style={s.historySummary}>
        <Card style={s.statCard}><Metric label="TOTAL SESSIONS" value={completedWorkouts.length} /></Card>
        <Card style={s.statCard}><Metric label="TOTAL VOLUME" value={`${Math.round(totalVolume).toLocaleString()}`} suffix=" kg" /></Card>
      </View>
      {!historicalWorkouts.length ? (
        <Card><Text style={s.exerciseName}>Your first session starts here.</Text><Text style={s.muted}>Finish your workout to preserve it in your history.</Text></Card>
      ) : historicalWorkouts.map((workout) => {
        const expanded = expandedHistory === workout.date;
        const first = workout.exercises.find((exercise) => !exercise.skipped);
        const hasFirst = first?.sets.some((set) => set.completed);
        return (
          <Card key={workout.date} style={s.historyCard}>
            <Pressable onPress={() => setExpandedHistory(expanded ? '' : workout.date)} style={s.historyHead}>
              <View style={s.flex}>
                <Text style={s.eyebrow}>DAY {workout.dayNumber}  ·  SESSION {workout.sessionNumber}</Text>
                <Text style={s.historyTitle}>{workout.splitName}</Text>
                <Text style={s.muted}>{formatDate(workout.date)}  ·  {Math.round(volumeForWorkout(workout)).toLocaleString()} kg volume</Text>
              </View>
              <Text style={workout.completed ? s.greenText : s.sectionAside}>{workout.completed ? '✓ SAVED' : 'IN PROGRESS'}  {expanded ? '−' : '+'}</Text>
            </Pressable>
            {first && hasFirst ? <Text style={s.historyPreview}>{first.name}  ·  {exercisePerformance(first)}</Text> : null}
            {expanded ? (
              <View style={s.historyDetails}>
                {workout.exercises.map((exercise) => (
                  <View key={exercise.exerciseId} style={s.historyExercise}>
                    <Text style={s.smallTitle}>{exercise.name}{exercise.skipped ? '  ·  SKIPPED' : ''}</Text>
                    <Text style={s.muted}>
                      Target: {exercise.targetSets} × {exercise.minReps}–{exercise.maxReps}
                      {'  ·  '}{exercise.targetRir} RIR  ·  {formatRest(exercise.restSeconds)} rest
                    </Text>
                    <Text style={s.historyPreview}>
                      {exercise.sets.map((set, index) =>
                        `Set ${index + 1}: ${set.weight || '—'} ${store.weightUnit} × ${set.reps || '—'} · ${set.rir} RIR · ${formatRest(set.restSeconds)} rest${set.failure ? ' · failure' : ''}${set.completed ? '' : ' · not marked complete'}`,
                      ).join('\n') || 'No sets'}
                    </Text>
                    {exercise.notes ? <Text style={s.muted}>Note: {exercise.notes}</Text> : null}
                  </View>
                ))}
                <Text style={s.savedHint}>Saved on {workout.date} · Day {workout.dayNumber} · Session {workout.sessionNumber}</Text>
              </View>
            ) : null}
            <Button title={expanded ? 'Close session' : 'View full session  →'} secondary onPress={() => setExpandedHistory(expanded ? '' : workout.date)} />
            <Button title="Compare to this day" secondary onPress={() => {
              setSelectedDate(workout.date);
              setTab('Train');
            }} />
          </Card>
        );
      })}
      {completedWorkouts.length > 1 ? (
        <Card>
          <SectionTitle title="Day 1 → Current" />
          {(() => {
            const sessions = [...completedWorkouts].sort((a, b) => a.date.localeCompare(b.date));
            const majorLifts = WEEKLY_SPLIT.flatMap((split) => split.exercises)
              .filter((exercise, index, list) => exercise.isMajorLift
                && list.findIndex((item) => item.exerciseId === exercise.exerciseId) === index);
            return majorLifts.map((exercise) => {
              const first = sessions.find((workout) => workout.dayNumber === 1)
                ?.exercises.find((item) => item.exerciseId === exercise.exerciseId);
              const current = [...sessions].reverse()
                .flatMap((workout) => workout.exercises)
                .find((item) => item.exerciseId === exercise.exerciseId && !item.skipped
                  && item.sets.some((set) => set.completed));
              const firstTop = Math.max(0, ...(first?.sets.filter((set) => set.completed) ?? [])
                .map((set) => number(set.weight) * (1 + number(set.reps) / 30)));
              const currentTop = Math.max(0, ...(current?.sets.filter((set) => set.completed) ?? [])
                .map((set) => number(set.weight) * (1 + number(set.reps) / 30)));
              return <View key={exercise.exerciseId} style={s.compareRow}>
                <Text style={s.compareName}>{exercise.name}</Text>
                <Text style={s.compareValue}>
                  Day 1: {firstTop ? firstTop.toFixed(1) : '—'}  →  Current: {currentTop ? currentTop.toFixed(1) : '—'} {store.weightUnit} est. 1RM
                </Text>
              </View>;
            });
          })()}
        </Card>
      ) : null}
    </>
  );

  const tabs: { label: Tab; icon: string }[] = [
    { label: 'Today', icon: '◫' }, { label: 'Train', icon: '✳' },
    { label: 'Progress', icon: '↗' }, { label: 'History', icon: '◷' },
  ];

  return (
    <View style={s.app}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.topBar}>
        <View style={s.brandMark}><Text style={s.brandIcon}>I</Text></View>
        <View><Text style={s.brandName}>IRON<Text style={s.brandAccent}>100</Text></Text><Text style={s.brandSub}>THE 100-DAY BUILD</Text></View>
        <View style={s.topRight}><View style={s.liveDot} /><Text style={s.topDay}>DAY {todayDay}/100</Text></View>
      </View>
      {saveError ? <Pressable style={s.errorBanner} onPress={() => setSaveError('')}><Text style={s.errorText}>{saveError}  ×</Text></Pressable> : null}
      <KeyboardAvoidingView style={s.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          key={tab}
          style={s.scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tab === 'Today' ? renderToday() : null}
          {tab === 'Train' ? renderWorkout() : null}
          {tab === 'Progress' ? renderProgress() : null}
          {tab === 'History' ? renderHistory() : null}
          <Text style={s.footer}>IRON 100  ·  CONSISTENCY OVER PERFECTION</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={s.bottomNav}>
        {tabs.map((item) => (
          <Pressable key={item.label} onPress={() => setTab(item.label)} style={s.navItem}>
            <Text style={[s.navIcon, tab === item.label && s.navSelected]}>{item.icon}</Text>
            <Text style={[s.navLabel, tab === item.label && s.navSelected]}>{item.label.toUpperCase()}</Text>
            {tab === item.label ? <View style={s.navIndicator} /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 17, paddingTop: 22, paddingBottom: 32, gap: 13 },
  topBar: { height: 62, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  brandIcon: { fontSize: 22, fontWeight: '900', color: C.bg, fontStyle: 'italic' },
  brandName: { color: C.text, fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
  brandAccent: { color: C.green },
  brandSub: { fontSize: 8, letterSpacing: 1.4, color: C.muted, marginTop: 1 },
  topRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { height: 7, width: 7, borderRadius: 4, backgroundColor: C.green },
  topDay: { color: C.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  bottomNav: { minHeight: 62, paddingBottom: Platform.OS === 'ios' ? 15 : 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 52 },
  navIcon: { fontSize: 20, color: C.muted, fontWeight: '700' },
  navLabel: { fontSize: 8, letterSpacing: 1, fontWeight: '800', color: C.muted },
  navSelected: { color: C.green },
  navIndicator: { width: 18, height: 2, borderRadius: 1, backgroundColor: C.green, position: 'absolute', bottom: 0 },
  card: { backgroundColor: C.panel, borderRadius: 17, borderColor: C.border, borderWidth: 1, padding: 16, gap: 12 },
  pageHeading: { paddingTop: 3, paddingBottom: 7, gap: 5 },
  welcome: { paddingTop: 4, paddingBottom: 3, gap: 6 },
  eyebrow: { color: C.green, fontSize: 9, letterSpacing: 1.5, fontWeight: '900' },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.8, color: C.text },
  greenText: { color: C.green, fontWeight: '900', fontSize: 11, letterSpacing: 0.4 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 18 },
  label: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { color: C.text, fontSize: 14, fontWeight: '800' },
  sectionAside: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  heroCard: { backgroundColor: C.greenDark, borderColor: '#38502B', padding: 18 },
  heroLabel: { color: '#B7D793', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heroNumber: { color: C.green, fontSize: 27, fontWeight: '900', marginTop: 2, letterSpacing: -0.7 },
  heroSlash: { color: '#93AE76', fontSize: 17 },
  heroEmoji: { color: C.green, fontSize: 29 },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#34432F', overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', minWidth: 6, borderRadius: 5, backgroundColor: C.green },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  heroCaption: { color: '#BDD39E', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  statCard: { width: '48.4%', minHeight: 81, paddingVertical: 12, paddingHorizontal: 13, justifyContent: 'center' },
  metric: { gap: 5 },
  metricValue: { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  metricSuffix: { color: C.muted, fontSize: 11, fontWeight: '600' },
  metricLabel: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  consistencyCard: { gap: 15 },
  weekDots: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  weekDay: { alignItems: 'center', gap: 6 },
  weekCircle: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' },
  weekCircleDone: { backgroundColor: C.green, borderColor: C.green },
  weekCheck: { color: C.muted, fontSize: 16, lineHeight: 19 },
  weekCheckDone: { color: C.bg, fontWeight: '900' },
  weekDayLabel: { color: C.muted, fontSize: 9, fontWeight: '800' },
  weekCompare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  nextCard: { borderColor: '#39492F' },
  sessionTitle: { color: C.text, fontWeight: '900', fontSize: 15, marginTop: 4 },
  sessionCount: { color: C.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { color: C.bg, fontWeight: '900', fontSize: 12, letterSpacing: 0.3 },
  buttonSecondary: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
  buttonTextSecondary: { color: C.text },
  disabled: { opacity: 0.45 },
  openWorkout: { marginTop: 1 },
  weightCard: { gap: 10 },
  weightSummary: { gap: 3 },
  weightBig: { color: C.text, fontSize: 24, fontWeight: '900' },
  chartBox: { width: '100%', overflow: 'hidden' },
  chartEmpty: { height: 104, alignItems: 'center', justifyContent: 'center' },
  chartValues: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  chartCaption: { color: C.muted, fontSize: 9, fontWeight: '700' },
  dayCard: { gap: 10 },
  dayDisplay: { color: C.green, fontSize: 16, fontWeight: '900' },
  dayOf: { color: C.muted, fontSize: 11 },
  dayControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayArrow: { width: 31, height: 31, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: C.text, fontSize: 22, lineHeight: 25 },
  lockedCard: { borderColor: '#38502B' },
  exerciseCard: { padding: 14, gap: 11 },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  flex: { flex: 1 },
  exerciseName: { color: C.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.25 },
  smallAction: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border },
  smallActionText: { color: C.muted, fontSize: 10, fontWeight: '800' },
  prescription: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#172016', borderRadius: 9, padding: 10 },
  prescriptionText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  recordLine: { color: '#A7B598', fontSize: 9, fontWeight: '800', lineHeight: 15 },
  previousBox: { backgroundColor: '#171D19', borderLeftColor: C.green, borderLeftWidth: 2, borderRadius: 8, padding: 10, gap: 6 },
  previousTitle: { color: C.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  previousCopy: { color: '#B6BDB4', fontSize: 11, lineHeight: 19, fontVariant: ['tabular-nums'] },
  coachBox: { backgroundColor: '#15200F', borderRadius: 9, padding: 10, gap: 4 },
  coachTitle: { color: C.green, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  coachCopy: { color: '#D4E5C5', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  setCard: { backgroundColor: '#0F1311', borderRadius: 11, borderWidth: 1, borderColor: C.border, padding: 10, gap: 9 },
  setDone: { borderColor: '#4F6D38', backgroundColor: '#121B10' },
  setTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setNumber: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, flex: 1 },
  prBadge: { color: C.bg, backgroundColor: C.green, borderRadius: 5, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontSize: 9, fontWeight: '900' },
  comparisonTag: { color: C.green, fontSize: 9, fontWeight: '900' },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: '#4B564E', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.green, borderColor: C.green },
  checkboxText: { color: C.bg, fontWeight: '900', fontSize: 15 },
  setFields: { flexDirection: 'row', gap: 9 },
  fieldWrap: { flex: 1, minWidth: 60, gap: 5 },
  fieldLabel: { color: C.muted, fontSize: 8, letterSpacing: 0.8, fontWeight: '900' },
  inputShell: { flexDirection: 'row', alignItems: 'center', height: 43, backgroundColor: '#0C100E', borderRadius: 9, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10 },
  input: { flex: 1, color: C.text, fontSize: 15, fontWeight: '800', minHeight: 40, paddingVertical: 0, fontVariant: ['tabular-nums'] },
  suffix: { color: C.muted, fontSize: 10 },
  weightControls: { flexDirection: 'row', height: 43, alignItems: 'center', borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: '#0C100E', overflow: 'hidden' },
  stepper: { width: 29, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel2 },
  stepperText: { color: C.green, fontSize: 19, fontWeight: '700' },
  restControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  restStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restButton: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  restTime: { color: C.text, fontSize: 11, fontWeight: '800', minWidth: 44, textAlign: 'center' },
  rirRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rirButtons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rirChoice: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  rirActive: { borderColor: C.green, backgroundColor: C.greenDark },
  rirText: { color: C.muted, fontSize: 10, fontWeight: '900' },
  rirTextActive: { color: C.green },
  rirSuffix: { color: C.muted, fontSize: 8, fontWeight: '900' },
  priorInline: { color: '#91A681', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  addSet: { alignItems: 'center', paddingVertical: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 9 },
  addSetText: { color: C.green, fontSize: 11, fontWeight: '800' },
  notesInput: { color: C.text, fontSize: 12, minHeight: 38, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 7 },
  timerCard: { backgroundColor: C.greenDark, alignItems: 'center', borderColor: '#38502B' },
  timerLabel: { color: '#BDD39E', fontSize: 9, letterSpacing: 1.5, fontWeight: '900' },
  timerValue: { color: C.green, fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerActions: { flexDirection: 'row', gap: 6 },
  finishButton: { marginTop: 3, minHeight: 54 },
  formRow: { flexDirection: 'row', gap: 8 },
  inputField: { color: C.text },
  unitSwitch: { alignSelf: 'flex-start', paddingVertical: 5 },
  savedHint: { color: '#93A486', fontSize: 10, lineHeight: 16 },
  progressPhoto: { height: 250, width: '100%', borderRadius: 12, resizeMode: 'cover' },
  measureSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  exerciseChips: { marginHorizontal: -3, maxHeight: 38 },
  exerciseChip: { paddingHorizontal: 10, paddingVertical: 8, marginHorizontal: 3, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel2 },
  exerciseChipActive: { borderColor: C.green, backgroundColor: C.greenDark },
  exerciseChipText: { color: C.muted, fontSize: 9, fontWeight: '800' },
  exerciseChipTextActive: { color: C.green },
  smallTitle: { color: C.text, fontSize: 12, fontWeight: '800' },
  measureChart: { gap: 4 },
  historySummary: { flexDirection: 'row', gap: 8 },
  historyCard: { gap: 11 },
  historyHead: { flexDirection: 'row', gap: 9 },
  historyTitle: { color: C.text, fontSize: 15, fontWeight: '900', marginVertical: 3 },
  historyPreview: { color: '#AAB2A8', fontSize: 10, lineHeight: 17, marginTop: 4 },
  historyDetails: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 11 },
  historyExercise: { gap: 3, paddingBottom: 8, borderBottomColor: C.border, borderBottomWidth: 1 },
  compareRow: { borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 9, gap: 4 },
  compareName: { color: C.text, fontSize: 12, fontWeight: '800' },
  compareValue: { color: C.green, fontSize: 11, fontWeight: '700' },
  footer: { color: '#657067', fontSize: 8, letterSpacing: 1.3, textAlign: 'center', paddingVertical: 9, fontWeight: '800' },
  errorBanner: { backgroundColor: '#46231F', paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { color: '#FFC0B7', fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
