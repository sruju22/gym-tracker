import {
  Exercise,
  WorkoutSession,
  WorkoutExercise,
  MuscleGroup,
  MuscleArea,
  WeeklySchedule,
  MuscleContributionTier,
  ExerciseBiomechanicalContribution,
  SubRegionStimulusSummary,
  MuscleIntelligenceGroupReport,
  MuscleIntelligenceSummary,
  MuscleReadinessStatus,
} from '../types';
import { MUSCLE_GROUPS } from '../data/muscleGroups';

// ============================================================================
// STAGE 2: BIOMECHANICAL CONTRIBUTION MODEL & CONFIGURATION
// ============================================================================

/**
 * Biomechanical Contribution Tier Constants (Engineering Heuristics).
 * These are modeled estimates of mechanical tension and joint torque contribution,
 * not direct laboratory EMG activation measurements.
 */
export const CONTRIBUTION_TIERS: Record<MuscleContributionTier, { factor: number; description: string }> = {
  prime: {
    factor: 1.00,
    description: 'Prime target / prime mover receiving full direct tension.',
  },
  major_synergist: {
    factor: 0.75,
    description: 'Heavy compound co-activation across multi-joint compound movement.',
  },
  moderate_synergist: {
    factor: 0.50,
    description: 'Meaningful secondary assistance and joint stabilization.',
  },
  stabilizer: {
    factor: 0.25,
    description: 'Dynamic stabilization, grip holding, or isometric posture maintenance.',
  },
};

/**
 * Centralized, Configurable Recovery & Readiness Thresholds (Engineering Heuristics).
 * These are modeled mechanical load and recovery interval estimates based on completed set volume;
 * NOT biological, medical, or clinical readiness measurements.
 */
export const READINESS_THRESHOLDS = {
  // Acute fatigue: High single-session or 24-hour training volume
  fatiguedAcuteLoadThreshold: 7.0,
  fatigued24hSetsThreshold: 6.0,

  // Recovery: Meaningful acute stimulus undergoing tissue adaptation
  recoveringAcuteLoadThreshold: 3.0,
  // Recent session window (within 36h) requires a minimum acute load to avoid false positives on 1 set
  recoveringRecentHoursThreshold: 36,
  recoveringRecentMinAcuteLoad: 1.5, // e.g. 3 sets @ 24-48h (3 * 0.5 = 1.5) or 2 sets @ <24h (2 * 1.0 = 2.0)

  // Dormant: Muscle is scheduled in user's active split but has had zero direct sessions for >= 14 days
  dormantDaysThreshold: 14,
} as const;

/**
 * Normalizes glute and calf sub-area identifiers for safe compatibility across schemas.
 */
export function normalizeSubArea(sub?: MuscleArea): MuscleArea | undefined {
  if (!sub) return undefined;
  if (sub === 'glute_max' || sub === 'glute_med') return 'glutes';
  if (sub === 'gastrocnemius' || sub === 'soleus') return 'calves';
  return sub;
}

export const STANDARD_MUSCLE_GROUPS: { key: MuscleGroup; name: string }[] = [
  { key: 'chest', name: 'Chest' },
  { key: 'back', name: 'Back' },
  { key: 'shoulders', name: 'Shoulders' },
  { key: 'biceps', name: 'Biceps' },
  { key: 'triceps', name: 'Triceps' },
  { key: 'forearms', name: 'Forearms' },
  { key: 'legs', name: 'Legs' },
  { key: 'glutes', name: 'Glutes' },
  { key: 'calves', name: 'Calves' },
  { key: 'core', name: 'Core' },
];

/**
 * Resolves exercise-specific biomechanical contribution weights.
 * Applies movement pattern analysis to assign nuanced tiers instead of a universal 0.5 multiplier.
 */
