/**
 * GymTrackie — Phase 10: Adaptive Training Decision Engine
 *
 * Orchestrates:
 * 1. Unified Progressive Overload (unifiedProgression.ts)
 * 2. Biomechanical Muscle Intelligence (muscleIntelligenceEngine.ts)
 * 3. Active Training Split and Schedule Context (weeklySchedule, workoutStore)
 *
 * Core Principle: "One Decision, Multiple Explainable Outputs"
 * - Primary Progression Decision: Exactly ONE deterministic action
 *   ('increase_weight' | 'increase_reps' | 'maintain_progression' | 'insufficient_data' | 'recovery_aware_recommendation')
 * - Additional Training Recommendations: Zero or more modular outputs
 *   ('volume_adjustment' | 'stimulus_exercise_adjustment' | 'recovery_advisory' | 'performance_review')
 *
 * Priority Matrix:
 * Priority 1: Baseline Data Sufficiency (< 2 exposures -> insufficient_data)
 * Priority 2: Biomechanical Readiness & Fatigue Gating (Primary fatigued/recovering -> hold load; Synergist fatigued -> advisory)
 * Priority 3: Double Progression Performance Overload (All sets hit upper limit -> increase_weight or rep consolidation if jump > 15%)
 * Priority 4: Stagnation & Plateau Review (3 consecutive workouts steady -> maintain_progression + tempo advisory)
 * Priority 5: 28-Day Subregion Balance & Active Split Overlay (suggest rotational variant if underexposed)
 * Priority 6: Diagnostic Confidence & Uncertainty Protection (provisional if unmapped 0.50 multiplier)
 */

import {
  WorkoutSession,
  Exercise,
  Equipment,
  MuscleGroup,
  MuscleArea,
  WeeklySchedule,
  EquipmentIncrementSettings,
  MuscleReadinessStatus,
  AdaptivePrimaryAction,
  AdaptiveAdditionalRecommendation,
  AdaptiveConfidenceLevel,
  AdaptivePrimaryReasonCode,
  AdaptiveTrainingDecision,
  MuscleIntelligenceSummary,
} from '../types';
import {
  evaluateUnifiedProgression,
  extractExerciseExposures,
  getEquipmentIncrement,
  getExerciseTargetRepRange,
  calculateNextAvailableWeight,
} from './unifiedProgression';
import {
  evaluateMuscleIntelligence,
  getExerciseMuscleContributions,
  READINESS_THRESHOLDS,
} from './muscleIntelligenceEngine';
import { getMuscleAreaName } from '../data/muscleGroups';

export interface EvaluateAdaptiveDecisionOptions {
  exerciseId: string;
  exerciseName?: string;
  exercise?: Exercise | null;
  history: WorkoutSession[];
  weeklyPlan?: WeeklySchedule;
  goal?: string;
  equipmentSettings?: EquipmentIncrementSettings;
  explicitPlannedReps?: number;
  appliedTarget?: { targetWeight: number | null; targetReps: number; appliedAt?: string } | null;
  now?: Date;
  exercises?: Exercise[];
  precomputedMuscleIntelligence?: MuscleIntelligenceSummary;
}

const SUBREGION_SUGGESTED_EXERCISES: Partial<Record<MuscleArea, string>> = {
  upper_chest: 'Incline Dumbbell Press',
  lower_chest: 'Chest Dips',
  mid_chest: 'Flat Dumbbell Press',
  lats: 'Lat Pulldown',
  upper_back: 'Chest-Supported Row',
  mid_back: 'Bent-Over Barbell Row',
  traps: 'Dumbbell Shrugs',
  lower_back: 'Back Hyperextensions',
  front_delts: 'Overhead Dumbbell Press',
  side_delts: 'Dumbbell Lateral Raise',
  rear_delts: 'Face Pulls',
  long_head_bicep: 'Incline Dumbbell Curl',
  short_head_bicep: 'Preacher Curl',
  long_head_tricep: 'Overhead Triceps Extension',
  lateral_head_tricep: 'Cable Triceps Pushdown',
  medial_head_tricep: 'Close-Grip Bench Press',
  quads: 'Leg Press',
  hamstrings: 'Romanian Deadlift',
  glutes: 'Barbell Hip Thrust',
  calves: 'Standing Calf Raise',
  upper_abs: 'Cable Crunch',
  lower_abs: 'Hanging Knee Raise',
  obliques: 'Cable Woodchoppers',
};

