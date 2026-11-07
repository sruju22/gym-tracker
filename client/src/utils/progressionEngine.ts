/**
 * GymTrackie — Phase 7: Smart Training Progression & Plateau Detection Engine
 *
 * Deterministic utility that:
 * 1. Analyzes exercise-level working sets and estimated 1RM trajectories over time.
 * 2. Distinguishes bodyweight exercises (rep-based) from externally loaded lifts (load-based).
 * 3. Classifies training status: 'insufficient_data', 'progressing', 'fluctuating',
 *    'potential_plateau', 'deload_or_regressing', and 'dormant'.
 * 4. Strictly guards against false plateaus (requires >= 3 exposures, recency check <= 60 days,
 *    and recognizes double progression repetition gains as active progression).
 * 5. Provides evidence-backed, conservative progression recommendations without biological overclaims.
 */

import {
  WorkoutSession,
  Exercise,
  Equipment,
  MuscleGroup,
  UnifiedProgressionDecision,
  AdaptiveTrainingDecision,
  WeeklySchedule,
  MuscleIntelligenceSummary,
  EquipmentIncrementSettings,
} from '../types';
import { calculate1RM } from './oneRM';
import { parseLocalDate, formatDateShort } from './formatters';
import { evaluateUnifiedProgression } from './unifiedProgression';
import { evaluateAdaptiveDecision } from './adaptiveDecisionEngine';

export type ProgressionStatus =
  | 'insufficient_data'
  | 'progressing'
  | 'fluctuating'
  | 'potential_plateau'
  | 'deload_or_regressing'
  | 'dormant';

export type PlateauSeverity = 'none' | 'watch' | 'confirmed';

export interface WorkingSetDetail {
  weight: number;
  reps: number;
  estimated1RM: number;
  isSupersetStage: boolean;
}

export interface ExerciseSessionExposure {
  sessionId: string;
  date: string;
  workoutName: string;
  daysAgo: number;
  topSet: {
    weight: number;
    reps: number;
    estimated1RM: number;
    isBodyweight: boolean;
  };
  workingSets: WorkingSetDetail[];
  totalVolume: number;
  totalReps: number;
  avgWeight: number;
  completedSetsCount: number;
}

export type ProgressionRecommendationType =
  | 'continue_load'
  | 'double_progression_increase'
  | 'double_progression_consolidate'
  | 'plateau_microload'
  | 'plateau_volume_adjust'
  | 'plateau_rep_range_rotation'
  | 'maintain_baseline';

export interface ProgressionRecommendation {
  type: ProgressionRecommendationType;
  title: string;
  actionText: string;
  suggestedLoadChangeKg?: number | null;
  suggestedRepTarget?: number | null;
  rationale: string;
}

export interface ExerciseProgressionReport {
  exerciseId: string;
  exerciseName: string;
  equipment: Equipment;
  primaryMuscle?: MuscleGroup;
  isBodyweight: boolean;
  isCustom: boolean;
  totalExposures: number;
  recentExposuresCount: number;
  status: ProgressionStatus;
  statusLabel: string;
  plateauSeverity: PlateauSeverity;
  stallDurationSessions: number;
  lastPerformedDate: string | null;
  daysSinceLastPerformed: number | null;

  baselineExposure: ExerciseSessionExposure | null;
  latestExposure: ExerciseSessionExposure | null;
  bestExposure: ExerciseSessionExposure | null;

  metricDeltas: {
    weightDeltaKg: number;
    repsAtTopWeightDelta: number;
    estimated1RMDelta: number;
    estimated1RMDeltaPercent: number | null;
    volumeDeltaPercent: number | null;
  };

  evidence: {
    headline: string;
    details: string[];
    isRecencyGuarded: boolean;
    hasSufficientData: boolean;
  };

  recommendation: ProgressionRecommendation;
  decision?: UnifiedProgressionDecision;
  adaptiveDecision?: AdaptiveTrainingDecision;
  exposures: ExerciseSessionExposure[];
}

