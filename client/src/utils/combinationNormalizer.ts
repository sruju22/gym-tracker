import { WorkoutExercise, WorkoutSet, WorkoutSetStage } from '../types';

/**
 * Normalizes an array of WorkoutExercise items to ensure all combinations follow the
 * "Sets contain stages" data model.
 *
 * Backward-compatible handling:
 * If an older session had multiple WorkoutExercise objects sharing the same combinationId
 * (where each stage was a separate WorkoutExercise containing sets), this automatically
 * converts them into a single WorkoutExercise where each WorkoutSet contains all configured stages.
 */
export function normalizeCombinationExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return [];
  }

  const result: WorkoutExercise[] = [];
  const processedComboIds = new Set<string>();

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];

    // If it's not a combination, keep as is
    if (!ex.combinationId) {
      result.push(ex);
      continue;
    }

    // If already processed as part of a grouped legacy combination, skip
    if (processedComboIds.has(ex.combinationId)) {
      continue;
    }

    // Check if it already has nested stages inside sets
    const alreadyNested = ex.sets && ex.sets.some((s) => Array.isArray(s.stages) && s.stages.length > 0);
    if (alreadyNested) {
      result.push(ex);
      continue;
    }

    // It is a legacy combination with multiple WorkoutExercise items sharing combinationId
    const comboGroup = exercises.filter((item) => item.combinationId === ex.combinationId);
    processedComboIds.add(ex.combinationId);

    // Sort stages by stageOrder
    comboGroup.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));

    // Determine the number of sets/rounds (maximum sets across component exercises)
    const setRoundsCount = Math.max(...comboGroup.map((item) => (item.sets ? item.sets.length : 0)), 1);

    const mergedSets: WorkoutSet[] = [];

    for (let sIdx = 0; sIdx < setRoundsCount; sIdx++) {
      const setNumber = sIdx + 1;
      const stages: WorkoutSetStage[] = comboGroup.map((item, stageIdx) => {
        const itemSet = item.sets && item.sets[sIdx];
        const isCompleted = itemSet ? Boolean(itemSet.completed) : false;

        return {
          id: `stage_${setNumber}_${item.stageOrder || stageIdx + 1}_${item.id}`,
          stageOrder: item.stageOrder || stageIdx + 1,
          exerciseId: item.exerciseId || item.exercise.id,
          exerciseName: item.exercise.name,
          movementDescription: item.stageDescription || undefined,
          targetWeight: itemSet?.weight ?? null,
          targetReps: itemSet?.reps ?? null,
          weight: itemSet?.weight ?? null,
          reps: itemSet?.reps ?? null,
          completed: isCompleted,
        };
      });

      const allStagesCompleted = stages.length > 0 && stages.every((st) => st.completed);

      mergedSets.push({
        id: `set_${ex.combinationId}_${setNumber}`,
        setNumber,
        weight: null,
        reps: null,
        completed: allStagesCompleted,
        stages,
      });
    }

    const mergedExercise: WorkoutExercise = {
      id: ex.id,
      exerciseId: ex.exerciseId,
      exercise: ex.exercise,
      order: ex.order,
      notes: ex.notes || '',
      combinationId: ex.combinationId,
      combinationName: ex.combinationName || 'Custom Combination',
      combinationType: ex.combinationType,
      techniqueLabel: ex.techniqueLabel,
      completed: mergedSets.every((s) => s.completed),
      sets: mergedSets,
    };

    result.push(mergedExercise);
  }

  return result;
}
