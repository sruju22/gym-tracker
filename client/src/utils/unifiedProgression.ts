/**
 * GymTrackie — Unified Progressive Overload & Equipment-Aware Decision Engine
 *
 * Single source of truth for progressive overload decisions across:
 * - Progress Page (Exercise Progression & Strength Tracking)
 * - Home -> Weekly Coaching (Actionable Overload Steps)
 * - Workout Page (Apply in Workout target staging)
 *
 * Principles:
 * 1. Double Progression: Build repetitions across ALL working sets to the top of the rep range
 *    before increasing external load.
 * 2. Equipment-Aware: Considers real-world increments for dumbbells, barbells, cables, and machines.
 * 3. Safe Loading: If the next available weight increment represents a large jump (>15%),
 *    recommends repetition consolidation before stepping up in weight.
 * 4. Deterministic: Pure, reproducible calculations with zero artificial or hallucinated weights.
 */

import {
  WorkoutSession,
  Exercise,
  Equipment,
  UnifiedProgressionDecision,
  EquipmentIncrementSettings,
} from '../types';

export const DEFAULT_EQUIPMENT_INCREMENTS: EquipmentIncrementSettings = {
  dumbbellIncrementKg: 2.0,
  barbellIncrementKg: 2.5,
  cableIncrementKg: 2.5,
  machineIncrementKg: 5.0,
  dumbbellConvention: 'per_dumbbell',
  availableDumbbellWeightsKg: [
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40,
  ],
  availablePlatesKg: [1.25, 2.5, 5, 10, 15, 20, 25],
};

/**
 * Returns the effective equipment increment for a given equipment type.
 */
export function getEquipmentIncrement(
  equipment: Equipment,
  settings?: EquipmentIncrementSettings
): number {
  const merged = { ...DEFAULT_EQUIPMENT_INCREMENTS, ...settings };
  switch (equipment) {
    case 'dumbbell':
      return merged.dumbbellIncrementKg ?? 2.0;
    case 'barbell':
    case 'ez_bar':
      return merged.barbellIncrementKg ?? 2.5;
    case 'cable':
      return merged.cableIncrementKg ?? 2.5;
    case 'machine':
      return merged.machineIncrementKg ?? 5.0;
    case 'kettlebell':
      return 4.0;
    case 'bodyweight':
      return 0;
    default:
      return 2.5;
  }
}

/**
 * Calculates the next achievable weight and checks whether the jump is disproportionately large.
 */
export function calculateNextAvailableWeight(
  currentWeight: number,
  equipment: Equipment,
  settings?: EquipmentIncrementSettings
): { nextWeight: number; loadChangeKg: number; isJumpTooLarge: boolean } {
  if (equipment === 'bodyweight' || currentWeight <= 0) {
    return { nextWeight: currentWeight, loadChangeKg: 0, isJumpTooLarge: false };
  }

  const merged = { ...DEFAULT_EQUIPMENT_INCREMENTS, ...settings };
  let nextWeight = currentWeight;

  if (equipment === 'dumbbell' && Array.isArray(merged.availableDumbbellWeightsKg) && merged.availableDumbbellWeightsKg.length > 0) {
    const higherWeights = merged.availableDumbbellWeightsKg
      .filter((w) => w > currentWeight)
      .sort((a, b) => a - b);
    if (higherWeights.length > 0) {
      nextWeight = higherWeights[0];
    } else {
      nextWeight = currentWeight + (merged.dumbbellIncrementKg ?? 2.0);
    }
  } else if ((equipment === 'barbell' || equipment === 'ez_bar') && Array.isArray(merged.availablePlatesKg) && merged.availablePlatesKg.length > 0) {
    const smallestPlate = Math.min(...merged.availablePlatesKg);
    const minPairJump = Math.round(smallestPlate * 2 * 100) / 100;
    nextWeight = Math.round((currentWeight + minPairJump) * 100) / 100;
  } else {
    const step = getEquipmentIncrement(equipment, settings);
    nextWeight = Math.round((currentWeight + step) * 100) / 100;
  }

  const loadChangeKg = Math.round((nextWeight - currentWeight) * 100) / 100;
  const jumpPercent = currentWeight > 0 ? (loadChangeKg / currentWeight) * 100 : 0;
  // Jumps > 15% (e.g. 10 kg -> 12.5 kg = +25%) represent high mechanical shock and warrant rep consolidation
  const isJumpTooLarge = jumpPercent > 15.0;

  return { nextWeight, loadChangeKg, isJumpTooLarge };
}

