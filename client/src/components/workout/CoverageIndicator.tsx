import React from 'react';
import { Check, Sparkles, Plus } from 'lucide-react';
import { MuscleGroup, MuscleArea } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { calculateMuscleCoverage } from '../../utils/coverage';

interface CoverageIndicatorProps {
  muscleGroup: MuscleGroup;
  sectionTitle?: string;
  subAreas?: MuscleArea[];
}

export const CoverageIndicator: React.FC<CoverageIndicatorProps> = ({
  muscleGroup,
  sectionTitle,
  subAreas,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getActiveSession, getEditingSession } = useWorkoutStore();
  const activeSession = getActiveSession(userId);
  const editingSession = getEditingSession(userId);
  const currentSession = editingSession || activeSession;

  if (!currentSession) return null;

  // Pass currentSession.exercises directly to calculateMuscleCoverage so only valid recorded sets qualify
  const coverage = calculateMuscleCoverage(muscleGroup, currentSession.exercises, subAreas);

  const displayTitle = sectionTitle || muscleGroup;

  return (
    <div className="mb-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/50 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-2xs">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
          <span className="uppercase tracking-wider">Target Heads</span>
          <span className="text-[10px] text-[var(--text-muted)] font-normal">
            ({coverage.totalAreas} sub-areas)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {coverage.coveredAreas > 0 ? (
            <>
              <span className="text-[var(--success)] font-extrabold flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[3]" />
                {coverage.directCount} Direct
              </span>
              {coverage.supportedCount > 0 && (
                <>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span className="text-sky-400 font-bold">
                    {coverage.supportedCount} Supported
                  </span>
                </>
              )}
              <span className="text-[var(--text-secondary)] font-bold text-[11px] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                {coverage.coveredAreas}/{coverage.totalAreas} Covered
              </span>
            </>
          ) : (
            <span className="text-[var(--text-muted)] font-medium text-[11px]">
              0/{coverage.totalAreas} Covered
            </span>
          )}
        </div>
      </div>

      {/* Visual Sub-Area Indicators (Direct, Supported, Optional) */}
      <div className="flex flex-wrap gap-1.5">
        {coverage.areas.map((item) => {
          const isDirect = item.status === 'direct';
          const isSupported = item.status === 'supported';
          const contributing = isDirect
            ? item.exercises.join(', ')
            : isSupported
            ? (item.supportingExercises || []).join(', ')
            : 'Available for direct focus';

          return (
            <div
              key={item.area}
              title={`${item.displayName}: ${contributing}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                isDirect
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-black shadow-2xs'
                  : isSupported
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/25 font-bold'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
            >
              {isDirect ? (
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
              ) : isSupported ? (
                <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              ) : (
                <Plus className="w-2.5 h-2.5 text-[var(--text-muted)] opacity-70" />
              )}
              <span>{item.displayName}</span>
              {isSupported && (
                <span className="text-[8px] uppercase tracking-wider opacity-85 font-black">
                  Supported
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
