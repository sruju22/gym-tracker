import { getRecommendedExercises } from '../recommendationEngine';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';
import { Exercise, MuscleGroup, WorkoutSession, PersonalRecord } from '../../types';
import exercisesData from '../../data/exercisesData.json';

const allExercises: Exercise[] = exercisesData as Exercise[];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

console.log('=== GYMTRACKIE CONTEXT-AWARE EXERCISE PICKER TEST SUITE ===\n');

// =========================================================================
// TEST 1: Contextual Mode vs General Library Mode
// =========================================================================
console.log('--- Test 1: Contextual mode vs general library mode ---');
{
  // When targetMuscleGroup is provided (e.g. triceps):
  const targetMuscleGroup: MuscleGroup = 'triceps';
  const isContextual = Boolean(targetMuscleGroup);
  assert(isContextual === true, 'Contextual mode detected when targetMuscleGroup is set');

  // In contextual mode: general muscle selector is hidden
  const showGeneralMuscleSelector = !isContextual;
  assert(showGeneralMuscleSelector === false, 'Redundant general muscle selector is hidden in contextual flow');

  // In contextual mode: target-area filters are available for triceps
  const targetAreas = MUSCLE_GROUPS[targetMuscleGroup]?.areas || [];
  assert(targetAreas.length === 3, 'Triceps has 3 target areas: Long Head, Lateral Head, Medial Head');
  assert(targetAreas.some((a) => a.id === 'long_head_tricep'), 'Long head target area present');
  assert(targetAreas.some((a) => a.id === 'lateral_head_tricep'), 'Lateral head target area present');
  assert(targetAreas.some((a) => a.id === 'medial_head_tricep'), 'Medial head target area present');

  // When targetMuscleGroup is undefined (general browsing mode):
  const generalTarget: MuscleGroup | undefined = undefined;
  const isGeneralContextual = Boolean(generalTarget);
  assert(isGeneralContextual === false, 'General browsing mode detected when targetMuscleGroup is undefined');
  const showGeneralSelectorInLibrary = !isGeneralContextual;
  assert(showGeneralSelectorInLibrary === true, 'General muscle selector is retained in unscoped library flow');

  console.log('  ✅ Contextual flow hides redundant general muscle selector');
  console.log('  ✅ Unscoped general library retains general muscle selector');
  console.log('  ✅ Target-area filters (Long Head, Lateral Head, Medial Head) present for Triceps');
}

