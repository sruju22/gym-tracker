/**
 * GymTrackie — Phase 6: Adaptive Weekly Coaching & Insights Test Suite
 *
 * Validates:
 * 1. Empty and insufficient history handling (graceful baselines, no division by zero).
 * 2. Planned versus completed strength sessions.
 * 3. Incomplete strength workouts exclusion (status === 'completed' strictly required).
 * 4. Upcoming sessions versus genuinely missed sessions versus rest days.
 * 5. Muscle coverage, recency, and future scheduled days (no false gaps for upcoming days).
 * 6. Cardio goal progress (partial completion, remaining duration, completion milestone).
 * 7. Week-over-week comparisons with and without previous baseline volume.
 * 8. Prioritized actionable steps capped at 3 items.
 * 9. Determinism and user data isolation.
 */

import {
  WorkoutSession,
  WeeklySchedule,
  DayOfWeek,
  CardioSession,
  CardioWeeklyGoalSettings,
  PersonalRecord,
} from '../../types';
import {
  deriveWeeklyCoaching,
  getCalendarWeekRange,
} from '../weeklyCoaching';

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

// Sample 4-day Upper/Lower Split
const testWeeklyPlan: WeeklySchedule = {
  monday: {
    name: 'Upper Body A',
    isRest: false,
    muscleGroups: [{ name: 'chest', displayName: 'Chest' }, { name: 'triceps', displayName: 'Triceps' }],
  },
  tuesday: {
    name: 'Rest Day',
    isRest: true,
    muscleGroups: [],
  },
  wednesday: {
    name: 'Lower Body A',
    isRest: false,
    muscleGroups: [{ name: 'legs', displayName: 'Legs' }, { name: 'calves', displayName: 'Calves' }],
  },
  thursday: {
    name: 'Rest Day',
    isRest: true,
    muscleGroups: [],
  },
  friday: {
    name: 'Upper Body B',
    isRest: false,
    muscleGroups: [{ name: 'back', displayName: 'Back' }, { name: 'biceps', displayName: 'Biceps' }],
  },
  saturday: {
    name: 'Lower Body B',
    isRest: false,
    muscleGroups: [{ name: 'legs', displayName: 'Legs' }, { name: 'core', displayName: 'Core' }],
  },
  sunday: {
    name: 'Rest Day',
    isRest: true,
    muscleGroups: [],
  },
};

