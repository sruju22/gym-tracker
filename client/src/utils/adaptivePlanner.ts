import {
  Exercise,
  MuscleGroup,
  MuscleArea,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  WeeklySchedule,
  DayOfWeek,
  PersonalRecord,
  MuscleGroupConfig,
  DayConfig,
  ExerciseType,
} from '../types';
import {
  getRecommendedExercises,
  isEquipmentCompatible,
} from './recommendationEngine';
import {
  getMuscleGroupCoverageAnalytics,
  getExerciseStrengthProgression,
  derivePersonalRecords,
  filterCompletedSessions,
} from './analyticsEngine';
import { parseLocalDate, getTodayDayOfWeek } from './formatters';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ModificationType =
  | 'retained'
  | 'prioritized'
  | 'alternative'
  | 'underrepresented_coverage';

export type SuggestionStatus = 'suggested' | 'accepted' | 'rejected';

export interface AdaptivePlanEvidence {
  daysSinceLastTrained?: number | null;
  pastSessionsCount: number;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  trendDeltaPercent?: number | null;
  bestWeight?: number | null;
  bestReps?: number | null;
  estimated1RM?: number | null;
  hasPR: boolean;
  directSetsLast30Days?: number;
  muscleCoverageDirectSets?: number;
}

export interface AdaptiveExerciseItem {
  id: string;
  exercise: Exercise;
  targetMuscle: MuscleGroup;
  targetSubAreas?: MuscleArea[];
  sectionDisplayName: string;
  defaultSets: number;
  defaultReps: number;
  targetRpe?: number;
  isBaseline: boolean;
  originalExercise?: Exercise;
  modificationType: ModificationType;
  status: SuggestionStatus;
  score: number;
  badges: string[];
  reason: string;
  evidence: AdaptivePlanEvidence;
}

export interface AdaptiveWorkoutPlan {
  dayOfWeek: DayOfWeek;
  workoutName: string;
  targetMuscles: MuscleGroup[];
  sections: MuscleGroupConfig[];
  isRest: boolean;
  items: AdaptiveExerciseItem[];
  baselineExercises: Exercise[];
  modificationsCount: number;
  generatedAt: string;
  summaryNotes: string[];
}

export interface AdaptivePlannerContext {
  dayOfWeek?: DayOfWeek;
  dayConfig?: DayConfig;
  allExercises: Exercise[];
  history?: WorkoutSession[];
  personalRecords?: PersonalRecord[];
  fitnessGoal?: string;
  experienceLevel?: string;
  equipmentPreference?: string;
  weeklyPlan?: WeeklySchedule;
  activeTemplateId?: string;
  existingActiveExercises?: (WorkoutExercise | Exercise)[];
  now?: Date;
  targetSessionId?: string;
}

// ============================================================================
// HELPER LOGIC: SET / REP GUIDELINES BY FITNESS GOAL
// ============================================================================

export function getGoalSetRepGuidance(
  fitnessGoal?: string,
  exerciseType?: ExerciseType
): { sets: number; reps: number; rpe: number } {
  const goalLower = (fitnessGoal || '').toLowerCase();
  const isCompound = exerciseType === 'compound';

  if (goalLower.includes('strength') || goalLower.includes('power')) {
    if (isCompound) {
      return { sets: 4, reps: 5, rpe: 8 };
    }
    return { sets: 3, reps: 8, rpe: 8 };
  }

  if (goalLower.includes('fat') || goalLower.includes('loss') || goalLower.includes('conditioning')) {
    return { sets: 3, reps: 12, rpe: 8 };
  }

  if (goalLower.includes('longevity') || goalLower.includes('joint')) {
    return { sets: 3, reps: 12, rpe: 7 };
  }

  // Default: Hypertrophy / Muscle Building
  if (isCompound) {
    return { sets: 4, reps: 8, rpe: 8 };
  }
  return { sets: 3, reps: 10, rpe: 8 };
}

// ============================================================================
// CORE ENGINE: GENERATE ADAPTIVE WORKOUT PLAN
// ============================================================================

