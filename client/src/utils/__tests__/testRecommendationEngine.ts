import {
  getRecommendedExercises,
  analyzePerformanceHistory,
  isEquipmentCompatible,
  getMovementPattern,
  applyDiversityReranking,
  ScoredRecommendation,
} from '../recommendationEngine';
import { Exercise, WorkoutSession, WorkoutExercise } from '../../types';
import exercisesData from '../../data/exercisesData.json';

const allExercises = exercisesData as Exercise[];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runPhase3Tests() {
  console.log('=== GYMTRACKIE PHASE 3 RECOMMENDATION ENGINE TEST SUITE ===\n');

  // Candidate fixtures
  const benchPress = allExercises.find((e) => e.name.toLowerCase().includes('barbell bench press')) || allExercises[0];
  const inclineDumbbellPress = allExercises.find((e) => e.name.toLowerCase().includes('incline dumbbell bench press') || e.muscleAreaEmphasis.includes('upper_chest')) || allExercises[1];
  const cableFly = allExercises.find((e) => e.equipment === 'cable' && e.primaryMuscle === 'chest') || allExercises[2];

  // =========================================================================
  // TEST 1: Correct filtering by target muscle group
  // =========================================================================
  console.log('--- Test 1: Correct filtering by target muscle group ---');
  {
    const results = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises,
      currentExercises: [],
      pastSessions: [],
    });

    assert(results.length > 0, 'Recommendations returned for chest');
    assert(
      results.every(
        (r) =>
          r.exercise.primaryMuscle === 'chest' ||
          (r.exercise.secondaryMuscles && r.exercise.secondaryMuscles.includes('chest'))
      ),
      'All candidates target chest as primary or secondary muscle'
    );
    assert(
      !results.some((r) => r.exercise.primaryMuscle === 'legs'),
      'Never recommends leg exercise for chest target'
    );
  }

  // =========================================================================
  // TEST 2: Correct goal-specific ranking for all four fitness goals
  // =========================================================================
  console.log('\n--- Test 2: Correct goal-specific ranking for all 4 fitness goals ---');
  {
    const candidateSubset = allExercises.filter((e) => e.primaryMuscle === 'chest').slice(0, 25);

    const strengthResults = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      userGoal: 'Strength & Power',
      allExercises: candidateSubset,
      currentExercises: [],
    });

    const hypertrophyResults = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      userGoal: 'Muscle Building & Hypertrophy',
      allExercises: candidateSubset,
      currentExercises: [],
    });

    const fatLossResults = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      userGoal: 'Fat Loss & Conditioning',
      allExercises: candidateSubset,
      currentExercises: [],
    });

    const longevityResults = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      userGoal: 'General Fitness & Longevity',
      allExercises: candidateSubset,
      currentExercises: [],
    });

    assert(strengthResults.length > 0, 'Strength recommendations generated');
    assert(hypertrophyResults.length > 0, 'Hypertrophy recommendations generated');
    assert(fatLossResults.length > 0, 'Fat Loss recommendations generated');
    assert(longevityResults.length > 0, 'Longevity recommendations generated');

    // Strength prioritizes compound multi-joint movements
    assert(
      strengthResults[0].exercise.exerciseType === 'compound',
      `Strength top pick is compound (${strengthResults[0].exercise.name})`
    );
    assert(
      strengthResults[0].explanation.badges.some((b) => b.includes('Strength') || b.includes('Compound')),
      'Strength top pick includes Strength/Compound badge'
    );

    // Hypertrophy rewards hypertrophy-oriented localized tension
    assert(
      hypertrophyResults[0].explanation.badges.includes('Hypertrophy Focus'),
      'Hypertrophy top pick includes "Hypertrophy Focus" badge'
    );

    // Fat Loss rewards conditioning
    assert(
      fatLossResults[0].explanation.badges.includes('Conditioning Match'),
      'Fat loss top pick includes "Conditioning Match" badge'
    );

    // Longevity avoids extreme difficulty and prioritizes mobility
    assert(
      longevityResults[0].exercise.difficulty !== 'expert',
      'Longevity top pick avoids expert difficulty'
    );
    assert(
      longevityResults[0].explanation.badges.includes('Joint-Friendly Mobility'),
      'Longevity top pick includes "Joint-Friendly Mobility" badge'
    );
  }

  // =========================================================================
  // TEST 3: Equipment compatibility and missing equipment preferences
  // =========================================================================
  console.log('\n--- Test 3: Equipment compatibility and missing equipment preferences ---');
  {
    // Home Gym / Free Weights compatibility
    assert(isEquipmentCompatible('barbell', 'Home Gym / Free Weights'), 'Barbell compatible with Home Gym');
    assert(isEquipmentCompatible('dumbbell', 'Home Gym / Free Weights'), 'Dumbbell compatible with Home Gym');
    assert(!isEquipmentCompatible('cable', 'Home Gym / Free Weights'), 'Cable incompatible with Home Gym');
    assert(!isEquipmentCompatible('machine', 'Home Gym / Free Weights'), 'Machine incompatible with Home Gym');

    // Missing / undefined preference allows all gear
    assert(isEquipmentCompatible('machine', undefined), 'Undefined preference allows machine');
    assert(isEquipmentCompatible('cable', 'Full Commercial Gym'), 'Commercial gym allows cable');

    // Graceful fallback when equipment is constrained but no matching exercise exists
    const cableOnlyPool = [cableFly];
    const fallbackResults = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      equipmentPreference: 'Calisthenics & Bodyweight', // strictly bodyweight
      allExercises: cableOnlyPool, // only cable available
      currentExercises: [],
    });
    assert(
      fallbackResults.length === 1,
      'Graceful fallback preserves candidate instead of leaving user with empty screen'
    );
  }

  // =========================================================================
  // TEST 4: Duplicate prevention in a new workout
  // =========================================================================
  console.log('\n--- Test 4: Duplicate prevention in a new workout ---');
  {
    const activeEx: WorkoutExercise = {
      id: 'we_active',
      exerciseId: benchPress.id,
      exercise: benchPress,
      order: 1,
      sets: [],
      notes: '',
    };

    const results = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress, inclineDumbbellPress, cableFly],
      currentExercises: [activeEx],
    });

    assert(
      !results.some((r) => r.exercise.id === benchPress.id),
      'Bench press excluded from recommendations because it is already in active session'
    );
  }

  // =========================================================================
  // TEST 5: Correct behavior when editing an existing workout
  // =========================================================================
  console.log('\n--- Test 5: Correct behavior when editing an existing workout ---');
  {
    // Simulate editing an existing workout with id: 'session_edit_999'
    const editingSessionId = 'session_edit_999';

    // In past history, that exact session exists with benchPress logged today
    const sessionBeingEdited: WorkoutSession = {
      id: editingSessionId,
      date: new Date().toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1500,
      totalSets: 3,
      exercises: [
        {
          id: 'we_editing_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    // When passing currentSessionId, analyzePerformanceHistory MUST ignore sessionBeingEdited
    const perf = analyzePerformanceHistory(benchPress.id, [sessionBeingEdited], undefined, editingSessionId);

    assert(
      perf.sessionCount === 0,
      'Session currently being edited is excluded from past performance history'
    );
    assert(
      perf.trend === 'unknown',
      'Trend is unknown because editing session is not counted as historical completed session'
    );
  }

  // =========================================================================
  // TEST 6: Performance improvement based on comparable historical sets
  // =========================================================================
  console.log('\n--- Test 6: Performance improvement based on comparable historical sets ---');
  {
    const date1 = new Date(Date.now() - 14 * 86400000).toISOString(); // 14 days ago: 80 kg × 8 reps
    const date2 = new Date(Date.now() - 7 * 86400000).toISOString();  // 7 days ago: 85 kg × 8 reps (+6.25% gain)

    const olderSession: WorkoutSession = {
      id: 'sess_1',
      date: date1,
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1600,
      totalSets: 2,
      exercises: [
        {
          id: 'we_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const recentSession: WorkoutSession = {
      id: 'sess_2',
      date: date2,
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1700,
      totalSets: 2,
      exercises: [
        {
          id: 'we_2',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's2', setNumber: 1, weight: 85, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const perf = analyzePerformanceHistory(benchPress.id, [recentSession, olderSession]);

    assert(perf.trend === 'improving', 'Trend correctly identified as improving');
    assert(perf.trendDeltaPercent! > 0, `Positive delta percent calculated (+${perf.trendDeltaPercent}%)`);
    assert(
      perf.trendReason.includes('80 kg') && perf.trendReason.includes('85 kg'),
      'Trend reason cites exact previous and current working weights'
    );

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress],
      currentExercises: [],
      pastSessions: [recentSession, olderSession],
    });

    assert(
      recs[0].explanation.badges.includes('Progression: Improving'),
      'Recommendation includes "Progression: Improving" badge'
    );
  }

  // =========================================================================
  // TEST 7: Stable performance and insufficient-history handling
  // =========================================================================
  console.log('\n--- Test 7: Stable performance and insufficient-history handling ---');
  {
    const date1 = new Date(Date.now() - 14 * 86400000).toISOString();
    const date2 = new Date(Date.now() - 7 * 86400000).toISOString();

    const sessionA: WorkoutSession = {
      id: 'sess_a',
      date: date1,
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1600,
      totalSets: 2,
      exercises: [
        {
          id: 'we_a',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const sessionB: WorkoutSession = {
      id: 'sess_b',
      date: date2,
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1600,
      totalSets: 2,
      exercises: [
        {
          id: 'we_b',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's2', setNumber: 1, weight: 80, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    // Case 7a: Two sessions with identical working loads -> stable
    const stablePerf = analyzePerformanceHistory(benchPress.id, [sessionB, sessionA]);
    assert(stablePerf.trend === 'stable', 'Identical working loads categorized as stable trend');
    assert(stablePerf.sessionCount === 2, '2 comparable sessions recorded');

    // Case 7b: Single session only -> unknown trend (insufficient history)
    const singlePerf = analyzePerformanceHistory(benchPress.id, [sessionA]);
    assert(singlePerf.trend === 'unknown', 'Single session categorized as unknown trend');
    assert(singlePerf.sessionCount === 1, 'Session count is 1');
    assert(!singlePerf.isLimitedData, 'Not marked as limited data since 1 baseline exists');
  }

  // =========================================================================
  // TEST 8: Declining performance without unsupported conclusions
  // =========================================================================
  console.log('\n--- Test 8: Declining performance without unsupported conclusions ---');
  {
    const date1 = new Date(Date.now() - 14 * 86400000).toISOString(); // 14 days ago: 85 kg × 8
    const date2 = new Date(Date.now() - 7 * 86400000).toISOString();  // 7 days ago: 75 kg × 8 (-11.8% drop)

    const olderSession: WorkoutSession = {
      id: 'sess_decl_1',
      date: date1,
      dayOfWeek: 'wednesday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1700,
      totalSets: 2,
      exercises: [
        {
          id: 'we_d1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's1', setNumber: 1, weight: 85, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const recentSession: WorkoutSession = {
      id: 'sess_decl_2',
      date: date2,
      dayOfWeek: 'wednesday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1500,
      totalSets: 2,
      exercises: [
        {
          id: 'we_d2',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's2', setNumber: 1, weight: 75, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const perf = analyzePerformanceHistory(benchPress.id, [recentSession, olderSession]);
    assert(perf.trend === 'declining', 'Trend accurately identified as declining');
    assert(
      perf.trendReason.includes('conservative load advised'),
      'Advises conservative load rather than pushing heavier weights'
    );
  }

  // =========================================================================
  // TEST 9: Recent exercise history and date-window boundaries
  // =========================================================================
  console.log('\n--- Test 9: Recent exercise history and date-window boundaries ---');
  {
    const now = Date.now();
    const oneDayAgo = new Date(now - 1 * 86400000).toISOString();
    const eightDaysAgo = new Date(now - 8 * 86400000).toISOString();
    const twentyDaysAgo = new Date(now - 20 * 86400000).toISOString();

    const makeSession = (id: string, date: string, ex: Exercise): WorkoutSession => ({
      id,
      date,
      dayOfWeek: 'monday',
      muscleGroups: [ex.primaryMuscle],
      status: 'completed',
      totalVolume: 1000,
      totalSets: 2,
      exercises: [
        {
          id: `we_${id}`,
          exerciseId: ex.id,
          exercise: ex,
          order: 1,
          sets: [{ id: `s_${id}`, setNumber: 1, weight: 50, reps: 10, completed: true }],
          notes: '',
        },
      ],
    });

    const perfRecent = analyzePerformanceHistory(benchPress.id, [makeSession('s_rec', oneDayAgo, benchPress)]);
    assert(perfRecent.daysAgo === 1, 'Calculated exactly 1 day ago');

    const perfWeekly = analyzePerformanceHistory(inclineDumbbellPress.id, [makeSession('s_week', eightDaysAgo, inclineDumbbellPress)]);
    assert(perfWeekly.daysAgo === 8, 'Calculated exactly 8 days ago');

    const perfRotation = analyzePerformanceHistory(cableFly.id, [makeSession('s_rot', twentyDaysAgo, cableFly)]);
    assert(perfRotation.daysAgo === 20, 'Calculated exactly 20 days ago');

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress, inclineDumbbellPress, cableFly],
      currentExercises: [],
      pastSessions: [
        makeSession('s_rec', oneDayAgo, benchPress),
        makeSession('s_week', eightDaysAgo, inclineDumbbellPress),
        makeSession('s_rot', twentyDaysAgo, cableFly),
      ],
    });

    const benchRec = recs.find((r) => r.exercise.id === benchPress.id)!;
    const cableRec = recs.find((r) => r.exercise.id === cableFly.id)!;

    assert(
      benchRec.explanation.factors.historyStatus === 'recent',
      '1 day ago categorized as recent with penalty'
    );
    assert(
      cableRec.explanation.factors.historyStatus === 'ready_for_rotation',
      '20 days ago categorized as ready for rotation'
    );
    assert(cableRec.score > benchRec.score, 'Exercise ready for rotation outscores exercise trained yesterday');
  }

  // =========================================================================
  // TEST 10: Diversity reranking when several similar exercises have high scores
  // =========================================================================
  console.log('\n--- Test 10: Diversity reranking across movement patterns & equipment ---');
  {
    // Create 4 flat barbell bench variants (all horizontal_push, barbell)
    const flat1: Exercise = { ...benchPress, id: 'flat_1', name: 'Barbell Bench Press 1', equipment: 'barbell', exerciseType: 'compound' };
    const flat2: Exercise = { ...benchPress, id: 'flat_2', name: 'Barbell Bench Press 2', equipment: 'barbell', exerciseType: 'compound' };
    const flat3: Exercise = { ...benchPress, id: 'flat_3', name: 'Barbell Bench Press 3', equipment: 'barbell', exerciseType: 'compound' };
    const flat4: Exercise = { ...benchPress, id: 'flat_4', name: 'Barbell Bench Press 4', equipment: 'barbell', exerciseType: 'compound' };

    // Incline dumbbell press (incline_push, dumbbell)
    const inclineDumbbell: Exercise = {
      ...inclineDumbbellPress,
      id: 'inc_db',
      name: 'Incline Dumbbell Press',
      equipment: 'dumbbell',
      exerciseType: 'compound',
      muscleAreaEmphasis: ['upper_chest'],
    };

    // Cable fly (chest_fly, cable, isolation)
    const flyCable: Exercise = {
      ...cableFly,
      id: 'cable_fly_div',
      name: 'Standing Cable Fly',
      equipment: 'cable',
      exerciseType: 'isolation',
      muscleAreaEmphasis: ['mid_chest'],
    };

    const pool = [flat1, flat2, flat3, flat4, inclineDumbbell, flyCable];

    const reranked = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: pool,
      currentExercises: [],
      maxRecommendations: 4,
      enableDiversityReranking: true,
    });

    // Check that top 4 does NOT consist only of horizontal barbell presses
    const patterns = reranked.map((r) => r.movementPattern);
    const equipments = reranked.map((r) => r.exercise.equipment);

    assert(patterns.length === 4, '4 recommendations returned');
    assert(new Set(patterns).size >= 2, `Diversity reranking surfaced at least 2 distinct movement patterns (${Array.from(new Set(patterns)).join(', ')})`);
    assert(new Set(equipments).size >= 2, `Diversity reranking surfaced at least 2 distinct equipment types (${Array.from(new Set(equipments)).join(', ')})`);
  }

  // =========================================================================
  // TEST 11: Preserving relevant exercise consistency for progression tracking
  // =========================================================================
  console.log('\n--- Test 11: Preserving exercise consistency for progressive tracking ---');
  {
    // Test that an exercise actively improving or holding a PR is protected from excessive diversity penalty
    const improvingEx: ScoredRecommendation = {
      exercise: benchPress,
      score: 90,
      movementPattern: 'horizontal_push',
      explanation: {
        primary: 'Test',
        badges: ['Progression: Improving'],
        factors: {
          muscleMatch: true,
          goalAlignment: 'strength',
          equipmentCompatible: true,
          historyStatus: 'weekly_cadence',
          hasPerformanceHistory: true,
          performanceTrend: 'improving',
          movementPattern: 'horizontal_push',
          hasPR: true,
          isLimitedData: false,
        },
      },
    };

    const duplicateEx: ScoredRecommendation = {
      exercise: { ...benchPress, id: 'bench_dup', name: 'Barbell Bench Press Variant' },
      score: 90,
      movementPattern: 'horizontal_push',
      explanation: {
        primary: 'Test 2',
        badges: [],
        factors: {
          muscleMatch: true,
          goalAlignment: 'strength',
          equipmentCompatible: true,
          historyStatus: 'fresh_novelty',
          hasPerformanceHistory: false,
          performanceTrend: 'unknown',
          movementPattern: 'horizontal_push',
          hasPR: false,
          isLimitedData: true,
        },
      },
    };

    const reranked = applyDiversityReranking([improvingEx, duplicateEx], 2);
    assert(reranked[0].exercise.id === benchPress.id, 'Actively improving PR exercise preserved at top rank');
  }

  // =========================================================================
  // TEST 12: Missing movement-pattern or other optional metadata
  // =========================================================================
  console.log('\n--- Test 12: Missing movement-pattern or other optional metadata ---');
  {
    const mysteriousExercise: Exercise = {
      id: 'ex_mysterious',
      name: 'Unusual Dynamic Movement',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      muscleAreaEmphasis: [],
      equipment: 'other',
      exerciseType: 'compound',
      difficulty: 'beginner',
      instructions: [],
      imageUrl: '',
      tags: [],
      isCustom: false,
    };

    const pattern = getMovementPattern(mysteriousExercise);
    assert(typeof pattern === 'string', `Movement pattern returned valid string (${pattern})`);

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [mysteriousExercise],
      currentExercises: [],
    });

    assert(recs.length === 1, 'Exercise with minimal metadata processed without errors');
    assert(!isNaN(recs[0].score), 'Score is a valid number');
  }

  // =========================================================================
  // TEST 13: Correct, evidence-based explanation text
  // =========================================================================
  console.log('\n--- Test 13: Correct, evidence-based explanation text ---');
  {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    const session: WorkoutSession = {
      id: 'sess_exp',
      date: tenDaysAgo,
      dayOfWeek: 'thursday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1800,
      totalSets: 2,
      exercises: [
        {
          id: 'we_exp',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          sets: [{ id: 's1', setNumber: 1, weight: 82.5, reps: 6, completed: true }],
          notes: '',
        },
      ],
    };

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      userGoal: 'Strength & Power',
      allExercises: [benchPress],
      currentExercises: [],
      pastSessions: [session],
    });

    const exp = recs[0].explanation;
    assert(exp.primary.includes('82.5 kg'), 'Explanation mentions exact logged working weight (82.5 kg)');
    assert(exp.primary.includes('6 reps'), 'Explanation mentions exact logged reps (6 reps)');
    assert(exp.primary.includes('chest'), 'Explanation mentions target muscle (chest)');
  }

  // =========================================================================
  // TEST 14: Deterministic results for identical inputs
  // =========================================================================
  console.log('\n--- Test 14: Deterministic results for identical inputs ---');
  {
    const ctx = {
      targetMuscleGroup: 'chest' as const,
      userGoal: 'Strength & Power',
      allExercises: [benchPress, inclineDumbbellPress, cableFly],
      currentExercises: [],
      pastSessions: [],
    };

    const runA = getRecommendedExercises(ctx);
    const runB = getRecommendedExercises(ctx);

    assert(runA.length === runB.length, 'Output count matches');
    assert(
      runA.every((r, i) => r.exercise.id === runB[i].exercise.id && r.score === runB[i].score),
      'Output ordering, scores and IDs are 100% deterministic'
    );
  }

  // =========================================================================
  // TEST 15: No fabricated recovery or performance claims
  // =========================================================================
  console.log('\n--- Test 15: No fabricated recovery or performance claims ---');
  {
    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress],
      currentExercises: [],
      pastSessions: [],
    });

    const text = recs[0].explanation.primary.toLowerCase();
    assert(!text.includes('hrv') && !text.includes('soreness') && !text.includes('sleep') && !text.includes('readiness score'),
      'Zero biological claims (no HRV, soreness, sleep, or speculative readiness claims)'
    );
  }

  // =========================================================================
  // TEST 16: Safe behavior when workout history or personal records are empty
  // =========================================================================
  console.log('\n--- Test 16: Safe behavior when workout history or personal records are empty ---');
  {
    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress, cableFly],
      currentExercises: [],
      pastSessions: [],
      personalRecords: [],
    });

    assert(recs.length === 2, 'Returns valid recommendations with empty history');
    assert(
      recs.every((r) => r.explanation.factors.isLimitedData),
      'Explicitly flags isLimitedData: true for fresh user'
    );
    assert(
      recs.every((r) => r.explanation.badges.includes('First Time in Rotation')),
      'Fresh user recommendations carry "First Time in Rotation" badge'
    );
  }

  // =========================================================================
  // CUSTOM EXERCISE TEST SUITE (TESTS C1 - C7)
  // =========================================================================
  console.log('\n=== VERIFY FULL RECOMMENDATION SUPPORT FOR CUSTOM EXERCISES ===\n');

  const customExerciseFixture: Exercise = {
    id: 'custom_1700000000000_cst1',
    name: 'Custom Landmine Incline Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    muscleAreaEmphasis: ['upper_chest'],
    equipment: 'barbell',
    exerciseType: 'compound',
    difficulty: 'intermediate',
    instructions: ['Position barbell in landmine sleeve and press upward with one or both hands.'],
    imageUrl: '/exercises/flat-barbell-bench-press/0.jpg',
    tags: ['custom', 'chest'],
    isCustom: true,
  };

  // -------------------------------------------------------------------------
  // TEST C1: Custom exercise created, performed across multiple sessions,
  // and recommended again with full performance history
  // -------------------------------------------------------------------------
  console.log('--- Test C1: Custom exercise performed across sessions and recommended with history ---');
  {
    const session1Date = new Date(Date.now() - 14 * 86400000).toISOString();
    const session2Date = new Date(Date.now() - 7 * 86400000).toISOString();

    const session1: WorkoutSession = {
      id: 'sess_custom_1',
      date: session1Date,
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1200,
      totalSets: 2,
      exercises: [
        {
          id: 'we_cst_1',
          exerciseId: customExerciseFixture.id,
          exercise: customExerciseFixture,
          order: 1,
          sets: [{ id: 's1', setNumber: 1, weight: 60, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const session2: WorkoutSession = {
      id: 'sess_custom_2',
      date: session2Date,
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1400,
      totalSets: 2,
      exercises: [
        {
          id: 'we_cst_2',
          exerciseId: customExerciseFixture.id,
          exercise: customExerciseFixture,
          order: 1,
          sets: [{ id: 's2', setNumber: 1, weight: 65, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      userGoal: 'Muscle Building & Hypertrophy',
      allExercises: [benchPress, cableFly, customExerciseFixture],
      currentExercises: [],
      pastSessions: [session2, session1],
    });

    const customRec = recs.find((r) => r.exercise.id === customExerciseFixture.id);
    assert(customRec !== undefined, 'Custom exercise is recommended for target muscle group');
    assert(customRec!.score > 0, `Custom exercise received strong positive score: ${customRec!.score}`);
    assert(customRec!.explanation.badges.includes('Custom Exercise'), 'Custom exercise carries "Custom Exercise" badge');
    assert(customRec!.explanation.factors.hasPerformanceHistory === true, 'Performance history successfully tracked for custom exercise');
    assert(customRec!.explanation.factors.lastRecordedPerformance === '65 kg × 8 reps', 'Last recorded performance matches latest completed session');
    assert(customRec!.explanation.factors.performanceTrend === 'improving', 'Trend accurately calculated as improving from 60 kg to 65 kg');
    assert(customRec!.explanation.primary.includes('60 kg') && customRec!.explanation.primary.includes('65 kg'),
      'Explanation clearly references factual prior and current weights'
    );
  }

  // -------------------------------------------------------------------------
  // TEST C2: Custom exercise progression trends (improving, stable, declining, unknown single-baseline)
  // -------------------------------------------------------------------------
  console.log('\n--- Test C2: Custom exercise progression trends ---');
  {
    const dateOlder = new Date(Date.now() - 14 * 86400000).toISOString();
    const dateRecent = new Date(Date.now() - 7 * 86400000).toISOString();

    const makeCustomSession = (id: string, date: string, weight: number, reps: number): WorkoutSession => ({
      id,
      date,
      dayOfWeek: 'wednesday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: weight * reps,
      totalSets: 1,
      exercises: [
        {
          id: `we_${id}`,
          exerciseId: customExerciseFixture.id,
          exercise: customExerciseFixture,
          order: 1,
          sets: [{ id: `s_${id}`, setNumber: 1, weight, reps, completed: true }],
          notes: '',
        },
      ],
    });

    // 2a: Improving
    const improvingPerf = analyzePerformanceHistory(customExerciseFixture.id, [
      makeCustomSession('c_rec_imp', dateRecent, 70, 8),
      makeCustomSession('c_old_imp', dateOlder, 60, 8),
    ]);
    assert(improvingPerf.trend === 'improving', 'Custom exercise: improving trend correctly flagged');
    assert(improvingPerf.trendDeltaPercent !== null && improvingPerf.trendDeltaPercent > 0, 'Positive delta % computed');

    // 2b: Stable
    const stablePerf = analyzePerformanceHistory(customExerciseFixture.id, [
      makeCustomSession('c_rec_st', dateRecent, 60, 8),
      makeCustomSession('c_old_st', dateOlder, 60, 8),
    ]);
    assert(stablePerf.trend === 'stable', 'Custom exercise: stable trend correctly flagged');
    assert(stablePerf.trendDeltaPercent === 0, 'Delta is 0% for equal working weights');

    // 2c: Declining
    const decliningPerf = analyzePerformanceHistory(customExerciseFixture.id, [
      makeCustomSession('c_rec_dec', dateRecent, 50, 8),
      makeCustomSession('c_old_dec', dateOlder, 60, 8),
    ]);
    assert(decliningPerf.trend === 'declining', 'Custom exercise: declining trend correctly flagged');
    assert(decliningPerf.trendReason.includes('conservative load advised'), 'Advises caution on declining custom exercise');

    // 2d: Single session baseline
    const singlePerf = analyzePerformanceHistory(customExerciseFixture.id, [
      makeCustomSession('c_single', dateRecent, 60, 8),
    ]);
    assert(singlePerf.trend === 'unknown', 'Custom exercise: single session is unknown trend');
    assert(singlePerf.bestWeight === 60 && singlePerf.bestReps === 8, 'Captures single session baseline weight and reps');
    assert(!singlePerf.isLimitedData, 'isLimitedData is false when baseline performance exists');
  }

  // -------------------------------------------------------------------------
  // TEST C3: Missing / malformed metadata handling for custom exercises
  // -------------------------------------------------------------------------
  console.log('\n--- Test C3: Missing / malformed metadata handling for custom exercises ---');
  {
    // 3a: Custom exercise missing primaryMuscle or with invalid primaryMuscle
    const invalidMuscleCustom = {
      ...customExerciseFixture,
      id: 'custom_invalid_muscle_1',
      primaryMuscle: undefined as unknown as any,
    };
    const recsWithInvalid = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress, invalidMuscleCustom as Exercise],
      currentExercises: [],
    });
    assert(
      !recsWithInvalid.some((r) => r.exercise.id === 'custom_invalid_muscle_1'),
      'Custom exercise with missing primaryMuscle is safely excluded from recommendations'
    );

    // 3b: Custom exercise with equipment: 'other' or unspecified equipment
    const neutralEquipCustom: Exercise = {
      ...customExerciseFixture,
      id: 'custom_neutral_equip_1',
      equipment: 'other',
    };
    const homeGymRecs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      equipmentPreference: 'Home Gym (Free Weights)',
      allExercises: [neutralEquipCustom],
      currentExercises: [],
    });
    assert(homeGymRecs.length === 1, 'Custom exercise with "other" equipment remains eligible under Home Gym');
    assert(homeGymRecs[0].explanation.factors.equipmentCompatible === true, 'Equipment "other" is treated as neutral/compatible');

    // 3c: Custom exercise with missing secondaryMuscles, muscleAreaEmphasis, or instructions
    const sparseCustom: Exercise = {
      id: 'custom_sparse_1',
      name: 'Minimal Custom Movement',
      primaryMuscle: 'chest',
      secondaryMuscles: undefined as unknown as any,
      muscleAreaEmphasis: undefined as unknown as any,
      equipment: 'dumbbell',
      exerciseType: 'isolation',
      difficulty: 'beginner',
      instructions: undefined as unknown as any,
      imageUrl: '',
      tags: [],
      isCustom: true,
    };

    const sparseRecs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [sparseCustom],
      currentExercises: [],
    });
    assert(sparseRecs.length === 1, 'Sparse custom exercise processed safely without exceptions');
    assert(typeof sparseRecs[0].score === 'number', 'Calculated valid numeric score for sparse custom exercise');
  }

  // -------------------------------------------------------------------------
  // TEST C4: Duplicate prevention: custom exercise in active workout excluded
  // -------------------------------------------------------------------------
  console.log('\n--- Test C4: Duplicate prevention for custom exercise in active session ---');
  {
    const activeWorkoutExercise: WorkoutExercise = {
      id: 'active_we_1',
      exerciseId: customExerciseFixture.id,
      exercise: customExerciseFixture,
      order: 1,
      sets: [],
      notes: '',
    };

    const recs = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress, customExerciseFixture],
      currentExercises: [activeWorkoutExercise],
    });

    assert(
      !recs.some((r) => r.exercise.id === customExerciseFixture.id),
      'Custom exercise currently in active workout is excluded from recommendation list'
    );
  }

  // -------------------------------------------------------------------------
  // TEST C5: Editing a workout containing a custom exercise
  // -------------------------------------------------------------------------
  console.log('\n--- Test C5: Editing workout containing custom exercise does not contaminate history ---');
  {
    const editingSessionId = 'active_editing_session_cst';
    const pastCompletedDate = new Date(Date.now() - 10 * 86400000).toISOString();

    const pastSession: WorkoutSession = {
      id: 'past_cst_session',
      date: pastCompletedDate,
      dayOfWeek: 'friday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 600,
      totalSets: 1,
      exercises: [
        {
          id: 'we_past_cst',
          exerciseId: customExerciseFixture.id,
          exercise: customExerciseFixture,
          order: 1,
          sets: [{ id: 's_past', setNumber: 1, weight: 50, reps: 10, completed: true }],
          notes: '',
        },
      ],
    };

    const editingSession: WorkoutSession = {
      id: editingSessionId,
      date: new Date().toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 2000,
      totalSets: 1,
      exercises: [
        {
          id: 'we_editing_cst',
          exerciseId: customExerciseFixture.id,
          exercise: customExerciseFixture,
          order: 1,
          sets: [{ id: 's_edit', setNumber: 1, weight: 100, reps: 10, completed: true }],
          notes: '',
        },
      ],
    };

    const perf = analyzePerformanceHistory(
      customExerciseFixture.id,
      [editingSession, pastSession],
      undefined,
      editingSessionId
    );

    assert(perf.sessionCount === 1, 'Only the true past completed session is counted (count = 1)');
    assert(perf.bestWeight === 50, 'Performance reflects past completed session (50 kg), not editing session (100 kg)');
    assert(perf.trend === 'unknown', 'Trend is unknown baseline since only 1 past completed session exists');
  }

  // -------------------------------------------------------------------------
  // TEST C6: No accidental merging of two different custom exercises with same name
  // -------------------------------------------------------------------------
  console.log('\n--- Test C6: No accidental merging of different custom exercises with same/similar names ---');
  {
    const customPressA: Exercise = {
      id: 'custom_111_pressA',
      name: 'Custom Dumbbell Press',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['mid_chest'],
      equipment: 'dumbbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: ['custom'],
      isCustom: true,
    };

    const customPressB: Exercise = {
      id: 'custom_222_pressB',
      name: 'Custom Dumbbell Press', // Identical name, distinct ID
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['mid_chest'],
      equipment: 'dumbbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: ['custom'],
      isCustom: true,
    };

    const sessionA: WorkoutSession = {
      id: 'sess_userA',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 1000,
      totalSets: 1,
      exercises: [
        {
          id: 'we_A',
          exerciseId: customPressA.id,
          exercise: customPressA,
          order: 1,
          sets: [{ id: 'sA', setNumber: 1, weight: 32, reps: 8, completed: true }],
          notes: '',
        },
      ],
    };

    const sessionB: WorkoutSession = {
      id: 'sess_userB',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      dayOfWeek: 'wednesday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 500,
      totalSets: 1,
      exercises: [
        {
          id: 'we_B',
          exerciseId: customPressB.id,
          exercise: customPressB,
          order: 1,
          sets: [{ id: 'sB', setNumber: 1, weight: 16, reps: 12, completed: true }],
          notes: '',
        },
      ],
    };

    const perfA = analyzePerformanceHistory(customPressA.id, [sessionB, sessionA]);
    const perfB = analyzePerformanceHistory(customPressB.id, [sessionB, sessionA]);

    assert(perfA.bestWeight === 32, 'Custom Exercise A history strictly reflects 32 kg, never 16 kg');
    assert(perfA.sessionCount === 1, 'Custom Exercise A has exactly 1 session count');
    assert(perfB.bestWeight === 16, 'Custom Exercise B history strictly reflects 16 kg, never 32 kg');
    assert(perfB.sessionCount === 1, 'Custom Exercise B has exactly 1 session count');
  }

  // -------------------------------------------------------------------------
  // TEST C7: Custom exercise updated vs deleted
  // -------------------------------------------------------------------------
  console.log('\n--- Test C7: Custom exercise updated vs deleted ---');
  {
    const originalCustom: Exercise = {
      id: 'custom_persistent_id_999',
      name: 'Initial Name Custom Press',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      muscleAreaEmphasis: ['mid_chest'],
      equipment: 'dumbbell',
      exerciseType: 'compound',
      difficulty: 'intermediate',
      instructions: [],
      imageUrl: '',
      tags: ['custom'],
      isCustom: true,
    };

    const pastSession: WorkoutSession = {
      id: 'sess_hist_c7',
      date: new Date(Date.now() - 7 * 86400000).toISOString(),
      dayOfWeek: 'monday',
      muscleGroups: ['chest'],
      status: 'completed',
      totalVolume: 800,
      totalSets: 1,
      exercises: [
        {
          id: 'we_c7',
          exerciseId: originalCustom.id,
          exercise: originalCustom,
          order: 1,
          sets: [{ id: 's_c7', setNumber: 1, weight: 40, reps: 10, completed: true }],
          notes: '',
        },
      ],
    };

    // 7a: Updated custom exercise retains its ID and therefore inherits all past performance history
    const updatedCustom: Exercise = {
      ...originalCustom,
      name: 'Renamed Incline Dumbbell Squeeze Press',
      muscleAreaEmphasis: ['upper_chest'],
    };

    const recsAfterUpdate = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: [benchPress, updatedCustom],
      pastSessions: [pastSession],
      currentExercises: [],
    });

    const updatedRec = recsAfterUpdate.find((r) => r.exercise.id === originalCustom.id);
    assert(updatedRec !== undefined, 'Updated custom exercise is returned under new name');
    assert(updatedRec!.exercise.name === 'Renamed Incline Dumbbell Squeeze Press', 'Reflects updated name');
    assert(updatedRec!.explanation.factors.hasPerformanceHistory === true, 'Preserves historical performance linkage after update');
    assert(updatedRec!.explanation.factors.lastRecordedPerformance === '40 kg × 10 reps', 'Maintains 40 kg × 10 reps history');

    // 7b: Deleted custom exercise is omitted from library, therefore never recommended
    const libraryAfterDeletion = [benchPress, cableFly]; // custom exercise removed
    const recsAfterDeletion = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises: libraryAfterDeletion,
      pastSessions: [pastSession],
      currentExercises: [],
    });

    assert(
      !recsAfterDeletion.some((r) => r.exercise.id === originalCustom.id),
      'Deleted custom exercise is cleanly excluded from recommendations'
    );
  }

  console.log('\n🎉 ALL 16 PHASE 3 TESTS + 7 CUSTOM EXERCISE VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runPhase3Tests().catch((err) => {
  console.error('Test suite failed:', err);
  throw err;
});
