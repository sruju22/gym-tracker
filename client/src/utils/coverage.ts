import { Exercise, WorkoutExercise, MuscleGroup, MuscleArea, MuscleGroupCoverage, CoverageItem, CoverageStatus } from '../types';
import { MUSCLE_GROUPS } from '../data/muscleGroups';
import { getLegSection, isLegSubArea } from './legSection';

/**
 * Checks whether an exercise item has at least one valid, recorded set.
 * Valid set rules:
 * - set.completed must be true
 * - weight must be non-null and > 0
 * - reps must be non-null and > 0
 * Empty sets, untouched default values, invalid entries, and exercises with no completed sets
 * return false.
 */
export function hasValidRecordedSet(item: WorkoutExercise | Exercise): boolean {
  if ('sets' in item && Array.isArray((item as WorkoutExercise).sets)) {
    const workoutEx = item as WorkoutExercise;
    return workoutEx.sets.some((s) => {
      if (Array.isArray(s.stages) && s.stages.length > 0) {
        return s.stages.some(
          (st) => Boolean(st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0)
        );
      }
      return Boolean(s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0);
    });
  }
  // Plain Exercise without sets array (e.g. from static library / planning utils)
  return true;
}

/**
 * Extracts the core Exercise definition from a WorkoutExercise or Exercise object.
 */
export function extractExercise(item: WorkoutExercise | Exercise): Exercise {
  return 'exercise' in item ? (item as WorkoutExercise).exercise : (item as Exercise);
}

/**
 * Determines whether an exercise provides direct or meaningful compound-supported
 * involvement for a specific muscle sub-area.
 */
export function getExerciseAreaInvolvement(
  ex: Exercise,
  area: MuscleArea,
  muscleGroup: MuscleGroup
): 'direct' | 'supported' | 'none' {
  const emphasis = Array.isArray(ex.muscleAreaEmphasis) ? ex.muscleAreaEmphasis : [];
  const secondaries = Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [];
  const isCompound = ex.exerciseType === 'compound';

  // 1. Direct involvement: the exercise explicitly targets this sub-area
  if (emphasis.includes(area)) {
    return 'direct';
  }

  // 2. Compound-Aware Secondary & Overlapping Involvement:
  // --- A. Chest Overlap ---
  if (muscleGroup === 'chest') {
    // If a horizontal or incline compound press is performed, sternocostal / lower pectoral fibers
    // receive meaningful compound stimulation even if mid_chest is the primary tag.
    if (area === 'lower_chest' && isCompound && ex.primaryMuscle === 'chest') {
      if (emphasis.includes('mid_chest') || emphasis.includes('upper_chest')) {
        return 'supported';
      }
    }
  }

  // --- B. Deltoids (Shoulders) Overlap ---
  if (muscleGroup === 'shoulders') {
    // Anterior deltoids (front_delts) receive heavy compound loading in horizontal and incline chest presses
    if (area === 'front_delts' && isCompound && ex.primaryMuscle === 'chest' && secondaries.includes('shoulders')) {
      return 'supported';
    }
    // Lateral deltoids (side_delts) act as prime stabilizers in compound overhead pressing
    if (area === 'side_delts' && isCompound && ex.primaryMuscle === 'shoulders') {
      return 'supported';
    }
    // Posterior deltoids (rear_delts) receive heavy tension in compound horizontal and vertical back pulls/rows
    if (area === 'rear_delts' && isCompound && ex.primaryMuscle === 'back' && secondaries.includes('shoulders')) {
      return 'supported';
    }
  }

  // --- C. Triceps Overlap ---
  if (muscleGroup === 'triceps') {
    // Lateral and medial triceps heads act as primary elbow extensors in compound chest and shoulder presses
    if ((area === 'lateral_head_tricep' || area === 'medial_head_tricep') && isCompound && (ex.primaryMuscle === 'chest' || ex.primaryMuscle === 'shoulders') && secondaries.includes('triceps')) {
      return 'supported';
    }
  }

  // --- D. Biceps Overlap ---
  if (muscleGroup === 'biceps') {
    // Biceps brachii acts as primary elbow flexor in compound back rows and vertical pull-downs
    if ((area === 'long_head_bicep' || area === 'short_head_bicep') && isCompound && ex.primaryMuscle === 'back' && secondaries.includes('biceps')) {
      return 'supported';
    }
  }

  // --- E. Back Sub-Areas Overlap ---
  if (muscleGroup === 'back') {
    if (area === 'traps' && isCompound && (ex.primaryMuscle === 'back' || ex.primaryMuscle === 'shoulders')) {
      return 'supported';
    }
    if (area === 'lower_back' && isCompound && (ex.primaryMuscle === 'back' || ex.primaryMuscle === 'legs')) {
      return 'supported';
    }
  }

  // --- F. Legs / Glutes / Calves Overlap ---
  if (muscleGroup === 'legs' || muscleGroup === 'glutes') {
    if (area === 'glutes' && isCompound && (ex.primaryMuscle === 'legs' || secondaries.includes('glutes'))) {
      return 'supported';
    }
    if (area === 'hamstrings' && isCompound && ex.primaryMuscle === 'legs' && emphasis.includes('quads')) {
      return 'supported';
    }
  }

  return 'none';
}

/**
 * Calculates muscle sub-area coverage for a given muscle group / section based on a set of exercises.
 * Evaluates both direct targeting and compound secondary support.
 * Only exercises with at least one valid, recorded set contribute to coverage.
 */
