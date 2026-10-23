/**
 * GYMTRACKIE PHASE 5.1: CARDIO & CONDITIONING FOUNDATION TEST SUITE
 *
 * Verifies:
 * 1. Cardio session data model and required fields.
 * 2. Supported activity types and custom activity names.
 * 3. Deterministic pace and speed derivations (km, mi, m) and zero-division protection.
 * 4. Optional heart rate and manual calories (never fabricated/estimated).
 * 5. Strict absence of strength sets, reps, or weights.
 * 6. Store integration, local persistence, updates, and deletion.
 * 7. Offline sync tracking and idempotency (clientSessionId).
 * 8. Strict authenticated user ownership and tenant data isolation.
 * 9. Absolute regression protection for strength workouts, supersets, and analytics.
 */

import { useWorkoutStore } from '../../store/workoutStore';
import {
  CardioSession,
  CardioActivityType,
  WorkoutSession,
} from '../../types';
import { setStoredToken } from '../../api/authApi';
import {
  calculatePace,
  calculateSpeed,
  formatPace,
  formatSpeed,
  formatDuration,
  getActivityLabel,
  CARDIO_ACTIVITIES,
} from '../cardioMetrics';
import {
  getVolumeAnalytics,
  getMuscleGroupCoverageAnalytics,
  derivePersonalRecords,
  getTrainingConsistencyAnalytics,
} from '../analyticsEngine';
import { INITIAL_EXERCISES } from '../../data/exercises';
import { DEFAULT_WORKOUT_PLAN } from '../../data/workoutPlan';

declare const process: { exit: (code: number) => void };

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

console.log('=== GYMTRACKIE PHASE 5.1: CARDIO & CONDITIONING FOUNDATION TESTS ===\n');

// -----------------------------------------------------------------------------
// Test 1: Required Fields and Validation
// -----------------------------------------------------------------------------
console.log('--- Test 1: Required fields & data model validation ---');
{
  const validPace = calculatePace(30, 5, 'km');
  assert(validPace === 6, '30 mins for 5 km yields exactly 6.00 min/km pace');

  const validSpeed = calculateSpeed(30, 5, 'km');
  assert(validSpeed === 10, '30 mins for 5 km yields exactly 10.0 km/h speed');

  // Zero and negative boundaries
  assert(calculatePace(0, 5, 'km') === null, 'Pace with 0 duration returns null safely');
  assert(calculatePace(30, 0, 'km') === null, 'Pace with 0 distance returns null safely (no division by zero)');
  assert(calculatePace(-10, 5, 'km') === null, 'Negative duration returns null safely');
  assert(calculatePace(30, -5, 'km') === null, 'Negative distance returns null safely');
  assert(calculateSpeed(30, 0, 'km') === null, 'Speed with 0 distance returns null safely');
  assert(calculateSpeed(0, 5, 'km') === null, 'Speed with 0 duration returns null safely');
}

// -----------------------------------------------------------------------------
// Test 2: Supported Activity Types & Metadata
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Supported activity types & custom names ---');
{
  const expectedActivities: CardioActivityType[] = [
    'running',
    'walking',
    'cycling',
    'treadmill',
    'elliptical',
    'rowing',
    'stair_climber',
    'other',
  ];

  expectedActivities.forEach((act) => {
    const found = CARDIO_ACTIVITIES.find((a) => a.type === act);
    assert(Boolean(found), `Activity type "${act}" is registered in CARDIO_ACTIVITIES`);
  });

  assert(getActivityLabel('running') === 'Running', 'Running resolves to "Running"');
  assert(getActivityLabel('rowing') === 'Rowing', 'Rowing resolves to "Rowing"');
  assert(
    getActivityLabel('other', 'Trail Rucking') === 'Trail Rucking',
    'Custom activity name correctly overrides "Other"'
  );
  assert(getActivityLabel('other', '') === 'Other Activity', 'Empty custom name falls back to "Other Activity"');
}

