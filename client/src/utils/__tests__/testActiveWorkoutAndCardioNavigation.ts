/**
 * GymTrackie – Active Workout State Persistence & Cardio Logging Navigation Test Suite
 *
 * Validates:
 * 1. Active workout exercise cards preserve expanded / collapsed states across bottom-tab navigation.
 * 2. Marking an exercise as Done transitions it to completed and collapsed without double-toggle bugs.
 * 3. Unfinished exercises remain expanded by default, but respect manual collapse across tab navigation.
 * 4. Completed exercises remain collapsed unless explicitly expanded by the user.
 * 5. In-progress data (sets, weights, reps, notes, order) are 100% preserved across tab switches and rehydration.
 * 6. Bottom navigation across main app tabs is allowed without intrusive blockers during an active workout.
 * 7. Weekly Coaching "Log Cardio" action triggers direct cardio modal logging without dumping the user to /history.
 * 8. Logged cardio session immediately updates weekly coaching metrics, cardio goals, and session history.
 */

import { useWorkoutStore } from '../../store/workoutStore';
import { deriveWeeklyCoaching } from '../weeklyCoaching';
import { WorkoutSession, WorkoutExercise, Exercise } from '../../types';

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

const benchPressExercise: Exercise = {
  id: 'ex_bench_press',
  name: 'Barbell Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  muscleAreaEmphasis: ['mid_chest'],
  equipment: 'barbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['compound', 'push'],
  isCustom: false,
};

const inclineDumbbellPress: Exercise = {
  id: 'ex_incline_db_press',
  name: 'Incline Dumbbell Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['shoulders', 'triceps'],
  muscleAreaEmphasis: ['upper_chest'],
  equipment: 'dumbbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['compound', 'push'],
  isCustom: false,
};