export interface RoutineProgressionSummary {
  totalAnalyzedExercises: number;
  progressingCount: number;
  plateauCount: number;
  fluctuatingCount: number;
  insufficientDataCount: number;
  dormantCount: number;
  plateauedExercises: ExerciseProgressionReport[];
  topProgressingExercises: ExerciseProgressionReport[];
}

export interface AnalyzeProgressionOptions {
  referenceDate?: Date;
  weightUnit?: 'kg' | 'lbs';
  minExposuresForPlateau?: number; // default: 3
  dormantThresholdDays?: number; // default: 60
  equipmentIncrements?: EquipmentIncrementSettings;
  goal?: string;
  appliedTarget?: { targetWeight: number | null; targetReps: number; appliedAt?: string } | null;
  weeklyPlan?: WeeklySchedule;
  exercises?: Exercise[];
  precomputedMuscleIntelligence?: MuscleIntelligenceSummary;
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
}

/**
 * Normalizes weight to kg if input was in lbs.
 */
export function normalizeWeightToKg(weight: number, fromUnit: 'kg' | 'lbs' = 'kg'): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  if (fromUnit === 'lbs') {
    return Math.round(weight * 0.45359237 * 100) / 100;
  }
  return weight;
}

/**
 * Extracts valid working sets for an exercise from a single completed session.
 * Excludes incomplete sets, negative weights, or 0 reps.
 */
export function extractValidExerciseSets(
  session: WorkoutSession,
  targetExerciseId: string,
  weightUnit: 'kg' | 'lbs' = 'kg'
): WorkingSetDetail[] {
  if (!session || session.status !== 'completed' || !Array.isArray(session.exercises)) {
    return [];
  }

  const results: WorkingSetDetail[] = [];

  for (const exItem of session.exercises) {
    if (!exItem || !Array.isArray(exItem.sets)) continue;

    const isDirectMatch =
      exItem.exerciseId === targetExerciseId ||
      (exItem.exercise && exItem.exercise.id === targetExerciseId);

    for (const set of exItem.sets) {
      if (!set || !set.completed) continue;

      // Handle superset / combination stages
      if (Array.isArray(set.stages) && set.stages.length > 0) {
        for (const stage of set.stages) {
          if (stage.exerciseId === targetExerciseId && stage.completed) {
            const rawReps = stage.reps;
            if (rawReps === null || rawReps === undefined || rawReps <= 0 || !Number.isFinite(rawReps)) {
              continue;
            }
            const rawWeight = stage.weight ?? 0;
            if (rawWeight < 0 || !Number.isFinite(rawWeight)) continue;

            const w = normalizeWeightToKg(rawWeight, weightUnit);
            const r = Math.round(rawReps);
            const est1RM = w > 0 ? calculate1RM(w, r) : 0;

            results.push({
              weight: w,
              reps: r,
              estimated1RM: est1RM,
              isSupersetStage: true,
            });
          }
        }
      } else if (isDirectMatch) {
        // Standalone set
        const rawReps = set.reps;
        if (rawReps === null || rawReps === undefined || rawReps <= 0 || !Number.isFinite(rawReps)) {
          continue;
        }
        const rawWeight = set.weight ?? 0;
        if (rawWeight < 0 || !Number.isFinite(rawWeight)) continue;

        const w = normalizeWeightToKg(rawWeight, weightUnit);
        const r = Math.round(rawReps);
        const est1RM = w > 0 ? calculate1RM(w, r) : 0;

        results.push({
          weight: w,
          reps: r,
          estimated1RM: est1RM,
          isSupersetStage: false,
        });
      }
    }
  }

  return results;
}

/**
 * Analyzes progression and plateau status for a single exercise.
 */
