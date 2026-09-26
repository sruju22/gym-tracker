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
  const userId = currentUser?.id || 'user_srujan';

  const { getActiveSession } = useWorkoutStore();
  const activeSession = getActiveSession(userId);

  if (!activeSession) return null;

  const currentExercises = activeSession.exercises.map((e) => e.exercise);
  const coverage = calculateMuscleCoverage(muscleGroup, currentExercises, subAreas);

  const displayTitle = sectionTitle || muscleGroup;

  return (
    <Card className="mb-3 border border-[#272B30] bg-[#1B1F23]/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">
          {displayTitle} Target Areas
        </span>
        <span className="text-xs font-semibold text-[#6B7280]">
          {coverage.coveredAreas}/{coverage.totalAreas} Covered
        </span>
      </div>

      {/* Visual Sub-Area Indicators */}
      <div className="flex flex-wrap gap-1.5">
        {coverage.areas.map((item) => (
          <div
            key={item.area}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              item.covered
                ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40 font-extrabold'
                : 'bg-[#14171A] text-[#6B7280] border-[#272B30]'
            }`}
          >
            {item.covered ? (
              <Check className="w-3.5 h-3.5 text-[#22C55E] stroke-[3]" />
            ) : (
              <X className="w-3 h-3 text-[#6B7280]" />
            )}
            <span>{item.displayName}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