/**
 * Resolves the exercise target rep bracket based on exercise metadata, user goal, or explicit planned reps.
 */
export function getExerciseTargetRepRange(
  exercise?: Exercise | null,
  goal?: string,
  explicitPlannedReps?: number
): { min: number; max: number } {
  if (explicitPlannedReps && explicitPlannedReps > 0) {
    return {
      min: Math.max(4, explicitPlannedReps - 2),
      max: explicitPlannedReps,
    };
  }

  const goalLower = (goal || '').toLowerCase();
  const isStrength = goalLower.includes('strength') || goalLower.includes('power');
  const isEndurance = goalLower.includes('fat') || goalLower.includes('loss') || goalLower.includes('longevity');

  if (exercise?.exerciseType === 'compound') {
    if (isStrength) return { min: 4, max: 6 };
    if (isEndurance) return { min: 10, max: 15 };
    if (exercise?.equipment === 'barbell') return { min: 6, max: 10 };
    return { min: 8, max: 12 };
  }

  if (exercise?.exerciseType === 'isolation') {
    if (isStrength) return { min: 8, max: 10 };
    return { min: 10, max: 15 };
  }

  if (exercise?.exerciseType === 'bodyweight') {
    return { min: 8, max: 15 };
  }

  return { min: 8, max: 12 };
}

