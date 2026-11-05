import { INITIAL_EXERCISES } from '../../data/exercises';
import { calculateMuscleCoverage, getExerciseAreaInvolvement, getMissingAreaSuggestions } from '../coverage';
import { getMuscleGroupCoverageAnalytics } from '../analyticsEngine';
import { enrichExercisesWithCanonical, canonicalExerciseMap } from '../../store/workoutStore';
import { Exercise, WorkoutSession, WorkoutExercise } from '../../types';

declare const process: { exit: (code: number) => void };

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}: ${message}`);
  }
}

console.log('\n======================================================');
console.log('🧪 Starting GymTrackie Phase 8.5 Regression Test Suite');
console.log('======================================================\n');

const exMap = new Map<string, Exercise>(INITIAL_EXERCISES.map((e) => [e.id, e]));

// --- Test 1: Motivating Example – Cable One Arm Tricep Extension ---
console.log('▶ Test 1: Motivating Example – Cable One Arm Tricep Extension');
{
  const cableOneArm = exMap.get('Cable_One_Arm_Tricep_Extension');
  assert(Boolean(cableOneArm), 'Cable_One_Arm_Tricep_Extension must exist in canonical library');
  assertEqual(cableOneArm!.primaryMuscle, 'triceps', 'Primary muscle must be triceps');
  assert(cableOneArm!.muscleAreaEmphasis.includes('medial_head_tricep'), 'Emphasis must be medial_head_tricep');
  assert(!cableOneArm!.muscleAreaEmphasis.includes('long_head_tricep'), 'Must NOT have long_head_tricep in direct emphasis');

  // Verify coverage involvement
  const medialInv = getExerciseAreaInvolvement(cableOneArm!, 'medial_head_tricep', 'triceps');
  assertEqual(medialInv, 'direct', 'Medial head must be direct');

  const lateralInv = getExerciseAreaInvolvement(cableOneArm!, 'lateral_head_tricep', 'triceps');
  assertEqual(lateralInv, 'supported', 'Lateral head must be supported synergist');

  const longInv = getExerciseAreaInvolvement(cableOneArm!, 'long_head_tricep', 'triceps');
  assertEqual(longInv, 'supported', 'Long head must be supported synergist');

  console.log('  ✔ Cable One Arm Tricep Extension correctly targets medial head directly and supports lateral/long heads');
}

// --- Test 2: Triceps Biomechanical Variations ---
console.log('\n▶ Test 2: Triceps Biomechanical Variations (Overhead vs Pushdown vs Kickback)');
{
  const skullcrusher = exMap.get('EZ-Bar_Skullcrusher');
  assert(Boolean(skullcrusher), 'EZ-Bar_Skullcrusher must exist');
  assert(skullcrusher!.muscleAreaEmphasis.includes('long_head_tricep'), 'Skullcrusher must emphasize long_head_tricep');
  assertEqual(getExerciseAreaInvolvement(skullcrusher!, 'long_head_tricep', 'triceps'), 'direct', 'Skullcrusher direct long head');
  assertEqual(getExerciseAreaInvolvement(skullcrusher!, 'medial_head_tricep', 'triceps'), 'supported', 'Skullcrusher supports medial head');

  const reversePushdown = exMap.get('Reverse_Grip_Triceps_Pushdown');
  assert(Boolean(reversePushdown), 'Reverse_Grip_Triceps_Pushdown must exist');
  assert(reversePushdown!.muscleAreaEmphasis.includes('medial_head_tricep'), 'Reverse pushdown must emphasize medial head');

  const standardPushdown = exMap.get('Triceps_Pushdown');
  assert(Boolean(standardPushdown), 'Triceps_Pushdown must exist');
  assert(standardPushdown!.muscleAreaEmphasis.includes('lateral_head_tricep'), 'Pushdown includes lateral head');
  assert(standardPushdown!.muscleAreaEmphasis.includes('medial_head_tricep'), 'Pushdown includes medial head');

  const kickback = exMap.get('Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension');
  assert(Boolean(kickback), 'Kickback must exist');
  assert(kickback!.muscleAreaEmphasis.includes('lateral_head_tricep'), 'Kickback emphasizes lateral head');
  assert(!kickback!.muscleAreaEmphasis.includes('long_head_tricep'), 'Kickback does NOT emphasize long head');

  console.log('  ✔ Triceps overhead, pushdown, and kickback mechanics correctly distinguished');
}

// --- Test 3: Compound Reclassifications (Bench Press, Lunges, Flutter Kicks) ---
console.log('\n▶ Test 3: Compound Reclassifications (Bench Press, Lunges, Flutter Kicks)');
{
  const powerBench = exMap.get('Bench_Press_-_Powerlifting');
  assert(Boolean(powerBench), 'Bench_Press_-_Powerlifting must exist');
  assertEqual(powerBench!.primaryMuscle, 'chest', 'Powerlifting bench must be chest primary');
  assert(powerBench!.muscleAreaEmphasis.includes('mid_chest'), 'Powerlifting bench must emphasize mid_chest');
  assert(powerBench!.secondaryMuscles.includes('triceps'), 'Triceps must be secondary');
  assert(powerBench!.secondaryMuscles.includes('shoulders'), 'Shoulders must be secondary');

  const reverseLunge = exMap.get('Crossover_Reverse_Lunge');
  assert(Boolean(reverseLunge), 'Crossover_Reverse_Lunge must exist');
  assertEqual(reverseLunge!.primaryMuscle, 'legs', 'Reverse lunge must be legs primary');
  assert(reverseLunge!.muscleAreaEmphasis.includes('quads'), 'Reverse lunge must emphasize quads');
  assert(reverseLunge!.secondaryMuscles.includes('glutes'), 'Glutes must be secondary');

  const flutterKicks = exMap.get('Flutter_Kicks');
  assert(Boolean(flutterKicks), 'Flutter_Kicks must exist');
  assertEqual(flutterKicks!.primaryMuscle, 'core', 'Flutter kicks must be core primary');
  assert(flutterKicks!.muscleAreaEmphasis.includes('lower_abs'), 'Flutter kicks must emphasize lower_abs');

  console.log('  ✔ Misclassified compounds successfully corrected to true anatomical prime movers');
}

// --- Test 4: Biceps Curls & Grip Variations ---
console.log('\n▶ Test 4: Biceps Curls & Grip Variations');
{
  const hammerCurl = exMap.get('Hammer_Curls');
  assert(Boolean(hammerCurl), 'Hammer_Curls must exist');
  assert(hammerCurl!.secondaryMuscles.includes('forearms'), 'Hammer curl must include forearms as secondary synergist');
  assert(hammerCurl!.muscleAreaEmphasis.includes('long_head_bicep'), 'Hammer curl emphasizes long head');

  const innerCurl = exMap.get('Incline_Inner_Biceps_Curl');
  assert(Boolean(innerCurl), 'Incline_Inner_Biceps_Curl must exist');
  assert(innerCurl!.muscleAreaEmphasis.includes('short_head_bicep'), 'Inner curl must emphasize short head');

  const preacherCurl = exMap.get('Preacher_Curl');
  assert(Boolean(preacherCurl), 'Preacher_Curl must exist');
  assert(preacherCurl!.muscleAreaEmphasis.includes('short_head_bicep'), 'Preacher curl must emphasize short head');
  assertEqual(getExerciseAreaInvolvement(preacherCurl!, 'long_head_bicep', 'biceps'), 'supported', 'Long head supported in preacher curl');

  console.log('  ✔ Biceps grips (hammer, inner, preacher) correctly mapped to short head, long head, and forearms');
}

// --- Test 5: Posterior Deltoid Corrections ---
console.log('\n▶ Test 5: Posterior Deltoid Corrections');
{
  const backFlyes = exMap.get('Back_Flyes_-_With_Bands');
  assert(Boolean(backFlyes), 'Back_Flyes_-_With_Bands must exist');
  assert(backFlyes!.muscleAreaEmphasis.includes('rear_delts'), 'Back flyes must target rear_delts');
  assert(!backFlyes!.muscleAreaEmphasis.includes('front_delts'), 'Back flyes must NOT target front_delts');

  const bandPullApart = exMap.get('Band_Pull_Apart');
  assert(Boolean(bandPullApart), 'Band_Pull_Apart must exist');
  assert(bandPullApart!.muscleAreaEmphasis.includes('rear_delts'), 'Band pull apart must target rear_delts');

  const arnoldPress = exMap.get('Arnold_Dumbbell_Press');
  assert(Boolean(arnoldPress), 'Arnold_Dumbbell_Press must exist');
  assert(arnoldPress!.muscleAreaEmphasis.includes('front_delts'), 'Arnold press includes front delts');
  assert(arnoldPress!.muscleAreaEmphasis.includes('side_delts'), 'Arnold press includes side delts');

  console.log('  ✔ Rear delts and shoulder presses accurately classified');
}

// --- Test 6: Core, Back & Leg Corrected Movements ---
console.log('\n▶ Test 6: Core, Back & Leg Corrected Movements');
{
  const hangingPike = exMap.get('Hanging_Pike');
  assert(Boolean(hangingPike), 'Hanging_Pike must exist');
  assert(hangingPike!.muscleAreaEmphasis.includes('lower_abs'), 'Hanging pike must target lower_abs');

  const pallofRotation = exMap.get('Pallof_Press_With_Rotation');
  assert(Boolean(pallofRotation), 'Pallof_Press_With_Rotation must exist');
  assert(pallofRotation!.muscleAreaEmphasis.includes('obliques'), 'Pallof press with rotation must target obliques');

  const chairStretch = exMap.get('Chair_Lower_Back_Stretch');
  assert(Boolean(chairStretch), 'Chair_Lower_Back_Stretch must exist');
  assert(chairStretch!.muscleAreaEmphasis.includes('lower_back'), 'Chair lower back stretch must target lower_back');

  const splitSquats = exMap.get('Split_Squats');
  assert(Boolean(splitSquats), 'Split_Squats must exist');
  assert(splitSquats!.muscleAreaEmphasis.includes('quads'), 'Split squats must target quads');
  assert(splitSquats!.secondaryMuscles.includes('glutes'), 'Split squats secondary glutes');

  console.log('  ✔ Core, back, and leg movements confirmed with evidence-based sub-areas');
}

// --- Test 7: Historical Workout Safe & Idempotent Rehydration ---
console.log('\n▶ Test 7: Historical Workout Safe & Idempotent Rehydration');
{
  // Simulated legacy historical workout containing old, incorrect snapshots
  const legacyExerciseSnapshot: WorkoutExercise = {
    id: 'we_cable_tricep_legacy',
    exerciseId: 'Cable_One_Arm_Tricep_Extension',
    exercise: {
      id: 'Cable_One_Arm_Tricep_Extension',
      name: 'Cable One Arm Tricep Extension',
      primaryMuscle: 'triceps',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['long_head_tricep'], // Legacy incorrect tag
      equipment: 'cable',
      exerciseType: 'isolation',
      difficulty: 'beginner',
      instructions: [],
      imageUrl: '/exercises/Cable_One_Arm_Tricep_Extension/0.jpg',
      tags: [],
      isCustom: false,
    },
    order: 1,
    notes: 'Historical user note',
    sets: [
      { id: 's1', setNumber: 1, weight: 15, reps: 12, completed: true },
      { id: 's2', setNumber: 2, weight: 17.5, reps: 10, completed: true },
    ],
  };

  const rehydrated = enrichExercisesWithCanonical([legacyExerciseSnapshot], canonicalExerciseMap);
  const updatedEx = rehydrated[0];

  // Verify metadata updated to canonical
  assert(updatedEx.exercise.muscleAreaEmphasis.includes('medial_head_tricep'), 'Must update to medial_head_tricep');
  assert(!updatedEx.exercise.muscleAreaEmphasis.includes('long_head_tricep'), 'Must NOT retain old long_head_tricep');

  // Verify 100% preservation of all historical workout values
  assertEqual(updatedEx.sets.length, 2, 'Must preserve exactly 2 sets');
  assertEqual(updatedEx.sets[0].weight, 15, 'Must preserve set 1 weight (15 kg)');
  assertEqual(updatedEx.sets[0].reps, 12, 'Must preserve set 1 reps (12)');
  assertEqual(updatedEx.sets[1].weight, 17.5, 'Must preserve set 2 weight (17.5 kg)');
  assertEqual(updatedEx.sets[1].reps, 10, 'Must preserve set 2 reps (10)');
  assertEqual(updatedEx.notes, 'Historical user note', 'Must preserve user notes verbatim');

  // Idempotency: re-running produces identical result
  const secondPass = enrichExercisesWithCanonical(rehydrated, canonicalExerciseMap);
  assertEqual(secondPass[0].exercise.muscleAreaEmphasis, updatedEx.exercise.muscleAreaEmphasis, 'Rehydration must be idempotent');

  console.log('  ✔ Historical workout safely rehydrated with 100% preservation of sets, reps, weights, and notes');
}

// --- Test 8: Historical Volume Analytics Recalculation ---
console.log('\n▶ Test 8: Historical Volume Analytics Recalculation');
{
  const cableOneArm = exMap.get('Cable_One_Arm_Tricep_Extension')!;
  const benchPower = exMap.get('Bench_Press_-_Powerlifting')!;

  const historicalSession: WorkoutSession = {
    id: 'hist_session_1',
    workoutName: 'Historical Test Session',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dayOfWeek: 'monday',
    status: 'completed',
    totalVolume: 3000,
    totalSets: 6,
    muscleGroups: ['chest', 'triceps'],
    exercises: [
      {
        id: 'we_bench',
        exerciseId: benchPower.id,
        exercise: benchPower,
        order: 1,
        notes: '',
        sets: [
          { id: 's1', setNumber: 1, weight: 100, reps: 5, completed: true },
          { id: 's2', setNumber: 2, weight: 100, reps: 5, completed: true },
          { id: 's3', setNumber: 3, weight: 100, reps: 5, completed: true },
        ],
      },
      {
        id: 'we_cable',
        exerciseId: cableOneArm.id,
        exercise: cableOneArm,
        order: 2,
        notes: '',
        sets: [
          { id: 's4', setNumber: 1, weight: 20, reps: 10, completed: true },
          { id: 's5', setNumber: 2, weight: 20, reps: 10, completed: true },
          { id: 's6', setNumber: 3, weight: 20, reps: 10, completed: true },
        ],
      },
    ],
  };

  const analytics = getMuscleGroupCoverageAnalytics([historicalSession], INITIAL_EXERCISES, '30d');

  // Verify Chest analytics: Bench Press is counted under Chest, NOT triceps
  const chestAnalytics = analytics.find((a) => a.muscleGroup === 'chest');
  assert(Boolean(chestAnalytics), 'Chest analytics must exist');
  assertEqual(chestAnalytics!.directSets, 3, 'Chest direct sets must be 3 from Bench Press');

  // Verify Triceps analytics: Cable One Arm Tricep Extension gives 3 direct sets, Bench gives secondary sets
  const tricepsAnalytics = analytics.find((a) => a.muscleGroup === 'triceps');
  assert(Boolean(tricepsAnalytics), 'Triceps analytics must exist');
  assertEqual(tricepsAnalytics!.directSets, 3, 'Triceps direct sets must be 3 from Cable One Arm');
  assertEqual(tricepsAnalytics!.secondarySets, 3, 'Triceps secondary sets must be 3 from Bench Press');

  // Verify sub-region breakdown for triceps: Medial Head has 3 direct sets
  const medialSubArea = tricepsAnalytics!.subAreaBreakdown?.find((s) => s.area === 'medial_head_tricep');
  assert(Boolean(medialSubArea), 'Medial head sub-area must be present');
  assertEqual(medialSubArea!.directSets, 3, 'Medial head must have 3 direct sets');

  console.log('  ✔ Historical analytics accurately recalculate direct vs supporting sets and volume per muscle group');
}

// --- Test 9: Active Workout Coverage Indicators ---
console.log('\n▶ Test 9: Active Workout Coverage Indicators');
{
  const cableOneArm = exMap.get('Cable_One_Arm_Tricep_Extension')!;

  const tricepCoverage = calculateMuscleCoverage('triceps', [
    {
      id: 'active_ex_1',
      exerciseId: cableOneArm.id,
      exercise: cableOneArm,
      order: 1,
      notes: '',
      sets: [
        { id: 's1', setNumber: 1, weight: 15, reps: 10, completed: true },
      ],
    },
  ]);

  const medialArea = tricepCoverage.areas.find((a) => a.area === 'medial_head_tricep');
  assert(Boolean(medialArea), 'Medial head area must exist');
  assertEqual(medialArea!.status, 'direct', 'Medial head must be direct');
  assert(medialArea!.covered, 'Medial head must be covered');

  const lateralArea = tricepCoverage.areas.find((a) => a.area === 'lateral_head_tricep');
  assert(Boolean(lateralArea), 'Lateral head area must exist');
  assertEqual(lateralArea!.status, 'supported', 'Lateral head must be supported synergist');
  assert(lateralArea!.covered, 'Lateral head must be covered via support');

  const longArea = tricepCoverage.areas.find((a) => a.area === 'long_head_tricep');
  assert(Boolean(longArea), 'Long head area must exist');
  assertEqual(longArea!.status, 'supported', 'Long head must be supported synergist');

  console.log('  ✔ Active workout coverage indicator reflects 1 Direct (Medial Head) + 2 Supported (Lateral & Long Heads)');
}

// --- Test 10: Recommendation Logic Avoids Junk Volume Warnings ---
console.log('\n▶ Test 10: Recommendation Logic Avoids Junk Volume Warnings');
{
  const cableOneArm = exMap.get('Cable_One_Arm_Tricep_Extension')!;

  // Both lateral and long heads are supported, so only areas that are completely optional qualify as missing
  const missingSuggestions = getMissingAreaSuggestions(
    'triceps',
    [
      {
        id: 'active_1',
        exerciseId: cableOneArm.id,
        exercise: cableOneArm,
        order: 1,
        notes: '',
        sets: [{ id: 's1', setNumber: 1, weight: 15, reps: 10, completed: true }],
      },
    ],
    INITIAL_EXERCISES
  );

  // Since medial head is direct, and lateral/long are supported, neither is marked 'optional' (uncovered)
  assertEqual(missingSuggestions.length, 0, 'No false missing muscle warnings should be generated for supported heads');

  console.log('  ✔ Recommendation engine recognizes compound-supported areas and avoids junk volume warnings');
}

console.log('\n======================================================');
console.log('🎉 ALL 10 PHASE 8.5 REGRESSION TESTS PASSED CLEANLY!');
console.log('======================================================\n');
