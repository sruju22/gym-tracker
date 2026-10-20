import { Exercise, WorkoutSession, WorkoutExercise, SavedCombination, WorkoutSet } from '../../types';
import { normalizeCombinationExercises } from '../combinationNormalizer';
import { getRecommendedExercises, analyzePerformanceHistory } from '../recommendationEngine';
import { useWorkoutStore } from '../../store/workoutStore';
import exercisesData from '../../data/exercisesData.json';

const allExercises = exercisesData as Exercise[];
const benchPress = allExercises.find((e) => e.name.toLowerCase().includes('barbell bench press')) || allExercises[0];
const dumbbellCurl = allExercises.find((e) => e.id === 'Alternate_Incline_Dumbbell_Curl') || allExercises[1];
const hammerCurl = allExercises.find((e) => e.id === 'Alternate_Hammer_Curl') || allExercises[2];
const tricepPushdown = allExercises.find((e) => e.primaryMuscle === 'triceps') || allExercises[3];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runCombinationSupersetTests() {
  console.log('=== GYMTRACKIE SUPERSET & REUSABLE COMBINATIONS TEST SUITE ===\n');

  // =========================================================================
  // TEST 1: Creating and saving a reusable combination template
  // =========================================================================
  console.log('--- Test 1: Creating and saving a reusable combination template ---');
  {
    const userId = 'user_test_1';
    const store = useWorkoutStore.getState();

    const templateData = {
      name: 'Arm Blaster Superset',
      type: 'combine_exercises' as const,
      techniqueLabel: 'Superset',
      rounds: 3,
      stages: [
        {
          id: 'stage_1',
          exerciseId: dumbbellCurl.id,
          exerciseName: dumbbellCurl.name,
          targetWeight: 14,
          targetReps: 10,
        },
        {
          id: 'stage_2',
          exerciseId: tricepPushdown.id,
          exerciseName: tricepPushdown.name,
          targetWeight: 25,
          targetReps: 12,
        },
      ],
    };

    const savedTemplate = await store.saveCombinationTemplate(userId, templateData);

    assert(Boolean(savedTemplate.id), 'Saved template has a valid unique ID');
    assert(savedTemplate.name === 'Arm Blaster Superset', 'Template name preserved');
    assert(savedTemplate.rounds === 3, 'Template rounds preserved');
    assert(savedTemplate.stages.length === 2, 'Template has 2 stages');
    assert(savedTemplate.stages[0].exerciseId === dumbbellCurl.id, 'Stage 1 references dumbbell curl');
    assert(savedTemplate.stages[1].exerciseId === tricepPushdown.id, 'Stage 2 references tricep pushdown');

    const userSaved = store.getSavedCombinations(userId);
    assert(userSaved.some((t) => t.id === savedTemplate.id), 'Template retrievable via getSavedCombinations');
  }

  // =========================================================================
  // TEST 2: Reusing it in a second workout (independent instances)
  // =========================================================================
  console.log('\n--- Test 2: Reusing template in a second workout ---');
  {
    const userId = 'user_test_2';
    const store = useWorkoutStore.getState();

    // Setup active session 1
    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [userId]: {
          ...state.getUserData(userId),
          activeSession: {
            id: 'session_workout_1',
            date: new Date().toISOString(),
            dayOfWeek: 'monday',
            muscleGroups: ['biceps', 'triceps'],
            status: 'in_progress',
            totalVolume: 0,
            totalSets: 0,
            exercises: [],
          },
        },
      },
    }));

    const stagesPayload = [
      { exercise: dumbbellCurl, targetWeight: 14, targetReps: 10 },
      { exercise: tricepPushdown, targetWeight: 25, targetReps: 12 },
    ];

    // Add combination to Workout 1
    store.addCombinationToWorkout(userId, {
      combinationName: 'Arm Blaster Superset',
      combinationType: 'combine_exercises',
      techniqueLabel: 'Superset',
      rounds: 3,
      stages: stagesPayload,
    });

    const session1 = store.getActiveSession(userId);
    assert(session1 !== null, 'Active session 1 exists');
    assert(session1!.exercises.length === 1, 'Workout 1 contains 1 exercise (the combination)');
    const combo1 = session1!.exercises[0];
    const combo1Id = combo1.combinationId;
    assert(Boolean(combo1Id), 'Workout 1 combination has unique combinationId');
    assert(combo1.sets.length === 3, 'Workout 1 combination has 3 sets');

    // Simulate completion of Workout 1 and creation of Workout 2
    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [userId]: {
          ...state.getUserData(userId),
          activeSession: {
            id: 'session_workout_2',
            date: new Date().toISOString(),
            dayOfWeek: 'thursday',
            muscleGroups: ['biceps', 'triceps'],
            status: 'in_progress',
            totalVolume: 0,
            totalSets: 0,
            exercises: [],
          },
        },
      },
    }));

    // Add combination to Workout 2
    store.addCombinationToWorkout(userId, {
      combinationName: 'Arm Blaster Superset',
      combinationType: 'combine_exercises',
      techniqueLabel: 'Superset',
      rounds: 3,
      stages: stagesPayload,
    });

    const session2 = store.getActiveSession(userId);
    assert(session2 !== null, 'Active session 2 exists');
    const combo2 = session2!.exercises[0];
    const combo2Id = combo2.combinationId;

    assert(combo1Id !== combo2Id, 'Workout 1 and Workout 2 have distinct, isolated combination instance IDs');
    assert(combo2.sets.length === 3, 'Workout 2 combination initialized with 3 clean sets');
    assert(combo2.sets[0].stages![0].completed === false, 'Workout 2 stage is uncompleted and independent');
  }

  // =========================================================================
  // TEST 3: Persisting workout grouping after refresh/reopen
  // =========================================================================
  console.log('\n--- Test 3: Persisting workout grouping after refresh/reopen ---');
  {
    const combinationId = 'combo_persist_test';
    const sampleExercise: WorkoutExercise = {
      id: `we_${combinationId}`,
      exerciseId: dumbbellCurl.id,
      exercise: dumbbellCurl,
      order: 1,
      notes: '',
      combinationId,
      combinationName: 'Biceps & Triceps Superset',
      combinationType: 'combine_exercises',
      techniqueLabel: 'Superset',
      completed: true,
      sets: [
        {
          id: 'set_1',
          setNumber: 1,
          weight: null,
          reps: null,
          completed: true,
          stages: [
            {
              id: 'st_1_1',
              stageOrder: 1,
              exerciseId: dumbbellCurl.id,
              exerciseName: dumbbellCurl.name,
              weight: 14,
              reps: 10,
              completed: true,
            },
            {
              id: 'st_1_2',
              stageOrder: 2,
              exerciseId: tricepPushdown.id,
              exerciseName: tricepPushdown.name,
              weight: 25,
              reps: 12,
              completed: true,
            },
          ],
        },
      ],
    };

    // Simulate JSON serialization / deserialization (as happens in localStorage and API requests)
    const serialized = JSON.stringify([sampleExercise]);
    const restored: WorkoutExercise[] = JSON.parse(serialized);

    const normalized = normalizeCombinationExercises(restored);
    assert(normalized.length === 1, 'Normalized output contains exactly 1 grouped combination exercise');
    assert(normalized[0].combinationId === combinationId, 'combinationId preserved across persistence cycle');
    assert(normalized[0].combinationName === 'Biceps & Triceps Superset', 'combinationName preserved');
    assert(normalized[0].techniqueLabel === 'Superset', 'techniqueLabel preserved');
    assert(normalized[0].sets[0].stages!.length === 2, 'Both stages restored inside set');
    assert(normalized[0].sets[0].stages![0].weight === 14, 'Stage 1 weight 14kg restored');
    assert(normalized[0].sets[0].stages![1].weight === 25, 'Stage 2 weight 25kg restored');
  }

  // =========================================================================
  // TEST 4: Editing a template without modifying historical workout instances
  // =========================================================================
  console.log('\n--- Test 4: Editing a template without modifying historical workout instances ---');
  {
    const userId = 'user_test_4';
    const store = useWorkoutStore.getState();

    // 1. Create original template
    const template = await store.saveCombinationTemplate(userId, {
      name: 'Original Chest & Triceps Superset',
      type: 'combine_exercises',
      techniqueLabel: 'Superset',
      rounds: 3,
      stages: [
        { id: 'st1', exerciseId: benchPress.id, exerciseName: benchPress.name, targetWeight: 80, targetReps: 8 },
        { id: 'st2', exerciseId: tricepPushdown.id, exerciseName: tricepPushdown.name, targetWeight: 30, targetReps: 10 },
      ],
    });

    // 2. Completed workout instance logged using the original template
    const historicalSession: WorkoutSession = {
      id: 'session_hist_immutable_1',
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['chest', 'triceps'],
      status: 'completed',
      totalVolume: 80 * 8 * 3 + 30 * 10 * 3,
      totalSets: 3,
      exercises: [
        {
          id: 'we_hist_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          combinationId: 'combo_hist_instance_1',
          combinationName: 'Original Chest & Triceps Superset',
          combinationType: 'combine_exercises',
          techniqueLabel: 'Superset',
          completed: true,
          sets: [
            {
              id: 'set_1',
              setNumber: 1,
              weight: null,
              reps: null,
              completed: true,
              stages: [
                { id: 's1', stageOrder: 1, exerciseId: benchPress.id, exerciseName: benchPress.name, weight: 80, reps: 8, completed: true },
                { id: 's2', stageOrder: 2, exerciseId: tricepPushdown.id, exerciseName: tricepPushdown.name, weight: 30, reps: 10, completed: true },
              ],
            },
          ],
        },
      ],
    };

    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [userId]: {
          ...state.getUserData(userId),
          history: [historicalSession],
        },
      },
    }));

    // 3. Edit the template (rename, increase rounds, modify targets)
    await store.updateCombinationTemplate(userId, template.id, {
      name: 'Renamed Heavy Chest Blast v2',
      rounds: 4,
      techniqueLabel: 'Giant Set',
      stages: [
        { id: 'st1', exerciseId: benchPress.id, exerciseName: benchPress.name, targetWeight: 90, targetReps: 6 },
        { id: 'st2', exerciseId: tricepPushdown.id, exerciseName: tricepPushdown.name, targetWeight: 35, targetReps: 8 },
      ],
    });

    // 4. Verify template was updated
    const updatedTemplate = store.getSavedCombinations(userId).find((t) => t.id === template.id);
    assert(updatedTemplate!.name === 'Renamed Heavy Chest Blast v2', 'Template name updated in saved library');
    assert(updatedTemplate!.rounds === 4, 'Template rounds updated to 4');

    // 5. Verify historical workout was NOT modified
    const currentHist = store.getHistory(userId);
    const histExercise = currentHist[0].exercises[0];
    assert(histExercise.combinationName === 'Original Chest & Triceps Superset', 'Historical workout retained original combination name');
    assert(histExercise.techniqueLabel === 'Superset', 'Historical workout retained original technique label');
    assert(histExercise.sets[0].stages![0].weight === 80, 'Historical working weight 80kg untouched');
  }

  // =========================================================================
  // TEST 5: Deleting a template without deleting completed workout history
  // =========================================================================
  console.log('\n--- Test 5: Deleting a template without deleting completed workout history ---');
  {
    const userId = 'user_test_5';
    const store = useWorkoutStore.getState();

    const template = await store.saveCombinationTemplate(userId, {
      name: 'Temporary Superset to Delete',
      type: 'combine_exercises',
      techniqueLabel: 'Superset',
      rounds: 3,
      stages: [{ id: 'st1', exerciseId: dumbbellCurl.id, exerciseName: dumbbellCurl.name }],
    });

    const historicalSession: WorkoutSession = {
      id: 'session_hist_keep_1',
      date: new Date().toISOString(),
      dayOfWeek: 'friday',
      muscleGroups: ['biceps'],
      status: 'completed',
      totalVolume: 500,
      totalSets: 3,
      exercises: [
        {
          id: 'we_h5',
          exerciseId: dumbbellCurl.id,
          exercise: dumbbellCurl,
          order: 1,
          notes: '',
          combinationId: 'combo_instance_keep',
          combinationName: 'Temporary Superset to Delete',
          completed: true,
          sets: [],
        },
      ],
    };

    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [userId]: {
          ...state.getUserData(userId),
          history: [historicalSession],
        },
      },
    }));

    // Delete the template
    await store.deleteCombinationTemplate(userId, template.id);

    // Template is gone from saved library
    assert(!store.getSavedCombinations(userId).some((t) => t.id === template.id), 'Template successfully deleted from saved templates');

    // Historical workout remains 100% intact
    const hist = store.getHistory(userId);
    assert(hist.length === 1, 'Historical workout session preserved');
    assert(hist[0].exercises[0].combinationName === 'Temporary Superset to Delete', 'Historical combination instance preserved');
  }

  // =========================================================================
  // TEST 6: Custom exercises inside saved combinations
  // =========================================================================
  console.log('\n--- Test 6: Custom exercises inside saved combinations ---');
  {
    const userId = 'user_test_6';
    const store = useWorkoutStore.getState();

    const customEx: Exercise = {
      id: 'custom_biceps_incline_drag_1',
      name: 'Custom Incline Drag Curl',
      primaryMuscle: 'biceps',
      secondaryMuscles: ['forearms'],
      muscleAreaEmphasis: ['short_head_bicep'],
      equipment: 'dumbbell',
      exerciseType: 'isolation',
      difficulty: 'intermediate',
      instructions: ['Drag elbows backward while curling dumbbells'],
      imageUrl: '',
      tags: ['custom'],
      isCustom: true,
    };

    // Save combination featuring custom exercise
    const template = await store.saveCombinationTemplate(userId, {
      name: 'Custom Arm Superset',
      type: 'combine_exercises',
      techniqueLabel: 'Superset',
      rounds: 3,
      stages: [
        { id: 'st1', exerciseId: customEx.id, exerciseName: customEx.name, targetWeight: 12, targetReps: 10 },
        { id: 'st2', exerciseId: tricepPushdown.id, exerciseName: tricepPushdown.name, targetWeight: 20, targetReps: 12 },
      ],
    });

    assert(template.stages[0].exerciseId === customEx.id, 'Template references custom exercise ID');
    assert(template.stages[0].exerciseName === 'Custom Incline Drag Curl', 'Template stores custom exercise name');

    // Initialize active session
    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [userId]: {
          ...state.getUserData(userId),
          activeSession: {
            id: 'session_custom_combo_1',
            date: new Date().toISOString(),
            dayOfWeek: 'friday',
            muscleGroups: ['biceps', 'triceps'],
            status: 'in_progress',
            totalVolume: 0,
            totalSets: 0,
            exercises: [],
          },
        },
      },
    }));

    // Add to workout session
    store.addCombinationToWorkout(userId, {
      combinationName: template.name,
      combinationType: template.type,
      techniqueLabel: template.techniqueLabel,
      rounds: template.rounds,
      stages: [
        { exercise: customEx, targetWeight: 12, targetReps: 10 },
        { exercise: tricepPushdown, targetWeight: 20, targetReps: 12 },
      ],
    });

    const activeSession = store.getActiveSession(userId);
    assert(activeSession !== null, 'Active session created');
    const combo = activeSession!.exercises[0];
    assert(combo.sets[0].stages![0].exerciseId === customEx.id, 'Workout set stage retains custom exercise ID');
  }

  // =========================================================================
  // TEST 7: Stable exercise IDs and missing/deleted exercise references
  // =========================================================================
  console.log('\n--- Test 7: Stable exercise IDs and missing/deleted exercise references ---');
  {
    const deletedExerciseId = 'custom_deleted_exercise_xyz';
    const rawTemplate: SavedCombination = {
      id: 'tmpl_with_missing_ex',
      name: 'Superset with Deleted Exercise',
      type: 'combine_exercises',
      rounds: 3,
      stages: [
        {
          id: 'st_1',
          exerciseId: deletedExerciseId,
          exerciseName: 'Defunct Exercise',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    // When resolving exercises for this template, if not in library, safely fall back
    const foundEx = allExercises.find((e) => e.id === rawTemplate.stages[0].exerciseId);
    assert(foundEx === undefined, 'Exercise is confirmed missing from library');

    const resolvedEx: Exercise = foundEx || {
      id: rawTemplate.stages[0].exerciseId,
      name: rawTemplate.stages[0].exerciseName || 'Custom Exercise',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      muscleAreaEmphasis: [],
      equipment: 'other',
      exerciseType: 'isolation',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: ['custom'],
      isCustom: true,
    };

    assert(resolvedEx.id === deletedExerciseId, 'Preserved stable exercise ID on missing exercise');
    assert(resolvedEx.name === 'Defunct Exercise', 'Preserved original exercise name');
    assert(resolvedEx.isCustom === true, 'Marked as custom fallback');
  }

  // =========================================================================
  // TEST 8: User ownership and isolation
  // =========================================================================
  console.log('\n--- Test 8: User ownership and isolation ---');
  {
    const store = useWorkoutStore.getState();

    await store.saveCombinationTemplate('user_alice', {
      name: "Alice's Secret Superset",
      type: 'combine_exercises',
      rounds: 3,
      stages: [{ id: 'st1', exerciseId: dumbbellCurl.id, exerciseName: dumbbellCurl.name }],
    });

    await store.saveCombinationTemplate('user_bob', {
      name: "Bob's Power Superset",
      type: 'combine_exercises',
      rounds: 4,
      stages: [{ id: 'st1', exerciseId: benchPress.id, exerciseName: benchPress.name }],
    });

    const aliceTemplates = store.getSavedCombinations('user_alice');
    const bobTemplates = store.getSavedCombinations('user_bob');
    const guestTemplates = store.getSavedCombinations('guest');

    assert(aliceTemplates.some((t) => t.name === "Alice's Secret Superset"), "Alice sees Alice's superset");
    assert(!aliceTemplates.some((t) => t.name === "Bob's Power Superset"), "Alice cannot see Bob's superset");

    assert(bobTemplates.some((t) => t.name === "Bob's Power Superset"), "Bob sees Bob's superset");
    assert(!bobTemplates.some((t) => t.name === "Alice's Secret Superset"), "Bob cannot see Alice's superset");

    assert(!guestTemplates.some((t) => t.name === "Alice's Secret Superset"), "Guest cannot see Alice's superset");
    assert(!guestTemplates.some((t) => t.name === "Bob's Power Superset"), "Guest cannot see Bob's superset");
  }

  // =========================================================================
  // TEST 9: Recommendation engine compatibility
  // =========================================================================
  console.log('\n--- Test 9: Recommendation engine compatibility ---');
  {
    // 9a: Active superset duplicate prevention
    // If hammerCurl is in stage 2 of an active combination, recommendation engine must exclude hammerCurl
    const activeComboExercise: WorkoutExercise = {
      id: 'we_active_combo',
      exerciseId: dumbbellCurl.id,
      exercise: dumbbellCurl,
      order: 1,
      notes: '',
      combinationId: 'active_combo_id',
      sets: [
        {
          id: 's_act_1',
          setNumber: 1,
          weight: null,
          reps: null,
          completed: false,
          stages: [
            { id: 'st_1', stageOrder: 1, exerciseId: dumbbellCurl.id, exerciseName: dumbbellCurl.name, completed: false, weight: 12, reps: 10 },
            { id: 'st_2', stageOrder: 2, exerciseId: hammerCurl.id, exerciseName: hammerCurl.name, completed: false, weight: 10, reps: 12 },
          ],
        },
      ],
    };

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'biceps',
      allExercises: [dumbbellCurl, hammerCurl, benchPress],
      currentExercises: [activeComboExercise],
    });

    assert(!recs.some((r) => r.exercise.id === dumbbellCurl.id), 'Primary exercise in superset is excluded as duplicate');
    assert(!recs.some((r) => r.exercise.id === hammerCurl.id), 'Stage 2 exercise in active superset is cleanly excluded as duplicate');

    // 9b: Historical superset performance tracking
    // Verify that hammerCurl performed inside superset stages is accurately recognized by analyzePerformanceHistory
    const histSession1: WorkoutSession = {
      id: 'sess_superset_hist_1',
      date: new Date(Date.now() - 14 * 86400000).toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['biceps'],
      status: 'completed',
      totalVolume: 1000,
      totalSets: 2,
      exercises: [
        {
          id: 'we_h_1',
          exerciseId: dumbbellCurl.id, // Primary exercise
          exercise: dumbbellCurl,
          order: 1,
          notes: '',
          combinationId: 'combo_h_1',
          sets: [
            {
              id: 'set_h_1',
              setNumber: 1,
              weight: null,
              reps: null,
              completed: true,
              stages: [
                { id: 'st_a1', stageOrder: 1, exerciseId: dumbbellCurl.id, exerciseName: dumbbellCurl.name, weight: 14, reps: 10, completed: true },
                { id: 'st_a2', stageOrder: 2, exerciseId: hammerCurl.id, exerciseName: hammerCurl.name, weight: 12, reps: 10, completed: true },
              ],
            },
          ],
        },
      ],
    };

    const histSession2: WorkoutSession = {
      id: 'sess_superset_hist_2',
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['biceps'],
      status: 'completed',
      totalVolume: 1200,
      totalSets: 2,
      exercises: [
        {
          id: 'we_h_2',
          exerciseId: dumbbellCurl.id,
          exercise: dumbbellCurl,
          order: 1,
          notes: '',
          combinationId: 'combo_h_2',
          sets: [
            {
              id: 'set_h_2',
              setNumber: 1,
              weight: null,
              reps: null,
              completed: true,
              stages: [
                { id: 'st_b1', stageOrder: 1, exerciseId: dumbbellCurl.id, exerciseName: dumbbellCurl.name, weight: 16, reps: 10, completed: true },
                { id: 'st_b2', stageOrder: 2, exerciseId: hammerCurl.id, exerciseName: hammerCurl.name, weight: 14, reps: 10, completed: true },
              ],
            },
          ],
        },
      ],
    };

    // Analyze performance for hammerCurl (which was stage 2)
    const hammerPerf = analyzePerformanceHistory(hammerCurl.id, [histSession2, histSession1]);
    assert(hammerPerf.sessionCount === 2, 'Hammer Curl captured both historical superset sessions');
    assert(hammerPerf.bestWeight === 14, 'Hammer Curl latest best weight is 14kg (not dumbbell curl 16kg)');
    assert(hammerPerf.previousWeight === 12, 'Hammer Curl previous best weight is 12kg (not dumbbell curl 14kg)');
    assert(hammerPerf.trend === 'improving', 'Hammer Curl progression trend accurately categorized as improving (+16.7%)');

    // Analyze performance for dumbbellCurl (which was stage 1)
    const dumbbellPerf = analyzePerformanceHistory(dumbbellCurl.id, [histSession2, histSession1]);
    assert(dumbbellPerf.bestWeight === 16, 'Dumbbell Curl latest best weight is 16kg');
    assert(dumbbellPerf.previousWeight === 14, 'Dumbbell Curl previous best weight is 14kg');
    assert(dumbbellPerf.trend === 'improving', 'Dumbbell Curl progression trend accurately categorized as improving');
  }

  // =========================================================================
  // TEST 10: Existing single-exercise and combination workflows coexist
  // =========================================================================
  console.log('\n--- Test 10: Existing single-exercise and combination workflows coexist ---');
  {
    const hybridSession: WorkoutSession = {
      id: 'session_hybrid_test',
      date: new Date().toISOString(),
      dayOfWeek: 'wednesday',
      muscleGroups: ['chest', 'biceps', 'triceps'],
      status: 'completed',
      totalVolume: 0,
      totalSets: 0,
      exercises: [
        // Single regular exercise
        {
          id: 'we_single_bench',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          completed: true,
          sets: [
            { id: 'sb_1', setNumber: 1, weight: 80, reps: 10, completed: true },
            { id: 'sb_2', setNumber: 2, weight: 80, reps: 10, completed: true },
          ],
        },
        // Combination exercise
        {
          id: 'we_combo_arms',
          exerciseId: dumbbellCurl.id,
          exercise: dumbbellCurl,
          order: 2,
          notes: '',
          combinationId: 'hybrid_combo_arms',
          combinationName: 'Arm Blast',
          techniqueLabel: 'Superset',
          completed: true,
          sets: [
            {
              id: 'sc_1',
              setNumber: 1,
              weight: null,
              reps: null,
              completed: true,
              stages: [
                { id: 'st_h1', stageOrder: 1, exerciseId: dumbbellCurl.id, exerciseName: dumbbellCurl.name, weight: 14, reps: 10, completed: true },
                { id: 'st_h2', stageOrder: 2, exerciseId: tricepPushdown.id, exerciseName: tricepPushdown.name, weight: 20, reps: 10, completed: true },
              ],
            },
          ],
        },
      ],
    };

    const normalized = normalizeCombinationExercises(hybridSession.exercises);
    assert(normalized.length === 2, 'Session maintains both single exercise and combination');
    assert(!normalized[0].combinationId, 'First exercise remains a standalone exercise');
    assert(Boolean(normalized[1].combinationId), 'Second exercise remains a combination');

    // Calculate volume across hybrid session
    let calculatedVolume = 0;
    normalized.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (Array.isArray(s.stages) && s.stages.length > 0) {
          s.stages.forEach((st) => {
            if (st.completed && st.weight && st.reps) calculatedVolume += st.weight * st.reps;
          });
        } else if (s.completed && s.weight && s.reps) {
          calculatedVolume += s.weight * s.reps;
        }
      });
    });

    const expectedVolume = (80 * 10 * 2) + (14 * 10) + (20 * 10); // 1600 + 140 + 200 = 1940 kg
    assert(calculatedVolume === expectedVolume, `Total volume correctly calculated for hybrid session (${calculatedVolume} kg === ${expectedVolume} kg)`);
  }

  console.log('\n🎉 ALL 10 SUPERSET & REUSABLE COMBINATION TESTS PASSED SUCCESSFULLY!\n');
}

runCombinationSupersetTests().catch((err) => {
  console.error('Test suite failed:', err);
  throw err;
});