export interface WorkingSetData {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface ExerciseExposureData {
  date: string;
  workoutName: string;
  workingSets: WorkingSetData[];
  topSet: WorkingSetData;
}

/**
 * Extracts chronological exercise exposures from completed workout sessions.
 */
export function extractExerciseExposures(
  history: WorkoutSession[],
  exerciseId: string
): ExerciseExposureData[] {
  if (!Array.isArray(history)) return [];

  const completed = history
    .filter((s) => s && s.status === 'completed' && Array.isArray(s.exercises))
    .sort((a, b) => new Date(a.completedAt || a.date).getTime() - new Date(b.completedAt || b.date).getTime());

  const exposures: ExerciseExposureData[] = [];

  for (const session of completed) {
    const matchingEx = session.exercises.find(
      (e) => e.exerciseId === exerciseId || (e.exercise && e.exercise.id === exerciseId)
    );
    if (!matchingEx || !Array.isArray(matchingEx.sets)) continue;

    const validSets: WorkingSetData[] = [];
    for (const set of matchingEx.sets) {
      if (!set.completed) continue;
      if (Array.isArray(set.stages) && set.stages.length > 0) {
        for (const st of set.stages) {
          if (st.exerciseId === exerciseId && st.completed && st.reps && st.reps > 0) {
            validSets.push({
              weight: st.weight ?? 0,
              reps: st.reps,
              completed: true,
            });
          }
        }
      } else if (set.reps !== null && set.reps > 0) {
        validSets.push({
          weight: set.weight ?? 0,
          reps: set.reps,
          completed: true,
        });
      }
    }

    if (validSets.length > 0) {
      // Find top set: highest weight, then highest reps
      let topSet = validSets[0];
      for (let i = 1; i < validSets.length; i++) {
        const cur = validSets[i];
        if (cur.weight > topSet.weight || (cur.weight === topSet.weight && cur.reps > topSet.reps)) {
          topSet = cur;
        }
      }

      exposures.push({
        date: session.completedAt || session.date,
        workoutName: session.workoutName || 'Workout',
        workingSets: validSets,
        topSet,
      });
    }
  }

  return exposures;
}

export interface EvaluateUnifiedProgressionOptions {
  exerciseId: string;
  exerciseName?: string;
  exercise?: Exercise | null;
  history: WorkoutSession[];
  goal?: string;
  equipmentSettings?: EquipmentIncrementSettings;
  explicitPlannedReps?: number;
  appliedTarget?: { targetWeight: number | null; targetReps: number; appliedAt?: string } | null;
}

/**
 * Evaluates unified progressive overload decision for an exercise.
 * Pure, deterministic single source of truth consumed by Progress Page, Weekly Coaching, and Workout.
 */
export function evaluateUnifiedProgression(
  options: EvaluateUnifiedProgressionOptions
): UnifiedProgressionDecision {
  const {
    exerciseId,
    exercise,
    history,
    goal,
    equipmentSettings,
    explicitPlannedReps,
    appliedTarget,
  } = options;

  const resolvedName = exercise?.name || options.exerciseName || exerciseId.replace(/_/g, ' ');
  const equipment = exercise?.equipment || 'dumbbell';
  const isBodyweight = equipment === 'bodyweight' || exercise?.exerciseType === 'bodyweight';
  const targetRepRange = getExerciseTargetRepRange(exercise, goal, explicitPlannedReps);
  const equipmentConvention = equipmentSettings?.dumbbellConvention || 'per_dumbbell';

  const exposures = extractExerciseExposures(history, exerciseId);

  // Case 1: Insufficient Historical Data
  if (exposures.length === 0) {
    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight,
      currentWorkingWeight: 0,
      currentReps: targetRepRange.min,
      completedSetsCount: 0,
      allSetsHitUpperTarget: false,
      previousWorkingWeight: null,
      previousReps: null,
      targetRepRange,
      action: 'insufficient_data',
      title: 'Establish Your Baseline',
      actionHeadline: `Establish baseline strength for ${resolvedName}`,
      recommendedWeight: null,
      recommendedReps: targetRepRange.min,
      loadChangeKg: null,
      reason: `No completed workouts recorded yet for ${resolvedName}. Complete your first working sets to establish your strength baseline.`,
      evidenceHeadline: 'Baseline Needed',
      evidenceDetails: [
        `Target rep range: ${targetRepRange.min}–${targetRepRange.max} repetitions.`,
        'Log your first completed workout to unlock automated overload recommendations.',
      ],
      equipmentIncrementKg: getEquipmentIncrement(equipment, equipmentSettings),
      equipmentConvention,
      isJumpTooLarge: false,
      nextSessionApplicable: false,
      isApplied: Boolean(appliedTarget),
    };
  }

  const latestExp = exposures[exposures.length - 1];
  const previousExp = exposures.length >= 2 ? exposures[exposures.length - 2] : null;

  const currentWorkingWeight = latestExp.topSet.weight;
  const currentReps = latestExp.topSet.reps;
  const completedSetsCount = latestExp.workingSets.length;
  const previousWorkingWeight = previousExp ? previousExp.topSet.weight : null;
  const previousReps = previousExp ? previousExp.topSet.reps : null;

  // Double Progression evaluation across ALL working sets in the latest session
  const allSetsHitUpperTarget =
    completedSetsCount > 0 &&
    latestExp.workingSets.every((s) => s.reps >= targetRepRange.max);

  const avgReps =
    completedSetsCount > 0
      ? Math.round((latestExp.workingSets.reduce((sum, s) => sum + s.reps, 0) / completedSetsCount) * 10) / 10
      : currentReps;

  const { nextWeight, loadChangeKg, isJumpTooLarge } = calculateNextAvailableWeight(
    currentWorkingWeight,
    equipment,
    equipmentSettings
  );
  const eqIncrement = loadChangeKg > 0 ? loadChangeKg : getEquipmentIncrement(equipment, equipmentSettings);

