import {
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  Exercise,
  WeeklySchedule,
  DayOfWeek,
} from '../../types';
import {
  calculateEstimated1RM,
  extractExerciseWorkingSets,
  getExerciseStrengthProgression,
  calculateSessionVolumeAndSets,
  getVolumeAnalytics,
  getTrainingConsistencyAnalytics,
  getMuscleGroupCoverageAnalytics,
  derivePersonalRecords,
  getRecentMilestones,
  getComprehensiveAnalytics,
  filterCompletedSessions,
  getMondayOfWeek,
  getSundayOfWeek,
} from '../analyticsEngine';
import exercisesData from '../../data/exercisesData.json';

const allExercises = exercisesData as Exercise[];
const benchPress = allExercises.find((e) => e.name.toLowerCase().includes('barbell bench press')) || allExercises[0];
const squat = allExercises.find((e) => e.name.toLowerCase().includes('barbell full squat') || e.name.toLowerCase().includes('squat')) || allExercises[1];
const pullUp = allExercises.find((e) => e.name.toLowerCase().includes('pullups') || e.name.toLowerCase().includes('chin-up')) || allExercises[2];
const bicepCurl = allExercises.find((e) => e.id === 'Alternate_Incline_Dumbbell_Curl') || allExercises[3];
const tricepPushdown = allExercises.find((e) => e.primaryMuscle === 'triceps') || allExercises[4];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runTrainingAnalyticsTests() {
  console.log('=== GYMTRACKIE PHASE 4A: TRAINING ANALYTICS TEST SUITE ===\n');

  // =========================================================================
  // TEST 1: Empty workout history
  // =========================================================================
  console.log('--- Test 1: Empty workout history ---');
  {
    const emptyHistory: WorkoutSession[] = [];
    const now = new Date('2026-10-21T12:00:00Z');

    const volume = getVolumeAnalytics(emptyHistory, 'all', now);
    assert(volume.totalLoadVolume === 0, 'Empty history yields 0 kg load volume');
    assert(volume.totalCompletedSets === 0, 'Empty history yields 0 completed sets');
    assert(volume.totalReps === 0, 'Empty history yields 0 total reps');
    assert(volume.volumeTimeline.length === 0, 'Volume timeline is empty');
    assert(volume.weeklyVolume.length === 0, 'Weekly volume is empty');

    const consistency = getTrainingConsistencyAnalytics(emptyHistory, undefined, 4, now);
    assert(consistency.totalWorkouts === 0, 'Total workouts is 0');
    assert(consistency.currentDailyStreak === 0, 'Current daily streak is 0');
    assert(consistency.longestDailyStreak === 0, 'Longest daily streak is 0');
    assert(consistency.currentWeeklyStreak === 0, 'Current weekly streak is 0');
    assert(consistency.longestWeeklyStreak === 0, 'Longest weekly streak is 0');
    assert(consistency.workoutsLast7Days === 0, 'Workouts in last 7 days is 0');
    assert(consistency.hasTrainedToday === false, 'hasTrainedToday is false');

    const progression = getExerciseStrengthProgression(emptyHistory, benchPress.id, benchPress.name);
    assert(progression.totalSessions === 0, 'Progression sessions is 0');
    assert(progression.currentEstimated1RM === null, 'Estimated 1RM is null for empty history');
    assert(progression.trend === 'unknown', 'Trend is unknown');
    assert(progression.isLimitedData === true, 'Flagged as limited data');
    assert(progression.timeline.length === 0, 'Timeline is empty');

    const prs = derivePersonalRecords(emptyHistory, allExercises);
    assert(prs.length === 0, 'Derived PRs is empty for empty history');

    const milestones = getRecentMilestones(emptyHistory);
    assert(milestones.length === 0, 'Milestones is empty for empty history');
  }

  // =========================================================================
  // TEST 2: Completed versus incomplete sessions
  // =========================================================================
  console.log('\n--- Test 2: Completed versus incomplete sessions ---');
  {
    const mixedSessions: WorkoutSession[] = [
      {
        id: 'sess_comp_1',
        status: 'completed',
        date: '2026-10-18T10:00:00Z',
        completedAt: '2026-10-18T11:00:00Z',
        workoutName: 'Chest Day (Completed 1)',
        dayOfWeek: 'sunday',
        muscleGroups: ['chest'],
        totalVolume: 1500,
        totalSets: 3,
        exercises: [
          {
            id: 'we_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's_1', setNumber: 1, weight: 100, reps: 5, completed: true },
              { id: 's_2', setNumber: 2, weight: 100, reps: 5, completed: true },
              { id: 's_3', setNumber: 3, weight: 100, reps: 5, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_prog_1',
        status: 'in_progress', // INCOMPLETE
        date: '2026-10-19T10:00:00Z',
        workoutName: 'Leg Day (In Progress)',
        dayOfWeek: 'monday',
        muscleGroups: ['legs'],
        totalVolume: 5000,
        totalSets: 5,
        exercises: [
          {
            id: 'we_2',
            exerciseId: squat.id,
            exercise: squat,
            order: 1,
            notes: '',
            sets: [
              { id: 's_4', setNumber: 1, weight: 140, reps: 5, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_plan_1',
        status: 'planned', // INCOMPLETE
        date: '2026-10-20T10:00:00Z',
        workoutName: 'Pull Day (Planned)',
        dayOfWeek: 'tuesday',
        muscleGroups: ['back'],
        totalVolume: 0,
        totalSets: 0,
        exercises: [],
      },
      {
        id: 'sess_comp_2',
        status: 'completed',
        date: '2026-10-21T09:00:00Z',
        completedAt: '2026-10-21T10:00:00Z',
        workoutName: 'Chest Day (Completed 2)',
        dayOfWeek: 'wednesday',
        muscleGroups: ['chest'],
        totalVolume: 1600,
        totalSets: 3,
        exercises: [
          {
            id: 'we_3',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's_5', setNumber: 1, weight: 105, reps: 5, completed: true },
              { id: 's_6', setNumber: 2, weight: 105, reps: 5, completed: true },
            ],
          },
        ],
      },
      // Missing or invalid status session
      {
        id: 'sess_corrupt',
        status: undefined as any,
        date: '2026-10-20T12:00:00Z',
        workoutName: 'Corrupt Session',
        dayOfWeek: 'tuesday',
        muscleGroups: ['core'],
        totalVolume: 9999,
        totalSets: 99,
        exercises: [],
      },
    ];

    const completed = filterCompletedSessions(mixedSessions);
    assert(completed.length === 2, 'filterCompletedSessions filtered exactly 2 completed sessions');
    assert(completed[0].id === 'sess_comp_1', 'First completed session is sess_comp_1');
    assert(completed[1].id === 'sess_comp_2', 'Second completed session is sess_comp_2');

    const consistency = getTrainingConsistencyAnalytics(mixedSessions, undefined, 4, new Date('2026-10-21T12:00:00Z'));
    assert(consistency.totalWorkouts === 2, 'Total workouts strictly counts only 2 completed sessions');

    // Squat in the in_progress workout must not be counted in volume or PRs
    const volume = getVolumeAnalytics(mixedSessions);
    const squatVol = volume.volumeByExercise.find((e) => e.exerciseId === squat.id);
    assert(squatVol === undefined, 'Incomplete session exercise (Squat) is NOT included in volume analytics');

    const squatProg = getExerciseStrengthProgression(mixedSessions, squat.id, squat.name);
    assert(squatProg.totalSessions === 0, 'Incomplete session exercise (Squat) has 0 completed sessions');
  }

  // =========================================================================
  // TEST 3: Weekly date boundaries
  // =========================================================================
  console.log('\n--- Test 3: Weekly date boundaries ---');
  {
    // Local calendar dates: Month 9 = October in JS Date
    // Oct 18, 2026 is Sunday
    // Oct 19, 2026 is Monday (start of week)
    // Oct 25, 2026 is Sunday (end of week)
    // Oct 26, 2026 is Monday (start of next week)
    const sunOct18 = new Date(2026, 9, 18, 22, 0, 0);
    const monOct19 = new Date(2026, 9, 19, 8, 0, 0);
    const sunOct25 = new Date(2026, 9, 25, 18, 0, 0);
    const monOct26 = new Date(2026, 9, 26, 8, 0, 0);

    const mon1 = getMondayOfWeek(sunOct18);
    const mon2 = getMondayOfWeek(monOct19);
    const mon3 = getMondayOfWeek(sunOct25);
    const mon4 = getMondayOfWeek(monOct26);

    assert(mon1.getTime() !== mon2.getTime(), 'Sunday Oct 18 and Monday Oct 19 belong to different calendar weeks');
    assert(mon2.getTime() === mon3.getTime(), 'Monday Oct 19 and Sunday Oct 25 belong to the same calendar week');
    assert(mon3.getTime() !== mon4.getTime(), 'Sunday Oct 25 and Monday Oct 26 belong to different calendar weeks');

    // Weekly consistency test across 3 consecutive weeks
    const threeWeekSessions: WorkoutSession[] = [
      {
        id: 's_w1',
        status: 'completed',
        date: '2026-10-12T10:00:00', // Week 1 (Oct 12-18)
        dayOfWeek: 'monday',
        muscleGroups: ['chest'],
        totalVolume: 1000,
        totalSets: 3,
        exercises: [],
      },
      {
        id: 's_w2',
        status: 'completed',
        date: '2026-10-21T10:00:00', // Week 2 (Oct 19-25)
        dayOfWeek: 'wednesday',
        muscleGroups: ['chest'],
        totalVolume: 1000,
        totalSets: 3,
        exercises: [],
      },
      {
        id: 's_w3',
        status: 'completed',
        date: '2026-10-26T10:00:00', // Week 3 (Oct 26-Nov 1)
        dayOfWeek: 'monday',
        muscleGroups: ['chest'],
        totalVolume: 1000,
        totalSets: 3,
        exercises: [],
      },
    ];

    const consistency = getTrainingConsistencyAnalytics(
      threeWeekSessions,
      undefined,
      3,
      new Date(2026, 9, 27, 12, 0, 0)
    );

    assert(consistency.currentWeeklyStreak === 3, 'Consecutive weekly streak is correctly calculated as 3 weeks');
    assert(consistency.longestWeeklyStreak === 3, 'Longest weekly streak is 3 weeks');
  }

  // =========================================================================
  // TEST 4: Load-volume calculation
  // =========================================================================
  console.log('\n--- Test 4: Load-volume calculation ---');
  {
    const session: WorkoutSession = {
      id: 'vol_test_session',
      status: 'completed',
      date: '2026-10-20T10:00:00Z',
      dayOfWeek: 'tuesday',
      muscleGroups: ['chest'],
      totalVolume: 0,
      totalSets: 0,
      exercises: [
        {
          id: 'ex_item_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [
            { id: 's1', setNumber: 1, weight: 100, reps: 5, completed: true }, // 500 kg
            { id: 's2', setNumber: 2, weight: 100, reps: 5, completed: true }, // 500 kg
            { id: 's3', setNumber: 3, weight: 100, reps: 8, completed: true }, // 800 kg
          ],
        },
      ],
    };

    const result = calculateSessionVolumeAndSets(session);
    assert(result.loadVolume === 1800, `Expected 1800 kg total volume, got ${result.loadVolume} kg`);
    assert(result.completedSets === 3, `Expected 3 completed sets, got ${result.completedSets}`);
    assert(result.totalReps === 18, `Expected 18 total reps (5+5+8), got ${result.totalReps}`);

    const volAnalytics = getVolumeAnalytics([session]);
    assert(volAnalytics.totalLoadVolume === 1800, 'VolumeAnalytics totalLoadVolume is 1800');
    assert(volAnalytics.totalCompletedSets === 3, 'VolumeAnalytics totalCompletedSets is 3');
    assert(volAnalytics.totalReps === 18, 'VolumeAnalytics totalReps is 18');
    assert(volAnalytics.averageVolumePerWorkout === 1800, 'Average volume per workout is 1800');

    const exVol = volAnalytics.volumeByExercise.find((e) => e.exerciseId === benchPress.id);
    assert(exVol !== undefined && exVol.loadVolume === 1800, 'Exercise-specific volume is 1800 kg');
  }

  // =========================================================================
  // TEST 5: Missing and invalid set values
  // =========================================================================
  console.log('\n--- Test 5: Missing and invalid set values ---');
  {
    const sessionWithInvalids: WorkoutSession = {
      id: 'sess_invalids',
      status: 'completed',
      date: '2026-10-20T10:00:00Z',
      dayOfWeek: 'tuesday',
      muscleGroups: ['chest', 'back'],
      totalVolume: 0,
      totalSets: 0,
      exercises: [
        {
          id: 'ex_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [
            // Valid set
            { id: 's_v', setNumber: 1, weight: 80, reps: 10, completed: true }, // 800 kg
            // Incomplete set (completed: false) with values
            { id: 's_incomp', setNumber: 2, weight: 120, reps: 10, completed: false }, // Ignored!
            // Null weight (e.g. bodyweight completed set)
            { id: 's_null_w', setNumber: 3, weight: null, reps: 12, completed: true }, // 0 load, 12 reps, 1 set
            // Negative weight
            { id: 's_neg_w', setNumber: 4, weight: -80, reps: 10, completed: true }, // Ignored!
            // Negative reps
            { id: 's_neg_r', setNumber: 5, weight: 80, reps: -5, completed: true }, // Ignored!
            // Zero reps
            { id: 's_zero_r', setNumber: 6, weight: 80, reps: 0, completed: true }, // Ignored!
            // Zero weight, zero reps
            { id: 's_zero_both', setNumber: 7, weight: 0, reps: 0, completed: true }, // Ignored!
          ],
        },
      ],
    };

    const res = calculateSessionVolumeAndSets(sessionWithInvalids);
    assert(res.loadVolume === 800, `Expected exactly 800 kg load volume, got ${res.loadVolume}`);
    assert(res.totalReps === 22, `Expected 22 reps (10 from valid + 12 from null weight set), got ${res.totalReps}`);
    assert(!isNaN(res.loadVolume), 'Load volume is not NaN');
    assert(!isNaN(res.totalReps), 'Total reps is not NaN');

    // 1RM calculation with invalid inputs
    assert(calculateEstimated1RM(-50, 10) === 0, 'Negative weight returns 0 for 1RM');
    assert(calculateEstimated1RM(100, -5) === 0, 'Negative reps returns 0 for 1RM');
    assert(calculateEstimated1RM(0, 10) === 0, '0 weight returns 0 for 1RM');
    assert(calculateEstimated1RM(100, 0) === 0, '0 reps returns 0 for 1RM');
  }

  // =========================================================================
  // TEST 6: Exercise-specific progression history
  // =========================================================================
  console.log('\n--- Test 6: Exercise-specific progression history ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 'sess_p1',
        status: 'completed',
        date: '2026-10-01T10:00:00Z',
        workoutName: 'Chest Day 1',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        totalVolume: 400,
        totalSets: 1,
        exercises: [
          {
            id: 'e1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 5, completed: true }], // Est 1RM = 90
          },
        ],
      },
      {
        id: 'sess_p2',
        status: 'completed',
        date: '2026-10-08T10:00:00Z',
        workoutName: 'Chest Day 2',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        totalVolume: 425,
        totalSets: 1,
        exercises: [
          {
            id: 'e2',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's2', setNumber: 1, weight: 85, reps: 5, completed: true }], // Est 1RM = 96
          },
        ],
      },
      {
        id: 'sess_p3',
        status: 'completed',
        date: '2026-10-15T10:00:00Z',
        workoutName: 'Chest Day 3',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        totalVolume: 450,
        totalSets: 1,
        exercises: [
          {
            id: 'e3',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's3', setNumber: 1, weight: 90, reps: 5, completed: true }], // Est 1RM = 101
          },
        ],
      },
    ];

    const prog = getExerciseStrengthProgression(history, benchPress.id, benchPress.name);
    assert(prog.totalSessions === 3, 'Total sessions is 3');
    assert(prog.timeline.length === 3, 'Timeline contains 3 entries');
    assert(prog.baselineEstimated1RM === 90, `Baseline 1RM is 90, got ${prog.baselineEstimated1RM}`);
    assert(prog.currentEstimated1RM === 101, `Current 1RM is 101, got ${prog.currentEstimated1RM}`);
    assert(prog.overallDelta1RM === 11, `Overall delta 1RM is 11 kg, got ${prog.overallDelta1RM}`);
    assert(prog.trend === 'improving', `Trend is 'improving', got ${prog.trend}`);
    assert(prog.trendDeltaPercent !== null && prog.trendDeltaPercent > 0, 'Trend delta percent is positive');
    assert(prog.isLimitedData === false, 'isLimitedData is false for 3 sessions');

    // Exercise with only 1 session
    const singleHist: WorkoutSession[] = [history[0]];
    const singleProg = getExerciseStrengthProgression(singleHist, benchPress.id, benchPress.name);
    assert(singleProg.totalSessions === 1, 'Single session totalSessions is 1');
    assert(singleProg.isLimitedData === true, 'Single session marked as isLimitedData: true');
    assert(singleProg.trend === 'unknown', 'Single session trend is unknown');
    assert(singleProg.currentEstimated1RM === 90, 'Current estimated 1RM established at 90 kg');
  }

  // =========================================================================
  // TEST 7: Custom exercises with stable IDs
  // =========================================================================
  console.log('\n--- Test 7: Custom exercises with stable IDs ---');
  {
    const customExerciseId = 'custom_ex_reverse_hack_squat_123';
    const customExercise: Exercise = {
      id: customExerciseId,
      name: 'Reverse Hack Squat',
      primaryMuscle: 'legs',
      secondaryMuscles: ['glutes'],
      muscleAreaEmphasis: ['quads'],
      equipment: 'machine',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: ['Place shoulders against pad', 'Drive upward through heels'],
      imageUrl: '/images/custom.jpg',
      tags: ['quads', 'custom'],
      isCustom: true,
    };

    const historyWithCustom: WorkoutSession[] = [
      {
        id: 'sess_custom_1',
        status: 'completed',
        date: '2026-10-10T10:00:00Z',
        workoutName: 'Leg Day with Custom',
        dayOfWeek: 'saturday',
        muscleGroups: ['legs'],
        totalVolume: 1000,
        totalSets: 2,
        exercises: [
          {
            id: 'c_we_1',
            exerciseId: customExerciseId,
            exercise: customExercise,
            order: 1,
            notes: 'Heavy reverse hack',
            sets: [
              { id: 'cs_1', setNumber: 1, weight: 100, reps: 8, completed: true },
              { id: 'cs_2', setNumber: 2, weight: 120, reps: 6, completed: true },
            ],
          },
        ],
      },
      {
        id: 'sess_custom_2',
        status: 'completed',
        date: '2026-10-17T10:00:00Z',
        workoutName: 'Leg Day 2 with Custom',
        dayOfWeek: 'saturday',
        muscleGroups: ['legs'],
        totalVolume: 1300,
        totalSets: 2,
        exercises: [
          {
            id: 'c_we_2',
            exerciseId: customExerciseId,
            exercise: customExercise,
            order: 1,
            notes: '',
            sets: [
              { id: 'cs_3', setNumber: 1, weight: 110, reps: 8, completed: true },
              { id: 'cs_4', setNumber: 2, weight: 130, reps: 6, completed: true },
            ],
          },
        ],
      },
    ];

    const customProg = getExerciseStrengthProgression(historyWithCustom, customExerciseId, customExercise.name);
    assert(customProg.exerciseId === customExerciseId, 'Custom exercise ID matches exactly');
    assert(customProg.isCustom === true, 'isCustom is true');
    assert(customProg.totalSessions === 2, 'Tracked 2 completed sessions for custom exercise');
    assert(customProg.currentMaxWeight === 130, 'Current max weight is 130 kg');
    assert(customProg.baselineMaxWeight === 120, 'Baseline max weight is 120 kg');
    assert(customProg.trend === 'improving', 'Progression trend is improving');

    const prs = derivePersonalRecords(historyWithCustom, [customExercise]);
    const customPR = prs.find((p) => p.exerciseId === customExerciseId);
    assert(customPR !== undefined, 'Custom exercise PR was derived');
    assert(customPR?.maxWeight.value === 130, 'Custom exercise max weight PR is 130 kg');
    assert(customPR?.isCustom === true, 'Custom exercise PR is flagged as custom');
  }

  // =========================================================================
  // TEST 8: Superset stage extraction without double-counting
  // =========================================================================
  console.log('\n--- Test 8: Superset stage extraction without double-counting ---');
  {
    // Session containing 1 standalone exercise and 1 combination with 3 rounds
    const hybridSession: WorkoutSession[] = [
      {
        id: 'sess_hybrid_superset',
        status: 'completed',
        date: '2026-10-19T10:00:00Z',
        workoutName: 'Chest & Arms Superset Session',
        dayOfWeek: 'monday',
        muscleGroups: ['chest', 'biceps', 'triceps'],
        totalVolume: 0,
        totalSets: 0,
        exercises: [
          // 1. Standalone Bench Press: 3 sets of 100 kg × 5 reps = 1500 kg
          {
            id: 'we_bench',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 'bs_1', setNumber: 1, weight: 100, reps: 5, completed: true },
              { id: 'bs_2', setNumber: 2, weight: 100, reps: 5, completed: true },
              { id: 'bs_3', setNumber: 3, weight: 100, reps: 5, completed: true },
            ],
          },
          // 2. Combination / Superset: Curl & Pushdown (3 rounds)
          {
            id: 'we_superset',
            exerciseId: bicepCurl.id,
            exercise: bicepCurl,
            combinationId: 'comb_arms_1',
            combinationName: 'Arm Blast Superset',
            combinationType: 'combine_exercises',
            order: 2,
            notes: 'Back-to-back without rest',
            sets: [
              // Round 1
              {
                id: 'sup_set_1',
                setNumber: 1,
                weight: null,
                reps: null,
                completed: true,
                stages: [
                  {
                    id: 'st_1_1',
                    stageOrder: 1,
                    exerciseId: bicepCurl.id,
                    exerciseName: bicepCurl.name,
                    weight: 14,
                    reps: 10, // 140 kg
                    completed: true,
                  },
                  {
                    id: 'st_1_2',
                    stageOrder: 2,
                    exerciseId: tricepPushdown.id,
                    exerciseName: tricepPushdown.name,
                    weight: 25,
                    reps: 12, // 300 kg
                    completed: true,
                  },
                ],
              },
              // Round 2
              {
                id: 'sup_set_2',
                setNumber: 2,
                weight: null,
                reps: null,
                completed: true,
                stages: [
                  {
                    id: 'st_2_1',
                    stageOrder: 1,
                    exerciseId: bicepCurl.id,
                    exerciseName: bicepCurl.name,
                    weight: 14,
                    reps: 10, // 140 kg
                    completed: true,
                  },
                  {
                    id: 'st_2_2',
                    stageOrder: 2,
                    exerciseId: tricepPushdown.id,
                    exerciseName: tricepPushdown.name,
                    weight: 25,
                    reps: 12, // 300 kg
                    completed: true,
                  },
                ],
              },
              // Round 3
              {
                id: 'sup_set_3',
                setNumber: 3,
                weight: null,
                reps: null,
                completed: true,
                stages: [
                  {
                    id: 'st_3_1',
                    stageOrder: 1,
                    exerciseId: bicepCurl.id,
                    exerciseName: bicepCurl.name,
                    weight: 16,
                    reps: 8, // 128 kg
                    completed: true,
                  },
                  {
                    id: 'st_3_2',
                    stageOrder: 2,
                    exerciseId: tricepPushdown.id,
                    exerciseName: tricepPushdown.name,
                    weight: 27.5,
                    reps: 10, // 275 kg
                    completed: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const sessionRes = calculateSessionVolumeAndSets(hybridSession[0]);

    // Expected volumes:
    // Bench: 100*5 + 100*5 + 100*5 = 1500
    // Curl: 14*10 + 14*10 + 16*8 = 140 + 140 + 128 = 408
    // Pushdown: 25*12 + 25*12 + 27.5*10 = 300 + 300 + 275 = 875
    // Total Volume = 1500 + 408 + 875 = 2783 kg
    assert(sessionRes.loadVolume === 2783, `Expected exactly 2783 kg total load volume, got ${sessionRes.loadVolume}`);
    assert(sessionRes.completedSets === 9, `Expected 9 individual exercise sets (3 bench + 3 curl + 3 pushdown), got ${sessionRes.completedSets}`);
    assert(sessionRes.completedRounds === 6, `Expected 6 completed exercise rounds (3 bench + 3 superset rounds), got ${sessionRes.completedRounds}`);

    // Exercise progression extraction for Bicep Curl inside superset
    const curlProg = getExerciseStrengthProgression(hybridSession, bicepCurl.id, bicepCurl.name);
    assert(curlProg.totalSessions === 1, 'Curl has 1 completed session from superset stages');
    assert(curlProg.currentMaxWeight === 16, `Curl max weight is 16 kg, got ${curlProg.currentMaxWeight}`);
    assert(curlProg.totalWorkingSets === 3, `Curl has 3 working sets extracted from superset rounds, got ${curlProg.totalWorkingSets}`);

    // Exercise progression extraction for Tricep Pushdown inside superset
    const triProg = getExerciseStrengthProgression(hybridSession, tricepPushdown.id, tricepPushdown.name);
    assert(triProg.totalSessions === 1, 'Pushdown has 1 completed session from superset stages');
    assert(triProg.currentMaxWeight === 27.5, `Pushdown max weight is 27.5 kg, got ${triProg.currentMaxWeight}`);
    assert(triProg.totalWorkingSets === 3, `Pushdown has 3 working sets extracted, got ${triProg.totalWorkingSets}`);
  }

  // =========================================================================
  // TEST 9: Muscle-group coverage and missing metadata
  // =========================================================================
  console.log('\n--- Test 9: Muscle-group coverage and missing metadata ---');
  {
    const exerciseWithMissingMeta: Exercise = {
      id: 'ex_minimal',
      name: 'Unspecified Calisthenics',
      primaryMuscle: 'core',
      secondaryMuscles: [],
      muscleAreaEmphasis: [],
      equipment: 'bodyweight',
      exerciseType: 'isolation',
      difficulty: 'beginner',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: true,
    };

    const session: WorkoutSession = {
      id: 'sess_coverage',
      status: 'completed',
      date: '2026-10-20T10:00:00Z',
      dayOfWeek: 'tuesday',
      muscleGroups: ['chest', 'back'],
      totalVolume: 0,
      totalSets: 0,
      exercises: [
        // Bench Press: Primary Chest (3 sets), Secondary Shoulders & Triceps
        {
          id: 'we_c1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [
            { id: 's1', setNumber: 1, weight: 100, reps: 5, completed: true },
            { id: 's2', setNumber: 2, weight: 100, reps: 5, completed: true },
            { id: 's3', setNumber: 3, weight: 100, reps: 5, completed: true },
          ],
        },
        // Pull-Up: Primary Back (2 sets), Secondary Biceps
        {
          id: 'we_c2',
          exerciseId: pullUp.id,
          exercise: pullUp,
          order: 2,
          notes: '',
          sets: [
            { id: 's4', setNumber: 1, weight: 10, reps: 8, completed: true },
            { id: 's5', setNumber: 2, weight: 10, reps: 8, completed: true },
          ],
        },
        // Minimal metadata exercise: Primary Core (2 sets)
        {
          id: 'we_c3',
          exerciseId: exerciseWithMissingMeta.id,
          exercise: exerciseWithMissingMeta,
          order: 3,
          notes: '',
          sets: [
            { id: 's6', setNumber: 1, weight: 5, reps: 20, completed: true },
            { id: 's7', setNumber: 2, weight: 5, reps: 20, completed: true },
          ],
        },
      ],
    };

    const coverage = getMuscleGroupCoverageAnalytics(
      [session],
      [benchPress, pullUp, exerciseWithMissingMeta],
      '30d',
      undefined,
      new Date('2026-10-21T12:00:00Z')
    );

    const chestCoverage = coverage.find((m) => m.muscleGroup === 'chest')!;
    const backCoverage = coverage.find((m) => m.muscleGroup === 'back')!;
    const shouldersCoverage = coverage.find((m) => m.muscleGroup === 'shoulders')!;
    const tricepsCoverage = coverage.find((m) => m.muscleGroup === 'triceps')!;
    const coreCoverage = coverage.find((m) => m.muscleGroup === 'core')!;

    assert(chestCoverage.directSets === 3, `Chest direct sets is 3, got ${chestCoverage.directSets}`);
    assert(chestCoverage.secondarySets === 0, 'Chest secondary sets is 0');
    assert(chestCoverage.effectiveSets === 3, 'Chest effective sets is 3');

    assert(backCoverage.directSets === 2, `Back direct sets is 2, got ${backCoverage.directSets}`);
    assert(backCoverage.effectiveSets === 2, 'Back effective sets is 2');

    // Shoulders & Triceps received secondary set contribution from Bench Press
    assert(shouldersCoverage.secondarySets === 3, `Shoulders secondary sets is 3, got ${shouldersCoverage.secondarySets}`);
    assert(shouldersCoverage.effectiveSets === 1.5, `Shoulders effective sets is 1.5 (3 * 0.5), got ${shouldersCoverage.effectiveSets}`);

    assert(tricepsCoverage.secondarySets === 3, `Triceps secondary sets is 3, got ${tricepsCoverage.secondarySets}`);
    assert(tricepsCoverage.effectiveSets === 1.5, `Triceps effective sets is 1.5, got ${tricepsCoverage.effectiveSets}`);

    // Core with minimal metadata
    assert(coreCoverage.directSets === 2, `Core direct sets is 2, got ${coreCoverage.directSets}`);
    assert(coreCoverage.effectiveSets === 2, 'Core effective sets is 2');
    assert(coreCoverage.exerciseNames.includes('Unspecified Calisthenics'), 'Core includes exercise name');
  }

  // =========================================================================
  // TEST 10: Personal-record accuracy
  // =========================================================================
  console.log('\n--- Test 10: Personal-record accuracy ---');
  {
    const history: WorkoutSession[] = [
      // Session 1: 100 kg × 5 reps (Est. 1RM = 113, Vol = 500)
      {
        id: 'sess_pr_1',
        status: 'completed',
        date: '2026-10-01T10:00:00Z',
        workoutName: 'Heavy Bench 1',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        totalVolume: 500,
        totalSets: 1,
        exercises: [
          {
            id: 'e1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 5, completed: true }],
          },
        ],
      },
      // Session 2: 105 kg × 3 reps (Est. 1RM = 111, Vol = 315) -> NEW MAX WEIGHT
      {
        id: 'sess_pr_2',
        status: 'completed',
        date: '2026-10-08T10:00:00Z',
        workoutName: 'Heavy Bench 2',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        totalVolume: 315,
        totalSets: 1,
        exercises: [
          {
            id: 'e2',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's2', setNumber: 1, weight: 105, reps: 3, completed: true }],
          },
        ],
      },
      // Session 3: 95 kg × 10 reps (Est. 1RM = 127, Vol = 950) -> NEW 1RM & REPS & VOLUME
      {
        id: 'sess_pr_3',
        status: 'completed',
        date: '2026-10-15T10:00:00Z',
        workoutName: 'High Rep Bench',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest'],
        totalVolume: 950,
        totalSets: 1,
        exercises: [
          {
            id: 'e3',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's3', setNumber: 1, weight: 95, reps: 10, completed: true }],
          },
        ],
      },
    ];

    const prs = derivePersonalRecords(history, allExercises);
    const benchPR = prs.find((p) => p.exerciseId === benchPress.id)!;

    assert(benchPR !== undefined, 'Bench Press PR record was found');
    assert(benchPR.maxWeight.value === 105, `Max weight PR is 105 kg (from Session 2), got ${benchPR.maxWeight.value}`);
    assert(benchPR.maxWeight.workoutName === 'Heavy Bench 2', 'Max weight correctly references Session 2');

    assert(benchPR.max1RM.estimated1RM === 127, `Max 1RM PR is 127 kg (from Session 3), got ${benchPR.max1RM.estimated1RM}`);
    assert(benchPR.max1RM.workoutName === 'High Rep Bench', 'Max 1RM correctly references Session 3');

    assert(benchPR.maxReps.reps === 10, `Max reps PR is 10 reps, got ${benchPR.maxReps.reps}`);
    assert(benchPR.maxVolumeSession?.volume === 950, `Max session volume is 950 kg, got ${benchPR.maxVolumeSession?.volume}`);
  }

  // =========================================================================
  // TEST 11: User-data isolation
  // =========================================================================
  console.log('\n--- Test 11: User-data isolation ---');
  {
    const userAHistory: WorkoutSession[] = [
      {
        id: 'userA_sess_1',
        status: 'completed',
        date: '2026-10-20T10:00:00Z',
        workoutName: 'User A Bench',
        dayOfWeek: 'tuesday',
        muscleGroups: ['chest'],
        totalVolume: 600,
        totalSets: 1,
        exercises: [
          {
            id: 'ua_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 'uas_1', setNumber: 1, weight: 120, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const userBHistory: WorkoutSession[] = [
      {
        id: 'userB_sess_1',
        status: 'completed',
        date: '2026-10-20T10:00:00Z',
        workoutName: 'User B Bench',
        dayOfWeek: 'tuesday',
        muscleGroups: ['chest'],
        totalVolume: 400,
        totalSets: 1,
        exercises: [
          {
            id: 'ub_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 'ubs_1', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const userAAnalytics = getComprehensiveAnalytics(userAHistory, allExercises);
    const userBAnalytics = getComprehensiveAnalytics(userBHistory, allExercises);

    assert(userAAnalytics.volume.totalLoadVolume === 600, 'User A volume is 600 kg');
    assert(userBAnalytics.volume.totalLoadVolume === 400, 'User B volume is 400 kg');

    const prA = userAAnalytics.personalRecords.find((p) => p.exerciseId === benchPress.id);
    const prB = userBAnalytics.personalRecords.find((p) => p.exerciseId === benchPress.id);

    assert(prA?.maxWeight.value === 120, 'User A PR max weight is 120 kg');
    assert(prB?.maxWeight.value === 80, 'User B PR max weight is 80 kg');
    assert(prA?.maxWeight.workoutName === 'User A Bench', 'User A PR references User A workout');
    assert(prB?.maxWeight.workoutName === 'User B Bench', 'User B PR references User B workout');
  }

  // =========================================================================
  // TEST 12: Consistent results for identical input data
  // =========================================================================
  console.log('\n--- Test 12: Consistent results for identical input data ---');
  {
    const sampleHistory: WorkoutSession[] = [
      {
        id: 'det_sess_1',
        status: 'completed',
        date: '2026-10-15T10:00:00Z',
        workoutName: 'Deterministic Workout 1',
        dayOfWeek: 'thursday',
        muscleGroups: ['chest', 'back'],
        totalVolume: 1200,
        totalSets: 3,
        exercises: [
          {
            id: 'de_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 'ds_1', setNumber: 1, weight: 100, reps: 6, completed: true },
              { id: 'ds_2', setNumber: 2, weight: 100, reps: 6, completed: true },
            ],
          },
        ],
      },
    ];

    const run1 = getComprehensiveAnalytics(sampleHistory, allExercises, undefined, 4, '30d', new Date('2026-10-21T12:00:00Z'));
    const run2 = getComprehensiveAnalytics(sampleHistory, allExercises, undefined, 4, '30d', new Date('2026-10-21T12:00:00Z'));

    assert(JSON.stringify(run1) === JSON.stringify(run2), 'Analytics output is 100% deterministic and identical across repeated runs');
  }

  console.log('\n🎉 ALL 12 TRAINING ANALYTICS TESTS PASSED SUCCESSFULLY!\n');
}

runTrainingAnalyticsTests().catch((err) => {
  console.error('Test suite failed:', err);
  throw err;
});
