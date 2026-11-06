import { WorkoutSession, Exercise, WeeklySchedule, EquipmentIncrementSettings } from '../types';
import { evaluateMuscleIntelligence } from './muscleIntelligenceEngine';
import { evaluateAdaptiveDecision } from './adaptiveDecisionEngine';
import { ClientIntelligenceSnapshot } from '../api/coachApi';

interface PrepareClientSnapshotParams {
  history: WorkoutSession[];
  weeklyPlan?: WeeklySchedule | null;
  exercises?: Exercise[];
  equipmentSettings?: EquipmentIncrementSettings;
}

/**
 * Builds a lightweight client-side intelligence snapshot from existing deterministic engines
 * Runs safely in memory and forwards to the server for AI coach grounding.
 */
export function buildClientIntelligenceSnapshot({
  history,
  weeklyPlan,
  exercises = [],
  equipmentSettings,
}: PrepareClientSnapshotParams): ClientIntelligenceSnapshot | undefined {
  try {
    if (!history || history.length === 0) {
      return undefined;
    }

    // 1. Evaluate Muscle Intelligence
    const muscleIntelligence = evaluateMuscleIntelligence({
      history,
      exercises,
      weeklyPlan: weeklyPlan || undefined,
    });

    // 2. Extract readiness states
    const muscleReadiness: Record<string, { state: string; score?: number }> = {};
    for (const group of muscleIntelligence.groups || []) {
      if (group && group.readiness) {
        muscleReadiness[group.muscleGroup] = {
          state: group.readiness.status,
          score: group.readiness.acuteLoadScore,
        };
      }
    }

    // 3. Extract persistent underexposure alerts
    const persistentUnderexposure = (muscleIntelligence.persistentUnderexposureAlerts || [])
      .slice(0, 5)
      .map((alert) => ({
        muscle: alert.muscleGroup,
        subRegion: alert.subArea,
        exposureRatio: alert.averageWeeklyStimulus,
        reason: alert.evidence,
      }));

    // 4. Identify recently trained exercises for adaptive overload targets
    const recentExerciseNames = new Set<string>();
    const completedWorkouts = history
      .filter((w) => w.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    for (const session of completedWorkouts) {
      for (const ex of session.exercises || []) {
        const name = ex.exercise?.name;
        if (name && recentExerciseNames.size < 5) {
          recentExerciseNames.add(name);
        }
      }
    }

    const adaptiveRecommendations: ClientIntelligenceSnapshot['adaptiveRecommendations'] = [];
    const exerciseMap = new Map<string, Exercise>();
    for (const ex of exercises) {
      exerciseMap.set(ex.id, ex);
      exerciseMap.set(ex.name.toLowerCase(), ex);
    }

    for (const name of recentExerciseNames) {
      try {
        const matchedExercise = exerciseMap.get(name.toLowerCase());
        const decision = evaluateAdaptiveDecision({
          exerciseId: matchedExercise?.id || name,
          exerciseName: name,
          exercise: matchedExercise || null,
          history,
          weeklyPlan: weeklyPlan || undefined,
          equipmentSettings,
          precomputedMuscleIntelligence: muscleIntelligence,
          exercises,
        });

        if (decision) {
          adaptiveRecommendations.push({
            exerciseName: name,
            primaryAction: decision.primaryAction,
            targetWeight: decision.targets?.recommendedWeight,
            targetReps: decision.targets?.recommendedReps,
            rationale: decision.primaryRationale,
            reasonCode: decision.primaryReasonCode,
            confidence: decision.confidence,
          });
        }
      } catch {
        // Safe continuation on individual exercise failure
      }
    }

    return {
      muscleReadiness: Object.keys(muscleReadiness).length > 0 ? muscleReadiness : undefined,
      persistentUnderexposure: persistentUnderexposure.length > 0 ? persistentUnderexposure : undefined,
      adaptiveRecommendations: adaptiveRecommendations.length > 0 ? adaptiveRecommendations : undefined,
    };
  } catch (error) {
    console.warn('[CoachContextHelper] Failed to prepare client snapshot:', error);
    return undefined;
  }
}
