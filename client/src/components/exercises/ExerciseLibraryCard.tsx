import React, { useState } from 'react';
import { Plus, Dumbbell } from 'lucide-react';
import { Exercise } from '../../types';
import { Badge } from '../ui/Badge';
import { MUSCLE_GROUPS, getMuscleAreaName } from '../../data/muscleGroups';

interface ExerciseLibraryCardProps {
  exercise: Exercise;
  onSelectDetail: (exercise: Exercise) => void;
  onAddToWorkout?: (exercise: Exercise) => void;
}

export const ExerciseLibraryCard: React.FC<ExerciseLibraryCardProps> = ({
  exercise,
  onSelectDetail,
  onAddToWorkout,
}) => {
  const meta = MUSCLE_GROUPS[exercise.primaryMuscle];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelectDetail(exercise)}
      className="group relative bg-[#121827] border border-slate-800 hover:border-sky-500/60 rounded-xl overflow-hidden transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98] flex flex-col justify-between"
    >
      {/* Consistent Aspect Ratio Exercise Image Header - kept clear & bright */}
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
          {!imgError ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
              <Dumbbell className="w-8 h-8 opacity-40" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <Badge variant="primary" size="sm">
              {exercise.primaryMuscle.toUpperCase()}
            </Badge>
          </div>

          {onAddToWorkout && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToWorkout(exercise);
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center shadow-md shadow-sky-500/30 active:scale-90 transition-transform font-black text-xs"
              title="Add to today's workout"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Exercise Info Content */}
        <div className="p-2.5">
          <h3 className="text-xs font-bold text-slate-100 leading-snug group-hover:text-sky-400 transition-colors line-clamp-1 mb-1">
            {exercise.name}
          </h3>

          <div className="flex flex-wrap gap-1 mb-1.5">
            {exercise.muscleAreaEmphasis.map((area) => (
              <span
                key={area}
                className="text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.2 rounded"
              >
                {getMuscleAreaName(area)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-2.5 pb-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 capitalize">
        <span>{exercise.equipment}</span>
        <span>{exercise.exerciseType}</span>
      </div>
    </div>
  );
};