async function runTests() {
  console.log('\n=== GYMTRACKIE PHASE 6: ADAPTIVE WEEKLY COACHING TESTS ===\n');

  // Use a fixed reference date: Wednesday, Oct 21, 2026 at 14:00 UTC
  // Week spans Monday Oct 19 to Sunday Oct 25, 2026
  const refDate = new Date('2026-10-21T14:00:00Z');

  // ==========================================
  // Test 1: Empty and Insufficient History
  // ==========================================
  console.log('--- Test 1: Empty and Insufficient History ---');
  {
    const emptyResult = deriveWeeklyCoaching({
      userId: 'test_user_empty',
      history: [],
      cardioSessions: [],
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate,
    });

    assertEqual(emptyResult.hasSufficientData, false, 'hasSufficientData is false for new user');
    assertEqual(emptyResult.overview.completedStrengthDays, 0, 'completedStrengthDays is 0');
    assertEqual(emptyResult.overview.totalStrengthVolumeKg, 0, 'totalStrengthVolumeKg is 0');
    assertEqual(emptyResult.overview.strengthAdherencePercent, 0, 'strengthAdherencePercent is 0%');
    assertEqual(emptyResult.overview.weekOverWeek.hasBaseline, false, 'hasBaseline is false');
    assertEqual(emptyResult.overview.weekOverWeek.volumeDeltaPercent, null, 'volumeDeltaPercent is null (no NaN)');

    // Actionable recommendation must guide user to complete their first session
    assert(emptyResult.actionableSteps.length > 0, 'Produces baseline action step');
    assertEqual(emptyResult.actionableSteps[0].category, 'schedule_adherence', 'First step is schedule adherence');
    assert(
      emptyResult.actionableSteps[0].title.includes('First') || emptyResult.actionableSteps[0].title.includes('Catch Up'),
      'Guides user to start training'
    );
  }

  // ==========================================
  // Test 2: Incomplete Strength Sessions Excluded
  // ==========================================
  console.log('--- Test 2: Incomplete Strength Sessions Excluded ---');
  {
    const mixedSessions: WorkoutSession[] = [
      {
        id: 's_completed_mon',
        date: '2026-10-19T10:00:00Z', // Monday
        completedAt: '2026-10-19T11:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        workoutName: 'Upper Body A',
        muscleGroups: ['chest', 'triceps'],
        totalVolume: 5000,
        totalSets: 15,
        exercises: [],
      },
      {
        id: 's_in_progress_wed',
        date: '2026-10-21T13:00:00Z', // Wednesday
        dayOfWeek: 'wednesday',
        status: 'in_progress', // Incomplete!
        workoutName: 'Lower Body A',
        muscleGroups: ['legs'],
        totalVolume: 8000, // Should be ignored
        totalSets: 10,
        exercises: [],
      },
    ];

    const result = deriveWeeklyCoaching({
      userId: 'test_user_mixed',
      history: mixedSessions,
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate,
    });

    assertEqual(result.overview.completedStrengthDays, 1, 'Only 1 completed strength day counted');
    assertEqual(result.overview.completedStrengthWorkouts, 1, 'Only 1 completed workout counted');
    assertEqual(result.overview.totalStrengthVolumeKg, 5000, 'Volume strictly 5000 kg (in_progress excluded)');
    assertEqual(result.overview.totalStrengthSets, 15, 'Sets strictly 15 (in_progress excluded)');
    // 1 completed out of 4 planned = 25%
    assertEqual(result.overview.strengthAdherencePercent, 25, 'Adherence is 25%');
  }

  // ==========================================
  // Test 3: Upcoming vs Missed vs Rest Days (Date-Aware Audit)
  // ==========================================
  console.log('--- Test 3: Upcoming vs Missed vs Rest Days ---');
  {
    // No workout logged on Monday (Oct 19). Today is Wednesday (Oct 21).
    const auditResult = deriveWeeklyCoaching({
      userId: 'test_user_schedule',
      history: [],
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate, // Wednesday
    });

    const audit = auditResult.scheduleAudit;
    assertEqual(audit.length, 7, 'Audit evaluates all 7 days of the week');

    // Monday (Oct 19) was planned strength, no session logged -> MISSED
    assertEqual(audit[0].day, 'monday', 'Day 0 is Monday');
    assertEqual(audit[0].status, 'missed', 'Monday without workout is marked missed');

    // Tuesday (Oct 20) was rest -> REST
    assertEqual(audit[1].day, 'tuesday', 'Day 1 is Tuesday');
    assertEqual(audit[1].status, 'rest', 'Tuesday is marked rest');

    // Wednesday (Oct 21) is today -> TODAY
    assertEqual(audit[2].day, 'wednesday', 'Day 2 is Wednesday (today)');
    assertEqual(audit[2].status, 'today', 'Wednesday is marked today');

    // Thursday (Oct 22) is rest -> REST
    assertEqual(audit[3].day, 'thursday', 'Day 3 is Thursday');
    assertEqual(audit[3].status, 'rest', 'Thursday is marked rest');

    // Friday (Oct 23) is planned Upper Body B -> UPCOMING
    assertEqual(audit[4].day, 'friday', 'Day 4 is Friday');
    assertEqual(audit[4].status, 'upcoming', 'Friday is marked upcoming');

    // Saturday (Oct 24) is planned Lower Body B -> UPCOMING
    assertEqual(audit[5].day, 'saturday', 'Day 5 is Saturday');
    assertEqual(audit[5].status, 'upcoming', 'Saturday is marked upcoming');

    // Sunday (Oct 25) is rest -> REST
    assertEqual(audit[6].day, 'sunday', 'Day 6 is Sunday');
    assertEqual(audit[6].status, 'rest', 'Sunday is marked rest');

    // Action step generated for missed Monday
    const missedStep = auditResult.actionableSteps.find((s) => s.id.includes('missed_monday'));
    assert(Boolean(missedStep), 'Action step produced for missed Monday workout');
    assertEqual(missedStep?.priority, 'high', 'Missed workout carries high priority');
  }

  // ==========================================
  // Test 4: Muscle Coverage and Recency (Upcoming in split is NOT a gap)
  // ==========================================
  console.log('--- Test 4: Muscle Coverage and Recency ---');
  {
    // Back and Biceps are scheduled for Friday (Upper Body B).
    // User trained Chest and Triceps on Monday (Oct 19).
    const sessions: WorkoutSession[] = [
      {
        id: 's_monday',
        date: '2026-10-19T10:00:00Z',
        completedAt: '2026-10-19T11:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        workoutName: 'Upper Body A',
        muscleGroups: ['chest', 'triceps'],
        totalVolume: 4000,
        totalSets: 12,
        exercises: [],
      },
    ];

    const result = deriveWeeklyCoaching({
      userId: 'test_coverage',
      history: sessions,
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate, // Wednesday (2 days after Monday)
    });

    const backCoverage = result.muscleCoverage.find((m) => m.muscleGroup === 'back');
    assert(Boolean(backCoverage), 'Back coverage evaluated');
    assertEqual(backCoverage?.isScheduledInSplit, true, 'Back is scheduled in split');
    // Crucial rule: Back is scheduled for Friday, so it is upcoming_scheduled, NOT needs_attention!
    assertEqual(backCoverage?.status, 'upcoming_scheduled', 'Back is upcoming_scheduled (not a false gap)');
    assertEqual(backCoverage?.nextScheduledDay, 'friday', 'Next scheduled day for back is friday');

    // Chest was trained 2 days ago
    const chestCoverage = result.muscleCoverage.find((m) => m.muscleGroup === 'chest');
    assertEqual(chestCoverage?.daysSinceLastTrained, 2, 'Chest trained 2 days ago');
    assertEqual(chestCoverage?.status, 'recently_trained', 'Chest marked recently_trained');
  }

  // ==========================================
  // Test 5: Cardio Goals & Weekly Progress
  // ==========================================
  console.log('--- Test 5: Cardio Goals & Weekly Progress ---');
  {
    const cardioGoals: CardioWeeklyGoalSettings = {
      durationMinutes: { enabled: true, target: 120 },
      distance: { enabled: true, target: 15, unit: 'km' },
      sessions: { enabled: true, target: 3 },
    };

    const cardioSessions: CardioSession[] = [
      {
        id: 'c_1',
        activityType: 'running',
        date: '2026-10-20T08:00:00Z', // Tuesday (in week)
        durationMinutes: 45,
        distance: 6.0,
        distanceUnit: 'km',
        syncedToBackend: true,
      },
      {
        id: 'c_2',
        activityType: 'cycling',
        date: '2026-10-21T07:30:00Z', // Wednesday (in week)
        durationMinutes: 35,
        distance: 12.0,
        distanceUnit: 'km',
        syncedToBackend: true,
      },
    ];

    const result = deriveWeeklyCoaching({
      userId: 'test_cardio_user',
      history: [],
      cardioSessions,
      weeklyPlan: testWeeklyPlan,
      cardioGoals,
      referenceDate: refDate,
    });

    const ov = result.overview;
    assertEqual(ov.cardioSessionsCount, 2, '2 cardio sessions recorded this week');
    assertEqual(ov.cardioDurationMinutes, 80, '80 minutes cardio duration logged');
    assertEqual(ov.cardioDurationFormatted, '1h 20m', 'Formatted as 1h 20m');
    assertEqual(ov.cardioDistanceKm, 18, '18 km total distance');

    // Cardio goal progress
    assert(Boolean(ov.cardioGoalsSummary), 'Cardio goals summary populated');
    assertEqual(ov.cardioGoalsSummary?.durationRemainingMinutes, 40, '40 minutes remaining to 120m target');
    assertEqual(ov.cardioGoalsSummary?.durationProgressPercent, 67, '67% duration goal achieved');

    // Action step generated for cardio target
    const cardioStep = result.actionableSteps.find((s) => s.category === 'cardio_goal');
    assert(Boolean(cardioStep), 'Cardio goal actionable step generated');
    assert(
      Boolean(cardioStep?.title.includes('40m') || cardioStep?.rationale.includes('40m')),
      'Reflects 40m remaining'
    );
  }

  // ==========================================
  // Test 6: Week-Over-Week Comparisons & Milestone Surfacing
  // ==========================================
  console.log('--- Test 6: Week-Over-Week Comparisons ---');
  {
    const historyWithPrevWeek: WorkoutSession[] = [
      // Previous week: Oct 12–18
      {
        id: 's_prev_1',
        date: '2026-10-14T10:00:00Z',
        completedAt: '2026-10-14T11:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        workoutName: 'Upper Body A',
        muscleGroups: ['chest', 'triceps'],
        totalVolume: 10000,
        totalSets: 20,
        exercises: [],
      },
      // Current week: Oct 19–25
      {
        id: 's_cur_1',
        date: '2026-10-19T10:00:00Z',
        completedAt: '2026-10-19T11:00:00Z',
        dayOfWeek: 'monday',
        status: 'completed',
        workoutName: 'Upper Body A',
        muscleGroups: ['chest', 'triceps'],
        totalVolume: 12500,
        totalSets: 22,
        exercises: [],
      },
    ];

    const prs: PersonalRecord[] = [
      {
        id: 'pr_bench',
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        type: 'max_weight',
        value: 100,
        weight: 100,
        reps: 5,
        estimated1RM: 112.5,
        date: '2026-10-19T10:30:00Z', // In current week!
      },
    ];

    const result = deriveWeeklyCoaching({
      userId: 'test_wow_user',
      history: historyWithPrevWeek,
      weeklyPlan: testWeeklyPlan,
      personalRecords: prs,
      referenceDate: refDate,
    });

    const wow = result.overview.weekOverWeek;
    assertEqual(wow.hasBaseline, true, 'hasBaseline is true');
    assertEqual(wow.volumeDeltaKg, 2500, 'Volume delta is +2,500 kg');
    assertEqual(wow.volumeDeltaPercent, 25, 'Volume delta percent is +25%');

    // PR achievement surfaced as top achievement
    assert(Boolean(result.overview.topAchievement), 'Top achievement populated');
    assertEqual(result.overview.topAchievement?.badge, 'PR Achievement', 'Badge is PR Achievement');
    assert(
      Boolean(result.overview.topAchievement?.title.includes('Barbell Bench Press')),
      'Cites PR exercise'
    );
  }

  // ==========================================
  // Test 7: Capped Action Steps & Priority Ordering
  // ==========================================
  console.log('--- Test 7: Capped Action Steps & Priority Ordering ---');
  {
    const result = deriveWeeklyCoaching({
      userId: 'test_cap_user',
      history: [],
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate,
    });

    assert(result.actionableSteps.length <= 3, 'Actionable steps never exceed 3');
    // Check that priorities are ordered high to low
    const priorityScore: Record<string, number> = { high: 3, medium: 2, low: 1 };
    for (let i = 0; i < result.actionableSteps.length - 1; i++) {
      const pCurrent = priorityScore[result.actionableSteps[i].priority];
      const pNext = priorityScore[result.actionableSteps[i + 1].priority];
      assert(pCurrent >= pNext, 'Steps are strictly sorted by priority (high >= medium >= low)');
    }
  }

  // ==========================================
  // Test 8: Determinism
  // ==========================================
  console.log('--- Test 8: Determinism ---');
  {
    const run1 = deriveWeeklyCoaching({
      userId: 'det_user',
      history: [],
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate,
    });
    const run2 = deriveWeeklyCoaching({
      userId: 'det_user',
      history: [],
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate,
    });

    assertEqual(JSON.stringify(run1), JSON.stringify(run2), 'Coaching engine output is 100% deterministic');
  }

  // ==========================================
  // Test 9: Trained Today Suppresses Urgent "Start Workout" for Missed Sessions
  // ==========================================
  console.log('--- Test 9: Trained Today Suppresses Urgent "Start Workout" ---');
  {
    // Monday missed. User logged Wednesday workout today (Oct 21).
    const wedSession: WorkoutSession = {
      id: 's_wed',
      date: '2026-10-21T10:00:00Z',
      completedAt: '2026-10-21T11:00:00Z',
      dayOfWeek: 'wednesday',
      status: 'completed',
      workoutName: 'Lower Body A',
      muscleGroups: ['legs'],
      totalVolume: 5000,
      totalSets: 12,
      exercises: [],
    };

    const result = deriveWeeklyCoaching({
      userId: 'test_trained_today',
      history: [wedSession],
      weeklyPlan: testWeeklyPlan,
      referenceDate: refDate, // Wednesday
    });

    const missedStep = result.actionableSteps.find((s) => s.id.includes('missed_monday'));
    assert(Boolean(missedStep), 'Action step produced for missed Monday');
    assertEqual(missedStep?.priority, 'low', 'When trained today, missed session carries low priority (not high)');
    assertEqual(missedStep?.actionLabel, 'Review Split', 'Action label is Review Split (not Start Workout)');
    assert(Boolean(missedStep?.title.includes('Next Session: Pick Up Missed')), 'Title frames catch-up for next session');
  }

  // ==========================================
  // Test 10: Forward-Looking Target for PR Under Active Recovery
  // ==========================================
  console.log('--- Test 10: Forward-Looking Target for PR Under Active Recovery ---');
  {
    // User completed Lat Pulldown 3 hours ago with a PR
    const latPulldownEx = {
      id: 'ex_lat_pulldown',
      name: 'Wide-Grip Lat Pulldown',
      equipment: 'cable',
      primaryMuscle: 'back',
      primarySubArea: 'lats',
    };

    const sessionPrior: WorkoutSession = {
      id: 's_lat_prior',
      date: '2026-10-14T09:00:00Z',
      completedAt: '2026-10-14T10:00:00Z',
      dayOfWeek: 'wednesday',
      status: 'completed',
      workoutName: 'Back & Biceps',
      muscleGroups: ['back', 'biceps'],
      totalVolume: 3500,
      totalSets: 10,
      exercises: [
        {
          id: 'wex_0',
          exerciseId: 'ex_lat_pulldown',
          exercise: latPulldownEx as any,
          order: 0,
          notes: '',
          sets: [
            { id: 'set_0_1', setNumber: 1, weight: 45, reps: 10, completed: true },
            { id: 'set_0_2', setNumber: 2, weight: 45, reps: 10, completed: true },
            { id: 'set_0_3', setNumber: 3, weight: 45, reps: 10, completed: true },
          ],
        },
      ],
    };

    const sessionToday: WorkoutSession = {
      id: 's_lat_pr',
      date: '2026-10-21T09:00:00Z',
      completedAt: '2026-10-21T10:00:00Z',
      dayOfWeek: 'wednesday',
      status: 'completed',
      workoutName: 'Back & Biceps',
      muscleGroups: ['back', 'biceps'],
      totalVolume: 4000,
      totalSets: 10,
      exercises: [
        {
          id: 'wex_1',
          exerciseId: 'ex_lat_pulldown',
          exercise: latPulldownEx as any,
          order: 0,
          notes: '',
          sets: [
            { id: 'set_1', setNumber: 1, weight: 50, reps: 10, completed: true },
            { id: 'set_2', setNumber: 2, weight: 50, reps: 10, completed: true },
            { id: 'set_3', setNumber: 3, weight: 50, reps: 10, completed: true },
          ],
        },
      ],
    };

    const prRecord: PersonalRecord = {
      id: 'pr_lat',
      exerciseId: 'ex_lat_pulldown',
      exerciseName: 'Wide-Grip Lat Pulldown',
      type: 'max_reps',
      prCategory: 'max_reps',
      value: 10,
      weight: 50,
      reps: 10,
      estimated1RM: 66.7,
      date: '2026-10-21T10:00:00Z',
    };

    const result = deriveWeeklyCoaching({
      userId: 'test_pr_recovery',
      history: [sessionPrior, sessionToday],
      weeklyPlan: testWeeklyPlan,
      personalRecords: [prRecord],
      exercises: [latPulldownEx as any],
      referenceDate: new Date('2026-10-21T13:00:00Z'), // 3h after workout
    });

    const prStep = result.actionableSteps.find((s) => s.category === 'progressive_overload');
    assert(Boolean(prStep), 'Progressive overload step generated');
    assert(Boolean(prStep?.title.startsWith('Next Session Target:')), 'Title frames target for next session');
    assert(
      !prStep?.title.includes('Recovery Window: Hold Working Load'),
      'Does not show intimidating recovery window hold warning on Home'
    );
    assert(Boolean(prStep?.rationale.includes('active recovery window')), 'Mentions active recovery context');
    assert(Boolean(prStep?.rationale.includes('next scheduled session')), 'Prescribes targets for next session');
    assertEqual(prStep?.actionLabel, 'View Progression', 'Action label is View Progression');
  }

  console.log('\n=== ALL PHASE 6 WEEKLY COACHING TESTS PASSED SUCCESSFULLY ===\n');
}

runTests().catch((err) => {
  console.error('\nTest failure:', err);
  process.exit(1);
});