  // Check 3-session stagnation/plateau
  let isStagnant3Sessions = false;
  if (exposures.length >= 3) {
    const e1 = exposures[exposures.length - 3];
    const e2 = exposures[exposures.length - 2];
    const e3 = latestExp;
    const sameWeight = Math.abs(e1.topSet.weight - e3.topSet.weight) <= 0.5 && Math.abs(e2.topSet.weight - e3.topSet.weight) <= 0.5;
    const sameReps = e3.topSet.reps <= e1.topSet.reps && e2.topSet.reps <= e1.topSet.reps;
    isStagnant3Sessions = sameWeight && sameReps;
  }

  // Check if performance regressed significantly below minimum rep bracket
  const isStrugglingBelowMin =
    completedSetsCount > 0 &&
    latestExp.workingSets.some((s) => s.reps < targetRepRange.min - 1) &&
    avgReps < targetRepRange.min;

  // =========================================================================
  // DECISION MATRIX
  // =========================================================================

  // Case 2: Bodyweight Movement
  if (isBodyweight) {
    if (allSetsHitUpperTarget) {
      return {
        exerciseId,
        exerciseName: resolvedName,
        equipment,
        isBodyweight: true,
        currentWorkingWeight: 0,
        currentReps,
        completedSetsCount,
        allSetsHitUpperTarget: true,
        previousWorkingWeight,
        previousReps,
        targetRepRange,
        action: 'increase_reps',
        title: 'Repetition Target Achieved',
        actionHeadline: `Aim for ${targetRepRange.max + 2} clean reps next workout`,
        recommendedWeight: 0,
        recommendedReps: targetRepRange.max + 2,
        loadChangeKg: 0,
        reason: `You completed ${targetRepRange.max}+ reps across all ${completedSetsCount} sets. Aim for ${targetRepRange.max + 2} reps next workout or introduce a controlled 2-second pause at the bottom.`,
        evidenceHeadline: 'Upper Target Cleared',
        evidenceDetails: [
          `All ${completedSetsCount} working sets completed at or above ${targetRepRange.max} reps.`,
          'Progress via repetition overload or added tempo pauses before advancing to a harder variation.',
        ],
        equipmentIncrementKg: 0,
        equipmentConvention,
        isJumpTooLarge: false,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      };
    }

    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight: true,
      currentWorkingWeight: 0,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: false,
      previousWorkingWeight,
      previousReps,
      targetRepRange,
      action: 'increase_reps',
      title: 'Build Working Repetitions',
      actionHeadline: `Aim for ${Math.min(targetRepRange.max, currentReps + 1)} clean reps next workout`,
      recommendedWeight: 0,
      recommendedReps: Math.min(targetRepRange.max, currentReps + 1),
      loadChangeKg: 0,
      reason: `You logged ${currentReps} reps on your top set (target: ${targetRepRange.min}–${targetRepRange.max} reps). Aim for 1 additional clean repetition on your next workout.`,
      evidenceHeadline: 'Building Repetitions',
      evidenceDetails: [
        `Latest working sets averaged ${avgReps} reps across ${completedSetsCount} sets.`,
        `Build all sets toward ${targetRepRange.max} reps.`,
      ],
      equipmentIncrementKg: 0,
      equipmentConvention,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  }

