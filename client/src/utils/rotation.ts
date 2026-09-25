import { Exercise, MuscleGroup, WorkoutSession } from '../types';
import { calculateMuscleCoverage } from './coverage';

export interface ExerciseSuggestion {
  exercise: Exercise;
  reason: string;
  score: number; // Higher is better
}

/**
 * Exercise Rotation Algorithm
 * Evaluates candidate exercises based on:
 * 1. Today's muscle group
 * 2. Uncovered muscle sub-areas (highest weight)
 * 3. Recent usage history (prioritizes unused / least recently used exercises)
 * 4. Frequency balancing
 */
export function getSmartExerciseSuggestions(
  muscleGroup: MuscleGroup,
  currentExercises: Exercise[],
  allExercises: Exercise[],
  pastSessions: WorkoutSession[] = []
): ExerciseSuggestion[] {
  // Candidate pool: exercises matching muscle group, not already selected today
  const candidates = allExercises.filter(
    (ex) =>
      ex.primaryMuscle === muscleGroup &&
      !currentExercises.some((curr) => curr.id === ex.id)
  );

  const coverage = calculateMuscleCoverage(muscleGroup, currentExercises);
  const uncoveredAreas = new Set(
    coverage.areas.filter((a) => !a.covered).map((a) => a.area)
  );

  // Map of exerciseId -> last date performed (ISO timestamp)
  const lastPerformedMap: Record<string, string> = {};
  const frequencyMap: Record<string, number> = {};

  pastSessions.forEach((session) => {
    session.exercises.forEach((workEx) => {
      const id = workEx.exerciseId;
      frequencyMap[id] = (frequencyMap[id] || 0) + 1;
      if (!lastPerformedMap[id] || new Date(session.date) > new Date(lastPerformedMap[id])) {
        lastPerformedMap[id] = session.date;
      }
    });
  });

  const suggestions: ExerciseSuggestion[] = candidates.map((ex) => {
    let score = 50; // Base score
    let reason = 'Solid choice for ' + muscleGroup;

    // Check sub-area coverage priority
    const targetsUncovered = ex.muscleAreaEmphasis.some((area) => uncoveredAreas.has(area));
    if (targetsUncovered) {
      score += 40;
      const targetAreaName = ex.muscleAreaEmphasis
        .filter((a) => uncoveredAreas.has(a))[0]
        .replace(/_/g, ' ');
      reason = `Suggested because you haven't trained ${targetAreaName} yet.`;
    }

    // Check rotation & history
    const lastDate = lastPerformedMap[ex.id];
    if (!lastDate) {
      score += 20;
      if (!targetsUncovered) {
        reason = `Suggested because you haven't used this exercise recently in your ${muscleGroup} sessions.`;
      }
    } else {
      const daysAgo = Math.floor(
        (new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24)
      );
      if (daysAgo >= 7) {
        score += 15;
        if (!targetsUncovered) {
          reason = `Last performed ${daysAgo} days ago — ready for rotation.`;
        }
      } else if (daysAgo < 3) {
        score -= 25; // Reduce priority if used very recently
      }
    }

    // Check frequency balancing
    const count = frequencyMap[ex.id] || 0;
    if (count === 0) score += 10;

    return { exercise: ex, reason, score };
  });

  // Sort descending by score
  return suggestions.sort((a, b) => b.score - a.score);
}
