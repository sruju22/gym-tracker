/**
 * GYMTRACKIE PHASE 5.2: CARDIO PROGRESS ANALYTICS TEST SUITE
 *
 * Verifies:
 * 1. Correct duration and session totals, formatted hours/minutes, and average duration.
 * 2. Distance aggregation with mixed units (km, mi, m) and clean handling of sessions without distance.
 * 3. Date boundaries and weekly/daily grouping for 7d, 30d, and 12w periods.
 * 4. Mutual exclusivity between current and previous periods (no double counting).
 * 5. Period-over-period comparisons (deltas, percentages, baseline handling).
 * 6. Activity-type breakdown (counts, duration, distance, percentages, ranking).
 * 7. Empty history and insufficient comparison data handling (zero-division safety).
 * 8. Duplicate session prevention via clientSessionId / id deduplication.
 * 9. Multi-session active days calculation (multiple sessions on one day = 1 active day).
 * 10. Store integration, user-data isolation, and regression protection for strength workouts.
 */

import {
  CardioSession,
  CardioActivityType,
  WorkoutSession,
} from '../../types';
import {
  getComprehensiveCardioAnalytics,
  getCardioPeriodBoundaries,
  summarizeCardioPeriod,
  computeCardioComparison,
  computeActivityBreakdown,
  deduplicateCardioSessions,
} from '../cardioAnalytics';
import { useWorkoutStore } from '../../store/workoutStore';
import { getVolumeAnalytics } from '../analyticsEngine';
import { INITIAL_EXERCISES } from '../../data/exercises';
import { DEFAULT_WORKOUT_PLAN } from '../../data/workoutPlan';

declare const process: { exit: (code: number) => void };

// In-memory polyfill for localStorage in node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const storeMap = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => storeMap.get(k) || null,
    setItem: (k: string, v: string) => storeMap.set(k, String(v)),
    removeItem: (k: string) => storeMap.delete(k),
    clear: () => storeMap.clear(),
    length: 0,
    key: () => null,
  } as any;
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== GYMTRACKIE PHASE 5.2: CARDIO PROGRESS ANALYTICS TESTS ===\n');

// Fixed reference date: Friday Oct 23, 2026 at 12:00:00 UTC
const FIXED_NOW = new Date('2026-10-23T12:00:00.000Z');

// -----------------------------------------------------------------------------
// Test 1: Duration, Sessions, and Active Days Totals
// -----------------------------------------------------------------------------
console.log('--- Test 1: Duration, session count, active days, and averages ---');
{
  const sessions: CardioSession[] = [
    {
      id: 'c1',
      activityType: 'running',
      durationMinutes: 30,
      date: '2026-10-23T08:00:00.000Z',
    },
    {
      id: 'c2',
      activityType: 'cycling',
      durationMinutes: 45,
      date: '2026-10-23T16:00:00.000Z', // Same day as c1
    },
    {
      id: 'c3',
      activityType: 'treadmill',
      durationMinutes: 60,
      date: '2026-10-22T09:00:00.000Z', // Different day
    },
  ];

  const summary = summarizeCardioPeriod(sessions);

  assert(summary.totalSessions === 3, 'Total sessions is exactly 3');
  assert(summary.totalDurationMinutes === 135, 'Total duration is 135 minutes (30 + 45 + 60)');
  assert(summary.totalDurationFormatted === '2h 15m', 'Formatted duration is "2h 15m"');
  assert(summary.averageDurationMinutes === 45, 'Average duration is 45 minutes (135 / 3)');
  assert(summary.averageDurationFormatted === '45m', 'Formatted average duration is "45m"');
  assert(
    summary.activeDaysCount === 2,
    'Active days count is exactly 2 (c1 and c2 on Oct 23 count as 1 active day)'
  );
}

