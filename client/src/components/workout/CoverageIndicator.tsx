import React from 'react';
import { Check, X } from 'lucide-react';
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
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {coverage.coveredAreas}/{coverage.totalAreas} Covered
        </span>
      </div>

      {/* Visual Sub-Area Indicators */}
      <div className="flex flex-wrap gap-1.5">
        {coverage.areas.map((item) => (
          <div
            key={item.area}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              item.covered
                ? 'bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success-border)] font-extrabold'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            {item.covered ? (
              <Check className="w-3.5 h-3.5 text-[var(--success)] stroke-[3]" />
            ) : (
              <X className="w-3 h-3 text-[var(--text-muted)]" />
            )}
            <span>{item.displayName}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