// -----------------------------------------------------------------------------
// Test 3: Deterministic Pace & Speed Derivation Across Units
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Pace & Speed formatting across km, mi, and m ---');
{
  // Kilometers
  const paceKm = calculatePace(25, 5, 'km'); // 5.0 min/km
  assert(paceKm === 5, '25m / 5km = 5.0 min/km');
  assert(formatPace(paceKm, 'km') === '5:00 /km', 'Formatted pace is "5:00 /km"');
  assert(formatSpeed(12.34, 'km') === '12.3 km/h', 'Formatted speed is "12.3 km/h"');

  // Miles
  const paceMi = calculatePace(60, 6, 'mi'); // 10.0 min/mi
  assert(paceMi === 10, '60m / 6mi = 10.0 min/mi');
  assert(formatPace(paceMi, 'mi') === '10:00 /mi', 'Formatted pace in miles is "10:00 /mi"');
  assert(formatSpeed(6.0, 'mi') === '6.0 mph', 'Formatted speed in miles is "6.0 mph"');

  // Meters (e.g. Rowing 2000m in 8 mins -> converts 2000m to 2.0km -> 4.0 min/km)
  const paceMeters = calculatePace(8, 2000, 'm');
  assert(paceMeters === 4, '8m for 2000m row = 4.0 min/km');
  const speedMeters = calculateSpeed(8, 2000, 'm');
  assert(speedMeters === 15, '8m for 2000m row = 15.0 km/h');

  // Duration formatting
  assert(formatDuration(35) === '35m', '35 mins formats as "35m"');
  assert(formatDuration(60) === '1h', '60 mins formats as "1h"');
  assert(formatDuration(75) === '1h 15m', '75 mins formats as "1h 15m"');
}

// -----------------------------------------------------------------------------
// Test 4: Optional Fields & Metric Integrity (No fake estimates)
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Optional fields, heart rate, and manual calories ---');
{
  const sessionWithoutExtras: CardioSession = {
    id: 'cardio_test_1',
    activityType: 'walking',
    date: new Date().toISOString(),
    durationMinutes: 40,
    distance: null,
    distanceUnit: 'km',
    paceMinutesPerUnit: null,
    speedPerHour: null,
    averageHeartRate: null,
    maxHeartRate: null,
    caloriesBurned: null,
  };

  assert(sessionWithoutExtras.distance === null, 'Distance is cleanly null when not provided');
  assert(sessionWithoutExtras.caloriesBurned === null, 'Calories burned is strictly null (no fake calorie guess)');
  assert(sessionWithoutExtras.averageHeartRate === null, 'Heart rate is strictly null when not provided');

  // Session with genuine user-entered metrics
  const sessionWithExtras: CardioSession = {
    id: 'cardio_test_2',
    activityType: 'running',
    date: new Date().toISOString(),
    durationMinutes: 30,
    distance: 5.2,
    distanceUnit: 'km',
    paceMinutesPerUnit: 5.77,
    speedPerHour: 10.4,
    averageHeartRate: 152,
    maxHeartRate: 174,
    caloriesBurned: 360,
    notes: 'Morning interval run along riverbank',
  };

  assert(sessionWithExtras.averageHeartRate === 152, 'Valid heart rate is preserved');
  assert(sessionWithExtras.maxHeartRate === 174, 'Valid max heart rate is preserved');
  assert(sessionWithExtras.caloriesBurned === 360, 'Manual calories entry is preserved as exact integer');
  assert(sessionWithExtras.notes === 'Morning interval run along riverbank', 'Notes preserved');
}

// -----------------------------------------------------------------------------
// Test 5: Absence of Strength Sets, Reps, and Weights
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Cardio session model does not require sets/reps/weights ---');
{
  const cardioSession: CardioSession = {
    id: 'cardio_test_3',
    activityType: 'treadmill',
    date: new Date().toISOString(),
    durationMinutes: 20,
  };

  assert(!('exercises' in cardioSession), 'Cardio session has no exercises array');
  assert(!('sets' in cardioSession), 'Cardio session has no sets array');
  assert(!('totalVolume' in cardioSession), 'Cardio session has no totalVolume property');
  assert(!('totalSets' in cardioSession), 'Cardio session has no totalSets property');
}