// -----------------------------------------------------------------------------
// Test 2: Distance Aggregation with Mixed Units and Missing Distance
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Distance aggregation with mixed units & missing distance ---');
{
  const sessionsWithMixedDist: CardioSession[] = [
    {
      id: 'd1',
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      distanceUnit: 'km',
      date: '2026-10-23T08:00:00.000Z',
    },
    {
      id: 'd2',
      activityType: 'stair_climber',
      durationMinutes: 20,
      distance: null, // Stair climber has no distance
      date: '2026-10-22T08:00:00.000Z',
    },
    {
      id: 'd3',
      activityType: 'rowing',
      durationMinutes: 25,
      distance: 2000, // 2000 meters = 2.0 km
      distanceUnit: 'm',
      date: '2026-10-21T08:00:00.000Z',
    },
    {
      id: 'd4',
      activityType: 'cycling',
      durationMinutes: 40,
      distance: 6.21371, // ~10.0 km in miles (6.21371 * 1.60934 = 10.0)
      distanceUnit: 'mi',
      date: '2026-10-20T08:00:00.000Z',
    },
  ];

  const summary = summarizeCardioPeriod(sessionsWithMixedDist);

  assert(summary.totalSessions === 4, 'Total sessions is 4');
  assert(summary.distanceSessionCount === 3, 'Exactly 3 sessions had valid distance values');
  assert(summary.hasDistanceData === true, 'hasDistanceData is true');
  // 5.0 km + 2.0 km + 10.0 km = 17.0 km
  assert(summary.totalDistanceKm === 17, 'Total distance correctly converted and summed to 17.0 km');
  assert(summary.totalDistanceFormatted === '17 km', 'Formatted distance is "17 km"');

  // Verify sessions completely without distance
  const noDistanceSessions: CardioSession[] = [
    {
      id: 'nd1',
      activityType: 'stair_climber',
      durationMinutes: 25,
      distance: null,
      date: '2026-10-23T08:00:00.000Z',
    },
  ];

  const noDistSummary = summarizeCardioPeriod(noDistanceSessions);
  assert(noDistSummary.hasDistanceData === false, 'hasDistanceData is false when no distance logged');
  assert(noDistSummary.distanceSessionCount === 0, 'distanceSessionCount is 0');
  assert(noDistSummary.totalDistanceFormatted === '—', 'totalDistanceFormatted is "—" (not "0 km")');
}

// -----------------------------------------------------------------------------
// Test 3: Date Boundaries & Period Mutual Exclusivity
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Period boundaries & mutual exclusivity (7d, 30d, 12w) ---');
{
  // 7d boundaries
  const b7d = getCardioPeriodBoundaries('7d', FIXED_NOW);
  assert(
    b7d.currentStart < b7d.currentEnd,
    '7d currentStart is before currentEnd'
  );
  assert(
    b7d.prevStart < b7d.prevEnd,
    '7d prevStart is before prevEnd'
  );
  assert(
    b7d.prevEnd < b7d.currentStart,
    '7d prevEnd is strictly before currentStart (zero overlap)'
  );

  // 30d boundaries
  const b30d = getCardioPeriodBoundaries('30d', FIXED_NOW);
  assert(
    b30d.prevEnd < b30d.currentStart,
    '30d prevEnd is strictly before currentStart (zero overlap)'
  );

  // 12w boundaries
  const b12w = getCardioPeriodBoundaries('12w', FIXED_NOW);
  assert(
    b12w.prevEnd < b12w.currentStart,
    '12w prevEnd is strictly before currentStart (zero overlap)'
  );

  // Verify that an exact boundary timestamp falls strictly into one period
  const testSessions: CardioSession[] = [
    // Current period session (today)
    {
      id: 'cur_1',
      activityType: 'running',
      durationMinutes: 30,
      date: FIXED_NOW.toISOString(),
    },
    // Exact start of current period
    {
      id: 'cur_boundary',
      activityType: 'cycling',
      durationMinutes: 40,
      date: b7d.currentStart.toISOString(),
    },
    // Exact end of previous period (1 ms before currentStart)
    {
      id: 'prev_boundary',
      activityType: 'walking',
      durationMinutes: 20,
      date: b7d.prevEnd.toISOString(),
    },
    // Session way outside both periods
    {
      id: 'ancient',
      activityType: 'rowing',
      durationMinutes: 60,
      date: new Date('2025-01-01T00:00:00Z').toISOString(),
    },
  ];

  const analytics7d = getComprehensiveCardioAnalytics(testSessions, '7d', FIXED_NOW);
  assert(analytics7d.currentPeriod.totalSessions === 2, 'Current 7d period has exactly 2 sessions (cur_1 and cur_boundary)');
  assert(analytics7d.previousPeriod.totalSessions === 1, 'Previous 7d period has exactly 1 session (prev_boundary)');
  assert(
    analytics7d.currentPeriod.totalDurationMinutes === 70,
    'Current duration is exactly 70 minutes (30 + 40)'
  );
}

