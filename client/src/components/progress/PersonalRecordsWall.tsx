import React, { useState, useMemo } from 'react';
import { Award, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { PersonalRecord, Exercise, WorkoutSession } from '../../types';
import { formatDateShort } from '../../utils/formatters';
import { getLegSection } from '../../utils/legSection';

type MuscleGroupCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'other';

interface CategoryDefinition {
  key: MuscleGroupCategory;
  name: string;
}

const ORDERED_CATEGORIES: CategoryDefinition[] = [
  { key: 'chest', name: 'Chest' },
  { key: 'back', name: 'Back' },
  { key: 'shoulders', name: 'Shoulders' },
  { key: 'biceps', name: 'Biceps' },
  { key: 'triceps', name: 'Triceps' },
  { key: 'forearms', name: 'Forearms' },
  { key: 'quads', name: 'Quads' },
  { key: 'hamstrings', name: 'Hamstrings' },
  { key: 'glutes', name: 'Glutes' },
  { key: 'calves', name: 'Calves' },
  { key: 'core', name: 'Core' },
  { key: 'other', name: 'Other' },
];

/**
 * Classifies a personal record into a single primary muscle group category
 * using the exercise's primary muscle and anatomical metadata.
 */
function classifyRecordToCategory(
  pr: PersonalRecord,
  exerciseMapById: Map<string, Exercise>,
  exerciseMapByName: Map<string, Exercise>,
  historyExercisesMap: Map<string, { primaryMuscle?: string; muscleAreaEmphasis?: string[] }>
): MuscleGroupCategory {
  // 1. Check in exercise library by ID or normalized name
  const ex =
    exerciseMapById.get(pr.exerciseId) ||
    exerciseMapByName.get((pr.exerciseName || '').trim().toLowerCase());

  if (ex) {
    const pm = (ex.primaryMuscle || '').toLowerCase();

    if (pm === 'chest') return 'chest';
    if (pm === 'back') return 'back';
    if (pm === 'shoulders') return 'shoulders';
    if (pm === 'biceps') return 'biceps';
    if (pm === 'triceps') return 'triceps';
    if (pm === 'forearms') return 'forearms';
    if (pm === 'core') return 'core';
    if (pm === 'glutes') return 'glutes';
    if (pm === 'calves') return 'calves';

    if (pm === 'quads') return 'quads';
    if (pm === 'hamstrings') return 'hamstrings';

    // Legs classification: determine sub-area (quads vs hamstrings vs glutes vs calves)
    if (pm === 'legs') {
      const legSec = getLegSection(ex);
      if (legSec === 'hamstrings') return 'hamstrings';
      if (legSec === 'glutes') return 'glutes';
      if (legSec === 'calves') return 'calves';
      return 'quads';
    }

    return 'other';
  }

  // 2. Check in historical workout metadata if exercise wasn't in library
  const histMeta =
    historyExercisesMap.get(pr.exerciseId) ||
    historyExercisesMap.get((pr.exerciseName || '').trim().toLowerCase());

  if (histMeta) {
    const pm = (histMeta.primaryMuscle || '').toLowerCase();
    const areas = histMeta.muscleAreaEmphasis || [];

    if (pm === 'chest') return 'chest';
    if (pm === 'back') return 'back';
    if (pm === 'shoulders') return 'shoulders';
    if (pm === 'biceps') return 'biceps';
    if (pm === 'triceps') return 'triceps';
    if (pm === 'forearms') return 'forearms';
    if (pm === 'core') return 'core';
    if (pm === 'glutes' || areas.some((a) => ['glutes', 'glute_max', 'glute_med'].includes(a)))
      return 'glutes';
    if (pm === 'calves' || areas.some((a) => ['calves', 'gastrocnemius', 'soleus'].includes(a)))
      return 'calves';
    if (pm === 'hamstrings' || areas.includes('hamstrings')) return 'hamstrings';
    if (pm === 'quads' || areas.includes('quads') || pm === 'legs') return 'quads';
  }

  return 'other';
}

interface PersonalRecordsWallProps {
  personalRecords: PersonalRecord[];
  exercises: Exercise[];
  history?: WorkoutSession[];
}

export const PersonalRecordsWall: React.FC<PersonalRecordsWallProps> = ({
  personalRecords,
  exercises,
  history = [],
}) => {
  // Build lookup maps for exercises
  const { exerciseMapById, exerciseMapByName, historyExercisesMap } = useMemo(() => {
    const byId = new Map<string, Exercise>();
    const byName = new Map<string, Exercise>();

    exercises.forEach((ex) => {
      byId.set(ex.id, ex);
      byName.set(ex.name.trim().toLowerCase(), ex);
    });

    const histMap = new Map<string, { primaryMuscle?: string; muscleAreaEmphasis?: string[] }>();
    history.forEach((session) => {
      session.exercises.forEach((workEx) => {
        const keyId = workEx.exerciseId || workEx.id;
        const keyName = workEx.exercise?.name?.trim().toLowerCase();
        const data = {
          primaryMuscle: workEx.exercise?.primaryMuscle,
          muscleAreaEmphasis: workEx.exercise?.muscleAreaEmphasis,
        };
        if (keyId) histMap.set(keyId, data);
        if (keyName) histMap.set(keyName, data);
      });
    });

    return {
      exerciseMapById: byId,
      exerciseMapByName: byName,
      historyExercisesMap: histMap,
    };
  }, [exercises, history]);

  // Deduplicate personal records (1 best record per exercise)
  const uniquePRs = useMemo(() => {
    const prMap = new Map<string, PersonalRecord>();

    personalRecords.forEach((pr) => {
      const key = (pr.exerciseId || pr.exerciseName || pr.id).trim().toLowerCase();
      const existing = prMap.get(key);

      if (!existing) {
        prMap.set(key, pr);
      } else {
        const weight = pr.weight ?? pr.value ?? 0;
        const exWeight = existing.weight ?? existing.value ?? 0;
        const est1RM = pr.estimated1RM ?? 0;
        const exEst1RM = existing.estimated1RM ?? 0;

        if (
          weight > exWeight ||
          est1RM > exEst1RM ||
          (weight === exWeight && (pr.reps ?? 0) > (existing.reps ?? 0))
        ) {
          prMap.set(key, pr);
        }
      }
    });

    return Array.from(prMap.values());
  }, [personalRecords]);

  // Group records by muscle group category and sort within each group
  const groupedRecords = useMemo(() => {
    const map = new Map<MuscleGroupCategory, PersonalRecord[]>();

    ORDERED_CATEGORIES.forEach((cat) => {
      map.set(cat.key, []);
    });

    uniquePRs.forEach((pr) => {
      const cat = classifyRecordToCategory(
        pr,
        exerciseMapById,
        exerciseMapByName,
        historyExercisesMap
      );
      const list = map.get(cat) || [];
      list.push(pr);
      map.set(cat, list);
    });

    // Sort records within each group: newest achievement date first, then highest weight
    ORDERED_CATEGORIES.forEach((cat) => {
      const list = map.get(cat.key) || [];
      list.sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return (b.weight ?? b.value ?? 0) - (a.weight ?? a.value ?? 0);
      });
    });

    // Filter to only non-empty groups in defined sensible order
    return ORDERED_CATEGORIES.filter((cat) => {
      const list = map.get(cat.key);
      return list && list.length > 0;
    }).map((cat) => ({
      ...cat,
      records: map.get(cat.key) || [],
    }));
  }, [uniquePRs, exerciseMapById, exerciseMapByName, historyExercisesMap]);

  // Determine the category containing the most recently achieved PR for default expansion
  const mostRecentCategory = useMemo(() => {
    if (uniquePRs.length === 0) return null;
    const sorted = [...uniquePRs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const newest = sorted[0];
    if (!newest) return null;
    return classifyRecordToCategory(newest, exerciseMapById, exerciseMapByName, historyExercisesMap);
  }, [uniquePRs, exerciseMapById, exerciseMapByName, historyExercisesMap]);

  // Explicit expansion overrides per group
  // By default: only the group containing the most recent PR is expanded; all others collapsed
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});

  const isGroupExpanded = (key: string) => {
    if (expandedOverrides[key] !== undefined) {
      return expandedOverrides[key];
    }
    return key === mostRecentCategory;
  };

  // Toggle single group independently
  const toggleGroup = (key: string) => {
    const currentlyExpanded = isGroupExpanded(key);
    setExpandedOverrides((prev) => ({
      ...prev,
      [key]: !currentlyExpanded,
    }));
  };

  // Check if all active groups are expanded
  const allExpanded =
    groupedRecords.length > 0 && groupedRecords.every((g) => isGroupExpanded(g.key));

  const toggleAll = () => {
    if (allExpanded) {
      const allCollapsed: Record<string, boolean> = {};
      groupedRecords.forEach((g) => {
        allCollapsed[g.key] = false;
      });
      setExpandedOverrides(allCollapsed);
    } else {
      const allOpen: Record<string, boolean> = {};
      groupedRecords.forEach((g) => {
        allOpen[g.key] = true;
      });
      setExpandedOverrides(allOpen);
    }
  };

  return (
    <Card className="flex-1 flex flex-col justify-between bg-[#14171A] border-[#272B30] p-4 sm:p-5 rounded-2xl min-h-0 shadow-sm">
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-[#F5F5F5] uppercase tracking-wide flex items-center gap-1.5">
                <span>Personal Records</span>
                <span className="text-[#9CA3AF] font-bold">({uniquePRs.length})</span>
              </h3>
              <div className="text-[10px] text-[#6B7280] font-semibold">
                {groupedRecords.length} muscle {groupedRecords.length === 1 ? 'group' : 'groups'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {groupedRecords.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-[10px] font-bold text-[#E11D48] hover:text-[#F43F5E] px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            <Badge variant="warning">Best Lifts</Badge>
          </div>
        </div>

        {/* Collapsible Muscle Group Sections */}
        <div className="space-y-2.5">
          {groupedRecords.map((group) => {
            const isExpanded = isGroupExpanded(group.key);

            return (
              <div
                key={group.key}
                className="rounded-xl border border-[#272B30] overflow-hidden bg-[#1B1F23]/40 transition-colors"
              >
                {/* Collapsible Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full px-3.5 py-3 flex items-center justify-between bg-[#1B1F23] hover:bg-[#20252A] transition-colors cursor-pointer text-left select-none"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#E11D48] shadow-sm shadow-[#E11D48]/50 shrink-0" />
                    <span className="text-xs font-black text-[#F5F5F5] uppercase tracking-wider">
                      {group.name}
                    </span>
                    <span className="text-xs text-[#9CA3AF] font-extrabold uppercase tracking-tight">
                      · {group.records.length} {group.records.length === 1 ? 'RECORD' : 'RECORDS'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[#9CA3AF] shrink-0 ml-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#E11D48]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                    )}
                  </div>
                </button>

                {/* Expanded Records List */}
                {isExpanded && (
                  <div className="p-2 space-y-2 bg-[#14171A]/80 border-t border-[#272B30]/80">
                    {group.records.map((pr) => (
                      <div
                        key={pr.id}
                        className="bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 flex items-center justify-between hover:border-[#272B30]/80 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-black text-[#F5F5F5] truncate">
                            {pr.exerciseName}
                          </div>
                          <div className="text-[11px] text-amber-400 font-semibold truncate">
                            {pr.weight} kg × {pr.reps} reps{' '}
                            <span className="text-[#9CA3AF] font-normal">
                              (Est. 1RM {pr.estimated1RM} kg)
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-[#E11D48]">{pr.weight} kg</div>
                          <div className="text-[10px] text-[#6B7280]">
                            {formatDateShort(pr.date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty State when no personal records exist */}
          {groupedRecords.length === 0 && (
            <div className="text-center py-8 px-4 border border-dashed border-[#272B30] rounded-xl bg-[#14171A]">
              <p className="text-xs text-[#9CA3AF] italic">
                No Personal Records recorded yet. Complete a workout to log PRs!
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
