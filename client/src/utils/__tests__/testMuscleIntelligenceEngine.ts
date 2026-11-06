import { INITIAL_EXERCISES } from '../../data/exercises';
import { calculateMuscleCoverage, countQualifyingSets, hasValidRecordedSet } from '../coverage';
import {
  getExerciseMuscleContributions,
  evaluateMuscleIntelligence,
  isSetQualifying,
  CONTRIBUTION_TIERS,
  READINESS_THRESHOLDS,
  normalizeSubArea,
} from '../muscleIntelligenceEngine';
import { enrichExercisesWithCanonical, canonicalExerciseMap } from '../../store/workoutStore';
import { Exercise, WorkoutSession, WorkoutExercise, WeeklySchedule } from '../../types';

declare const process: { exit: (code: number) => void };

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}: ${message}`
    );
  }
}

console.log('\n======================================================');
console.log('🧠 GymTrackie Phase 9A – Muscle Intelligence Engine Tests');
console.log('======================================================\n');

const exMap = new Map<string, Exercise>(INITIAL_EXERCISES.map((e) => [e.id, e]));

async function runTestSuite() {
  // ==========================================================================
  // Test 1: Set-Level Calculation Accuracy (5 Bench Press sets = 5 direct sets)
  // ==========================================================================
  console.log('--- Test 1: Set-Level Calculation Accuracy (5 sets = 5 sets) ---');
  {
    const benchPress = exMap.get('Barbell_Bench_Press_-_Medium_Grip') || exMap.get('Flat_Barbell_Bench_Press');
    assert(Boolean(benchPress), 'Bench press exercise must exist');

    const workoutEx: WorkoutExercise = {
      id: 'we_bench_5sets',
      exerciseId: benchPress!.id,
      exercise: benchPress!,
      order: 1,
      notes: '',
      sets: [
        { id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true },
        { id: 's2', setNumber: 2, weight: 80, reps: 8, completed: true },
        { id: 's3', setNumber: 3, weight: 80, reps: 8, completed: true },
        { id: 's4', setNumber: 4, weight: 80, reps: 7, completed: true },
        { id: 's5', setNumber: 5, weight: 80, reps: 6, completed: true },
        // Incomplete set - must NOT count
        { id: 's6', setNumber: 6, weight: 80, reps: null, completed: false },
      ],
    };

    assertEqual(countQualifyingSets(workoutEx), 5, 'countQualifyingSets must return exactly 5 qualifying sets');

    const coverage = calculateMuscleCoverage('chest', [workoutEx]);
    const midChestArea = coverage.areas.find((a) => a.area === 'mid_chest');
    assert(Boolean(midChestArea), 'Mid chest area must exist');
    assertEqual(midChestArea!.directSets, 5, 'Mid chest must have exactly 5 direct sets, NOT 1');
    assertEqual(midChestArea!.status, 'direct', 'Status must be direct');

    // Supported Lower Chest must also count 5 supporting sets
    const lowerChestArea = coverage.areas.find((a) => a.area === 'lower_chest');
    assert(Boolean(lowerChestArea), 'Lower chest area must exist');
    assertEqual(lowerChestArea!.supportingSets, 5, 'Lower chest must have 5 supporting sets from compound overlap');
    assertEqual(lowerChestArea!.status, 'supported', 'Lower chest status must be supported');

    console.log('✓ 5 completed bench press sets count as 5 direct sets and 5 supporting sets for lower chest.');
  }

  // ==========================================================================
  // Test 2: Bodyweight Movement Quantification (weight = 0 and weight > 0)
  // ==========================================================================
  console.log('--- Test 2: Bodyweight Movement Quantification ---');
  {
    const pullUp = exMap.get('Pullups') || exMap.get('Chin-Up');
    assert(Boolean(pullUp), 'Pull-up exercise must exist');
    assertEqual(pullUp!.equipment, 'bodyweight', 'Pull-up equipment must be bodyweight');

    // 1. Unweighted Bodyweight Pull-ups (weight = 0)
    const unweightedPullups: WorkoutExercise = {
      id: 'we_bw_pullup',
      exerciseId: pullUp!.id,
      exercise: pullUp!,
      order: 1,
      notes: '',
      sets: [
        { id: 's1', setNumber: 1, weight: 0, reps: 10, completed: true },
        { id: 's2', setNumber: 2, weight: 0, reps: 10, completed: true },
        { id: 's3', setNumber: 3, weight: 0, reps: 8, completed: true },
      ],
    };

    assert(hasValidRecordedSet(unweightedPullups), 'hasValidRecordedSet must be TRUE for bodyweight weight=0');
    assertEqual(countQualifyingSets(unweightedPullups), 3, 'Must count 3 qualifying sets for bodyweight pullups');

    const backCoverage = calculateMuscleCoverage('back', [unweightedPullups]);
    const latArea = backCoverage.areas.find((a) => a.area === 'lats');
    assert(Boolean(latArea), 'Lats sub-area must exist');
    assertEqual(latArea!.directSets, 3, 'Lats must register 3 direct sets from bodyweight pull-ups');

    // 2. Weighted Bodyweight Dips (weight = 15 kg)
    const dipEx = exMap.get('Dips_-_Chest_Version') || exMap.get('Dips_-_Triceps_Version');
    assert(Boolean(dipEx), 'Dip exercise must exist');

    const weightedDips: WorkoutExercise = {
      id: 'we_weighted_dips',
      exerciseId: dipEx!.id,
      exercise: dipEx!,
      order: 1,
      notes: '',
      sets: [
        { id: 's1', setNumber: 1, weight: 15, reps: 10, completed: true },
        { id: 's2', setNumber: 2, weight: 15, reps: 9, completed: true },
      ],
    };

    assert(hasValidRecordedSet(weightedDips), 'Weighted bodyweight dips must be valid');
    assertEqual(countQualifyingSets(weightedDips), 2, 'Weighted dips must count 2 sets');

    console.log('✓ Bodyweight sets with weight=0 and weighted bodyweight sets (>0) quantify accurately.');
  }

  // ==========================================================================
  // Test 3: Direct vs. Supported Sets Remain Distinct
  // ==========================================================================
  console.log('--- Test 3: Direct vs. Supported Sets Remain Distinct ---');
  {
    const benchPress = exMap.get('Barbell_Bench_Press_-_Medium_Grip') || exMap.get('Flat_Barbell_Bench_Press');
    const workoutEx: WorkoutExercise = {
      id: 'we_bench',
      exerciseId: benchPress!.id,
      exercise: benchPress!,
      order: 1,
      notes: '',
      sets: [
        { id: 's1', setNumber: 1, weight: 100, reps: 5, completed: true },
        { id: 's2', setNumber: 2, weight: 100, reps: 5, completed: true },
        { id: 's3', setNumber: 3, weight: 100, reps: 5, completed: true },
      ],
    };

    const coverage = calculateMuscleCoverage('chest', [workoutEx]);
    const midChest = coverage.areas.find((a) => a.area === 'mid_chest')!;
    const lowerChest = coverage.areas.find((a) => a.area === 'lower_chest')!;

    assertEqual(midChest.directSets, 3, 'Mid chest direct sets is 3');
    assertEqual(midChest.supportingSets, 0, 'Mid chest supporting sets is 0');
    assertEqual(midChest.status, 'direct', 'Mid chest is direct');

    assertEqual(lowerChest.directSets, 0, 'Lower chest direct sets is 0');
    assertEqual(lowerChest.supportingSets, 3, 'Lower chest supporting sets is 3');
    assertEqual(lowerChest.status, 'supported', 'Lower chest is supported');

    console.log('✓ Direct and supported sets remain strictly distinct across sub-regions.');
  }

  // ==========================================================================
  // Test 4: Biomechanical Contribution Tiers (No Universal 0.5 Multiplier)
  // ==========================================================================
  console.log('--- Test 4: Biomechanical Contribution Tiers ---');
  {
    // Dips (Chest Version): Triceps is major_synergist (0.75), not 0.50
    const dips = exMap.get('Dips_-_Chest_Version')!;
    const dipContributions = getExerciseMuscleContributions(dips);
    const dipTriceps = dipContributions.find((c) => c.muscleGroup === 'triceps');
    assert(Boolean(dipTriceps), 'Dips must have triceps contribution');
    assertEqual(dipTriceps!.tier, 'major_synergist', 'Dips triceps must be major_synergist');
    assertEqual(dipTriceps!.factor, 0.75, 'Dips triceps factor must be 0.75');

    // Close-Grip Bench Press: Triceps is prime mover (1.00), Chest is major_synergist (0.75)
    const closeGripBench = exMap.get('Close-Grip_Barbell_Bench_Press')!;
    const cgContributions = getExerciseMuscleContributions(closeGripBench);
    const tricepsPrime = cgContributions.find((c) => c.muscleGroup === 'triceps' && c.tier === 'prime');
    assert(Boolean(tricepsPrime), 'Close grip bench must have triceps as prime mover');
    assertEqual(tricepsPrime!.factor, 1.00, 'Close grip triceps factor is 1.00');

    const chestSynergist = cgContributions.find((c) => c.muscleGroup === 'chest');
    assert(Boolean(chestSynergist), 'Close grip bench must have chest as major synergist');
    assertEqual(chestSynergist!.tier, 'major_synergist', 'Close grip chest must be major_synergist');
    assertEqual(chestSynergist!.factor, 0.75, 'Close grip chest factor must be 0.75');

    // Incline Press: Front Delts is major_synergist (0.75)
    const inclineBench = exMap.get('Barbell_Incline_Bench_Press') || {
      id: 'incline_bench',
      name: 'Barbell Incline Bench Press',
      primaryMuscle: 'chest',
      secondaryMuscles: ['shoulders', 'triceps'],
      muscleAreaEmphasis: ['upper_chest'],
      equipment: 'barbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: false,
    } as Exercise;

    const incContributions = getExerciseMuscleContributions(inclineBench);
    const frontDeltContrib = incContributions.find((c) => c.muscleGroup === 'shoulders');
    assert(Boolean(frontDeltContrib), 'Incline press must have shoulders contribution');
    assertEqual(frontDeltContrib!.factor, 0.75, 'Incline press front delts factor must be 0.75');

    // Squat: Glutes is major_synergist (0.75), Hamstrings is moderate_synergist (0.40)
    const squat = exMap.get('Barbell_Squat') || exMap.get('Barbell_Full_Squat') || {
      id: 'squat',
      name: 'Barbell Squat',
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
    } as Exercise;

    const squatContributions = getExerciseMuscleContributions(squat);
    const gluteContrib = squatContributions.find((c) => c.muscleGroup === 'glutes');
    assertEqual(gluteContrib!.factor, 0.75, 'Squat glute factor is 0.75');
    const hamContrib = squatContributions.find((c) => c.muscleGroup === 'legs' && c.subArea === 'hamstrings');
    assertEqual(hamContrib!.factor, 0.40, 'Squat hamstring factor is 0.40');

    console.log('✓ Biomechanical tiers assign 0.75 for close grip / dips triceps, 0.75 for incline front delts, and 0.40 for squat hamstrings.');
  }

  // ==========================================================================
  // Test 5: Compound Overlap Does Not Double-Count Tonnage or Sets
  // ==========================================================================
  console.log('--- Test 5: Compound Overlap Does Not Double-Count ---');
  {
    const benchPress = exMap.get('Barbell_Bench_Press_-_Medium_Grip') || exMap.get('Flat_Barbell_Bench_Press')!;
    const session: WorkoutSession = {
      id: 'sess_bench_only',
      workoutName: 'Chest Day',
      date: new Date('2026-11-01T10:00:00Z').toISOString(),
      completedAt: new Date('2026-11-01T11:00:00Z').toISOString(),
      dayOfWeek: 'thursday',
      status: 'completed',
      totalVolume: 3200,
      totalSets: 4,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_bench',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [
            { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
            { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true },
            { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true },
            { id: 's4', setNumber: 4, weight: 80, reps: 10, completed: true },
          ],
        },
      ],
    };

    const refDate = new Date('2026-11-02T10:00:00Z');
    const summary = evaluateMuscleIntelligence({
      history: [session],
      exercises: INITIAL_EXERCISES,
      now: refDate,
    });

    const chestReport = summary.groups.find((g) => g.muscleGroup === 'chest')!;
    const tricepReport = summary.groups.find((g) => g.muscleGroup === 'triceps')!;

    // Chest has 4 direct sets, 0 supported sets
    assertEqual(chestReport.directSets7d, 4, 'Chest direct sets is 4');
    assertEqual(chestReport.supportedSets7d, 0, 'Chest supported sets is 0');
    assertEqual(chestReport.effectiveStimulus7d, 4.0, 'Chest stimulus is 4.0');

    // Triceps has 0 direct sets, 4 supported sets, 2.0 effective stimulus (0.50 factor)
    assertEqual(tricepReport.directSets7d, 0, 'Triceps direct sets is 0');
    assertEqual(tricepReport.supportedSets7d, 4, 'Triceps supported sets is 4');
    assertEqual(tricepReport.effectiveStimulus7d, 2.0, 'Triceps stimulus is 2.0');

    console.log('✓ Sets are cleanly apportioned without double-counting parent totals.');
  }

  // ==========================================================================
  // Test 6: Historical Analytics & Canonical Enrichment Invariance
  // ==========================================================================
  console.log('--- Test 6: Historical Analytics & Canonical Enrichment Invariance ---');
  {
    // Legacy snapshot with outdated metadata
    const legacySnapshot: WorkoutExercise = {
      id: 'we_legacy',
      exerciseId: 'Cable_One_Arm_Tricep_Extension',
      exercise: {
        id: 'Cable_One_Arm_Tricep_Extension',
        name: 'Cable One Arm Tricep Extension',
        primaryMuscle: 'triceps',
        secondaryMuscles: [],
        muscleAreaEmphasis: ['long_head_tricep'], // Legacy incorrect
        equipment: 'cable',
        exerciseType: 'isolation',
        difficulty: 'beginner',
        instructions: [],
        imageUrl: '',
        tags: [],
        isCustom: false,
      },
      order: 1,
      notes: 'Preserved user notes',
      sets: [
        { id: 's1', setNumber: 1, weight: 20, reps: 12, completed: true },
        { id: 's2', setNumber: 2, weight: 22.5, reps: 10, completed: true },
      ],
    };

    const rehydrated = enrichExercisesWithCanonical([legacySnapshot], canonicalExerciseMap);
    const enriched = rehydrated[0];

    // Canonical metadata updated to medial head
    assert(enriched.exercise.muscleAreaEmphasis.includes('medial_head_tricep'), 'Must update to medial_head_tricep');
    // Raw sets and notes 100% preserved
    assertEqual(enriched.sets[0].weight, 20, 'Set 1 weight preserved');
    assertEqual(enriched.sets[0].reps, 12, 'Set 1 reps preserved');
    assertEqual(enriched.sets[1].weight, 22.5, 'Set 2 weight preserved');
    assertEqual(enriched.sets[1].reps, 10, 'Set 2 reps preserved');
    assertEqual(enriched.notes, 'Preserved user notes', 'Notes preserved verbatim');

    console.log('✓ Historical workouts safely enriched on read with 100% raw data preservation.');
  }

  // ==========================================================================
  // Test 7: 7-Day vs. 28-Day Time Windows
  // ==========================================================================
  console.log('--- Test 7: 7-Day vs. 28-Day Time Windows ---');
  {
    const benchPress = exMap.get('Barbell_Bench_Press_-_Medium_Grip') || exMap.get('Flat_Barbell_Bench_Press')!;
    const refDate = new Date('2026-11-05T12:00:00Z');

    const history: WorkoutSession[] = [
      // Session A: 4 days ago (in both 7d and 28d)
      {
        id: 'sess_4d_ago',
        workoutName: 'Chest 1',
        date: new Date('2026-11-01T12:00:00Z').toISOString(),
        completedAt: new Date('2026-11-01T13:00:00Z').toISOString(),
        dayOfWeek: 'sunday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_a',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true },
            ],
          },
        ],
      },
      // Session B: 15 days ago (in 28d, but NOT 7d)
      {
        id: 'sess_15d_ago',
        workoutName: 'Chest 2',
        date: new Date('2026-10-21T12:00:00Z').toISOString(),
        completedAt: new Date('2026-10-21T13:00:00Z').toISOString(),
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_b',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true },
            ],
          },
        ],
      },
      // Session C: 35 days ago (in NEITHER window)
      {
        id: 'sess_35d_ago',
        workoutName: 'Chest 3',
        date: new Date('2026-10-01T12:00:00Z').toISOString(),
        completedAt: new Date('2026-10-01T13:00:00Z').toISOString(),
        dayOfWeek: 'thursday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_c',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
              { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true },
              { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true },
            ],
          },
        ],
      },
    ];

    const summary = evaluateMuscleIntelligence({
      history,
      exercises: INITIAL_EXERCISES,
      now: refDate,
    });

    const chest = summary.groups.find((g) => g.muscleGroup === 'chest')!;
    assertEqual(chest.directSets7d, 3, '7-day window must count exactly Session A (3 sets)');
    assertEqual(chest.directSets28d, 6, '28-day window must count Session A + Session B (6 sets)');
    assertEqual(chest.averageWeeklyStimulus28d, 1.5, 'Average weekly stimulus over 4 weeks is 6/4 = 1.5');

    console.log('✓ 7-day and 28-day windows aggregate session intervals accurately.');
  }

  // ==========================================================================
  // Test 8: Persistent Underexposure Requires Multi-Week Evidence
  // ==========================================================================
  console.log('--- Test 8: Persistent Underexposure Requires Multi-Week Evidence ---');
  {
    const benchPress = exMap.get('Barbell_Bench_Press_-_Medium_Grip') || exMap.get('Flat_Barbell_Bench_Press')!;
    const refDate = new Date('2026-11-05T12:00:00Z');

    const split: WeeklySchedule = {
      monday: { name: 'Push', isRest: false, muscleGroups: [{ name: 'chest', displayName: 'Chest' }] },
      tuesday: { name: 'Rest', isRest: true, muscleGroups: [] },
      wednesday: { name: 'Pull', isRest: false, muscleGroups: [{ name: 'back', displayName: 'Back' }] },
      thursday: { name: 'Rest', isRest: true, muscleGroups: [] },
      friday: { name: 'Legs', isRest: false, muscleGroups: [{ name: 'legs', displayName: 'Legs' }] },
      saturday: { name: 'Rest', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest', isRest: true, muscleGroups: [] },
    };

    // Scenario A: User took a deload week in Week 1 (0 sets this week), but trained consistently in Weeks 2, 3, and 4
    const deloadHistory: WorkoutSession[] = [
      // 10 days ago (Week 2): 8 sets
      {
        id: 'w2',
        date: new Date('2026-10-26T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-26T11:00:00Z').toISOString(),
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 6400,
        totalSets: 8,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_w2',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: Array.from({ length: 8 }, (_, i) => ({
              id: `s_${i}`,
              setNumber: i + 1,
              weight: 80,
              reps: 10,
              completed: true,
            })),
          },
        ],
      },
      // 17 days ago (Week 3): 8 sets
      {
        id: 'w3',
        date: new Date('2026-10-19T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-19T11:00:00Z').toISOString(),
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 6400,
        totalSets: 8,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_w3',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: Array.from({ length: 8 }, (_, i) => ({
              id: `s_${i}`,
              setNumber: i + 1,
              weight: 80,
              reps: 10,
              completed: true,
            })),
          },
        ],
      },
      // 24 days ago (Week 4): 8 sets
      {
        id: 'w4',
        date: new Date('2026-10-12T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-12T11:00:00Z').toISOString(),
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 6400,
        totalSets: 8,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_w4',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: Array.from({ length: 8 }, (_, i) => ({
              id: `s_${i}`,
              setNumber: i + 1,
              weight: 80,
              reps: 10,
              completed: true,
            })),
          },
        ],
      },
    ];

    const deloadSummary = evaluateMuscleIntelligence({
      history: deloadHistory,
      exercises: INITIAL_EXERCISES,
      weeklyPlan: split,
      now: refDate,
    });

    const chestDeload = deloadSummary.groups.find((g) => g.muscleGroup === 'chest')!;
    // Average weekly volume is 24 / 4 = 6.0 sets/week
    assertEqual(chestDeload.isPersistentlyUnderexposed, false, 'Chest must NOT be flagged undertrained from a single deload week');

    // Scenario B: Chronic underexposure (only 1 set in 4 weeks)
    const chronicHistory: WorkoutSession[] = [
      {
        id: 'w_chronic',
        date: new Date('2026-10-20T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-20T11:00:00Z').toISOString(),
        dayOfWeek: 'monday',
        status: 'completed',
        totalVolume: 800,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true }],
          },
        ],
      },
    ];

    const chronicSummary = evaluateMuscleIntelligence({
      history: [...chronicHistory, ...deloadHistory.slice(0, 2)], // Total sessions >= 3
      exercises: INITIAL_EXERCISES,
      weeklyPlan: split,
      now: refDate,
    });

    // Check Back which is in the split (Wednesday) but received 0 sets across all 4 weeks
    const backChronic = chronicSummary.groups.find((g) => g.muscleGroup === 'back')!;
    assertEqual(backChronic.isPersistentlyUnderexposed, true, 'Back must be flagged persistently underexposed across 4 weeks');
    assert(
      chronicSummary.persistentUnderexposureAlerts.some((a) => a.muscleGroup === 'back'),
      'Alert generated for Back'
    );

    console.log('✓ Underexposure requires persistent 4-week evidence; single deload weeks are protected.');
  }

  // ==========================================================================
  // Test 9: Recovery Intelligence Responds to Volume & Overlap
  // ==========================================================================
  console.log('--- Test 9: Recovery Intelligence Responds to Volume & Overlap ---');
  {
    const benchPress = exMap.get('Barbell_Bench_Press_-_Medium_Grip') || exMap.get('Flat_Barbell_Bench_Press')!;
    const refDate = new Date('2026-11-05T20:00:00Z');

    // Session performed 8 hours ago with 8 sets of bench press
    const recentHighDensitySession: WorkoutSession = {
      id: 'sess_heavy',
      date: new Date('2026-11-05T12:00:00Z').toISOString(),
      completedAt: new Date('2026-11-05T13:00:00Z').toISOString(),
      dayOfWeek: 'thursday',
      status: 'completed',
      totalVolume: 6400,
      totalSets: 8,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_h',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: Array.from({ length: 8 }, (_, i) => ({
            id: `s_${i}`,
            setNumber: i + 1,
            weight: 80,
            reps: 10,
            completed: true,
          })),
        },
      ],
    };

    const summary = evaluateMuscleIntelligence({
      history: [recentHighDensitySession],
      exercises: INITIAL_EXERCISES,
      now: refDate,
    });

    const chest = summary.groups.find((g) => g.muscleGroup === 'chest')!;
    assertEqual(chest.readiness.status, 'fatigued', 'Chest must be flagged fatigued following 8 sets 8 hours ago');
    assert(chest.readiness.explanation.includes('8 sets within 24h'), 'Explanation cites 8 sets');

    const triceps = summary.groups.find((g) => g.muscleGroup === 'triceps')!;
    // Triceps received 8 * 0.50 = 4.0 weighted sets -> recovering window
    assertEqual(triceps.readiness.status, 'recovering', 'Triceps must be in recovery window from compound overlap');

    console.log('✓ Recovery intelligence responds contextually to working sets and compound synergist fatigue.');
  }

  // ==========================================================================
  // Test 10: Compound-Supported Only Recognition
  // ==========================================================================
  console.log('--- Test 10: Compound-Supported Only Recognition ---');
  {
    // Bent-over row targets lats and upper back directly, and rear delts as major synergist (0.70)
    const row = exMap.get('Bent_Over_Barbell_Row') || {
      id: 'bent_row',
      name: 'Bent Over Barbell Row',
      primaryMuscle: 'back',
      secondaryMuscles: ['shoulders', 'biceps'],
      muscleAreaEmphasis: ['upper_back', 'lats'],
      equipment: 'barbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: false,
    } as Exercise;

    const refDate = new Date('2026-11-05T12:00:00Z');

    // 4 weekly workouts of rows: 3 sets each week = 12 total sets
    const rowHistory: WorkoutSession[] = [
      {
        id: 'r1',
        date: new Date('2026-11-03T10:00:00Z').toISOString(),
        completedAt: new Date('2026-11-03T11:00:00Z').toISOString(),
        dayOfWeek: 'tuesday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['back'],
        exercises: [{ id: 'we_1', exerciseId: row.id, exercise: row, order: 1, notes: '', sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true }, { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true }, { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true }] }],
      },
      {
        id: 'r2',
        date: new Date('2026-10-27T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-27T11:00:00Z').toISOString(),
        dayOfWeek: 'tuesday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['back'],
        exercises: [{ id: 'we_2', exerciseId: row.id, exercise: row, order: 1, notes: '', sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true }, { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true }, { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true }] }],
      },
      {
        id: 'r3',
        date: new Date('2026-10-20T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-20T11:00:00Z').toISOString(),
        dayOfWeek: 'tuesday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['back'],
        exercises: [{ id: 'we_3', exerciseId: row.id, exercise: row, order: 1, notes: '', sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true }, { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true }, { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true }] }],
      },
      {
        id: 'r4',
        date: new Date('2026-10-13T10:00:00Z').toISOString(),
        completedAt: new Date('2026-10-13T11:00:00Z').toISOString(),
        dayOfWeek: 'tuesday',
        status: 'completed',
        totalVolume: 2400,
        totalSets: 3,
        muscleGroups: ['back'],
        exercises: [{ id: 'we_4', exerciseId: row.id, exercise: row, order: 1, notes: '', sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true }, { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true }, { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true }] }],
      },
    ];

    const summary = evaluateMuscleIntelligence({
      history: rowHistory,
      exercises: INITIAL_EXERCISES,
      now: refDate,
    });

    const shoulders = summary.groups.find((g) => g.muscleGroup === 'shoulders')!;
    assertEqual(shoulders.directSets28d, 0, 'Shoulders received 0 direct sets');
    assertEqual(shoulders.supportedSets28d, 12, 'Shoulders received 12 supported sets from rows');
    assertEqual(shoulders.isCompoundSupportedOnly, true, 'Shoulders recognized as isCompoundSupportedOnly');
    assert(
      shoulders.observations.some((o) => o.includes('Supported via Compounds')),
      'Observation indicates supported via compounds'
    );

    console.log('✓ Compound-supported muscles are accurately classified as supported without false undertraining alarms.');
  }

  // ==========================================================================
  // Test 11: Phase 9A.1 – Low-Volume Recovery False-Positive Corrections
  // ==========================================================================
  console.log('\n--- Test 11: Phase 9A.1 – Recovery Readiness Decisions (6 Scenarios) ---');
  {
    const benchPress = exMap.get('Flat_Barbell_Bench_Press') || exMap.get('Barbell_Bench_Press_-_Medium_Grip')!;
    const squat = exMap.get('Barbell_Squat') || exMap.get('Squats')!;
    const now = new Date('2026-11-06T12:00:00Z');

    // Scenario 1: One set 30 hours ago (must be 'ready', acuteLoadScore = 0.5 < 1.5)
    const session1Set30hAgo: WorkoutSession = {
      id: 'sess_1set_30h',
      date: new Date('2026-11-05T06:00:00Z').toISOString(),
      completedAt: new Date('2026-11-05T06:00:00Z').toISOString(),
      dayOfWeek: 'thursday',
      status: 'completed',
      totalVolume: 80,
      totalSets: 1,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
        },
      ],
    };

    const res1 = evaluateMuscleIntelligence({
      history: [session1Set30hAgo],
      exercises: INITIAL_EXERCISES,
      now,
    });
    const chest1 = res1.groups.find((g) => g.muscleGroup === 'chest')!;
    assertEqual(chest1.readiness.hoursSinceLastTrained, 30, '1 set was 30h ago');
    assertEqual(chest1.readiness.status, 'ready', '1 set 30h ago must NOT trigger recovering status; must be ready');

    // Scenario 2: Three sets 30 hours ago (must be 'recovering', acuteLoadScore = 1.5 >= 1.5 and hours <= 36)
    const session3Sets30hAgo: WorkoutSession = {
      id: 'sess_3sets_30h',
      date: new Date('2026-11-05T06:00:00Z').toISOString(),
      completedAt: new Date('2026-11-05T06:00:00Z').toISOString(),
      dayOfWeek: 'thursday',
      status: 'completed',
      totalVolume: 240,
      totalSets: 3,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_2',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: [
            { id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true },
            { id: 's2', setNumber: 2, weight: 80, reps: 8, completed: true },
            { id: 's3', setNumber: 3, weight: 80, reps: 8, completed: true },
          ],
        },
      ],
    };

    const res2 = evaluateMuscleIntelligence({
      history: [session3Sets30hAgo],
      exercises: INITIAL_EXERCISES,
      now,
    });
    const chest2 = res2.groups.find((g) => g.muscleGroup === 'chest')!;
    assertEqual(chest2.readiness.status, 'recovering', '3 sets 30h ago must trigger recovering status');

    // Scenario 3: Six direct sets within 24 hours (10h ago) -> must trigger 'fatigued'
    const session6Sets10hAgo: WorkoutSession = {
      id: 'sess_6sets_10h',
      date: new Date('2026-11-06T02:00:00Z').toISOString(),
      completedAt: new Date('2026-11-06T02:00:00Z').toISOString(),
      dayOfWeek: 'friday',
      status: 'completed',
      totalVolume: 480,
      totalSets: 6,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_3',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: Array.from({ length: 6 }, (_, i) => ({
            id: `s_${i}`,
            setNumber: i + 1,
            weight: 80,
            reps: 8,
            completed: true,
          })),
        },
      ],
    };

    const res3 = evaluateMuscleIntelligence({
      history: [session6Sets10hAgo],
      exercises: INITIAL_EXERCISES,
      now,
    });
    const chest3 = res3.groups.find((g) => g.muscleGroup === 'chest')!;
    assertEqual(chest3.readiness.status, 'fatigued', '6 sets within 24h must trigger fatigued status');

    // Scenario 4: High compound exposure through synergist contributions (10 heavy bench sets 10h ago)
    const session10Sets10hAgo: WorkoutSession = {
      id: 'sess_10sets_10h',
      date: new Date('2026-11-06T02:00:00Z').toISOString(),
      completedAt: new Date('2026-11-06T02:00:00Z').toISOString(),
      dayOfWeek: 'friday',
      status: 'completed',
      totalVolume: 800,
      totalSets: 10,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_4',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: Array.from({ length: 10 }, (_, i) => ({
            id: `s_${i}`,
            setNumber: i + 1,
            weight: 80,
            reps: 8,
            completed: true,
          })),
        },
      ],
    };

    const res4 = evaluateMuscleIntelligence({
      history: [session10Sets10hAgo],
      exercises: INITIAL_EXERCISES,
      now,
    });
    const triceps4 = res4.groups.find((g) => g.muscleGroup === 'triceps')!;
    assert(
      triceps4.readiness.status === 'fatigued' || triceps4.readiness.status === 'recovering',
      'Triceps must register synergist fatigue/recovery from 10 sets of heavy compound pressing'
    );
    assert(triceps4.readiness.acuteLoadScore >= 5.0, 'Triceps acuteLoadScore must be >= 5.0 from 10 bench sets');

    // Scenario 5: No recent training (last workout 5 days ago = 120 hours) -> must be 'ready'
    const session5DaysAgo: WorkoutSession = {
      id: 'sess_5d_ago',
      date: new Date('2026-11-01T12:00:00Z').toISOString(),
      completedAt: new Date('2026-11-01T12:00:00Z').toISOString(),
      dayOfWeek: 'sunday',
      status: 'completed',
      totalVolume: 400,
      totalSets: 5,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_5',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          sets: Array.from({ length: 5 }, (_, i) => ({
            id: `s_${i}`,
            setNumber: i + 1,
            weight: 80,
            reps: 8,
            completed: true,
          })),
        },
      ],
    };

    const res5 = evaluateMuscleIntelligence({
      history: [session5DaysAgo],
      exercises: INITIAL_EXERCISES,
      now,
    });
    const chest5 = res5.groups.find((g) => g.muscleGroup === 'chest')!;
    assertEqual(chest5.readiness.status, 'ready', '5 days of rest must result in ready status');

    // Scenario 6: Overlapping readiness conditions (16 days since direct, but 10 sets squats 12h ago)
    // Glutes has daysSinceLastDirect >= 14, but recent heavy compound loading (10 squats @ 0.70 = 7.0 acute load).
    // Acute overload must take precedence over dormancy!
    const session16DaysAgoGlutesDirect: WorkoutSession = {
      id: 'sess_glutes_16d',
      date: new Date('2026-10-21T12:00:00Z').toISOString(),
      completedAt: new Date('2026-10-21T12:00:00Z').toISOString(),
      dayOfWeek: 'wednesday',
      status: 'completed',
      totalVolume: 300,
      totalSets: 3,
      muscleGroups: ['glutes'],
      exercises: [
        {
          id: 'we_glute_direct',
          exerciseId: 'Hip_Thrust',
          exercise: {
            id: 'Hip_Thrust',
            name: 'Barbell Hip Thrust',
            primaryMuscle: 'glutes',
            secondaryMuscles: [],
            muscleAreaEmphasis: ['glutes'],
            equipment: 'barbell',
            exerciseType: 'compound',
            difficulty: 'intermediate',
            instructions: [],
            imageUrl: '/exercises/hip-thrust/0.jpg',
            tags: ['glutes'],
            isCustom: false,
          },
          order: 1,
          notes: '',
          sets: Array.from({ length: 3 }, (_, i) => ({
            id: `sg_${i}`,
            setNumber: i + 1,
            weight: 100,
            reps: 10,
            completed: true,
          })),
        },
      ],
    };

    const sessionSquats12hAgo: WorkoutSession = {
      id: 'sess_squats_12h',
      date: new Date('2026-11-06T00:00:00Z').toISOString(),
      completedAt: new Date('2026-11-06T00:00:00Z').toISOString(),
      dayOfWeek: 'friday',
      status: 'completed',
      totalVolume: 1000,
      totalSets: 10,
      muscleGroups: ['legs'],
      exercises: [
        {
          id: 'we_squats_10',
          exerciseId: squat.id,
          exercise: squat,
          order: 1,
          notes: '',
          sets: Array.from({ length: 10 }, (_, i) => ({
            id: `sq_${i}`,
            setNumber: i + 1,
            weight: 100,
            reps: 10,
            completed: true,
          })),
        },
      ],
    };

    const res6 = evaluateMuscleIntelligence({
      history: [sessionSquats12hAgo, session16DaysAgoGlutesDirect],
      exercises: INITIAL_EXERCISES,
      now,
    });
    const glutes6 = res6.groups.find((g) => g.muscleGroup === 'glutes')!;
    assert(
      glutes6.readiness.status === 'fatigued' || glutes6.readiness.status === 'recovering',
      'Acute squat overload must prioritize fatigued/recovering over dormant'
    );
    assert(glutes6.readiness.status !== 'dormant', 'Active tissue load cannot be marked dormant');

    console.log('✓ All 6 recovery readiness scenarios pass exact threshold specifications.');
  }

  // ==========================================================================
  // Test 12: Phase 9A.1 – Surfacing Uncertain Mappings & Separated Stimulus
  // ==========================================================================
  console.log('\n--- Test 12: Phase 9A.1 – Uncertain Mappings & Separated Stimulus ---');
  {
    const now = new Date('2026-11-06T12:00:00Z');

    // Create a canonical exercise with an unmapped secondary muscle that falls back to 0.50
    const exerciseWithUnmappedSecondary: Exercise = {
      id: 'ex_special_pull',
      name: 'Special Rotary Pullover Machine',
      primaryMuscle: 'back',
      secondaryMuscles: ['triceps'], // Back pullover with triceps secondary -> falls back to 0.50 uncertain
      muscleAreaEmphasis: ['lats'],
      equipment: 'machine',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '/exercises/pullover/0.jpg',
      tags: ['back', 'lats'],
      isCustom: false,
    };

    const testSession: WorkoutSession = {
      id: 'sess_unmapped_sec',
      date: new Date('2026-11-05T12:00:00Z').toISOString(),
      completedAt: new Date('2026-11-05T12:00:00Z').toISOString(),
      dayOfWeek: 'thursday',
      status: 'completed',
      totalVolume: 300,
      totalSets: 4,
      muscleGroups: ['back'],
      exercises: [
        {
          id: 'we_pullover',
          exerciseId: exerciseWithUnmappedSecondary.id,
          exercise: exerciseWithUnmappedSecondary,
          order: 1,
          notes: '',
          sets: Array.from({ length: 4 }, (_, i) => ({
            id: `s_${i}`,
            setNumber: i + 1,
            weight: 50,
            reps: 10,
            completed: true,
          })),
        },
      ],
    };

    const summary = evaluateMuscleIntelligence({
      history: [testSession],
      exercises: [...INITIAL_EXERCISES, exerciseWithUnmappedSecondary],
      now,
    });

    // 1. Must be recorded in summary.uncertainMappings
    assert(summary.uncertainMappings.length > 0, 'Uncertain mapping must be collected');
    const uItem = summary.uncertainMappings.find((u) => u.exerciseId === exerciseWithUnmappedSecondary.id)!;
    assert(Boolean(uItem), 'Pullover machine must be in uncertainMappings list');
    assertEqual(uItem.muscleGroup, 'triceps', 'Uncertain muscle target is triceps');
    assertEqual(uItem.setsRecorded7d, 4, 'Recorded 4 sets in 7d');
    assertEqual(uItem.estimatedStimulus7d, 2.0, '4 sets * 0.50 = 2.0 estimated stimulus');

    // 2. Triceps report must separate confirmed vs uncertain stimulus
    const tricepsReport = summary.groups.find((g) => g.muscleGroup === 'triceps')!;
    assertEqual(tricepsReport.confirmedStimulus7d, 0, 'Triceps confirmed stimulus is 0');
    assertEqual(tricepsReport.uncertainStimulus7d, 2.0, 'Triceps uncertain stimulus is 2.0');
    assertEqual(tricepsReport.effectiveStimulus7d, 2.0, 'Triceps total effective stimulus is 2.0');
    assertEqual(tricepsReport.hasUncertainContributions7d, true, 'hasUncertainContributions7d is true');

    console.log('✓ Uncertain mappings are tracked with full audit transparency and separated stimulus scores.');
  }

  // ==========================================================================
  // Test 13: Phase 9A.1 – Custom Exercise Secondary Muscle Synergist Support
  // ==========================================================================
  console.log('\n--- Test 13: Phase 9A.1 – Custom Exercise Secondary Muscles ---');
  {
    const now = new Date('2026-11-06T12:00:00Z');

    // User creates a custom compound press with secondary muscles 'shoulders' and 'triceps'
    const customPress: Exercise = {
      id: 'custom_ex_press_1',
      name: 'Custom Swiss Bar Neutral Press',
      primaryMuscle: 'chest',
      secondaryMuscles: ['shoulders', 'triceps'],
      muscleAreaEmphasis: ['mid_chest'],
      equipment: 'barbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '/exercises/custom-press/0.jpg',
      tags: ['custom', 'chest'],
      isCustom: true,
    };

    const contribs = getExerciseMuscleContributions(customPress);
    const chestContrib = contribs.find((c) => c.muscleGroup === 'chest')!;
    const shoulderContrib = contribs.find((c) => c.muscleGroup === 'shoulders')!;
    const tricepContrib = contribs.find((c) => c.muscleGroup === 'triceps')!;

    assertEqual(chestContrib.tier, 'prime', 'Chest is prime');
    assertEqual(chestContrib.isDirect, true, 'Chest is direct');
    assertEqual(shoulderContrib.tier, 'major_synergist', 'Shoulders is major synergist from flat press movement pattern');
    assertEqual(shoulderContrib.isDirect, false, 'Shoulders is supported/synergist');
    assertEqual(shoulderContrib.factor, 0.70, 'Shoulder contribution factor is 0.70');
    assertEqual(tricepContrib.tier, 'moderate_synergist', 'Triceps is moderate synergist');
    assertEqual(tricepContrib.factor, 0.50, 'Tricep contribution factor is 0.50');

    // Also test custom exercise with arbitrary name that does not match preset keywords
    const customArbitrary: Exercise = {
      id: 'custom_arbitrary_1',
      name: 'Custom Device Movement',
      primaryMuscle: 'back',
      secondaryMuscles: ['triceps'],
      muscleAreaEmphasis: ['lats'],
      equipment: 'machine',
      exerciseType: 'isolation',
      difficulty: 'beginner',
      instructions: [],
      imageUrl: '/exercises/custom-device/0.jpg',
      tags: ['custom', 'back'],
      isCustom: true,
    };
    const arbitraryContribs = getExerciseMuscleContributions(customArbitrary);
    const arbTricep = arbitraryContribs.find((c) => c.muscleGroup === 'triceps')!;
    assertEqual(arbTricep.tier, 'moderate_synergist', 'Custom secondary without keyword defaults to moderate synergist');
    assertEqual(arbTricep.factor, 0.50, 'Custom secondary factor is 0.50');
    assertEqual(arbTricep.isUncertainMapping, false, 'User-selected custom secondary is confirmed, not uncertain fallback');

    const customSession: WorkoutSession = {
      id: 'sess_custom_press',
      date: new Date('2026-11-05T12:00:00Z').toISOString(),
      completedAt: new Date('2026-11-05T12:00:00Z').toISOString(),
      dayOfWeek: 'thursday',
      status: 'completed',
      totalVolume: 500,
      totalSets: 5,
      muscleGroups: ['chest'],
      exercises: [
        {
          id: 'we_custom',
          exerciseId: customPress.id,
          exercise: customPress,
          order: 1,
          notes: '',
          sets: Array.from({ length: 5 }, (_, i) => ({
            id: `s_${i}`,
            setNumber: i + 1,
            weight: 70,
            reps: 8,
            completed: true,
          })),
        },
      ],
    };

    const summary = evaluateMuscleIntelligence({
      history: [customSession],
      exercises: [...INITIAL_EXERCISES, customPress],
      now,
    });

    const chest = summary.groups.find((g) => g.muscleGroup === 'chest')!;
    const shoulders = summary.groups.find((g) => g.muscleGroup === 'shoulders')!;
    const triceps = summary.groups.find((g) => g.muscleGroup === 'triceps')!;

    assertEqual(chest.directSets7d, 5, 'Chest received 5 direct sets');
    assertEqual(shoulders.supportedSets7d, 5, 'Shoulders received 5 supported sets from custom compound');
    assertEqual(triceps.supportedSets7d, 5, 'Triceps received 5 supported sets from custom compound');
    assertEqual(shoulders.confirmedStimulus7d, 3.5, '5 sets * 0.70 = 3.5 confirmed stimulus sets');
    assertEqual(triceps.confirmedStimulus7d, 2.5, '5 sets * 0.50 = 2.5 confirmed stimulus sets');
    assertEqual(shoulders.uncertainStimulus7d, 0, 'Custom user-specified synergist has 0 uncertain stimulus');

    console.log('✓ Custom compound exercises accurately credit secondary synergists as confirmed supported sets.');
  }

  // ==========================================================================
  // Test 14: Phase 9A.1 – Glute & Calf Taxonomy Normalization
  // ==========================================================================
  console.log('\n--- Test 14: Phase 9A.1 – Glute & Calf Sub-Area Compatibility ---');
  {
    assertEqual(normalizeSubArea('glute_max'), 'glutes', 'glute_max normalizes to glutes');
    assertEqual(normalizeSubArea('glute_med'), 'glutes', 'glute_med normalizes to glutes');
    assertEqual(normalizeSubArea('gastrocnemius'), 'calves', 'gastrocnemius normalizes to calves');
    assertEqual(normalizeSubArea('soleus'), 'calves', 'soleus normalizes to calves');
    assertEqual(normalizeSubArea('upper_chest'), 'upper_chest', 'other sub-areas remain unchanged');

    const gluteExWithSpecificSubArea: Exercise = {
      id: 'ex_glute_max_test',
      name: 'Special Glute Max Kickback',
      primaryMuscle: 'glutes',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['glute_max' as any],
      equipment: 'cable',
      exerciseType: 'isolation',
      difficulty: 'beginner',
      instructions: [],
      imageUrl: '/exercises/kickback/0.jpg',
      tags: ['glutes'],
      isCustom: true,
    };

    const contribs = getExerciseMuscleContributions(gluteExWithSpecificSubArea);
    assertEqual(contribs[0].subArea, 'glutes', 'subArea is normalized to glutes in contributions');

    console.log('✓ Glute and calf sub-area aliases normalize seamlessly without runtime collisions.');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 14 PHASE 9A.1 MUSCLE INTELLIGENCE TESTS PASSED!');
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\nTest suite failed:', err);
  process.exit(1);
});
