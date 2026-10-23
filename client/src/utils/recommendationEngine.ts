import {
  Exercise,
  MuscleGroup,
  MuscleArea,
  WorkoutSession,
  WorkoutExercise,
  PersonalRecord,
  Equipment,
} from '../types';
import { calculateMuscleCoverage, extractExercise } from './coverage';
import { calculate1RM } from './oneRM';
import { getLegSection, isLegSubArea } from './legSection';
import { getMuscleAreaName } from '../data/muscleGroups';

/**
 * Configurable scoring weights for the Phase 3 Recommendation Engine.
 * All weights are centralized, documented, and normalized to produce a 0 - 100 final score.
 */
export const RECOMMENDATION_WEIGHTS = {
  // Target Muscle & Sub-Area Alignment (Max 40 pts)
  PRIMARY_MUSCLE_MATCH: 25,
  UNCOVERED_SUB_AREA: 15,
  COVERED_SUB_AREA: 5,
  SECONDARY_MUSCLE_MATCH: 5,

  // Fitness Goal Alignment (Max 25 pts)
  GOAL_PRIMARY_MATCH: 20,
  GOAL_SECONDARY_MATCH: 10,
  GOAL_NEUTRAL: 14,

  // Performance Trends & Progressive Overload Baseline (Max 20 pts)
  PERFORMANCE_IMPROVING: 18,
  PERFORMANCE_STABLE: 14,
  PERFORMANCE_DECLINING: 6,
  PERFORMANCE_SINGLE_BASELINE: 12,
  NEW_MOVEMENT_VARIETY: 8,
  HAS_PERSONAL_RECORD: 5,

  // Recency & Rotation Cadence (Max 15 pts)
  ROTATION_SWEET_SPOT_BONUS: 15, // >= 14 days ago
  ROTATION_WEEKLY_CADENCE_BONUS: 12, // 7 - 13 days ago
  ROTATION_MODERATE_BONUS: 6, // 3 - 6 days ago
  ROTATION_TOO_RECENT_PENALTY: -20, // < 3 days ago
  ROTATION_FRESH_NEVER_LOGGED: 12, // never logged in window

  // Equipment Setup Compatibility (Max 10 pts)
  EQUIPMENT_MATCH: 10,
  EQUIPMENT_MISMATCH_PENALTY: -40,

  // Experience Level Appropriateness (-15 to +5 pts)
  EXPERIENCE_APPROPRIATE: 5,
  EXPERIENCE_EXPERT_PENALTY_FOR_BEGINNER: -15,

  // Session Fatigue & Junk Volume Check (-10 pts)
  HIGH_SESSION_VOLUME_PENALTY: -10,

  // Diversity Reranking Adjustments
  DIVERSITY_DUPLICATE_PATTERN_PENALTY: 10,
  DIVERSITY_DUPLICATE_EQUIPMENT_PENALTY: 5,
  DIVERSITY_PROGRESSION_PROTECTION_DISCOUNT: 8,
} as const;

export type MovementPattern =
  | 'horizontal_push'
  | 'incline_push'
  | 'vertical_push'
  | 'chest_fly'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'leg_isolation'
  | 'calf_raise'
  | 'arm_flexion'
  | 'arm_extension'
  | 'shoulder_isolation'
  | 'core_flexion'
  | 'other';

export type PerformanceTrend = 'improving' | 'stable' | 'declining' | 'unknown';

export interface PerformanceAnalysis {
  lastDate: string | null;
  daysAgo: number | null;
  bestWeight: number | null;
  bestReps: number | null;
  estimated1RM: number | null;
  previousWeight: number | null;
  previousReps: number | null;
  previous1RM: number | null;
  trend: PerformanceTrend;
  trendDeltaPercent: number | null;
  trendReason: string;
  sessionCount: number;
  isLimitedData: boolean;
}

export interface RecommendationContext {
  /** Target muscle group for the section or today's session (e.g. 'chest') */
  targetMuscleGroup?: MuscleGroup;
  /** Specific target sub-areas if configured (e.g. ['upper_chest']) */
  targetSubAreas?: MuscleArea[];
  /** Optional section display name (e.g. 'Quads', 'Chest') */
  targetSectionName?: string;
  /** Exercises already selected in today's active or editing workout session */
  currentExercises?: (WorkoutExercise | Exercise)[];
  /** Current workout session ID (ensures workout being edited is not counted as past completed history) */
  currentSessionId?: string;
  /** Complete exercise library (static + custom) */
  allExercises: Exercise[];
  /** Historical completed workout sessions */
  pastSessions?: WorkoutSession[];
  /** User's personal records */
  personalRecords?: PersonalRecord[];
  /** User's chosen fitness goal */
  userGoal?: string;
  /** User's equipment setup preference */
  equipmentPreference?: string;
  /** User's experience level */
  experienceLevel?: string;
  /** Configurable rotation window in days (default: 30) */
  rotationWindowDays?: number;
  /** Maximum number of recommendations to return (default: 5) */
  maxRecommendations?: number;
  /** Optional list of exercise IDs to exclude */
  excludedExerciseIds?: string[];
  /** Toggle diversity-aware reranking (default: true) */
  enableDiversityReranking?: boolean;
}