export function getExerciseMuscleContributions(
  exercise: Exercise
): ExerciseBiomechanicalContribution[] {
  const contributions: ExerciseBiomechanicalContribution[] = [];
  const primary = exercise.primaryMuscle;
  const secondaries = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
  const emphasis = Array.isArray(exercise.muscleAreaEmphasis) ? exercise.muscleAreaEmphasis : [];
  const name = (exercise.name || '').toLowerCase();
  const isCompound = exercise.exerciseType === 'compound';

  // 1. Prime Target (Direct Prime Mover) = 1.00
  // Each directly emphasized sub-area receives prime target attribution
  if (emphasis.length > 0) {
    for (const area of emphasis) {
      contributions.push({
        muscleGroup: primary,
        subArea: normalizeSubArea(area),
        tier: 'prime',
        factor: CONTRIBUTION_TIERS.prime.factor,
        isDirect: true,
      });
    }
  } else {
    contributions.push({
      muscleGroup: primary,
      tier: 'prime',
      factor: CONTRIBUTION_TIERS.prime.factor,
      isDirect: true,
    });
  }

  // Helper to prevent adding duplicate contributions for the same muscle
  const hasMuscle = (mg: MuscleGroup) => contributions.some((c) => c.muscleGroup === mg);

  // 2. Exercise-Specific Biomechanical Synergist Assignments
  // --- A. Horizontal Push (Bench Press, Push-Ups, Dips) ---
  if (primary === 'chest') {
    const isCloseGrip = name.includes('close') || name.includes('narrow') || name.includes('diamond');
    const isIncline = name.includes('incline');
    const isDecline = name.includes('decline');
    const isDip = name.includes('dip');
    const isFly = name.includes('fly') || name.includes('flye') || name.includes('crossover') || name.includes('pec deck');

    if (isCompound) {
      if (isDip) {
        // Dips heavily recruit both triceps and anterior deltoids
        contributions.push({
          muscleGroup: 'triceps',
          subArea: 'lateral_head_tricep',
          tier: 'major_synergist',
          factor: 0.75,
          isDirect: false,
        });
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'front_delts',
          tier: 'major_synergist',
          factor: 0.70,
          isDirect: false,
        });
      } else if (isCloseGrip) {
        // Close-grip presses shift prime elbow extension torque to triceps
        contributions.push({
          muscleGroup: 'triceps',
          subArea: 'lateral_head_tricep',
          tier: 'major_synergist',
          factor: 0.75,
          isDirect: false,
        });
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'front_delts',
          tier: 'major_synergist',
          factor: 0.70,
          isDirect: false,
        });
      } else if (isIncline) {
        // Incline presses place major moment arm on anterior deltoids
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'front_delts',
          tier: 'major_synergist',
          factor: 0.75,
          isDirect: false,
        });
        contributions.push({
          muscleGroup: 'triceps',
          subArea: 'medial_head_tricep',
          tier: 'moderate_synergist',
          factor: 0.50,
          isDirect: false,
        });
      } else if (isDecline) {
        // Decline presses reduce front delt shear
        contributions.push({
          muscleGroup: 'triceps',
          subArea: 'lateral_head_tricep',
          tier: 'moderate_synergist',
          factor: 0.50,
          isDirect: false,
        });
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'front_delts',
          tier: 'stabilizer',
          factor: 0.25,
          isDirect: false,
        });
      } else {
        // Standard flat compound press
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'front_delts',
          tier: 'major_synergist',
          factor: 0.70,
          isDirect: false,
        });
        contributions.push({
          muscleGroup: 'triceps',
          subArea: 'lateral_head_tricep',
          tier: 'moderate_synergist',
          factor: 0.50,
          isDirect: false,
        });
      }
    } else if (isFly) {
      // Chest flies isolate pec fibers; front delts act as dynamic stabilizers
      contributions.push({
        muscleGroup: 'shoulders',
        subArea: 'front_delts',
        tier: 'stabilizer',
        factor: 0.25,
        isDirect: false,
      });
    }
  }

  // --- B. Vertical Push (Overhead Press, Shoulder Press) ---
  if (primary === 'shoulders') {
    if (isCompound) {
      // Overhead pressing heavily demands triceps elbow extension
      contributions.push({
        muscleGroup: 'triceps',
        subArea: 'medial_head_tricep',
        tier: 'major_synergist',
        factor: 0.70,
        isDirect: false,
      });
      // Clavicular head of pectoralis major (upper chest) assists shoulder flexion
      contributions.push({
        muscleGroup: 'chest',
        subArea: 'upper_chest',
        tier: 'moderate_synergist',
        factor: 0.40,
        isDirect: false,
      });
      // Trapezius upwardly rotates scapula
      contributions.push({
        muscleGroup: 'back',
        subArea: 'traps',
        tier: 'stabilizer',
        factor: 0.25,
        isDirect: false,
      });
    } else if (emphasis.includes('side_delts')) {
      // Lateral raises involve upper traps in scapular stabilization
      contributions.push({
        muscleGroup: 'back',
        subArea: 'traps',
        tier: 'stabilizer',
        factor: 0.20,
        isDirect: false,
      });
    }
  }

  // --- C. Horizontal Pull & Vertical Pull (Rows, Lat Pulldowns, Pull-Ups) ---
  if (primary === 'back') {
    const isVerticalPull = emphasis.includes('lats') || name.includes('pulldown') || name.includes('pull-up') || name.includes('chin-up');
    const isChinUp = name.includes('chin-up') || name.includes('underhand') || name.includes('reverse');

    if (isCompound) {
      // Biceps flexion
      const bicepFactor = isChinUp ? 0.70 : 0.50;
      contributions.push({
        muscleGroup: 'biceps',
        subArea: 'short_head_bicep',
        tier: isChinUp ? 'major_synergist' : 'moderate_synergist',
        factor: bicepFactor,
        isDirect: false,
      });

      // Posterior Deltoid horizontal abduction
      if (!isVerticalPull || name.includes('row')) {
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'rear_delts',
          tier: 'major_synergist',
          factor: 0.70,
          isDirect: false,
        });
      } else {
        contributions.push({
          muscleGroup: 'shoulders',
          subArea: 'rear_delts',
          tier: 'moderate_synergist',
          factor: 0.40,
          isDirect: false,
        });
      }

      // Forearm grip isometric holding
      contributions.push({
        muscleGroup: 'forearms',
        subArea: 'forearm_flexors',
        tier: 'stabilizer',
        factor: 0.25,
        isDirect: false,
      });

      // Free-standing barbell / dumbbell rows demand spinal erector stabilization
      if (exercise.equipment === 'barbell' && name.includes('row') && !name.includes('chest-supported') && !name.includes('seated')) {
        contributions.push({
          muscleGroup: 'back',
          subArea: 'lower_back',
          tier: 'stabilizer',
          factor: 0.25,
          isDirect: false,
        });
      }
    }
  }

  // --- D. Squats & Quad Compounds ---
  if (primary === 'legs' && emphasis.includes('quads')) {
    if (isCompound) {
      // Deep knee and hip flexion heavily loads gluteus maximus
      contributions.push({
        muscleGroup: 'glutes',
        subArea: 'glutes',
        tier: 'major_synergist',
        factor: 0.75,
        isDirect: false,
      });
      // Hamstrings co-contract as hip stabilizers
      contributions.push({
        muscleGroup: 'legs',
        subArea: 'hamstrings',
        tier: 'moderate_synergist',
        factor: 0.40,
        isDirect: false,
      });
      // Calves and core dynamic stabilization
      contributions.push({
        muscleGroup: 'calves',
        subArea: 'calves',
        tier: 'stabilizer',
        factor: 0.25,
        isDirect: false,
      });
    }
  }

  // --- E. Hip Hinges & Posterior Compounds (Deadlifts, RDLs) ---
  if ((primary === 'legs' && emphasis.includes('hamstrings')) || (primary === 'glutes') || (name.includes('deadlift') && primary === 'back')) {
    if (isCompound) {
      if (!hasMuscle('glutes')) {
        contributions.push({
          muscleGroup: 'glutes',
          subArea: 'glutes',
          tier: 'major_synergist',
          factor: 0.75,
          isDirect: false,
        });
      }
      if (!hasMuscle('legs')) {
        contributions.push({
          muscleGroup: 'legs',
          subArea: 'hamstrings',
          tier: 'major_synergist',
          factor: 0.75,
          isDirect: false,
        });
      }
      // Spinal erector / lower back tension
      contributions.push({
        muscleGroup: 'back',
        subArea: 'lower_back',
        tier: 'major_synergist',
        factor: 0.70,
        isDirect: false,
      });
      // Forearms grip in deadlifts
      if (exercise.equipment === 'barbell' || exercise.equipment === 'dumbbell') {
        contributions.push({
          muscleGroup: 'forearms',
          subArea: 'forearm_flexors',
          tier: 'moderate_synergist',
          factor: 0.40,
          isDirect: false,
        });
      }
    }
  }

  // --- F. Triceps & Biceps (Intra-Muscle Head Synergy & Compound Pressing) ---
  if (primary === 'triceps') {
    if (isCompound && (name.includes('bench') || name.includes('press') || name.includes('dip'))) {
      // Compound triceps extension (e.g. Close-Grip Bench Press, Dips) co-activates chest and front delts
      contributions.push({
        muscleGroup: 'chest',
        subArea: 'mid_chest',
        tier: 'major_synergist',
        factor: 0.75,
        isDirect: false,
      });
      contributions.push({
        muscleGroup: 'shoulders',
        subArea: 'front_delts',
        tier: 'major_synergist',
        factor: 0.70,
        isDirect: false,
      });
    }

    // Non-primary triceps heads contribute as synergists
    const nonEmphasized = ['long_head_tricep', 'lateral_head_tricep', 'medial_head_tricep'].filter(
      (h) => !emphasis.includes(h as MuscleArea)
    );
    for (const head of nonEmphasized) {
      contributions.push({
        muscleGroup: 'triceps',
        subArea: head as MuscleArea,
        tier: 'moderate_synergist',
        factor: 0.40,
        isDirect: false,
      });
    }
  }

  if (primary === 'biceps') {
    // Curling movements heavily recruit forearm flexors and brachioradialis
    contributions.push({
      muscleGroup: 'forearms',
      subArea: 'forearm_flexors',
      tier: 'stabilizer',
      factor: 0.25,
      isDirect: false,
    });
    // Non-primary bicep head contributes as intra-bicep synergist
    const otherHead: MuscleArea = emphasis.includes('short_head_bicep') ? 'long_head_bicep' : 'short_head_bicep';
    contributions.push({
      muscleGroup: 'biceps',
      subArea: otherHead,
      tier: 'moderate_synergist',
      factor: 0.40,
      isDirect: false,
    });
  }

  // 3. Fallback / Synergists for secondary muscles in metadata
  // If an exercise is user-created (custom) and the user explicitly assigned secondary muscles,
  // they are user-confirmed synergists (isUncertainMapping: false).
  // If it is a canonical library exercise with unmapped secondaries, it is flagged as an uncertain heuristic fallback.
  for (const sec of secondaries) {
    const secLower = sec.toLowerCase() as MuscleGroup;
    if (!hasMuscle(secLower) && secLower !== primary) {
      const isCustom = Boolean(exercise.isCustom);
      contributions.push({
        muscleGroup: secLower,
        tier: 'moderate_synergist',
        factor: CONTRIBUTION_TIERS.moderate_synergist.factor,
        isDirect: false,
        isUncertainMapping: !isCustom,
      });
    }
  }

  return contributions;
}