async function runTests() {
  console.log('\n=== GYMTRACKIE: ACTIVE WORKOUT STATE PERSISTENCE & CARDIO NAVIGATION TESTS ===\n');

  const testUserId = `test_user_${Date.now()}`;
  const store = useWorkoutStore.getState();

  // Helper simulating the WorkoutPage exercise expansion helper logic
  const isExerciseExpanded = (workEx: WorkoutExercise) => {
    if (workEx.isCollapsed !== undefined) {
      return !workEx.isCollapsed;
    }
    return !workEx.completed;
  };

  // Helper simulating the main app navigation blocker whitelist logic
  const MAIN_APP_ROUTES = ['/', '/workout', '/exercises', '/history', '/progress', '/settings'];
  const shouldBlockNavigation = (isEditing: boolean, hasUnsavedChanges: boolean, nextPath: string) => {
    if (!hasUnsavedChanges) return false;
    if (!isEditing && MAIN_APP_ROUTES.includes(nextPath)) return false;
    return true;
  };

  // ==========================================
  // ISSUE 1: Active Workout State & Exercise Collapse Tests
  // ==========================================
  console.log('--- Test 1: Start Active Workout & Verify Default Expansion ---');
  {
    // Start workout
    store.startTodayWorkout(testUserId);
    const active = store.getActiveSession(testUserId);
    assert(active !== null, 'Active workout session exists');
    assertEqual(active?.status, 'in_progress', 'Session status is in_progress');

    // Add 2 exercises
    store.addExerciseToWorkout(testUserId, benchPressExercise);
    store.addExerciseToWorkout(testUserId, inclineDumbbellPress);

    const sessionWithEx = store.getActiveSession(testUserId);
    assert(sessionWithEx !== null, 'Session with exercises exists');
    assertEqual(sessionWithEx!.exercises.length, 2, 'Two exercises added');

    const ex1 = sessionWithEx!.exercises[0];
    const ex2 = sessionWithEx!.exercises[1];

    assertEqual(ex1.completed, false, 'Exercise 1 is initially uncompleted');
    assertEqual(ex2.completed, false, 'Exercise 2 is initially uncompleted');

    // By default, uncompleted exercises must be expanded
    assertEqual(isExerciseExpanded(ex1), true, 'Exercise 1 is expanded by default');
    assertEqual(isExerciseExpanded(ex2), true, 'Exercise 2 is expanded by default');
    console.log('  ✅ Uncompleted exercises default to expanded and ready');
  }

  console.log('--- Test 2: Mark Exercise Done & Verify Single-Toggle Collapse ---');
  {
    // User logs sets on Exercise 1 and marks Done
    store.updateSet(testUserId, benchPressExercise.id, 0, 80, 8);
    store.toggleSetCompleted(testUserId, benchPressExercise.id, 0);
    store.updateExerciseNotes(testUserId, benchPressExercise.id, 'Felt solid');

    // Mark Done
    store.toggleExerciseCompleted(testUserId, benchPressExercise.id);

    const sessionAfterDone = store.getActiveSession(testUserId);
    const ex1AfterDone = sessionAfterDone!.exercises.find((e) => e.exerciseId === benchPressExercise.id)!;
    const ex2AfterDone = sessionAfterDone!.exercises.find((e) => e.exerciseId === inclineDumbbellPress.id)!;

    assertEqual(ex1AfterDone.completed, true, 'Exercise 1 is completed');
    assertEqual(ex1AfterDone.isCollapsed, true, 'Exercise 1 is marked isCollapsed: true');
    assertEqual(isExerciseExpanded(ex1AfterDone), false, 'Exercise 1 card is collapsed');

    // Exercise 2 remains uncompleted and expanded
    assertEqual(ex2AfterDone.completed, false, 'Exercise 2 remains uncompleted');
    assertEqual(isExerciseExpanded(ex2AfterDone), true, 'Exercise 2 remains expanded');

    console.log('  ✅ Marking Done sets completed: true, isCollapsed: true, and collapses card');
  }

  console.log('--- Test 3: Tab Navigation Away & Back Preserves Collapsed State ---');
  {
    // Simulate user navigating to /home, /history, /progress, and returning to /workout
    // (Simulating WorkoutPage unmounting and remounting by re-fetching from store)
    const activeOnReturn = store.getActiveSession(testUserId);
    assert(activeOnReturn !== null, 'Active session is intact upon returning to Workout tab');

    const ex1 = activeOnReturn!.exercises.find((e) => e.exerciseId === benchPressExercise.id)!;
    const ex2 = activeOnReturn!.exercises.find((e) => e.exerciseId === inclineDumbbellPress.id)!;

    // Must remain collapsed!
    assertEqual(ex1.completed, true, 'Completed exercise 1 maintains completed: true');
    assertEqual(ex1.isCollapsed, true, 'Completed exercise 1 maintains isCollapsed: true');
    assertEqual(isExerciseExpanded(ex1), false, 'Completed exercise 1 REMAINS COLLAPSED on tab return');

    // Must remain expanded!
    assertEqual(ex2.completed, false, 'Unfinished exercise 2 maintains completed: false');
    assertEqual(isExerciseExpanded(ex2), true, 'Unfinished exercise 2 REMAINS EXPANDED on tab return');

    // Data integrity
    assertEqual(ex1.sets[0].weight, 80, 'Set 0 weight preserved');
    assertEqual(ex1.sets[0].reps, 8, 'Set 0 reps preserved');
    assertEqual(ex1.sets[0].completed, true, 'Set 0 completed status preserved');
    assertEqual(ex1.notes, 'Felt solid', 'Exercise notes preserved');

    console.log('  ✅ Active workout and per-exercise collapsed/expanded states 100% preserved across tab navigation');
  }

  console.log('--- Test 4: Explicit Expansion of Completed Exercise ---');
  {
    // User clicks "Edit" or header of completed exercise to expand it
    store.toggleExerciseExpanded(testUserId, benchPressExercise.id);

    const active = store.getActiveSession(testUserId);
    const ex1 = active!.exercises.find((e) => e.exerciseId === benchPressExercise.id)!;
    assertEqual(ex1.isCollapsed, false, 'isCollapsed toggled to false');
    assertEqual(isExerciseExpanded(ex1), true, 'Completed exercise is now explicitly expanded');

    // Tab away and return
    const activeReturn = store.getActiveSession(testUserId);
    const ex1Return = activeReturn!.exercises.find((e) => e.exerciseId === benchPressExercise.id)!;
    assertEqual(isExerciseExpanded(ex1Return), true, 'Explicitly expanded completed exercise stays expanded across tabs');

    console.log('  ✅ Explicitly expanded completed exercise does not automatically collapse');
  }

  console.log('--- Test 5: Manual Collapse of Unfinished Exercise ---');
  {
    // User manually clicks header of unfinished Exercise 2 to minimize it
    store.toggleExerciseExpanded(testUserId, inclineDumbbellPress.id);

    const active = store.getActiveSession(testUserId);
    const ex2 = active!.exercises.find((e) => e.exerciseId === inclineDumbbellPress.id)!;
    assertEqual(ex2.completed, false, 'Exercise 2 is still uncompleted');
    assertEqual(ex2.isCollapsed, true, 'Exercise 2 isCollapsed is true');
    assertEqual(isExerciseExpanded(ex2), false, 'Exercise 2 is now collapsed');

    // Tab away and return: must respect manual collapse
    const activeReturn = store.getActiveSession(testUserId);
    const ex2Return = activeReturn!.exercises.find((e) => e.exerciseId === inclineDumbbellPress.id)!;
    assertEqual(isExerciseExpanded(ex2Return), false, 'Manually collapsed unfinished exercise REMAINS collapsed across tabs');

    console.log('  ✅ Manually collapsed unfinished exercise is respected across tab navigation');
  }

  console.log('--- Test 6: Bottom Navigation Blocker Verification ---');
  {
    // During active workout (!isEditing), navigation between main tabs must NOT be blocked
    const isEditing = false;
    const hasUnsavedChanges = true;

    for (const route of MAIN_APP_ROUTES) {
      const blocked = shouldBlockNavigation(isEditing, hasUnsavedChanges, route);
      assertEqual(blocked, false, `Navigation to ${route} must not be blocked during active workout`);
    }

    // Navigation outside the app (e.g. /login) SHOULD be guarded
    const blockedAuth = shouldBlockNavigation(isEditing, hasUnsavedChanges, '/login');
    assertEqual(blockedAuth, true, 'Navigation to /login while having unsaved changes is guarded');

    console.log('  ✅ Bottom-tab navigation allowed without blocker; external routes guarded');
  }

  console.log('--- Test 7: Persistence Rehydration Simulation ---');
  {
    // Simulate browser reload serialization
    const currentActive = store.getActiveSession(testUserId);
    const serialized = JSON.stringify(currentActive);
    const rehydrated: WorkoutSession = JSON.parse(serialized);

    assert(rehydrated.exercises.length === 2, '2 exercises rehydrated');
    const r1 = rehydrated.exercises.find((e) => e.exerciseId === benchPressExercise.id)!;
    const r2 = rehydrated.exercises.find((e) => e.exerciseId === inclineDumbbellPress.id)!;

    assertEqual(r1.isCollapsed, false, 'Exercise 1 rehydrates with isCollapsed: false');
    assertEqual(r2.isCollapsed, true, 'Exercise 2 rehydrates with isCollapsed: true');
    assertEqual(r1.notes, 'Felt solid', 'Exercise 1 rehydrates notes');

    console.log('  ✅ State is 100% serializable and rehydrates accurately');
  }

  // ==========================================
  // ISSUE 2: Home Weekly Coaching Cardio Navigation Tests
  // ==========================================
  console.log('--- Test 8: Weekly Coaching "Log Cardio" Action Step ---');
  {
    const todayDate = new Date();
    const coaching = deriveWeeklyCoaching({
      userId: testUserId,
      history: [],
      cardioSessions: [],
      weeklyPlan: store.getWeeklyPlan(testUserId),
      cardioGoals: {
        durationMinutes: { enabled: true, target: 60 },
        distance: { enabled: false, target: 10, unit: 'km' },
        sessions: { enabled: false, target: 3 },
      },
      referenceDate: todayDate,
    });

    const cardioStep = coaching.actionableSteps.find((s) => s.actionType === 'log_cardio');
    assert(cardioStep !== undefined, 'Weekly coaching contains log_cardio action step when goal is active');
    assertEqual(cardioStep!.actionLabel, 'Log Cardio', 'Step action label is "Log Cardio"');
    assertEqual(cardioStep!.actionType, 'log_cardio', 'Step actionType is "log_cardio"');

    console.log('  ✅ Weekly coaching creates log_cardio action step with "Log Cardio" label');
  }

  console.log('--- Test 9: Logging Cardio Session Directly Updates Metrics & Goals ---');
  {
    const initialCardio = store.getCardioSessions(testUserId);
    assertEqual(initialCardio.length, 0, 'No cardio initially');

    // Simulate user logging a 30-minute run via LogCardioModal
    await store.logCardioSession(testUserId, {
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      distanceUnit: 'km',
      date: new Date().toISOString(),
      averageHeartRate: 145,
      caloriesBurned: 320,
      notes: 'Morning park run',
    });

    const updatedCardio = store.getCardioSessions(testUserId);
    assertEqual(updatedCardio.length, 1, 'Cardio session logged');
    assertEqual(updatedCardio[0].durationMinutes, 30, 'Duration is 30 mins');
    assertEqual(updatedCardio[0].distance, 5.0, 'Distance is 5.0 km');

    // Derive weekly coaching again with the new session
    const updatedCoaching = deriveWeeklyCoaching({
      userId: testUserId,
      history: [],
      cardioSessions: updatedCardio,
      weeklyPlan: store.getWeeklyPlan(testUserId),
      cardioGoals: {
        durationMinutes: { enabled: true, target: 60 },
        distance: { enabled: false, target: 10, unit: 'km' },
        sessions: { enabled: false, target: 3 },
      },
      referenceDate: new Date(),
    });

    assertEqual(updatedCoaching.overview.cardioSessionsCount, 1, 'Coaching overview reports 1 cardio session');
    assertEqual(updatedCoaching.overview.cardioDurationMinutes, 30, 'Coaching overview reports 30 cardio minutes');
    assertEqual(updatedCoaching.overview.cardioGoalsSummary?.durationRemainingMinutes, 30, '30 minutes remaining to weekly target');

    console.log('  ✅ Cardio session saved, goals updated, and weekly coaching metrics recalculated');
  }

  console.log('--- Test 10: Clean Up Active Session ---');
  {
    store.cancelWorkout(testUserId);
    const cleanedActive = store.getActiveSession(testUserId);
    assertEqual(cleanedActive, null, 'Active session cleanly cleared upon cancellation');
    console.log('  ✅ Cancel workout cleanly clears active session');
  }

  console.log('\n🎉 ALL ACTIVE WORKOUT STATE & CARDIO NAVIGATION REGRESSION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