export function analyzeExerciseProgression(
  history: WorkoutSession[],
  exercise: Exercise | { id: string; name?: string; equipment?: Equipment; primaryMuscle?: MuscleGroup; isCustom?: boolean },
  options: AnalyzeProgressionOptions = {}
): ExerciseProgressionReport {
  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const weightUnit = options.weightUnit || 'kg';
  const minExposures = options.minExposuresForPlateau ?? 3;
  const dormantDays = options.dormantThresholdDays ?? 60;

  const exerciseId = exercise.id;
  const exerciseName = exercise.name || exerciseId;
  const equipment = exercise.equipment || 'barbell';
  const isBodyweight = equipment === 'bodyweight';
  const isCustom = exercise.isCustom ?? exerciseId.startsWith('custom_');

  // Filter only completed workouts and sort chronologically (oldest to newest)
  const completedSessions = (Array.isArray(history) ? history : [])
    .filter((s) => s && s.status === 'completed')
    .sort((a, b) => {
      const dateA = parseLocalDate(a.completedAt || a.date).getTime();
      const dateB = parseLocalDate(b.completedAt || b.date).getTime();
      return dateA - dateB;
    });

  const exposures: ExerciseSessionExposure[] = [];

  for (const session of completedSessions) {
    const validSets = extractValidExerciseSets(session, exerciseId, weightUnit);
    if (validSets.length === 0) continue;

    const sDate = parseLocalDate(session.completedAt || session.date);
    const daysAgo = Math.max(0, Math.floor((refDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Determine top set: highest weight; if tied or bodyweight, highest reps
    let topSet = validSets[0];
    for (const s of validSets) {
      if (s.weight > topSet.weight) {
        topSet = s;
      } else if (s.weight === topSet.weight && s.reps > topSet.reps) {
        topSet = s;
      }
    }

    const totalReps = validSets.reduce((sum, s) => sum + s.reps, 0);
    const totalVolume = validSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const avgWeight =
      validSets.length > 0
        ? Math.round((validSets.reduce((sum, s) => sum + s.weight, 0) / validSets.length) * 10) / 10
        : 0;

    exposures.push({
      sessionId: session.id,
      date: session.completedAt || session.date,
      workoutName: session.workoutName || 'Workout Session',
      daysAgo,
      topSet: {
        weight: topSet.weight,
        reps: topSet.reps,
        estimated1RM: topSet.estimated1RM,
        isBodyweight,
      },
      workingSets: validSets,
      totalVolume,
      totalReps,
      avgWeight,
      completedSetsCount: validSets.length,
    });
  }

  const totalExposures = exposures.length;

  const decision = evaluateUnifiedProgression({
    exerciseId,
    exerciseName,
    exercise: exercise as Exercise,
    history: completedSessions,
    goal: options.goal,
    equipmentSettings: options.equipmentIncrements,
    appliedTarget: options.appliedTarget,
  });

  const adaptiveDecision = evaluateAdaptiveDecision({
    exerciseId,
    exerciseName,
    exercise: exercise as Exercise,
    history: completedSessions,
    weeklyPlan: options.weeklyPlan,
    goal: options.goal,
    equipmentSettings: options.equipmentIncrements,
    appliedTarget: options.appliedTarget,
    now: options.referenceDate,
    exercises: options.exercises,
    precomputedMuscleIntelligence: options.precomputedMuscleIntelligence,
  });

  // 1. EMPTY DATA / ZERO EXPOSURES
  if (totalExposures === 0) {
    return {
      exerciseId,
      exerciseName,
      equipment,
      primaryMuscle: exercise.primaryMuscle,
      isBodyweight,
      isCustom,
      totalExposures: 0,
      recentExposuresCount: 0,
      status: 'insufficient_data',
      statusLabel: 'Keep Logging Workouts',
      plateauSeverity: 'none',
      stallDurationSessions: 0,
      lastPerformedDate: null,
      daysSinceLastPerformed: null,
      baselineExposure: null,
      latestExposure: null,
      bestExposure: null,
      metricDeltas: {
        weightDeltaKg: 0,
        repsAtTopWeightDelta: 0,
        estimated1RMDelta: 0,
        estimated1RMDeltaPercent: null,
        volumeDeltaPercent: null,
      },
      evidence: {
        headline: 'No completed sets recorded for this exercise',
        details: [
          'Log 3 workouts with this exercise so we can track your progress more reliably.',
        ],
        isRecencyGuarded: false,
        hasSufficientData: false,
      },
      recommendation: {
        type: 'maintain_baseline',
        title: decision.title,
        actionText: decision.actionHeadline,
        suggestedLoadChangeKg: undefined,
        suggestedRepTarget: decision.recommendedReps,
        rationale: decision.reason,
      },
      decision,
      adaptiveDecision,
      exposures: [],
    };
  }

  const latest = exposures[exposures.length - 1];
  const baseline = exposures[0];

  // Best exposure based on estimated 1RM (or highest reps for bodyweight)
  let best = exposures[0];
  for (const exp of exposures) {
    if (isBodyweight) {
      if (exp.topSet.reps > best.topSet.reps) best = exp;
    } else {
      if (exp.topSet.estimated1RM > best.topSet.estimated1RM) {
        best = exp;
      } else if (exp.topSet.estimated1RM === best.topSet.estimated1RM && exp.topSet.weight > best.topSet.weight) {
        best = exp;
      }
    }
  }

  const daysSinceLast = latest.daysAgo;

  // Compute longitudinal deltas
  const weightDeltaKg = Math.round((latest.topSet.weight - baseline.topSet.weight) * 10) / 10;
  const repsAtTopWeightDelta = latest.topSet.reps - baseline.topSet.reps;
  const estimated1RMDelta = latest.topSet.estimated1RM - baseline.topSet.estimated1RM;

  let estimated1RMDeltaPercent: number | null = null;
  if (baseline.topSet.estimated1RM > 0) {
    estimated1RMDeltaPercent =
      Math.round(((latest.topSet.estimated1RM - baseline.topSet.estimated1RM) / baseline.topSet.estimated1RM) * 1000) / 10;
  }

  let volumeDeltaPercent: number | null = null;
  if (baseline.totalVolume > 0) {
    volumeDeltaPercent =
      Math.round(((latest.totalVolume - baseline.totalVolume) / baseline.totalVolume) * 1000) / 10;
  }

  // 2. RECENCY GUARD: DORMANT CHECK
  // If the last session was performed > dormantDays ago, it's NOT an active plateau
  if (daysSinceLast > dormantDays) {
    return {
      exerciseId,
      exerciseName,
      equipment,
      primaryMuscle: exercise.primaryMuscle,
      isBodyweight,
      isCustom,
      totalExposures,
      recentExposuresCount: 0,
      status: 'dormant',
      statusLabel: 'Not Trained Recently',
      plateauSeverity: 'none',
      stallDurationSessions: 0,
      lastPerformedDate: latest.date,
      daysSinceLastPerformed: daysSinceLast,
      baselineExposure: baseline,
      latestExposure: latest,
      bestExposure: best,
      metricDeltas: {
        weightDeltaKg,
        repsAtTopWeightDelta,
        estimated1RMDelta,
        estimated1RMDeltaPercent,
        volumeDeltaPercent,
      },
      evidence: {
        headline: `Last trained ${daysSinceLast} days ago (${formatDateShort(latest.date)})`,
        details: [
          'This exercise has not been trained in recent weeks. Tracking progress reliably requires regular workouts.',
          `Best previous workout was ${best.topSet.weight > 0 ? `${best.topSet.weight} kg × ` : ''}${best.topSet.reps} reps.`,
        ],
        isRecencyGuarded: true,
        hasSufficientData: totalExposures >= minExposures,
      },
      recommendation: {
        type: 'maintain_baseline',
        title: 'Ease Back In Gradually',
        actionText: 'Start with a lighter, comfortable weight to warm back up',
        rationale:
          'Because this exercise has been out of rotation for several weeks, restart with a comfortable working weight before trying to add more load.',
      },
      decision,
      adaptiveDecision,
      exposures,
    };
  }

  // 3. INSUFFICIENT DATA CHECK (Fewer than minExposures)
  if (totalExposures < minExposures) {
    const isSingleSession = totalExposures === 1;
    const progressTwoSessions =
      totalExposures === 2 &&
      (latest.topSet.weight > baseline.topSet.weight ||
        (latest.topSet.weight === baseline.topSet.weight && latest.topSet.reps > baseline.topSet.reps));

    const status: ProgressionStatus = progressTwoSessions ? 'progressing' : 'insufficient_data';
    const statusLabel = progressTwoSessions ? 'Making Progress' : 'Keep Logging Workouts';

    const needed = Math.max(1, minExposures - totalExposures);
    const neededText = needed === 1 ? 'one more workout' : `${needed} more workouts`;

    return {
      exerciseId,
      exerciseName,
      equipment,
      primaryMuscle: exercise.primaryMuscle,
      isBodyweight,
      isCustom,
      totalExposures,
      recentExposuresCount: totalExposures,
      status,
      statusLabel,
      plateauSeverity: 'none',
      stallDurationSessions: 0,
      lastPerformedDate: latest.date,
      daysSinceLastPerformed: daysSinceLast,
      baselineExposure: baseline,
      latestExposure: latest,
      bestExposure: best,
      metricDeltas: {
        weightDeltaKg,
        repsAtTopWeightDelta,
        estimated1RMDelta,
        estimated1RMDeltaPercent,
        volumeDeltaPercent,
      },
      evidence: {
        headline: isSingleSession
          ? `First workout logged: ${latest.topSet.weight > 0 ? `${latest.topSet.weight} kg × ` : ''}${latest.topSet.reps} reps`
          : `2 workouts logged: ${baseline.topSet.weight > 0 ? `${baseline.topSet.weight} kg × ` : ''}${baseline.topSet.reps} reps → ${latest.topSet.weight > 0 ? `${latest.topSet.weight} kg × ` : ''}${latest.topSet.reps} reps`,
        details: [
          `Logged ${totalExposures} of ${minExposures} workouts needed for reliable progress tracking.`,
          `Log ${neededText} with this exercise so we can track your progress more reliably.`,
        ],
        isRecencyGuarded: false,
        hasSufficientData: false,
      },
      recommendation: {
        type: 'maintain_baseline',
        title: 'Keep Logging Workouts',
        actionText: `Log ${neededText} with this exercise so we can track your progress more reliably.`,
        rationale: `We need at least ${minExposures} workouts with this exercise to spot trends and check whether your strength is increasing.`,
      },
      decision,
      adaptiveDecision,
      exposures,
    };
  }

  // 4. MULTI-EXPOSURE ANALYSIS (>= 3 exposures)
  // Inspect the last N exposures (3 or 4)
  const windowSize = Math.min(4, totalExposures);
  const recentWindow = exposures.slice(exposures.length - windowSize);
  const n = recentWindow.length;

  const exp1 = recentWindow[n - 3];
  const exp2 = recentWindow[n - 2];
  const exp3 = recentWindow[n - 1]; // latest

  let status: ProgressionStatus = 'fluctuating';
  let statusLabel = 'Normal Variation';
  let plateauSeverity: PlateauSeverity = 'none';
  let stallDurationSessions = 0;
  const evidenceDetails: string[] = [];

  // Determine trajectory across the recent 3 exposures
  const isLoaded = !isBodyweight && exp3.topSet.weight > 0;

  if (isLoaded) {
    const w1 = exp1.topSet.weight;
    const w2 = exp2.topSet.weight;
    const w3 = exp3.topSet.weight;
    const r1 = exp1.topSet.reps;
    const r2 = exp2.topSet.reps;
    const r3 = exp3.topSet.reps;
    const e1 = exp1.topSet.estimated1RM;
    const e2 = exp2.topSet.estimated1RM;
    const e3 = exp3.topSet.estimated1RM;

    // Check Case A: Progression (Weight increased, OR reps increased at same weight, OR 1RM up >= 2%)
    const isWeightUp = w3 > w1 && (w3 > w2 || (w3 === w2 && r3 >= r2));
    const isRepsUpAtSameWeight = w3 === w2 && w2 === w1 && r3 > r1 && r3 >= r2;
    const is1RMUp = e1 > 0 && ((e3 - e1) / e1) >= 0.02 && e3 >= e2;

    if (isWeightUp || isRepsUpAtSameWeight || is1RMUp) {
      status = 'progressing';
      statusLabel = 'Making Progress';
      plateauSeverity = 'none';
      stallDurationSessions = 0;

      if (isRepsUpAtSameWeight) {
        evidenceDetails.push(
          `Double progression: Kept weight at ${w3} kg while repetitions increased from ${r1} → ${r3} reps. Your muscles are adapting and getting stronger!`
        );
      } else if (isWeightUp) {
        evidenceDetails.push(
          `Working weight increased from ${w1} kg (${r1} reps) to ${w3} kg (${r3} reps). Great progress!`
        );
      } else {
        const pct = Math.round(((e3 - e1) / e1) * 100);
        evidenceDetails.push(
          `Estimated max strength improved by +${pct}% across recent workouts (${e1} kg → ${e3} kg).`
        );
      }
    } else {
      // Check Case B: Potential Plateau (Progress may have slowed)
      // Weight stagnant (difference <= 0.5 kg or 0%) AND reps stagnant/flat (r3 <= r1 and r2 <= r1)
      const isWeightStagnant = Math.abs(w3 - w1) <= 0.5 && Math.abs(w2 - w1) <= 0.5;
      const isRepsStagnantOrDown = r3 <= r1 && r2 <= r1;
      const is1RMStagnant = e1 > 0 ? Math.abs((e3 - e1) / e1) < 0.02 : true;

      if (isWeightStagnant && isRepsStagnantOrDown && is1RMStagnant) {
        status = 'potential_plateau';
        statusLabel = 'Progress May Have Slowed';
        stallDurationSessions = 3;

        // Check if 4th session was also stagnant
        if (n >= 4) {
          const exp0 = recentWindow[n - 4];
          if (Math.abs(exp0.topSet.weight - w3) <= 0.5 && exp3.topSet.reps <= exp0.topSet.reps) {
            stallDurationSessions = 4;
          }
        }

        plateauSeverity = stallDurationSessions >= 4 ? 'confirmed' : 'watch';
        evidenceDetails.push(
          `Progress may have slowed at ${w3} kg × ${r3} reps across ${stallDurationSessions} consecutive workouts (${formatDateShort(exp1.date)}, ${formatDateShort(exp2.date)}, ${formatDateShort(exp3.date)}).`
        );
        evidenceDetails.push(
          `Weight and reps have stayed steady across ${stallDurationSessions} workouts. It's completely normal for progress to slow down as you get stronger.`
        );
      } else if (w3 < w1 && (e1 > 0 && (e1 - e3) / e1 >= 0.06)) {
        // Drop of > 6% in estimated 1RM
        status = 'deload_or_regressing';
        statusLabel = 'Lighter Workout Recorded';
        plateauSeverity = 'none';
        evidenceDetails.push(
          `Working weight was lighter (${w1} kg down to ${w3} kg). Lighter workouts are normal during recovery or deload periods and help keep you injury-free.`
        );
      } else {
        // Normal minor fluctuations
        status = 'fluctuating';
        statusLabel = 'Normal Variation';
        plateauSeverity = 'none';
        evidenceDetails.push(
          `Recent workouts show normal day-to-day variations (${w1} kg × ${r1} reps → ${w2} kg × ${r2} reps → ${w3} kg × ${r3} reps). Daily energy, sleep, and recovery naturally cause minor changes.`
        );
      }
    }
  } else {
    // Bodyweight exercise (Rep-based progression)
    const r1 = exp1.topSet.reps;
    const r2 = exp2.topSet.reps;
    const r3 = exp3.topSet.reps;

    if (r3 > r1 && r3 >= r2) {
      status = 'progressing';
      statusLabel = 'Making Progress';
      plateauSeverity = 'none';
      evidenceDetails.push(
        `Bodyweight repetitions improved from ${r1} reps to ${r3} reps across recent workouts. Great work!`
      );
    } else if (r3 === r1 && r2 === r1) {
      status = 'potential_plateau';
      statusLabel = 'Progress May Have Slowed';
      stallDurationSessions = 3;
      plateauSeverity = 'watch';
      evidenceDetails.push(
        `Bodyweight repetitions have stayed steady at ${r3} reps across 3 workouts in a row.`
      );
      evidenceDetails.push(
        `Progress naturally slows over time. Adding a set or slowing down each rep can help spark new progress.`
      );
    } else {
      status = 'fluctuating';
      statusLabel = 'Normal Variation';
      plateauSeverity = 'none';
      evidenceDetails.push(
        `Repetition counts are fluctuating within normal daily variance (${r1} → ${r2} → ${r3} reps).`
      );
    }
  }

  // 5. CONSERVATIVE ACTIONABLE RECOMMENDATION DERIVED FROM UNIFIED DECISION
  let recType: ProgressionRecommendationType = 'maintain_baseline';
  if (decision.action === 'increase_weight') {
    recType = 'double_progression_increase';
  } else if (decision.action === 'increase_reps') {
    recType = 'continue_load';
  } else if (decision.action === 'maintain_load') {
    recType = latest.topSet.reps <= 5 ? 'plateau_microload' : 'plateau_rep_range_rotation';
  } else if (decision.action === 'reduce_load') {
    recType = 'maintain_baseline';
  }

  const recommendation: ProgressionRecommendation = {
    type: recType,
    title: decision.title,
    actionText: decision.actionHeadline,
    suggestedLoadChangeKg: decision.action === 'increase_weight' ? decision.loadChangeKg : undefined,
    suggestedRepTarget: decision.recommendedReps,
    rationale: decision.reason,
  };

  const headline =
    status === 'progressing'
      ? `Making progress: ${latest.topSet.weight > 0 ? `${latest.topSet.weight} kg × ` : ''}${latest.topSet.reps} reps (Estimated Max Strength: ${latest.topSet.estimated1RM} kg)`
      : status === 'potential_plateau'
      ? `Progress may have slowed: Stalled at ${latest.topSet.weight > 0 ? `${latest.topSet.weight} kg × ` : ''}${latest.topSet.reps} reps across ${stallDurationSessions} workouts`
      : status === 'fluctuating'
      ? `Normal variation: ${latest.topSet.weight > 0 ? `${latest.topSet.weight} kg × ` : ''}${latest.topSet.reps} reps`
      : `Lighter workout recorded: ${latest.topSet.weight} kg`;

  return {
    exerciseId,
    exerciseName,
    equipment,
    primaryMuscle: exercise.primaryMuscle,
    isBodyweight,
    isCustom,
    totalExposures,
    recentExposuresCount: windowSize,
    status,
    statusLabel,
    plateauSeverity,
    stallDurationSessions,
    lastPerformedDate: latest.date,
    daysSinceLastPerformed: daysSinceLast,
    baselineExposure: baseline,
    latestExposure: latest,
    bestExposure: best,
    metricDeltas: {
      weightDeltaKg,
      repsAtTopWeightDelta,
      estimated1RMDelta,
      estimated1RMDeltaPercent,
      volumeDeltaPercent,
    },
    evidence: {
      headline,
      details: evidenceDetails,
      isRecencyGuarded: false,
      hasSufficientData: true,
    },
    recommendation,
    decision,
    adaptiveDecision,
    exposures,
  };
}

/**
 * Scans the entire workout history to generate a routine-wide progression and plateau summary.
 */
export function analyzeRoutineProgression(
  history: WorkoutSession[],
  libraryExercises: Exercise[] = [],
  options: AnalyzeProgressionOptions = {}
): RoutineProgressionSummary {
  const completedSessions = (Array.isArray(history) ? history : []).filter(
    (s) => s && s.status === 'completed'
  );

  const libraryMap = new Map<string, Exercise>();
  for (const ex of libraryExercises) {
    if (ex && ex.id) libraryMap.set(ex.id, ex);
  }

  // Find unique exercises performed (scoped to timeRange if specified)
  const uniqueExerciseIds = new Set<string>();
  const exerciseMetaMap = new Map<
    string,
    { name: string; equipment?: Equipment; primaryMuscle?: MuscleGroup; isCustom: boolean }
  >();

  const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  let activeSessions = completedSessions;
  if (options.timeRange && options.timeRange !== 'all') {
    let daysToSubtract = 30;
    if (options.timeRange === '7d') daysToSubtract = 7;
    else if (options.timeRange === '30d') daysToSubtract = 30;
    else if (options.timeRange === '90d') daysToSubtract = 90;
    else if (options.timeRange === '1y') daysToSubtract = 365;

    const cutoff = new Date(refDate);
    cutoff.setDate(refDate.getDate() - daysToSubtract);
    cutoff.setHours(0, 0, 0, 0);
    const cutoffTime = cutoff.getTime();

    activeSessions = completedSessions.filter((s) => {
      const sTime = parseLocalDate(s.completedAt || s.date).getTime();
      return sTime >= cutoffTime;
    });
  }

  for (const session of activeSessions) {
    for (const exItem of session.exercises || []) {
      const exId = exItem.exerciseId || (exItem.exercise && exItem.exercise.id);
      if (exId) {
        uniqueExerciseIds.add(exId);
        if (!exerciseMetaMap.has(exId)) {
          const libEx = libraryMap.get(exId);
          exerciseMetaMap.set(exId, {
            name: libEx?.name || exItem.exercise?.name || (exItem as any).exerciseName || exId,
            equipment: libEx?.equipment || exItem.exercise?.equipment || 'barbell',
            primaryMuscle: libEx?.primaryMuscle || exItem.exercise?.primaryMuscle,
            isCustom: exId.startsWith('custom_') || Boolean(libEx?.isCustom),
          });
        }
      }

      // Check superset stages
      for (const set of exItem.sets || []) {
        if (Array.isArray(set.stages)) {
          for (const st of set.stages) {
            if (st.exerciseId) {
              uniqueExerciseIds.add(st.exerciseId);
              if (!exerciseMetaMap.has(st.exerciseId)) {
                const libEx = libraryMap.get(st.exerciseId);
                exerciseMetaMap.set(st.exerciseId, {
                  name: libEx?.name || st.exerciseName || st.exerciseId,
                  equipment: libEx?.equipment || 'barbell',
                  primaryMuscle: libEx?.primaryMuscle,
                  isCustom: st.exerciseId.startsWith('custom_'),
                });
              }
            }
          }
        }
      }
    }
  }

  const reports: ExerciseProgressionReport[] = [];

  for (const exId of uniqueExerciseIds) {
    const meta = exerciseMetaMap.get(exId);
    const report = analyzeExerciseProgression(
      history,
      {
        id: exId,
        name: meta?.name,
        equipment: meta?.equipment,
        primaryMuscle: meta?.primaryMuscle,
        isCustom: meta?.isCustom,
      },
      options
    );
    reports.push(report);
  }

  let progressingCount = 0;
  let plateauCount = 0;
  let fluctuatingCount = 0;
  let insufficientDataCount = 0;
  let dormantCount = 0;

  const plateauedExercises: ExerciseProgressionReport[] = [];
  const topProgressingExercises: ExerciseProgressionReport[] = [];

  for (const rep of reports) {
    switch (rep.status) {
      case 'progressing':
        progressingCount++;
        topProgressingExercises.push(rep);
        break;
      case 'potential_plateau':
        plateauCount++;
        plateauedExercises.push(rep);
        break;
      case 'fluctuating':
        fluctuatingCount++;
        break;
      case 'insufficient_data':
        insufficientDataCount++;
        break;
      case 'dormant':
        dormantCount++;
        break;
      default:
        break;
    }
  }

  // Sort plateaued by severity and stall duration (confirmed first)
  plateauedExercises.sort((a, b) => {
    if (a.plateauSeverity === 'confirmed' && b.plateauSeverity !== 'confirmed') return -1;
    if (b.plateauSeverity === 'confirmed' && a.plateauSeverity !== 'confirmed') return 1;
    return b.stallDurationSessions - a.stallDurationSessions;
  });

  // Sort progressing by estimated 1RM delta %
  topProgressingExercises.sort((a, b) => {
    const dA = a.metricDeltas.estimated1RMDeltaPercent ?? 0;
    const dB = b.metricDeltas.estimated1RMDeltaPercent ?? 0;
    return dB - dA;
  });

  return {
    totalAnalyzedExercises: reports.length,
    progressingCount,
    plateauCount,
    fluctuatingCount,
    insufficientDataCount,
    dormantCount,
    plateauedExercises,
    topProgressingExercises: topProgressingExercises.slice(0, 5),
  };
}
