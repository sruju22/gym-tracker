/**
 * GymTrackie – Phase 8 Workout Experience, Logging Speed & Muscle Coverage Test Suite
 *
 * Validates:
 * 1. Phase 8A: 1-Tap set autofill from previous workout performance.
 * 2. Phase 8A: Preservation of manually entered set values on checkmark completion.
 * 3. Phase 8A: Clean feedback requirement when set is empty and no previous history exists.
 * 4. Phase 8B: Compound-aware muscle coverage across Direct, Supported, and Optional states.
 * 5. Phase 8B: Recommendation scoring prevents junk volume for compound-supported sub-regions.
 * 6. Phase 8B: Sub-region analytics breakdown (direct vs supporting sets) in historical analytics.
 * 7. Phase 8C: Exercise reordering (up/down) in active workouts preserves order and sets.
 * 8. Phase 8C: Multi-select exercise additions respect default sets and session state.
 * 9. Phase 8D: Streamlined single finish flow saves session with rating and notes in one atomic call.
 * 10. Phase 8D: Active workout indicator state identifies in-progress sessions.
 */

import { useWorkoutStore } from '../../store/workoutStore';
import { calculateMuscleCoverage, getMissingAreaSuggestions, getExerciseAreaInvolvement } from '../coverage';
import { getMuscleGroupCoverageAnalytics } from '../analyticsEngine';
import { getRecommendedExercises } from '../recommendationEngine';
import { Exercise, WorkoutSession, WorkoutExercise } from '../../types';

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

