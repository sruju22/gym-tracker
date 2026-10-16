import { CombinationType } from '../types';

export interface StageData {
  exerciseId?: string;
  exerciseName?: string;
  movementDescription?: string;
  targetWeight?: number | null;
  targetReps?: number | null;
}

export interface TechniqueSuggestion {
  label: string;
  confidence: 'high' | 'medium' | 'low';
  rationale?: string;
}

/**
 * Recognizes common training patterns and suggests an optional technique name.
 * Defaults to 'Custom Combination' when the pattern is ambiguous or limited.
 */
export const suggestTechnique = (
  stages: StageData[],
  combinationType?: CombinationType
): TechniqueSuggestion => {
  const validStages = stages.filter((s) => Boolean(s.exerciseId || s.exerciseName));

  if (validStages.length < 2) {
    if (combinationType === 'combine_movements') {
      return { label: 'Movement Combination', confidence: 'medium' };
    }
    if (combinationType === 'change_weights') {
      return { label: 'Drop Set', confidence: 'medium' };
    }
    return { label: 'Custom Combination', confidence: 'low' };
  }

  const uniqueExercises = new Set(
    validStages.map((s) => (s.exerciseId || s.exerciseName || '').trim().toLowerCase())
  );

  // Single-exercise multi-stage patterns
  if (uniqueExercises.size === 1) {
    const weights = validStages
      .map((s) => (s.targetWeight !== null && s.targetWeight !== undefined ? Number(s.targetWeight) : null))
      .filter((w): w is number => w !== null);

    const hasMovementDescriptions = validStages.some(
      (s) =>
        s.movementDescription &&
        s.movementDescription.trim() &&
        s.movementDescription.trim().toLowerCase() !== 'full reps'
    );

    // Check for descending weights (Drop Set)
    if (weights.length >= 2) {
      let isStrictlyDecreasing = true;
      for (let i = 1; i < weights.length; i++) {
        if (weights[i] >= weights[i - 1]) {
          isStrictlyDecreasing = false;
          break;
        }
      }
      if (isStrictlyDecreasing) {
        return {
          label: 'Drop Set',
          confidence: 'high',
          rationale: 'Decreasing weight stages across consecutive sets',
        };
      }

      // Check for ascending weights (Pyramid)
      let isStrictlyIncreasing = true;
      for (let i = 1; i < weights.length; i++) {
        if (weights[i] <= weights[i - 1]) {
          isStrictlyIncreasing = false;
          break;
        }
      }
      if (isStrictlyIncreasing) {
        return {
          label: 'Ascending Pyramid',
          confidence: 'high',
          rationale: 'Progressively increasing weight stages',
        };
      }
    }

    if (hasMovementDescriptions || combinationType === 'combine_movements') {
      return {
        label: 'Mechanical Drop Set',
        confidence: 'medium',
        rationale: 'Multiple movement variations of the same exercise',
      };
    }

    if (combinationType === 'change_weights') {
      return { label: 'Drop Set', confidence: 'medium' };
    }

    return { label: 'Movement Combination', confidence: 'medium' };
  }

  // Multi-exercise combination patterns
  if (uniqueExercises.size === 2) {
    return {
      label: 'Superset',
      confidence: 'high',
      rationale: 'Two distinct exercises performed back-to-back',
    };
  }

  if (uniqueExercises.size === 3) {
    return {
      label: 'Tri-Set',
      confidence: 'high',
      rationale: 'Three distinct exercises performed consecutively',
    };
  }

  if (uniqueExercises.size >= 4) {
    return {
      label: 'Giant Set',
      confidence: 'high',
      rationale: 'Four or more exercises performed consecutively',
    };
  }

  return { label: 'Custom Combination', confidence: 'low' };
};

/**
 * Generates a clear, user-friendly default name for the combination
 */
export const generateDefaultCombinationName = (
  stages: StageData[],
  combinationType: CombinationType,
  suggestedLabel: string
): string => {
  const validStages = stages.filter((s) => Boolean(s.exerciseName));

  if (validStages.length === 0) {
    switch (combinationType) {
      case 'combine_exercises':
        return 'Exercise Combination';
      case 'combine_movements':
        return 'Movement Combination';
      case 'change_weights':
        return 'Drop Set';
      default:
        return 'Custom Combination';
    }
  }

  const uniqueNames = Array.from(
    new Set(validStages.map((s) => (s.exerciseName || '').trim()))
  ).filter(Boolean);

  if (uniqueNames.length === 1) {
    const baseName = uniqueNames[0];
    if (suggestedLabel && suggestedLabel !== 'Custom Combination') {
      return `${baseName} ${suggestedLabel}`;
    }
    return `${baseName} Combo`;
  }

  if (uniqueNames.length === 2) {
    return `${uniqueNames[0]} + ${uniqueNames[1]}`;
  }

  if (uniqueNames.length === 3) {
    return `${uniqueNames[0]} + ${uniqueNames[1]} + ${uniqueNames[2]}`;
  }

  return `${uniqueNames[0]} + ${uniqueNames.length - 1} Exercises`;
};
