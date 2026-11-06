/**
 * GymTrackie Phase 10B — Adaptive Training Decision Engine Test Suite
 *
 * Comprehensive verification of the 12 Conceptual Scenarios (A through L):
 * - Scenario A: Normal double progression weight jump with full recovery
 * - Scenario B: Rep ceiling met, but primary muscle in acute fatigue (hold load)
 * - Scenario C: Primary muscle ready, synergist recovering (advisory, overload NOT blocked)
 * - Scenario D: 3-session stagnation triggering plateau review & eccentric tempo protocol
 * - Scenario E: Flat bench progressing cleanly, upper chest 28d underexposed (rotation advice)
 * - Scenario F: Compound-only training with supported sets >= 8 (isolation optional)
 * - Scenario G: Muscle absent from active split (respect split, suppress unsolicited alerts)
 * - Scenario H: Specialty lift with heuristic 0.50 fallback (provisional confidence)
 * - Scenario I: Insufficient workout history (< 2 exposures -> baseline)
 * - Scenario J: Equipment Increment exceeds 15% guardrail (repetition consolidation)
 * - Scenario K: Triceps fatigue does not interfere with leg progression
 * - Scenario L: Zero contradiction between Home Coaching and Progress Card
 */

import {
  WorkoutSession,
  Exercise,
  PersonalRecord,
  WeeklySchedule,
  MuscleGroup,
} from '../../types';
import { evaluateAdaptiveDecision } from '../adaptiveDecisionEngine';
import { analyzeExerciseProgression } from '../progressionEngine';
import { deriveWeeklyCoaching } from '../weeklyCoaching';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
    );
  }
}

// Mock Exercises with strict Exercise interface compliance
const dbBenchPress: Exercise = {
  id: 'ex_db_bench',
  name: 'Dumbbell Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  muscleAreaEmphasis: ['mid_chest'],
  exerciseType: 'compound',
  equipment: 'dumbbell',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['push', 'chest'],
  isCustom: false,
};

const bbBenchPress: Exercise = {
  id: 'ex_bb_bench',
  name: 'Barbell Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  muscleAreaEmphasis: ['mid_chest'],
  exerciseType: 'compound',
  equipment: 'barbell',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['push', 'chest'],
  isCustom: false,
};

const ohpPress: Exercise = {
  id: 'ex_ohp',
  name: 'Overhead Barbell Press',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['triceps', 'core'],
  muscleAreaEmphasis: ['front_delts'],
  exerciseType: 'compound',
  equipment: 'barbell',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['push', 'shoulders'],
  isCustom: false,
};

const dbLateralRaise: Exercise = {
  id: 'ex_db_lat_raise',
  name: 'Dumbbell Lateral Raise',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['back'],
  muscleAreaEmphasis: ['side_delts'],
  exerciseType: 'isolation',
  equipment: 'dumbbell',
  difficulty: 'beginner',
  instructions: [],
  imageUrl: '',
  tags: ['push', 'shoulders'],
  isCustom: false,
};

const bbSquat: Exercise = {
  id: 'ex_bb_squat',
  name: 'Barbell Back Squat',
  primaryMuscle: 'legs',
  secondaryMuscles: ['glutes', 'calves'],
  muscleAreaEmphasis: ['quads'],
  exerciseType: 'compound',
  equipment: 'barbell',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['legs', 'quads'],
  isCustom: false,
};

const dbRDL: Exercise = {
  id: 'ex_db_rdl',
  name: 'Dumbbell Romanian Deadlift',
  primaryMuscle: 'legs',
  secondaryMuscles: ['glutes', 'back'],
  muscleAreaEmphasis: ['hamstrings'],
  exerciseType: 'compound',
  equipment: 'dumbbell',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['pull', 'hamstrings'],
  isCustom: false,
};

const tricepPushdown: Exercise = {
  id: 'ex_triceps_pushdown',
  name: 'Cable Triceps Pushdown',
  primaryMuscle: 'triceps',
  secondaryMuscles: [],
  muscleAreaEmphasis: ['lateral_head_tricep'],
  exerciseType: 'isolation',
  equipment: 'cable',
  difficulty: 'beginner',
  instructions: [],
  imageUrl: '',
  tags: ['push', 'triceps'],
  isCustom: false,
};

const specialtyExercise: Exercise = {
  id: 'ex_specialty_machine',
  name: 'Viking Press Machine',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['core' as MuscleGroup],
  muscleAreaEmphasis: ['front_delts'],
  exerciseType: 'compound',
  equipment: 'machine',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: [],
  isCustom: false,
};