  // Case 3: All Sets Conquered Upper Rep Target -> Ready for Weight Increase
  if (allSetsHitUpperTarget) {
    if (isJumpTooLarge) {
      // Jump is > 15% (e.g. 10 kg dumbbell to 12.5 kg = +25%)
      const jumpPct = currentWorkingWeight > 0 ? Math.round((loadChangeKg / currentWorkingWeight) * 100) : 0;
      return {
        exerciseId,
        exerciseName: resolvedName,
        equipment,
        isBodyweight: false,
        currentWorkingWeight,
        currentReps,
        completedSetsCount,
        allSetsHitUpperTarget: true,
        previousWorkingWeight,
        previousReps,
        targetRepRange,
        action: 'increase_reps',
        title: 'Consolidate Reps Before Weight Jump',
        actionHeadline: `Maintain ${currentWorkingWeight} kg and aim for ${targetRepRange.max + 2} reps`,
        recommendedWeight: currentWorkingWeight,
        recommendedReps: targetRepRange.max + 2,
        loadChangeKg: 0,
        reason: `You completed ${targetRepRange.max} reps across all sets at ${currentWorkingWeight} kg. Because the next available weight increment (+${loadChangeKg} kg) represents a ${jumpPct}% jump, build up to ${targetRepRange.max + 2} clean reps first to ensure safe joint adaptation.`,
        evidenceHeadline: 'High Increment Protection',
        evidenceDetails: [
          `Next available rack increment is ${nextWeight} kg (+${loadChangeKg} kg, +${jumpPct}%).`,
          `Consolidate reps to ${targetRepRange.max + 2} reps to make the eventual weight jump effortless and injury-free.`,
        ],
        equipmentIncrementKg: eqIncrement,
        equipmentConvention,
        isJumpTooLarge: true,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      };
    }

    // Standard safe weight progression
    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight: false,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: true,
      previousWorkingWeight,
      previousReps,
      targetRepRange,
      action: 'increase_weight',
      title: 'Ready to Increase Weight',
      actionHeadline: `Increase to ${nextWeight} kg for ${targetRepRange.min} reps next workout`,
      recommendedWeight: nextWeight,
      recommendedReps: targetRepRange.min, // Drop back to lower rep bound at heavier weight
      loadChangeKg,
      reason: `You completed ${targetRepRange.max} reps across all ${completedSetsCount} sets at ${currentWorkingWeight} kg. Step up to ${nextWeight} kg (+${loadChangeKg} kg) for ${targetRepRange.min} clean reps next workout.`,
      evidenceHeadline: 'Double Progression Earned',
      evidenceDetails: [
        `All ${completedSetsCount} working sets hit the top of the ${targetRepRange.min}–${targetRepRange.max} bracket at ${currentWorkingWeight} kg.`,
        `Next available increment is ${nextWeight} kg (+${loadChangeKg} kg). Drop back to ${targetRepRange.min} reps and rebuild.`,
      ],
      equipmentIncrementKg: eqIncrement,
      equipmentConvention,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  }

  // Case 4: Top set reached upper bound, but subsequent sets did not (e.g. 12, 10, 8 reps)
  if (currentReps >= targetRepRange.max && !allSetsHitUpperTarget) {
    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight: false,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: false,
      previousWorkingWeight,
      previousReps,
      targetRepRange,
      action: 'increase_reps',
      title: 'Build Consistent Volume',
      actionHeadline: `Maintain ${currentWorkingWeight} kg and aim for ${targetRepRange.max} reps across all sets`,
      recommendedWeight: currentWorkingWeight,
      recommendedReps: targetRepRange.max,
      loadChangeKg: 0,
      reason: `You reached ${currentReps} reps on your top set, while subsequent sets averaged ${avgReps} reps. Maintain ${currentWorkingWeight} kg and aim to bring all ${completedSetsCount} sets to ${targetRepRange.max} reps before adding weight.`,
      evidenceHeadline: 'Double Progression in Progress',
      evidenceDetails: [
        `Top set hit ${currentReps} reps at ${currentWorkingWeight} kg, but all working sets must complete ${targetRepRange.max} reps before stepping up in weight.`,
        `Aim for 1 additional clean repetition on your later working sets.`,
      ],
      equipmentIncrementKg: eqIncrement,
      equipmentConvention,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  }