// ============================================================================
// STAGE 4 & 5: MULTI-WEEK INTELLIGENCE, RECOVERY & EXPOSURE ENGINE
// ============================================================================

export interface EvaluateMuscleIntelligenceOptions {
  history: WorkoutSession[];
  exercises: Exercise[];
  weeklyPlan?: WeeklySchedule;
  now?: Date;
}

/**
 * Checks whether a single workout set qualifies as a completed working set.
 * Excludes incomplete sets and invalid/empty values.
 * Correctly includes bodyweight sets where weight = 0.
 */
export function isSetQualifying(
  s: { completed: boolean; weight: number | null; reps: number | null },
  exercise?: Exercise
): boolean {
  if (!s || !s.completed) return false;
  if (s.reps === null || s.reps <= 0) return false;
  if (s.weight === null || s.weight < 0) return false;

  const isBw = exercise?.equipment === 'bodyweight' || exercise?.exerciseType === 'bodyweight';
  if (isBw) {
    return s.weight >= 0; // Pure bodyweight (0 kg) or weighted bodyweight (>0 kg)
  }
  return s.weight > 0;
}

/**
 * Counts qualifying completed working sets in a WorkoutExercise.
 */
export function countExerciseQualifyingSets(
  exItem: WorkoutExercise,
  exerciseDef?: Exercise
): number {
  if (!exItem || !Array.isArray(exItem.sets)) return 0;
  let count = 0;
  for (const s of exItem.sets) {
    if (Array.isArray(s.stages) && s.stages.length > 0) {
      for (const st of s.stages) {
        if (isSetQualifying(st, exerciseDef)) count++;
      }
    } else if (isSetQualifying(s, exerciseDef)) {
      count++;
    }
  }
  return count;
}