export interface RecommendationExplanation {
  /** Concise, evidence-based headline explanation from personal trainer perspective */
  primary: string;
  /** Key badges highlighting why this exercise was picked */
  badges: string[];
  /** Detailed objective factors supporting the recommendation */
  factors: {
    muscleMatch: boolean;
    uncoveredSubArea?: string;
    goalAlignment: string;
    equipmentCompatible: boolean;
    historyStatus: 'recent' | 'ready_for_rotation' | 'weekly_cadence' | 'moderate' | 'fresh_novelty';
    daysSinceLastPerformed?: number | null;
    hasPerformanceHistory: boolean;
    lastRecordedPerformance?: string | null;
    performanceTrend: PerformanceTrend;
    trendExplanation?: string;
    movementPattern: MovementPattern;
    hasPR: boolean;
    isLimitedData: boolean;
  };
}

export interface ScoredRecommendation {
  exercise: Exercise;
  score: number; // 0 - 100
  movementPattern: MovementPattern;
  explanation: RecommendationExplanation;
}

/**
 * Classifies an exercise into a biomechanical movement pattern.
 * Uses real metadata: primaryMuscle, name, exerciseType, equipment, muscleAreaEmphasis.
 * 100% deterministic and safe fallback to 'other' if unclassifiable.
 */
export function getMovementPattern(exercise: Exercise): MovementPattern {
  const name = (exercise.name || '').toLowerCase();
  const muscle = exercise.primaryMuscle;
  const isIsolation = exercise.exerciseType === 'isolation';

  if (muscle === 'chest') {
    if (name.includes('fly') || name.includes('flye') || name.includes('butterfly') || name.includes('crossover') || name.includes('pec deck')) {
      return 'chest_fly';
    }
    if (name.includes('incline')) {
      return 'incline_push';
    }
    if (name.includes('press') || name.includes('bench') || name.includes('push-up') || name.includes('push up') || name.includes('dip')) {
      return 'horizontal_push';
    }
    return isIsolation ? 'chest_fly' : 'horizontal_push';
  }

  if (muscle === 'back') {
    if (
      name.includes('pulldown') ||
      name.includes('pull-down') ||
      name.includes('pull-up') ||
      name.includes('pull up') ||
      name.includes('chin-up') ||
      name.includes('chin up') ||
      name.includes('lat pull') ||
      name.includes('pullover') ||
      name.includes('shrug')
    ) {
      return 'vertical_pull';
    }
    if (name.includes('row')) {
      return 'horizontal_pull';
    }
    if (Array.isArray(exercise.muscleAreaEmphasis) && exercise.muscleAreaEmphasis.includes('lats')) {
      return 'vertical_pull';
    }
    return 'horizontal_pull';
  }

  if (muscle === 'shoulders') {
    if (name.includes('press') || name.includes('push') || name.includes('overhead') || name.includes('military')) {
      return 'vertical_push';
    }
    if (name.includes('raise') || name.includes('lateral') || name.includes('face pull') || name.includes('rear delt')) {
      return 'shoulder_isolation';
    }
    return isIsolation ? 'shoulder_isolation' : 'vertical_push';
  }

  if (muscle === 'legs' || muscle === 'glutes' || muscle === 'calves') {
    if (muscle === 'calves' || name.includes('calf') || name.includes('calves')) {
      return 'calf_raise';
    }
    if (name.includes('deadlift') || name.includes('rdl') || name.includes('good morning') || name.includes('hip thrust') || name.includes('bridge') || muscle === 'glutes') {
      return 'hinge';
    }
    if (name.includes('lunge') || name.includes('split squat') || name.includes('step up') || name.includes('step-up')) {
      return 'lunge';
    }
    if (name.includes('curl') || name.includes('extension') || name.includes('adductor') || name.includes('abductor')) {
      return 'leg_isolation';
    }
    if (name.includes('squat') || name.includes('leg press') || name.includes('hack')) {
      return 'squat';
    }
    return isIsolation ? 'leg_isolation' : 'squat';
  }

  if (muscle === 'biceps' || muscle === 'forearms') {
    return 'arm_flexion';
  }

  if (muscle === 'triceps') {
    return 'arm_extension';
  }

  if (muscle === 'core') {
    return 'core_flexion';
  }

  return 'other';
}

export const VALID_MUSCLE_GROUPS = new Set<MuscleGroup>([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'legs',
  'glutes',
  'calves',
  'core',
]);

/**
 * Checks whether an exercise's equipment matches the user's equipment preference setup.
 */
