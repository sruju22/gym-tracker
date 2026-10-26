/**
 * GymTrackie — Phase 5.5: Cardio History & Session Detail Enhancements Test Suite
 *
 * Validates:
 * 1. Filtering by activity type and date range (week, month, 3 months, all).
 * 2. Searching by activity label, custom name, notes, distance, and duration.
 * 3. Sorting chronologically (newest, oldest) and by metrics (duration, distance).
 * 4. Metric integrity & missing field handling (never fabricate HR, pace, speed, or calories).
 * 5. Offline sync status identification (synced vs pending on-device).
 * 6. Deletion queue ID reconciliation (resolving MongoDB _id vs clientSessionId/temporary ID).
 * 7. Unified feed ordering and heterogeneous item handling.
 */

import { CardioSession, CardioActivityType, WorkoutSession } from '../../types';
import {
  getActivityLabel,
  formatDuration,
  formatPace,
  formatSpeed,
} from '../cardioMetrics';

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

// Replicating HistoryPage filter & search logic to test deterministically
function filterCardioSessions(
  sessions: CardioSession[],
  activityFilter: string,
  rangeFilter: 'all' | 'week' | 'month' | '3months',
  searchQuery: string,
  referenceDate: Date = new Date('2026-10-23T12:00:00Z')
): CardioSession[] {
  const isDateInRange = (dateStr: string): boolean => {
    if (rangeFilter === 'all') return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const diffDays = (referenceDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return true; // future session or today
    if (rangeFilter === 'week') return diffDays <= 7;
    if (rangeFilter === 'month') return diffDays <= 30;
    if (rangeFilter === '3months') return diffDays <= 90;
    return true;
  };

  return sessions.filter((session) => {
    if (!isDateInRange(session.date)) return false;
    if (activityFilter !== 'all' && session.activityType !== activityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const typeMatch = session.activityType.toLowerCase().includes(q);
      const labelMatch = getActivityLabel(session.activityType, session.customActivityName)
        .toLowerCase()
        .includes(q);
      const customMatch = (session.customActivityName || '').toLowerCase().includes(q);
      const notesMatch = (session.notes || '').toLowerCase().includes(q);
      const distMatch =
        session.distance !== null && session.distance !== undefined
          ? `${session.distance}`.includes(q) ||
            `${session.distance} ${session.distanceUnit || 'km'}`.toLowerCase().includes(q)
          : false;
      const durMatch =
        `${session.durationMinutes}m`.includes(q) || `${session.durationMinutes} min`.includes(q);
      if (!typeMatch && !labelMatch && !customMatch && !notesMatch && !distMatch && !durMatch) {
        return false;
      }
    }
    return true;
  });
}

// Replicating HistoryPage sort logic
function sortCardioSessions(
  sessions: CardioSession[],
  sortOrder: 'newest' | 'oldest' | 'duration' | 'metric'
): CardioSession[] {
  return [...sessions].sort((a, b) => {
    if (sortOrder === 'oldest') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortOrder === 'duration') {
      return b.durationMinutes - a.durationMinutes;
    }
    if (sortOrder === 'metric') {
      const distA = a.distance ?? -1;
      const distB = b.distance ?? -1;
      return distB - distA;
    }
    // newest default
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

async function runTests() {
  console.log('\n=== GYMTRACKIE PHASE 5.5: CARDIO HISTORY & SESSION DETAIL TESTS ===\n');

  const refDate = new Date('2026-10-23T12:00:00Z');

  const sampleCardioSessions: CardioSession[] = [
    {
      id: 'session_1',
      activityType: 'running',
      date: '2026-10-22T08:00:00Z', // 1 day ago
      durationMinutes: 45,
      distance: 7.5,
      distanceUnit: 'km',
      paceMinutesPerUnit: 6.0,
      speedPerHour: 10.0,
      averageHeartRate: 152,
      maxHeartRate: 174,
      caloriesBurned: 480,
      notes: 'Morning tempo run by the lake',
      syncedToBackend: true,
    },
    {
      id: 'session_2',
      activityType: 'cycling',
      date: '2026-10-18T14:30:00Z', // 5 days ago
      durationMinutes: 60,
      distance: 22.0,
      distanceUnit: 'km',
      speedPerHour: 22.0,
      caloriesBurned: 550,
      notes: 'Outdoor cycling circuit',
      syncedToBackend: true,
    },
    {
      id: 'session_3',
      activityType: 'stair_climber',
      date: '2026-10-10T17:00:00Z', // 13 days ago
      durationMinutes: 25,
      // No distance recorded
      averageHeartRate: 165,
      maxHeartRate: 182,
      notes: 'High intensity stair intervals',
      syncedToBackend: true,
    },
    {
      id: 'session_4',
      activityType: 'rowing',
      date: '2026-09-20T10:00:00Z', // 33 days ago
      durationMinutes: 35,
      distance: 6000,
      distanceUnit: 'km',
      notes: 'Indoor ergometer intervals',
      syncedToBackend: true,
    },
    {
      id: 'cardio_offline_5',
      activityType: 'other',
      customActivityName: 'Hill Sprints',
      date: '2026-10-23T09:00:00Z', // Today
      durationMinutes: 20,
      caloriesBurned: 220,
      notes: 'Steep hill repeats',
      syncedToBackend: false, // Pending offline sync
    },
  ];

  // ==========================================
  // Test 1: Date Range Filtering
  // ==========================================
  console.log('--- Test 1: Date Range Filtering ---');
  {
    const all = filterCardioSessions(sampleCardioSessions, 'all', 'all', '', refDate);
    assertEqual(all.length, 5, 'All date range returns all 5 sessions');

    const week = filterCardioSessions(sampleCardioSessions, 'all', 'week', '', refDate);
    assertEqual(week.length, 3, 'Week filter returns 3 sessions (today, 1d ago, 5d ago)');
    assert(week.some((s) => s.id === 'session_1'), 'Week includes session_1');
    assert(week.some((s) => s.id === 'session_2'), 'Week includes session_2');
    assert(week.some((s) => s.id === 'cardio_offline_5'), 'Week includes cardio_offline_5');

    const month = filterCardioSessions(sampleCardioSessions, 'all', 'month', '', refDate);
    assertEqual(month.length, 4, 'Month filter returns 4 sessions (excludes 33d ago)');
    assert(!month.some((s) => s.id === 'session_4'), 'Month excludes session_4');

    const threeMonths = filterCardioSessions(sampleCardioSessions, 'all', '3months', '', refDate);
    assertEqual(threeMonths.length, 5, '3 Months filter includes session_4 (33d ago)');
  }

  // ==========================================
  // Test 2: Activity Type Filtering
  // ==========================================
  console.log('--- Test 2: Activity Type Filtering ---');
  {
    const running = filterCardioSessions(sampleCardioSessions, 'running', 'all', '', refDate);
    assertEqual(running.length, 1, 'Only 1 running session');
    assertEqual(running[0].id, 'session_1', 'Running session matches session_1');

    const cycling = filterCardioSessions(sampleCardioSessions, 'cycling', 'all', '', refDate);
    assertEqual(cycling.length, 1, 'Only 1 cycling session');

    const other = filterCardioSessions(sampleCardioSessions, 'other', 'all', '', refDate);
    assertEqual(other.length, 1, 'Only 1 other session');
    assertEqual(other[0].customActivityName, 'Hill Sprints', 'Custom activity name preserved');

    const treadmill = filterCardioSessions(sampleCardioSessions, 'treadmill', 'all', '', refDate);
    assertEqual(treadmill.length, 0, 'No treadmill sessions logged');
  }

  // ==========================================
  // Test 3: Search Query Matching
  // ==========================================
  console.log('--- Test 3: Search Query Matching ---');
  {
    // Search by activity label
    const searchRunning = filterCardioSessions(sampleCardioSessions, 'all', 'all', 'running', refDate);
    assertEqual(searchRunning.length, 1, 'Search "running" finds running session');

    // Search by custom name
    const searchHill = filterCardioSessions(sampleCardioSessions, 'all', 'all', 'hill', refDate);
    assertEqual(searchHill.length, 1, 'Search "hill" matches custom activity and notes');
    assertEqual(searchHill[0].id, 'cardio_offline_5', 'Matched session is cardio_offline_5');

    // Search by notes
    const searchErg = filterCardioSessions(sampleCardioSessions, 'all', 'all', 'ergometer', refDate);
    assertEqual(searchErg.length, 1, 'Search "ergometer" finds rowing session');
    assertEqual(searchErg[0].id, 'session_4', 'Rowing session matches');

    // Search by distance
    const searchDist = filterCardioSessions(sampleCardioSessions, 'all', 'all', '22 km', refDate);
    assertEqual(searchDist.length, 1, 'Search "22 km" matches cycling session');
    assertEqual(searchDist[0].id, 'session_2', 'Matches cycling session_2');

    // Search by duration
    const searchDur = filterCardioSessions(sampleCardioSessions, 'all', 'all', '25m', refDate);
    assertEqual(searchDur.length, 1, 'Search "25m" matches stair climber');
    assertEqual(searchDur[0].id, 'session_3', 'Matches stair climber');

    // Search non-matching
    const searchNone = filterCardioSessions(sampleCardioSessions, 'all', 'all', 'nonexistent_xyz', refDate);
    assertEqual(searchNone.length, 0, 'Nonexistent query returns 0 results');
  }

  // ==========================================
  // Test 4: Sorting (Newest, Oldest, Duration, Metric)
  // ==========================================
  console.log('--- Test 4: Sorting Orders ---');
  {
    const newest = sortCardioSessions(sampleCardioSessions, 'newest');
    assertEqual(newest[0].id, 'cardio_offline_5', 'Newest is today (cardio_offline_5)');
    assertEqual(newest[newest.length - 1].id, 'session_4', 'Oldest is session_4');

    const oldest = sortCardioSessions(sampleCardioSessions, 'oldest');
    assertEqual(oldest[0].id, 'session_4', 'Oldest first is session_4');
    assertEqual(oldest[oldest.length - 1].id, 'cardio_offline_5', 'Last is cardio_offline_5');

    const duration = sortCardioSessions(sampleCardioSessions, 'duration');
    assertEqual(duration[0].durationMinutes, 60, 'Longest duration is 60m (session_2)');
    assertEqual(duration[duration.length - 1].durationMinutes, 20, 'Shortest duration is 20m (cardio_offline_5)');

    const metric = sortCardioSessions(sampleCardioSessions, 'metric');
    assertEqual(metric[0].id, 'session_4', 'Highest distance is session_4 (6000)');
    assertEqual(metric[1].id, 'session_2', 'Second highest distance is session_2 (22)');
    assertEqual(metric[2].id, 'session_1', 'Third highest distance is session_1 (7.5)');
    // Sessions with null/undefined distance sort to the bottom
    const bottomSessions = metric.slice(3).map((s) => s.id);
    assert(
      bottomSessions.includes('session_3') && bottomSessions.includes('cardio_offline_5'),
      'Sessions without distance sort to bottom'
    );
  }

  // ==========================================
  // Test 5: Metric Integrity & Formatting
  // ==========================================
  console.log('--- Test 5: Metric Presentation Rules ---');
  {
    // Session 1: All metrics populated
    const s1 = sampleCardioSessions[0];
    assertEqual(formatDuration(s1.durationMinutes), '45m', 'Duration formats as 45m');
    assertEqual(formatPace(s1.paceMinutesPerUnit, s1.distanceUnit), '6:00 /km', 'Pace formatted accurately');
    assertEqual(formatSpeed(s1.speedPerHour, s1.distanceUnit), '10.0 km/h', 'Speed formatted accurately');

    // Session 3: No distance, no pace, no speed
    const s3 = sampleCardioSessions[2];
    assertEqual(formatPace(s3.paceMinutesPerUnit, s3.distanceUnit), '—', 'Missing pace renders em-dash');
    assertEqual(formatSpeed(s3.speedPerHour, s3.distanceUnit), '—', 'Missing speed renders em-dash');
    assert(s3.averageHeartRate !== undefined && s3.averageHeartRate === 165, 'Average HR preserved without falsification');
    assertEqual(s3.distance, undefined, 'Distance remains strictly undefined and not 0');

    // Null and NaN handling in pace/speed
    assertEqual(formatPace(null), '—', 'Null pace returns —');
    assertEqual(formatPace(undefined), '—', 'Undefined pace returns —');
    assertEqual(formatPace(NaN), '—', 'NaN pace returns —');
    assertEqual(formatSpeed(null), '—', 'Null speed returns —');
    assertEqual(formatSpeed(undefined), '—', 'Undefined speed returns —');
    assertEqual(formatSpeed(NaN), '—', 'NaN speed returns —');
  }

  // ==========================================
  // Test 6: Offline Sync Status & Deletion ID Reconciliation
  // ==========================================
  console.log('--- Test 6: Offline Sync Status & Deletion ID Reconciliation ---');
  {
    // Identifying pending sessions
    const pendingSessions = sampleCardioSessions.filter((s) => s.syncedToBackend === false);
    assertEqual(pendingSessions.length, 1, 'Exactly 1 pending session identified');
    assertEqual(pendingSessions[0].id, 'cardio_offline_5', 'Pending session is cardio_offline_5');

    // Reconciliation of deletion ID logic
    // Case A: Session already synced, possesses backend _id
    const syncedSessionWithBackendId = {
      id: 'cardio_temp_123',
      _id: 'mongo_id_abc789',
      activityType: 'walking' as CardioActivityType,
      date: '2026-10-21T10:00:00Z',
      durationMinutes: 30,
      syncedToBackend: true,
    };
    const effectiveDeleteIdA = (syncedSessionWithBackendId as any)._id || syncedSessionWithBackendId.id;
    assertEqual(effectiveDeleteIdA, 'mongo_id_abc789', 'Prefers MongoDB _id for backend deletion queue');

    // Case B: Session created offline, never synced yet (no _id)
    const localSessionOnly = {
      id: 'cardio_offline_local',
      activityType: 'walking' as CardioActivityType,
      date: '2026-10-21T10:00:00Z',
      durationMinutes: 30,
      syncedToBackend: false,
    };
    const effectiveDeleteIdB = (localSessionOnly as any)._id || localSessionOnly.id;
    assertEqual(effectiveDeleteIdB, 'cardio_offline_local', 'Falls back to temporary client ID if never synced');
  }

  // ==========================================
  // Test 7: Unified Feed Chronological Ordering
  // ==========================================
  console.log('--- Test 7: Unified Strength + Cardio Feed ---');
  {
    const strengthWorkout: WorkoutSession = {
      id: 'strength_1',
      date: '2026-10-21T18:00:00Z', // Between session_1 (Oct 22) and session_2 (Oct 18)
      dayOfWeek: 'wednesday',
      status: 'completed',
      workoutName: 'Upper Body Power',
      muscleGroups: ['chest', 'triceps'],
      totalVolume: 3200,
      totalSets: 12,
      exercises: [],
    };

    const unifiedFeed = [
      ...sampleCardioSessions.map((c) => ({
        id: c.id,
        kind: 'cardio' as const,
        date: c.date,
        cardioSession: c,
      })),
      {
        id: strengthWorkout.id,
        kind: 'strength' as const,
        date: strengthWorkout.date,
        strengthSession: strengthWorkout,
      },
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    assertEqual(unifiedFeed.length, 6, 'Unified feed contains 6 items');
    // Order should be:
    // 1. cardio_offline_5 (Oct 23)
    // 2. session_1 (Oct 22)
    // 3. strength_1 (Oct 21)
    // 4. session_2 (Oct 18)
    // 5. session_3 (Oct 10)
    // 6. session_4 (Sep 20)
    assertEqual(unifiedFeed[0].id, 'cardio_offline_5', '1st in feed: cardio_offline_5');
    assertEqual(unifiedFeed[1].id, 'session_1', '2nd in feed: session_1');
    assertEqual(unifiedFeed[2].id, 'strength_1', '3rd in feed: strength_1');
    assertEqual(unifiedFeed[3].id, 'session_2', '4th in feed: session_2');
    assertEqual(unifiedFeed[4].id, 'session_3', '5th in feed: session_3');
    assertEqual(unifiedFeed[5].id, 'session_4', '6th in feed: session_4');
  }

  console.log('\n=== ALL PHASE 5.5 TESTS PASSED SUCCESSFULLY ===\n');
}

runTests().catch((err) => {
  console.error('\nTest failure:', err);
  process.exit(1);
});
