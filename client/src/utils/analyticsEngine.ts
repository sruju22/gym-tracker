import {
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSetStage,
  Exercise,
  MuscleGroup,
  WeeklySchedule,
  DayOfWeek,
  PersonalRecord,
} from '../types';
import { calculate1RM as calc1RMBase } from './oneRM';
import { parseLocalDate } from './formatters';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ExerciseWorkingSet {
  weight: number;
  reps: number;
  estimated1RM: number;
  loadVolume: number;
  isSupersetStage: boolean;
  exerciseId: string;
  exerciseName: string;
  stageOrder?: number;
}

export interface SessionExercisePerformance {
  date: string;
  sessionId: string;
  workoutName: string;
  maxWeight: number;
  bestReps: number;
  bestEstimated1RM: number;
  totalVolume: number;
  completedSetsCount: number;
  workingSets: ExerciseWorkingSet[];
}

export type ProgressionTrend = 'improving' | 'stable' | 'declining' | 'unknown';

export interface ExerciseProgressionAnalytics {
  exerciseId: string;
  exerciseName: string;
  isCustom: boolean;
  totalSessions: number;
  totalWorkingSets: number;
  currentEstimated1RM: number | null;
  baselineEstimated1RM: number | null;
  overallDelta1RM: number | null;
  currentMaxWeight: number | null;
  baselineMaxWeight: number | null;
  trend: ProgressionTrend;
  trendDeltaPercent: number | null;
  trendReason: string;
  isLimitedData: boolean;
  timeline: SessionExercisePerformance[];
}

export interface ExerciseVolumeSummary {
  exerciseId: string;
  exerciseName: string;
  isCustom: boolean;
  primaryMuscle?: MuscleGroup;
  loadVolume: number;
  setsCount: number;
  repsCount: number;
}

export interface WeeklyVolumePoint {
  weekStart: string; // ISO date of Monday
  weekEnd: string;   // ISO date of Sunday
  weekLabel: string; // e.g. "Oct 19 - Oct 25"
  loadVolume: number;
  completedSets: number;
  workoutCount: number;
}

export interface VolumeAnalytics {
  totalLoadVolume: number;
  totalCompletedSets: number;
  totalReps: number;
  averageVolumePerWorkout: number;
  volumeByExercise: ExerciseVolumeSummary[];
  volumeTimeline: Array<{
    date: string;
    sessionId: string;
    workoutName: string;
    loadVolume: number;
    completedSets: number;
    totalReps: number;
  }>;
  weeklyVolume: WeeklyVolumePoint[];
}

export interface WeeklyConsistencyPoint {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  completedCount: number;
  targetCount: number;
  isMet: boolean;
}

export interface TrainingConsistencyAnalytics {
  totalWorkouts: number;
  workoutsLast7Days: number;
  workoutsLast30Days: number;
  weeklyAverageWorkouts: number;
  currentDailyStreak: number;
  longestDailyStreak: number;
  hasTrainedToday: boolean;
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  weeklyBreakdown: WeeklyConsistencyPoint[];
}

export interface MuscleGroupVolumeCoverage {
  muscleGroup: MuscleGroup;
  displayName: string;
  directSets: number;      // 1.0 per primary working set
  secondarySets: number;   // 0.5 per secondary working set
  effectiveSets: number;   // directSets + (0.5 * secondarySets)
  loadVolume: number;      // sum of load volume for exercises where primaryMuscle matches
  exerciseCount: number;
  exerciseNames: string[];
  lastTrainedDate: string | null;
  daysSinceLastTrained: number | null;
  scheduledInSplit: boolean;
}

export interface PersonalRecordSummary {
  exerciseId: string;
  exerciseName: string;
  isCustom: boolean;
  primaryMuscle?: MuscleGroup;
  maxWeight: {
    value: number;
    reps: number;
    date: string;
    workoutName: string;
  };
  max1RM: {
    estimated1RM: number;
    weight: number;
    reps: number;
    date: string;
    workoutName: string;
  };
  maxReps: {
    reps: number;
    weight: number;
    date: string;
    workoutName: string;
  };
  maxVolumeSession?: {
    volume: number;
    sets: number;
    date: string;
    workoutName: string;
  };
}

export interface MilestoneSummary {
  id: string;
  exerciseId: string;
  exerciseName: string;
  title: string;
  subtitle: string;
  date: string;
  badge: string;
}

export interface ComprehensiveAnalyticsSummary {
  consistency: TrainingConsistencyAnalytics;
  volume: VolumeAnalytics;
  muscleCoverage: MuscleGroupVolumeCoverage[];
  personalRecords: PersonalRecordSummary[];
  recentMilestones: MilestoneSummary[];
}

// ============================================================================
// DATE & SESSION FILTERING HELPERS
// ============================================================================

/**
 * Filter sessions to only those that were completed.
 * Incomplete sessions ('in_progress', 'planned', undefined) are strictly excluded.
 * Sorted chronologically ascending (oldest to newest) by default.
 */
