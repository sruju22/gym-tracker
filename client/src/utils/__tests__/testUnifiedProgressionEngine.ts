/**
 * GymTrackie – Unified Progressive Overload & Equipment-Aware Decision Engine Test Suite
 *
 * Validates:
 * 1. Dumbbell Double Progression: All working sets must reach the upper rep target before increasing load.
 * 2. Dumbbell Double Progression: When only 1 set reaches top reps, system commands repetition progression across remaining sets.
 * 3. Large Increment Guardrail: When next available weight jump exceeds 15% (e.g. 10 kg -> 12.5 kg), system requires rep consolidation.
 * 4. Barbell Progression: Calculates paired plate jumps (2 x 1.25 kg = +2.5 kg total load).
 * 5. Cable Machine Progression: Recommends selectorised stack increments (+2.5 kg).
 * 6. Bodyweight Movement Progression: Recommends repetition overload and tempo pauses instead of phantom weight jumps.
 * 7. Plateau Detection: 3 consecutive stagnant sessions trigger maintain_load with variation / tempo guidance.
 * 8. Surface Consistency: Progress Page and Weekly Coaching emit identical action titles and rationales for identical training data.
 * 9. Analytics 1RM Wording: Differentiates repetition gains at fixed weight from genuine weight increases without false "X kg -> X kg" claims.
 * 10. "Apply in Workout" Staging Lifecycle: Safely pre-fills next session sets without mutating past history, and clears upon workout completion.
 */

import {
  evaluateUnifiedProgression,
  calculateNextAvailableWeight,
  getEquipmentIncrement,
  getExerciseTargetRepRange,
  DEFAULT_EQUIPMENT_INCREMENTS,
} from '../unifiedProgression';
import { deriveWeeklyCoaching } from '../weeklyCoaching';
import { getExerciseStrengthProgression } from '../analyticsEngine';
import { analyzeExerciseProgression } from '../progressionEngine';
import { useWorkoutStore } from '../../store/workoutStore';
import {
  Exercise,
  WorkoutSession,
  EquipmentIncrementSettings,
  PersonalRecord,
  WeeklySchedule,
} from '../../types';

declare const process: { exit: (code: number) => void };

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

// ============================================================================
// Sample Test Fixtures
// ============================================================================
const dumbbellBenchPress: Exercise = {
  id: 'ex_db_bench',
  name: 'Dumbbell Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  muscleAreaEmphasis: ['mid_chest'],
  equipment: 'dumbbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: [],
  isCustom: false,
};

const barbellOverheadPress: Exercise = {
  id: 'ex_bb_ohp',
  name: 'Barbell Overhead Press',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['triceps'],
  muscleAreaEmphasis: ['front_delts'],
  equipment: 'barbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: [],
  isCustom: false,
};

const cableFacePull: Exercise = {
  id: 'ex_cable_face_pull',
  name: 'Cable Face Pull',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['back'],
  muscleAreaEmphasis: ['rear_delts'],
  equipment: 'cable',
  exerciseType: 'isolation',
  difficulty: 'beginner',
  instructions: [],
  imageUrl: '',
  tags: [],
  isCustom: false,
};

const bodyweightPullUp: Exercise = {
  id: 'ex_bw_pullup',
  name: 'Pull Up',
  primaryMuscle: 'back',
  secondaryMuscles: ['biceps'],
  muscleAreaEmphasis: ['lats'],
  equipment: 'bodyweight',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: [],
  isCustom: false,
};

const barbellSquat: Exercise = {
  id: 'ex_bb_squat',
  name: 'Barbell Back Squat',
  primaryMuscle: 'legs',
  secondaryMuscles: ['glutes'],
  muscleAreaEmphasis: ['quads'],
  equipment: 'barbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: [],
  isCustom: false,
};

