import { Exercise, MuscleArea } from '../types';

export type LegSectionKey = 'quads' | 'hamstrings' | 'glutes' | 'calves';

/**
 * Determines the primary Leg section ('quads' | 'hamstrings' | 'glutes' | 'calves')
 * for an exercise based on its primary muscle and target area metadata.
 */
export function getLegSection(ex: Exercise): LegSectionKey | null {
  if (!ex) return null;

  // 1. Glutes: primary muscle is glutes OR emphasis includes glutes/glute_max/glute_med
  if (
    ex.primaryMuscle === 'glutes' ||
    (ex.muscleAreaEmphasis && ex.muscleAreaEmphasis.some((a) => ['glutes', 'glute_max', 'glute_med'].includes(a)))
  ) {
    return 'glutes';
  }

  // 2. Calves: primary muscle is calves OR emphasis includes calves/gastrocnemius/soleus
  if (
    ex.primaryMuscle === 'calves' ||
    (ex.muscleAreaEmphasis && ex.muscleAreaEmphasis.some((a) => ['calves', 'gastrocnemius', 'soleus'].includes(a)))
  ) {
    return 'calves';
  }

  // 3. Legs: check hamstrings vs quads
  if (ex.primaryMuscle === 'legs') {
    if (ex.muscleAreaEmphasis && ex.muscleAreaEmphasis.includes('hamstrings')) {
      return 'hamstrings';
    }
    return 'quads';
  }

  // 4. Any other exercise whose primary target emphasis includes hamstrings or quads
  if (ex.muscleAreaEmphasis && ex.muscleAreaEmphasis.includes('hamstrings')) {
    return 'hamstrings';
  }
  if (ex.muscleAreaEmphasis && ex.muscleAreaEmphasis.includes('quads')) {
    return 'quads';
  }

  return null;
}

/**
 * Checks if a given subAreas array or displayName corresponds to a Leg section.
 */
export function isLegSubArea(subAreas?: MuscleArea[], displayName?: string): LegSectionKey | null {
  if (displayName) {
    const lowerName = displayName.toLowerCase();
    if (lowerName === 'quads') return 'quads';
    if (lowerName === 'hamstrings') return 'hamstrings';
    if (lowerName === 'glutes') return 'glutes';
    if (lowerName === 'calves') return 'calves';
  }

  if (subAreas && subAreas.length > 0) {
    for (const area of subAreas) {
      if (area === 'quads') return 'quads';
      if (area === 'hamstrings') return 'hamstrings';
      if (['glutes', 'glute_max', 'glute_med'].includes(area)) return 'glutes';
      if (['calves', 'gastrocnemius', 'soleus'].includes(area)) return 'calves';
    }
  }

  return null;
}