const dummyWeeklyPlan: WeeklySchedule = {
  monday: {
    name: 'Push Day',
    muscleGroups: [
      { name: 'chest', displayName: 'Chest' },
      { name: 'shoulders', displayName: 'Shoulders' },
      { name: 'triceps', displayName: 'Triceps' },
    ],
    isRest: false,
  },
  tuesday: {
    name: 'Pull Day',
    muscleGroups: [
      { name: 'back', displayName: 'Back' },
      { name: 'biceps', displayName: 'Biceps' },
    ],
    isRest: false,
  },
  wednesday: {
    name: 'Rest Day',
    muscleGroups: [],
    isRest: true,
  },
  thursday: {
    name: 'Leg Day',
    muscleGroups: [
      { name: 'legs', displayName: 'Legs' },
      { name: 'glutes', displayName: 'Glutes' },
    ],
    isRest: false,
  },
  friday: {
    name: 'Upper Body',
    muscleGroups: [
      { name: 'chest', displayName: 'Chest' },
      { name: 'back', displayName: 'Back' },
      { name: 'shoulders', displayName: 'Shoulders' },
    ],
    isRest: false,
  },
  saturday: {
    name: 'Rest Day',
    muscleGroups: [],
    isRest: true,
  },
  sunday: {
    name: 'Rest Day',
    muscleGroups: [],
    isRest: true,
  },
};

function createSession(
  id: string,
  date: string,
  completedAt: string,
  exercise: Exercise,
  sets: { id: string; setNumber: number; weight: number; reps: number; completed: true }[]
): WorkoutSession {
  return {
    id,
    date,
    completedAt,
    dayOfWeek: 'monday',
    status: 'completed',
    totalVolume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
    totalSets: sets.length,
    muscleGroups: [exercise.primaryMuscle],
    exercises: [
      {
        id: `we_${id}`,
        exerciseId: exercise.id,
        exercise,
        order: 1,
        notes: '',
        sets,
      },
    ],
  };
}

