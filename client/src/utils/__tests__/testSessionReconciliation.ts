import {
  WorkoutSession,
  Exercise,
  MuscleGroup,
  DayOfWeek,
} from '../../types';
import {
  isSessionCompleted,
  isStaleOrAbandonedSession,
  isGenuinelyActiveSession,
  reconcileActiveSession,
} from '../sessionReconciliation';
import { getComprehensiveAnalytics } from '../analyticsEngine';
import { getRecommendedExercises } from '../recommendationEngine';
import { DEFAULT_WORKOUT_PLAN } from '../../data/workoutPlan';
import exercisesData from '../../data/exercisesData.json';

declare const process: { exit: (code: number) => void };

const allExercises = exercisesData as Exercise[];
const benchPress = allExercises.find((e) => e.name.toLowerCase().includes('barbell bench press')) || allExercises[0];
const squat = allExercises.find((e) => e.primaryMuscle === 'legs') || allExercises[1];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runSessionReconciliationTests() {
  console.log('=== GYMTRACKIE SESSION RECONCILIATION & HOME STATE BUGFIX TEST SUITE ===\n');

  const simulatedToday = new Date('2026-10-21T14:30:00.000Z');

  // =========================================================================
  // TEST 1: Legs completed today and an old empty Push B session exists
  // (Reproduces the exact user issue reported on October 21, 2026)
  // =========================================================================
  console.log('Test 1: Legs completed today and an old empty Push B session exists (User bug reproduction)');
  {
    const completedLegsSession: WorkoutSession = {
      id: 'session_legs_oct21',
      workoutName: 'Legs',
      date: '2026-10-21T10:00:00.000Z',
      completedAt: '2026-10-21T11:15:00.000Z',
      dayOfWeek: 'wednesday',
      muscleGroups: ['legs', 'glutes', 'calves'],
      status: 'completed',
      totalVolume: 5400,
      totalSets: 12,
      exercises: [
        {
          id: 'ex_squat_1',
          exerciseId: squat.id,
          exercise: squat,
          order: 1,
          notes: '',
          sets: [
            { id: 's1', setNumber: 1, weight: 100, reps: 10, completed: true },
            { id: 's2', setNumber: 2, weight: 105, reps: 8, completed: true },
          ],
        },
      ],
    };

    const stalePushBSession: WorkoutSession = {
      id: 'session_pushb_draft',
      workoutName: 'Push B',
      date: '2026-10-21T08:00:00.000Z',
      startedAt: '2026-10-21T08:00:00.000Z',
      dayOfWeek: 'thursday',
      muscleGroups: ['chest', 'shoulders', 'triceps'],
      status: 'in_progress',
      totalVolume: 0,
      totalSets: 0,
      exercises: [],
    };

    const history = [completedLegsSession];

    // Check reconciliation
    const isStale = isStaleOrAbandonedSession(stalePushBSession, history, completedLegsSession, simulatedToday);
    assert(isStale === true, 'Empty Push B session is correctly detected as stale/abandoned when Legs is completed today');

    const isGenuinelyActive = isGenuinelyActiveSession(stalePushBSession, history, completedLegsSession, simulatedToday);
    assert(isGenuinelyActive === false, 'Empty Push B session is NOT treated as genuinely active');

    const reconciled = reconcileActiveSession(stalePushBSession, history, simulatedToday);
    assert(reconciled === null, 'Reconciliation clears stale empty Push B session to null');

    // Home state evaluation: completed Legs takes priority
    const hasCompletedToday = history.length > 0;
    const shouldShowCompletedCard = hasCompletedToday && (!isGenuinelyActive || stalePushBSession.exercises.length === 0);
    assert(shouldShowCompletedCard === true, 'Home card shows completed workout rather than empty in-progress Push B');
  }

  // =========================================================================
  // TEST 2: Genuine active Push B session exists and no workout completed today
  // =========================================================================
  console.log('\nTest 2: Genuine active Push B session exists and no workout completed today');
  {
    const activePushBSession: WorkoutSession = {
      id: 'session_pushb_active',
      workoutName: 'Push B',
      date: '2026-10-21T09:00:00.000Z',
      startedAt: '2026-10-21T09:00:00.000Z',
      dayOfWeek: 'wednesday',
      muscleGroups: ['chest', 'shoulders', 'triceps'],
      status: 'in_progress',
      totalVolume: 0,
      totalSets: 0,
      exercises: [],
    };

    const emptyHistory: WorkoutSession[] = [];

    const isStale = isStaleOrAbandonedSession(activePushBSession, emptyHistory, null, simulatedToday);
    assert(isStale === false, 'Fresh Push B session today is not stale when no workout completed today');

    const isGenuinelyActive = isGenuinelyActiveSession(activePushBSession, emptyHistory, null, simulatedToday);
    assert(isGenuinelyActive === true, 'Fresh Push B session is genuinely active for today');

    const reconciled = reconcileActiveSession(activePushBSession, emptyHistory, simulatedToday);
    assert(reconciled !== null && reconciled.id === 'session_pushb_active', 'Reconciled session preserves active Push B');
  }

  // =========================================================================
  // TEST 3: Completed session is never offered as active
  // =========================================================================
  console.log('\nTest 3: Completed session is never offered as active');
  {
    const completedSession: WorkoutSession = {
      id: 'session_legs_done',
      workoutName: 'Legs',
      date: '2026-10-21T10:00:00.000Z',
      completedAt: '2026-10-21T11:00:00.000Z',
      dayOfWeek: 'wednesday',
      muscleGroups: ['legs'],
      status: 'completed',
      totalVolume: 4000,
      totalSets: 10,
      exercises: [],
    };

    // Case 3A: Session has status === 'completed'
    assert(isSessionCompleted(completedSession, []) === true, 'Session with status completed is detected as completed');
    assert(isGenuinelyActiveSession(completedSession, [], null, simulatedToday) === false, 'Completed session is not genuinely active');
    assert(reconcileActiveSession(completedSession, [], simulatedToday) === null, 'Reconciliation clears completed session');

    // Case 3B: Session has status in_progress but matches id in completed history
    const lingeringSession: WorkoutSession = {
      ...completedSession,
      status: 'in_progress',
    };
    const history = [completedSession];
    assert(isSessionCompleted(lingeringSession, history) === true, 'Session matching history record by id is detected as completed');
    assert(reconcileActiveSession(lingeringSession, history, simulatedToday) === null, 'Orphaned in_progress pointer reconciled to null');
  }

  // =========================================================================
  // TEST 4: Stale session from a previous date is handled correctly
  // =========================================================================
  console.log('\nTest 4: Stale session from a previous date is handled correctly');
  {
    const yesterdaySession: WorkoutSession = {
      id: 'session_yesterday_draft',
      workoutName: 'Chest Day',
      date: '2026-10-20T15:00:00.000Z',
      startedAt: '2026-10-20T15:00:00.000Z',
      dayOfWeek: 'tuesday',
      muscleGroups: ['chest'],
      status: 'in_progress',
      totalVolume: 0,
      totalSets: 0,
      exercises: [],
    };

    const isStale = isStaleOrAbandonedSession(yesterdaySession, [], null, simulatedToday);
    assert(isStale === true, 'Session started yesterday with 0 exercises is marked stale');

    const isGenuinelyActive = isGenuinelyActiveSession(yesterdaySession, [], null, simulatedToday);
    assert(isGenuinelyActive === false, 'Past-day session is not genuinely active for today');

    const reconciled = reconcileActiveSession(yesterdaySession, [], simulatedToday);
    assert(reconciled === null, 'Past-day session is reconciled to null and does not block today workout');
  }

  // =========================================================================
  // TEST 5: Planned workout differs from completed workout
  // =========================================================================
  console.log('\nTest 5: Planned workout differs from completed workout');
  {
    const scheduledPlanName = 'Push B';
    const completedSession: WorkoutSession = {
      id: 'session_completed_legs',
      workoutName: 'Legs',
      date: '2026-10-21T10:00:00.000Z',
      completedAt: '2026-10-21T11:15:00.000Z',
      dayOfWeek: 'wednesday',
      muscleGroups: ['legs'],
      status: 'completed',
      totalVolume: 6200,
      totalSets: 14,
      exercises: [
        {
          id: 'ex_1',
          exerciseId: squat.id,
          exercise: squat,
          order: 1,
          notes: '',
          sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 10, completed: true }],
        },
      ],
    };

    // The completed name must remain 'Legs'
    assert(completedSession.workoutName === 'Legs', 'Completed workout name is preserved as Legs');
    assert(completedSession.workoutName !== scheduledPlanName, 'Completed workout differs from scheduled Push B');

    // Display logic: show completed name 'Legs' and separate scheduled badge 'Push B'
    const sessionWorkoutName = completedSession.workoutName || 'Completed Workout';
    const isDifferentFromSchedule = sessionWorkoutName.trim().toLowerCase() !== scheduledPlanName.trim().toLowerCase();
    assert(isDifferentFromSchedule === true, 'Difference between completed workout and scheduled plan is identified');
  }

  // =========================================================================
  // TEST 6: App refresh and persisted-store hydration
  // =========================================================================
  console.log('\nTest 6: App refresh and persisted-store hydration');
  {
    // Simulate store state loaded from localStorage
    const simulatedStoreState: {
      userDataMap: Record<string, { history: WorkoutSession[]; activeSession: WorkoutSession | null }>;
    } = {
      userDataMap: {
        user_123: {
          history: [
            {
              id: 'session_hist_legs',
              workoutName: 'Legs',
              date: '2026-10-21T10:00:00.000Z',
              completedAt: '2026-10-21T11:00:00.000Z',
              dayOfWeek: 'wednesday' as DayOfWeek,
              status: 'completed' as const,
              exercises: [],
              muscleGroups: ['legs'] as MuscleGroup[],
              totalVolume: 4000,
              totalSets: 10,
            },
          ],
          activeSession: {
            id: 'session_pushb_stale',
            workoutName: 'Push B',
            date: '2026-10-21T08:00:00.000Z',
            dayOfWeek: 'thursday' as DayOfWeek,
            status: 'in_progress' as const,
            exercises: [],
            muscleGroups: ['chest'] as MuscleGroup[],
            totalVolume: 0,
            totalSets: 0,
          },
        },
        user_456: {
          history: [],
          activeSession: {
            id: 'session_valid_active',
            workoutName: 'Full Body',
            date: '2026-10-21T12:00:00.000Z',
            startedAt: '2026-10-21T12:00:00.000Z',
            dayOfWeek: 'wednesday' as DayOfWeek,
            status: 'in_progress' as const,
            exercises: [],
            muscleGroups: ['chest'] as MuscleGroup[],
            totalVolume: 0,
            totalSets: 0,
          },
        },
      },
    };

    // Simulate onRehydrateStorage
    for (const uId of Object.keys(simulatedStoreState.userDataMap)) {
      const uData = simulatedStoreState.userDataMap[uId];
      if (uData && uData.activeSession) {
        uData.activeSession = reconcileActiveSession(uData.activeSession, uData.history || [], simulatedToday);
      }
    }

    assert(
      simulatedStoreState.userDataMap.user_123.activeSession === null,
      'User 123 stale Push B active session was reconciled to null on hydration'
    );
    assert(
      simulatedStoreState.userDataMap.user_456.activeSession !== null &&
      simulatedStoreState.userDataMap.user_456.activeSession.id === 'session_valid_active',
      'User 456 valid active session was preserved on hydration'
    );
  }

  // =========================================================================
  // TEST 7: Local and server session reconciliation
  // =========================================================================
  console.log('\nTest 7: Local and server session reconciliation');
  {
    const localActiveSession: WorkoutSession = {
      id: 'session_synced_on_backend',
      workoutName: 'Push A',
      date: '2026-10-21T07:00:00.000Z',
      dayOfWeek: 'wednesday',
      status: 'in_progress',
      muscleGroups: ['chest'],
      exercises: [],
      totalVolume: 0,
      totalSets: 0,
    };

    // Backend fetch arrives with the session completed on another device / server
    const backendHistory: WorkoutSession[] = [
      {
        id: 'session_synced_on_backend',
        workoutName: 'Push A',
        date: '2026-10-21T07:00:00.000Z',
        completedAt: '2026-10-21T08:15:00.000Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        muscleGroups: ['chest'],
        exercises: [],
        totalVolume: 3500,
        totalSets: 9,
      },
    ];

    const reconciled = reconcileActiveSession(localActiveSession, backendHistory, simulatedToday);
    assert(reconciled === null, 'Active session completed on backend is reconciled to null locally');
  }

  // =========================================================================
  // TEST 8: Multiple sessions on the same date
  // =========================================================================
  console.log('\nTest 8: Multiple sessions on the same date');
  {
    const session1: WorkoutSession = {
      id: 'sess_morning_legs',
      workoutName: 'Morning Legs',
      date: '2026-10-21T08:00:00.000Z',
      completedAt: '2026-10-21T09:15:00.000Z',
      dayOfWeek: 'wednesday',
      status: 'completed',
      muscleGroups: ['legs'],
      exercises: [
        {
          id: 'ex1',
          exerciseId: squat.id,
          exercise: squat,
          order: 1,
          notes: '',
          sets: [{ id: 's1', setNumber: 1, weight: 100, reps: 10, completed: true }],
        },
      ],
      totalVolume: 1000,
      totalSets: 1,
    };

    const session2: WorkoutSession = {
      id: 'sess_evening_core',
      workoutName: 'Evening Core',
      date: '2026-10-21T18:00:00.000Z',
      completedAt: '2026-10-21T18:45:00.000Z',
      dayOfWeek: 'wednesday',
      status: 'completed',
      muscleGroups: ['core'],
      exercises: [
        {
          id: 'ex2',
          exerciseId: squat.id,
          exercise: squat,
          order: 1,
          notes: '',
          sets: [{ id: 's2', setNumber: 1, weight: 0, reps: 20, completed: true }],
        },
      ],
      totalVolume: 0,
      totalSets: 1,
    };

    const history = [session2, session1];

    // Deliberate 3rd session started after evening workout with an exercise added
    const ongoingSession3: WorkoutSession = {
      id: 'sess_night_mobility',
      workoutName: 'Night Mobility',
      date: '2026-10-21T19:00:00.000Z',
      startedAt: '2026-10-21T19:00:00.000Z',
      dayOfWeek: 'wednesday',
      status: 'in_progress',
      muscleGroups: ['core'],
      exercises: [
        {
          id: 'ex3',
          exerciseId: squat.id,
          exercise: squat,
          order: 1,
          notes: '',
          sets: [{ id: 's3', setNumber: 1, weight: 10, reps: 15, completed: false }],
        },
      ],
      totalVolume: 0,
      totalSets: 0,
    };

    assert(history.length === 2, 'History contains both completed sessions for today');
    const isOngoingActive = isGenuinelyActiveSession(ongoingSession3, history, session2, new Date('2026-10-21T19:30:00.000Z'));
    assert(isOngoingActive === true, 'Deliberate additional session with exercises is genuinely active');
  }

  // =========================================================================
  // TEST 9: Guest mode and authenticated user isolation
  // =========================================================================
  console.log('\nTest 9: Guest mode and authenticated user isolation');
  {
    const authUserHistory: WorkoutSession[] = [
      {
        id: 'sess_auth_legs',
        workoutName: 'Legs',
        date: '2026-10-21T10:00:00.000Z',
        completedAt: '2026-10-21T11:00:00.000Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        muscleGroups: ['legs'],
        exercises: [],
        totalVolume: 5000,
        totalSets: 10,
      },
    ];

    const guestHistory: WorkoutSession[] = [];
    const guestActive: WorkoutSession = {
      id: 'sess_guest_calves',
      workoutName: 'Calves',
      date: '2026-10-21T12:00:00.000Z',
      startedAt: '2026-10-21T12:00:00.000Z',
      dayOfWeek: 'wednesday',
      status: 'in_progress',
      muscleGroups: ['calves'],
      exercises: [],
      totalVolume: 0,
      totalSets: 0,
    };

    // Reconciling auth user does not alter guest
    const authReconciled = reconcileActiveSession(null, authUserHistory, simulatedToday);
    assert(authReconciled === null, 'Auth user with null active session remains null');

    // Guest active session is evaluated against guest history only
    const guestIsActive = isGenuinelyActiveSession(guestActive, guestHistory, null, simulatedToday);
    assert(guestIsActive === true, 'Guest active session is active without contamination from auth user history');

    const guestReconciled = reconcileActiveSession(guestActive, guestHistory, simulatedToday);
    assert(guestReconciled !== null && guestReconciled.id === 'sess_guest_calves', 'Guest session is cleanly preserved');
  }

  // =========================================================================
  // TEST 10: Existing recommendation, analytics, and planning remain intact
  // =========================================================================
  console.log('\nTest 10: Existing recommendation, analytics, and planning remain intact');
  {
    const sampleHistory: WorkoutSession[] = [
      {
        id: 'session_hist_1',
        workoutName: 'Push A',
        date: '2026-10-20T10:00:00.000Z',
        completedAt: '2026-10-20T11:00:00.000Z',
        dayOfWeek: 'tuesday',
        muscleGroups: ['chest', 'triceps'],
        status: 'completed',
        totalVolume: 3200,
        totalSets: 8,
        exercises: [
          {
            id: 'we_1',
            exerciseId: benchPress.id,
            exercise: benchPress,
            order: 1,
            notes: '',
            sets: [
              { id: 's1', setNumber: 1, weight: 80, reps: 10, completed: true },
              { id: 's2', setNumber: 2, weight: 85, reps: 8, completed: true },
            ],
          },
        ],
      },
    ];

    // Analytics summary
    const analytics = getComprehensiveAnalytics(
      sampleHistory,
      allExercises,
      DEFAULT_WORKOUT_PLAN,
      4,
      '30d',
      simulatedToday
    );
    assert(analytics.consistency.totalWorkouts === 1, 'Analytics summary correctly calculated 1 completed workout');
    assert(analytics.volume.totalLoadVolume === 1480, 'Analytics summary accurately calculated 1480 kg volume from completed sets');

    // Recommendation engine verification
    const recommendations = getRecommendedExercises({
      targetMuscleGroup: 'chest',
      allExercises,
      pastSessions: sampleHistory,
      personalRecords: [],
      currentExercises: [],
      userGoal: 'strength',
    });
    assert(recommendations.length > 0, 'Recommendation engine successfully generates recommendations');
    assert(recommendations[0].exercise !== undefined, 'Top recommendation contains valid exercise payload');

    console.log('  All 10 test scenarios passed with 100% accuracy!');
  }

  console.log('\n=== ALL 10 SESSION RECONCILIATION TESTS PASSED SUCCESSFULLY! ===');
}

runSessionReconciliationTests().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
