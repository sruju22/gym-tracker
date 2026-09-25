import React from 'react';
import { Plus, BookOpen } from 'lucide-react';
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
}

export const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  exercise,
  isOpen,
  onClose,
  onAddToWorkout,
}) => {
  if (!exercise) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exercise.name}>
      <div className="space-y-3 text-slate-100">
        {/* Cover / Demonstration images */}
        {exercise.imageEnd ? (
          <div className="grid grid-cols-2 gap-2 aspect-video">
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <img
                src={exercise.imageUrl}
                alt={`${exercise.name} start position`}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                Start
              </span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <img
                src={exercise.imageEnd}
                alt={`${exercise.name} end position`}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                End
              </span>
            </div>
          </div>
        ) : (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
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
        </div>

        {/* Muscle Emphasis sub-areas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Targeted Sub-Areas
          </div>
          <div className="flex flex-wrap gap-1">
            {exercise.muscleAreaEmphasis.map((area) => (
              <span
                key={area}
                className="bg-sky-950/80 text-sky-300 border border-sky-800/60 text-xs font-semibold px-2 py-0.5 rounded"
              >
                {getMuscleAreaName(area)}
              </span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Instructions</span>
          </h4>
          <ol className="space-y-1.5 text-xs text-slate-200 list-decimal list-inside pl-1">
            {exercise.instructions.map((step, idx) => (
              <li key={idx} className="leading-relaxed bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                {step}
              </li>
            ))}
          </ol>
        </div>

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
