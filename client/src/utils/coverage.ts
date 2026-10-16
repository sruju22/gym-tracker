import { Exercise, WorkoutExercise, MuscleGroup, MuscleArea, MuscleGroupCoverage, CoverageItem } from '../types';
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
    return workoutEx.sets.some(
      (s) => Boolean(s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0)
    );
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
 * Calculates muscle sub-area coverage for a given muscle group / section based on a set of exercises.
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

    const coveringExercises = qualifyingExercises
      .filter((ex) => getLegSection(ex) === legKey)
      .map((ex) => ex.name);

    const uniqueExercises = Array.from(new Set(coveringExercises));

    const item: CoverageItem = {
      area: legKey as MuscleArea,
      displayName: legNames[legKey] || legKey,
      covered: uniqueExercises.length > 0,
      exercises: uniqueExercises,
    };

    return {
      muscleGroup,
      areas: [item],
      totalAreas: 1,
      coveredAreas: item.covered ? 1 : 0,
    };
  }

  const meta = MUSCLE_GROUPS[muscleGroup];
  if (!meta) {
    return {
      muscleGroup,
      areas: [],
      totalAreas: 0,
      coveredAreas: 0,
    };
  }

  // Filter area definitions if explicit targetSubAreas are provided
  const targetAreaDefs = targetSubAreas && targetSubAreas.length > 0
    ? meta.areas.filter((a) => targetSubAreas.includes(a.id))
    : meta.areas;

  // Filter exercises relevant to this section
  const mgExercises = qualifyingExercises.filter((ex) => {
    if (targetSubAreas && targetSubAreas.length > 0) {
      return ex.muscleAreaEmphasis.some((area) => targetSubAreas.includes(area));
    }
    return ex.primaryMuscle === muscleGroup || (ex.secondaryMuscles && ex.secondaryMuscles.includes(muscleGroup));
  });

  const areas: CoverageItem[] = targetAreaDefs.map((areaDef) => {
    const coveringExercises = mgExercises
      .filter((ex) => ex.muscleAreaEmphasis.includes(areaDef.id))
      .map((ex) => ex.name);

    const uniqueExercises = Array.from(new Set(coveringExercises));

    return {
      area: areaDef.id,
      displayName: areaDef.name,
      covered: uniqueExercises.length > 0,
      exercises: uniqueExercises,
    };
  });

  const coveredAreas = areas.filter((a) => a.covered).length;

  return {
    muscleGroup,
    areas,
    totalAreas: areas.length,
    coveredAreas,
  };
}

/**
 * Detects missing muscle areas for a given muscle group section and returns suggested exercises from library.
 */
export function getMissingAreaSuggestions(
  muscleGroup: MuscleGroup,
  selectedExercises: (WorkoutExercise | Exercise)[],
  allExercises: Exercise[],
  targetSubAreas?: MuscleArea[]
): { missingArea: MuscleArea; missingAreaName: string; suggestedExercises: Exercise[] }[] {
  const coverage = calculateMuscleCoverage(muscleGroup, selectedExercises, targetSubAreas);
  const uncovered = coverage.areas.filter((a) => !a.covered);

  const existingIds = new Set(selectedExercises.map((item) => extractExercise(item).id));

  return uncovered.map((areaItem) => {
    // Find exercises in the library that target this missing area
    const matchingExercises = allExercises.filter(
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