export function isEquipmentCompatible(
  exerciseEquipment: Equipment,
  preference?: string
): boolean {
  if (!preference || preference === 'Full Commercial Gym') {
    return true;
  }

  // If exercise equipment is 'other' or unspecified, treat as neutral rather than penalizing
  if (!exerciseEquipment || exerciseEquipment === 'other') {
    return true;
  }

  const normalized = preference.toLowerCase();

  if (normalized.includes('home gym') || normalized.includes('free weight')) {
    // Free weights setup: barbells, dumbbells, bodyweight, ez_bar, kettlebells, bands
    const allowed: Equipment[] = ['barbell', 'dumbbell', 'bodyweight', 'ez_bar', 'kettlebell', 'bands'];
    return allowed.includes(exerciseEquipment);
  }

  if (normalized.includes('dumbbell') || normalized.includes('band')) {
    const allowed: Equipment[] = ['dumbbell', 'bands', 'bodyweight'];
    return allowed.includes(exerciseEquipment);
  }

  if (normalized.includes('calisthenic') || normalized.includes('bodyweight')) {
    return exerciseEquipment === 'bodyweight';
  }

  return true;
}

/**
 * Normalizes goal string into one of the 4 supported fitness goals.
 */
function normalizeGoal(goal?: string): 'hypertrophy' | 'strength' | 'fat_loss' | 'longevity' | 'unknown' {
  if (!goal) return 'unknown';
  const g = goal.toLowerCase();
  if (g.includes('hypertrophy') || g.includes('muscle building')) return 'hypertrophy';
  if (g.includes('strength') || g.includes('power')) return 'strength';
  if (g.includes('fat loss') || g.includes('conditioning')) return 'fat_loss';
  if (g.includes('general') || g.includes('longevity') || g.includes('fitness')) return 'longevity';
  return 'unknown';
}

/**
 * Analyzes completed historical sessions for a candidate exercise.
 * Extracts:
 * - Recency & usage count
 * - Latest performance (best weight & reps, est 1RM)
 * - Progression trend across comparable sessions (improving, stable, declining, unknown)
 * - Excludes the current session (e.g. workout being edited) so it is not treated as past history.
 */
