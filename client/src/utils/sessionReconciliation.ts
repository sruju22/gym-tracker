import { WorkoutSession } from '../types';
import { isSameLocalDay, parseLocalDate } from './formatters';

/**
 * Checks whether a session has been completed according to its own status
 * or by matching a completed record in the user's workout history.
 */
export function isSessionCompleted(
  session?: WorkoutSession | null,
  history: WorkoutSession[] = []
): boolean {
  if (!session) return false;
  if (session.status === 'completed') return true;

  return history.some((h) => {
    if (h.status !== 'completed') return false;
    if (h.id && session.id && h.id === session.id) return true;
    if (h.clientSessionId && session.id && h.clientSessionId === session.id) return true;
    if (session.clientSessionId && h.id && session.clientSessionId === h.id) return true;
    if (
      session.clientSessionId &&
      h.clientSessionId &&
      session.clientSessionId === h.clientSessionId
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Checks whether an active session is stale, abandoned, or invalid.
 * A session is considered stale or abandoned if:
 * 1. It is already marked or recorded as completed in history.
 * 2. It was started on a past calendar day (not today) and has no logged exercises or completed sets.
 * 3. A workout has already been completed today, and this active session has 0 exercises
 *    (an empty draft cannot preempt an authoritative completed workout of the day).
 * 4. A workout was completed today and this session's startedAt timestamp is older than
 *    or equal to the completed workout's completion time.
 */
export function isStaleOrAbandonedSession(
  session?: WorkoutSession | null,
  history: WorkoutSession[] = [],
  todayCompleted?: WorkoutSession | null,
  now: Date = new Date()
): boolean {
  if (!session) return false;

  // 1. If it's completed, it's not a valid active session
  if (isSessionCompleted(session, history)) return true;

  const sessionDate = parseLocalDate(session.startedAt || session.date);
  if (isNaN(sessionDate.getTime())) return true; // invalid date

  const isStartedToday = isSameLocalDay(sessionDate, now);
  const exerciseCount = session.exercises ? session.exercises.length : 0;
  const hasLoggedSets = session.exercises
    ? session.exercises.some((e) => e.sets && e.sets.some((s) => s.completed || (s.weight !== null && s.weight > 0) || (s.reps !== null && s.reps > 0)))
    : false;

  // 2. Started on a previous calendar day:
  // If it has 0 exercises or no logged sets, it is an abandoned draft from the past.
  if (!isStartedToday && (!hasLoggedSets || exerciseCount === 0)) {
    return true;
  }

  // Find all completed workouts on today's local date
  const completedTodaySessions = history.filter(
    (h) => h.status === 'completed' && isSameLocalDay(h.completedAt || h.date, now)
  );
  const hasCompletedToday = Boolean(todayCompleted) || completedTodaySessions.length > 0;

  // 3. Today's workout has already been completed:
  if (hasCompletedToday) {
    // Check completion timestamp of the latest completed workout today
    const latestCompleted = todayCompleted || completedTodaySessions[0];
    if (latestCompleted) {
      const compTime = parseLocalDate(latestCompleted.completedAt || latestCompleted.date).getTime();
      const sessStartTime = sessionDate.getTime();
      // If the session was started before or when the completed workout was finished, it is obsolete
      if (sessStartTime <= compTime) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines whether a session is a genuinely active session for today.
 */
export function isGenuinelyActiveSession(
  session?: WorkoutSession | null,
  history: WorkoutSession[] = [],
  todayCompleted?: WorkoutSession | null,
  now: Date = new Date()
): boolean {
  if (!session) return false;
  if (session.status !== 'in_progress' && session.status !== 'planned') return false;

  const isToday = isSameLocalDay(session.startedAt || session.date, now);
  if (!isToday) return false;

  if (isSessionCompleted(session, history)) return false;
  if (isStaleOrAbandonedSession(session, history, todayCompleted, now)) return false;

  return true;
}

/**
 * Reconciles an active session against history, clearing completed or stale sessions.
 * Preserves genuine active sessions with exercises.
 */
export function reconcileActiveSession(
  activeSession?: WorkoutSession | null,
  history: WorkoutSession[] = [],
  now: Date = new Date()
): WorkoutSession | null {
  if (!activeSession) return null;

  if (isSessionCompleted(activeSession, history)) {
    return null;
  }

  if (isStaleOrAbandonedSession(activeSession, history, null, now)) {
    return null;
  }

  return activeSession;
}
