import React from 'react';
import { Plus, BookOpen, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Exercise } from '../../types';
import { getMuscleAreaName } from '../../data/muscleGroups';

interface ExerciseDetailProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToWorkout?: (exercise: Exercise) => void;
  onEditCustom?: (exercise: Exercise) => void;
  onDeleteCustom?: (exercise: Exercise) => void;
}

export const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  exercise,
  isOpen,
  onClose,
  onAddToWorkout,
  onEditCustom,
  onDeleteCustom,
}) => {
  if (!exercise) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exercise.name}>
      <div className="space-y-3 text-[#F5F5F5]">
        {/* Cover / Demonstration images */}
        {exercise.imageEnd ? (
          <div className="grid grid-cols-2 gap-2 aspect-video">
            <div className="relative rounded-xl overflow-hidden bg-[#1B1F23] border border-[#272B30]">
              <img
                src={exercise.imageUrl}
                alt={`${exercise.name} start position`}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-1.5 left-1.5 bg-[#0B0D0F]/85 text-[#F5F5F5] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#272B30]">
                Start
              </span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-[#1B1F23] border border-[#272B30]">
              <img
                src={exercise.imageEnd}
                alt={`${exercise.name} end position`}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-1.5 left-1.5 bg-[#0B0D0F]/85 text-[#F5F5F5] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#272B30]">
                End
              </span>
            </div>
          </div>
        ) : (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1B1F23] border border-[#272B30]">
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="primary" size="md">
            {exercise.primaryMuscle.toUpperCase()}
          </Badge>
          <Badge variant="secondary" size="md">
            {exercise.equipment.toUpperCase()}
          </Badge>
          <Badge variant="info" size="md">
            {exercise.exerciseType.toUpperCase()}
          </Badge>
          <Badge variant="warning" size="md">
            {exercise.difficulty.toUpperCase()}
          </Badge>
          {exercise.isCustom && (
            <Badge variant="primary" size="md" className="bg-[#E11D48]/20 text-[#E11D48] border-[#E11D48]">
              CUSTOM
            </Badge>
          )}
        </div>

        {/* Muscle Emphasis sub-areas */}
        <div className="bg-[#1B1F23] border border-[#272B30] rounded-xl p-2.5">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">
            Targeted Sub-Areas
          </div>
          <div className="flex flex-wrap gap-1">
            {exercise.muscleAreaEmphasis.map((area) => (
              <span
                key={area}
                className="bg-[#E11D48]/15 text-[#E11D48] border border-[#E11D48]/40 text-xs font-semibold px-2 py-0.5 rounded"
              >
                {getMuscleAreaName(area)}
              </span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h4 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Instructions</span>
          </h4>
          <ol className="space-y-1.5 text-xs text-[#F5F5F5] list-decimal list-inside pl-1">
            {exercise.instructions.map((step, idx) => (
              <li key={idx} className="leading-relaxed bg-[#1B1F23] p-2.5 rounded-xl border border-[#272B30]">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Actions for Custom Exercise */}
        {exercise.isCustom && (
          <div className="flex gap-2 pt-2 border-t border-[#272B30]">
            {onEditCustom && (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  onEditCustom(exercise);
                  onClose();
                }}
                className="gap-1.5"
              >
                <Edit2 className="w-4 h-4 text-[#E11D48]" />
                <span>Edit Custom Exercise</span>
              </Button>
            )}

            {onDeleteCustom && (
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  onDeleteCustom(exercise);
                  onClose();
                }}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        )}

        {/* Add to Workout Button */}
        {onAddToWorkout && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              onAddToWorkout(exercise);
              onClose();
            }}
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
            <span>Add to Today's Workout</span>
          </Button>
        )}
      </div>
    </Modal>
  );
};
