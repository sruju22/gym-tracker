import { WorkoutSession, PersonalRecord } from '../types';

export interface WorkoutInsight {
  type: 'pr' | 'volume_increase' | 'perfect_completion' | 'volume_consistent';
  title: string;
  description: string;
}

/**
 * Formats duration in seconds into a human-readable mobile-friendly string.
 * Falls back to computing difference between startedAt and completedAt if duration is absent.
 */
export function formatWorkoutDuration(
  seconds?: number | null,
  startedAt?: string | null,
  completedAt?: string | null
): string {
  let dur = seconds;
  if ((dur === undefined || dur === null || dur <= 0 || isNaN(dur)) && startedAt && completedAt) {
    try {
      const startMs = new Date(startedAt).getTime();
      const endMs = new Date(completedAt).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        dur = Math.round((endMs - startMs) / 1000);
      }
    } catch {
      // ignore
    }
  }

  if (!dur || typeof dur !== 'number' || dur <= 0 || isNaN(dur)) {
    return '--';
  }

  const hours = Math.floor(dur / 3600);
  const minutes = Math.floor((dur % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes} min`;
  }

  return `${dur}s`;
}

/**
 * Finds the most recent past completed workout in history that shares the same
 * workout name or overlapping muscle groups
 */
export function findPreviousComparableSession(
  currentSession: WorkoutSession,
  history: WorkoutSession[]
): WorkoutSession | null {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return null;
  }

  const currentMuscles = new Set(
    Array.isArray(currentSession.muscleGroups) ? currentSession.muscleGroups : []
  );

  return (
    history.find((h) => {
      // Must not be the same session
      if (h.id === currentSession.id) return false;
      if (currentSession.clientSessionId && h.clientSessionId === currentSession.clientSessionId) {
        return false;
      }
      if (h.status !== 'completed') return false;

      // Must have valid volume
      if (!h.totalVolume || h.totalVolume <= 0) return false;

      // 1. Exact or normalized workoutName match
      if (
        currentSession.workoutName &&
        h.workoutName &&
        currentSession.workoutName.trim().toLowerCase() === h.workoutName.trim().toLowerCase()
      ) {
        return true;
      }

      // 2. Muscle group overlap
      if (Array.isArray(h.muscleGroups) && h.muscleGroups.some((m) => currentMuscles.has(m))) {
        return true;
      }

      return false;
    }) || null
  );
}

/**
 * Generates one short, data-backed observation based strictly on stored data.
 * Zero motivational hallucinations or fabricated claims.
 */
export function generateWorkoutInsight(
  currentSession: WorkoutSession,
  history: WorkoutSession[],
  unit: string = 'kg'
): WorkoutInsight | null {
  // 1. Personal Records achieved in this session
  if (Array.isArray(currentSession.newPRs) && currentSession.newPRs.length > 0) {
    const prCount = currentSession.newPRs.length;
    const topPR = currentSession.newPRs[0];
    const categoryLabel =
      topPR.prCategory === 'max_weight'
        ? 'Heaviest Weight'
        : topPR.prCategory === 'max_reps'
        ? 'Rep Record'
        : topPR.prCategory === 'max_1rm'
        ? 'Strength 1RM'
        : 'New Record';

    return {
      type: 'pr',
      title: prCount === 1 ? 'New Personal Record' : `${prCount} New Personal Records`,
      description: `${topPR.exerciseName}: ${topPR.details || `${topPR.weight} ${unit} × ${topPR.reps} reps`} (${categoryLabel})${
        prCount > 1 ? ` and ${prCount - 1} other record${prCount > 2 ? 's' : ''}` : ''
      }.`,
    };
  }

  // 2. Volume increase vs previous comparable session
  const prevSession = findPreviousComparableSession(currentSession, history);
  if (
    prevSession &&
    typeof prevSession.totalVolume === 'number' &&
    prevSession.totalVolume > 0 &&
    typeof currentSession.totalVolume === 'number' &&
    currentSession.totalVolume > prevSession.totalVolume
  ) {
    const diff = Math.round(currentSession.totalVolume - prevSession.totalVolume);
    const pct = Math.round((diff / prevSession.totalVolume) * 100);

    if (pct >= 2) {
      const prevDate = prevSession.date
        ? new Date(prevSession.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
        : 'last session';

      return {
        type: 'volume_increase',
        title: 'Training Volume Increased',
        description: `Total volume grew by ${pct}% (+${diff.toLocaleString()} ${unit}) compared with your ${
          prevSession.workoutName || 'previous session'
        } on ${prevDate}.`,
      };
    }
  }

  // 3. 100% Planned Exercises Completed
  const totalExercises = Array.isArray(currentSession.exercises)
    ? currentSession.exercises.length
    : 0;
  const completedExercises = Array.isArray(currentSession.exercises)
    ? currentSession.exercises.filter((ex) =>
        ex.sets.some(
          (s) =>
            s.completed &&
            ((s.weight !== null && s.weight > 0) || (s.reps !== null && s.reps > 0))
        )
      ).length
    : 0;

  if (totalExercises > 0 && completedExercises === totalExercises) {
    return {
      type: 'perfect_completion',
      title: '100% Plan Adherence',
      description: `All ${totalExercises} planned exercises were fully completed with verified working sets.`,
    };
  }

  // 4. Solid working set consistency
  if (currentSession.totalSets > 0 && currentSession.totalVolume > 0) {
    return {
      type: 'volume_consistent',
      title: 'Solid Session Volume',
      description: `Logged ${currentSession.totalSets} working sets across ${completedExercises} exercise${
        completedExercises === 1 ? '' : 's'
      } for a total of ${Math.round(currentSession.totalVolume).toLocaleString()} ${unit} lifted.`,
    };
  }

  return null;
}

/**
 * Finds the previous best performance for a specific exercise from history
 */
export function getPreviousExerciseBest(
  exerciseId: string,
  history: WorkoutSession[],
  currentSessionId?: string
): { weight: number; reps: number; date: string } | null {
  if (!history || !Array.isArray(history)) return null;

  let best: { weight: number; reps: number; date: string } | null = null;

  history.forEach((session) => {
    if (session.id === currentSessionId || session.status !== 'completed') return;

    session.exercises?.forEach((ex) => {
      if (ex.exerciseId === exerciseId || ex.id === exerciseId) {
        ex.sets?.forEach((s) => {
          if (s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0) {
            if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
              best = {
                weight: s.weight,
                reps: s.reps,
                date: session.date,
              };
            }
          }
        });
      }
    });
  });

  return best;
}
