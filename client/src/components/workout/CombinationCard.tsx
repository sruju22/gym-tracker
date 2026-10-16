import React, { useState } from 'react';
import {
  Layers,
  ChevronUp,
  Trash2,
  Plus,
  Check,
  Dumbbell,
} from 'lucide-react';
import { WorkoutExercise, CombinationType } from '../../types';
import { Card } from '../ui/Card';
import { SetRow } from './SetRow';
import { ExerciseImageModal } from './ExerciseImageModal';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface CombinationCardProps {
  combinationId: string;
  combinationName: string;
  combinationType?: CombinationType;
  exercises: WorkoutExercise[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const CombinationCard: React.FC<CombinationCardProps> = ({
  combinationId,
  combinationName,
  combinationType: _combinationType,
  exercises,
  isExpanded,
  onToggleExpand,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const {
    updateSet,
    toggleSetCompleted,
    removeSetFromExercise,
    addRoundToCombination,
    removeCombinationFromWorkout,
    getPreviousPerformance,
  } = useWorkoutStore();

  const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
  const [selectedImgExercise, setSelectedImgExercise] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const cardExpanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  // Determine overall completion status
  const allSets = exercises.flatMap((e) => e.sets);
  const completedSets = allSets.filter(
    (s) => s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0
  );
  const isAllCompleted = allSets.length > 0 && allSets.every((s) => s.completed);

  // Compute total volume for this combination
  const comboVolume = completedSets.reduce(
    (acc, s) => acc + (s.weight || 0) * (s.reps || 0),
    0
  );

  // Derive round count (max sets among component exercises)
  const roundCount = Math.max(...exercises.map((e) => e.sets.length), 0);

  // Collapsed Completed View
  if (!cardExpanded && isAllCompleted) {
    return (
      <div
        onClick={toggleExpand}
        className="mb-3 bg-[#14171A] border border-[#22C55E]/40 hover:border-[#22C55E]/70 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="w-7 h-7 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] flex items-center justify-center font-black shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-[#F5F5F5] flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-black uppercase text-[#E11D48] bg-[#E11D48]/15 px-1.5 py-0.2 rounded border border-[#E11D48]/30">
                COMBINATION
              </span>
              <span className="truncate min-w-0">{combinationName}</span>
            </div>
            <div className="text-[11px] text-[#22C55E] font-bold truncate mt-0.5">
              {exercises.length} stages • {roundCount} rounds • {comboVolume} kg
            </div>
          </div>
        </div>

        <div className="text-[10px] font-bold text-[#9CA3AF] bg-[#1B1F23] border border-[#272B30] px-2.5 py-1 rounded-lg shrink-0 hover:text-[#F5F5F5] transition-colors">
          Edit
        </div>
      </div>
    );
  }

  // Collapsed In-Progress View
  if (!cardExpanded && !isAllCompleted) {
    return (
      <div
        onClick={toggleExpand}
        className="mb-3 bg-[#14171A] border border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="w-7 h-7 rounded-full bg-[#1B1F23] border border-[#272B30] text-[#E11D48] flex items-center justify-center font-black text-xs shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-[#F5F5F5] flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-black uppercase text-[#E11D48] bg-[#E11D48]/15 px-1.5 py-0.2 rounded border border-[#E11D48]/30">
                COMBINATION
              </span>
              <span className="truncate min-w-0">{combinationName}</span>
            </div>
            <div className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
              {exercises.map((e) => e.exercise.name).join(' → ')}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-extrabold text-[#E11D48] bg-[#E11D48]/10 border border-[#E11D48]/30 px-2.5 py-1 rounded-lg shrink-0">
          Expand
        </div>
      </div>
    );
  }

  // Expanded Active View
  return (
    <>
      <Card
        className={`mb-4 border transition-all ${
          isAllCompleted
            ? 'border-[#22C55E]/50 bg-[#14171A] shadow-md'
            : 'border-[#E11D48]/40 bg-[#14171A] shadow-md'
        }`}
      >
        {/* Combination Outer Header */}
        <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-[#272B30]">
          <div
            onClick={toggleExpand}
            className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E11D48]/15 border border-[#E11D48]/40 text-[#E11D48] flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#E11D48] bg-[#E11D48]/15 border border-[#E11D48]/30 px-1.5 py-0.2 rounded">
                  COMBINATION
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#F5F5F5] truncate leading-tight">
                  {combinationName}
                </h3>
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-0.5 flex items-center gap-1.5">
                <span>
                  {exercises.length} {exercises.length === 1 ? 'stage' : 'stages'}
                </span>
                <span>•</span>
                <span>{roundCount} rounds</span>
                {comboVolume > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#E11D48] font-bold">{comboVolume} kg volume</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleExpand}
              className="p-1 text-[#6B7280] hover:text-[#F5F5F5] cursor-pointer"
              title="Collapse combination"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-1 text-[#6B7280] hover:text-[#EF4444] transition-colors cursor-pointer"
              title="Remove combination"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Component Exercises / Stages List */}
        <div className="space-y-4">
          {exercises.map((workEx, exIdx) => {
            const prevPerf = getPreviousPerformance(userId, workEx.exercise.id);

            return (
              <div
                key={workEx.id}
                className="bg-[#1B1F23]/80 border border-[#272B30] rounded-xl p-3 space-y-2.5"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[10px] font-black uppercase text-[#9CA3AF] bg-[#14171A] border border-[#272B30] px-2 py-0.5 rounded shrink-0">
                      Stage {exIdx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-[#F5F5F5] truncate">
                      {workEx.exercise.name}
                    </h4>
                  </div>

                  {workEx.stageDescription && (
                    <span className="text-[10px] font-bold text-[#E11D48] bg-[#E11D48]/10 px-2 py-0.5 rounded border border-[#E11D48]/20 shrink-0 truncate max-w-[140px]">
                      {workEx.stageDescription}
                    </span>
                  )}
                </div>

                {/* Exercise Info & Image Thumbnail */}
                <div className="flex items-center gap-2.5 bg-[#14171A] border border-[#272B30]/60 rounded-lg p-2">
                  <div
                    onClick={() => setSelectedImgExercise(workEx.exercise)}
                    className="w-10 h-10 rounded-lg overflow-hidden bg-[#1B1F23] flex-shrink-0 border border-[#272B30] cursor-pointer group relative"
                    title="Tap to view demonstration"
                  >
                    {workEx.exercise.imageUrl ? (
                      <img
                        src={workEx.exercise.imageUrl}
                        alt={workEx.exercise.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6B7280]">
                        <Dumbbell className="w-4 h-4 opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-[11px] text-[#9CA3AF]">
                    <div className="truncate capitalize font-semibold text-[#F5F5F5]">
                      {workEx.exercise.primaryMuscle}
                    </div>
                    <div className="text-[10px] text-[#6B7280]">
                      {workEx.exercise.equipment || 'Standard Equipment'}
                    </div>
                  </div>

                  {prevPerf && (
                    <div className="text-right shrink-0 text-[10px] text-[#6B7280]">
                      <div>Best: <span className="text-[#F5F5F5] font-bold">{prevPerf.bestWeight}kg</span></div>
                    </div>
                  )}
                </div>

                {/* Set Header */}
                <div className="flex items-center justify-between text-[10px] font-bold text-[#6B7280] uppercase px-2">
                  <span className="w-7 text-center">Set</span>
                  <span className="w-18 hidden sm:block">Previous</span>
                  <span className="flex-1 text-center">Weight</span>
                  <span className="w-3"></span>
                  <span className="flex-1 text-center">Reps</span>
                  <span className="w-11 text-center">Done</span>
                </div>

                {/* Sets List */}
                <div className="space-y-1">
                  {workEx.sets.map((set, sIdx) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      prevSet={prevPerf?.sets[sIdx]}
                      onUpdate={(w, r) => updateSet(userId, workEx.id, sIdx, w, r)}
                      onToggleComplete={() => toggleSetCompleted(userId, workEx.id, sIdx)}
                      onRemove={() => removeSetFromExercise(userId, workEx.id, sIdx)}
                      canRemove={workEx.sets.length > 1}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Combination Bottom Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#272B30] gap-2">
          <button
            type="button"
            onClick={() => addRoundToCombination(userId, combinationId)}
            className="text-xs font-bold text-[#E11D48] hover:text-[#F43F5E] flex items-center gap-1.5 cursor-pointer bg-[#E11D48]/10 hover:bg-[#E11D48]/15 px-3 py-1.5 rounded-lg border border-[#E11D48]/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Round to All</span>
          </button>

          <button
            type="button"
            onClick={toggleExpand}
            className="text-xs font-bold text-[#9CA3AF] hover:text-[#F5F5F5] cursor-pointer px-2 py-1"
          >
            Collapse
          </button>
        </div>
      </Card>

      {/* Exercise Demonstration Modal */}
      {selectedImgExercise && (
        <ExerciseImageModal
          isOpen={Boolean(selectedImgExercise)}
          onClose={() => setSelectedImgExercise(null)}
          exercise={selectedImgExercise}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D0F]/80 backdrop-blur-sm">
          <div className="bg-[#14171A] border border-[#272B30] rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h4 className="text-sm font-black text-[#F5F5F5]">Remove Combination?</h4>
            <p className="text-xs text-[#9CA3AF]">
              Are you sure you want to remove <span className="font-bold text-[#F5F5F5]">"{combinationName}"</span> and all its component exercises from this workout?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#9CA3AF] bg-[#1B1F23] hover:bg-[#272B30] cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  removeCombinationFromWorkout(userId, combinationId);
                  setIsDeleteConfirmOpen(false);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-[#EF4444] hover:bg-[#DC2626] cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
