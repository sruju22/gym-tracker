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
} from '../types';
import { calculate1RM } from './oneRM';
import { parseLocalDate, formatDateShort } from './formatters';

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
      statusLabel: 'Insufficient Data',
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
        details: ['Complete and log at least 3 workouts containing this exercise to enable progression and plateau tracking.'],
        isRecencyGuarded: false,
        hasSufficientData: false,
      },
      recommendation: {
        type: 'maintain_baseline',
        title: 'Establish Starting Baseline',
        actionText: 'Perform initial sets to record baseline load and repetitions',
        rationale: 'Logging your first exposure will establish a benchmark for progressive overload tracking.',
      },
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
      statusLabel: 'Out of Active Rotation',
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
        headline: `Last performed ${daysSinceLast} days ago (${formatDateShort(latest.date)})`,
        details: [
          'Exercise has not been trained in recent weeks. A plateau requires ongoing, repeated training exposure to classify.',
          `Peak historical load was ${best.topSet.weight} kg × ${best.topSet.reps} reps.`,
        ],
        isRecencyGuarded: true,
        hasSufficientData: totalExposures >= minExposures,
      },
      recommendation: {
        type: 'maintain_baseline',
        title: 'Re-enter Exercise Gradually',
        actionText: 'Resume training with a conservative re-acclimation load',
        rationale:
          'Because this exercise has been out of rotation for over 8 weeks, restart with a comfortable working load before pushing progressive overload.',
      },
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
    const statusLabel = progressTwoSessions ? 'Early Progression' : 'Insufficient History';

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
          ? `Baseline established: ${latest.topSet.weight} kg × ${latest.topSet.reps} reps`
          : `2 sessions logged: ${baseline.topSet.weight} kg × ${baseline.topSet.reps} reps → ${latest.topSet.weight} kg × ${latest.topSet.reps} reps`,
        details: [
          `Logged ${totalExposures} of the required ${minExposures} sessions for plateau detection.`,
          'Continue following your prescribed workout plan to establish reliable trend patterns.',
        ],
        isRecencyGuarded: false,
        hasSufficientData: false,
      },
      recommendation: {
        type: 'maintain_baseline',
        title: 'Build Consistent Baseline',
        actionText: `Complete ${minExposures - totalExposures} more session(s) to unlock plateau analysis`,
        rationale: 'Reliable progression and plateau detection requires at least 3 comparable training exposures.',
      },
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
  let statusLabel = 'Fluctuating Performance';
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
      statusLabel = 'Progressing';
      plateauSeverity = 'none';
      stallDurationSessions = 0;

      if (isRepsUpAtSameWeight) {
        evidenceDetails.push(
          `Double progression active: Load held at ${w3} kg while repetitions advanced from ${r1} → ${r3} reps.`
        );
      } else if (isWeightUp) {
        evidenceDetails.push(
          `Working load progressed from ${w1} kg (${r1} reps) to ${w3} kg (${r3} reps).`
        );
      } else {
        const pct = Math.round(((e3 - e1) / e1) * 100);
        evidenceDetails.push(
          `Estimated 1RM improved by +${pct}% across recent sessions (${e1} kg → ${e3} kg).`
        );
      }
    } else {
      // Check Case B: Potential Plateau
      // Weight stagnant (difference <= 0.5 kg or 0%) AND reps stagnant/flat (r3 <= r1 and r2 <= r1)
      const isWeightStagnant = Math.abs(w3 - w1) <= 0.5 && Math.abs(w2 - w1) <= 0.5;
      const isRepsStagnantOrDown = r3 <= r1 && r2 <= r1;
      const is1RMStagnant = e1 > 0 ? Math.abs((e3 - e1) / e1) < 0.02 : true;

      if (isWeightStagnant && isRepsStagnantOrDown && is1RMStagnant) {
        status = 'potential_plateau';
        statusLabel = 'Potential Plateau';
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
          `Performance stalled at ${w3} kg × ${r3} reps across ${stallDurationSessions} consecutive sessions (${formatDateShort(exp1.date)}, ${formatDateShort(exp2.date)}, ${formatDateShort(exp3.date)}).`
        );
        evidenceDetails.push(
          `No increase in working load or repetitions achieved across ${stallDurationSessions} exposures.`
        );
      } else if (w3 < w1 && (e1 > 0 && (e1 - e3) / e1 >= 0.06)) {
        // Drop of > 6% in estimated 1RM
        status = 'deload_or_regressing';
        statusLabel = 'Working Load Adjusted';
        plateauSeverity = 'none';
        evidenceDetails.push(
          `Working weight decreased from ${w1} kg to ${w3} kg across recent exposures. Normal training variations occur during fatigue or deload phases.`
        );
      } else {
        // Normal minor fluctuations
        status = 'fluctuating';
        statusLabel = 'Fluctuating';
        plateauSeverity = 'none';
        evidenceDetails.push(
          `Recent sessions show normal repetition and load variance (${w1} kg × ${r1} reps → ${w2} kg × ${r2} reps → ${w3} kg × ${r3} reps).`
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
      statusLabel = 'Progressing (Bodyweight)';
      plateauSeverity = 'none';
      evidenceDetails.push(
        `Bodyweight repetition volume advanced from ${r1} reps to ${r3} reps across recent sessions.`
      );
    } else if (r3 === r1 && r2 === r1) {
      status = 'potential_plateau';
      statusLabel = 'Potential Plateau';
      stallDurationSessions = 3;
      plateauSeverity = 'watch';
      evidenceDetails.push(
        `Bodyweight repetitions have stalled at ${r3} reps across 3 consecutive sessions without volume progression.`
      );
    } else {
      status = 'fluctuating';
      statusLabel = 'Fluctuating';
      plateauSeverity = 'none';
      evidenceDetails.push(
        `Repetition counts are fluctuating within normal variance (${r1} → ${r2} → ${r3} reps).`
      );
    }
  }

  // 5. CONSERVATIVE ACTIONABLE RECOMMENDATION
  let recommendation: ProgressionRecommendation;

  if (status === 'progressing') {
    if (!isBodyweight && latest.topSet.reps >= 10) {
      const bumpKg = equipment === 'dumbbell' ? 2.0 : 2.5;
      recommendation = {
        type: 'double_progression_increase',
        title: 'Ready for Load Progression',
        actionText: `Consider increasing load by +${bumpKg} kg next session`,
        suggestedLoadChangeKg: bumpKg,
        rationale: `You consistently completed ${latest.topSet.reps} reps at ${latest.topSet.weight} kg. Under double-progression principles, you have earned a small load increase.`,
      };
    } else {
      recommendation = {
        type: 'continue_load',
        title: 'Continue Current Progression',
        actionText: 'Maintain current working weight and aim for +1 rep next session',
        rationale:
          'Your strength trajectory is advancing. Focus on clean repetition execution and progressive overload momentum.',
      };
    }
  } else if (status === 'potential_plateau') {
    if (isBodyweight) {
      recommendation = {
        type: 'plateau_volume_adjust',
        title: 'Add Rest-Pause or Variation',
        actionText: 'Incorporate 1 additional set or an assisted/eccentric variation',
        rationale: `Repetitions have plateaued at ${latest.topSet.reps} reps. Adding an additional set or adjusting tempo will provide a fresh stimulus.`,
      };
    } else if (latest.topSet.reps <= 5) {
      // Low-rep compound plateau: Micro-loading or rep range shift
      recommendation = {
        type: 'plateau_microload',
        title: 'Apply Micro-Loading or Shift Rep Range',
        actionText: 'Use fractional plates (+1.0 kg to +1.25 kg) or shift to 6–8 reps for 2 weeks',
        suggestedLoadChangeKg: 1.25,
        rationale: `Performance has stalled at ${latest.topSet.weight} kg × ${latest.topSet.reps} reps across ${stallDurationSessions} sessions. Micro-loading or shifting rep schemes breaks adaptation stalls effectively.`,
      };
    } else {
      // Moderate-rep plateau: Double progression consolidation or movement variation
      recommendation = {
        type: 'plateau_rep_range_rotation',
        title: 'Rotate Stimulus or Exercise Angle',
        actionText: 'Consider a complementary movement variation or consolidating set volume',
        rationale: `Performance has plateaued at ${latest.topSet.weight} kg over ${stallDurationSessions} sessions. Introducing an exercise variation stimulates different motor units without altering your split.`,
      };
    }
  } else if (status === 'deload_or_regressing') {
    recommendation = {
      type: 'maintain_baseline',
      title: 'Consolidate Working Sets',
      actionText: 'Keep working load steady until performance stabilizes',
      rationale:
        'Temporary reductions in working weight are normal following intense training blocks or schedule changes. Re-consolidate form before pushing heavier loads.',
    };
  } else {
    // Fluctuating
    recommendation = {
      type: 'maintain_baseline',
      title: 'Consolidate Form & Consistency',
      actionText: `Consolidate ${latest.topSet.weight} kg for steady repetitions`,
      rationale:
        'Performance is fluctuating within normal limits. Focus on technical consistency at your current working load.',
    };
  }

  const headline =
    status === 'progressing'
      ? `Progressing: ${latest.topSet.weight} kg × ${latest.topSet.reps} reps (Est. 1RM ${latest.topSet.estimated1RM} kg)`
      : status === 'potential_plateau'
      ? `Potential Plateau: Stalled at ${latest.topSet.weight} kg × ${latest.topSet.reps} reps across ${stallDurationSessions} sessions`
      : status === 'fluctuating'
      ? `Fluctuating: ${latest.topSet.weight} kg × ${latest.topSet.reps} reps`
      : `Working load adjusted: ${latest.topSet.weight} kg`;

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

  // Find all unique exercises performed in history
  const uniqueExerciseIds = new Set<string>();
  const exerciseMetaMap = new Map<
    string,
    { name: string; equipment?: Equipment; primaryMuscle?: MuscleGroup; isCustom: boolean }
  >();

  for (const session of completedSessions) {
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