// Sample Exercises
const benchPress: Exercise = {
  id: 'ex_bench',
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

const overheadPress: Exercise = {
  id: 'ex_ohp',
  name: 'Overhead Shoulder Press',
  primaryMuscle: 'shoulders',
  secondaryMuscles: ['triceps'],
  muscleAreaEmphasis: ['front_delts'],
  equipment: 'barbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['compound', 'push'],
  isCustom: false,
};

const latPulldown: Exercise = {
  id: 'ex_lat_pulldown',
  name: 'Lat Pulldown',
  primaryMuscle: 'back',
  secondaryMuscles: ['biceps', 'shoulders'],
  muscleAreaEmphasis: ['lats'],
  equipment: 'cable',
  exerciseType: 'compound',
  difficulty: 'beginner',
  instructions: [],
  imageUrl: '',
  tags: ['pull'],
  isCustom: false,
};

const barbellSquat: Exercise = {
  id: 'ex_squat',
  name: 'Barbell Back Squat',
  primaryMuscle: 'legs',
  secondaryMuscles: ['glutes'],
  muscleAreaEmphasis: ['quads'],
  equipment: 'barbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['compound', 'legs'],
  isCustom: false,
};

const lateralRaise: Exercise = {
  id: 'ex_lat_raise',
  name: 'Dumbbell Lateral Raise',
  primaryMuscle: 'shoulders',
  secondaryMuscles: [],
  muscleAreaEmphasis: ['side_delts'],
  equipment: 'dumbbell',
  exerciseType: 'isolation',
  difficulty: 'beginner',
  instructions: [],
  imageUrl: '',
  tags: ['isolation'],
  isCustom: false,
};

async function runPhase8TestSuite() {
  console.log('\n======================================================');
  console.log('🧪 Starting GymTrackie Phase 8 Regression Test Suite');
  console.log('======================================================\n');

  const testUserId = `test_user_phase8_${Date.now()}`;
  const store = useWorkoutStore.getState();

  // Initialize store state for test user
  store.startCustomWorkout(testUserId, ['chest', 'shoulders']);
  let active = store.getActiveSession(testUserId);
  assert(active !== null, 'Active workout should be initialized');

  // Add bench press
  store.addExerciseToWorkout(testUserId, benchPress);
  active = store.getActiveSession(testUserId)!;
  assertEqual(active.exercises.length, 1, 'Should have 1 exercise in workout');

  // --------------------------------------------------------------------------
  // TEST 1: Phase 8A - One-Tap Autofill from Previous Performance
  // --------------------------------------------------------------------------
  console.log('▶ Test 1: Phase 8A – One-tap Set Autofill from Previous Performance');
  {
    // Initially Set 0 has null weight and null reps
    const set0 = active.exercises[0].sets[0];
    assertEqual(set0.completed, false, 'Set 0 should start uncompleted');
    assertEqual(set0.weight, null, 'Set 0 weight should start null');

    // Trigger completeSetWithAutoFill with fallback 85kg x 8 reps
    const success = store.completeSetWithAutoFill(testUserId, benchPress.id, 0, 85, 8);
    assert(success, 'completeSetWithAutoFill should succeed when fallback values provided');

    const updatedSession = store.getActiveSession(testUserId)!;
    const updatedSet0 = updatedSession.exercises[0].sets[0];
    assertEqual(updatedSet0.completed, true, 'Set 0 should now be marked complete');
    assertEqual(updatedSet0.weight, 85, 'Set 0 weight should be auto-filled to 85');
    assertEqual(updatedSet0.reps, 8, 'Set 0 reps should be auto-filled to 8');
    console.log('  ✔ Empty set row auto-filled previous weight/reps and marked complete in 1 tap');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Phase 8A - Manual Input Preservation on Checkmark Toggle
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 2: Phase 8A – Manual Input Preservation');
  {
    // For Set 1, user manually typed 90kg and 6 reps
    store.updateSet(testUserId, benchPress.id, 1, 90, 6);

    // Now tap checkmark with fallback 80kg x 10 (fallback should NOT overwrite manual input)
    const success = store.completeSetWithAutoFill(testUserId, benchPress.id, 1, 80, 10);
    assert(success, 'completeSetWithAutoFill should succeed on manual input');

    const updatedSession = store.getActiveSession(testUserId)!;
    const updatedSet1 = updatedSession.exercises[0].sets[1];
    assertEqual(updatedSet1.completed, true, 'Set 1 should be marked complete');
    assertEqual(updatedSet1.weight, 90, 'Manually entered weight 90 must be preserved');
    assertEqual(updatedSet1.reps, 6, 'Manually entered reps 6 must be preserved');
    console.log('  ✔ Manually entered set values preserved without being overwritten');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Phase 8A - Feedback Required When No Fallback Exists
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 3: Phase 8A – Rejection without Silent No-Op When Empty & No Fallback');
  {
    // For Set 2: empty and no fallback passed
    const success = store.completeSetWithAutoFill(testUserId, benchPress.id, 2, undefined, undefined);
    assertEqual(success, false, 'completeSetWithAutoFill should return false when no input or fallback exists');

    const updatedSession = store.getActiveSession(testUserId)!;
    const updatedSet2 = updatedSession.exercises[0].sets[2];
    assertEqual(updatedSet2.completed, false, 'Set 2 should not be completed');
    console.log('  ✔ Safely rejects completion without silent no-op when input is empty and no history exists');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Phase 8B - Compound-Aware Muscle Coverage (Direct vs Supported)
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 4: Phase 8B – Compound-Aware Muscle Coverage');
  {
    // Bench press involvement checks
    const midChestInvolvement = getExerciseAreaInvolvement(benchPress, 'mid_chest', 'chest');
    assertEqual(midChestInvolvement, 'direct', 'Bench press must directly target mid_chest');

    const lowerChestInvolvement = getExerciseAreaInvolvement(benchPress, 'lower_chest', 'chest');
    assertEqual(lowerChestInvolvement, 'supported', 'Bench press must support lower_chest');

    const frontDeltsInvolvement = getExerciseAreaInvolvement(benchPress, 'front_delts', 'shoulders');
    assertEqual(frontDeltsInvolvement, 'supported', 'Bench press must support front delts as secondary synergist');

    const tricepsInvolvement = getExerciseAreaInvolvement(benchPress, 'lateral_head_tricep', 'triceps');
    assertEqual(tricepsInvolvement, 'supported', 'Bench press must support triceps lateral head');

    // Lat pulldown involvement checks
    const rearDeltsInvolvement = getExerciseAreaInvolvement(latPulldown, 'rear_delts', 'shoulders');
    assertEqual(rearDeltsInvolvement, 'supported', 'Lat pulldown must support rear deltoids');

    const bicepsInvolvement = getExerciseAreaInvolvement(latPulldown, 'long_head_bicep', 'biceps');
    assertEqual(bicepsInvolvement, 'supported', 'Lat pulldown must support biceps');

    // Squat involvement checks
    const glutesInvolvement = getExerciseAreaInvolvement(barbellSquat, 'glutes', 'glutes');
    assertEqual(glutesInvolvement, 'supported', 'Back squat must support glutes');

    // Calculate chest coverage with only bench press
    const chestCoverage = calculateMuscleCoverage('chest', [
      {
        id: 'we_1',
        exerciseId: benchPress.id,
        exercise: benchPress,
        notes: '',
        sets: [
          { id: 'set_1', setNumber: 1, weight: 80, reps: 8, completed: true },
          { id: 'set_2', setNumber: 2, weight: 80, reps: 8, completed: true },
        ],
        order: 1,
      },
    ]);

    assert(chestCoverage.directCount >= 1, 'Chest should have at least 1 direct area');
    assert(chestCoverage.supportedCount >= 1, 'Chest should have at least 1 supported area (lower chest)');
    console.log(`  ✔ Coverage calculated: ${chestCoverage.directCount} Direct, ${chestCoverage.supportedCount} Supported, ${chestCoverage.optionalCount} Optional`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Phase 8B - Recommendation Engine Avoids Junk Volume for Supported Areas
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 5: Phase 8B – Recommendation Engine Avoids Junk Volume');
  {
    const missingAreas = getMissingAreaSuggestions('chest', [
      {
        id: 'we_1',
        exerciseId: benchPress.id,
        exercise: benchPress,
        notes: '',
        sets: [{ id: 'set_1', setNumber: 1, weight: 80, reps: 8, completed: true }],
        order: 1,
      },
    ]);

    // Lower chest is supported by bench press, so it should not be aggressively pushed as a missing gap
    const recommendsLowerChest = missingAreas.some((a) => a.missingArea === 'lower_chest');
    assertEqual(recommendsLowerChest, false, 'Supported sub-region (lower chest) should not be flagged as missing');
    console.log('  ✔ Recommendation engine accurately avoids junk volume for compound-supported areas');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Phase 8B - Sub-Region Breakdown in Analytics Engine
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 6: Phase 8B – Historical Analytics Sub-Region Breakdown');
  {
    const mockCompletedWorkout: WorkoutSession = {
      id: 'session_mock_1',
      workoutName: 'Upper Compound Workout',
      date: new Date().toISOString(),
      dayOfWeek: 'monday',
      completedAt: new Date().toISOString(),
      status: 'completed',
      totalVolume: 5000,
      totalSets: 6,
      muscleGroups: ['chest', 'shoulders', 'triceps'],
      exercises: [
        {
          id: 'we_bench',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [
            { id: 'sb_1', setNumber: 1, weight: 80, reps: 8, completed: true },
            { id: 'sb_2', setNumber: 2, weight: 80, reps: 8, completed: true },
            { id: 'sb_3', setNumber: 3, weight: 80, reps: 8, completed: true },
          ],
        },
        {
          id: 'we_ohp',
          exerciseId: overheadPress.id,
          exercise: overheadPress,
          order: 2,
          notes: '',
          sets: [
            { id: 'so_1', setNumber: 1, weight: 50, reps: 8, completed: true },
            { id: 'so_2', setNumber: 2, weight: 50, reps: 8, completed: true },
            { id: 'so_3', setNumber: 3, weight: 50, reps: 8, completed: true },
          ],
        },
      ],
    };

    const analytics = getMuscleGroupCoverageAnalytics([mockCompletedWorkout], [benchPress, overheadPress]);
    assert(analytics.length > 0, 'Analytics should calculate muscle group coverage');

    const shoulderCoverage = analytics.find((a) => a.muscleGroup === 'shoulders');
    assert(shoulderCoverage !== undefined, 'Shoulders should be analyzed');
    assert(Boolean(shoulderCoverage?.subAreaBreakdown), 'Sub-area breakdown must be present');

    const subAreas = shoulderCoverage ? shoulderCoverage.subAreaBreakdown || [] : [];
    const frontDeltsSummary = subAreas.find((b) => b.area === 'front_delts');
    assert(frontDeltsSummary !== undefined, 'Front delts must be tracked in sub-area breakdown');
    if (frontDeltsSummary) {
      assert(frontDeltsSummary.directSets >= 3, 'Front delts should have 3 direct sets from OHP');
      assert(frontDeltsSummary.supportingSets >= 3, 'Front delts should have 3 supporting sets from Bench Press');
      console.log(
        `  ✔ Front Delts breakdown verified: ${frontDeltsSummary.directSets} Direct Sets + ${frontDeltsSummary.supportingSets} Supporting Sets`
      );
    }
  }

  // --------------------------------------------------------------------------
  // TEST 7: Phase 8C - Exercise Reordering in Active Workout
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 7: Phase 8C – Exercise Up/Down Reordering');
  {
    // Add overhead press to active workout (it will be index 1)
    store.addExerciseToWorkout(testUserId, overheadPress);
    let session = store.getActiveSession(testUserId)!;
    assertEqual(session.exercises.length, 2, 'Should have 2 exercises');
    assertEqual(session.exercises[0].exerciseId, benchPress.id, 'Bench press should be index 0');
    assertEqual(session.exercises[1].exerciseId, overheadPress.id, 'OHP should be index 1');

    // Move OHP up
    store.moveExerciseInWorkout(testUserId, overheadPress.id, 'up');
    session = store.getActiveSession(testUserId)!;
    assertEqual(session.exercises[0].exerciseId, overheadPress.id, 'OHP should now be at index 0');
    assertEqual(session.exercises[1].exerciseId, benchPress.id, 'Bench press should now be at index 1');
    assertEqual(session.exercises[0].order, 1, 'OHP order should be updated to 1');
    assertEqual(session.exercises[1].order, 2, 'Bench order should be updated to 2');

    // Move OHP back down
    store.moveExerciseInWorkout(testUserId, overheadPress.id, 'down');
    session = store.getActiveSession(testUserId)!;
    assertEqual(session.exercises[0].exerciseId, benchPress.id, 'Bench press should be back at index 0');
    assertEqual(session.exercises[1].exerciseId, overheadPress.id, 'OHP should be back at index 1');
    console.log('  ✔ Exercise reordering moves exercises up/down and maintains correct order metadata');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Phase 8C - Multi-Select Exercise Batch Addition
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 8: Phase 8C – Multi-Select Exercise Addition');
  {
    const initialCount = store.getActiveSession(testUserId)!.exercises.length;
    // Batch add lateral raises and squat
    store.addExerciseToWorkout(testUserId, lateralRaise);
    store.addExerciseToWorkout(testUserId, barbellSquat);

    const updatedSession = store.getActiveSession(testUserId)!;
    assertEqual(updatedSession.exercises.length, initialCount + 2, 'Should have added both exercises');
    const addedLateral = updatedSession.exercises.find((e) => e.exerciseId === lateralRaise.id);
    assert(addedLateral !== undefined, 'Lateral raise should exist in workout');
    assertEqual(
      addedLateral!.sets.length,
      store.settings.defaultSetsPerExercise || 3,
      'Sets should respect user default sets per exercise'
    );
    console.log('  ✔ Multi-select exercise batch addition successfully added exercises with default sets');
  }

  // --------------------------------------------------------------------------
  // TEST 9: Phase 8D - Streamlined Finish Flow with Rating & Notes
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 9: Phase 8D – Streamlined Single Finish Flow with Rating & Notes');
  {
    const success = await store.finishWorkout(testUserId, {
      rating: 'good',
      notes: 'Strong bench press, felt great overall.',
    });
    assert(success, 'finishWorkout must succeed');

    // Active session should now be cleared
    const activeAfterFinish = store.getActiveSession(testUserId);
    assertEqual(activeAfterFinish, null, 'Active workout should be cleared after finish');

    // History should contain the newly saved session
    const history = store.getHistory(testUserId);
    assert(history.length > 0, 'History should contain completed workout');
    const completedSession = history[0];
    assertEqual(completedSession.rating, 'good', 'Completed workout must preserve difficulty rating');
    assertEqual(
      completedSession.notes,
      'Strong bench press, felt great overall.',
      'Completed workout must preserve session notes'
    );
    assert(completedSession.totalVolume > 0, 'Volume must be calculated and recorded');
    console.log('  ✔ Workout finished atomically with rating and notes recorded in history');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Phase 8D - Active Workout Visibility State Indicator
  // --------------------------------------------------------------------------
  console.log('\n▶ Test 10: Phase 8D – Active Workout Visibility Indicator');
  {
    // No active workout currently
    let activeSess = store.getActiveSession(testUserId);
    let hasActive = Boolean(
      activeSess &&
      activeSess.status === 'in_progress' &&
      activeSess.exercises &&
      activeSess.exercises.length > 0
    );
    assertEqual(hasActive, false, 'hasActiveWorkout should be false when no workout is running');

    // Start a new workout (wait 20ms to ensure start timestamp strictly postdates finished workout)
    await new Promise((resolve) => setTimeout(resolve, 20));
    store.startCustomWorkout(testUserId, ['legs']);
    store.addExerciseToWorkout(testUserId, barbellSquat);
    activeSess = store.getActiveSession(testUserId);
    hasActive = Boolean(
      activeSess &&
      activeSess.status === 'in_progress' &&
      activeSess.exercises &&
      activeSess.exercises.length > 0
    );
    assertEqual(hasActive, true, 'hasActiveWorkout should be true when workout with exercises is running');
    console.log('  ✔ Active workout indicator flag activates accurately for in-progress sessions');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 10 PHASE 8 REGRESSION TESTS PASSED CLEANLY!');
  console.log('======================================================\n');
}

runPhase8TestSuite().catch((err) => {
  console.error('\n❌ Phase 8 Test Suite Failed:');
  console.error(err);
  process.exit(1);
});