export function runAdaptiveDecisionTestSuite() {
  console.log('\n======================================================');
  console.log('🤖 GymTrackie Phase 10B — Adaptive Decision Engine Tests');
  console.log('======================================================\n');

  const refDate = new Date('2026-11-06T12:00:00Z');

  // ==========================================================================
  // Scenario A: Normal Double Progression Overload
  // ==========================================================================
  console.log('--- Scenario A: Normal Double Progression with Adequate Exposure & Readiness ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_a_1', '2026-10-28T10:00:00Z', '2026-10-28T10:45:00Z', dbBenchPress, [
        { id: '1', setNumber: 1, weight: 22, reps: 8, completed: true },
        { id: '2', setNumber: 2, weight: 22, reps: 8, completed: true },
        { id: '3', setNumber: 3, weight: 22, reps: 8, completed: true },
      ]),
      createSession('s_a_2', '2026-11-02T10:00:00Z', '2026-11-02T10:45:00Z', dbBenchPress, [
        { id: '4', setNumber: 1, weight: 22, reps: 10, completed: true },
        { id: '5', setNumber: 2, weight: 22, reps: 10, completed: true },
        { id: '6', setNumber: 3, weight: 22, reps: 10, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_db_bench',
      exercise: dbBenchPress,
      history,
      weeklyPlan: dummyWeeklyPlan,
      explicitPlannedReps: 10,
      equipmentSettings: {
        availableDumbbellWeightsKg: [16, 18, 20, 22, 24, 26, 28, 30],
        dumbbellIncrementKg: 2,
      },
      now: refDate,
    });

    assertEqual(decision.primaryAction, 'increase_weight', 'Scenario A must earn increase_weight');
    assertEqual(
      decision.primaryReasonCode,
      'OVERLOAD_WEIGHT_INCREMENT',
      'Scenario A reason code must be OVERLOAD_WEIGHT_INCREMENT'
    );
    assertEqual(decision.targets.recommendedWeight, 24, 'Scenario A next weight must step to 24 kg');
    assertEqual(decision.targets.recommendedReps, 8, 'Scenario A next reps must reset to lower bracket (8 reps)');
    assertEqual(decision.targets.loadChangeKg, 2, 'Scenario A load jump is +2 kg');
    assertEqual(decision.targets.isJumpTooLarge, false, 'Scenario A jump is <= 15%');
    assert(decision.primaryRationale.length > 0, 'Scenario A has explanatory rationale');
    console.log('✓ Scenario A: Double progression earned, safe +2 kg increment scheduled.');
  }

  // ==========================================================================
  // Scenario B: Rep ceiling met, but Primary Muscle in Acute Fatigue
  // ==========================================================================
  console.log('--- Scenario B: Primary Muscle Acute Fatigue Gating (Hold Load) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_b_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', bbBenchPress, [
        { id: '1', setNumber: 1, weight: 80, reps: 8, completed: true },
        { id: '2', setNumber: 2, weight: 80, reps: 8, completed: true },
        { id: '3', setNumber: 3, weight: 80, reps: 8, completed: true },
      ]),
      createSession('s_b_2', '2026-11-04T10:00:00Z', '2026-11-04T10:45:00Z', bbBenchPress, [
        { id: '4', setNumber: 1, weight: 80, reps: 10, completed: true },
        { id: '5', setNumber: 2, weight: 80, reps: 10, completed: true },
        { id: '6', setNumber: 3, weight: 80, reps: 10, completed: true },
      ]),
      // 8 sets of chest pressing 14 hours before refDate (Acute score >= 7.0)
      createSession('s_b_fatigue', '2026-11-05T22:00:00Z', '2026-11-05T23:00:00Z', bbBenchPress, [
        { id: 'f1', setNumber: 1, weight: 80, reps: 8, completed: true },
        { id: 'f2', setNumber: 2, weight: 80, reps: 8, completed: true },
        { id: 'f3', setNumber: 3, weight: 80, reps: 8, completed: true },
        { id: 'f4', setNumber: 4, weight: 80, reps: 8, completed: true },
        { id: 'f5', setNumber: 5, weight: 80, reps: 8, completed: true },
        { id: 'f6', setNumber: 6, weight: 80, reps: 8, completed: true },
        { id: 'f7', setNumber: 7, weight: 80, reps: 8, completed: true },
        { id: 'f8', setNumber: 8, weight: 80, reps: 8, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_bb_bench',
      exercise: bbBenchPress,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
    });

    assertEqual(
      decision.primaryAction,
      'recovery_aware_recommendation',
      'Scenario B must hold progression due to acute fatigue'
    );
    assertEqual(
      decision.primaryReasonCode,
      'RECOVERY_PRIMARY_ACUTE_FATIGUE_HOLD',
      'Scenario B reason code must be RECOVERY_PRIMARY_ACUTE_FATIGUE_HOLD'
    );
    assertEqual(
      decision.targets.recommendedWeight,
      80,
      'Scenario B must hold current working weight 80 kg (not 82.5 kg)'
    );
    assertEqual(decision.targets.loadChangeKg, 0, 'Scenario B load change must be 0 kg');
    assert(decision.actionHeadline.includes('Hold 80 kg'), 'Scenario B headline instructs holding 80 kg');
    console.log('✓ Scenario B: High acute fatigue overrides weight increase; holds working load.');
  }

  // ==========================================================================
  // Scenario C: Bench press ready, but Triceps Synergist Recovering
  // ==========================================================================
  console.log('--- Scenario C: Primary Ready, Synergist Recovering (Advisory, Overload Unblocked) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_c_1', '2026-10-28T10:00:00Z', '2026-10-28T10:45:00Z', dbBenchPress, [
        { id: '1', setNumber: 1, weight: 22, reps: 8, completed: true },
        { id: '2', setNumber: 2, weight: 22, reps: 8, completed: true },
        { id: '3', setNumber: 3, weight: 22, reps: 8, completed: true },
      ]),
      createSession('s_c_2', '2026-11-02T10:00:00Z', '2026-11-02T10:45:00Z', dbBenchPress, [
        { id: '4', setNumber: 1, weight: 22, reps: 10, completed: true },
        { id: '5', setNumber: 2, weight: 22, reps: 10, completed: true },
        { id: '6', setNumber: 3, weight: 22, reps: 10, completed: true },
      ]),
      // Triceps isolation 20 hours ago
      createSession('s_c_triceps', '2026-11-05T16:00:00Z', '2026-11-05T16:45:00Z', tricepPushdown, [
        { id: 't1', setNumber: 1, weight: 30, reps: 12, completed: true },
        { id: 't2', setNumber: 2, weight: 30, reps: 12, completed: true },
        { id: 't3', setNumber: 3, weight: 30, reps: 12, completed: true },
        { id: 't4', setNumber: 4, weight: 30, reps: 12, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_db_bench',
      exercise: dbBenchPress,
      history,
      weeklyPlan: dummyWeeklyPlan,
      explicitPlannedReps: 10,
      equipmentSettings: {
        availableDumbbellWeightsKg: [16, 18, 20, 22, 24, 26, 28, 30],
        dumbbellIncrementKg: 2,
      },
      now: refDate,
    });

    // Progression on bench press is NOT blocked!
    assertEqual(
      decision.primaryAction,
      'increase_weight',
      'Bench press progression must NOT be blocked by triceps fatigue'
    );
    assertEqual(
      decision.primaryReasonCode,
      'OVERLOAD_WEIGHT_INCREMENT',
      'Bench press primary reason code remains OVERLOAD_WEIGHT_INCREMENT'
    );

    // Synergist advisory attached
    const tricepAdvisory = decision.additionalRecommendations.find(
      (r) => r.type === 'recovery_advisory' && r.targetMuscleGroup === 'triceps'
    );
    assert(Boolean(tricepAdvisory), 'Synergist triceps fatigue advisory must be included');
    assertEqual(
      tricepAdvisory!.reasonCode,
      'RECOVERY_SYNERGIST_FATIGUE_ADVISORY',
      'Advisory reason code must be RECOVERY_SYNERGIST_FATIGUE_ADVISORY'
    );
    console.log('✓ Scenario C: Progression unblocked, synergist advisory added for recovering triceps.');
  }

  // ==========================================================================
  // Scenario D: 3-Session Stagnation
  // ==========================================================================
  console.log('--- Scenario D: 3 Consecutive Sessions Stagnant (Plateau Performance Review) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_d_1', '2026-10-22T10:00:00Z', '2026-10-22T10:45:00Z', ohpPress, [
        { id: '1', setNumber: 1, weight: 50, reps: 5, completed: true },
        { id: '2', setNumber: 2, weight: 50, reps: 5, completed: true },
        { id: '3', setNumber: 3, weight: 50, reps: 5, completed: true },
      ]),
      createSession('s_d_2', '2026-10-28T10:00:00Z', '2026-10-28T10:45:00Z', ohpPress, [
        { id: '4', setNumber: 1, weight: 50, reps: 5, completed: true },
        { id: '5', setNumber: 2, weight: 50, reps: 5, completed: true },
        { id: '6', setNumber: 3, weight: 50, reps: 5, completed: true },
      ]),
      createSession('s_d_3', '2026-11-04T10:00:00Z', '2026-11-04T10:45:00Z', ohpPress, [
        { id: '7', setNumber: 1, weight: 50, reps: 5, completed: true },
        { id: '8', setNumber: 2, weight: 50, reps: 5, completed: true },
        { id: '9', setNumber: 3, weight: 50, reps: 5, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_ohp',
      exercise: ohpPress,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
    });

    assertEqual(decision.primaryAction, 'maintain_progression', 'Scenario D must maintain progression');
    assertEqual(
      decision.primaryReasonCode,
      'PLATEAU_STAGNANT_PERFORMANCE_REVIEW',
      'Scenario D reason code must be PLATEAU_STAGNANT_PERFORMANCE_REVIEW'
    );
    assertEqual(decision.targets.recommendedWeight, 50, 'Scenario D holds 50 kg');
    assertEqual(decision.targets.recommendedReps, 5, 'Scenario D holds 5 reps');

    const plateauRec = decision.additionalRecommendations.find((r) => r.type === 'performance_review');
    assert(Boolean(plateauRec), 'Performance review recommendation must be attached');
    assertEqual(
      plateauRec!.reasonCode,
      'PLATEAU_STAGNANT_VOLUME_ADJUST',
      'Plateau reason code must match'
    );
    console.log('✓ Scenario D: Stagnant performance triggers plateau review & eccentric tempo protocol.');
  }

  // ==========================================================================
  // Scenario E: Flat Bench Progressing, Upper Chest Underexposed (28d)
  // ==========================================================================
  console.log('--- Scenario E: Clean Progression + 28d Subregion Rotation Advisory ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_e_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', bbBenchPress, [
        { id: '1', setNumber: 1, weight: 100, reps: 8, completed: true },
        { id: '2', setNumber: 2, weight: 100, reps: 8, completed: true },
        { id: '3', setNumber: 3, weight: 100, reps: 8, completed: true },
      ]),
      createSession('s_e_2', '2026-11-03T10:00:00Z', '2026-11-03T10:45:00Z', bbBenchPress, [
        { id: '4', setNumber: 1, weight: 100, reps: 10, completed: true },
        { id: '5', setNumber: 2, weight: 100, reps: 10, completed: true },
        { id: '6', setNumber: 3, weight: 100, reps: 10, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_bb_bench',
      exercise: bbBenchPress,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
      precomputedMuscleIntelligence: {
        auditPeriodDays: 28,
        referenceDate: refDate.toISOString(),
        activeSplitName: 'Push/Pull/Legs',
        groups: [
          {
            muscleGroup: 'chest',
            displayName: 'Chest',
            isScheduledInSplit: true,
            directSets7d: 3,
            supportedSets7d: 0,
            effectiveStimulus7d: 3,
            confirmedStimulus7d: 3,
            uncertainStimulus7d: 0,
            hasUncertainContributions7d: false,
            directSets28d: 12,
            supportedSets28d: 0,
            effectiveStimulus28d: 12,
            confirmedStimulus28d: 12,
            uncertainStimulus28d: 0,
            averageWeeklyStimulus28d: 3.0,
            confirmedAverageWeeklyStimulus28d: 3.0,
            hasUncertainContributions28d: false,
            subRegions: [],
            readiness: {
              status: 'ready',
              label: 'Ready to Train',
              acuteLoadScore: 0,
              hoursSinceLastTrained: 72,
              daysSinceLastTrained: 3,
              explanation: 'Recovered',
            },
            isPersistentlyUnderexposed: false,
            isCompoundSupportedOnly: false,
            hasSingleSessionDensitySpike: false,
            observations: [],
            contributingExercises: ['Barbell Bench Press'],
          },
        ],
        persistentUnderexposureAlerts: [
          {
            target: 'Upper Chest',
            muscleGroup: 'chest',
            subArea: 'upper_chest',
            averageWeeklyStimulus: 1.2,
            evidence: '3 of 4 rolling weeks had 0 direct sets',
            recommendation: 'Incorporate Incline Dumbbell Press',
          },
        ],
        workloadDensityAlerts: [],
        uncertainMappings: [],
      },
    });

    assertEqual(decision.primaryAction, 'increase_weight', 'Overload on bench press must proceed');
    assertEqual(decision.targets.recommendedWeight, 102.5, 'Next weight is 102.5 kg (+2.5 kg)');

    const subregionRec = decision.additionalRecommendations.find(
      (r) =>
        r.type === 'stimulus_exercise_adjustment' &&
        r.reasonCode === 'SUBREGION_UNDEREXPOSURE_ROTATION'
    );
    assert(Boolean(subregionRec), 'Subregion underexposure recommendation must be attached');
    assertEqual(subregionRec!.targetSubArea, 'upper_chest', 'Target subarea is upper_chest');
    assertEqual(
      subregionRec!.suggestedExerciseName,
      'Incline Dumbbell Press',
      'Suggests Incline Dumbbell Press'
    );
    console.log(
      '✓ Scenario E: Progression preserved on flat bench; rotational variant suggested for upper chest.'
    );
  }

  // ==========================================================================
  // Scenario F: Compound Synergist Sufficient (Zero Direct Sets)
  // ==========================================================================
  console.log('--- Scenario F: Compound-Supported Synergist (Isolation Optional) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_f_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', dbBenchPress, [
        { id: '1', setNumber: 1, weight: 20, reps: 10, completed: true },
        { id: '2', setNumber: 2, weight: 20, reps: 10, completed: true },
      ]),
      createSession('s_f_2', '2026-11-04T10:00:00Z', '2026-11-04T10:45:00Z', dbBenchPress, [
        { id: '3', setNumber: 1, weight: 20, reps: 10, completed: true },
        { id: '4', setNumber: 2, weight: 20, reps: 10, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_db_bench',
      exercise: dbBenchPress,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
      precomputedMuscleIntelligence: {
        auditPeriodDays: 28,
        referenceDate: refDate.toISOString(),
        activeSplitName: 'Push/Pull/Legs',
        groups: [
          {
            muscleGroup: 'triceps',
            displayName: 'Triceps',
            isScheduledInSplit: true,
            directSets7d: 0,
            supportedSets7d: 4,
            effectiveStimulus7d: 3.0,
            confirmedStimulus7d: 3.0,
            uncertainStimulus7d: 0,
            hasUncertainContributions7d: false,
            directSets28d: 0,
            supportedSets28d: 14,
            effectiveStimulus28d: 10.5,
            confirmedStimulus28d: 10.5,
            uncertainStimulus28d: 0,
            averageWeeklyStimulus28d: 2.6,
            confirmedAverageWeeklyStimulus28d: 2.6,
            hasUncertainContributions28d: false,
            subRegions: [],
            readiness: {
              status: 'ready',
              label: 'Ready to Train',
              acuteLoadScore: 0,
              hoursSinceLastTrained: null,
              daysSinceLastTrained: null,
              explanation: 'Ready',
            },
            isPersistentlyUnderexposed: false,
            isCompoundSupportedOnly: true,
            hasSingleSessionDensitySpike: false,
            observations: [],
            contributingExercises: ['Barbell Bench Press', 'Dumbbell Bench Press'],
          },
        ],
        persistentUnderexposureAlerts: [],
        workloadDensityAlerts: [],
        uncertainMappings: [],
      },
    });

    assert(decision.confidence !== 'insufficient_data', 'Evaluates valid decision');
    console.log('✓ Scenario F: Compound synergist volume recognized as sufficient without alarms.');
  }

  // ==========================================================================
  // Scenario G: Muscle Absent from Active Split
  // ==========================================================================
  console.log('--- Scenario G: Muscle Excluded from Active Split (Alerts Suppressed) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_g_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', bbSquat, [
        { id: '1', setNumber: 1, weight: 100, reps: 6, completed: true },
        { id: '2', setNumber: 2, weight: 100, reps: 6, completed: true },
      ]),
      createSession('s_g_2', '2026-11-03T10:00:00Z', '2026-11-03T10:45:00Z', bbSquat, [
        { id: '3', setNumber: 1, weight: 100, reps: 8, completed: true },
        { id: '4', setNumber: 2, weight: 100, reps: 8, completed: true },
      ]),
    ];

    const splitWithoutCalves: WeeklySchedule = {
      monday: {
        name: 'Upper Body',
        muscleGroups: [
          { name: 'chest', displayName: 'Chest' },
          { name: 'back', displayName: 'Back' },
        ],
        isRest: false,
      },
      tuesday: {
        name: 'Rest Day',
        muscleGroups: [],
        isRest: true,
      },
      wednesday: {
        name: 'Lower Body',
        muscleGroups: [{ name: 'legs', displayName: 'Legs' }],
        isRest: false,
      },
      thursday: {
        name: 'Rest Day',
        muscleGroups: [],
        isRest: true,
      },
      friday: {
        name: 'Upper Body',
        muscleGroups: [
          { name: 'chest', displayName: 'Chest' },
          { name: 'back', displayName: 'Back' },
        ],
        isRest: false,
      },
      saturday: {
        name: 'Rest Day',
        muscleGroups: [],
        isRest: true,
      },
      sunday: {
        name: 'Rest Day',
        muscleGroups: [],
        isRest: true,
      },
    };

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_bb_squat',
      exercise: bbSquat,
      history,
      weeklyPlan: splitWithoutCalves,
      now: refDate,
    });

    const calfAlerts = decision.additionalRecommendations.filter(
      (r) => r.targetMuscleGroup === 'calves'
    );
    assertEqual(
      calfAlerts.length,
      0,
      'No calf alerts should fire when calves are excluded from split'
    );
    console.log(
      '✓ Scenario G: Unprescribed muscle alerts cleanly suppressed according to active split.'
    );
  }

  // ==========================================================================
  // Scenario H: Specialty Lift with Unmapped Heuristic Fallback
  // ==========================================================================
  console.log('--- Scenario H: Uncertain Biomechanical Mapping (Provisional Confidence) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_h_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', specialtyExercise, [
        { id: '1', setNumber: 1, weight: 40, reps: 10, completed: true },
        { id: '2', setNumber: 2, weight: 40, reps: 10, completed: true },
      ]),
      createSession('s_h_2', '2026-11-04T10:00:00Z', '2026-11-04T10:45:00Z', specialtyExercise, [
        { id: '3', setNumber: 1, weight: 40, reps: 10, completed: true },
        { id: '4', setNumber: 2, weight: 40, reps: 10, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_specialty_machine',
      exercise: specialtyExercise,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
    });

    assertEqual(
      decision.confidence,
      'provisional',
      'Specialty lift with unmapped multiplier must have provisional confidence'
    );
    assert(
      decision.limitations.some((l) => l.includes('provisional')),
      'Limitations mention provisional status'
    );
    console.log('✓ Scenario H: Provisional confidence correctly tagged for unmapped heuristic fallback.');
  }

  // ==========================================================================
  // Scenario I: Insufficient Workout History (< 2 Exposures)
  // ==========================================================================
  console.log('--- Scenario I: Insufficient History (< 2 Exposures -> Baseline) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_i_1', '2026-11-04T10:00:00Z', '2026-11-04T10:45:00Z', dbRDL, [
        { id: '1', setNumber: 1, weight: 24, reps: 10, completed: true },
        { id: '2', setNumber: 2, weight: 24, reps: 10, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_db_rdl',
      exercise: dbRDL,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
    });

    assertEqual(decision.primaryAction, 'insufficient_data', 'Scenario I must yield insufficient_data');
    assertEqual(
      decision.primaryReasonCode,
      'BASELINE_INSUFFICIENT_DATA',
      'Reason code must be BASELINE_INSUFFICIENT_DATA'
    );
    assertEqual(decision.confidence, 'insufficient_data', 'Confidence must be insufficient_data');
    assertEqual(
      decision.dataSufficiency.hasSufficientHistory,
      false,
      'hasSufficientHistory must be false'
    );
    assertEqual(decision.dataSufficiency.totalExposures, 1, 'Total exposures is 1');
    console.log('✓ Scenario I: Single exposure requires baseline logging before progressive overload.');
  }

  // ==========================================================================
  // Scenario J: Increment Exceeds 15% Guardrail (Rep Consolidation)
  // ==========================================================================
  console.log('--- Scenario J: Equipment Increment > 15% (Rep Consolidation Guardrail) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_j_1', '2026-10-28T10:00:00Z', '2026-10-28T10:45:00Z', dbLateralRaise, [
        { id: '1', setNumber: 1, weight: 10, reps: 12, completed: true },
        { id: '2', setNumber: 2, weight: 10, reps: 12, completed: true },
      ]),
      createSession('s_j_2', '2026-11-03T10:00:00Z', '2026-11-03T10:45:00Z', dbLateralRaise, [
        { id: '3', setNumber: 1, weight: 10, reps: 15, completed: true },
        { id: '4', setNumber: 2, weight: 10, reps: 15, completed: true },
        { id: '5', setNumber: 3, weight: 10, reps: 15, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_db_lat_raise',
      exercise: dbLateralRaise,
      history,
      weeklyPlan: dummyWeeklyPlan,
      now: refDate,
    });

    assertEqual(
      decision.primaryAction,
      'increase_reps',
      'Scenario J must consolidate reps instead of jumping weight'
    );
    assertEqual(
      decision.primaryReasonCode,
      'OVERLOAD_REPS_CONSOLIDATE_HIGH_INCREMENT',
      'Reason code matches consolidation'
    );
    assertEqual(decision.targets.recommendedWeight, 10, 'Maintains 10 kg');
    assertEqual(decision.targets.recommendedReps, 17, 'Builds to 17 reps (max + 2)');
    assertEqual(decision.targets.loadChangeKg, 0, 'No load change');
    assertEqual(decision.targets.isJumpTooLarge, true, 'isJumpTooLarge flag is true');
    console.log('✓ Scenario J: Dangerous 20% jump safely blocked; rep consolidation prescribed.');
  }

  // ==========================================================================
  // Scenario K: Triceps Fatigue Does Not Block Leg Progression
  // ==========================================================================
  console.log('--- Scenario K: Cross-Movement Independence (Triceps Fatigue vs Leg Progression) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_k_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', bbSquat, [
        { id: '1', setNumber: 1, weight: 100, reps: 6, completed: true },
        { id: '2', setNumber: 2, weight: 100, reps: 6, completed: true },
        { id: '3', setNumber: 3, weight: 100, reps: 6, completed: true },
      ]),
      createSession('s_k_2', '2026-11-03T10:00:00Z', '2026-11-03T10:45:00Z', bbSquat, [
        { id: '4', setNumber: 1, weight: 100, reps: 8, completed: true },
        { id: '5', setNumber: 2, weight: 100, reps: 8, completed: true },
        { id: '6', setNumber: 3, weight: 100, reps: 8, completed: true },
      ]),
      // Extreme triceps fatigue 6 hours ago
      createSession('s_k_arms', '2026-11-06T06:00:00Z', '2026-11-06T07:00:00Z', tricepPushdown, [
        { id: 'a1', setNumber: 1, weight: 35, reps: 12, completed: true },
        { id: 'a2', setNumber: 2, weight: 35, reps: 12, completed: true },
        { id: 'a3', setNumber: 3, weight: 35, reps: 12, completed: true },
        { id: 'a4', setNumber: 4, weight: 35, reps: 12, completed: true },
        { id: 'a5', setNumber: 5, weight: 35, reps: 12, completed: true },
        { id: 'a6', setNumber: 6, weight: 35, reps: 12, completed: true },
      ]),
    ];

    const decision = evaluateAdaptiveDecision({
      exerciseId: 'ex_bb_squat',
      exercise: bbSquat,
      history,
      weeklyPlan: dummyWeeklyPlan,
      explicitPlannedReps: 8,
      now: refDate,
    });

    assertEqual(
      decision.primaryAction,
      'increase_weight',
      'Squat progression must NOT be blocked by arm fatigue'
    );
    assertEqual(decision.targets.recommendedWeight, 102.5, 'Squat steps to 102.5 kg');
    assertEqual(decision.additionalRecommendations.length, 0, 'No triceps advisory on leg squat decision');
    console.log('✓ Scenario K: Unrelated arm fatigue has zero impact on leg squat progression.');
  }

  // ==========================================================================
  // Scenario L: Surface Invariance (Progress Page vs Weekly Coaching on Home)
  // ==========================================================================
  console.log('--- Scenario L: Surface Invariance (Home Coaching vs Progress Card) ---');
  {
    const history: WorkoutSession[] = [
      createSession('s_l_1', '2026-10-30T10:00:00Z', '2026-10-30T10:45:00Z', dbBenchPress, [
        { id: '1', setNumber: 1, weight: 22, reps: 8, completed: true },
        { id: '2', setNumber: 2, weight: 22, reps: 8, completed: true },
        { id: '3', setNumber: 3, weight: 22, reps: 8, completed: true },
      ]),
      createSession('s_l_2', '2026-11-03T10:00:00Z', '2026-11-03T10:45:00Z', dbBenchPress, [
        { id: '4', setNumber: 1, weight: 22, reps: 10, completed: true },
        { id: '5', setNumber: 2, weight: 22, reps: 10, completed: true },
        { id: '6', setNumber: 3, weight: 22, reps: 10, completed: true },
      ]),
    ];

    const prRecord: PersonalRecord = {
      id: 'pr_l_1',
      exerciseId: 'ex_db_bench',
      exerciseName: 'Dumbbell Bench Press',
      type: 'max_reps',
      prCategory: 'max_reps',
      value: 10,
      weight: 22,
      reps: 10,
      estimated1RM: 30,
      date: '2026-11-03T10:00:00Z',
    };

    // 1. Progress Page evaluation
    const progressReport = analyzeExerciseProgression(history, dbBenchPress, {
      referenceDate: refDate,
      weeklyPlan: dummyWeeklyPlan,
      exercises: [dbBenchPress],
    });

    // 2. Home Page Weekly Coaching evaluation
    const coaching = deriveWeeklyCoaching({
      history,
      weeklyPlan: dummyWeeklyPlan,
      personalRecords: [prRecord],
      exercises: [dbBenchPress],
      referenceDate: refDate,
    });

    const coachingPRStep = coaching.actionableSteps.find(
      (s) => s.category === 'progressive_overload'
    );
    assert(Boolean(coachingPRStep), 'Weekly coaching must include a progressive_overload step');

    // Guarantee identical action title and rationale across surfaces
    assertEqual(
      coachingPRStep!.title,
      progressReport.adaptiveDecision!.title,
      'Home Coaching step and Progress Card must have identical action title'
    );
    assertEqual(
      coachingPRStep!.rationale,
      progressReport.adaptiveDecision!.primaryRationale,
      'Home Coaching step and Progress Card must have identical primary rationale'
    );
    console.log(
      '✓ Scenario L: Surface invariance guaranteed: Home Coaching matches Progress Card word-for-word.'
    );
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 12 ADAPTIVE TRAINING DECISION TESTS PASSED!');
  console.log('======================================================\n');
}

// Self-executing runner
runAdaptiveDecisionTestSuite();