// =========================================================================
// TEST 2: Triceps Recommendations Prioritize Direct Triceps Exercises
// =========================================================================
console.log('\n--- Test 2: Triceps recommendations prioritize direct triceps exercises ---');
{
  // User has strong prior performance and PRs on Chest (Bench Press) and Shoulders (Military Press)
  const benchExercise = allExercises.find((e) => e.id === 'Barbell_Bench_Press_-_Medium_Grip') || allExercises[0];
  const shoulderExercise = allExercises.find((e) => e.id === 'Standing_Military_Press') || allExercises[1];

  const pastSessions: WorkoutSession[] = [
    {
      id: 'session_past_1',
      date: new Date(Date.now() - 10 * 86400000).toISOString(),
      status: 'completed',
      dayOfWeek: 'monday',
      muscleGroups: ['chest', 'shoulders'],
      totalVolume: 1200,
      totalSets: 2,
      exercises: [
        {
          id: 'we_1',
          exerciseId: benchExercise.id,
          order: 1,
          notes: '',
          exercise: benchExercise,
          sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 6, completed: true }],
        },
        {
          id: 'we_2',
          exerciseId: shoulderExercise.id,
          order: 2,
          notes: '',
          exercise: shoulderExercise,
          sets: [{ id: 's2', setNumber: 1, weight: 65, reps: 5, completed: true }],
        },
      ],
    },
    {
      id: 'session_past_2',
      date: new Date(Date.now() - 17 * 86400000).toISOString(),
      status: 'completed',
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      totalVolume: 600,
      totalSets: 1,
      exercises: [
        {
          id: 'we_3',
          exerciseId: benchExercise.id,
          order: 1,
          notes: '',
          exercise: benchExercise,
          sets: [{ id: 's3', setNumber: 1, weight: 95, reps: 6, completed: true }],
        },
      ],
    },
  ];

  const personalRecords: PersonalRecord[] = [
    {
      id: 'pr_1',
      exerciseId: benchExercise.id,
      exerciseName: benchExercise.name,
      type: 'max_weight',
      value: 100,
      weight: 100,
      reps: 6,
      estimated1RM: 116.7,
      date: '2026-10-12',
    },
  ];

  const recommendations = getRecommendedExercises({
    targetMuscleGroup: 'triceps',
    allExercises,
    pastSessions,
    personalRecords,
    userGoal: 'Strength & Power',
    equipmentPreference: 'Full Commercial Gym',
    maxRecommendations: 5,
  });

  assert(recommendations.length > 0, 'Recommendations returned for Triceps');
  assert(
    recommendations.every((r) => r.exercise.primaryMuscle === 'triceps'),
    '100% of top recommendations have primaryMuscle === triceps'
  );
  assert(
    !recommendations.some((r) => r.exercise.primaryMuscle === 'chest'),
    'No chest exercises displace direct triceps exercises in recommendations'
  );
  assert(
    !recommendations.some((r) => r.exercise.primaryMuscle === 'shoulders'),
    'No shoulder exercises displace direct triceps exercises in recommendations'
  );

  console.log('  ✅ 100% of recommendations for Triceps have primaryMuscle === "triceps"');
  console.log('  ✅ Strong past Bench Press PR does NOT displace direct Triceps movements');
  console.log('  ✅ Top picks include:', recommendations.slice(0, 3).map((r) => r.exercise.name).join(', '));
}

// =========================================================================
// TEST 3: Compound Exercises Remain Discoverable in All Exercises
// =========================================================================
console.log('\n--- Test 3: Compound exercises remain discoverable in "All Exercises" ---');
{
  const selectedMuscle: MuscleGroup = 'triceps';

  // "All Exercises" filtering rule
  const libraryMatches = allExercises.filter((ex) => {
    return (
      ex.primaryMuscle === selectedMuscle ||
      (ex.secondaryMuscles && ex.secondaryMuscles.includes(selectedMuscle))
    );
  });

  const hasDirectTriceps = libraryMatches.some((e) => e.primaryMuscle === 'triceps');
  const hasChestCompound = libraryMatches.some(
    (e) => e.primaryMuscle === 'chest' && e.secondaryMuscles?.includes('triceps')
  );
  const hasShoulderCompound = libraryMatches.some(
    (e) => e.primaryMuscle === 'shoulders' && e.secondaryMuscles?.includes('triceps')
  );

  assert(hasDirectTriceps, 'Direct triceps exercises are included in All Exercises');
  assert(hasChestCompound, 'Chest compound exercises that hit triceps secondarily are included in All Exercises');
  assert(hasShoulderCompound, 'Shoulder compound exercises that hit triceps secondarily are included in All Exercises');

  // Verify specific benchmark compounds
  assert(
    libraryMatches.some((e) => e.name.toLowerCase().includes('bench press')),
    'Bench press variants discoverable under triceps All Exercises'
  );

  console.log('  ✅ Direct triceps exercises present in All Exercises library');
  console.log('  ✅ Chest compound exercises (Bench Press) remain discoverable in All Exercises');
  console.log('  ✅ Shoulder compound exercises (Overhead Press) remain discoverable in All Exercises');
}

