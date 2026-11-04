import React from 'react';
import { Check, Sparkles, Plus } from 'lucide-react';
import { MuscleGroup, MuscleArea } from '../../types';
import { Card } from '../ui/Card';
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
    <Card className="mb-3 border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          {displayTitle} Target Areas
        </span>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-[var(--success)] font-bold">
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
          <span className="text-[var(--text-muted)] font-normal text-[11px]">
            ({coverage.coveredAreas}/{coverage.totalAreas} Covered)
          </span>
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isDirect
                  ? 'bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success-border)] font-extrabold shadow-2xs'
                  : isSupported
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 font-bold'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
            >
              {isDirect ? (
                <Check className="w-3.5 h-3.5 text-[var(--success)] stroke-[3]" />
              ) : isSupported ? (
                <Sparkles className="w-3 h-3 text-sky-400" />
              ) : (
                <Plus className="w-3 h-3 text-[var(--text-muted)] opacity-60" />
              )}
              <span>{item.displayName}</span>
              {isSupported && (
                <span className="text-[9px] uppercase tracking-wider opacity-80 font-black">
                  Supported
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