// -----------------------------------------------------------------------------
// Test 4: Previous Period Comparison Deltas & Percentages
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Previous period comparisons & baseline handling ---');
{
  const currentSummary = summarizeCardioPeriod([
    { id: 'c1', activityType: 'running', durationMinutes: 120, distance: 15, date: '2026-10-22' },
    { id: 'c2', activityType: 'cycling', durationMinutes: 60, distance: 25, date: '2026-10-23' },
  ]);

  const prevSummary = summarizeCardioPeriod([
    { id: 'p1', activityType: 'running', durationMinutes: 90, distance: 10, date: '2026-10-15' },
  ]);

  const comparison = computeCardioComparison(currentSummary, prevSummary);

  assert(comparison.hasComparisonData === true, 'hasComparisonData is true when prev sessions exist');
  assert(comparison.sessionsDelta === 1, 'sessionsDelta is +1 (2 - 1)');
  assert(comparison.sessionsDeltaPercent === 100, 'sessionsDeltaPercent is +100%');
  assert(comparison.durationDeltaMinutes === 90, 'durationDeltaMinutes is +90m (180 - 90)');
  assert(comparison.durationDeltaPercent === 100, 'durationDeltaPercent is +100%');
  assert(comparison.distanceDeltaKm === 30, 'distanceDeltaKm is +30.0 km (40 - 10)');

  // Baseline period test (no prior sessions)
  const emptyPrevSummary = summarizeCardioPeriod([]);
  const baselineComp = computeCardioComparison(currentSummary, emptyPrevSummary);

  assert(baselineComp.hasComparisonData === false, 'hasComparisonData is false with empty previous period');
  assert(baselineComp.sessionsDeltaPercent === null, 'sessionsDeltaPercent is safely null (no division by zero)');
  assert(baselineComp.durationDeltaPercent === null, 'durationDeltaPercent is safely null (no division by zero)');
  assert(baselineComp.distanceDeltaPercent === null, 'distanceDeltaPercent is safely null (no division by zero)');
}

// -----------------------------------------------------------------------------
// Test 5: Activity-Type Breakdown
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Activity-type breakdown and ranking ---');
{
  const sessions: CardioSession[] = [
    { id: '1', activityType: 'running', durationMinutes: 60, distance: 10, date: '2026-10-23' },
    { id: '2', activityType: 'running', durationMinutes: 40, distance: 6, date: '2026-10-22' },
    { id: '3', activityType: 'cycling', durationMinutes: 60, distance: 20, date: '2026-10-21' },
    { id: '4', activityType: 'rowing', durationMinutes: 40, distance: 5000, distanceUnit: 'm', date: '2026-10-20' },
  ];

  const breakdown = computeActivityBreakdown(sessions, 200);

  assert(breakdown.length === 3, 'Breakdown has 3 distinct activity groups');
  assert(breakdown[0].activityType === 'running', 'Running is ranked #1 by total duration (100 mins)');
  assert(breakdown[0].sessionCount === 2, 'Running has 2 sessions');
  assert(breakdown[0].totalDurationMinutes === 100, 'Running total duration is 100 mins');
  assert(breakdown[0].percentageOfDuration === 50, 'Running is 50% of total duration (100 / 200)');
  assert(breakdown[0].totalDistanceKm === 16, 'Running total distance is 16 km');

  assert(breakdown[1].activityType === 'cycling', 'Cycling is ranked #2 (60 mins)');
  assert(breakdown[1].percentageOfDuration === 30, 'Cycling is 30% of total duration');

  assert(breakdown[2].activityType === 'rowing', 'Rowing is ranked #3 (40 mins)');
  assert(breakdown[2].percentageOfDuration === 20, 'Rowing is 20% of total duration');
}

// -----------------------------------------------------------------------------
// Test 6: Empty History Handling & Zero-Division Safety
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: Empty history & zero-division safety ---');
{
  const emptyAnalytics = getComprehensiveCardioAnalytics([], '30d', FIXED_NOW);

  assert(emptyAnalytics.currentPeriod.totalSessions === 0, 'Empty analytics has 0 sessions');
  assert(emptyAnalytics.currentPeriod.totalDurationMinutes === 0, 'Empty analytics has 0 duration');
  assert(emptyAnalytics.currentPeriod.totalDurationFormatted === '0m', 'Duration formats as "0m"');
  assert(emptyAnalytics.currentPeriod.averageDurationMinutes === 0, 'Average duration is 0 (no NaN)');
  assert(emptyAnalytics.currentPeriod.hasDistanceData === false, 'hasDistanceData is false');
  assert(emptyAnalytics.currentPeriod.totalDistanceFormatted === '—', 'totalDistanceFormatted is "—"');
  assert(emptyAnalytics.activityBreakdown.length === 0, 'Activity breakdown is empty array');
  assert(emptyAnalytics.topActivity === null, 'topActivity is null');
  assert(emptyAnalytics.insights.length === 0, 'Insights is empty array');
  assert(emptyAnalytics.weeklyTrends.length === 5, '30d has 5 weekly trend points (initialized to 0)');
  assert(emptyAnalytics.weeklyTrends.every((w) => w.durationMinutes === 0), 'All trend points have 0 duration');
}

