import React, { useState } from 'react';
import { Plus, Dumbbell, Check } from 'lucide-react';
import { Exercise } from '../../types';
import { Badge } from '../ui/Badge';
import { getMuscleAreaName } from '../../data/muscleGroups';

interface ExerciseLibraryCardProps {
  exercise: Exercise;
  onSelectDetail: (exercise: Exercise) => void;
  onAddToWorkout?: (exercise: Exercise) => void;
  isInWorkout?: boolean;
}

export const ExerciseLibraryCard: React.FC<ExerciseLibraryCardProps> = ({
  exercise,
  onSelectDetail,
  onAddToWorkout,
  isInWorkout = false,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelectDetail(exercise)}
      className="group relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl overflow-hidden transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98] flex flex-col justify-between"
    >
      {/* Consistent Aspect Ratio Exercise Image Header */}
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-card)]">
          {!imgError ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-muted)]">
              <Dumbbell className="w-8 h-8 opacity-40" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
            <Badge variant="primary" size="sm">
              {exercise.primaryMuscle.toUpperCase()}
            </Badge>
            {exercise.isCustom && (
              <Badge variant="primary" size="sm">
                CUSTOM
              </Badge>
            )}
          </div>

          {onAddToWorkout && (
            isInWorkout ? (
              <div
                className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[var(--success-subtle)] border border-[var(--success-border)] text-[var(--success)] text-[10px] font-black flex items-center gap-1 backdrop-blur-xs select-none"
                title="Already in current workout"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Added</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToWorkout(exercise);
                }}
                className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center gap-1 shadow-md active:scale-90 transition-all font-black text-[10px] cursor-pointer"
                title="Add to Current Workout"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add</span>
              </button>
            )
          )}
        </div>

        {/* Exercise Info Content */}
        <div className="p-2.5">
          <h3 className="text-xs font-bold text-[var(--text-main)] leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-1">
            {exercise.name}
          </h3>

          <div className="flex flex-wrap gap-1 mb-1.5">
            {exercise.muscleAreaEmphasis.map((area) => (
              <span
                key={area}
                className="text-[10px] font-semibold bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] px-1.5 py-0.2 rounded"
              >
                {getMuscleAreaName(area)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-2.5 pb-2 pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)] capitalize">
        <span>{exercise.equipmentName || exercise.equipment}</span>
        <span>{exercise.exerciseType}</span>
      </div>
    </div>
  );
};
