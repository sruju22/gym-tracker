import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { MuscleGroup, MuscleArea } from '../../types';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
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
  const { activeSession } = useWorkoutStore();

  if (!activeSession) return null;

  const currentExercises = activeSession.exercises.map((e) => e.exercise);
  const coverage = calculateMuscleCoverage(muscleGroup, currentExercises, subAreas);

  const displayTitle = sectionTitle || muscleGroup;

  return (
    <Card className="mb-3 border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {displayTitle} Target Areas
        </span>
        <span className="text-xs font-semibold text-slate-400">
          {coverage.coveredAreas}/{coverage.totalAreas} Covered
        </span>
      </div>

      {/* Visual Sub-Area Indicators */}
      <div className="flex flex-wrap gap-1.5">
        {coverage.areas.map((item) => (
          <div
            key={item.area}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              item.covered
                ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {item.covered ? (
              <Check className="w-3.5 h-3.5 text-sky-400 stroke-[3]" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            )}
            <span>{item.displayName}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