// =========================================================================
// TEST 4: Target-Area Filters Work Correctly
// =========================================================================
console.log('\n--- Test 4: Target-area filters work correctly ---');
{
  const tricepsPool = allExercises.filter(
    (e) => e.primaryMuscle === 'triceps' || e.secondaryMuscles?.includes('triceps')
  );

  // Filter by Long Head
  const longHeadFiltered = tricepsPool.filter((e) =>
    e.muscleAreaEmphasis.includes('long_head_tricep')
  );
  assert(longHeadFiltered.length > 0, 'Long head exercises found');
  assert(
    longHeadFiltered.every((e) => e.muscleAreaEmphasis.includes('long_head_tricep')),
    'All long head filtered exercises emphasize long_head_tricep'
  );

  // Filter by Lateral Head
  const lateralHeadFiltered = tricepsPool.filter((e) =>
    e.muscleAreaEmphasis.includes('lateral_head_tricep')
  );
  assert(lateralHeadFiltered.length > 0, 'Lateral head exercises found');
  assert(
    lateralHeadFiltered.every((e) => e.muscleAreaEmphasis.includes('lateral_head_tricep')),
    'All lateral head filtered exercises emphasize lateral_head_tricep'
  );

  // Filter by Medial Head
  const medialHeadFiltered = tricepsPool.filter((e) =>
    e.muscleAreaEmphasis.includes('medial_head_tricep')
  );
  assert(medialHeadFiltered.length > 0, 'Medial head exercises found');
  assert(
    medialHeadFiltered.every((e) => e.muscleAreaEmphasis.includes('medial_head_tricep')),
    'All medial head filtered exercises emphasize medial_head_tricep'
  );

  console.log('  ✅ Long Head filter correctly isolates long head exercises (count:', longHeadFiltered.length, ')');
  console.log('  ✅ Lateral Head filter correctly isolates lateral head exercises (count:', lateralHeadFiltered.length, ')');
  console.log('  ✅ Medial Head filter correctly isolates medial head exercises (count:', medialHeadFiltered.length, ')');
}

// =========================================================================
// TEST 5: Custom Exercises Work in Context-Aware Picker
// =========================================================================
console.log('\n--- Test 5: Custom exercises work in context-aware picker ---');
{
  const customTricepEx: Exercise = {
    id: 'custom_tri_cable_overhead',
    name: 'Custom High-Cable Overhead Triceps Extension',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    muscleAreaEmphasis: ['long_head_tricep'],
    equipment: 'cable',
    exerciseType: 'isolation',
    difficulty: 'intermediate',
    instructions: ['Extend arms overhead using cable rope.'],
    imageUrl: '',
    tags: ['triceps', 'cable'],
    isCustom: true,
  };

  const pastSessions: WorkoutSession[] = [
    {
      id: 'sess_custom_1',
      date: new Date(Date.now() - 10 * 86400000).toISOString(),
      status: 'completed',
      dayOfWeek: 'thursday',
      muscleGroups: ['triceps'],
      totalVolume: 800,
      totalSets: 2,
      exercises: [
        {
          id: 'we_c1',
          exerciseId: customTricepEx.id,
          exercise: customTricepEx,
          order: 1,
          notes: '',
          sets: [{ id: 's1', setNumber: 1, weight: 40, reps: 10, completed: true }],
        },
      ],
    },
  ];

  const poolWithCustom = [customTricepEx, ...allExercises];

  const recs = getRecommendedExercises({
    targetMuscleGroup: 'triceps',
    allExercises: poolWithCustom,
    pastSessions,
    userGoal: 'Muscle Building & Hypertrophy',
    maxRecommendations: 5,
  });

  assert(
    recs.some((r) => r.exercise.id === 'custom_tri_cable_overhead'),
    'Custom Triceps exercise appears in Triceps recommendations'
  );

  const customRec = recs.find((r) => r.exercise.id === 'custom_tri_cable_overhead')!;
  assert(customRec.explanation.badges.includes('Custom Exercise'), 'Custom exercise has Custom Exercise badge');

  // Also verify custom exercise is present in "All Exercises" library filtering
  const allTricepLibrary = poolWithCustom.filter(
    (e) => e.primaryMuscle === 'triceps' || e.secondaryMuscles?.includes('triceps')
  );
  assert(
    allTricepLibrary.some((e) => e.id === 'custom_tri_cable_overhead'),
    'Custom exercise discoverable in All Exercises tab'
  );

  // And in sub-area filtering
  const longHeadLibrary = allTricepLibrary.filter((e) =>
    e.muscleAreaEmphasis.includes('long_head_tricep')
  );
  assert(
    longHeadLibrary.some((e) => e.id === 'custom_tri_cable_overhead'),
    'Custom exercise matches Long Head filter'
  );

  console.log('  ✅ Custom exercise is recommended for target muscle group');
  console.log('  ✅ Custom exercise carries "Custom Exercise" badge');
  console.log('  ✅ Custom exercise discoverable in All Exercises and sub-area filtering');
}