/**
 * Primary engine function evaluating Muscle Intelligence across 7-day and 28-day rolling windows.
 * Deterministic, purely derived, zero biological overclaims.
 */
export function evaluateMuscleIntelligence(
  options: EvaluateMuscleIntelligenceOptions
): MuscleIntelligenceSummary {
  const { history, exercises, weeklyPlan, now = new Date() } = options;

  const exerciseMap = new Map<string, Exercise>();
  for (const ex of exercises || []) {
    if (ex && ex.id) exerciseMap.set(ex.id, ex);
  }

  // Identify muscles scheduled in the user's active weekly plan
  const scheduledMusclesSet = new Set<MuscleGroup>();
  let activeSplitName = 'Full Body / Custom';

  if (weeklyPlan) {
    const days: (keyof WeeklySchedule)[] = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    ];
    for (const d of days) {
      const cfg = weeklyPlan[d];
      if (cfg && !cfg.isRest && Array.isArray(cfg.muscleGroups)) {
        for (const mg of cfg.muscleGroups) {
          if (mg && mg.name) {
            const lower = mg.name.toLowerCase() as MuscleGroup;
            scheduledMusclesSet.add(lower);
          }
        }
      }
    }
  }

  const completedSessions = (Array.isArray(history) ? history : [])
    .filter((s) => s && s.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime());

  const nowMs = now.getTime();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const MS_PER_HOUR = 1000 * 60 * 60;

  // Window boundaries
  const t7dMs = nowMs - 7 * MS_PER_DAY;
  const t28dMs = nowMs - 28 * MS_PER_DAY;

  // 4 individual rolling weeks for persistent underexposure detection
  const weekBoundaries = [
    { startMs: nowMs - 7 * MS_PER_DAY, endMs: nowMs },
    { startMs: nowMs - 14 * MS_PER_DAY, endMs: nowMs - 7 * MS_PER_DAY },
    { startMs: nowMs - 21 * MS_PER_DAY, endMs: nowMs - 14 * MS_PER_DAY },
    { startMs: nowMs - 28 * MS_PER_DAY, endMs: nowMs - 21 * MS_PER_DAY },
  ];

  interface MuscleAccumulatorInternal {
    directSets7d: number;
    supportedSets7d: number;
    effectiveStimulus7d: number;
    confirmedStimulus7d: number;
    uncertainStimulus7d: number;
    directSets28d: number;
    supportedSets28d: number;
    effectiveStimulus28d: number;
    confirmedStimulus28d: number;
    uncertainStimulus28d: number;
    weeklyDirectSets: number[]; // 4 weeks
    weeklySupportedSets: number[]; // 4 weeks
    lastTrainedDate: Date | null;
    acuteSetsLast24h: number;
    acuteSets24to48h: number;
    acuteSets48to72h: number;
    maxSingleSessionDirectSets: number;
    maxSingleSessionDate: string | null;
    contributingExercises: Set<string>;
    subAreaStats: Map<
      MuscleArea,
      {
        directSets7d: number;
        supportedSets7d: number;
        stimulusScore7d: number;
        confirmedStimulus7d: number;
        uncertainStimulus7d: number;
        directSets28d: number;
        supportedSets28d: number;
        stimulusScore28d: number;
        confirmedStimulus28d: number;
        uncertainStimulus28d: number;
        contributingExercises: Set<string>;
      }
    >;
  }

  const accumulators = new Map<MuscleGroup, MuscleAccumulatorInternal>();
  interface UncertainTrackerItem {
    exerciseId: string;
    exerciseName: string;
    muscleGroup: MuscleGroup;
    factor: number;
    setsRecorded7d: number;
    setsRecorded28d: number;
    estimatedStimulus7d: number;
    estimatedStimulus28d: number;
    reason: string;
  }
  const uncertainMap = new Map<string, UncertainTrackerItem>();

  for (const std of STANDARD_MUSCLE_GROUPS) {
    const subMap = new Map<MuscleArea, any>();
    const meta = MUSCLE_GROUPS[std.key];
    if (meta && Array.isArray(meta.areas)) {
      for (const a of meta.areas) {
        subMap.set(a.id, {
          directSets7d: 0,
          supportedSets7d: 0,
          stimulusScore7d: 0,
          confirmedStimulus7d: 0,
          uncertainStimulus7d: 0,
          directSets28d: 0,
          supportedSets28d: 0,
          stimulusScore28d: 0,
          confirmedStimulus28d: 0,
          uncertainStimulus28d: 0,
          contributingExercises: new Set<string>(),
        });
      }
    }

    accumulators.set(std.key, {
      directSets7d: 0,
      supportedSets7d: 0,
      effectiveStimulus7d: 0,
      confirmedStimulus7d: 0,
      uncertainStimulus7d: 0,
      directSets28d: 0,
      supportedSets28d: 0,
      effectiveStimulus28d: 0,
      confirmedStimulus28d: 0,
      uncertainStimulus28d: 0,
      weeklyDirectSets: [0, 0, 0, 0],
      weeklySupportedSets: [0, 0, 0, 0],
      lastTrainedDate: null,
      acuteSetsLast24h: 0,
      acuteSets24to48h: 0,
      acuteSets48to72h: 0,
      maxSingleSessionDirectSets: 0,
      maxSingleSessionDate: null,
      contributingExercises: new Set<string>(),
      subAreaStats: subMap,
    });
  }

  // Iterate over completed historical workouts
  for (const session of completedSessions) {
    const sDate = new Date(session.completedAt || session.date);
    const sDateMs = sDate.getTime();
    if (isNaN(sDateMs)) continue;

    const hoursAgo = Math.max(0, (nowMs - sDateMs) / MS_PER_HOUR);
    const isWithin7d = sDateMs >= t7dMs && sDateMs <= nowMs;
    const isWithin28d = sDateMs >= t28dMs && sDateMs <= nowMs;

    // Track per-session direct sets for single-session density spike detection
    const sessionDirectSetsByMuscle = new Map<MuscleGroup, number>();

    for (const exItem of session.exercises || []) {
      if (!exItem) continue;
      const exDef =
        (exItem.exerciseId && exerciseMap.get(exItem.exerciseId)) ||
        exItem.exercise;
      if (!exDef) continue;

      const qualifyingSets = countExerciseQualifyingSets(exItem, exDef);
      if (qualifyingSets === 0) continue;

      const contributions = getExerciseMuscleContributions(exDef);

      // Track last trained date
      const primeContribution = contributions.find((c) => c.tier === 'prime');
      if (primeContribution) {
        const primeMuscle = primeContribution.muscleGroup;
        if (accumulators.has(primeMuscle)) {
          const acc = accumulators.get(primeMuscle)!;
          if (!acc.lastTrainedDate || sDateMs > acc.lastTrainedDate.getTime()) {
            acc.lastTrainedDate = sDate;
          }
          acc.contributingExercises.add(exDef.name);
          sessionDirectSetsByMuscle.set(
            primeMuscle,
            (sessionDirectSetsByMuscle.get(primeMuscle) || 0) + qualifyingSets
          );
        }
      }

      // Acute load tracking (past 72 hours)
      if (hoursAgo <= 72) {
        for (const c of contributions) {
          if (accumulators.has(c.muscleGroup)) {
            const acc = accumulators.get(c.muscleGroup)!;
            const weightedSets = qualifyingSets * c.factor;
            if (hoursAgo <= 24) {
              acc.acuteSetsLast24h += weightedSets;
            } else if (hoursAgo <= 48) {
              acc.acuteSets24to48h += weightedSets;
            } else {
              acc.acuteSets48to72h += weightedSets;
            }
          }
        }
      }

      // Rolling week placement (Weeks 1 to 4)
      for (let wIdx = 0; wIdx < weekBoundaries.length; wIdx++) {
        const wb = weekBoundaries[wIdx];
        if (sDateMs >= wb.startMs && sDateMs < wb.endMs) {
          for (const c of contributions) {
            if (accumulators.has(c.muscleGroup)) {
              const acc = accumulators.get(c.muscleGroup)!;
              if (c.isDirect) {
                acc.weeklyDirectSets[wIdx] += qualifyingSets;
              } else {
                acc.weeklySupportedSets[wIdx] += qualifyingSets;
              }
            }
          }
        }
      }

      // 7-day and 28-day window aggregation
      if (isWithin28d) {
        for (const c of contributions) {
          if (accumulators.has(c.muscleGroup)) {
            const acc = accumulators.get(c.muscleGroup)!;
            const stimulus = qualifyingSets * c.factor;
            const isUncertain = Boolean(c.isUncertainMapping);

            if (c.isDirect) {
              acc.directSets28d += qualifyingSets;
              if (isWithin7d) acc.directSets7d += qualifyingSets;
            } else {
              acc.supportedSets28d += qualifyingSets;
              if (isWithin7d) acc.supportedSets7d += qualifyingSets;
            }

            acc.effectiveStimulus28d += stimulus;
            if (isUncertain) {
              acc.uncertainStimulus28d += stimulus;
            } else {
              acc.confirmedStimulus28d += stimulus;
            }

            if (isWithin7d) {
              acc.effectiveStimulus7d += stimulus;
              if (isUncertain) {
                acc.uncertainStimulus7d += stimulus;
              } else {
                acc.confirmedStimulus7d += stimulus;
              }
            }

            // Track detailed uncertain mappings with recorded set exposure
            if (isUncertain) {
              const uKey = `${exDef.id}_${c.muscleGroup}`;
              let uItem = uncertainMap.get(uKey);
              if (!uItem) {
                uItem = {
                  exerciseId: exDef.id,
                  exerciseName: exDef.name,
                  muscleGroup: c.muscleGroup,
                  factor: c.factor,
                  setsRecorded7d: 0,
                  setsRecorded28d: 0,
                  estimatedStimulus7d: 0,
                  estimatedStimulus28d: 0,
                  reason: `Secondary muscle ${c.muscleGroup} lacks explicit biomechanical tier; defaulted to ${c.factor.toFixed(2)} moderate synergist heuristic.`,
                };
                uncertainMap.set(uKey, uItem);
              }
              uItem.setsRecorded28d += qualifyingSets;
              uItem.estimatedStimulus28d = Math.round((uItem.estimatedStimulus28d + stimulus) * 10) / 10;
              if (isWithin7d) {
                uItem.setsRecorded7d += qualifyingSets;
                uItem.estimatedStimulus7d = Math.round((uItem.estimatedStimulus7d + stimulus) * 10) / 10;
              }
            }

            // Sub-region tracking (with normalized glute/calf identifiers)
            const normalizedSub = normalizeSubArea(c.subArea);
            if (normalizedSub && acc.subAreaStats.has(normalizedSub)) {
              const sub = acc.subAreaStats.get(normalizedSub)!;
              sub.contributingExercises.add(exDef.name);

              if (c.isDirect) {
                sub.directSets28d += qualifyingSets;
                if (isWithin7d) sub.directSets7d += qualifyingSets;
              } else {
                sub.supportedSets28d += qualifyingSets;
                if (isWithin7d) sub.supportedSets7d += qualifyingSets;
              }

              sub.stimulusScore28d += stimulus;
              if (isUncertain) {
                sub.uncertainStimulus28d += stimulus;
              } else {
                sub.confirmedStimulus28d += stimulus;
              }

              if (isWithin7d) {
                sub.stimulusScore7d += stimulus;
                if (isUncertain) {
                  sub.uncertainStimulus7d += stimulus;
                } else {
                  sub.confirmedStimulus7d += stimulus;
                }
              }
            }
          }
        }
      }
    }

    // Check single-session density for this completed workout
    for (const [mg, sets] of sessionDirectSetsByMuscle.entries()) {
      if (accumulators.has(mg)) {
        const acc = accumulators.get(mg)!;
        if (sets > acc.maxSingleSessionDirectSets) {
          acc.maxSingleSessionDirectSets = sets;
          acc.maxSingleSessionDate = session.completedAt || session.date;
        }
      }
    }
  }

  // Assemble final report
  const persistentUnderexposureAlerts: MuscleIntelligenceSummary['persistentUnderexposureAlerts'] = [];
  const workloadDensityAlerts: MuscleIntelligenceSummary['workloadDensityAlerts'] = [];

  const groups: MuscleIntelligenceGroupReport[] = STANDARD_MUSCLE_GROUPS.map((std) => {
    const acc = accumulators.get(std.key)!;
    const isScheduled = scheduledMusclesSet.size > 0 ? scheduledMusclesSet.has(std.key) : true;

    const confirmedStimulus7d = Math.round(acc.confirmedStimulus7d * 10) / 10;
    const uncertainStimulus7d = Math.round(acc.uncertainStimulus7d * 10) / 10;
    const effectiveStimulus7d = Math.round((acc.confirmedStimulus7d + acc.uncertainStimulus7d) * 10) / 10;

    const confirmedStimulus28d = Math.round(acc.confirmedStimulus28d * 10) / 10;
    const uncertainStimulus28d = Math.round(acc.uncertainStimulus28d * 10) / 10;
    const effectiveStimulus28d = Math.round((acc.confirmedStimulus28d + acc.uncertainStimulus28d) * 10) / 10;

    const averageWeeklyStimulus28d = Math.round((effectiveStimulus28d / 4) * 10) / 10;
    const confirmedAverageWeeklyStimulus28d = Math.round((confirmedStimulus28d / 4) * 10) / 10;

    const hasUncertainContributions7d = uncertainStimulus7d > 0;
    const hasUncertainContributions28d = uncertainStimulus28d > 0;

    // Sub-region breakdown
    const subRegions: SubRegionStimulusSummary[] = [];
    const meta = MUSCLE_GROUPS[std.key];
    if (meta && Array.isArray(meta.areas)) {
      for (const a of meta.areas) {
        const sub = acc.subAreaStats.get(a.id);
        const d7 = sub ? sub.directSets7d : 0;
        const s7 = sub ? sub.supportedSets7d : 0;
        const stim7 = sub ? Math.round(sub.stimulusScore7d * 10) / 10 : 0;
        const cStim7 = sub ? Math.round(sub.confirmedStimulus7d * 10) / 10 : 0;
        const uStim7 = sub ? Math.round(sub.uncertainStimulus7d * 10) / 10 : 0;

        const d28 = sub ? sub.directSets28d : 0;
        const s28 = sub ? sub.supportedSets28d : 0;
        const stim28 = sub ? Math.round(sub.stimulusScore28d * 10) / 10 : 0;
        const cStim28 = sub ? Math.round(sub.confirmedStimulus28d * 10) / 10 : 0;
        const uStim28 = sub ? Math.round(sub.uncertainStimulus28d * 10) / 10 : 0;

        let status: 'direct' | 'supported' | 'optional' = 'optional';
        if (d28 > 0) status = 'direct';
        else if (s28 > 0) status = 'supported';

        subRegions.push({
          area: a.id,
          displayName: a.name,
          directSets7d: d7,
          supportedSets7d: s7,
          stimulusScore7d: stim7,
          confirmedStimulus7d: cStim7,
          uncertainStimulus7d: uStim7,
          directSets28d: d28,
          supportedSets28d: s28,
          stimulusScore28d: stim28,
          confirmedStimulus28d: cStim28,
          uncertainStimulus28d: uStim28,
          status,
          contributingExercises: sub ? Array.from(sub.contributingExercises) : [],
        });
      }
    }

    // Recovery & Readiness Calculation (Engineering Heuristic)
    let hoursSinceLast: number | null = null;
    let daysSinceLast: number | null = null;

    if (acc.lastTrainedDate) {
      const diffMs = Math.max(0, nowMs - acc.lastTrainedDate.getTime());
      hoursSinceLast = Math.round(diffMs / MS_PER_HOUR);
      daysSinceLast = Math.floor(diffMs / MS_PER_DAY);
    }

    // Acute Load Score: 100% of last 24h + 50% of 24-48h + 20% of 48-72h
    const acuteLoadScore =
      Math.round(
        (acc.acuteSetsLast24h * 1.0 + acc.acuteSets24to48h * 0.5 + acc.acuteSets48to72h * 0.2) * 10
      ) / 10;

    let readinessStatus: MuscleReadinessStatus = 'ready';
    let readinessLabel = 'Ready to Train';
    let readinessExplanation = 'No high-stress training recorded in the past 48 hours. Ready for full working stimulus.';

    // State Priority Ordering:
    // 1. Fatigued: High acute workload (takes highest precedence)
    if (
      acuteLoadScore >= READINESS_THRESHOLDS.fatiguedAcuteLoadThreshold ||
      acc.acuteSetsLast24h >= READINESS_THRESHOLDS.fatigued24hSetsThreshold
    ) {
      readinessStatus = 'fatigued';
      readinessLabel = 'High Acute Fatigue';
      readinessExplanation = `Recent high-density training (${Math.round(acc.acuteSetsLast24h)} sets within 24h, acute load: ${acuteLoadScore}). Allow 24–48h for full readiness before direct loading.`;
    }
    // 2. Recovering: Meaningful active recovery window
    // Requires acuteLoadScore >= 3.0 OR (trained within 36h AND acuteLoadScore >= 1.5)
    // Low-volume 1-set sessions (acuteLoadScore ~0.5) do not falsely trigger recovery.
    else if (
      acuteLoadScore >= READINESS_THRESHOLDS.recoveringAcuteLoadThreshold ||
      (hoursSinceLast !== null &&
        hoursSinceLast <= READINESS_THRESHOLDS.recoveringRecentHoursThreshold &&
        acuteLoadScore >= READINESS_THRESHOLDS.recoveringRecentMinAcuteLoad)
    ) {
      readinessStatus = 'recovering';
      readinessLabel = 'In Recovery Window';
      readinessExplanation = `Trained ${hoursSinceLast}h ago (${Math.round(acc.acuteSetsLast24h + acc.acuteSets24to48h)} recent sets, acute load: ${acuteLoadScore}). Joint and synergist tissues are in standard recovery interval.`;
    }
    // 3. Dormant: No direct training for >= 14 days in scheduled split (and low acute load)
    else if (
      daysSinceLast !== null &&
      daysSinceLast >= READINESS_THRESHOLDS.dormantDaysThreshold &&
      isScheduled
    ) {
      readinessStatus = 'dormant';
      readinessLabel = 'Not Trained Recently';
      readinessExplanation = `Last direct stimulus was ${daysSinceLast} days ago. Restart with comfortable working weights to re-establish technique.`;
    }
    // 4. Ready: Default state (no high acute stress or low-volume single set > 24h ago)
    else {
      readinessStatus = 'ready';
      readinessLabel = 'Ready to Train';
      readinessExplanation = 'No high-stress training recorded in the past 48 hours. Ready for full working stimulus.';
    }

    // Persistent Underexposure Check (28-day Multi-Week Evidence)
    // Rule: Muscle is in active split, averages < 3.0 effective sets/week over 28d, AND at least 2 of 4 weeks had 0 direct sets.
    const weeksWithZeroDirect = acc.weeklyDirectSets.filter((sets) => sets === 0).length;
    const isPersistentlyUnderexposed =
      isScheduled &&
      completedSessions.length >= 3 &&
      averageWeeklyStimulus28d < 3.0 &&
      weeksWithZeroDirect >= 2;

    if (isPersistentlyUnderexposed) {
      persistentUnderexposureAlerts.push({
        target: std.name,
        muscleGroup: std.key,
        averageWeeklyStimulus: averageWeeklyStimulus28d,
        evidence: `${std.name} averaged only ${averageWeeklyStimulus28d} effective sets/week over the last 28 days (${weeksWithZeroDirect} of 4 weeks had 0 direct sets).`,
        recommendation: `Consider scheduling 1–2 direct exercises for ${std.name} to maintain structural balance.`,
      });
    }

    // Compound-Supported Only Check
    const isCompoundSupportedOnly =
      acc.directSets28d === 0 &&
      acc.supportedSets28d >= 8; // At least ~2 supported sets/week

    // Single-Session Density Spike Check (> 10 direct sets in one session)
    const hasSingleSessionDensitySpike = acc.maxSingleSessionDirectSets > 10;
    if (hasSingleSessionDensitySpike && acc.maxSingleSessionDate) {
      const sDateStr = new Date(acc.maxSingleSessionDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      workloadDensityAlerts.push({
        target: std.name,
        sessionDate: acc.maxSingleSessionDate,
        totalSets: acc.maxSingleSessionDirectSets,
        evidence: `Single session on ${sDateStr} contained ${acc.maxSingleSessionDirectSets} direct sets for ${std.name}. Consider distributing volume across 2 sessions for cleaner recovery.`,
      });
    }

    // Explanatory observations
    const observations: string[] = [];
    if (isPersistentlyUnderexposed) {
      observations.push(
        `Persistent Underexposure: Averaged ${averageWeeklyStimulus28d} effective sets/week across 28 days.`
      );
    }
    if (isCompoundSupportedOnly) {
      observations.push(
        'Supported via Compounds: Receives indirect synergist stimulation; direct isolation work is optional.'
      );
    }
    if (hasSingleSessionDensitySpike) {
      observations.push(
        `High Density Session: Up to ${acc.maxSingleSessionDirectSets} direct sets recorded in a single workout.`
      );
    }
    if (acc.directSets7d > 0) {
      observations.push(
        `Current Microcycle: ${acc.directSets7d} direct sets + ${acc.supportedSets7d} supported sets (${effectiveStimulus7d} stimulus score).`
      );
    }

    return {
      muscleGroup: std.key,
      displayName: std.name,
      isScheduledInSplit: isScheduled,
      directSets7d: acc.directSets7d,
      supportedSets7d: acc.supportedSets7d,
      effectiveStimulus7d,
      confirmedStimulus7d,
      uncertainStimulus7d,
      hasUncertainContributions7d,
      directSets28d: acc.directSets28d,
      supportedSets28d: acc.supportedSets28d,
      effectiveStimulus28d,
      confirmedStimulus28d,
      uncertainStimulus28d,
      averageWeeklyStimulus28d,
      confirmedAverageWeeklyStimulus28d,
      hasUncertainContributions28d,
      subRegions,
      readiness: {
        status: readinessStatus,
        label: readinessLabel,
        acuteLoadScore,
        hoursSinceLastTrained: hoursSinceLast,
        daysSinceLastTrained: daysSinceLast,
        explanation: readinessExplanation,
      },
      isPersistentlyUnderexposed,
      isCompoundSupportedOnly,
      hasSingleSessionDensitySpike,
      observations,
      contributingExercises: Array.from(acc.contributingExercises),
    };
  });

  return {
    auditPeriodDays: 28,
    referenceDate: now.toISOString(),
    activeSplitName,
    groups,
    persistentUnderexposureAlerts,
    workloadDensityAlerts,
    uncertainMappings: Array.from(uncertainMap.values()),
  };
}
