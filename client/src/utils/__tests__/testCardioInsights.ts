/**
 * GymTrackie — Phase 5.4: Cardio Session Insights Test Suite
 *
 * Validates:
 * 1. No sessions and insufficient history handling (graceful empty states).
 * 2. Improving, declining, and unchanged trends (duration, distance, average session).
 * 3. Comparable versus incompatible activity types (compatible pace comparison; never compare running to cycling).
 * 4. Missing distance and heart-rate measurements (never fabricated or treated as zero).
 * 5. Mixed distance units (miles to km normalization handled correctly).
 * 6. Invalid dates and zero-value comparison baselines (no NaN or division by zero).
 * 7. New milestones and duplicate records (deduplication, PR achievement surfacing).
 * 8. Consistency changes between comparable periods (frequency, active days, weekly goals).
 */

import { CardioSession, CardioWeeklyGoalSettings } from '../../types';
import {
  deriveCardioInsights,
  PersonalizedCardioInsight,
} from '../cardioInsights';

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

async function runTests() {
  console.log('\n=== GYMTRACKIE PHASE 5.4: CARDIO SESSION INSIGHTS TESTS ===\n');

  const refDate = new Date('2026-10-23T12:00:00Z');

  // ==========================================
  // Test 1: Empty Sessions & Insufficient History
  // ==========================================
  console.log('--- Test 1: Empty sessions & insufficient history ---');
  {
    const emptyResult = deriveCardioInsights([], { referenceDate: refDate });
    assertEqual(emptyResult.insights.length, 0, 'Empty sessions array produces 0 insights');
    assertEqual(emptyResult.hasSufficientData, false, 'hasSufficientData is false for empty history');
    assertEqual(emptyResult.totalSessionsAnalyzed, 0, 'totalSessionsAnalyzed is 0');
    assertEqual(emptyResult.periodSummary.currentSessions, 0, 'currentSessions is 0');
    assertEqual(emptyResult.periodSummary.currentDurationFormatted, '0m', 'currentDurationFormatted is 0m');

    // 1 single session in history (current period has session, previous has 0)
    const singleSession: CardioSession[] = [
      {
        id: 'session_1',
        activityType: 'running',
        date: '2026-10-20T08:00:00Z',
        durationMinutes: 30,
        distance: 5,
        distanceUnit: 'km',
      },
    ];

    const singleResult = deriveCardioInsights(singleSession, {
      timeRange: '7d',
      referenceDate: refDate,
    });
    assertEqual(singleResult.hasSufficientData, true, 'hasSufficientData is true with 1 active session');
    assertEqual(singleResult.totalSessionsAnalyzed, 1, '1 session analyzed');

    const baselineInsight = singleResult.insights.find((i) => i.id === 'trend-baseline-established');
    assert(Boolean(baselineInsight), 'Baseline established insight generated for first session');
    assertEqual(baselineInsight?.tone, 'neutral', 'Baseline insight has neutral tone');
    assertEqual(baselineInsight?.title, 'Initial Cardio Baseline', 'Baseline insight title is correct');
    assert(baselineInsight!.description.includes('30m across 1 session'), 'Baseline cites exact duration and session count');
    console.log('  ✅ Empty history and single-session baseline handled gracefully');
  }

  // ==========================================
  // Test 2: Improving, Declining, and Stable Trends
  // ==========================================
  console.log('\n--- Test 2: Improving, declining, and stable duration trends ---');
  {
    // Improving volume (+50% duration: 90m vs 60m)
    const improvingSessions: CardioSession[] = [
      // Current 7d period (Oct 17 - Oct 23)
      { id: 'c1', activityType: 'running', date: '2026-10-22T08:00:00Z', durationMinutes: 45, distance: 7, distanceUnit: 'km' },
      { id: 'c2', activityType: 'running', date: '2026-10-20T08:00:00Z', durationMinutes: 45, distance: 7, distanceUnit: 'km' },
      // Previous 7d period (Oct 10 - Oct 16)
      { id: 'p1', activityType: 'running', date: '2026-10-15T08:00:00Z', durationMinutes: 30, distance: 5, distanceUnit: 'km' },
      { id: 'p2', activityType: 'running', date: '2026-10-12T08:00:00Z', durationMinutes: 30, distance: 5, distanceUnit: 'km' },
    ];

    const impResult = deriveCardioInsights(improvingSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    const progInsight = impResult.insights.find((i) => i.id === 'trend-duration-progression');
    assert(Boolean(progInsight), 'Duration progression insight generated for +50% volume');
    assertEqual(progInsight?.tone, 'positive', 'Progression insight has positive tone');
    assert(progInsight!.description.includes('+50%'), 'Accurately reports +50% duration growth');
    assertEqual(progInsight?.metricChange?.isImprovement, true, 'Flagged as improvement');

    // Declining volume (-50% duration: 30m vs 60m)
    const decliningSessions: CardioSession[] = [
      // Current: 30m
      { id: 'c1', activityType: 'running', date: '2026-10-21T08:00:00Z', durationMinutes: 30, distance: 5, distanceUnit: 'km' },
      // Previous: 60m
      { id: 'p1', activityType: 'running', date: '2026-10-14T08:00:00Z', durationMinutes: 60, distance: 10, distanceUnit: 'km' },
    ];

    const decResult = deriveCardioInsights(decliningSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });
    const decInsight = decResult.insights.find((i) => i.id === 'trend-duration-adjustment');
    assert(Boolean(decInsight), 'Duration adjustment insight generated for -50% shift');
    assert(decInsight!.description.includes('-50%'), 'Accurately reports -50% shift');
    assertEqual(decInsight?.tone, 'neutral', 'Adjustment insight is informative and neutral');

    // Stable volume (within ±5%: 60m vs 60m)
    const stableSessions: CardioSession[] = [
      { id: 'c1', activityType: 'cycling', date: '2026-10-21T08:00:00Z', durationMinutes: 60, distance: 20, distanceUnit: 'km' },
      { id: 'p1', activityType: 'cycling', date: '2026-10-14T08:00:00Z', durationMinutes: 60, distance: 20, distanceUnit: 'km' },
    ];

    const stableResult = deriveCardioInsights(stableSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });
    const stableInsight = stableResult.insights.find((i) => i.id === 'trend-duration-steady');
    assert(Boolean(stableInsight), 'Stable volume insight generated for ±0% change');
    assert(stableInsight!.description.includes('within ±5%'), 'Explains volume is consistent within ±5%');
    console.log('  ✅ Improving, declining, and stable duration trends correctly identified');
  }

  // ==========================================
  // Test 3: Compatible vs Incompatible Activity Types
  // ==========================================
  console.log('\n--- Test 3: Compatible vs incompatible activity pace comparison ---');
  {
    // Incompatible: User ran in current period, but CYCLED in previous period!
    // NEVER compare running pace to cycling pace!
    const crossActivitySessions: CardioSession[] = [
      // Current: Running 5km in 25m = 5:00/km
      { id: 'c1', activityType: 'running', date: '2026-10-22T08:00:00Z', durationMinutes: 25, distance: 5, distanceUnit: 'km' },
      // Previous: Cycling 20km in 40m = 2:00/km
      { id: 'p1', activityType: 'cycling', date: '2026-10-15T08:00:00Z', durationMinutes: 40, distance: 20, distanceUnit: 'km' },
    ];

    const crossResult = deriveCardioInsights(crossActivitySessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    const crossPaceInsight = crossResult.insights.find((i) => i.id.startsWith('trend-pace-'));
    assertEqual(crossPaceInsight, undefined, 'No cross-activity pace comparison generated (running vs cycling)');

    // Compatible: Running in BOTH current and previous period!
    // Current: 5km in 25m (5:00 /km)
    // Previous: 5km in 30m (6:00 /km)
    // Improvement: 1:00 min/km = 60s/km faster!
    const compatibleRunningSessions: CardioSession[] = [
      { id: 'c1', activityType: 'running', date: '2026-10-22T08:00:00Z', durationMinutes: 25, distance: 5, distanceUnit: 'km' },
      { id: 'p1', activityType: 'running', date: '2026-10-15T08:00:00Z', durationMinutes: 30, distance: 5, distanceUnit: 'km' },
    ];

    const compatResult = deriveCardioInsights(compatibleRunningSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    const runningPaceInsight = compatResult.insights.find((i) => i.id === 'trend-pace-running-faster');
    assert(Boolean(runningPaceInsight), 'Running pace improvement insight generated');
    assertEqual(runningPaceInsight?.tone, 'positive', 'Pace improvement is positive');
    assert(runningPaceInsight!.description.includes('60s/km faster'), 'Accurately calculates 60s/km faster pace');
    assert(runningPaceInsight!.description.includes('5:00 /km'), 'Cites current pace 5:00 /km');
    console.log('  ✅ Compatible activity pace compared safely, incompatible activities strictly segregated');
  }

  // ==========================================
  // Test 4: Missing Distance and Heart-Rate Measurements
  // ==========================================
  console.log('\n--- Test 4: Missing distance and heart-rate handling ---');
  {
    // Sessions with duration but NO distance and NO heart rate
    const missingMeasurements: CardioSession[] = [
      {
        id: 'c1',
        activityType: 'stair_climber',
        date: '2026-10-21T08:00:00Z',
        durationMinutes: 30,
        distance: null, // missing distance
        averageHeartRate: null, // missing HR
      },
      {
        id: 'p1',
        activityType: 'stair_climber',
        date: '2026-10-14T08:00:00Z',
        durationMinutes: 25,
        distance: undefined,
        averageHeartRate: undefined,
      },
    ];

    const missingResult = deriveCardioInsights(missingMeasurements, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    // Duration trend should work fine
    const durProg = missingResult.insights.find((i) => i.id === 'trend-duration-progression');
    assert(Boolean(durProg), 'Duration progression generated without distance');

    // Distance and pace insights must NOT be fabricated
    const distProg = missingResult.insights.find((i) => i.id.startsWith('trend-distance-'));
    assertEqual(distProg, undefined, 'No distance trend generated when distance is null/undefined');

    const paceProg = missingResult.insights.find((i) => i.id.startsWith('trend-pace-'));
    assertEqual(paceProg, undefined, 'No pace comparison generated when distance is missing');

    assertEqual(missingResult.periodSummary.currentDistanceFormatted, '—', 'Missing distance formatted as "—"');
    console.log('  ✅ Missing distance and heart rate safely omitted without fabricating zero values');
  }

  // ==========================================
  // Test 5: Mixed Distance Units (Miles vs Kilometers)
  // ==========================================
  console.log('\n--- Test 5: Mixed distance units normalization ---');
  {
    // Current period: 10 miles (~16.09 km)
    // Previous period: 10 km (10.0 km)
    // 16.09 km vs 10.0 km is an increase (+6.09 km, +61%)
    const mixedUnitSessions: CardioSession[] = [
      {
        id: 'c1',
        activityType: 'cycling',
        date: '2026-10-21T08:00:00Z',
        durationMinutes: 45,
        distance: 10,
        distanceUnit: 'mi', // logged in miles!
      },
      {
        id: 'p1',
        activityType: 'cycling',
        date: '2026-10-14T08:00:00Z',
        durationMinutes: 45,
        distance: 10,
        distanceUnit: 'km', // logged in km!
      },
    ];

    const mixedResult = deriveCardioInsights(mixedUnitSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    const distProg = mixedResult.insights.find((i) => i.id === 'trend-distance-progression');
    assert(Boolean(distProg), 'Distance expansion detected despite mixed units');
    assert(distProg!.description.includes('+61%'), 'Calculates +61% based on normalized km (16.1 km vs 10.0 km)');
    console.log('  ✅ Mixed units normalized accurately for comparison');
  }

  // ==========================================
  // Test 6: Invalid Dates and Zero-Value Baselines
  // ==========================================
  console.log('\n--- Test 6: Invalid dates and zero-value baseline safety ---');
  {
    const invalidDateSessions: CardioSession[] = [
      {
        id: 'inv_1',
        activityType: 'running',
        date: 'not-a-valid-date-string',
        durationMinutes: 30,
        distance: 5,
        distanceUnit: 'km',
      },
      {
        id: 'inv_2',
        activityType: 'running',
        date: '',
        durationMinutes: 45,
        distance: 7,
        distanceUnit: 'km',
      },
      {
        id: 'valid_1',
        activityType: 'running',
        date: '2026-10-21T08:00:00Z',
        durationMinutes: 30,
        distance: 5,
        distanceUnit: 'km',
      },
    ];

    const invalidResult = deriveCardioInsights(invalidDateSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    assertEqual(invalidResult.totalSessionsAnalyzed, 1, 'Invalid dates safely skipped (only 1 valid analyzed)');
    assertEqual(invalidResult.periodSummary.currentSessions, 1, 'Only 1 valid session counted');

    // Check no NaN or infinite values in insights
    invalidResult.insights.forEach((ins) => {
      assert(!ins.description.includes('NaN'), `Insight ${ins.id} contains no NaN`);
      assert(!ins.description.includes('Infinity'), `Insight ${ins.id} contains no Infinity`);
    });
    console.log('  ✅ Invalid dates skipped cleanly, zero baselines contain no NaN or Infinity');
  }

  // ==========================================
  // Test 7: New Milestones and Duplicate Records
  // ==========================================
  console.log('\n--- Test 7: New milestones and duplicate records ---');
  {
    // Multiple duplicate sessions by canonical id or clientSessionId
    const duplicateMilestoneSessions: CardioSession[] = [
      {
        id: 'run_pr_1',
        clientSessionId: 'cs_pr_1',
        activityType: 'running',
        date: '2026-10-22T08:00:00Z',
        durationMinutes: 75, // 75 mins = > 60 min endurance milestone + longest duration PR!
        distance: 15,
        distanceUnit: 'km',
      },
      {
        id: 'run_pr_1', // duplicate by ID
        clientSessionId: 'cs_pr_1',
        activityType: 'running',
        date: '2026-10-22T08:00:00Z',
        durationMinutes: 75,
        distance: 15,
        distanceUnit: 'km',
      },
    ];

    const milResult = deriveCardioInsights(duplicateMilestoneSessions, {
      timeRange: '7d',
      referenceDate: refDate,
    });

    assertEqual(milResult.totalSessionsAnalyzed, 1, 'Deduplicated 2 identical entries to 1 session');

    // Milestone insight for PR
    const prMilestone = milResult.insights.find((i) => i.category === 'milestone');
    assert(Boolean(prMilestone), 'Milestone insight surfaced');
    assertEqual(prMilestone?.tone, 'celebration', 'Milestone has celebration tone');
    assert(prMilestone!.description.includes('75m') || prMilestone!.description.includes('15 km'), 'Mentions PR metric');
    console.log('  ✅ Deduplication works and personal record milestones are surfaced');
  }

  // ==========================================
  // Test 8: Consistency Changes & Weekly Goals Integration
  // ==========================================
  console.log('\n--- Test 8: Consistency changes and weekly goal alignment ---');
  {
    const weeklyGoals: CardioWeeklyGoalSettings = {
      durationMinutes: { enabled: true, target: 60 },
      distance: { enabled: true, target: 10, unit: 'km' },
      sessions: { enabled: true, target: 2 },
    };

    // User achieved 2 sessions, 70m, 12km (exceeds all weekly targets!)
    const goalSessions: CardioSession[] = [
      { id: 'g1', activityType: 'running', date: '2026-10-20T08:00:00Z', durationMinutes: 35, distance: 6, distanceUnit: 'km' },
      { id: 'g2', activityType: 'running', date: '2026-10-22T08:00:00Z', durationMinutes: 35, distance: 6, distanceUnit: 'km' },
      // Prior week: 1 session
      { id: 'p1', activityType: 'running', date: '2026-10-14T08:00:00Z', durationMinutes: 30, distance: 5, distanceUnit: 'km' },
    ];

    const goalResult = deriveCardioInsights(goalSessions, {
      timeRange: '7d',
      referenceDate: refDate,
      weeklyGoals,
    });

    // Consistency: frequency increase (+1 session)
    const freqInsight = goalResult.insights.find((i) => i.id === 'consistency-frequency-increase');
    assert(Boolean(freqInsight), 'Session frequency rise insight generated');
    assert(freqInsight!.description.includes('+1 more'), 'Accurately cites +1 more session');

    // Consistency: goal completion
    const goalInsight = goalResult.insights.find((i) => i.id === 'consistency-goals-completed');
    assert(Boolean(goalInsight), 'Weekly targets achieved insight generated');
    assertEqual(goalInsight?.tone, 'celebration', 'Celebrates 100% goals completed');

    // Conservative recommendation generated
    const recInsight = goalResult.insights.find((i) => i.category === 'recommendation');
    assert(Boolean(recInsight), 'Actionable recommendation generated');
    assert(Boolean(recInsight?.actionableTip), 'Includes actionable tip');
    console.log('  ✅ Consistency progression, weekly goal alignment, and conservative recommendations validated');
  }

  console.log('\n🎉 ALL 8 PHASE 5.4 CARDIO SESSION INSIGHTS TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