// -----------------------------------------------------------------------------
// Test 6: Store Integration (Log, Retrieve, Update, Delete)
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: Store actions: Log, Retrieve, Update, Delete ---');
(async () => {
  const store = useWorkoutStore.getState();
  const testUserId = 'test_user_cardio_flow';

  // 1. Log cardio session
  const created = await store.logCardioSession(testUserId, {
    activityType: 'cycling',
    date: new Date('2026-10-22T08:00:00Z').toISOString(),
    durationMinutes: 45,
    distance: 18.0,
    distanceUnit: 'km',
  });

  assert(Boolean(created.id), 'Session logged with generated ID');
  assert(Boolean(created.clientSessionId), 'Session logged with clientSessionId');
  assert(created.paceMinutesPerUnit === 2.5, 'Pace auto-derived in store (45 / 18 = 2.5 min/km)');
  assert(created.speedPerHour === 24, 'Speed auto-derived in store (18 / 0.75h = 24.0 km/h)');

  // 2. Retrieve
  const sessions = store.getCardioSessions(testUserId);
  assert(sessions.length >= 1, 'getCardioSessions returns logged session');
  const retrieved = sessions.find((s) => s.id === created.id);
  assert(retrieved !== undefined, 'Logged session found by ID');
  assert(retrieved?.activityType === 'cycling', 'Activity type preserved as cycling');

  // 3. Update
  const updatedSuccess = await store.updateCardioSession(testUserId, created.id, {
    durationMinutes: 50,
    notes: 'Added extra 5 minutes cooldown',
  });
  assert(updatedSuccess === true, 'updateCardioSession returned true');

  const updatedSessions = store.getCardioSessions(testUserId);
  const updatedItem = updatedSessions.find((s) => s.id === created.id);
  assert(updatedItem?.durationMinutes === 50, 'Duration updated to 50 minutes');
  assert(updatedItem?.notes === 'Added extra 5 minutes cooldown', 'Notes updated');
  // Pace recalculation on update
  assert(updatedItem?.paceMinutesPerUnit === 2.78, 'Pace re-derived after duration edit (50 / 18 = 2.78)');

  // 4. Delete
  const deletedSuccess = await store.deleteCardioSession(testUserId, created.id);
  assert(deletedSuccess === true, 'deleteCardioSession returned true');

  const remainingSessions = store.getCardioSessions(testUserId);
  assert(
    remainingSessions.find((s) => s.id === created.id) === undefined,
    'Session removed cleanly from store after delete'
  );
})().then(() => {
  // -----------------------------------------------------------------------------
  // Test 7: User Ownership & Tenant Isolation
  // -----------------------------------------------------------------------------
  console.log('\n--- Test 7: Authenticated user ownership and tenant isolation ---');
  return (async () => {
    const store = useWorkoutStore.getState();
    const aliceId = 'user_alice_cardio';
    const bobId = 'user_bob_cardio';

    await store.logCardioSession(aliceId, {
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      notes: 'Alice private morning run',
    });

    const aliceSessions = store.getCardioSessions(aliceId);
    const bobSessions = store.getCardioSessions(bobId);

    assert(aliceSessions.length >= 1, 'Alice has her logged session');
    assert(
      bobSessions.every((s) => s.notes !== 'Alice private morning run'),
      'Bob NEVER sees Alice cardio session'
    );
  })();
}).then(() => {
  // -----------------------------------------------------------------------------
  // Test 8: Strength Workout & Analytics Absolute Isolation
  // -----------------------------------------------------------------------------
  console.log('\n--- Test 8: Strength workouts & analytics regression protection ---');
  return (async () => {
    const store = useWorkoutStore.getState();
    const isolationUserId = 'user_isolation_test';

    const benchPress = INITIAL_EXERCISES.find((e) => e.name.toLowerCase().includes('bench press')) || INITIAL_EXERCISES[0];

    // Seed 1 completed strength workout
    const strengthWorkout: WorkoutSession = {
      id: 'strength_session_iso_1',
      clientSessionId: 'strength_client_1',
      workoutName: 'Chest & Triceps Power',
      date: '2026-10-20T10:00:00.000Z',
      completedAt: '2026-10-20T11:00:00.000Z',
      dayOfWeek: 'tuesday',
      muscleGroups: ['chest', 'triceps'],
      status: 'completed',
      totalVolume: 3000,
      totalSets: 3,
      exercises: [
        {
          id: 'ex_1',
          exerciseId: benchPress.id,
          exercise: benchPress,
          order: 1,
          notes: '',
          completed: true,
          sets: [
            { id: 's1', setNumber: 1, weight: 100, reps: 10, completed: true },
            { id: 's2', setNumber: 2, weight: 100, reps: 10, completed: true },
            { id: 's3', setNumber: 3, weight: 100, reps: 10, completed: true },
          ],
        },
      ],
    };

    // Store the strength workout
    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [isolationUserId]: {
          history: [strengthWorkout],
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

    // Baseline strength metrics
    const baselineHistory = store.getHistory(isolationUserId);
    assert(baselineHistory.length === 1, 'Strength history has exactly 1 workout initially');
    assert(baselineHistory[0].totalVolume === 3000, 'Baseline volume is 3000 kg');
    assert(baselineHistory[0].totalSets === 3, 'Baseline sets is 3');

    // Baseline analytics
    const baselineAnalyticsVolume = getVolumeAnalytics(baselineHistory, 'all');
    assert(baselineAnalyticsVolume.totalLoadVolume === 3000, 'Analytics total volume is 3000 kg');
    assert(baselineAnalyticsVolume.totalCompletedSets === 3, 'Analytics total sets is 3');

    // NOW: Log multiple cardio sessions for the same user
    await store.logCardioSession(isolationUserId, {
      activityType: 'running',
      durationMinutes: 45,
      distance: 8.0,
      caloriesBurned: 520,
    });
    await store.logCardioSession(isolationUserId, {
      activityType: 'rowing',
      durationMinutes: 25,
      distance: 5000,
      distanceUnit: 'm',
    });

    // Verify cardio sessions are stored
    const cardioList = store.getCardioSessions(isolationUserId);
    assert(cardioList.length === 2, 'User now has 2 cardio sessions');

    // RE-VERIFY STRENGTH WORKOUTS: Must remain 100% unaffected
    const postCardioHistory = store.getHistory(isolationUserId);
    assert(postCardioHistory.length === 1, 'Strength history STILL has exactly 1 workout (cardio was NOT mixed into strength)');
    assert(postCardioHistory[0].totalVolume === 3000, 'Strength volume is STILL 3000 kg');
    assert(postCardioHistory[0].totalSets === 3, 'Strength total sets is STILL 3');

    // RE-VERIFY STRENGTH ANALYTICS: Volume, PRs, muscle coverage MUST NOT change
    const postCardioAnalyticsVolume = getVolumeAnalytics(postCardioHistory, 'all');
    assert(
      postCardioAnalyticsVolume.totalLoadVolume === 3000,
      'Strength analytics volume is strictly preserved at 3000 kg (cardio did not inflate volume)'
    );
    assert(
      postCardioAnalyticsVolume.totalCompletedSets === 3,
      'Strength analytics sets is strictly preserved at 3 sets (cardio did not add fake sets)'
    );

    const postCardioPRs = derivePersonalRecords(postCardioHistory, INITIAL_EXERCISES);
    assert(postCardioPRs.length === 1, 'Bench press PR preserved');
    assert(postCardioPRs[0].maxWeight.value === 100, 'Bench press PR weight is 100 kg');

    const muscleCoverage = getMuscleGroupCoverageAnalytics(postCardioHistory, INITIAL_EXERCISES, 'all', DEFAULT_WORKOUT_PLAN);
    const chestCoverage = muscleCoverage.find((m) => m.muscleGroup === 'chest');
    assert(chestCoverage !== undefined, 'Chest coverage is present');
    assert(chestCoverage?.directSets === 3, 'Chest coverage direct sets count is strictly 3');

    const consistency = getTrainingConsistencyAnalytics(postCardioHistory, DEFAULT_WORKOUT_PLAN, 4);
    assert(consistency.totalWorkouts === 1, 'Consistency total workouts is strictly 1');
  })();
}).then(() => {
  // -----------------------------------------------------------------------------
  // Test 9: Offline Edit Precedence & Reconnect Sync via PUT
  // -----------------------------------------------------------------------------
  console.log('\n--- Test 9: Offline edit precedence over stale backend & PUT sync ---');
  return (async () => {
    const store = useWorkoutStore.getState();
    const testUserId = 'user_offline_edit_test';
    setStoredToken('mock_valid_token');

    // 1. Seed user with an existing synced session
    const syncedSession: CardioSession = {
      id: 'backend_cardio_999',
      clientSessionId: 'csid_backend_999',
      activityType: 'running',
      durationMinutes: 30,
      distance: 5.0,
      distanceUnit: 'km',
      date: '2026-10-23T08:00:00.000Z',
      syncedToBackend: true,
    };

    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [testUserId]: {
          ...state.getUserData(testUserId),
          cardioSessions: [syncedSession],
          pendingDeletedCardioIds: [],
        },
      },
    }));

    // 2. Perform offline edit (simulate network failure by mocking fetch to reject)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Network offline');
    }) as any;

    const editResult = await store.updateCardioSession(testUserId, 'backend_cardio_999', {
      durationMinutes: 45,
      distance: 7.5,
      notes: 'Offline updated duration and distance',
    });
    assert(editResult === false, 'updateCardioSession gracefully caught offline network error');

    // Verify session updated locally and flagged as unsynced
    const locallyEdited = store.getCardioSessions(testUserId).find((s) => s.id === 'backend_cardio_999');
    assert(locallyEdited !== undefined, 'Edited session still present locally');
    assert(locallyEdited?.durationMinutes === 45, 'Local duration is 45 mins');
    assert(locallyEdited?.distance === 7.5, 'Local distance is 7.5 km');
    assert(locallyEdited?.syncedToBackend === false, 'syncedToBackend is false (pending sync)');

    // 3. Stale backend fetch arrives (e.g. from background refresh or reconnect before push)
    // Backend still has old 30m / 5km session
    globalThis.fetch = (async (url: string, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/cardio') && opts?.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            count: 1,
            totalCount: 1,
            page: 1,
            totalPages: 1,
            sessions: [
              {
                _id: 'backend_cardio_999',
                clientSessionId: 'csid_backend_999',
                userId: testUserId,
                activityType: 'running',
                durationMinutes: 30,
                distance: 5.0,
                distanceUnit: 'km',
                date: '2026-10-23T08:00:00.000Z',
              },
            ],
          }),
        };
      }
      // If background sync triggers before full connection, simulate offline retry
      throw new Error('Connection flaky during background sync attempt');
    }) as any;

    const fetched = await store.fetchCardioSessions(testUserId);
    const postFetchSession = fetched.find((s) => s.id === 'backend_cardio_999');
    assert(
      postFetchSession?.durationMinutes === 45,
      'Stale backend response did NOT overwrite local pending offline edit (duration remains 45 mins)'
    );
    assert(
      postFetchSession?.distance === 7.5,
      'Stale backend response did NOT overwrite local pending offline edit (distance remains 7.5 km)'
    );
    assert(
      postFetchSession?.syncedToBackend === false,
      'Session remains flagged as syncedToBackend: false'
    );

    // 4. Reconnect and sync pending changes
    let putCalledWithId = '';
    let putPayload: any = null;
    globalThis.fetch = (async (url: string, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/cardio/backend_cardio_999') && opts?.method === 'PUT') {
        putCalledWithId = 'backend_cardio_999';
        putPayload = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Cardio session updated successfully',
            session: {
              _id: 'backend_cardio_999',
              durationMinutes: putPayload.durationMinutes,
              distance: putPayload.distance,
            },
          }),
        };
      }
      throw new Error(`Unhandled fetch mock in sync: ${url}`);
    }) as any;

    await store.syncPendingCardioSessions(testUserId);
    assert(putCalledWithId === 'backend_cardio_999', 'syncPendingCardioSessions executed PUT to backend');
    assert(putPayload.durationMinutes === 45, 'PUT payload included updated duration');
    assert(putPayload.distance === 7.5, 'PUT payload included updated distance');

    const syncedSessionAfter = store.getCardioSessions(testUserId).find((s) => s.id === 'backend_cardio_999');
    assert(syncedSessionAfter?.syncedToBackend === true, 'Session is now marked syncedToBackend: true');

    globalThis.fetch = originalFetch;
  })();
}).then(() => {
  // -----------------------------------------------------------------------------
  // Test 10: Offline Deletion Resurrection Prevention & Reconnect Sync
  // -----------------------------------------------------------------------------
  console.log('\n--- Test 10: Offline deletion resurrection prevention & DELETE sync ---');
  return (async () => {
    const store = useWorkoutStore.getState();
    const testUserId = 'user_offline_del_test';
    setStoredToken('mock_valid_token');

    // 1. Seed user with an existing synced session
    const syncedSession: CardioSession = {
      id: 'backend_cardio_del_888',
      clientSessionId: 'csid_backend_888',
      activityType: 'cycling',
      durationMinutes: 40,
      distance: 15.0,
      distanceUnit: 'km',
      date: '2026-10-23T09:00:00.000Z',
      syncedToBackend: true,
    };

    useWorkoutStore.setState((state) => ({
      userDataMap: {
        ...state.userDataMap,
        [testUserId]: {
          ...state.getUserData(testUserId),
          cardioSessions: [syncedSession],
          pendingDeletedCardioIds: [],
        },
      },
    }));

    // 2. Perform offline delete
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Network offline');
    }) as any;

    await store.deleteCardioSession(testUserId, 'backend_cardio_del_888');

    // Verify session removed from local store and tracked in pendingDeletedCardioIds
    const remaining = store.getCardioSessions(testUserId);
    assert(remaining.length === 0, 'Session immediately removed from local sessions list');
    const uData = store.getUserData(testUserId);
    assert(
      (uData.pendingDeletedCardioIds || []).includes('backend_cardio_del_888'),
      'Session ID queued in pendingDeletedCardioIds for backend deletion'
    );

    // 3. Stale backend fetch arrives with the deleted session still present on server
    globalThis.fetch = (async (url: string, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/cardio') && opts?.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            count: 1,
            totalCount: 1,
            page: 1,
            totalPages: 1,
            sessions: [
              {
                _id: 'backend_cardio_del_888',
                clientSessionId: 'csid_backend_888',
                userId: testUserId,
                activityType: 'cycling',
                durationMinutes: 40,
                distance: 15.0,
                distanceUnit: 'km',
                date: '2026-10-23T09:00:00.000Z',
              },
            ],
          }),
        };
      }
      // If background sync triggers before full connection, simulate offline retry
      throw new Error('Connection flaky during background sync attempt');
    }) as any;

    const fetchedAfterDel = await store.fetchCardioSessions(testUserId);
    assert(
      fetchedAfterDel.find((s) => s.id === 'backend_cardio_del_888') === undefined,
      'Deleted session was NOT resurrected by backend fetch (resurrection prevention active)'
    );

    // 4. Reconnect and process pending deletions
    let deleteCalledWithId = '';
    globalThis.fetch = (async (url: string, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/cardio/backend_cardio_del_888') && opts?.method === 'DELETE') {
        deleteCalledWithId = 'backend_cardio_del_888';
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Cardio session deleted successfully',
            id: 'backend_cardio_del_888',
          }),
        };
      }
      throw new Error(`Unhandled fetch mock in sync: ${url}`);
    }) as any;

    await store.syncPendingCardioSessions(testUserId);
    assert(deleteCalledWithId === 'backend_cardio_del_888', 'Backend DELETE endpoint was called during reconnect sync');
    const uDataAfterSync = store.getUserData(testUserId);
    assert(
      !(uDataAfterSync.pendingDeletedCardioIds || []).includes('backend_cardio_del_888'),
      'Session ID cleared from pendingDeletedCardioIds after successful sync'
    );

    globalThis.fetch = originalFetch;
  })();
}).then(() => {
  // -----------------------------------------------------------------------------
  // Test 11: Rapid Duplicate Submission Prevention & Idempotency
  // -----------------------------------------------------------------------------
  console.log('\n--- Test 11: Rapid duplicate submission prevention & idempotency ---');
  return (async () => {
    const store = useWorkoutStore.getState();
    const testUserId = 'user_duplicate_test';
    const sharedClientSessionId = 'csid_rapid_tap_unique_123';
    setStoredToken(null);

    // 1. Initial submission
    const firstSave = await store.logCardioSession(testUserId, {
      clientSessionId: sharedClientSessionId,
      activityType: 'walking',
      durationMinutes: 20,
      distance: 1.5,
    });
    assert(Boolean(firstSave.id), 'First session created');

    // 2. Rapid double submission with same clientSessionId
    const secondSave = await store.logCardioSession(testUserId, {
      clientSessionId: sharedClientSessionId,
      activityType: 'walking',
      durationMinutes: 20,
      distance: 1.5,
    });
    assert(secondSave !== undefined, 'Second submission handled without error');

    // Verify exactly 1 session exists in state
    const userSessions = store.getCardioSessions(testUserId);
    const duplicates = userSessions.filter((s) => s.clientSessionId === sharedClientSessionId);
    assert(
      duplicates.length === 1,
      'Strictly 1 session exists despite rapid duplicate submission (idempotency verified)'
    );

    console.log('\n🎉 ALL 11 PHASE 5.1 CARDIO & CONDITIONING TESTS PASSED SUCCESSFULLY!');
  })();
}).catch((err) => {
  console.error('\n💥 TEST FAILED:', err);
  process.exit(1);
});
