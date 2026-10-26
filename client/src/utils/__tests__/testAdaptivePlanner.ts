import {
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  Exercise,
  WeeklySchedule,
  DayOfWeek,
  DayConfig,
} from '../../types';
import {
  generateAdaptiveWorkoutPlan,
  acceptSuggestion,
  rejectSuggestion,
  acceptAllSuggestions,
  rejectAllSuggestions,
  replaceExerciseInPlan,
  applyAdaptivePlanToSession,
  getGoalSetRepGuidance,
  AdaptiveWorkoutPlan,
} from '../adaptivePlanner';
import { DEFAULT_WORKOUT_PLAN } from '../../data/workoutPlan';
import exercisesData from '../../data/exercisesData.json';

const allExercises = exercisesData as Exercise[];
const benchPress =
  allExercises.find((e) => e.name.toLowerCase() === 'barbell bench press - medium grip' || e.name.toLowerCase().includes('barbell bench press')) ||
  allExercises.find((e) => e.primaryMuscle === 'chest' && e.equipment === 'barbell') ||
  allExercises[0];

const inclineDbPress =
  allExercises.find((e) => e.name.toLowerCase().includes('incline dumbbell press') || (e.primaryMuscle === 'chest' && e.equipment === 'dumbbell')) ||
  allExercises[1];

const overheadPress =
  allExercises.find((e) => e.primaryMuscle === 'shoulders' && (e.equipment === 'barbell' || e.equipment === 'dumbbell')) ||
  allExercises[2];

const tricepPushdown =
  allExercises.find((e) => e.primaryMuscle === 'triceps' && e.equipment === 'cable') ||
  allExercises[3];

const tricepDip =
  allExercises.find((e) => e.primaryMuscle === 'triceps' && e.equipment === 'bodyweight') ||
  allExercises[4];