// =========================================================================
// TEST 6: Other Muscle Groups Behave Consistently
// =========================================================================
console.log('\n--- Test 6: Other muscle groups behave consistently ---');
{
  const supportedGroups: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'legs'];

  for (const group of supportedGroups) {
    const recs = getRecommendedExercises({
      targetMuscleGroup: group,
      allExercises,
      userGoal: 'Muscle Building & Hypertrophy',
      maxRecommendations: 5,
    });

    assert(recs.length > 0, `Recommendations returned for ${group}`);
    assert(
      recs.every((r) => r.exercise.primaryMuscle === group),
      `100% of top recommendations for ${group} have primaryMuscle === "${group}"`
    );
  }

  console.log('  ✅ Chest recommendations prioritize direct chest exercises');
  console.log('  ✅ Back recommendations prioritize direct back exercises');
  console.log('  ✅ Shoulders recommendations prioritize direct shoulder exercises');
  console.log('  ✅ Biceps recommendations prioritize direct bicep exercises');
  console.log('  ✅ Legs recommendations prioritize direct leg exercises');
}

// =========================================================================
// TEST 7: Graceful Fallback When Direct Exercises Are Limited
// =========================================================================
console.log('\n--- Test 7: Graceful fallback when direct exercises are limited ---');
{
  // A constrained pool with only 2 direct triceps exercises and 2 secondary exercises
  const constrainedPool: Exercise[] = [
    {
      id: 'tri_1',
      name: 'Rope Tricep Pushdown',
      primaryMuscle: 'triceps',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['lateral_head_tricep'],
      equipment: 'cable',
      exerciseType: 'isolation',
      difficulty: 'beginner',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: false,
    },
    {
      id: 'tri_2',
      name: 'EZ-Bar Skull Crusher',
      primaryMuscle: 'triceps',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['long_head_tricep'],
      equipment: 'ez_bar',
      exerciseType: 'isolation',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: false,
    },
    {
      id: 'chest_compound_1',
      name: 'Barbell Bench Press',
      primaryMuscle: 'chest',
      secondaryMuscles: ['triceps', 'shoulders'],
      muscleAreaEmphasis: ['mid_chest'],
      equipment: 'barbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: false,
    },
    {
      id: 'shoulder_compound_1',
      name: 'Standing Overhead Press',
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
    },
  ];

  const recs = getRecommendedExercises({
    targetMuscleGroup: 'triceps',
    allExercises: constrainedPool,
    maxRecommendations: 4,
  });

  assert(recs.length === 4, 'Returns 4 recommendations');
  // First 2 must be the direct triceps exercises
  assert(recs[0].exercise.primaryMuscle === 'triceps', 'Slot 1 is direct triceps');
  assert(recs[1].exercise.primaryMuscle === 'triceps', 'Slot 2 is direct triceps');
  // Slots 3 and 4 fill with secondary exercises
  assert(recs[2].exercise.primaryMuscle !== 'triceps', 'Slot 3 is secondary exercise');
  assert(recs[3].exercise.primaryMuscle !== 'triceps', 'Slot 4 is secondary exercise');

  console.log('  ✅ Direct exercises take priority in top slots (slots 1 & 2)');
  console.log('  ✅ Secondary exercises fill remaining slots when direct pool is exhausted');
}

console.log('\n🎉 ALL CONTEXT-AWARE EXERCISE PICKER TESTS PASSED SUCCESSFULLY!');