  // Case 5: Plateau / Stagnant across >= 3 sessions
  if (isStagnant3Sessions) {
    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight: false,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: false,
      previousWorkingWeight,
      previousReps,
      targetRepRange,
      action: 'maintain_load',
      title: 'Progress May Have Slowed',
      actionHeadline: `Maintain ${currentWorkingWeight} kg and focus on controlled tempo`,
      recommendedWeight: currentWorkingWeight,
      recommendedReps: currentReps,
      loadChangeKg: 0,
      reason: `Working weight and reps have held steady at ${currentWorkingWeight} kg × ${currentReps} reps across 3 consecutive workouts. Maintain this working load and focus on controlled 3-second eccentric tempo, or use micro-loading if smaller plates are available.`,
      evidenceHeadline: 'Plateau Watch (3 Workouts Steady)',
      evidenceDetails: [
        `Performance held steady at ${currentWorkingWeight} kg across 3 consecutive sessions.`,
        'Slowing rep cadence or micro-loading (+1 kg) helps spark new neuromuscular adaptations.',
      ],
      equipmentIncrementKg: eqIncrement,
      equipmentConvention,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  }

  // Case 6: Excessive Fatigue or Rep Drop Below Minimum Target
  if (isStrugglingBelowMin) {
    const deloadWeight = Math.max(
      equipment === 'dumbbell' ? 2 : 5,
      Math.round((currentWorkingWeight * 0.9) * 2) / 2
    );
    const deloadDropKg = Math.round((currentWorkingWeight - deloadWeight) * 10) / 10;
    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight: false,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: false,
      previousWorkingWeight,
      previousReps,
      targetRepRange,
      action: 'reduce_load',
      title: 'Consider a Conservative Deload',
      actionHeadline: `Reduce load to ${deloadWeight} kg for recovery`,
      recommendedWeight: deloadWeight,
      recommendedReps: targetRepRange.min,
      loadChangeKg: -deloadDropKg,
      reason: `Repetitions dipped below your target minimum (${targetRepRange.min} reps). Consider a conservative -10% load reduction to ${deloadWeight} kg for 1 session to re-establish crisp technique and restore recovery.`,
      evidenceHeadline: 'Fatigue Accumulation Watch',
      evidenceDetails: [
        `Recent working sets averaged ${avgReps} reps, falling below the ${targetRepRange.min} rep threshold.`,
        `A 1-session reset to ${deloadWeight} kg (-${deloadDropKg} kg) restores joint comfort and rep quality.`,
      ],
      equipmentIncrementKg: eqIncrement,
      equipmentConvention,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  }

  // Case 7: Normal Progress within Bracket (e.g. 8–10 reps)
  const targetNextReps = Math.min(targetRepRange.max, currentReps + 1);
  return {
    exerciseId,
    exerciseName: resolvedName,
    equipment,
    isBodyweight: false,
    currentWorkingWeight,
    currentReps,
    completedSetsCount,
    allSetsHitUpperTarget: false,
    previousWorkingWeight,
    previousReps,
    targetRepRange,
    action: 'increase_reps',
    title: 'Maintain Weight & Build Reps',
    actionHeadline: `Maintain ${currentWorkingWeight} kg and aim for ${targetNextReps} reps`,
    recommendedWeight: currentWorkingWeight,
    recommendedReps: targetNextReps,
    loadChangeKg: 0,
    reason: `Working weight is stable at ${currentWorkingWeight} kg (${currentReps} reps). Aim for ${targetNextReps} clean repetitions next workout before stepping up the weight.`,
    evidenceHeadline: 'Building Repetitions',
    evidenceDetails: [
      `Completed ${completedSetsCount} sets with a top set of ${currentWorkingWeight} kg × ${currentReps} reps.`,
      `Progress along the double progression curve toward ${targetRepRange.max} reps.`,
    ],
    equipmentIncrementKg: eqIncrement,
    equipmentConvention,
    isJumpTooLarge: false,
    nextSessionApplicable: true,
    isApplied: Boolean(appliedTarget),
  };
}