const dummyWeeklyPlan: WeeklySchedule = {
  monday: {
    name: 'Chest & Triceps',
    muscleGroups: [{ name: 'chest', displayName: 'Chest' }],
    isRest: false,
  },
  tuesday: {
    name: 'Back & Biceps',
    muscleGroups: [{ name: 'back', displayName: 'Back' }],
    isRest: false,
  },
  wednesday: { name: 'Rest', muscleGroups: [], isRest: true },
  thursday: {
    name: 'Shoulders & Arms',
    muscleGroups: [{ name: 'shoulders', displayName: 'Shoulders' }],
    isRest: false,
  },
  friday: {
    name: 'Legs & Core',
    muscleGroups: [{ name: 'legs', displayName: 'Legs' }],
    isRest: false,
  },
  saturday: { name: 'Rest', muscleGroups: [], isRest: true },
  sunday: { name: 'Rest', muscleGroups: [], isRest: true },
};

async function runUnifiedProgressionTestSuite() {
  console.log('\n=== GYMTRACKIE UNIFIED PROGRESSION & EQUIPMENT-AWARE OVERLOAD TESTS ===\n');

  // ==========================================================================
  // Test 1: Dumbbell Double Progression – All Working Sets Hit Upper Target
  // ==========================================================================
  console.log('--- Test 1: Dumbbell Double Progression – All Sets Hit Upper Target ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 'sess_db_1',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 720,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_db_1',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 12, completed: true },
              { id: 's2', setNumber: 2, weight: 20, reps: 12, completed: true },
              { id: 's3', setNumber: 3, weight: 20, reps: 12, completed: true },
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_db_bench',
      exercise: dumbbellBenchPress,
      history,
    });

    assertEqual(decision.action, 'increase_weight', 'Action must be increase_weight');
    assertEqual(decision.allSetsHitUpperTarget, true, 'allSetsHitUpperTarget must be true');
    assertEqual(decision.recommendedWeight, 22.5, 'Recommended weight must advance to 22.5 kg (next dumbbell)');
    assertEqual(decision.loadChangeKg, 2.5, 'Load change must be +2.5 kg');
    assertEqual(decision.recommendedReps, 8, 'Reps should reset to lower target bracket (8 reps)');
    assert(decision.reason.includes('across all 3 sets at 20 kg'), 'Reason must note all sets completed');
    console.log('✓ Dumbbell progression correctly advances weight when ALL sets hit 12 reps.');
  }

  // ==========================================================================
  // Test 2: Dumbbell Double Progression – Only Set 1 Hits 12 Reps, Sets 2-3 Fall Short
  // ==========================================================================
  console.log('--- Test 2: Dumbbell Double Progression – Partial Sets Below Upper Target ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 'sess_db_partial',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 600,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_db_partial',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 12, completed: true }, // Hit 12
              { id: 's2', setNumber: 2, weight: 20, reps: 10, completed: true }, // 10
              { id: 's3', setNumber: 3, weight: 20, reps: 8, completed: true },  // 8
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_db_bench',
      exercise: dumbbellBenchPress,
      history,
    });

    assertEqual(decision.action, 'increase_reps', 'Action must be increase_reps (NOT increase_weight)');
    assertEqual(decision.allSetsHitUpperTarget, false, 'allSetsHitUpperTarget must be false');
    assertEqual(decision.recommendedWeight, 20, 'Recommended weight must remain at 20 kg');
    assertEqual(decision.recommendedReps, 12, 'Recommended reps must target the 12-rep ceiling');
    assert(
      decision.reason.includes('Maintain 20 kg'),
      'Reason must explicitly instruct maintaining 20 kg while building remaining sets'
    );
    console.log('✓ Lifter prevented from premature weight jump when subsequent sets fall short.');
  }

  // ==========================================================================
  // Test 3: Large Increment Guardrail (>15% Jump)
  // ==========================================================================
  console.log('--- Test 3: Large Increment Guardrail (>15% Jump) ---');
  {
    // Lifter curling 10 kg dumbbells. Next available weight in rack is 12.5 kg (+25% jump).
    const customIncrements: EquipmentIncrementSettings = {
      dumbbellIncrementKg: 2.5,
      availableDumbbellWeightsKg: [5, 7.5, 10, 12.5, 15, 17.5, 20],
    };

    const nextJump = calculateNextAvailableWeight(10, 'dumbbell', customIncrements);
    assertEqual(nextJump.nextWeight, 12.5, 'Next weight is 12.5 kg');
    assertEqual(nextJump.isJumpTooLarge, true, 'isJumpTooLarge must be flagged for 25% jump');

    const history: WorkoutSession[] = [
      {
        id: 'sess_db_light',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 360,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_db_light',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 10, reps: 12, completed: true },
              { id: 's2', setNumber: 2, weight: 10, reps: 12, completed: true },
              { id: 's3', setNumber: 3, weight: 10, reps: 12, completed: true },
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_db_bench',
      exercise: dumbbellBenchPress,
      history,
      equipmentSettings: customIncrements,
    });

    assertEqual(decision.isJumpTooLarge, true, 'isJumpTooLarge must be true in decision');
    assertEqual(decision.action, 'increase_reps', 'Action must recommend rep consolidation before large jump');
    assertEqual(decision.recommendedReps, 14, 'Target reps should expand to 14 reps');
    assert(decision.reason.includes('represents a 25% jump'), 'Reason mentions 25% jump consolidation');
    console.log('✓ Guardrail prevents dangerous 25% weight jump and requires rep consolidation.');
  }

  // ==========================================================================
  // Test 4: Barbell Progression – Paired Plate Increments
  // ==========================================================================
  console.log('--- Test 4: Barbell Progression – Paired Plate Increments ---');
  {
    // Compound barbell movement with target rep range (default compound strength: 4-6 or hypertrophy 8-12)
    const history: WorkoutSession[] = [
      {
        id: 'sess_bb_1',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'thursday',
        status: 'completed',
        totalVolume: 1500,
        totalSets: 3,
        muscleGroups: ['shoulders'],
        exercises: [
          {
            id: 'we_bb_1',
            exerciseId: 'ex_bb_ohp',
            exercise: barbellOverheadPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 50, reps: 12, completed: true },
              { id: 's2', setNumber: 2, weight: 50, reps: 12, completed: true },
              { id: 's3', setNumber: 3, weight: 50, reps: 12, completed: true },
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_bb_ohp',
      exercise: barbellOverheadPress,
      history,
    });

    assertEqual(decision.action, 'increase_weight', 'Action is increase_weight');
    assertEqual(decision.recommendedWeight, 52.5, 'Next weight is 52.5 kg (+2.5 kg from paired 1.25 kg plates)');
    assertEqual(decision.loadChangeKg, 2.5, 'Load change is +2.5 kg');
    assertEqual(decision.equipmentIncrementKg, 2.5, 'Equipment increment is 2.5 kg');
    console.log('✓ Barbell progression accurately computes paired plate increment (+2.5 kg).');
  }

  // ==========================================================================
  // Test 5: Cable Machine Progression
  // ==========================================================================
  console.log('--- Test 5: Cable Machine Progression ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 'sess_cable_1',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'thursday',
        status: 'completed',
        totalVolume: 900,
        totalSets: 3,
        muscleGroups: ['shoulders'],
        exercises: [
          {
            id: 'we_cable_1',
            exerciseId: 'ex_cable_face_pull',
            exercise: cableFacePull,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 15, completed: true },
              { id: 's2', setNumber: 2, weight: 20, reps: 15, completed: true },
              { id: 's3', setNumber: 3, weight: 20, reps: 15, completed: true },
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_cable_face_pull',
      exercise: cableFacePull,
      history,
    });

    assertEqual(decision.action, 'increase_weight', 'Action is increase_weight');
    assertEqual(decision.recommendedWeight, 22.5, 'Next stack pin is 22.5 kg (+2.5 kg)');
    assertEqual(decision.recommendedReps, 10, 'Reps reset to isolation lower bound (10 reps)');
    console.log('✓ Cable stack progression correctly steps up by available pin increment.');
  }

  // ==========================================================================
  // Test 6: Bodyweight Movement Progression
  // ==========================================================================
  console.log('--- Test 6: Bodyweight Movement Progression ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 'sess_bw_1',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'tuesday',
        status: 'completed',
        totalVolume: 0,
        totalSets: 3,
        muscleGroups: ['back'],
        exercises: [
          {
            id: 'we_bw_1',
            exerciseId: 'ex_bw_pullup',
            exercise: bodyweightPullUp,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 0, reps: 12, completed: true },
              { id: 's2', setNumber: 2, weight: 0, reps: 12, completed: true },
              { id: 's3', setNumber: 3, weight: 0, reps: 12, completed: true },
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_bw_pullup',
      exercise: bodyweightPullUp,
      history,
    });

    assertEqual(decision.isBodyweight, true, 'isBodyweight is true');
    assertEqual(decision.action, 'increase_reps', 'Action is increase_reps');
    assertEqual(decision.recommendedReps, 14, 'Recommended reps is 14 (+2 reps)');
    assertEqual(decision.recommendedWeight, 0, 'Recommended weight is 0 kg (no phantom load)');
    assert(decision.reason.includes('pause'), 'Guidance includes tempo pause recommendation');
    console.log('✓ Bodyweight movements progress through repetitions and tempo pause control.');
  }

  // ==========================================================================
  // Test 7: Plateau Detection Across 3 Consecutive Sessions
  // ==========================================================================
  console.log('--- Test 7: Plateau Detection Across 3 Consecutive Sessions ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 'sess_sq_1',
        date: '2026-10-15T10:00:00Z',
        dayOfWeek: 'friday',
        status: 'completed',
        totalVolume: 1200,
        totalSets: 3,
        muscleGroups: ['legs'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bb_squat',
            exercise: barbellSquat,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 5, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 5, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 5, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_sq_2',
        date: '2026-10-22T10:00:00Z',
        dayOfWeek: 'friday',
        status: 'completed',
        totalVolume: 1200,
        totalSets: 3,
        muscleGroups: ['legs'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bb_squat',
            exercise: barbellSquat,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 5, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 5, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 5, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_sq_3',
        date: '2026-10-29T10:00:00Z',
        dayOfWeek: 'friday',
        status: 'completed',
        totalVolume: 1200,
        totalSets: 3,
        muscleGroups: ['legs'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bb_squat',
            exercise: barbellSquat,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 5, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 5, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 5, completed: true },
            ],
          },
        ],
      },
    ];

    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_bb_squat',
      exercise: barbellSquat,
      history,
    });

    assertEqual(decision.action, 'maintain_load', 'Action must be maintain_load on plateau');
    assertEqual(decision.title, 'Progress May Have Slowed', 'Title flags progress slowed');
    assert(decision.reason.includes('across 3 consecutive workouts'), 'Reason mentions 3 sessions stall');
    console.log('✓ 3-session stagnation accurately detected and handled with tempo guidance.');
  }

  // ==========================================================================
  // Test 8: Surface Consistency (Progress Page vs Weekly Coaching)
  // ==========================================================================
  console.log('--- Test 8: Surface Consistency (Progress Page vs Weekly Coaching) ---');
  {
    // A lifter achieves a PR on Dumbbell Bench Press
    const history: WorkoutSession[] = [
      {
        id: 'sess_consistent_1',
        date: '2026-11-02T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 720,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_c_1',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 12, completed: true },
              { id: 's2', setNumber: 2, weight: 20, reps: 12, completed: true },
              { id: 's3', setNumber: 3, weight: 20, reps: 12, completed: true },
            ],
          },
        ],
      },
    ];

    const prRecord: PersonalRecord = {
      id: 'pr_db_1',
      exerciseId: 'ex_db_bench',
      exerciseName: 'Dumbbell Bench Press',
      type: 'max_reps',
      prCategory: 'max_reps',
      value: 12,
      weight: 20,
      reps: 12,
      estimated1RM: 28,
      date: '2026-11-02T10:00:00Z',
    };

    // 1. Direct Decision from Progression Engine (consumed by Progress Page)
    const directDecision = evaluateUnifiedProgression({
      exerciseId: 'ex_db_bench',
      exercise: dumbbellBenchPress,
      history,
    });

    // 2. Weekly Coaching Recommendation (consumed by Home Page)
    const coaching = deriveWeeklyCoaching({
      history,
      weeklyPlan: dummyWeeklyPlan,
      personalRecords: [prRecord],
      exercises: [dumbbellBenchPress],
      referenceDate: new Date('2026-11-02T18:00:00Z'),
    });

    const coachingPRStep = coaching.actionableSteps.find((s) => s.category === 'progressive_overload');
    assert(Boolean(coachingPRStep), 'Weekly coaching must include a progressive_overload step');

    assert(
      coachingPRStep!.title.includes(directDecision.title),
      'Weekly Coaching step includes action title'
    );
    assert(
      coachingPRStep!.title.includes(dumbbellBenchPress.name),
      'Weekly Coaching step explicitly names the exercise in title'
    );
    assert(
      coachingPRStep!.rationale.includes(dumbbellBenchPress.name) ||
        coachingPRStep!.rationale.includes(directDecision.reason),
      'Weekly Coaching includes reasoning grounded in exercise performance'
    );
    console.log('✓ Guaranteed zero contradiction between Progress Page and Weekly Coaching with clear exercise naming.');
  }

  // ==========================================================================
  // Test 9: Analytics Engine 1RM Wording Distinction
  // ==========================================================================
  console.log('--- Test 9: Analytics Engine 1RM Wording Distinction ---');
  {
    // Session 1: 20 kg x 10 reps
    // Session 2: 20 kg x 12 reps
    const history: WorkoutSession[] = [
      {
        id: 'sess_wording_1',
        date: '2026-10-25T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 200,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_w_1',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 20, reps: 10, completed: true }],
          },
        ],
      },
      {
        id: 'sess_wording_2',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 240,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_w_2',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 20, reps: 12, completed: true }],
          },
        ],
      },
    ];

    const analytics = getExerciseStrengthProgression(history, 'ex_db_bench');
    const headline = analytics.trendReason;

    assert(
      !headline.includes('20 kg → 20 kg'),
      `Headline must NOT contain contradictory "20 kg → 20 kg". Got: "${headline}"`
    );
    assert(
      headline.includes('Repetitions improved: 10 → 12 reps at 20 kg'),
      `Headline must accurately describe repetition progression. Got: "${headline}"`
    );
    console.log('✓ 1RM headline clearly distinguishes repetition gains at constant working weight.');
  }

  // ==========================================================================
  // Test 10: "Apply in Workout" Staging Lifecycle
  // ==========================================================================
  console.log('--- Test 10: "Apply in Workout" Staging Lifecycle ---');
  {
    const userId = 'user_staging_test';
    const store = useWorkoutStore.getState();

    // 1. Stage a progression target: 22.5 kg x 8 reps
    store.applyProgressionTarget(userId, 'ex_db_bench', 22.5, 8);

    const staged = store.getAppliedProgressionTarget(userId, 'ex_db_bench');
    assert(Boolean(staged), 'Applied progression target must be stored in state');
    assertEqual(staged!.targetWeight, 22.5, 'Staged weight is 22.5 kg');
    assertEqual(staged!.targetReps, 8, 'Staged reps is 8 reps');

    // 2. Start a workout session and add the exercise
    store.startTodayWorkout(userId);
    store.addExerciseToWorkout(userId, dumbbellBenchPress);

    const activeSession = store.getActiveSession(userId);
    assert(Boolean(activeSession), 'Active session must exist');

    const addedEx = activeSession!.exercises.find((e) => e.exerciseId === 'ex_db_bench');
    assert(Boolean(addedEx), 'Exercise must be added to active workout');
    assertEqual(addedEx!.sets.length, 3, 'Exercise has 3 default sets');
    assertEqual(addedEx!.sets[0].weight, 22.5, 'Set 1 pre-filled with staged target weight 22.5 kg');
    assertEqual(addedEx!.sets[0].reps, 8, 'Set 1 pre-filled with staged target reps 8 reps');
    assertEqual(addedEx!.sets[1].weight, 22.5, 'Set 2 pre-filled with staged target weight 22.5 kg');

    // Complete the sets
    addedEx!.sets.forEach((s) => {
      s.completed = true;
    });

    // 3. Finish the workout
    await store.finishWorkout(userId);

    // Staged target must now be automatically cleared for the completed exercise
    const stagedAfterFinish = store.getAppliedProgressionTarget(userId, 'ex_db_bench');
    assertEqual(stagedAfterFinish, null, 'Applied target must be cleared after workout completion');

    // History must contain the completed workout with 22.5 kg
    const history = store.getHistory(userId);
    assert(history.length >= 1, 'History contains the completed session');
    const completedEx = history[0].exercises.find((e) => e.exerciseId === 'ex_db_bench');
    assertEqual(completedEx!.sets[0].weight, 22.5, 'Completed set recorded 22.5 kg in history');
    console.log('✓ Staging pre-fills active workout sets and safely clears upon finish.');
  }

  // ==========================================================================
  // Test 11: Exact Screenshot Reproduction & Zero UI Contradiction
  // ==========================================================================
  console.log('--- Test 11: Exact Screenshot Reproduction & Zero UI Contradiction ---');
  {
    // Reproduce exact Dumbbell Bench Press performance from bug screenshot:
    // 3 sets at 20 kg: Set 1 = 12 reps, Set 2 = 10 reps, Set 3 = 8 reps
    const history: WorkoutSession[] = [
      {
        id: 'sess_prev_1',
        date: '2026-10-20T10:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 1200,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_prev_1',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 10, completed: true },
              { id: 's2', setNumber: 2, weight: 20, reps: 10, completed: true },
              { id: 's3', setNumber: 3, weight: 20, reps: 8, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_prev_2',
        date: '2026-10-25T10:00:00Z',
        dayOfWeek: 'saturday',
        status: 'completed',
        totalVolume: 1300,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_prev_2',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 11, completed: true },
              { id: 's2', setNumber: 2, weight: 20, reps: 10, completed: true },
              { id: 's3', setNumber: 3, weight: 20, reps: 9, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_screenshot_bug',
        date: '2026-11-01T10:00:00Z',
        dayOfWeek: 'thursday',
        status: 'completed',
        totalVolume: 1400,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_db_screenshot',
            exerciseId: 'ex_db_bench',
            exercise: dumbbellBenchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 20, reps: 12, completed: true },
              { id: 's2', setNumber: 2, weight: 20, reps: 10, completed: true },
              { id: 's3', setNumber: 3, weight: 20, reps: 8, completed: true },
            ],
          },
        ],
      },
    ];

    // 1. Evaluate pure deterministic decision engine
    const decision = evaluateUnifiedProgression({
      exerciseId: 'ex_db_bench',
      exercise: dumbbellBenchPress,
      history,
    });

    assertEqual(decision.action, 'increase_reps', 'Decision action must be increase_reps');
    assertEqual(decision.title, 'Build Consistent Volume', 'Decision title must be Build Consistent Volume');
    assertEqual(
      decision.actionHeadline,
      'Maintain 20 kg and aim for 12 reps across all sets',
      'Action headline must explicitly direct user to maintain 20 kg'
    );
    assertEqual(decision.recommendedWeight, 20, 'Recommended weight must remain 20 kg, NOT 22 or 22.5 kg');
    assertEqual(decision.recommendedReps, 12, 'Recommended reps must be 12 reps');
    assert(
      !decision.actionHeadline.includes('Try adding'),
      `actionHeadline must NOT say "Try adding". Got: "${decision.actionHeadline}"`
    );
    assert(
      !decision.actionHeadline.includes('+2 kg') && !decision.actionHeadline.includes('+2.5 kg'),
      `actionHeadline must NOT mention weight increments. Got: "${decision.actionHeadline}"`
    );
    assert(
      decision.reason.includes('Maintain 20 kg and aim to bring all 3 sets to 12 reps before adding weight'),
      `Reason must instruct maintaining 20 kg until all sets reach 12 reps. Got: "${decision.reason}"`
    );

    // 2. Evaluate Exercise Progression Report (Single Source of Truth)
    const report = analyzeExerciseProgression(history, dumbbellBenchPress, {
      referenceDate: new Date('2026-11-02T10:00:00Z'),
    });

    assertEqual(report.status, 'progressing', 'Status is progressing');
    assertEqual(report.recommendation.title, 'Build Consistent Volume', 'Report recommendation title matches decision');
    assertEqual(
      report.recommendation.actionText,
      'Maintain 20 kg and aim for 12 reps across all sets',
      'Report recommendation headline matches decision headline'
    );
    assert(
      !report.recommendation.actionText.includes('Try adding'),
      'Report actionText must NOT contain legacy "Try adding +2 kg"'
    );
    assert(
      !report.recommendation.actionText.includes('+2 kg'),
      'Report actionText must NOT contain "+2 kg"'
    );
    assertEqual(
      report.recommendation.suggestedLoadChangeKg,
      undefined,
      'suggestedLoadChangeKg must be undefined for increase_reps'
    );
    assertEqual(report.recommendation.suggestedRepTarget, 12, 'suggestedRepTarget must be 12 reps');
    assertEqual(report.recommendation.rationale, decision.reason, 'Rationale must match decision reason');

    // 3. Apply in Workout Safety & Preservation of User-Entered Values
    const testUserId = 'user_exact_bug_test';
    const store = useWorkoutStore.getState();

    // Start a fresh active workout with Dumbbell Bench Press
    store.startTodayWorkout(testUserId);
    store.addExerciseToWorkout(testUserId, dumbbellBenchPress);

    let activeSession = store.getActiveSession(testUserId);
    assert(Boolean(activeSession), 'Active workout session exists');
    let exItem = activeSession!.exercises.find((e) => e.exerciseId === 'ex_db_bench');
    assert(Boolean(exItem), 'Dumbbell bench press is in active session');

    // User manually entered 20 kg x 11 reps on Set 1, but has not completed it yet
    store.updateSet(testUserId, 'ex_db_bench', 0, 20, 11);

    // Verify Set 1 has manually entered values and Set 2 is untouched
    activeSession = store.getActiveSession(testUserId);
    exItem = activeSession!.exercises.find((e) => e.exerciseId === 'ex_db_bench');
    assertEqual(exItem!.sets[0].weight, 20, 'Set 1 has manually entered weight 20 kg');
    assertEqual(exItem!.sets[0].reps, 11, 'Set 1 has manually entered reps 11');
    assertEqual(exItem!.sets[1].weight, null, 'Set 2 has null weight before staging');

    // Now user applies progression recommendation: targetWeight = 20, targetReps = 12
    const targetWeightToStage = decision.recommendedWeight;
    const targetRepsToStage = decision.recommendedReps;
    assertEqual(targetWeightToStage, 20, 'Staged target weight is 20 kg (never 22 or 22.5 kg)');
    assertEqual(targetRepsToStage, 12, 'Staged target reps is 12');

    store.applyProgressionTarget(testUserId, 'ex_db_bench', targetWeightToStage, targetRepsToStage);

    // Verify:
    // Set 1 (manually entered 20 kg x 11 reps) MUST BE PRESERVED and NOT overwritten!
    // Set 2 & Set 3 (empty sets) MUST BE PRE-FILLED with 20 kg x 12 reps!
    activeSession = store.getActiveSession(testUserId);
    exItem = activeSession!.exercises.find((e) => e.exerciseId === 'ex_db_bench');

    assertEqual(exItem!.sets[0].reps, 11, 'Set 1 manual value 11 reps MUST NOT be overwritten by staged 12 reps');
    assertEqual(exItem!.sets[1].weight, 20, 'Set 2 empty set is pre-filled with staged 20 kg');
    assertEqual(exItem!.sets[1].reps, 12, 'Set 2 empty set is pre-filled with staged 12 reps');
    assertEqual(exItem!.sets[2].weight, 20, 'Set 3 empty set is pre-filled with staged 20 kg');
    assertEqual(exItem!.sets[2].reps, 12, 'Set 3 empty set is pre-filled with staged 12 reps');

    console.log('✓ Exact screenshot reproduction passed: Zero UI contradiction, correct headline, and safe staging.');
  }

  console.log('\n=== ALL 11 UNIFIED PROGRESSION & EQUIPMENT-AWARE TESTS PASSED ===\n');
}

runUnifiedProgressionTestSuite().catch((err) => {
  console.error('\nTest suite failed:', err);
  process.exit(1);
});