export function generateAdaptiveWorkoutPlan(
  context: AdaptivePlannerContext
): AdaptiveWorkoutPlan {
  const now = context.now || new Date();
  const history = context.history || [];
  const allExercises = context.allExercises || [];
  const weeklyPlan = context.weeklyPlan;
  const targetDay = context.dayOfWeek || getTodayDayOfWeek();
  const dayConfig =
    context.dayConfig || (weeklyPlan && weeklyPlan[targetDay]);

  const existingActive = context.existingActiveExercises || [];
  const existingActiveIds = new Set<string>();
  for (const item of existingActive) {
    if (!item) continue;
    if ('exercise' in item && item.exercise && item.exercise.id) {
      existingActiveIds.add(item.exercise.id);
    } else if ('id' in item && item.id) {
      existingActiveIds.add(item.id);
    }
    // Also check combination stages if present
    const workEx = item as WorkoutExercise;
    if (workEx.sets) {
      for (const set of workEx.sets) {
        if (set.stages) {
          for (const st of set.stages) {
            if (st.exerciseId) existingActiveIds.add(st.exerciseId);
          }
        }
      }
    }
  }

  // 1. Check for Rest Day
  if (!dayConfig || dayConfig.isRest) {
    return {
      dayOfWeek: targetDay,
      workoutName: dayConfig?.name || 'Rest & Recovery Day',
      targetMuscles: [],
      sections: [],
      isRest: true,
      items: [],
      baselineExercises: [],
      modificationsCount: 0,
      generatedAt: now.toISOString(),
      summaryNotes: ['Today is scheduled as a rest and recovery day.'],
    };
  }

  const sections = dayConfig.muscleGroups || [];
  const targetMuscles = sections.map((s) => s.name);
  const userGoal = context.fitnessGoal || 'Muscle Building & Hypertrophy';
  const equipmentPref = context.equipmentPreference;
  const experienceLevel = context.experienceLevel || 'intermediate';

  // 2. Fetch Muscle Group Coverage from Phase 4A Analytics
  const coverageAnalytics = getMuscleGroupCoverageAnalytics(
    history,
    allExercises,
    '30d',
    weeklyPlan,
    now
  );
  const coverageMap = new Map<MuscleGroup, (typeof coverageAnalytics)[0]>();
  for (const c of coverageAnalytics) {
    coverageMap.set(c.muscleGroup, c);
  }

  // 3. Derived PRs for evidence
  const derivedPrMap = new Map<string, PersonalRecord>();
  if (context.personalRecords && context.personalRecords.length > 0) {
    for (const pr of context.personalRecords) {
      if (pr && pr.exerciseId) {
        derivedPrMap.set(pr.exerciseId, pr);
      }
    }
  } else {
    const derivedList = derivePersonalRecords(history, allExercises);
    for (const d of derivedList) {
      if (d && d.exerciseId) {
        derivedPrMap.set(d.exerciseId, {
          id: `pr_${d.exerciseId}`,
          exerciseId: d.exerciseId,
          exerciseName: d.exerciseName,
          type: 'max_weight',
          value: d.maxWeight.value,
          weight: d.maxWeight.value,
          reps: d.maxReps.reps,
          estimated1RM: d.max1RM.estimated1RM,
          date: d.maxWeight.date,
        });
      }
    }
  }

  // 4. Trace recent history for duplicate rotation checks (past 3 days) and frequency
  const completedSessions = filterCompletedSessions(history, 'desc');
  const recentExerciseUsage = new Map<
    string,
    { daysAgo: number; date: string; sessionId: string }
  >();
  const historyFrequencyMap = new Map<string, number>();

  for (const sess of completedSessions) {
    const sessDate = parseLocalDate(sess.completedAt || sess.date);
    const validDate = !isNaN(sessDate.getTime());
    const diffDays = validDate
      ? Math.max(0, Math.floor((now.getTime() - sessDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 999;

    for (const exItem of sess.exercises || []) {
      const exId = exItem.exerciseId || exItem.exercise?.id;
      if (!exId) continue;
      historyFrequencyMap.set(exId, (historyFrequencyMap.get(exId) || 0) + 1);

      if (validDate && !recentExerciseUsage.has(exId)) {
        recentExerciseUsage.set(exId, {
          daysAgo: diffDays,
          date: sess.completedAt || sess.date,
          sessionId: sess.id,
        });
      }
      // Also inspect superset stages
      if (exItem.sets) {
        for (const set of exItem.sets) {
          if (set.stages) {
            for (const st of set.stages) {
              if (st.exerciseId) {
                historyFrequencyMap.set(st.exerciseId, (historyFrequencyMap.get(st.exerciseId) || 0) + 1);
                if (validDate && !recentExerciseUsage.has(st.exerciseId)) {
                  recentExerciseUsage.set(st.exerciseId, {
                    daysAgo: diffDays,
                    date: sess.completedAt || sess.date,
                    sessionId: sess.id,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // 5. Build Baseline Plan & Adaptations Per Section
  const baselineExercises: Exercise[] = [];
  const adaptiveItems: AdaptiveExerciseItem[] = [];
  const summaryNotes: string[] = [];
  const usedExerciseIds = new Set<string>(existingActiveIds);

  // Allocate slots per section (e.g. 2 for main muscle, 1-2 for others)
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const targetMuscle = sec.name;
    const targetSubAreas = sec.subAreas;

    const coverage = coverageMap.get(targetMuscle);
    const daysSinceTrained = coverage?.daysSinceLastTrained ?? null;
    const directSets = coverage?.directSets ?? 0;
    const isUnderrepresented =
      daysSinceTrained === null || daysSinceTrained >= 7 || directSets === 0;

    // Filter available exercises for this section matching target muscle
    const sectionCandidates = allExercises.filter((ex) => {
      if (!ex || !ex.id) return false;
      const exPrimary = (ex.primaryMuscle || '').toLowerCase();
      const targetStr = (targetMuscle as string).toLowerCase();
      if (exPrimary === targetStr) return true;
      if (
        (targetStr === 'legs' && (exPrimary === 'quads' || exPrimary === 'hamstrings')) ||
        (exPrimary === 'legs' && (targetStr === 'quads' || targetStr === 'hamstrings'))
      ) {
        return true;
      }
      return false;
    });

    if (sectionCandidates.length === 0) {
      continue;
    }

    // Determine target slot count for this section
    let targetSlots = sec.exerciseCount || (sections.length <= 2 ? 2 : sIdx === 0 ? 2 : 1);
    if (isUnderrepresented && targetSlots === 1 && sectionCandidates.length >= 2) {
      targetSlots = 2; // Increase volume for neglected muscle group
    }

    // Baseline candidate selection (prefer compound movements, equipment compatible)
    const compatibleCandidates = sectionCandidates.filter((ex) =>
      isEquipmentCompatible(ex.equipment, equipmentPref)
    );
    const pool = compatibleCandidates.length > 0 ? compatibleCandidates : sectionCandidates;

    // Sort baseline pool by history frequency, progression momentum/PR, compound priority, then name
    const sortedBaselinePool = [...pool].sort((a, b) => {
      // 1. Prioritize user's established historical exercises
      const aFreq = historyFrequencyMap.get(a.id) || 0;
      const bFreq = historyFrequencyMap.get(b.id) || 0;
      if (bFreq !== aFreq) return bFreq - aFreq;

      // 2. Prioritize exercises with PRs or progression records
      const aHasPr = derivedPrMap.has(a.id) ? 1 : 0;
      const bHasPr = derivedPrMap.has(b.id) ? 1 : 0;
      if (bHasPr !== aHasPr) return bHasPr - aHasPr;

      // 3. Prefer compound movements first
      const aCompound = a.exerciseType === 'compound' ? 1 : 0;
      const bCompound = b.exerciseType === 'compound' ? 1 : 0;
      if (bCompound !== aCompound) return bCompound - aCompound;

      // 4. Stable alphabetical tie-breaker
      return (a.name || '').localeCompare(b.name || '');
    });

    // Pick baseline exercises for this section without duplicates
    const sectionBaselineExs: Exercise[] = [];
    for (const cand of sortedBaselinePool) {
      if (!usedExerciseIds.has(cand.id)) {
        sectionBaselineExs.push(cand);
        usedExerciseIds.add(cand.id);
        baselineExercises.push(cand);
        if (sectionBaselineExs.length >= targetSlots) break;
      }
    }

    // If still empty and candidates exist, pick from pool ignoring usedExerciseIds
    // ONLY if not already in baselineExercises
    if (sectionBaselineExs.length === 0 && sortedBaselinePool.length > 0) {
      const fallback = sortedBaselinePool.find((c) => !baselineExercises.some((b) => b.id === c.id));
      if (fallback) {
        sectionBaselineExs.push(fallback);
        usedExerciseIds.add(fallback.id);
        baselineExercises.push(fallback);
      }
    }

    // Now evaluate adaptive modifications for each baseline exercise slot
    for (const baseEx of sectionBaselineExs) {
      // Analyze progression and history
      const progression = getExerciseStrengthProgression(history, baseEx.id, baseEx.name);
      const recentUsage = recentExerciseUsage.get(baseEx.id);
      const prRecord = derivedPrMap.get(baseEx.id);

      // Check recency: Was this exercise performed within the last 3 days?
      const wasPerformedRecently = recentUsage !== undefined && recentUsage.daysAgo < 3;

      // Check progression trend
      const isDeclining = progression.trend === 'declining';
      const isImproving = progression.trend === 'improving';

      let chosenExercise = baseEx;
      let modificationType: ModificationType = 'retained';
      let status: SuggestionStatus = 'accepted';
      let badges: string[] = [];
      let reason = '';

      if (wasPerformedRecently) {
        // Find an alternative that was NOT performed recently
        const alternativeCandidates = getRecommendedExercises({
          targetMuscleGroup: targetMuscle,
          targetSubAreas,
          allExercises,
          pastSessions: history,
          personalRecords: context.personalRecords,
          userGoal,
          equipmentPreference: equipmentPref,
          experienceLevel,
          excludedExerciseIds: Array.from(usedExerciseIds),
          maxRecommendations: 3,
        });

        const validAlt = alternativeCandidates.find(
          (rec) => rec.exercise.id !== baseEx.id && !usedExerciseIds.has(rec.exercise.id)
        );

        if (validAlt) {
          chosenExercise = validAlt.exercise;
          usedExerciseIds.delete(baseEx.id);
          usedExerciseIds.add(chosenExercise.id);
          modificationType = 'alternative';
          status = 'suggested';
          badges = ['Rotation Alternative', 'Recovery Buffer', ...validAlt.explanation.badges];
          reason = `${baseEx.name} was performed ${recentUsage.daysAgo} day(s) ago (${recentUsage.date.slice(0, 10)}). Suggested ${chosenExercise.name} to rotate movement pattern and promote recovery.`;
          summaryNotes.push(
            `Rotated ${baseEx.name} → ${chosenExercise.name} due to session recency (${recentUsage.daysAgo}d ago).`
          );
        } else {
          // No alternative found, retain with note
          modificationType = 'retained';
          badges = ['Recent Session'];
          reason = `Retained: ${baseEx.name} was performed ${recentUsage.daysAgo} day(s) ago, but remains the best available option for ${sec.displayName}.`;
        }
      } else if (isDeclining) {
        // Declining trend: Suggest an alternative movement to reset stimulus or deload
        const alternativeCandidates = getRecommendedExercises({
          targetMuscleGroup: targetMuscle,
          targetSubAreas,
          allExercises,
          pastSessions: history,
          personalRecords: context.personalRecords,
          userGoal,
          equipmentPreference: equipmentPref,
          experienceLevel,
          excludedExerciseIds: Array.from(usedExerciseIds),
          maxRecommendations: 3,
        });

        const validAlt = alternativeCandidates.find(
          (rec) => rec.exercise.id !== baseEx.id && !usedExerciseIds.has(rec.exercise.id)
        );

        if (validAlt) {
          chosenExercise = validAlt.exercise;
          usedExerciseIds.delete(baseEx.id);
          usedExerciseIds.add(chosenExercise.id);
          modificationType = 'alternative';
          status = 'suggested';
          badges = ['Progression Reset', 'Alternative Stimulus', ...validAlt.explanation.badges];
          const deltaStr =
            progression.trendDeltaPercent !== null
              ? `${progression.trendDeltaPercent}%`
              : 'declining';
          reason = `${baseEx.name} showed declining performance (${deltaStr} over recent sessions). Suggested ${chosenExercise.name} to sustain volume with an alternative stimulus.`;
          summaryNotes.push(
            `Suggested alternative ${chosenExercise.name} for ${baseEx.name} due to declining load (${deltaStr}).`
          );
        } else {
          modificationType = 'retained';
          badges = ['Progression: Deload / Caution'];
          reason = `Retained: ${baseEx.name} showed declining trend (${progression.trendDeltaPercent}%). Maintain conservative load.`;
        }
      } else if (isUnderrepresented) {
        modificationType = 'underrepresented_coverage';
        status = 'suggested';
        const daysText =
          daysSinceTrained !== null ? `${daysSinceTrained} days` : 'over 30 days';
        badges = ['Neglected Area Focus', 'Volume Priority'];
        reason = `${sec.displayName} has not been trained in ${daysText} (${directSets} direct sets recorded in last 30 days). Prioritizing ${baseEx.name} to restore stimulus.`;
        summaryNotes.push(
          `Prioritized ${sec.displayName} (${daysText} since last trained, 0 direct sets recently).`
        );
      } else if (isImproving || (prRecord && prRecord.estimated1RM)) {
        modificationType = 'prioritized';
        status = 'accepted';
        const deltaText =
          progression.trendDeltaPercent !== null
            ? `+${progression.trendDeltaPercent}%`
            : 'improving';
        const prText = prRecord ? ` (PR est. 1RM: ${prRecord.estimated1RM} kg)` : '';
        badges = ['Progression: Improving', 'Overload Momentum'];
        reason = `Retained with priority: ${baseEx.name} has active progression momentum (${deltaText}${prText}).`;
        summaryNotes.push(
          `Progression momentum active on ${baseEx.name} (${deltaText}).`
        );
      } else {
        // Steady standard baseline
        modificationType = 'retained';
        status = 'accepted';
        badges = ['Scheduled Baseline'];
        reason = `Scheduled baseline exercise for ${sec.displayName} aligned with ${userGoal}.`;
      }

      // Determine recommended sets and reps
      const guidance = getGoalSetRepGuidance(userGoal, chosenExercise.exerciseType);

      // Score calculation
      const recommendedInfo = getRecommendedExercises({
        targetMuscleGroup: targetMuscle,
        targetSubAreas,
        allExercises,
        pastSessions: history,
        personalRecords: context.personalRecords,
        userGoal,
        equipmentPreference: equipmentPref,
        experienceLevel,
        currentExercises: [chosenExercise],
        maxRecommendations: 1,
      });

      const score = recommendedInfo[0]?.score ?? 85;

      const evidence: AdaptivePlanEvidence = {
        daysSinceLastTrained: daysSinceTrained,
        pastSessionsCount: progression.totalSessions,
        trend: progression.trend,
        trendDeltaPercent: progression.trendDeltaPercent,
        bestWeight: progression.currentMaxWeight,
        bestReps: progression.timeline[progression.timeline.length - 1]?.bestReps ?? null,
        estimated1RM: progression.currentEstimated1RM,
        hasPR: Boolean(prRecord),
        directSetsLast30Days: directSets,
        muscleCoverageDirectSets: coverage?.effectiveSets,
      };

      adaptiveItems.push({
        id: `plan_item_${chosenExercise.id}`,
        exercise: chosenExercise,
        targetMuscle,
        targetSubAreas,
        sectionDisplayName: sec.displayName,
        defaultSets: guidance.sets,
        defaultReps: guidance.reps,
        targetRpe: guidance.rpe,
        isBaseline: chosenExercise.id === baseEx.id,
        originalExercise: baseEx,
        modificationType,
        status,
        score,
        badges: Array.from(new Set(badges)).slice(0, 3),
        reason,
        evidence,
      });
    }
  }

  const modificationsCount = adaptiveItems.filter(
    (item) => item.modificationType !== 'retained'
  ).length;

  return {
    dayOfWeek: targetDay,
    workoutName: dayConfig.name || `${targetMuscles.join(' + ').toUpperCase()} SESSION`,
    targetMuscles,
    sections,
    isRest: false,
    items: adaptiveItems,
    baselineExercises,
    modificationsCount,
    generatedAt: now.toISOString(),
    summaryNotes: Array.from(new Set(summaryNotes)),
  };
}

// ============================================================================
// MUTATION HELPERS: ACCEPT, REJECT, REPLACE & RESTORE
// ============================================================================

/**
 * Accepts a proposed modification or item in the adaptive plan.
 */
export function acceptSuggestion(
  plan: AdaptiveWorkoutPlan,
  itemId: string
): AdaptiveWorkoutPlan {
  const updatedItems = plan.items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: 'accepted' as SuggestionStatus,
      };
    }
    return item;
  });

  return {
    ...plan,
    items: updatedItems,
  };
}

/**
 * Rejects a proposed modification, reverting to the baseline exercise if one exists.
 */
export function rejectSuggestion(
  plan: AdaptiveWorkoutPlan,
  itemId: string
): AdaptiveWorkoutPlan {
  const updatedItems = plan.items.map((item) => {
    if (item.id === itemId) {
      if (item.originalExercise && item.originalExercise.id !== item.exercise.id) {
        // Revert to original baseline exercise
        const orig = item.originalExercise;
        return {
          ...item,
          exercise: orig,
          isBaseline: true,
          status: 'rejected' as SuggestionStatus,
          modificationType: 'retained' as ModificationType,
          reason: `Reverted to original scheduled baseline: ${orig.name}.`,
          badges: ['Scheduled Baseline'],
        };
      }
      return {
        ...item,
        status: 'rejected' as SuggestionStatus,
      };
    }
    return item;
  });

  return {
    ...plan,
    items: updatedItems,
  };
}

/**
 * Accepts all suggested modifications across the entire plan.
 */
export function acceptAllSuggestions(
  plan: AdaptiveWorkoutPlan
): AdaptiveWorkoutPlan {
  const updatedItems = plan.items.map((item) => ({
    ...item,
    status: 'accepted' as SuggestionStatus,
  }));

  return {
    ...plan,
    items: updatedItems,
  };
}

/**
 * Rejects all modifications, fully restoring the user's original baseline plan.
 */
export function rejectAllSuggestions(
  plan: AdaptiveWorkoutPlan
): AdaptiveWorkoutPlan {
  const updatedItems = plan.items.map((item) => {
    if (item.originalExercise && item.originalExercise.id !== item.exercise.id) {
      const orig = item.originalExercise;
      return {
        ...item,
        exercise: orig,
        isBaseline: true,
        status: 'rejected' as SuggestionStatus,
        modificationType: 'retained' as ModificationType,
        reason: `Reverted to original scheduled baseline: ${orig.name}.`,
        badges: ['Scheduled Baseline'],
      };
    }
    return {
      ...item,
      status: 'rejected' as SuggestionStatus,
      modificationType: 'retained' as ModificationType,
    };
  });

  return {
    ...plan,
    items: updatedItems,
  };
}

/**
 * Replaces an exercise in the plan with a custom-selected exercise.
 */
export function replaceExerciseInPlan(
  plan: AdaptiveWorkoutPlan,
  itemId: string,
  newExercise: Exercise
): AdaptiveWorkoutPlan {
  const updatedItems = plan.items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        id: `plan_item_${newExercise.id}`,
        exercise: newExercise,
        isBaseline: item.originalExercise?.id === newExercise.id,
        status: 'accepted' as SuggestionStatus,
        reason: `User-selected replacement: ${newExercise.name}.`,
        badges: ['User Selected', ...item.badges.filter((b) => b !== 'Scheduled Baseline')],
      };
    }
    return item;
  });

  return {
    ...plan,
    items: updatedItems,
  };
}

// ============================================================================
// SESSION CONVERTER: APPLY ADAPTIVE PLAN TO WORKOUT SESSION
// ============================================================================

export function applyAdaptivePlanToSession(
  plan: AdaptiveWorkoutPlan,
  session: WorkoutSession
): WorkoutSession {
  // Only convert accepted or suggested items (exclude explicitly rejected items if original wasn't restored)
  const itemsToApply = plan.items.filter((item) => item.status !== 'rejected' || item.isBaseline);

  const existingExercises = session.exercises || [];
  const existingIds = new Set(existingExercises.map((e) => e.exercise.id));

  const newWorkoutExercises: WorkoutExercise[] = [];

  itemsToApply.forEach((item, idx) => {
    if (existingIds.has(item.exercise.id)) {
      return; // prevent duplicate addition
    }

    const sets: WorkoutSet[] = [];
    for (let s = 1; s <= item.defaultSets; s++) {
      sets.push({
        id: `set_${item.exercise.id}_${s}_${Date.now()}`,
        setNumber: s,
        weight: null,
        reps: item.defaultReps,
        completed: false,
      });
    }

    const workEx: WorkoutExercise = {
      id: `ex_${item.exercise.id}_${Date.now()}_${idx}`,
      exerciseId: item.exercise.id,
      exercise: item.exercise,
      order: existingExercises.length + newWorkoutExercises.length + 1,
      sets,
      notes: item.reason,
    };

    newWorkoutExercises.push(workEx);
    existingIds.add(item.exercise.id);
  });

  return {
    ...session,
    exercises: [...existingExercises, ...newWorkoutExercises],
    totalSets: (session.totalSets || 0) + newWorkoutExercises.reduce((sum, e) => sum + e.sets.length, 0),
  };
}
