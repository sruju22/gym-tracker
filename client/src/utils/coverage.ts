import { Exercise, MuscleGroup, MuscleArea, MuscleGroupCoverage, CoverageItem } from '../types';
import { MUSCLE_GROUPS } from '../data/muscleGroups';
import { getLegSection, isLegSubArea } from './legSection';

/**
 * Calculates muscle sub-area coverage for a given muscle group / section based on a set of selected exercises.
 */
export function calculateMuscleCoverage(
  muscleGroup: MuscleGroup,
  selectedExercises: Exercise[],
  targetSubAreas?: MuscleArea[]
): MuscleGroupCoverage {
  const legKey = isLegSubArea(targetSubAreas);

  if (legKey) {
    const legNames: Record<string, string> = {
      quads: 'Quads',
      hamstrings: 'Hamstrings',
      glutes: 'Glutes',
      calves: 'Calves',
    };

    const coveringExercises = selectedExercises
      .filter((ex) => getLegSection(ex) === legKey)
      .map((ex) => ex.name);

    const item: CoverageItem = {
      area: legKey as MuscleArea,
      displayName: legNames[legKey],
      covered: coveringExercises.length > 0,
      exercises: coveringExercises,
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
  const mgExercises = selectedExercises.filter((ex) => {
    if (targetSubAreas && targetSubAreas.length > 0) {
      return ex.muscleAreaEmphasis.some((area) => targetSubAreas.includes(area));
    }
    return ex.primaryMuscle === muscleGroup || ex.secondaryMuscles.includes(muscleGroup);
  });

  const areas: CoverageItem[] = targetAreaDefs.map((areaDef) => {
    const coveringExercises = mgExercises
      .filter((ex) => ex.muscleAreaEmphasis.includes(areaDef.id))
      .map((ex) => ex.name);

    return {
      area: areaDef.id,
      displayName: areaDef.name,
      covered: coveringExercises.length > 0,
      exercises: coveringExercises,
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
  selectedExercises: Exercise[],
  allExercises: Exercise[],
  targetSubAreas?: MuscleArea[]
): { missingArea: MuscleArea; missingAreaName: string; suggestedExercises: Exercise[] }[] {
  const coverage = calculateMuscleCoverage(muscleGroup, selectedExercises, targetSubAreas);
  const uncovered = coverage.areas.filter((a) => !a.covered);

  return uncovered.map((areaItem) => {
    // Find exercises in the library that target this missing area
    const matchingExercises = allExercises.filter(
      (ex) =>
        ex.muscleAreaEmphasis.includes(areaItem.area) &&
        !selectedExercises.some((selected) => selected.id === ex.id)
    );

    return {
      missingArea: areaItem.area,
      missingAreaName: areaItem.displayName,
      suggestedExercises: matchingExercises,
    };
  });
}