export function analyzePerformanceHistory(
  exerciseId: string,
  pastSessions: WorkoutSession[],
  cutoffDate?: Date,
  currentSessionId?: string
): PerformanceAnalysis {
  let lastDate: string | null = null;
  let usageCount = 0;

  // Filter completed sessions, excluding active/editing session
  const validSessions = pastSessions
    .filter((s) => {
      if (s.status !== 'completed' || !s.date) return false;
      if (currentSessionId && s.id === currentSessionId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  interface SessionPerf {
    date: string;
    bestWeight: number;
    bestReps: number;
    estimated1RM: number;
    totalVolume: number;
  }

  const comparableSessions: SessionPerf[] = [];

  for (const session of validSessions) {
    if (!Array.isArray(session.exercises)) continue;

    const sessionWorkingSets: { weight: number; reps: number }[] = [];

    for (const exItem of session.exercises) {
      if (!Array.isArray(exItem.sets)) continue;

      const isDirectMatch = exItem.exerciseId === exerciseId || (exItem.exercise && exItem.exercise.id === exerciseId);

      for (const set of exItem.sets) {
        // If set is a superset/combination set containing nested stages:
        if (Array.isArray(set.stages) && set.stages.length > 0) {
          for (const st of set.stages) {
            if (
              st.exerciseId === exerciseId &&
              st.completed &&
              st.weight !== null &&
              st.weight > 0 &&
              st.reps !== null &&
              st.reps > 0
            ) {
              sessionWorkingSets.push({ weight: st.weight, reps: st.reps });
            }
          }
        } else if (isDirectMatch) {
          // Standard standalone exercise set
          if (
            set.completed &&
            set.weight !== null &&
            set.weight > 0 &&
            set.reps !== null &&
            set.reps > 0
          ) {
            sessionWorkingSets.push({ weight: set.weight, reps: set.reps });
          }
        }
      }
    }

    if (sessionWorkingSets.length > 0) {
      usageCount++;
      if (!lastDate) {
        lastDate = session.date;
      }

      const maxWeight = Math.max(...sessionWorkingSets.map((s) => s.weight));
      const bestSet = sessionWorkingSets.find((s) => s.weight === maxWeight) || sessionWorkingSets[0];
      const est1RM = calculate1RM(bestSet.weight, bestSet.reps);
      const vol = sessionWorkingSets.reduce((acc, s) => acc + s.weight * s.reps, 0);

      comparableSessions.push({
        date: session.date,
        bestWeight: bestSet.weight,
        bestReps: bestSet.reps,
        estimated1RM: est1RM,
        totalVolume: vol,
      });
    }
  }

  let daysAgo: number | null = null;
  if (lastDate) {
    const diffMs = Date.now() - new Date(lastDate).getTime();
    daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Determine trend across comparable sessions
  if (comparableSessions.length === 0) {
    return {
      lastDate,
      daysAgo,
      bestWeight: null,
      bestReps: null,
      estimated1RM: null,
      previousWeight: null,
      previousReps: null,
      previous1RM: null,
      trend: 'unknown',
      trendDeltaPercent: null,
      trendReason: 'No previous performance recorded',
      sessionCount: 0,
      isLimitedData: true,
    };
  }

  const latest = comparableSessions[0];

  if (comparableSessions.length === 1) {
    return {
      lastDate,
      daysAgo,
      bestWeight: latest.bestWeight,
      bestReps: latest.bestReps,
      estimated1RM: latest.estimated1RM,
      previousWeight: null,
      previousReps: null,
      previous1RM: null,
      trend: 'unknown',
      trendDeltaPercent: null,
      trendReason: 'Single session recorded — baseline established, awaiting follow-up session',
      sessionCount: 1,
      isLimitedData: false,
    };
  }

  // 2 or more sessions: compare latest (index 0) with previous (index 1)
  const previous = comparableSessions[1];
  const delta1RM = latest.estimated1RM - previous.estimated1RM;
  const deltaPercent = previous.estimated1RM > 0
    ? Math.round((delta1RM / previous.estimated1RM) * 1000) / 10
    : 0;

  let trend: PerformanceTrend = 'stable';
  let trendReason = `Performance stable at ${latest.bestWeight} kg × ${latest.bestReps} reps`;

  // Standard threshold: >= +2% is improving, <= -2% is declining, within [-2%, +2%] is stable
  if (deltaPercent >= 2.0) {
    trend = 'improving';
    trendReason = `Recorded working weight increased from ${previous.bestWeight} kg × ${previous.bestReps} to ${latest.bestWeight} kg × ${latest.bestReps}`;
  } else if (deltaPercent <= -2.0) {
    trend = 'declining';
    trendReason = `Performance lower than previous session (${latest.bestWeight} kg × ${latest.bestReps} vs ${previous.bestWeight} kg × ${previous.bestReps}) — conservative load advised`;
  } else {
    trend = 'stable';
    trendReason = `Consistent performance maintained at ${latest.bestWeight} kg × ${latest.bestReps} across comparable sessions`;
  }

  return {
    lastDate,
    daysAgo,
    bestWeight: latest.bestWeight,
    bestReps: latest.bestReps,
    estimated1RM: latest.estimated1RM,
    previousWeight: previous.bestWeight,
    previousReps: previous.bestReps,
    previous1RM: previous.estimated1RM,
    trend,
    trendDeltaPercent: deltaPercent,
    trendReason,
    sessionCount: comparableSessions.length,
    isLimitedData: false,
  };
}

/**
 * Stage D — Diversity-Aware Reranking.
 * Ensures the top recommendations provide useful biomechanical movement-pattern
 * and equipment variation rather than 5 identical exercises (e.g. 5 flat barbell presses).
 *
 * Rules:
 * - Top pick (#1) is always the highest relevance candidate.
 * - Subsequent slots penalize duplicate movement patterns and equipment already selected in top picks.
 * - Protects exercises with active improving progression or PRs from being penalized excessively.
 * - Preserves target muscle coverage at all times.
 * - Fully deterministic.
 */
export function applyDiversityReranking(
  scoredList: ScoredRecommendation[],
  maxCount: number,
  targetMuscleGroup?: MuscleGroup
): ScoredRecommendation[] {
  if (scoredList.length <= 1) {
    return scoredList;
  }

  const selected: ScoredRecommendation[] = [];
  const remaining = [...scoredList];

  // Slot 1: Highest overall score
  const first = remaining.shift()!;
  selected.push(first);

  const isMultiPatternMuscle =
    !targetMuscleGroup ||
    targetMuscleGroup === 'chest' ||
    targetMuscleGroup === 'back' ||
    targetMuscleGroup === 'legs' ||
    targetMuscleGroup === 'shoulders';

  while (selected.length < maxCount && remaining.length > 0) {
    const selectedPatterns = new Set(selected.map((s) => s.movementPattern));
    const selectedEquipments = new Set(selected.map((s) => s.exercise.equipment));
    const selectedAreas = new Set(selected.flatMap((s) => s.exercise.muscleAreaEmphasis || []));

    // Check if there are still primary candidates available in remaining pool
    const hasRemainingPrimary = targetMuscleGroup
      ? remaining.some((r) => r.exercise.primaryMuscle === targetMuscleGroup)
      : false;

    let bestIdx = 0;
    let bestDiverseScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // If primary candidates still exist, secondary candidates cannot displace them during diversity reranking
      if (targetMuscleGroup && hasRemainingPrimary && candidate.exercise.primaryMuscle !== targetMuscleGroup) {
        continue;
      }

      let diverseScore = candidate.score;

      // Duplicate pattern penalty: only for multi-pattern muscle groups or general sessions
      if (isMultiPatternMuscle) {
        const hasDuplicatePattern = selectedPatterns.has(candidate.movementPattern) && candidate.movementPattern !== 'other';
        if (hasDuplicatePattern) {
          diverseScore -= RECOMMENDATION_WEIGHTS.DIVERSITY_DUPLICATE_PATTERN_PENALTY;
        }
      } else {
        // For single-pattern groups (triceps, biceps, forearms, calves, core):
        // Promote sub-area / head diversity
        const coversNewArea = (candidate.exercise.muscleAreaEmphasis || []).some((a) => !selectedAreas.has(a));
        if (coversNewArea) {
          diverseScore += 6;
        }
      }

      // Equipment diversity
      const hasDuplicateEquip =
        candidate.exercise.equipment &&
        candidate.exercise.equipment !== 'other' &&
        selectedEquipments.has(candidate.exercise.equipment);

      if (hasDuplicateEquip) {
        diverseScore -= RECOMMENDATION_WEIGHTS.DIVERSITY_DUPLICATE_EQUIPMENT_PENALTY;
      }

      // Progression protection: if exercise is actively improving or holds a PR, protect it from heavy diversity penalties
      if (candidate.explanation.factors.performanceTrend === 'improving' || candidate.explanation.factors.hasPR) {
        diverseScore += RECOMMENDATION_WEIGHTS.DIVERSITY_PROGRESSION_PROTECTION_DISCOUNT;
      }

      if (diverseScore > bestDiverseScore) {
        bestDiverseScore = diverseScore;
        bestIdx = i;
      } else if (diverseScore === bestDiverseScore) {
        // Deterministic tie-breaking: baseline first, then alphabetical
        const candHasPerf = candidate.explanation.factors.hasPerformanceHistory ? 1 : 0;
        const bestHasPerf = remaining[bestIdx]?.explanation.factors.hasPerformanceHistory ? 1 : 0;
        if (candHasPerf > bestHasPerf) {
          bestIdx = i;
        } else if (candHasPerf === bestHasPerf) {
          if (candidate.exercise.name.localeCompare(remaining[bestIdx]?.exercise.name || '') < 0) {
            bestIdx = i;
          }
        }
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  return selected;
}

/**
 * Intelligent Exercise Recommendation Engine (Phase 3).
 *
 * Pipeline:
 * Stage A: Hard Eligibility Filtering (Session muscles, unselected exercises, equipment with fallback)
 * Stage B: Goal-Aware Relevance Scoring (Centralized weights, 4 fitness goals, fatigue check)
 * Stage C: Performance & Progression Analysis (Trend calculation: improving, stable, declining, unknown)
 * Stage D: Diversity-Aware Reranking (Movement pattern & equipment balancing, progression protection)
 */
export function getRecommendedExercises(
  context: RecommendationContext
): ScoredRecommendation[] {
  const {
    targetMuscleGroup,
    targetSubAreas,
    targetSectionName,
    currentExercises = [],
    currentSessionId,
    allExercises = [],
    pastSessions = [],
    personalRecords = [],
    userGoal,
    equipmentPreference,
    experienceLevel,
    rotationWindowDays = 30,
    maxRecommendations = 5,
    excludedExerciseIds = [],
    enableDiversityReranking = true,
  } = context;

  // ==========================================
  // STAGE A — ELIGIBILITY FILTERING
  // ==========================================

  // 1. Exclude already selected exercises in today's active/editing session (including combination/superset stages)
  const currentSelectedIds = new Set<string>();
  for (const item of currentExercises) {
    const primaryId = extractExercise(item).id;
    if (primaryId) {
      currentSelectedIds.add(primaryId);
    }
    // Check if exercise contains combination stages
    if ('sets' in item && Array.isArray((item as WorkoutExercise).sets)) {
      for (const set of (item as WorkoutExercise).sets) {
        if (Array.isArray(set.stages)) {
          for (const st of set.stages) {
            if (st.exerciseId) {
              currentSelectedIds.add(st.exerciseId);
            }
          }
        }
      }
    }
  }
  const excludedIds = new Set([...excludedExerciseIds, ...currentSelectedIds]);

  // 2. Target leg section key (Quads, Hamstrings, Glutes, Calves)
  const targetLegKey = isLegSubArea(targetSubAreas, targetSectionName);

  // 3. Filter candidate pool matching target muscle section
  let candidates = allExercises.filter((ex) => {
    if (excludedIds.has(ex.id)) return false;

    // Essential metadata check: Candidate MUST have a valid, recognized primaryMuscle
    // Custom exercises with missing or invalid primaryMuscle are excluded from automated
    // recommendations (they remain accessible via manual search in the All Exercises tab).
    if (
      !ex.primaryMuscle ||
      typeof ex.primaryMuscle !== 'string' ||
      !VALID_MUSCLE_GROUPS.has(ex.primaryMuscle as MuscleGroup)
    ) {
      return false;
    }

    if (targetLegKey) {
      return getLegSection(ex) === targetLegKey;
    }

    if (targetMuscleGroup) {
      const isPrimary = ex.primaryMuscle === targetMuscleGroup;
      const isSecondary = Array.isArray(ex.secondaryMuscles) && ex.secondaryMuscles.includes(targetMuscleGroup);
      return isPrimary || isSecondary;
    }

    return true;
  });

  if (candidates.length === 0) {
    return [];
  }

  // 4. Equipment filter with graceful fallback (never eliminate all choices if equipment is constrained)
  const compatibleCandidates = candidates.filter((ex) =>
    isEquipmentCompatible(ex.equipment, equipmentPreference)
  );

  // If equipment constraint would wipe out all options, preserve candidates with neutral score
  const isEquipmentFallbackActive = compatibleCandidates.length === 0;
  if (!isEquipmentFallbackActive) {
    candidates = compatibleCandidates;
  }

  // ==========================================
  // STAGE B & C — SCORING & PROGRESSION ANALYSIS
  // ==========================================

  const effectiveMuscle = targetMuscleGroup || candidates[0]?.primaryMuscle || 'chest';
  const coverage = calculateMuscleCoverage(effectiveMuscle, currentExercises, targetSubAreas);
  const uncoveredAreas = new Set(coverage.areas.filter((a) => !a.covered).map((a) => a.area));

  // Count existing sets for candidate's primary muscle in today's session
  const currentSessionSetsForMuscle = currentExercises
    .filter((item) => extractExercise(item).primaryMuscle === effectiveMuscle)
    .reduce((acc, item) => {
      if ('sets' in item && Array.isArray((item as WorkoutExercise).sets)) {
        return acc + (item as WorkoutExercise).sets.filter((s) => s.completed).length;
      }
      return acc + 3;
    }, 0);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - rotationWindowDays);

  const prExerciseIds = new Set(personalRecords.map((pr) => pr.exerciseId));
  const goalType = normalizeGoal(userGoal);
  const normalizedExp = (experienceLevel || '').toLowerCase();

  const scoredList: ScoredRecommendation[] = candidates.map((ex) => {
    let score = 0;
    const badges: string[] = [];
    const explanationParts: string[] = [];
    const movementPattern = getMovementPattern(ex);

    // --- Factor 1: Muscle & Sub-Area Alignment ---
    const muscleAreas = Array.isArray(ex.muscleAreaEmphasis) ? ex.muscleAreaEmphasis : [];
    const isPrimaryMatch = ex.primaryMuscle === effectiveMuscle;
    let uncoveredAreaName: string | undefined;

    if (ex.isCustom) {
      badges.push('Custom Exercise');
    }

    if (isPrimaryMatch) {
      score += RECOMMENDATION_WEIGHTS.PRIMARY_MUSCLE_MATCH;

      const targetAreaMatch = muscleAreas.find((area) => uncoveredAreas.has(area));
      if (targetAreaMatch) {
        score += RECOMMENDATION_WEIGHTS.UNCOVERED_SUB_AREA;
        uncoveredAreaName = getMuscleAreaName(targetAreaMatch);
        badges.push(`Covers ${uncoveredAreaName}`);
        explanationParts.push(`Targets your scheduled ${effectiveMuscle} and covers the ${uncoveredAreaName} head.`);
      } else {
        score += RECOMMENDATION_WEIGHTS.COVERED_SUB_AREA;
        explanationParts.push(`Matches your scheduled ${effectiveMuscle} workout.`);
      }
    } else {
      score += RECOMMENDATION_WEIGHTS.SECONDARY_MUSCLE_MATCH;
      badges.push(`Secondary ${effectiveMuscle}`);
      explanationParts.push(`Engages ${effectiveMuscle} as a key supporting muscle group.`);
    }

    // --- Factor 2: Fitness Goal Alignment ---
    let goalAlignmentText = 'General training suitability';

    if (goalType === 'hypertrophy') {
      if (!isPrimaryMatch) {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
        goalAlignmentText = `Compound movement providing secondary ${effectiveMuscle} engagement`;
      } else if (ex.exerciseType === 'compound' || ex.muscleAreaEmphasis.length > 0) {
        score += RECOMMENDATION_WEIGHTS.GOAL_PRIMARY_MATCH;
        badges.push('Hypertrophy Focus');
        goalAlignmentText = 'Hypertrophy-focused volume & localized tension';
      } else {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
      }
    } else if (goalType === 'strength') {
      if (!isPrimaryMatch) {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
        goalAlignmentText = `Compound movement providing secondary ${effectiveMuscle} engagement`;
      } else if (ex.exerciseType === 'compound' && (ex.equipment === 'barbell' || ex.equipment === 'dumbbell')) {
        score += RECOMMENDATION_WEIGHTS.GOAL_PRIMARY_MATCH;
        badges.push('Strength Compound');
        goalAlignmentText = 'Core compound movement for strength & power';
      } else if (ex.exerciseType === 'compound') {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH + 5;
        badges.push('Compound Movement');
        goalAlignmentText = 'Multi-joint movement supporting power progression';
      } else if (
        effectiveMuscle === 'triceps' ||
        effectiveMuscle === 'biceps' ||
        effectiveMuscle === 'forearms' ||
        effectiveMuscle === 'calves' ||
        effectiveMuscle === 'core'
      ) {
        // Direct targeted loading for arm / isolation muscle groups
        score += RECOMMENDATION_WEIGHTS.GOAL_PRIMARY_MATCH - 3;
        badges.push('Strength Focus');
        goalAlignmentText = 'Direct progressive overload for targeted strength';
      } else {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
      }
    } else if (goalType === 'fat_loss') {
      if (!isPrimaryMatch) {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
        goalAlignmentText = `Compound movement providing secondary ${effectiveMuscle} engagement`;
      } else if (ex.exerciseType === 'compound' || ex.equipment === 'bodyweight' || ex.equipment === 'dumbbell') {
        score += RECOMMENDATION_WEIGHTS.GOAL_PRIMARY_MATCH;
        badges.push('Conditioning Match');
        goalAlignmentText = 'High metabolic demand & caloric expenditure';
      } else {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
      }
    } else if (goalType === 'longevity') {
      if (!isPrimaryMatch) {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
        goalAlignmentText = `Compound movement providing secondary ${effectiveMuscle} engagement`;
      } else if (ex.difficulty !== 'expert' && (ex.equipment === 'dumbbell' || ex.equipment === 'cable' || ex.equipment === 'bodyweight')) {
        score += RECOMMENDATION_WEIGHTS.GOAL_PRIMARY_MATCH;
        badges.push('Joint-Friendly Mobility');
        goalAlignmentText = 'Functional movement supporting mobility and joint health';
      } else {
        score += RECOMMENDATION_WEIGHTS.GOAL_SECONDARY_MATCH;
      }
    } else {
      score += RECOMMENDATION_WEIGHTS.GOAL_NEUTRAL;
    }

    // --- Factor 3 & 4: Performance Trends & Recency Analysis ---
    const perf = analyzePerformanceHistory(ex.id, pastSessions, cutoffDate, currentSessionId);
    const hasPR = prExerciseIds.has(ex.id);
    let historyStatus: RecommendationExplanation['factors']['historyStatus'] = 'fresh_novelty';
    let lastPerformanceStr: string | null = null;

    if (perf.lastDate !== null && perf.daysAgo !== null) {
      if (perf.daysAgo < 3) {
        score += RECOMMENDATION_WEIGHTS.ROTATION_TOO_RECENT_PENALTY;
        historyStatus = 'recent';
        badges.push('Trained Recently');
      } else if (perf.daysAgo >= 14) {
        score += RECOMMENDATION_WEIGHTS.ROTATION_SWEET_SPOT_BONUS;
        historyStatus = 'ready_for_rotation';
        badges.push('Ready for Rotation');
      } else if (perf.daysAgo >= 7) {
        score += RECOMMENDATION_WEIGHTS.ROTATION_WEEKLY_CADENCE_BONUS;
        historyStatus = 'weekly_cadence';
        badges.push('Weekly Cadence');
      } else {
        score += RECOMMENDATION_WEIGHTS.ROTATION_MODERATE_BONUS;
        historyStatus = 'moderate';
      }

      // Performance trend scoring
      if (perf.trend === 'improving') {
        score += RECOMMENDATION_WEIGHTS.PERFORMANCE_IMPROVING;
        badges.push('Progression: Improving');
        explanationParts.push(perf.trendReason + '.');
      } else if (perf.trend === 'stable') {
        score += RECOMMENDATION_WEIGHTS.PERFORMANCE_STABLE;
        badges.push('Progression: Stable');
        explanationParts.push(perf.trendReason + '.');
      } else if (perf.trend === 'declining') {
        score += RECOMMENDATION_WEIGHTS.PERFORMANCE_DECLINING;
        badges.push('Progression: Deload / Caution');
        explanationParts.push(perf.trendReason + '.');
      } else if (perf.bestWeight !== null && perf.bestReps !== null) {
        // Single session baseline
        score += RECOMMENDATION_WEIGHTS.PERFORMANCE_SINGLE_BASELINE;
        badges.push('Baseline Logged');
        lastPerformanceStr = `${perf.bestWeight} kg × ${perf.bestReps} reps`;
        explanationParts.push(`Logged baseline: ${lastPerformanceStr} (est. 1RM ${perf.estimated1RM} kg).`);
      }

      if (perf.bestWeight !== null && !lastPerformanceStr) {
        lastPerformanceStr = `${perf.bestWeight} kg × ${perf.bestReps} reps`;
      }

      if (hasPR) {
        score += RECOMMENDATION_WEIGHTS.HAS_PERSONAL_RECORD;
        badges.push('PR Recorded');
      }
    } else {
      // Fresh exercise - never performed in window
      score += RECOMMENDATION_WEIGHTS.ROTATION_FRESH_NEVER_LOGGED;
      score += RECOMMENDATION_WEIGHTS.NEW_MOVEMENT_VARIETY;
      historyStatus = 'fresh_novelty';
      badges.push('First Time in Rotation');
      explanationParts.push('First time in recent rotation — ideal opportunity to establish a starting baseline.');
    }

    // --- Factor 5: Equipment Compatibility ---
    const equipOk = isEquipmentCompatible(ex.equipment, equipmentPreference);
    if (equipOk) {
      score += RECOMMENDATION_WEIGHTS.EQUIPMENT_MATCH;
      if (equipmentPreference && equipmentPreference !== 'Full Commercial Gym') {
        badges.push('Gear Compatible');
      }
    } else if (!isEquipmentFallbackActive) {
      score += RECOMMENDATION_WEIGHTS.EQUIPMENT_MISMATCH_PENALTY;
    }

    // --- Factor 6: Experience Level Appropriateness ---
    if (normalizedExp.includes('beginner')) {
      if (ex.difficulty === 'beginner') {
        score += RECOMMENDATION_WEIGHTS.EXPERIENCE_APPROPRIATE;
      } else if (ex.difficulty === 'expert') {
        score += RECOMMENDATION_WEIGHTS.EXPERIENCE_EXPERT_PENALTY_FOR_BEGINNER;
      }
    } else if (normalizedExp.includes('intermediate')) {
      if (ex.difficulty === 'beginner' || ex.difficulty === 'intermediate') {
        score += RECOMMENDATION_WEIGHTS.EXPERIENCE_APPROPRIATE;
      }
    } else if (normalizedExp.includes('advanced')) {
      score += RECOMMENDATION_WEIGHTS.EXPERIENCE_APPROPRIATE;
    }

    // --- Factor 7: Session Fatigue Check ---
    if (currentSessionSetsForMuscle >= 6 && isPrimaryMatch) {
      score += RECOMMENDATION_WEIGHTS.HIGH_SESSION_VOLUME_PENALTY;
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let primaryExplanation = explanationParts.join(' ');
    if (!primaryExplanation) {
      primaryExplanation = `Recommended for your ${effectiveMuscle} session based on movement pattern suitability.`;
    }

    const explanation: RecommendationExplanation = {
      primary: primaryExplanation,
      badges: Array.from(new Set(badges)).slice(0, 3),
      factors: {
        muscleMatch: isPrimaryMatch,
        uncoveredSubArea: uncoveredAreaName,
        goalAlignment: goalAlignmentText,
        equipmentCompatible: equipOk || isEquipmentFallbackActive,
        historyStatus,
        daysSinceLastPerformed: perf.daysAgo,
        hasPerformanceHistory: perf.bestWeight !== null,
        lastRecordedPerformance: lastPerformanceStr,
        performanceTrend: perf.trend,
        trendExplanation: perf.trendReason,
        movementPattern,
        hasPR,
        isLimitedData: perf.isLimitedData,
      },
    };

    return {
      exercise: ex,
      score: finalScore,
      movementPattern,
      explanation,
    };
  });

  // Sort initially by relevance score descending
  const sorted = scoredList.sort((a, b) => {
    // When a specific target muscle group is selected, prioritize direct primary matches over secondary matches
    if (targetMuscleGroup) {
      const aIsPrimary = a.exercise.primaryMuscle === targetMuscleGroup ? 1 : 0;
      const bIsPrimary = b.exercise.primaryMuscle === targetMuscleGroup ? 1 : 0;
      if (aIsPrimary !== bIsPrimary) {
        return bIsPrimary - aIsPrimary;
      }
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aHasPerf = a.explanation.factors.hasPerformanceHistory ? 1 : 0;
    const bHasPerf = b.explanation.factors.hasPerformanceHistory ? 1 : 0;
    if (bHasPerf !== aHasPerf) {
      return bHasPerf - aHasPerf;
    }
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  // ==========================================
  // STAGE D — DIVERSITY-AWARE RERANKING
  // ==========================================
  if (enableDiversityReranking) {
    return applyDiversityReranking(sorted, maxRecommendations, targetMuscleGroup);
  }

  return sorted.slice(0, maxRecommendations);
}