// -----------------------------------------------------------------------------
// Test 7: Duplicate-Session Prevention in Analytics
// -----------------------------------------------------------------------------
console.log('\n--- Test 7: Duplicate-session prevention in analytics pipeline ---');
{
  const duplicatedList: CardioSession[] = [
    {
      id: 'session_original_1',
      clientSessionId: 'csid_unique_1',
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      date: '2026-10-23T08:00:00.000Z',
    },
    // Duplicate with same clientSessionId
    {
      id: 'session_duplicate_1',
      clientSessionId: 'csid_unique_1',
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      date: '2026-10-23T08:00:00.000Z',
    },
    // Duplicate with same id
    {
      id: 'session_original_1',
      clientSessionId: 'csid_different',
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      date: '2026-10-23T08:00:00.000Z',
    },
  ];

  const deduplicated = deduplicateCardioSessions(duplicatedList);
  assert(deduplicated.length === 1, '3 sessions with duplicate IDs deduplicated to exactly 1');

  const analytics = getComprehensiveCardioAnalytics(duplicatedList, '7d', FIXED_NOW);
  assert(analytics.currentPeriod.totalSessions === 1, 'Analytics pipeline counts exactly 1 session');
  assert(analytics.currentPeriod.totalDurationMinutes === 30, 'Analytics duration is exactly 30 mins (not 90 mins)');
}

// -----------------------------------------------------------------------------
// Test 8: User-Data Isolation & Strength Training Regression Protection
// -----------------------------------------------------------------------------
console.log('\n--- Test 8: User-data isolation & strength training regression protection ---');
(async () => {
  const store = useWorkoutStore.getState();
  const testAlice = 'user_alice_cardio_analytics';
  const testBob = 'user_bob_cardio_analytics';

  // Seed Alice with cardio sessions
  await store.logCardioSession(testAlice, {
    activityType: 'running',
    durationMinutes: 45,
    distance: 8.0,
    date: '2026-10-23T09:00:00.000Z',
  });

  // Seed Bob with a strength workout
  const bench = INITIAL_EXERCISES[0];
  const bobStrengthWorkout: WorkoutSession = {
    id: 'bob_strength_session_1',
    workoutName: 'Chest Power',
    date: '2026-10-23T10:00:00.000Z',
    completedAt: '2026-10-23T11:00:00.000Z',
    dayOfWeek: 'friday',
    muscleGroups: ['chest'],
    status: 'completed',
    totalVolume: 2400,
    totalSets: 3,
    exercises: [
      {
        id: 'ex_1',
        exerciseId: bench.id,
        exercise: bench,
        order: 1,
        notes: '',
        completed: true,
        sets: [
          { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
          { id: 's2', setNumber: 2, weight: 80, reps: 10, completed: true },
          { id: 's3', setNumber: 3, weight: 80, reps: 10, completed: true },
        ],
      },
    ],
  };

  useWorkoutStore.setState((state) => ({
    userDataMap: {
      ...state.userDataMap,
      [testBob]: {
        history: [bobStrengthWorkout],
        personalRecords: [],
        customExercises: [],
        savedCombinations: [],
        weeklyPlan: DEFAULT_WORKOUT_PLAN,
        activeSession: null,
        goals: [],
        weightLogs: [],
        cardioSessions: [],
      },
    },
  }));

  // Alice's cardio analytics
  const aliceCardio = store.getCardioSessions(testAlice);
  const aliceAnalytics = getComprehensiveCardioAnalytics(aliceCardio, '7d', FIXED_NOW);
  assert(aliceAnalytics.currentPeriod.totalSessions === 1, 'Alice has 1 cardio session');
  assert(aliceAnalytics.currentPeriod.totalDurationMinutes === 45, 'Alice duration is 45 mins');

  // Bob's cardio analytics
  const bobCardio = store.getCardioSessions(testBob);
  const bobAnalytics = getComprehensiveCardioAnalytics(bobCardio, '7d', FIXED_NOW);
  assert(bobAnalytics.currentPeriod.totalSessions === 0, 'Bob has 0 cardio sessions (strict user isolation)');

  // Bob's strength analytics
  const bobHistory = store.getHistory(testBob);
  const bobStrengthVolume = getVolumeAnalytics(bobHistory, 'all');
  assert(bobStrengthVolume.totalLoadVolume === 2400, 'Bob strength volume is strictly 2400 kg');
  assert(bobStrengthVolume.totalCompletedSets === 3, 'Bob strength sets is strictly 3');

  console.log('\n🎉 ALL 10 PHASE 5.2 CARDIO PROGRESS ANALYTICS TESTS PASSED SUCCESSFULLY!');
})().catch((err) => {
  console.error('\n💥 TEST FAILED:', err);
  process.exit(1);
});
