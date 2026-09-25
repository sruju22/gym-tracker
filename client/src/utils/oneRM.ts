/**
 * Calculates Estimated 1RM using the Brzycki Formula:
 * 1RM = Weight × (36 / (37 - Reps))
 * Valid for 1 to 12 reps. For reps = 1, returns weight directly.
 */
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 12) {
    // Epley formula alternative for higher reps
    return Math.round(weight * (1 + reps / 30));
  }
  return Math.round(weight * (36 / (37 - reps)));
}

/**
 * Calculates total session volume (Sum of weight * reps for completed sets)
 */
export function calculateVolume(sets: { weight: number | null; reps: number | null; completed: boolean }[]): number {
  return sets.reduce((acc, set) => {
    if (set.completed && set.weight && set.reps) {
      return acc + set.weight * set.reps;
    }
    return acc;
  }, 0);
}

export interface OverloadComparison {
  weightDiff: number;
  repsDiff: number;
  message: string | null;
  isPR: boolean;
}

/**
 * Compares current set against previous performance for progressive overload insights.
 */
export function compareProgressiveOverload(
  currentWeight: number,
  currentReps: number,
  prevWeight: number,
  prevReps: number
): OverloadComparison {
  const weightDiff = currentWeight - prevWeight;
  const repsDiff = currentReps - prevReps;

  let message: string | null = null;
  let isPR = false;

  if (weightDiff > 0) {
    message = `+${weightDiff} kg increase! Excellent progressive overload.`;
    isPR = true;
  } else if (weightDiff === 0 && repsDiff > 0) {
    message = `Rep improvement: +${repsDiff} reps. You may consider increasing weight next session.`;
  } else if (weightDiff === 0 && repsDiff === 0) {
    message = `Matched previous performance (${currentWeight} kg × ${currentReps}).`;
  } else if (weightDiff < 0) {
    message = `Lighter weight used than last time (${prevWeight} kg).`;
  }

  return { weightDiff, repsDiff, message, isPR };
}
