import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Exercise } from '../../types';
import { getMuscleAreaName } from '../../data/muscleGroups';

interface ExerciseImageModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseImageModal: React.FC<ExerciseImageModalProps> = ({
  exercise,
  isOpen,
  onClose,
}) => {
  const [img0Error, setImg0Error] = useState(false);
  const [img1Error, setImg1Error] = useState(false);

  if (!exercise) return null;

  const showImg0 = Boolean(exercise.imageUrl) && !img0Error;
  const showImg1 = Boolean(exercise.imageEnd) && !img1Error;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exercise.name}>
      <div className="space-y-4 text-[var(--text-main)]">
        {/* Badges & Meta Info */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="primary" size="md">
            {exercise.primaryMuscle.toUpperCase()}
          </Badge>
          <Badge variant="secondary" size="md">
            {(exercise.equipmentName || exercise.equipment).toUpperCase()}
          </Badge>
          {exercise.muscleAreaEmphasis.map((area) => (
            <Badge key={area} variant="secondary" size="md">
              {getMuscleAreaName(area)}
            </Badge>
          ))}
        </div>

        {/* Demonstration Images */}
        <div className="space-y-3">
          {showImg0 && showImg1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1.5 flex flex-col items-center">
                <div className="w-full aspect-4/3 overflow-hidden rounded-lg flex items-center justify-center bg-[var(--bg-card)]">
                  <img
                    src={exercise.imageUrl}
                    alt={`${exercise.name} - Start Position`}
                    loading="lazy"
                    className="w-full h-full object-contain max-h-[50vh]"
                    onError={() => setImg0Error(true)}
                  />
                </div>
                <span className="mt-1.5 bg-[var(--bg-surface)] text-[var(--text-main)] text-[10px] font-extrabold px-2 py-0.5 rounded border border-[var(--border-subtle)] uppercase tracking-wider">
                  Start Position
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1.5 flex flex-col items-center">
                <div className="w-full aspect-4/3 overflow-hidden rounded-lg flex items-center justify-center bg-[var(--bg-card)]">
                  <img
                    src={exercise.imageEnd!}
                    alt={`${exercise.name} - Finish Position`}
                    loading="lazy"
                    className="w-full h-full object-contain max-h-[50vh]"
                    onError={() => setImg1Error(true)}
                  />
                </div>
                <span className="mt-1.5 bg-[var(--bg-surface)] text-[var(--text-main)] text-[10px] font-extrabold px-2 py-0.5 rounded border border-[var(--border-subtle)] uppercase tracking-wider">
                  Finish Position
                </span>
              </div>
            </div>
          ) : showImg0 || showImg1 ? (
            <div className="relative rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1.5 flex flex-col items-center">
              <div className="w-full max-h-[55vh] overflow-hidden rounded-lg flex items-center justify-center bg-[var(--bg-card)]">
                <img
                  src={showImg0 ? exercise.imageUrl : exercise.imageEnd!}
                  alt={exercise.name}
                  loading="lazy"
                  className="w-full h-full max-h-[55vh] object-contain"
                  onError={() => (showImg0 ? setImg0Error(true) : setImg1Error(true))}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-[var(--text-secondary)] italic bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
              No demonstration image available
            </div>
          )}
        </div>

        {/* Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Instructions
            </h4>
            <ol className="space-y-1.5 text-xs text-[var(--text-main)] list-decimal list-inside">
              {exercise.instructions.map((step, idx) => (
                <li key={idx} className="leading-relaxed bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
};