export function calculateMuscleCoverage(
  muscleGroup: MuscleGroup,
  selectedExercises: (WorkoutExercise | Exercise)[],
  targetSubAreas?: MuscleArea[]
): MuscleGroupCoverage {
  // Filter only qualifying exercises with at least one valid, recorded set
  const qualifyingItems = selectedExercises.filter(hasValidRecordedSet);
  const qualifyingExercises = qualifyingItems.map(extractExercise);

  const legKey = isLegSubArea(targetSubAreas);

  if (legKey) {
    const legNames: Record<string, string> = {
      quads: 'Quads',
      hamstrings: 'Hamstrings',
      glutes: 'Glutes',
      calves: 'Calves',
    };

    const directExercises = qualifyingExercises
      .filter((ex) => getLegSection(ex) === legKey)
      .map((ex) => ex.name);

    // Supporting exercises (e.g. squats supporting glutes/hamstrings)
    const supportingExercises = qualifyingExercises
      .filter((ex) => {
        if (directExercises.includes(ex.name)) return false;
        if (legKey === 'glutes' && ex.exerciseType === 'compound' && ex.primaryMuscle === 'legs') return true;
        if (legKey === 'hamstrings' && ex.exerciseType === 'compound' && ex.primaryMuscle === 'legs') return true;
        return false;
      })
      .map((ex) => ex.name);

    const uniqueDirect = Array.from(new Set(directExercises));
    const uniqueSupporting = Array.from(new Set(supportingExercises));

    let status: CoverageStatus = 'optional';
    if (uniqueDirect.length > 0) {
      status = 'direct';
    } else if (uniqueSupporting.length > 0) {
      status = 'supported';
    }

    const item: CoverageItem = {
      area: legKey as MuscleArea,
      displayName: legNames[legKey] || legKey,
      covered: status === 'direct' || status === 'supported',
      status,
      exercises: uniqueDirect,
      supportingExercises: uniqueSupporting,
      directSets: uniqueDirect.length,
      supportingSets: uniqueSupporting.length,
    };

    return {
      muscleGroup,
      areas: [item],
      totalAreas: 1,
      coveredAreas: item.covered ? 1 : 0,
      directCount: status === 'direct' ? 1 : 0,
      supportedCount: status === 'supported' ? 1 : 0,
      optionalCount: status === 'optional' ? 1 : 0,
    };
  }

  const meta = MUSCLE_GROUPS[muscleGroup];
  if (!meta) {
    return {
      muscleGroup,
      areas: [],
      totalAreas: 0,
      coveredAreas: 0,
      directCount: 0,
      supportedCount: 0,
      optionalCount: 0,
    };
  }

  // Filter area definitions if explicit targetSubAreas are provided
  const targetAreaDefs = targetSubAreas && targetSubAreas.length > 0
    ? meta.areas.filter((a) => targetSubAreas.includes(a.id))
    : meta.areas;

  const areas: CoverageItem[] = targetAreaDefs.map((areaDef) => {
    const directNames: string[] = [];
    const supportingNames: string[] = [];

    for (const ex of qualifyingExercises) {
      const involvement = getExerciseAreaInvolvement(ex, areaDef.id, muscleGroup);
      if (involvement === 'direct') {
        directNames.push(ex.name);
      } else if (involvement === 'supported') {
        supportingNames.push(ex.name);
      }
    }

    const uniqueDirect = Array.from(new Set(directNames));
    const uniqueSupporting = Array.from(new Set(supportingNames)).filter((name) => !uniqueDirect.includes(name));

    let status: CoverageStatus = 'optional';
    if (uniqueDirect.length > 0) {
      status = 'direct';
    } else if (uniqueSupporting.length > 0) {
      status = 'supported';
    }

    return {
      area: areaDef.id,
      displayName: areaDef.name,
      covered: status === 'direct' || status === 'supported',
      status,
      exercises: uniqueDirect,
      supportingExercises: uniqueSupporting,
      directSets: uniqueDirect.length,
      supportingSets: uniqueSupporting.length,
    };
  });

  const directCount = areas.filter((a) => a.status === 'direct').length;
  const supportedCount = areas.filter((a) => a.status === 'supported').length;
  const optionalCount = areas.filter((a) => a.status === 'optional').length;
  const coveredAreas = areas.filter((a) => a.covered).length;

  return {
    muscleGroup,
    areas,
    totalAreas: areas.length,
    coveredAreas,
    directCount,
    supportedCount,
    optionalCount,
  };
}

/**
 * Detects missing muscle areas for a given muscle group section and returns suggested exercises from library.
 * Only areas with status 'optional' (neither direct nor compound-supported) qualify as missing.
 */
export function getMissingAreaSuggestions(
  muscleGroup: MuscleGroup,
  selectedExercises: (WorkoutExercise | Exercise)[],
  allExercises: Exercise[] = [],
  targetSubAreas?: MuscleArea[]
): { missingArea: MuscleArea; missingAreaName: string; suggestedExercises: Exercise[] }[] {
  const coverage = calculateMuscleCoverage(muscleGroup, selectedExercises, targetSubAreas);
  const uncovered = coverage.areas.filter((a) => a.status === 'optional');

  const existingIds = new Set(selectedExercises.map((item) => extractExercise(item).id));
  const exerciseList = Array.isArray(allExercises) ? allExercises : [];

  return uncovered.map((areaItem) => {
    // Find exercises in the library that target this missing area
    const matchingExercises = exerciseList.filter(
      (ex) =>
        ex.muscleAreaEmphasis.includes(areaItem.area) &&
        !existingIds.has(ex.id)
    );

    return {
      missingArea: areaItem.area,
      missingAreaName: areaItem.displayName,
      suggestedExercises: matchingExercises,
    };
  });
}
