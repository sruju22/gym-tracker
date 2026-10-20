import { Exercise, MuscleGroup, WorkoutSession } from '../types';
import {
  getRecommendedExercises,
  ScoredRecommendation,
  RecommendationContext,
  RecommendationExplanation,
  RECOMMENDATION_WEIGHTS,
} from './recommendationEngine';

export interface ExerciseSuggestion {
  exercise: Exercise;
  reason: string;
  score: number; // Higher is better (0 - 100)
  explanation?: RecommendationExplanation;
}

/**
 * Exercise Rotation Algorithm (Upgraded Phase 2 Recommendation Engine Adapter)
 * Evaluates candidate exercises based on:
 * 1. Today's target muscle group and uncovered sub-areas
 * 2. Fitness goal alignment
 * 3. Recent usage history & rotation cadence
 * 4. Logged previous performance for progressive overload tracking
 * 5. Equipment setup compatibility
 */
export function getSmartExerciseSuggestions(
  muscleGroup: MuscleGroup,
  currentExercises: Exercise[],
  allExercises: Exercise[],
  pastSessions: WorkoutSession[] = [],
  userGoal?: string,
  equipmentPreference?: string
): ExerciseSuggestion[] {
  const recommendations: ScoredRecommendation[] = getRecommendedExercises({
    targetMuscleGroup: muscleGroup,
    currentExercises,
    allExercises,
    pastSessions,
    userGoal,
    equipmentPreference,
    maxRecommendations: 10,
  });

  return recommendations.map((rec) => ({
    exercise: rec.exercise,
    score: rec.score,
    reason: rec.explanation.primary,
    explanation: rec.explanation,
  }));
}

export {
  getRecommendedExercises,
  RECOMMENDATION_WEIGHTS,
};
export type {
  ScoredRecommendation,
  RecommendationContext,
  RecommendationExplanation,
};