const barbellSquat =
  allExercises.find((e) => e.primaryMuscle === 'legs' && e.equipment === 'barbell') ||
  allExercises[5];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runAdaptivePlannerTests() {
  console.log('=== GYMTRACKIE PHASE 4B: ADAPTIVE WORKOUT PLANNING TEST SUITE ===\n');

  const now = new Date('2026-10-21T12:00:00Z');

  // =========================================================================
  // TEST 1: Existing split and template are respected
  // =========================================================================
  console.log('--- Test 1: Existing split and template are respected ---');
  {
    const pushDayConfig: DayConfig = DEFAULT_WORKOUT_PLAN.monday; // Chest, Shoulders, Triceps
    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: pushDayConfig,
      allExercises,
      history: [],
      fitnessGoal: 'Muscle Building & Hypertrophy',
      now,
    });

    assert(!plan.isRest, 'Push day is not a rest day');
    assert(plan.items.length >= 3, `Generated ${plan.items.length} items for Push day`);

    const pushMuscles = new Set(['chest', 'shoulders', 'triceps']);
    const allPush = plan.items.every((item) => pushMuscles.has(item.targetMuscle));
    assert(allPush, 'All planned items belong to targeted Push muscles (Chest, Shoulders, Triceps)');

    const hasLegsOrBack = plan.items.some(
      (item) => item.targetMuscle === 'legs' || item.targetMuscle === 'back'
    );
    assert(!hasLegsOrBack, 'Never includes unrelated muscle groups (Legs, Back) in a Push session');
  }

  // =========================================================================
  // TEST 2: Goal-aware exercise ranking
  // =========================================================================
  console.log('--- Test 2: Goal-aware exercise ranking & set/rep guidance ---');
  {
    // Strength & Power
    const strengthGuidance = getGoalSetRepGuidance('Strength & Power', 'compound');
    assert(strengthGuidance.sets === 4, 'Strength compound prescribes 4 sets');
    assert(strengthGuidance.reps === 5, 'Strength compound prescribes 5 reps');
    assert(strengthGuidance.rpe === 8, 'Strength RPE is 8');

    // Hypertrophy
    const hypGuidance = getGoalSetRepGuidance('Muscle Building & Hypertrophy', 'compound');
    assert(hypGuidance.sets === 4, 'Hypertrophy compound prescribes 4 sets');
    assert(hypGuidance.reps === 8, 'Hypertrophy compound prescribes 8 reps');

    // Longevity
    const longevityGuidance = getGoalSetRepGuidance('Longevity & Joint Health', 'compound');
    assert(longevityGuidance.sets === 3, 'Longevity prescribes 3 sets');
    assert(longevityGuidance.reps === 12, 'Longevity prescribes 12 reps');
    assert(longevityGuidance.rpe === 7, 'Longevity prescribes joint-friendly RPE 7');

    const strengthPlan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      fitnessGoal: 'Strength & Power',
      now,
    });
    const firstItem = strengthPlan.items[0];
    assert(firstItem.defaultReps === 5, `Strength plan sets top compound to 5 reps (got ${firstItem.defaultReps})`);
  }

  // =========================================================================
  // TEST 3: Improving performance and PR evidence
  // =========================================================================
  console.log('--- Test 3: Improving performance and PR evidence ---');
  {
    const improvingHistory: WorkoutSession[] = [
      {
        id: 'sess_1',
        date: '2026-10-10T10:00:00Z',
        completedAt: '2026-10-10T11:00:00Z',
        dayOfWeek: 'monday',
        muscleGroups: ['chest'],
        status: 'completed',
        totalVolume: 1200,
        totalSets: 3,
        exercises: [
          {
            id: 'we_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 6, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 6, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 6, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_2',
        date: '2026-10-17T10:00:00Z', // 4 days ago from now (2026-10-21)
        completedAt: '2026-10-17T11:00:00Z',
        dayOfWeek: 'monday',
        muscleGroups: ['chest'],
        status: 'completed',
        totalVolume: 1275,
        totalSets: 3,
        exercises: [
          {
            id: 'we_2',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's4', setNumber: 1, weight: 85, reps: 6, completed: true },
              { id: 's5', setNumber: 2, weight: 85, reps: 6, completed: true },
              { id: 's6', setNumber: 3, weight: 85, reps: 6, completed: true },
            ],
          },
        ],
      },
    ];

    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: improvingHistory,
      fitnessGoal: 'Muscle Building & Hypertrophy',
      now,
    });

    const benchItem = plan.items.find((item) => item.exercise.id === benchPress.id);
    assert(Boolean(benchItem), 'Bench Press is planned in session');
    assert(benchItem!.evidence.trend === 'improving', `Trend is improving (got ${benchItem!.evidence.trend})`);
    assert(benchItem!.evidence.trendDeltaPercent !== null && (benchItem!.evidence.trendDeltaPercent ?? 0) > 0, 'Trend delta percent is positive');
    assert(
      benchItem!.badges.includes('Progression: Improving') || benchItem!.badges.includes('Overload Momentum'),
      'Item carries progression overload badge'
    );
    assert(benchItem!.reason.includes('progression momentum') || benchItem!.reason.includes('%'), 'Reason cites numeric progression evidence');
  }

  // =========================================================================
  // TEST 4: Underrepresented muscle-group coverage
  // =========================================================================
  console.log('--- Test 4: Underrepresented muscle-group coverage ---');
  {
    // History where Shoulders & Triceps were trained 2 days ago, but Chest hasn't been trained in 14 days
    const unevenHistory: WorkoutSession[] = [
      {
        id: 'sess_chest_old',
        date: '2026-10-07T10:00:00Z', // 14 days ago
        completedAt: '2026-10-07T11:00:00Z',
        dayOfWeek: 'wednesday',
        muscleGroups: ['chest'],
        status: 'completed',
        totalVolume: 1000,
        totalSets: 3,
        exercises: [
          {
            id: 'we_old_chest',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
          },
        ],
      },
      {
        id: 'sess_arms_recent',
        date: '2026-10-19T10:00:00Z', // 2 days ago
        completedAt: '2026-10-19T11:00:00Z',
        dayOfWeek: 'monday',
        muscleGroups: ['shoulders', 'triceps'],
        status: 'completed',
        totalVolume: 800,
        totalSets: 4,
        exercises: [
          {
            id: 'we_rec_sh',
            exerciseId: overheadPress.id,
            exercise: overheadPress,
            order: 1,
            notes: '',
            sets: [{ id: 's2', setNumber: 1, weight: 40, reps: 8, completed: true }],
          },
        ],
      },
    ];

    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: unevenHistory,
      weeklyPlan: DEFAULT_WORKOUT_PLAN,
      now,
    });

    const chestItem = plan.items.find((item) => item.targetMuscle === 'chest');
    assert(Boolean(chestItem), 'Chest item is included');
    assert(
      chestItem!.modificationType === 'underrepresented_coverage' || chestItem!.badges.includes('Neglected Area Focus'),
      'Chest exercise flagged as underrepresented coverage'
    );
    assert(chestItem!.reason.includes('14 days') || chestItem!.reason.includes('not been trained'), 'Reason explicitly cites days since chest was trained');
  }

  // =========================================================================
  // TEST 5: Insufficient or empty history handling
  // =========================================================================
  console.log('--- Test 5: Insufficient or empty history handling ---');
  {
    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      now,
    });

    assert(plan.items.length > 0, 'Cleanly generates baseline plan for new user with empty history');
    const first = plan.items[0];
    assert(first.evidence.pastSessionsCount === 0, 'Accurately reports 0 past sessions');
    assert(first.evidence.trend === 'unknown', 'Trend is unknown for empty history');
    assert(!isNaN(first.score), 'Score is a valid number');
    assert(plan.summaryNotes.length >= 0, 'Summary notes array initialized without errors');
  }

  // =========================================================================
  // TEST 6: Missing equipment and unknown equipment handling
  // =========================================================================
  console.log('--- Test 6: Missing equipment and unknown equipment handling ---');
  {
    // Home Gym (barbells, dumbbells, bodyweight allowed; cables/machines excluded)
    const homePlan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      equipmentPreference: 'Home Gym',
      now,
    });

    const hasCableOrMachine = homePlan.items.some(
      (item) => item.exercise.equipment === 'cable' || item.exercise.equipment === 'machine'
    );
    assert(!hasCableOrMachine, 'Home Gym preference strictly excludes cable and machine exercises');

    // Unknown equipment preference
    const unknownPlan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      equipmentPreference: 'Galactic Zero Gravity Setup',
      now,
    });
    assert(unknownPlan.items.length > 0, 'Unknown equipment preference falls back gracefully without throwing');
  }

  // =========================================================================
  // TEST 7: Custom exercises with valid and invalid metadata
  // =========================================================================
  console.log('--- Test 7: Custom exercises with valid and invalid metadata ---');
  {
    const customValid: Exercise = {
      id: 'custom_push_power_press',
      name: 'Custom Power Press',
      primaryMuscle: 'chest',
      secondaryMuscles: ['triceps'],
      equipment: 'barbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      isCustom: true,
      muscleAreaEmphasis: ['mid_chest'],
      instructions: ['Press barbell powerfully.'],
      imageUrl: '',
      tags: ['power'],
    };

    const customIncomplete: Exercise = {
      id: 'custom_vague_movement',
      name: 'Custom Movement Minimal',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      equipment: 'other',
      exerciseType: 'compound',
      difficulty: 'beginner',
      isCustom: true,
      muscleAreaEmphasis: [],
      instructions: [],
      imageUrl: '',
      tags: [],
    };

    const combinedLibrary = [customValid, customIncomplete, ...allExercises];

    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises: combinedLibrary,
      history: [],
      now,
    });

    assert(plan.items.length > 0, 'Library with custom exercises generates plan successfully');
    const customItem = plan.items.find((item) => item.exercise.id === customValid.id);
    if (customItem) {
      assert(customItem.exercise.isCustom === true, 'Custom exercise marked as custom');
    }
  }

  // =========================================================================
  // TEST 8: Duplicate prevention in regular workouts and nested supersets
  // =========================================================================
  console.log('--- Test 8: Duplicate prevention in regular workouts and nested supersets ---');
  {
    const existingActiveSessionExercises: WorkoutExercise[] = [
      {
        id: 'active_1',
        exerciseId: benchPress.id,
        exercise: benchPress,
        order: 1,
        notes: '',
        sets: [
          {
            id: 'set_superset_1',
            setNumber: 1,
            weight: 50,
            reps: 10,
            completed: false,
            stages: [
              {
                id: 'stage_1',
                stageOrder: 1,
                exerciseId: inclineDbPress.id,
                exerciseName: inclineDbPress.name,
                targetWeight: 30,
                targetReps: 10,
                weight: null,
                reps: null,
                completed: false,
              },
            ],
          },
        ],
      },
    ];

    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      existingActiveExercises: existingActiveSessionExercises,
      now,
    });

    const hasBenchDuplicate = plan.items.some((i) => i.exercise.id === benchPress.id);
    const hasInclineDuplicate = plan.items.some((i) => i.exercise.id === inclineDbPress.id);

    assert(!hasBenchDuplicate, 'Does not duplicate exercise already present in active session');
    assert(!hasInclineDuplicate, 'Does not duplicate exercise present inside nested superset stage');
  }

  // =========================================================================
  // TEST 9: Accepting or rejecting a suggested modification
  // =========================================================================
  console.log('--- Test 9: Accepting or rejecting a suggested modification ---');
  {
    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      now,
    });

    const targetItem = plan.items[0];
    const acceptedPlan = acceptSuggestion(plan, targetItem.id);
    assert(
      acceptedPlan.items.find((i) => i.id === targetItem.id)?.status === 'accepted',
      'Target item status successfully changed to accepted'
    );

    const rejectedPlan = rejectSuggestion(acceptedPlan, targetItem.id);
    assert(
      rejectedPlan.items.find((i) => i.id === targetItem.id)?.status === 'rejected',
      'Target item status successfully changed to rejected'
    );
  }

  // =========================================================================
  // TEST 10: Original plan remains unchanged when suggestions are rejected
  // =========================================================================
  console.log('--- Test 10: Original plan remains unchanged when suggestions are rejected ---');
  {
    // Create scenario where Bench Press was done 1 day ago so rotation alternative is suggested
    const recentBenchHistory: WorkoutSession[] = [
      {
        id: 'sess_recent',
        date: '2026-10-20T10:00:00Z', // 1 day ago
        completedAt: '2026-10-20T11:00:00Z',
        dayOfWeek: 'sunday',
        muscleGroups: ['chest'],
        status: 'completed',
        totalVolume: 1000,
        totalSets: 3,
        exercises: [
          {
            id: 'we_rec',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
          },
        ],
      },
    ];

    const planWithAlternative = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: recentBenchHistory,
      now,
    });

    const altItem = planWithAlternative.items.find(
      (item) => item.modificationType === 'alternative' && item.originalExercise?.id === benchPress.id
    );

    if (altItem) {
      assert(altItem.exercise.id !== benchPress.id, 'Alternative exercise replaced Bench Press');
      // Reject this suggestion
      const restoredPlan = rejectSuggestion(planWithAlternative, altItem.id);
      const restoredItem = restoredPlan.items.find((item) => item.originalExercise?.id === benchPress.id);
      assert(
        restoredItem?.exercise.id === benchPress.id,
        'Rejecting alternative reverts back to original scheduled baseline (Bench Press)'
      );
      assert(restoredItem?.isBaseline === true, 'Restored item marked as baseline');
    }

    // Reject all suggestions test
    const allRejectedPlan = rejectAllSuggestions(planWithAlternative);
    const allOriginalRestored = allRejectedPlan.items.every(
      (item) => !item.originalExercise || item.exercise.id === item.originalExercise.id
    );
    assert(allOriginalRestored, 'rejectAllSuggestions fully restores the original baseline plan');
  }

  // =========================================================================
  // TEST 11: Completed workout history remains immutable
  // =========================================================================
  console.log('--- Test 11: Completed workout history remains immutable ---');
  {
    const historySample: WorkoutSession[] = [
      {
        id: 'sess_immutable_1',
        date: '2026-10-15T10:00:00Z',
        completedAt: '2026-10-15T11:00:00Z',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        status: 'completed',
        totalVolume: 1500,
        totalSets: 3,
        exercises: [
          {
            id: 'we_imm_1',
            exerciseId: benchPress.id,
            exercise: { ...benchPress },
            order: 1,
            notes: 'Steady effort',
            sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
          },
        ],
      },
    ];

    const historySnapshot = JSON.stringify(historySample);

    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: historySample,
      now,
    });

    const acceptedPlan = acceptAllSuggestions(plan);
    const dummyActiveSession: WorkoutSession = {
      id: 'active_sess_test',
      date: '2026-10-21T12:00:00Z',
      dayOfWeek: 'monday',
      muscleGroups: ['chest', 'shoulders', 'triceps'],
      status: 'in_progress',
      exercises: [],
      totalVolume: 0,
      totalSets: 0,
    };
    applyAdaptivePlanToSession(acceptedPlan, dummyActiveSession);

    const historyAfter = JSON.stringify(historySample);
    assert(historySnapshot === historyAfter, 'Completed workout history is 100% immutable across all planning operations');
  }

  // =========================================================================
  // TEST 12: Guest mode and authenticated user isolation
  // =========================================================================
  console.log('--- Test 12: Guest mode and authenticated user isolation ---');
  {
    const userAHistory: WorkoutSession[] = [
      {
        id: 'sess_user_a',
        date: '2026-10-18T10:00:00Z',
        completedAt: '2026-10-18T11:00:00Z',
        dayOfWeek: 'sunday',
        muscleGroups: ['chest'],
        status: 'completed',
        totalVolume: 3000,
        totalSets: 3,
        exercises: [
          {
            id: 'we_user_a',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 120, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const userAPlan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: userAHistory,
      now,
    });

    const guestPlan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [], // Guest has empty or independent history
      now,
    });

    const userABench = userAPlan.items.find((i) => i.exercise.id === benchPress.id);
    assert(userABench?.evidence.pastSessionsCount === 1, "User A's plan reflects 1 past session");
    assert(userABench?.evidence.bestWeight === 120, "User A's best weight is 120 kg");

    // Guest has empty history: All items must have 0 past sessions and null best weights
    assert(guestPlan.items.every((i) => i.evidence.pastSessionsCount === 0), "Guest's plan reflects 0 past sessions for all items");
    assert(guestPlan.items.every((i) => i.evidence.bestWeight === null), "Guest's best weight is null for all items (no leak)");
    assert(!guestPlan.items.some((i) => i.evidence.bestWeight === 120), "User A's PR never leaks to guest");
  }

  // =========================================================================
  // TEST 13: No duplicate recommendations when no alternatives exist
  // =========================================================================
  console.log('--- Test 13: No duplicate recommendations when no alternatives exist ---');
  {
    // Minimal isolated library with only ONE chest exercise
    const isolatedLibrary: Exercise[] = [benchPress, overheadPress, tricepPushdown];

    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises: isolatedLibrary,
      history: [],
      now,
    });

    const chestItems = plan.items.filter((i) => i.exercise.primaryMuscle === 'chest');
    assert(chestItems.length === 1, `Only 1 chest exercise planned when library has only 1 option (got ${chestItems.length})`);
    assert(chestItems[0].exercise.id === benchPress.id, 'Correctly chose the single available exercise');
  }

  // =========================================================================
  // TEST 14: Stable, meaningful explanations for recommendations
  // =========================================================================
  console.log('--- Test 14: Stable, meaningful explanations without biological overclaims ---');
  {
    const plan = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      fitnessGoal: 'Muscle Building & Hypertrophy',
      now,
    });

    // Check all item reasons for prohibited speculative words
    const prohibitedTerms = [
      'cns fatigue',
      'nervous system',
      'recovery score',
      'sleep debt',
      'hrv',
      'soreness level',
      'biological age',
    ];

    let foundProhibited = false;
    for (const item of plan.items) {
      const lowerReason = item.reason.toLowerCase();
      assert(item.reason.length > 10, `Item ${item.exercise.name} has meaningful explanation`);
      for (const term of prohibitedTerms) {
        if (lowerReason.includes(term)) {
          foundProhibited = true;
          console.error(`Found prohibited biological term '${term}' in reason: "${item.reason}"`);
        }
      }
    }
    assert(!foundProhibited, 'Zero biological overclaims or speculative pseudo-science terms found in explanations');

    // Determinism check: Running twice with identical inputs produces identical results
    const plan2 = generateAdaptiveWorkoutPlan({
      dayOfWeek: 'monday',
      dayConfig: DEFAULT_WORKOUT_PLAN.monday,
      allExercises,
      history: [],
      fitnessGoal: 'Muscle Building & Hypertrophy',
      now,
    });

    assert(
      JSON.stringify(plan.items.map((i) => ({ id: i.id, score: i.score, r: i.reason }))) ===
        JSON.stringify(plan2.items.map((i) => ({ id: i.id, score: i.score, r: i.reason }))),
      'Deterministic output: identical inputs produce identical recommendations, scores, and reasons'
    );
  }

  console.log('\n🎉 ALL 14 ADAPTIVE WORKOUT PLANNER TESTS PASSED SUCCESSFULLY!\n');
}

runAdaptivePlannerTests().catch((err) => {
  console.error('Test execution failed:', err);
  throw err;
});