/**
 * Main evaluation entry point for the Adaptive Training Decision Engine.
 * Single source of truth consumed across Progress Page, Weekly Coaching on Home, and Workout Staging.
 */
export function evaluateAdaptiveDecision(
  options: EvaluateAdaptiveDecisionOptions
): AdaptiveTrainingDecision {
  const {
    exerciseId,
    exercise,
    history,
    weeklyPlan,
    goal,
    equipmentSettings,
    explicitPlannedReps,
    appliedTarget,
    now = new Date(),
    exercises = [],
    precomputedMuscleIntelligence,
  } = options;

  const resolvedName = exercise?.name || options.exerciseName || exerciseId.replace(/_/g, ' ');
  const equipment: Equipment = exercise?.equipment || 'dumbbell';
  const isBodyweight = equipment === 'bodyweight' || exercise?.exerciseType === 'bodyweight';
  const primaryMuscle: MuscleGroup = exercise?.primaryMuscle || 'chest';
  const primarySubArea: MuscleArea | undefined = exercise?.muscleAreaEmphasis?.[0];
  const targetRepRange = getExerciseTargetRepRange(exercise, goal, explicitPlannedReps);

  // 1. PERFORMANCE HISTORY EXPOSURES
  const exposures = extractExerciseExposures(history, exerciseId);
  const totalExposures = exposures.length;

  // 2. BIOMECHANICAL CONTRIBUTIONS FOR CANDIDATE EXERCISE
  const contributions = exercise
    ? getExerciseMuscleContributions(exercise)
    : [
        {
          muscleGroup: primaryMuscle,
          subArea: primarySubArea,
          tier: 'prime' as const,
          factor: 1.0,
          isDirect: true,
          isUncertainMapping: false,
        },
      ];

  const hasUncertainMappingExposure = contributions.some((c) => Boolean(c.isUncertainMapping));

  // 3. MUSCLE INTELLIGENCE SNAPSHOT (Compute or reuse precomputed)
  const muscleIntelligence =
    precomputedMuscleIntelligence ||
    evaluateMuscleIntelligence({
      history,
      exercises: exercises.length > 0 ? exercises : exercise ? [exercise] : [],
      weeklyPlan,
      now,
    });

  // Snapshot primary muscle and synergist readiness
  const primaryGroupReport = muscleIntelligence.groups.find((g) => g.muscleGroup === primaryMuscle);
  const primaryReadiness: MuscleReadinessStatus = primaryGroupReport?.readiness.status || 'ready';
  const primaryAcuteLoadScore = primaryGroupReport?.readiness.acuteLoadScore || 0;
  const hoursSinceLastTrained = primaryGroupReport?.readiness.hoursSinceLastTrained ?? null;
  const daysSinceLastTrained = primaryGroupReport?.readiness.daysSinceLastTrained ?? null;
  const isScheduledInSplit = primaryGroupReport?.isScheduledInSplit ?? true;
  const isCompoundSupportedOnly = primaryGroupReport?.isCompoundSupportedOnly ?? false;

  const synergistContributions = contributions.filter((c) => c.muscleGroup !== primaryMuscle);
  const synergistReadinessSummary = synergistContributions.map((sc) => {
    const report = muscleIntelligence.groups.find((g) => g.muscleGroup === sc.muscleGroup);
    return {
      muscleGroup: sc.muscleGroup,
      status: report?.readiness.status || 'ready',
      acuteLoadScore: report?.readiness.acuteLoadScore || 0,
    };
  });

  const intelligenceContext = {
    primaryReadiness,
    primaryAcuteLoadScore,
    hoursSinceLastTrained,
    daysSinceLastTrained,
    synergistReadinessSummary,
    isScheduledInSplit,
    isCompoundSupportedOnly,
    hasUncertainMappingExposure,
  };

  const warnings: string[] = [];
  const limitations: string[] = [];
  const additionalRecommendations: AdaptiveAdditionalRecommendation[] = [];

  if (hasUncertainMappingExposure) {
    limitations.push(
      'Secondary muscle contributions rely on heuristic 0.50 multipliers. Volume stimulus is marked as provisional.'
    );
  }

  // =========================================================================
  // PRIORITY 1: DATA SUFFICIENCY (< 2 exposures -> 'insufficient_data')
  // =========================================================================
  if (totalExposures < 2) {
    const hasOneExposure = totalExposures === 1;
    const latestExp = hasOneExposure ? exposures[0] : null;
    const currentWorkingWeight = latestExp ? latestExp.topSet.weight : 0;
    const currentReps = latestExp ? latestExp.topSet.reps : targetRepRange.min;
    const completedSetsCount = latestExp ? latestExp.workingSets.length : 0;

    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight,
      primaryMuscle,
      primarySubArea,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: false,
      targetRepRange,
      primaryAction: 'insufficient_data',
      primaryReasonCode: 'BASELINE_INSUFFICIENT_DATA',
      title: hasOneExposure ? 'Baseline in Progress' : 'Establish Your Baseline',
      actionHeadline: hasOneExposure
        ? `Log 1 more workout to establish progression baseline`
        : `Establish baseline strength for ${resolvedName}`,
      primaryRationale: hasOneExposure
        ? `Only 1 workout exposure recorded for ${resolvedName}. Progressive overload decisions require at least 2 comparable working sessions to evaluate double progression trends, and 3 sessions to detect plateaus. Complete your next workout to unlock automated weight and repetition recommendations.`
        : `No completed workouts recorded yet for ${resolvedName}. Complete your first working sets to establish your strength baseline.`,
      supportingEvidence: [
        `Target rep bracket: ${targetRepRange.min}–${targetRepRange.max} repetitions.`,
        hasOneExposure
          ? `First session completed with top set of ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg × ` : ''}${currentReps} reps.`
          : 'Log completed workouts to unlock automated progressive overload recommendations.',
      ],
      targets: {
        recommendedWeight: currentWorkingWeight > 0 ? currentWorkingWeight : null,
        recommendedReps: Math.min(targetRepRange.max, currentReps + 1),
        loadChangeKg: 0,
        isJumpTooLarge: false,
        nextSessionApplicable: hasOneExposure,
        isApplied: Boolean(appliedTarget),
      },
      additionalRecommendations: [],
      confidence: 'insufficient_data',
      warnings,
      limitations,
      dataSufficiency: {
        totalExposures,
        hasSufficientHistory: false,
        statusLabel: `${totalExposures}/2 Workouts for Baseline`,
      },
      intelligenceContext,
    };
  }

  // We have >= 2 exposures. Evaluate pure progression performance:
  const unifiedDecision = evaluateUnifiedProgression({
    exerciseId,
    exerciseName: resolvedName,
    exercise: exercise || null,
    history,
    goal,
    equipmentSettings,
    explicitPlannedReps,
    appliedTarget,
  });

  const latestExp = exposures[exposures.length - 1];
  const currentWorkingWeight = latestExp.topSet.weight;
  const currentReps = latestExp.topSet.reps;
  const completedSetsCount = latestExp.workingSets.length;
  const allSetsHitUpperTarget =
    completedSetsCount > 0 && latestExp.workingSets.every((s) => s.reps >= targetRepRange.max);

  const { nextWeight, loadChangeKg, isJumpTooLarge } = calculateNextAvailableWeight(
    currentWorkingWeight,
    equipment,
    equipmentSettings
  );

  // Determine confidence level
  let confidence: AdaptiveConfidenceLevel = 'high';
  if (hasUncertainMappingExposure) {
    confidence = 'provisional';
  } else if (totalExposures === 2) {
    confidence = 'medium';
  }

  // =========================================================================
  // PRIORITY 2: BIOMECHANICAL READINESS & FATIGUE GATING (PRIMARY vs SYNERGIST)
  // =========================================================================

  // Check 2A: Performance Collapse / Severe Fatigue Regress below minimum
  if (unifiedDecision.action === 'reduce_load') {
    const deloadWeight = unifiedDecision.recommendedWeight;
    const deloadDropKg = unifiedDecision.loadChangeKg ?? 0;

    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight,
      primaryMuscle,
      primarySubArea,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget: false,
      targetRepRange,
      primaryAction: 'recovery_aware_recommendation',
      primaryReasonCode: 'RECOVERY_PERFORMANCE_COLLAPSE_DELOAD',
      title: 'Consider a Conservative Deload',
      actionHeadline: `Reduce load to ${deloadWeight} kg for recovery`,
      primaryRationale: `Repetitions dipped below your target minimum (${targetRepRange.min} reps). Consider a conservative -10% load reduction to ${deloadWeight} kg for 1 session to re-establish crisp technique and restore recovery.`,
      supportingEvidence: [
        ...unifiedDecision.evidenceDetails,
        `Primary muscle readiness status: ${primaryReadiness} (acute score: ${primaryAcuteLoadScore.toFixed(1)}).`,
      ],
      targets: {
        recommendedWeight: deloadWeight,
        recommendedReps: targetRepRange.min,
        loadChangeKg: deloadDropKg,
        isJumpTooLarge: false,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      },
      additionalRecommendations,
      confidence,
      warnings,
      limitations,
      dataSufficiency: {
        totalExposures,
        hasSufficientHistory: true,
        statusLabel: 'Sufficient History',
      },
      intelligenceContext,
    };
  }

  // Check 2B: Primary Muscle in Acute Fatigue or Active Recovery Interval
  // Rule: If primary muscle has AcuteLoadScore >= 7.0 OR (hours <= 36 AND AcuteLoadScore >= 1.5)
  const isPrimaryFatigued =
    primaryAcuteLoadScore >= READINESS_THRESHOLDS.fatiguedAcuteLoadThreshold ||
    primaryReadiness === 'fatigued';

  const isPrimaryInActiveRecovery =
    primaryReadiness === 'recovering' ||
    (hoursSinceLastTrained !== null &&
      hoursSinceLastTrained <= READINESS_THRESHOLDS.recoveringRecentHoursThreshold &&
      primaryAcuteLoadScore >= READINESS_THRESHOLDS.recoveringRecentMinAcuteLoad);

  // If primary muscle is fatigued or recovering, hold working weight even if double progression earned!
  if (isPrimaryFatigued || isPrimaryInActiveRecovery) {
    const hoursText = hoursSinceLastTrained !== null ? `${Math.round(hoursSinceLastTrained)}h ago` : 'recently';
    const acuteScoreText = primaryAcuteLoadScore.toFixed(1);

    const headline = isPrimaryFatigued
      ? `Hold ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'load'} for recovery (high acute fatigue)`
      : `Hold ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'load'} (active recovery window)`;

    const rationale = isPrimaryFatigued
      ? `While performance history earned a progression, your ${primaryMuscle} has high acute training fatigue (${acuteScoreText} acute score logged ${hoursText}). Attempting a heavier load while fatigued elevates joint strain and technical breakdown. Hold ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'working load'} until acute recovery is restored.`
      : `Your ${primaryMuscle} was directly loaded ${hoursText} (acute score: ${acuteScoreText}) and remains in its active recovery window. Joint capsules and connective tissues are adapting; hold current working load and prioritize crisp rep tempo.`;

    // Check synergists for any advisory as well
    for (const syn of synergistReadinessSummary) {
      if (syn.status === 'fatigued' || syn.status === 'recovering') {
        additionalRecommendations.push({
          type: 'recovery_advisory',
          title: `${getMuscleAreaName(syn.muscleGroup as MuscleArea)} Recovery Advisory`,
          actionText: `Monitor ${syn.muscleGroup} fatigue during movement execution`,
          rationale: `Your ${syn.muscleGroup} recorded recent acute workload (${syn.acuteLoadScore.toFixed(1)} acute score). Maintain proper biomechanical form.`,
          reasonCode: 'RECOVERY_SYNERGIST_FATIGUE_ADVISORY',
          targetMuscleGroup: syn.muscleGroup,
        });
      }
    }

    return {
      exerciseId,
      exerciseName: resolvedName,
      equipment,
      isBodyweight,
      primaryMuscle,
      primarySubArea,
      currentWorkingWeight,
      currentReps,
      completedSetsCount,
      allSetsHitUpperTarget,
      targetRepRange,
      primaryAction: 'recovery_aware_recommendation',
      primaryReasonCode: 'RECOVERY_PRIMARY_ACUTE_FATIGUE_HOLD',
      title: 'Recovery Window: Hold Working Load',
      actionHeadline: headline,
      primaryRationale: rationale,
      supportingEvidence: [
        `Primary muscle (${primaryMuscle}) readiness: ${primaryReadiness} (acute score: ${acuteScoreText}).`,
        `Last trained: ${hoursText}. Gating prevents premature weight advances during active recovery.`,
      ],
      targets: {
        recommendedWeight: currentWorkingWeight > 0 ? currentWorkingWeight : null,
        recommendedReps: currentReps,
        loadChangeKg: 0,
        isJumpTooLarge: false,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      },
      additionalRecommendations,
      confidence,
      warnings,
      limitations,
      dataSufficiency: {
        totalExposures,
        hasSufficientHistory: true,
        statusLabel: 'Sufficient History',
      },
      intelligenceContext,
    };
  }

  // Check 2C: Synergist Fatigue (Scenario C & K)
  // Synergist fatigue does NOT block primary progression! We add an additional recovery advisory.
  for (const syn of synergistReadinessSummary) {
    if (syn.status === 'fatigued' || syn.status === 'recovering') {
      additionalRecommendations.push({
        type: 'recovery_advisory',
        title: `${getMuscleAreaName(syn.muscleGroup as MuscleArea)} Recovery Advisory`,
        actionText: `Monitor ${syn.muscleGroup} fatigue during lockout`,
        rationale: `Your ${syn.muscleGroup} recorded recent acute workload (${syn.acuteLoadScore.toFixed(1)} acute score). Proceed with planned progression on ${resolvedName}, but monitor lockout fatigue.`,
        reasonCode: 'RECOVERY_SYNERGIST_FATIGUE_ADVISORY',
        targetMuscleGroup: syn.muscleGroup,
      });
    }
  }

  // =========================================================================
  // PRIORITY 3: DOUBLE PROGRESSION PERFORMANCE OVERLOAD
  // =========================================================================

  let primaryAction: AdaptivePrimaryAction = 'maintain_progression';
  let primaryReasonCode: AdaptivePrimaryReasonCode = 'OVERLOAD_REPS_BUILDING';
  let title = unifiedDecision.title;
  let actionHeadline = unifiedDecision.actionHeadline;
  let primaryRationale = unifiedDecision.reason;
  let targets = {
    recommendedWeight: unifiedDecision.recommendedWeight,
    recommendedReps: unifiedDecision.recommendedReps,
    loadChangeKg: unifiedDecision.loadChangeKg,
    isJumpTooLarge: unifiedDecision.isJumpTooLarge,
    nextSessionApplicable: true,
    isApplied: Boolean(appliedTarget),
  };

  // Case 3A: All sets hit the upper rep target
  if (allSetsHitUpperTarget) {
    if (isBodyweight) {
      primaryAction = 'increase_reps';
      primaryReasonCode = 'BODYWEIGHT_REPS_OVERLOAD';
      title = 'Repetition Target Achieved';
      actionHeadline = `Aim for ${targetRepRange.max + 2} clean reps next workout`;
      primaryRationale = `You completed ${targetRepRange.max}+ reps across all ${completedSetsCount} sets. Aim for ${targetRepRange.max + 2} reps next workout or introduce a controlled 2-second pause at the bottom.`;
      targets = {
        recommendedWeight: 0,
        recommendedReps: targetRepRange.max + 2,
        loadChangeKg: 0,
        isJumpTooLarge: false,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      };
    } else if (isJumpTooLarge) {
      // Equipment increment guardrail (>15% jump) -> Scenario J
      primaryAction = 'increase_reps';
      primaryReasonCode = 'OVERLOAD_REPS_CONSOLIDATE_HIGH_INCREMENT';
      title = 'Consolidate Reps Before Weight Jump';
      actionHeadline = `Maintain ${currentWorkingWeight} kg and aim for ${targetRepRange.max + 2} reps`;
      primaryRationale = unifiedDecision.reason;
      targets = {
        recommendedWeight: currentWorkingWeight,
        recommendedReps: targetRepRange.max + 2,
        loadChangeKg: 0,
        isJumpTooLarge: true,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      };
    } else {
      // Standard safe weight increase -> Scenario A
      primaryAction = 'increase_weight';
      primaryReasonCode = 'OVERLOAD_WEIGHT_INCREMENT';
      title = 'Ready to Increase Weight';
      actionHeadline = `Increase to ${nextWeight} kg for ${targetRepRange.min} reps next workout`;
      primaryRationale = unifiedDecision.reason;
      targets = {
        recommendedWeight: nextWeight,
        recommendedReps: targetRepRange.min,
        loadChangeKg,
        isJumpTooLarge: false,
        nextSessionApplicable: true,
        isApplied: Boolean(appliedTarget),
      };
    }
  } else if (currentReps >= targetRepRange.max && !allSetsHitUpperTarget) {
    // Top set hit max, but later sets fell short (e.g. 10, 8, 7)
    primaryAction = 'increase_reps';
    primaryReasonCode = 'OVERLOAD_REPS_ALL_SETS_UNFINISHED';
    title = 'Build Consistent Volume';
    actionHeadline = `Maintain ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'weight'} and aim for ${targetRepRange.max} reps across all sets`;
    primaryRationale = `You reached ${currentReps} reps on your top set, but all working sets must complete ${targetRepRange.max} reps before stepping up in weight. Maintain ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'current load'} and bring subsequent sets to the rep ceiling.`;
    targets = {
      recommendedWeight: currentWorkingWeight > 0 ? currentWorkingWeight : null,
      recommendedReps: targetRepRange.max,
      loadChangeKg: 0,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  } else if (unifiedDecision.action === 'maintain_load') {
    // Stagnation / Plateau detected by unified progression (>= 3 exposures) -> Scenario D
    primaryAction = 'maintain_progression';
    primaryReasonCode = 'PLATEAU_STAGNANT_PERFORMANCE_REVIEW';
    title = 'Progress May Have Slowed';
    actionHeadline = `Maintain ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'load'} and focus on controlled tempo`;
    primaryRationale = `Performance has held steady at ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg × ` : ''}${currentReps} reps across 3 consecutive workouts. Maintain this working load and slow the eccentric tempo to 3 seconds, or micro-load with smaller plates (+1 kg) to stimulate new neuromuscular adaptation.`;
    targets = {
      recommendedWeight: currentWorkingWeight > 0 ? currentWorkingWeight : null,
      recommendedReps: currentReps,
      loadChangeKg: 0,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };

    additionalRecommendations.push({
      type: 'performance_review',
      title: 'Plateau Breaking Protocol',
      actionText: 'Implement 3-second eccentric tempo or micro-loading',
      rationale: `Performance has held steady across 3 consecutive sessions at ${currentWorkingWeight} kg × ${currentReps} reps. Introducing tempo pauses or micro-loading helps overcome neurological plateaus without excessive fatigue.`,
      reasonCode: 'PLATEAU_STAGNANT_VOLUME_ADJUST',
    });
  } else {
    // Normal progress building within bracket (e.g. 8-10 reps)
    const targetNextReps = Math.min(targetRepRange.max, currentReps + 1);
    primaryAction = 'increase_reps';
    primaryReasonCode = 'OVERLOAD_REPS_BUILDING';
    title = 'Maintain Weight & Build Reps';
    actionHeadline = `Maintain ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'weight'} and aim for ${targetNextReps} reps`;
    primaryRationale = `Working load is stable at ${currentWorkingWeight > 0 ? `${currentWorkingWeight} kg` : 'current weight'} (${currentReps} reps). Aim for ${targetNextReps} clean repetitions next workout before stepping up the weight.`;
    targets = {
      recommendedWeight: currentWorkingWeight > 0 ? currentWorkingWeight : null,
      recommendedReps: targetNextReps,
      loadChangeKg: 0,
      isJumpTooLarge: false,
      nextSessionApplicable: true,
      isApplied: Boolean(appliedTarget),
    };
  }

  // =========================================================================
  // PRIORITY 5: 28-DAY SUBREGION BALANCE & SPLIT SCHEDULING OVERLAY
  // =========================================================================

  // Check 5A: Persistent Subregion Underexposure (Scenario E)
  // If user's primary muscle has an underexposed subregion over 28 days
  if (isScheduledInSplit && Array.isArray(muscleIntelligence.persistentUnderexposureAlerts)) {
    const matchingSubregionAlert = muscleIntelligence.persistentUnderexposureAlerts.find(
      (a) => a.muscleGroup === primaryMuscle && a.subArea && a.subArea !== primarySubArea
    );

    if (matchingSubregionAlert && matchingSubregionAlert.subArea) {
      const subAreaName = getMuscleAreaName(matchingSubregionAlert.subArea);
      const suggestedExercise =
        SUBREGION_SUGGESTED_EXERCISES[matchingSubregionAlert.subArea] || 'rotational exercise variant';

      additionalRecommendations.push({
        type: 'stimulus_exercise_adjustment',
        title: `${subAreaName} Subregion Underexposed`,
        actionText: `Incorporate ${suggestedExercise} into your rotation`,
        rationale: `While strength on ${resolvedName} is progressing cleanly, 28-day tracking shows ${subAreaName} is persistently underexposed (< 3 sets/wk). Consider adding ${suggestedExercise} to maintain balanced joint and muscular development.`,
        reasonCode: 'SUBREGION_UNDEREXPOSURE_ROTATION',
        targetMuscleGroup: primaryMuscle,
        targetSubArea: matchingSubregionAlert.subArea,
        suggestedExerciseName: suggestedExercise,
      });
    }
  }

  // Check 5B: Compound-Supported Only Recognition (Scenario F)
  // If this muscle receives >= 8 supported sets and 0 direct sets, mark isolation as optional
  if (primaryGroupReport) {
    const isSupportedSufficient =
      primaryGroupReport.directSets28d === 0 &&
      primaryGroupReport.supportedSets28d >= 8;

    if (isCompoundSupportedOnly || isSupportedSufficient) {
      additionalRecommendations.push({
        type: 'stimulus_exercise_adjustment',
        title: 'Compound Synergist Volume Sufficient',
        actionText: 'Direct isolation exercises are optional',
        rationale: `${primaryGroupReport.displayName} receives substantial mechanical tension from compound multi-joint movements (>= 8 confirmed supported sets). Direct isolation is optional and can be rotated based on personal preference.`,
        reasonCode: 'COMPOUND_SYNERGIST_SUFFICIENT',
        targetMuscleGroup: primaryMuscle,
      });
    }
  }

  // Check 5C: Split-Excluded Muscle Protection (Scenario G)
  // If the muscle is NOT in the user's active split, we already suppressed unsolicited alerts!
  // Any underexposure alert for non-split muscles is omitted.

  return {
    exerciseId,
    exerciseName: resolvedName,
    equipment,
    isBodyweight,
    primaryMuscle,
    primarySubArea,
    currentWorkingWeight,
    currentReps,
    completedSetsCount,
    allSetsHitUpperTarget,
    targetRepRange,
    primaryAction,
    primaryReasonCode,
    title,
    actionHeadline,
    primaryRationale,
    supportingEvidence: unifiedDecision.evidenceDetails,
    targets,
    additionalRecommendations,
    confidence,
    warnings,
    limitations,
    dataSufficiency: {
      totalExposures,
      hasSufficientHistory: true,
      statusLabel: 'Sufficient History',
    },
    intelligenceContext,
  };
}