export function filterCompletedSessions(
  history: WorkoutSession[],
  order: 'asc' | 'desc' = 'asc'
): WorkoutSession[] {
  if (!Array.isArray(history)) return [];

  const completed = history.filter((session) => {
    if (!session || typeof session !== 'object') return false;
    if (session.status !== 'completed') return false;
    const date = parseLocalDate(session.completedAt || session.date);
    return !isNaN(date.getTime());
  });

  return completed.sort((a, b) => {
    const timeA = parseLocalDate(a.completedAt || a.date).getTime();
    const timeB = parseLocalDate(b.completedAt || b.date).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Filter sessions by an explicit time range relative to a reference date.
 */
export function filterSessionsByTimeRange(
  sessions: WorkoutSession[],
  range: AnalyticsTimeRange,
  now: Date = new Date()
): WorkoutSession[] {
  if (range === 'all') return sessions;

  let daysToSubtract = 30;
  if (range === '7d') daysToSubtract = 7;
  else if (range === '30d') daysToSubtract = 30;
  else if (range === '90d') daysToSubtract = 90;
  else if (range === '1y') daysToSubtract = 365;

  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - daysToSubtract);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffTime = cutoff.getTime();

  return sessions.filter((s) => {
    const sessionTime = parseLocalDate(s.completedAt || s.date).getTime();
    return sessionTime >= cutoffTime;
  });
}

/**
 * Returns Monday 00:00:00.000 local time for the calendar week of the given date.
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns Sunday 23:59:59.999 local time for the calendar week starting on the given Monday.
 */
export function getSundayOfWeek(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function formatWeekLabel(monday: Date, sunday: Date): string {
  const mMonth = monday.toLocaleDateString('en-US', { month: 'short' });
  const mDay = monday.getDate();
  const sMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
  const sDay = sunday.getDate();

  if (mMonth === sMonth) {
    return `${mMonth} ${mDay}–${sDay}`;
  }
  return `${mMonth} ${mDay} – ${sMonth} ${sDay}`;
}

// ============================================================================
// STRENGTH PROGRESSION & ESTIMATED 1RM
// ============================================================================

/**
 * Calculate Estimated 1RM using documented formulas:
 * - reps = 1: actual weight
 * - 1 <= reps <= 12: Brzycki formula: weight * (36 / (37 - reps))
 * - reps > 12: Epley formula: weight * (1 + reps / 30)
 * - non-positive weight or reps: returns 0
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (typeof weight !== 'number' || typeof reps !== 'number') return 0;
  if (weight <= 0 || reps <= 0 || isNaN(weight) || isNaN(reps)) return 0;
  return calc1RMBase(weight, reps);
}

/**
 * Extracts all valid working sets for a given exercise from a workout session.
 * Handles both standalone sets and nested superset/combination stages without double counting.
 */
export function extractExerciseWorkingSets(
  session: WorkoutSession,
  targetExerciseId: string
): ExerciseWorkingSet[] {
  if (!session || !Array.isArray(session.exercises)) return [];

  const workingSets: ExerciseWorkingSet[] = [];

  for (const exItem of session.exercises) {
    if (!exItem || !Array.isArray(exItem.sets)) continue;

    const exAny = exItem as any;
    const isDirectExerciseMatch =
      exItem.exerciseId === targetExerciseId ||
      (exItem.exercise && exItem.exercise.id === targetExerciseId);

    for (const set of exItem.sets) {
      if (!set) continue;

      // Superset / combination set with stages
      if (Array.isArray(set.stages) && set.stages.length > 0) {
        for (const stage of set.stages) {
          const isWeightValid = stage.weight === null || stage.weight >= 0;
          const isRepsValid = stage.reps !== null && stage.reps > 0;
          if (stage.exerciseId === targetExerciseId && stage.completed && isWeightValid && isRepsValid) {
            const w = stage.weight ?? 0;
            const r = stage.reps!;
            workingSets.push({
              weight: w,
              reps: r,
              estimated1RM: w > 0 ? calculateEstimated1RM(w, r) : 0,
              loadVolume: w * r,
              isSupersetStage: true,
              exerciseId: stage.exerciseId,
              exerciseName: stage.exerciseName || exItem.exercise?.name || exAny.exerciseName || 'Exercise',
              stageOrder: stage.stageOrder,
            });
          }
        }
      } else if (isDirectExerciseMatch) {
        // Standalone set
        const isWeightValid = set.weight === null || set.weight >= 0;
        const isRepsValid = set.reps !== null && set.reps > 0;
        if (set.completed && isWeightValid && isRepsValid) {
          const w = set.weight ?? 0;
          const r = set.reps!;
          workingSets.push({
            weight: w,
            reps: r,
            estimated1RM: w > 0 ? calculateEstimated1RM(w, r) : 0,
            loadVolume: w * r,
            isSupersetStage: false,
            exerciseId: targetExerciseId,
            exerciseName: exItem.exercise?.name || exAny.exerciseName || 'Exercise',
          });
        }
      }
    }
  }

  return workingSets;
}

/**
 * Calculates comprehensive strength progression analytics for a specific exercise.
 */
export function getExerciseStrengthProgression(
  history: WorkoutSession[],
  exerciseId: string,
  exerciseNameFallback?: string
): ExerciseProgressionAnalytics {
  const completedSessions = filterCompletedSessions(history, 'asc');

  let resolvedName = exerciseNameFallback || exerciseId;
  let isCustom = exerciseId.startsWith('custom_');

  const timeline: SessionExercisePerformance[] = [];

  for (const session of completedSessions) {
    const workingSets = extractExerciseWorkingSets(session, exerciseId);
    if (workingSets.length === 0) continue;

    if (!resolvedName || resolvedName === exerciseId) {
      resolvedName = workingSets[0].exerciseName;
    }

    const weights = workingSets.map((s) => s.weight);
    const maxWeight = Math.max(...weights);
    const bestSet = workingSets.find((s) => s.weight === maxWeight) || workingSets[0];
    const bestEstimated1RM = Math.max(...workingSets.map((s) => s.estimated1RM));
    const totalVolume = workingSets.reduce((sum, s) => sum + s.loadVolume, 0);

    timeline.push({
      date: session.completedAt || session.date,
      sessionId: session.id,
      workoutName: session.workoutName || 'Workout Session',
      maxWeight,
      bestReps: bestSet.reps,
      bestEstimated1RM,
      totalVolume,
      completedSetsCount: workingSets.length,
      workingSets,
    });
  }

  const totalSessions = timeline.length;
  const totalWorkingSets = timeline.reduce((sum, t) => sum + t.completedSetsCount, 0);

  if (totalSessions === 0) {
    return {
      exerciseId,
      exerciseName: resolvedName,
      isCustom,
      totalSessions: 0,
      totalWorkingSets: 0,
      currentEstimated1RM: null,
      baselineEstimated1RM: null,
      overallDelta1RM: null,
      currentMaxWeight: null,
      baselineMaxWeight: null,
      trend: 'unknown',
      trendDeltaPercent: null,
      trendReason: 'No recorded completed sets for this exercise',
      isLimitedData: true,
      timeline: [],
    };
  }

  const latest = timeline[timeline.length - 1];
  const baseline = timeline[0];

  if (totalSessions === 1) {
    return {
      exerciseId,
      exerciseName: resolvedName,
      isCustom,
      totalSessions: 1,
      totalWorkingSets,
      currentEstimated1RM: latest.bestEstimated1RM,
      baselineEstimated1RM: latest.bestEstimated1RM,
      overallDelta1RM: 0,
      currentMaxWeight: latest.maxWeight,
      baselineMaxWeight: latest.maxWeight,
      trend: 'unknown',
      trendDeltaPercent: null,
      trendReason: `Baseline established with ${latest.maxWeight} kg × ${latest.bestReps} reps (Est. 1RM: ${latest.bestEstimated1RM} kg). Complete additional workouts to track progression trends.`,
      isLimitedData: true,
      timeline,
    };
  }

  const previous = timeline[timeline.length - 2];
  const current1RM = latest.bestEstimated1RM;
  const prev1RM = previous.bestEstimated1RM;
  const baseline1RM = baseline.bestEstimated1RM;

  const delta1RM = current1RM - prev1RM;
  const trendDeltaPercent =
    prev1RM > 0 ? Math.round(((current1RM - prev1RM) / prev1RM) * 1000) / 10 : 0;

  let trend: ProgressionTrend = 'stable';
  let trendReason = '';

  if (trendDeltaPercent >= 2.5) {
    trend = 'improving';
    const sign = trendDeltaPercent > 0 ? '+' : '';
    trendReason = `Strength progressed: ${previous.maxWeight} kg → ${latest.maxWeight} kg (${sign}${trendDeltaPercent}% estimated 1RM improvement over previous session).`;
  } else if (trendDeltaPercent <= -2.5) {
    trend = 'declining';
    trendReason = `Recent working load was lower: ${latest.maxWeight} kg vs ${previous.maxWeight} kg (${trendDeltaPercent}% difference). Variations in performance across sessions are a normal part of training cycles.`;
  } else {
    trend = 'stable';
    trendReason = `Consistent performance maintained at ${latest.maxWeight} kg × ${latest.bestReps} reps (Est. 1RM: ${latest.bestEstimated1RM} kg).`;
  }

  return {
    exerciseId,
    exerciseName: resolvedName,
    isCustom,
    totalSessions,
    totalWorkingSets,
    currentEstimated1RM: current1RM,
    baselineEstimated1RM: baseline1RM,
    overallDelta1RM: current1RM - baseline1RM,
    currentMaxWeight: latest.maxWeight,
    baselineMaxWeight: baseline.maxWeight,
    trend,
    trendDeltaPercent,
    trendReason,
    isLimitedData: false,
    timeline,
  };
}

// ============================================================================
// TRAINING VOLUME
// ============================================================================

/**
 * Calculates session load volume, completed sets count, and total repetitions.
 * Handles supersets without double-counting nested stages.
 */
export function calculateSessionVolumeAndSets(session: WorkoutSession): {
  loadVolume: number;
  completedSets: number;
  totalReps: number;
  completedRounds: number;
} {
  let loadVolume = 0;
  let completedSets = 0;
  let totalReps = 0;
  let completedRounds = 0;

  if (!session || !Array.isArray(session.exercises)) {
    return { loadVolume, completedSets, totalReps, completedRounds };
  }

  for (const ex of session.exercises) {
    if (!ex || !Array.isArray(ex.sets)) continue;

    for (const set of ex.sets) {
      if (!set) continue;

      if (Array.isArray(set.stages) && set.stages.length > 0) {
        let anyStageCompleted = false;
        for (const stage of set.stages) {
          if (!stage || !stage.completed) continue;

          // Invalid negative weight or non-positive reps
          if ((stage.weight !== null && stage.weight < 0) || (stage.reps !== null && stage.reps <= 0)) {
            continue;
          }

          if (
            stage.weight !== null &&
            stage.weight > 0 &&
            stage.reps !== null &&
            stage.reps > 0
          ) {
            loadVolume += stage.weight * stage.reps;
            totalReps += stage.reps;
            completedSets += 1;
            anyStageCompleted = true;
          } else if (
            (stage.weight === null || stage.weight === 0) &&
            stage.reps !== null &&
            stage.reps > 0
          ) {
            // Bodyweight or zero-load stage with valid positive reps
            totalReps += stage.reps;
            completedSets += 1;
            anyStageCompleted = true;
          }
        }
        if (anyStageCompleted || set.completed) {
          completedRounds += 1;
        }
      } else {
        // Standalone set
        if (!set.completed) continue;

        // Invalid negative weight or non-positive reps
        if ((set.weight !== null && set.weight < 0) || (set.reps !== null && set.reps <= 0)) {
          continue;
        }

        if (
          set.weight !== null &&
          set.weight > 0 &&
          set.reps !== null &&
          set.reps > 0
        ) {
          loadVolume += set.weight * set.reps;
          totalReps += set.reps;
          completedSets += 1;
          completedRounds += 1;
        } else if (
          (set.weight === null || set.weight === 0) &&
          set.reps !== null &&
          set.reps > 0
        ) {
          // Bodyweight set with null or 0 weight and valid positive reps
          totalReps += set.reps;
          completedSets += 1;
          completedRounds += 1;
        }
      }
    }
  }

  return { loadVolume, completedSets, totalReps, completedRounds };
}

/**
 * Calculates comprehensive training volume analytics across completed sessions.
 */
export function getVolumeAnalytics(
  history: WorkoutSession[],
  timeRange: AnalyticsTimeRange = 'all',
  now: Date = new Date()
): VolumeAnalytics {
  const completedSessions = filterCompletedSessions(history, 'asc');
  const filteredSessions = filterSessionsByTimeRange(completedSessions, timeRange, now);

  let totalLoadVolume = 0;
  let totalCompletedSets = 0;
  let totalReps = 0;

  const exerciseVolumeMap = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      isCustom: boolean;
      primaryMuscle?: MuscleGroup;
      loadVolume: number;
      setsCount: number;
      repsCount: number;
    }
  >();

  const volumeTimeline: VolumeAnalytics['volumeTimeline'] = [];
  const weeklyMap = new Map<
    string,
    {
      weekStart: Date;
      weekEnd: Date;
      weekLabel: string;
      loadVolume: number;
      completedSets: number;
      workoutCount: number;
    }
  >();

  for (const session of filteredSessions) {
    const sessionDate = parseLocalDate(session.completedAt || session.date);
    const { loadVolume, completedSets, totalReps: sessionReps } = calculateSessionVolumeAndSets(session);

    totalLoadVolume += loadVolume;
    totalCompletedSets += completedSets;
    totalReps += sessionReps;

    volumeTimeline.push({
      date: session.completedAt || session.date,
      sessionId: session.id,
      workoutName: session.workoutName || 'Workout Session',
      loadVolume,
      completedSets,
      totalReps: sessionReps,
    });

    // Weekly grouping
    const monday = getMondayOfWeek(sessionDate);
    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sunday = getSundayOfWeek(monday);

    const existingWeek = weeklyMap.get(weekKey);
    if (!existingWeek) {
      weeklyMap.set(weekKey, {
        weekStart: monday,
        weekEnd: sunday,
        weekLabel: formatWeekLabel(monday, sunday),
        loadVolume,
        completedSets,
        workoutCount: 1,
      });
    } else {
      existingWeek.loadVolume += loadVolume;
      existingWeek.completedSets += completedSets;
      existingWeek.workoutCount += 1;
    }

    // Exercise-level volume aggregation
    for (const ex of session.exercises || []) {
      if (!ex) continue;
      const exId = ex.exerciseId || (ex.exercise && ex.exercise.id);
      if (!exId) continue;

      for (const set of ex.sets || []) {
        if (Array.isArray(set.stages) && set.stages.length > 0) {
          for (const st of set.stages) {
            if (st.completed && st.weight && st.weight > 0 && st.reps && st.reps > 0) {
              const stId = st.exerciseId;
              const vol = st.weight * st.reps;
              const entry = exerciseVolumeMap.get(stId) || {
                exerciseId: stId,
                exerciseName: st.exerciseName || 'Exercise',
                isCustom: stId.startsWith('custom_'),
                loadVolume: 0,
                setsCount: 0,
                repsCount: 0,
              };
              entry.loadVolume += vol;
              entry.setsCount += 1;
              entry.repsCount += st.reps;
              exerciseVolumeMap.set(stId, entry);
            }
          }
        } else if (set.completed && set.weight && set.weight > 0 && set.reps && set.reps > 0) {
          const exAny = ex as any;
          const vol = set.weight * set.reps;
          const entry = exerciseVolumeMap.get(exId) || {
            exerciseId: exId,
            exerciseName: ex.exercise?.name || exAny.exerciseName || 'Exercise',
            isCustom: exId.startsWith('custom_') || Boolean(ex.exercise?.isCustom),
            primaryMuscle: ex.exercise?.primaryMuscle,
            loadVolume: 0,
            setsCount: 0,
            repsCount: 0,
          };
          entry.loadVolume += vol;
          entry.setsCount += 1;
          entry.repsCount += set.reps;
          if (!entry.primaryMuscle && ex.exercise?.primaryMuscle) {
            entry.primaryMuscle = ex.exercise.primaryMuscle;
          }
          exerciseVolumeMap.set(exId, entry);
        }
      }
    }
  }

  const weeklyVolume: WeeklyVolumePoint[] = Array.from(weeklyMap.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([_, w]) => ({
      weekStart: w.weekStart.toISOString(),
      weekEnd: w.weekEnd.toISOString(),
      weekLabel: w.weekLabel,
      loadVolume: w.loadVolume,
      completedSets: w.completedSets,
      workoutCount: w.workoutCount,
    }));

  const averageVolumePerWorkout =
    filteredSessions.length > 0 ? Math.round(totalLoadVolume / filteredSessions.length) : 0;

  const volumeByExercise = Array.from(exerciseVolumeMap.values()).sort(
    (a, b) => b.loadVolume - a.loadVolume
  );

  return {
    totalLoadVolume,
    totalCompletedSets,
    totalReps,
    averageVolumePerWorkout,
    volumeByExercise,
    volumeTimeline,
    weeklyVolume,
  };
}

// ============================================================================
// TRAINING CONSISTENCY
// ============================================================================

/**
 * Calculates training consistency, workout frequency, streaks, and weekly adherence.
 *
 * Explicit Streak Rules:
 * - Daily Streak: Count of consecutive active days with at least 1 completed workout.
 *   Requires a completed workout today or yesterday to remain active.
 * - Weekly Streak: Count of consecutive calendar weeks (Mon-Sun) with at least 1 completed workout.
 *   Requires a completed workout in the current calendar week or previous calendar week to remain active.
 */
export function getTrainingConsistencyAnalytics(
  history: WorkoutSession[],
  weeklyPlan?: WeeklySchedule,
  targetDaysPerWeek: number = 4,
  now: Date = new Date()
): TrainingConsistencyAnalytics {
  const completedSessions = filterCompletedSessions(history, 'desc'); // newest first
  const totalWorkouts = completedSessions.length;

  if (totalWorkouts === 0) {
    return {
      totalWorkouts: 0,
      workoutsLast7Days: 0,
      workoutsLast30Days: 0,
      weeklyAverageWorkouts: 0,
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      hasTrainedToday: false,
      currentWeeklyStreak: 0,
      longestWeeklyStreak: 0,
      weeklyBreakdown: [],
    };
  }

  // Determine target days per week from weekly plan if available
  let scheduledDaysCount = targetDaysPerWeek;
  if (weeklyPlan) {
    const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const nonRestDays = days.filter((d) => weeklyPlan[d] && !weeklyPlan[d].isRest).length;
    if (nonRestDays > 0) {
      scheduledDaysCount = nonRestDays;
    }
  }

  // Collect unique dates (YYYY-MM-DD)
  const uniqueDateSet = new Set<string>();
  const dateToSessions = new Map<string, WorkoutSession[]>();

  for (const s of completedSessions) {
    const d = parseLocalDate(s.completedAt || s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    uniqueDateSet.add(key);
    const existing = dateToSessions.get(key) || [];
    existing.push(s);
    dateToSessions.set(key, existing);
  }

  const sortedDatesDesc = Array.from(uniqueDateSet).sort().reverse();

  // Helper date strings
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const hasTrainedToday = uniqueDateSet.has(todayKey);

  // Recent training frequency
  const time7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
  const time30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();

  let workoutsLast7Days = 0;
  let workoutsLast30Days = 0;

  for (const s of completedSessions) {
    const t = parseLocalDate(s.completedAt || s.date).getTime();
    if (t >= time7DaysAgo) workoutsLast7Days++;
    if (t >= time30DaysAgo) workoutsLast30Days++;
  }

  // 1. Daily Streak Calculation
  let currentDailyStreak = 0;
  const isDailyStreakActive = uniqueDateSet.has(todayKey) || uniqueDateSet.has(yesterdayKey);

  if (isDailyStreakActive) {
    let checkDate = uniqueDateSet.has(todayKey) ? new Date(now) : new Date(yesterday);
    while (true) {
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (uniqueDateSet.has(key)) {
        currentDailyStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest daily streak across all history
  let longestDailyStreak = currentDailyStreak;
  const sortedDatesAsc = Array.from(uniqueDateSet).sort();
  let tempDailyStreak = 0;
  let prevDateObj: Date | null = null;

  for (const dateStr of sortedDatesAsc) {
    const curr = parseLocalDate(dateStr);
    if (!prevDateObj) {
      tempDailyStreak = 1;
    } else {
      const diffDays = Math.round((curr.getTime() - prevDateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempDailyStreak++;
      } else {
        tempDailyStreak = 1;
      }
    }
    if (tempDailyStreak > longestDailyStreak) {
      longestDailyStreak = tempDailyStreak;
    }
    prevDateObj = curr;
  }

  // 2. Weekly Consistency & Breakdown
  // Collect all weeks into a map
  const weeklyMap = new Map<string, { weekStart: Date; weekEnd: Date; count: number }>();
  for (const s of completedSessions) {
    const d = parseLocalDate(s.completedAt || s.date);
    const monday = getMondayOfWeek(d);
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const entry = weeklyMap.get(key) || {
      weekStart: monday,
      weekEnd: getSundayOfWeek(monday),
      count: 0,
    };
    entry.count++;
    weeklyMap.set(key, entry);
  }

  // Current Weekly Streak: consecutive calendar weeks with at least 1 workout
  const currentMonday = getMondayOfWeek(now);
  const currentWeekKey = `${currentMonday.getFullYear()}-${String(currentMonday.getMonth() + 1).padStart(2, '0')}-${String(currentMonday.getDate()).padStart(2, '0')}`;

  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);
  const prevWeekKey = `${prevMonday.getFullYear()}-${String(prevMonday.getMonth() + 1).padStart(2, '0')}-${String(prevMonday.getDate()).padStart(2, '0')}`;

  let currentWeeklyStreak = 0;
  const isWeeklyStreakActive = weeklyMap.has(currentWeekKey) || weeklyMap.has(prevWeekKey);

  if (isWeeklyStreakActive) {
    let checkMonday = weeklyMap.has(currentWeekKey) ? new Date(currentMonday) : new Date(prevMonday);
    while (true) {
      const key = `${checkMonday.getFullYear()}-${String(checkMonday.getMonth() + 1).padStart(2, '0')}-${String(checkMonday.getDate()).padStart(2, '0')}`;
      if (weeklyMap.has(key)) {
        currentWeeklyStreak++;
        checkMonday.setDate(checkMonday.getDate() - 7);
      } else {
        break;
      }
    }
  }

  // Longest weekly streak
  const sortedWeekKeys = Array.from(weeklyMap.keys()).sort();
  let longestWeeklyStreak = currentWeeklyStreak;
  let tempWeekStreak = 0;
  let prevWeekMonday: Date | null = null;

  for (const wKey of sortedWeekKeys) {
    const currMonday = parseLocalDate(wKey);
    if (!prevWeekMonday) {
      tempWeekStreak = 1;
    } else {
      const diffWeeks = Math.round((currMonday.getTime() - prevWeekMonday.getTime()) / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks === 1) {
        tempWeekStreak++;
      } else {
        tempWeekStreak = 1;
      }
    }
    if (tempWeekStreak > longestWeeklyStreak) {
      longestWeeklyStreak = tempWeekStreak;
    }
    prevWeekMonday = currMonday;
  }

  // Generate 8-week breakdown for display (from current week going back 7 weeks)
  const weeklyBreakdown: WeeklyConsistencyPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekMon = new Date(currentMonday);
    weekMon.setDate(currentMonday.getDate() - i * 7);
    const key = `${weekMon.getFullYear()}-${String(weekMon.getMonth() + 1).padStart(2, '0')}-${String(weekMon.getDate()).padStart(2, '0')}`;
    const sun = getSundayOfWeek(weekMon);
    const entry = weeklyMap.get(key);
    const completedCount = entry ? entry.count : 0;

    weeklyBreakdown.push({
      weekStart: weekMon.toISOString(),
      weekEnd: sun.toISOString(),
      weekLabel: formatWeekLabel(weekMon, sun),
      completedCount,
      targetCount: scheduledDaysCount,
      isMet: completedCount >= scheduledDaysCount,
    });
  }

  // Average workouts per active week
  const activeWeeksCount = weeklyMap.size;
  const weeklyAverageWorkouts =
    activeWeeksCount > 0 ? Math.round((totalWorkouts / activeWeeksCount) * 10) / 10 : 0;

  return {
    totalWorkouts,
    workoutsLast7Days,
    workoutsLast30Days,
    weeklyAverageWorkouts,
    currentDailyStreak,
    longestDailyStreak,
    hasTrainedToday,
    currentWeeklyStreak,
    longestWeeklyStreak,
    weeklyBreakdown,
  };
}

// ============================================================================
// MUSCLE-GROUP COVERAGE
// ============================================================================

const STANDARD_MUSCLE_GROUPS: Array<{ key: MuscleGroup; name: string }> = [
  { key: 'chest', name: 'Chest' },
  { key: 'back', name: 'Back' },
  { key: 'shoulders', name: 'Shoulders' },
  { key: 'biceps', name: 'Biceps' },
  { key: 'triceps', name: 'Triceps' },
  { key: 'legs', name: 'Legs (Quads/Hamstrings)' },
  { key: 'glutes', name: 'Glutes' },
  { key: 'calves', name: 'Calves' },
  { key: 'core', name: 'Core' },
  { key: 'forearms', name: 'Forearms' },
];

/**
 * Calculates muscle group coverage from completed training sessions.
 *
 * Rules:
 * - Primary muscle gets 1.0 direct set per valid completed set.
 * - Secondary muscles get 0.5 set contribution.
 * - Effective sets = directSets + 0.5 * secondarySets.
 * - Avoids double counting muscle load volume.
 */
export function getMuscleGroupCoverageAnalytics(
  history: WorkoutSession[],
  exercises: Exercise[],
  timeRange: AnalyticsTimeRange = '30d',
  weeklyPlan?: WeeklySchedule,
  now: Date = new Date()
): MuscleGroupVolumeCoverage[] {
  const completedSessions = filterCompletedSessions(history, 'asc');
  const filteredSessions = filterSessionsByTimeRange(completedSessions, timeRange, now);

  const exerciseMap = new Map<string, Exercise>();
  for (const ex of exercises) {
    if (ex && ex.id) {
      exerciseMap.set(ex.id, ex);
    }
  }

  // Scheduled muscle groups in user's active split
  const scheduledMuscles = new Set<string>();
  if (weeklyPlan) {
    const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const d of days) {
      const cfg = weeklyPlan[d];
      if (cfg && !cfg.isRest && Array.isArray(cfg.muscleGroups)) {
        for (const mg of cfg.muscleGroups) {
          if (mg && mg.name) {
            scheduledMuscles.add(mg.name.toLowerCase());
          }
        }
      }
    }
  }

  interface MuscleAccumulator {
    directSets: number;
    secondarySets: number;
    loadVolume: number;
    exerciseNames: Set<string>;
    lastTrainedDate: Date | null;
  }

  const accumulators = new Map<MuscleGroup, MuscleAccumulator>();
  for (const mg of STANDARD_MUSCLE_GROUPS) {
    accumulators.set(mg.key, {
      directSets: 0,
      secondarySets: 0,
      loadVolume: 0,
      exerciseNames: new Set(),
      lastTrainedDate: null,
    });
  }

  for (const session of filteredSessions) {
    const sessionDate = parseLocalDate(session.completedAt || session.date);

    for (const exItem of session.exercises || []) {
      if (!exItem) continue;

      const exAny = exItem as any;
      const exDef =
        (exItem.exerciseId && exerciseMap.get(exItem.exerciseId)) ||
        exItem.exercise;

      const rawPrimary = (exDef?.primaryMuscle || exAny.primaryMuscle || '').toLowerCase();
      const primaryMuscle: MuscleGroup =
        rawPrimary === 'quads' || rawPrimary === 'hamstrings'
          ? 'legs'
          : (rawPrimary as MuscleGroup);

      const secondaryMuscles: MuscleGroup[] = (exDef?.secondaryMuscles || []).map((m: string) => {
        const lower = m.toLowerCase();
        return lower === 'quads' || lower === 'hamstrings' ? 'legs' : (lower as MuscleGroup);
      });

      // Collect completed sets and stages for this exercise
      for (const set of exItem.sets || []) {
        if (!set) continue;

        if (Array.isArray(set.stages) && set.stages.length > 0) {
          // Combination stages
          for (const st of set.stages) {
            if (st.completed && st.weight && st.weight > 0 && st.reps && st.reps > 0) {
              const stageDef = exerciseMap.get(st.exerciseId);
              const stageRawPrimary = (stageDef?.primaryMuscle || '').toLowerCase();
              const stagePrimary: MuscleGroup =
                stageRawPrimary === 'quads' || stageRawPrimary === 'hamstrings'
                  ? 'legs'
                  : (stageRawPrimary as MuscleGroup);

              const stageSecondary: MuscleGroup[] = (stageDef?.secondaryMuscles || []).map((m: string) => {
                const lower = m.toLowerCase();
                return lower === 'quads' || lower === 'hamstrings' ? 'legs' : (lower as MuscleGroup);
              });

              if (accumulators.has(stagePrimary)) {
                const acc = accumulators.get(stagePrimary)!;
                acc.directSets += 1;
                acc.loadVolume += st.weight * st.reps;
                acc.exerciseNames.add(st.exerciseName || stageDef?.name || 'Exercise');
                if (!acc.lastTrainedDate || sessionDate > acc.lastTrainedDate) {
                  acc.lastTrainedDate = sessionDate;
                }
              }

              for (const sec of stageSecondary) {
                if (accumulators.has(sec) && sec !== stagePrimary) {
                  const acc = accumulators.get(sec)!;
                  acc.secondarySets += 1;
                }
              }
            }
          }
        } else if (set.completed && set.weight && set.weight > 0 && set.reps && set.reps > 0) {
          // Standalone set
          if (accumulators.has(primaryMuscle)) {
            const acc = accumulators.get(primaryMuscle)!;
            acc.directSets += 1;
            acc.loadVolume += set.weight * set.reps;
            acc.exerciseNames.add(exDef?.name || exAny.exerciseName || 'Exercise');
            if (!acc.lastTrainedDate || sessionDate > acc.lastTrainedDate) {
              acc.lastTrainedDate = sessionDate;
            }
          }

          for (const sec of secondaryMuscles) {
            if (accumulators.has(sec) && sec !== primaryMuscle) {
              const acc = accumulators.get(sec)!;
              acc.secondarySets += 1;
            }
          }
        }
      }
    }
  }

  return STANDARD_MUSCLE_GROUPS.map((mg) => {
    const acc = accumulators.get(mg.key)!;
    const effectiveSets = Math.round((acc.directSets + 0.5 * acc.secondarySets) * 10) / 10;

    let daysSinceLastTrained: number | null = null;
    let lastTrainedDateStr: string | null = null;

    if (acc.lastTrainedDate) {
      lastTrainedDateStr = acc.lastTrainedDate.toISOString();
      const diffMs = now.getTime() - acc.lastTrainedDate.getTime();
      daysSinceLastTrained = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      muscleGroup: mg.key,
      displayName: mg.name,
      directSets: acc.directSets,
      secondarySets: acc.secondarySets,
      effectiveSets,
      loadVolume: acc.loadVolume,
      exerciseCount: acc.exerciseNames.size,
      exerciseNames: Array.from(acc.exerciseNames),
      lastTrainedDate: lastTrainedDateStr,
      daysSinceLastTrained,
      scheduledInSplit: scheduledMuscles.has(mg.key.toLowerCase()),
    };
  });
}

// ============================================================================
// PERSONAL RECORDS
// ============================================================================

/**
 * Derives accurate Personal Records from real completed session history.
 * Groups strictly by exercise ID (never merges distinct exercises with similar names).
 * Handles custom exercises and superset stages.
 */
export function derivePersonalRecords(
  history: WorkoutSession[],
  exercises: Exercise[] = []
): PersonalRecordSummary[] {
  const completedSessions = filterCompletedSessions(history, 'asc');

  const exerciseMap = new Map<string, Exercise>();
  for (const ex of exercises) {
    if (ex && ex.id) {
      exerciseMap.set(ex.id, ex);
    }
  }

  interface RecordTracker {
    exerciseId: string;
    exerciseName: string;
    isCustom: boolean;
    primaryMuscle?: MuscleGroup;
    maxWeight: { value: number; reps: number; date: string; workoutName: string };
    max1RM: { estimated1RM: number; weight: number; reps: number; date: string; workoutName: string };
    maxReps: { reps: number; weight: number; date: string; workoutName: string };
    maxVolumeSession: { volume: number; sets: number; date: string; workoutName: string };
  }

  const recordsMap = new Map<string, RecordTracker>();

  for (const session of completedSessions) {
    const sessionDate = session.completedAt || session.date;
    const workoutName = session.workoutName || 'Workout Session';

    // Track volume per exercise within this single session
    const sessionExVolume = new Map<string, { volume: number; sets: number }>();

    for (const exItem of session.exercises || []) {
      if (!exItem) continue;

      for (const set of exItem.sets || []) {
        if (!set) continue;

        if (Array.isArray(set.stages) && set.stages.length > 0) {
          for (const st of set.stages) {
            if (st.completed && st.weight && st.weight > 0 && st.reps && st.reps > 0) {
              const exId = st.exerciseId;
              const w = st.weight;
              const r = st.reps;
              const est1RM = calculateEstimated1RM(w, r);
              const vol = w * r;

              // Update session volume accumulator
              const curVol = sessionExVolume.get(exId) || { volume: 0, sets: 0 };
              curVol.volume += vol;
              curVol.sets += 1;
              sessionExVolume.set(exId, curVol);

              let rec = recordsMap.get(exId);
              if (!rec) {
                const exDef = exerciseMap.get(exId);
                rec = {
                  exerciseId: exId,
                  exerciseName: st.exerciseName || exDef?.name || 'Exercise',
                  isCustom: exId.startsWith('custom_') || Boolean(exDef?.isCustom),
                  primaryMuscle: exDef?.primaryMuscle,
                  maxWeight: { value: w, reps: r, date: sessionDate, workoutName },
                  max1RM: { estimated1RM: est1RM, weight: w, reps: r, date: sessionDate, workoutName },
                  maxReps: { reps: r, weight: w, date: sessionDate, workoutName },
                  maxVolumeSession: { volume: vol, sets: 1, date: sessionDate, workoutName },
                };
                recordsMap.set(exId, rec);
              } else {
                if (w > rec.maxWeight.value) {
                  rec.maxWeight = { value: w, reps: r, date: sessionDate, workoutName };
                }
                if (est1RM > rec.max1RM.estimated1RM) {
                  rec.max1RM = { estimated1RM: est1RM, weight: w, reps: r, date: sessionDate, workoutName };
                }
                if (r > rec.maxReps.reps) {
                  rec.maxReps = { reps: r, weight: w, date: sessionDate, workoutName };
                }
              }
            }
          }
        } else if (set.completed && set.weight && set.weight > 0 && set.reps && set.reps > 0) {
          const exId = exItem.exerciseId || (exItem.exercise && exItem.exercise.id);
          if (!exId) continue;

          const w = set.weight;
          const r = set.reps;
          const est1RM = calculateEstimated1RM(w, r);
          const vol = w * r;

          const curVol = sessionExVolume.get(exId) || { volume: 0, sets: 0 };
          curVol.volume += vol;
          curVol.sets += 1;
          sessionExVolume.set(exId, curVol);

          let rec = recordsMap.get(exId);
          if (!rec) {
            const exAny = exItem as any;
            const exDef = exerciseMap.get(exId) || exItem.exercise;
            rec = {
              exerciseId: exId,
              exerciseName: exDef?.name || exAny.exerciseName || 'Exercise',
              isCustom: exId.startsWith('custom_') || Boolean(exDef?.isCustom),
              primaryMuscle: exDef?.primaryMuscle || (exAny.primaryMuscle as MuscleGroup),
              maxWeight: { value: w, reps: r, date: sessionDate, workoutName },
              max1RM: { estimated1RM: est1RM, weight: w, reps: r, date: sessionDate, workoutName },
              maxReps: { reps: r, weight: w, date: sessionDate, workoutName },
              maxVolumeSession: { volume: vol, sets: 1, date: sessionDate, workoutName },
            };
            recordsMap.set(exId, rec);
          } else {
            if (w > rec.maxWeight.value) {
              rec.maxWeight = { value: w, reps: r, date: sessionDate, workoutName };
            }
            if (est1RM > rec.max1RM.estimated1RM) {
              rec.max1RM = { estimated1RM: est1RM, weight: w, reps: r, date: sessionDate, workoutName };
            }
            if (r > rec.maxReps.reps) {
              rec.maxReps = { reps: r, weight: w, date: sessionDate, workoutName };
            }
          }
        }
      }
    }

    // Check session max volume
    for (const [exId, volData] of sessionExVolume.entries()) {
      const rec = recordsMap.get(exId);
      if (rec && volData.volume > rec.maxVolumeSession.volume) {
        rec.maxVolumeSession = {
          volume: volData.volume,
          sets: volData.sets,
          date: sessionDate,
          workoutName,
        };
      }
    }
  }

  return Array.from(recordsMap.values()).map((r) => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    isCustom: r.isCustom,
    primaryMuscle: r.primaryMuscle,
    maxWeight: r.maxWeight,
    max1RM: r.max1RM,
    maxReps: r.maxReps,
    maxVolumeSession: r.maxVolumeSession,
  }));
}

/**
 * Extracts recent milestones from the latest sessions.
 */
export function getRecentMilestones(
  history: WorkoutSession[],
  limit: number = 5
): MilestoneSummary[] {
  const completedSessions = filterCompletedSessions(history, 'desc'); // newest first
  const milestones: MilestoneSummary[] = [];

  for (const session of completedSessions) {
    if (Array.isArray(session.newPRs) && session.newPRs.length > 0) {
      for (const pr of session.newPRs) {
        let badge = 'PR Hit';
        let title = `${pr.exerciseName}: ${pr.weight} kg × ${pr.reps} reps`;
        let subtitle = pr.details || `Estimated 1RM: ${pr.estimated1RM} kg`;

        if (pr.prCategory === 'max_weight') {
          badge = 'Heaviest Weight';
        } else if (pr.prCategory === 'max_1rm') {
          badge = 'Strength PR';
        } else if (pr.prCategory === 'max_reps') {
          badge = 'Rep Record';
        } else if (pr.prCategory === 'baseline') {
          badge = 'Baseline Logged';
        }

        milestones.push({
          id: pr.id || `m_${Math.random()}`,
          exerciseId: pr.exerciseId,
          exerciseName: pr.exerciseName,
          title,
          subtitle,
          date: pr.date || session.completedAt || session.date,
          badge,
        });

        if (milestones.length >= limit) return milestones;
      }
    }
  }

  return milestones;
}

// ============================================================================
// COMPREHENSIVE ANALYTICS SUMMARY
// ============================================================================

export function getComprehensiveAnalytics(
  history: WorkoutSession[],
  exercises: Exercise[] = [],
  weeklyPlan?: WeeklySchedule,
  targetDaysPerWeek: number = 4,
  timeRange: AnalyticsTimeRange = '30d',
  now: Date = new Date()
): ComprehensiveAnalyticsSummary {
  const consistency = getTrainingConsistencyAnalytics(history, weeklyPlan, targetDaysPerWeek, now);
  const volume = getVolumeAnalytics(history, timeRange, now);
  const muscleCoverage = getMuscleGroupCoverageAnalytics(history, exercises, timeRange, weeklyPlan, now);
  const personalRecords = derivePersonalRecords(history, exercises);
  const recentMilestones = getRecentMilestones(history, 6);

  return {
    consistency,
    volume,
    muscleCoverage,
    personalRecords,
    recentMilestones,
  };
}
