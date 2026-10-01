import React, { useState } from 'react';
import { Plus, Trash2, StickyNote, Dumbbell, History, Trophy, Check } from 'lucide-react';
import { WorkoutExercise } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SetRow } from './SetRow';
import { getMuscleAreaName } from '../../data/muscleGroups';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { formatDateShort } from '../../utils/formatters';

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onDone?: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  workoutExercise,
  isExpanded,
  onToggleExpand,
  onDone,
}) => {
  const { exercise, sets, notes, completed } = workoutExercise;
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const {
    updateSet,
    toggleSetCompleted,
    addSetToExercise,
    removeSetFromExercise,
    removeExerciseFromWorkout,
    toggleExerciseCompleted,
    updateExerciseNotes,
    getPreviousPerformance,
    getExercisePR,
  } = useWorkoutStore();

  const [showNotes, setShowNotes] = useState(Boolean(notes));
  const [imgError, setImgError] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isCardExpanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  const prevPerf = getPreviousPerformance(userId, exercise.id);
  const exercisePR = getExercisePR(userId, exercise.id);

  // Compute compact summary string for completed/collapsed exercise
  const validSets = sets.filter((s) => s.weight !== null && s.reps !== null && s.weight > 0 && s.reps > 0);
  const summaryText = validSets.length > 0
    ? validSets.map((s) => `${s.weight} kg × ${s.reps}`).join(' · ')
    : null;

  // COLLAPSED COMPLETED VIEW
  if (!isCardExpanded && completed) {
    return (
      <div
        onClick={toggleExpand}
        className="mb-3 bg-[#14171A] border border-[#22C55E]/40 hover:border-[#22C55E]/70 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] flex items-center justify-center font-black shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-[#F5F5F5] truncate">
              {exercise.name}
            </div>
            {summaryText ? (
              <div className="text-[11px] text-[#22C55E] font-bold truncate mt-0.5">
                {summaryText}
              </div>
            ) : (
              <div className="text-[11px] text-[#9CA3AF] italic mt-0.5">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px] font-bold text-[#9CA3AF] bg-[#1B1F23] border border-[#272B30] px-2.5 py-1 rounded-lg shrink-0 hover:text-[#F5F5F5] transition-colors">
          Edit
        </div>
      </div>
    );
  }

  // COLLAPSED INCOMPLETE VIEW
  if (!isCardExpanded && !completed) {
    return (
      <div
        onClick={toggleExpand}
        className="mb-3 bg-[#14171A] border border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#1B1F23] border border-[#272B30] text-[#E11D48] flex items-center justify-center font-black text-xs shrink-0">
            +
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-[#F5F5F5] truncate">
              {exercise.name}
            </div>
            <div className="text-[11px] text-[#9CA3AF] capitalize truncate mt-0.5">
              {exercise.primaryMuscle} • {sets.length} {sets.length === 1 ? 'set' : 'sets'}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-extrabold text-[#E11D48] bg-[#E11D48]/10 border border-[#E11D48]/30 px-2.5 py-1 rounded-lg shrink-0">
          Start
        </div>
      </div>
    );
  }

  // EXPANDED ACTIVE VIEW
  return (
    <Card className={`mb-3 border transition-all ${completed ? 'border-[#22C55E]/50 bg-[#14171A] shadow-md' : 'border-[#E11D48]/50 bg-[#14171A] shadow-md'}`}>
      {/* Exercise Card Header - Click to Collapse */}
      <div
        onClick={toggleExpand}
        className="flex items-start gap-3 mb-3 cursor-pointer select-none"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1B1F23] flex-shrink-0 border border-[#272B30]">
          {!imgError ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1B1F23] text-[#6B7280]">
              <Dumbbell className="w-5 h-5 opacity-40" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-base font-extrabold text-[#F5F5F5] truncate leading-tight flex items-center gap-1.5">
              {completed && <Check className="w-4 h-4 text-[#22C55E] stroke-[3] inline shrink-0" />}
              <span>{exercise.name}</span>
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeExerciseFromWorkout(userId, workoutExercise.id);
              }}
              className="p-1 text-[#6B7280] hover:text-[#EF4444] transition-colors cursor-pointer"
              title="Remove exercise"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 mt-1">
            <Badge variant="primary">{exercise.primaryMuscle.toUpperCase()}</Badge>
            {exercise.muscleAreaEmphasis.map((area) => (
              <Badge key={area} variant="secondary">
                {getMuscleAreaName(area)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* PR Badge if available */}
      {exercisePR && (
        <div className="mb-2 bg-[#E11D48]/10 border border-[#E11D48]/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#E11D48] font-black">
            <Trophy className="w-3.5 h-3.5" />
            <span>Personal Record</span>
          </div>
          <div className="text-xs font-bold text-[#F5F5F5]">
            {exercisePR.weight} kg × {exercisePR.reps} <span className="text-[11px] text-[#9CA3AF] font-normal">(1RM: {exercisePR.estimated1RM} kg)</span>
          </div>
        </div>
      )}

      {/* Previous Workout Comparison Panel */}
      <div className="my-2 bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 text-xs space-y-2 transition-all">
        <div className="flex items-center justify-between border-b border-[#272B30] pb-1.5">
          <div className="flex items-center gap-1.5 text-[#9CA3AF] font-bold uppercase tracking-wider text-[11px]">
            <History className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Previous Workout</span>
          </div>
          {prevPerf && (
            <span className="text-[11px] text-[#6B7280] font-medium">
              {formatDateShort(prevPerf.date)}
            </span>
          )}
        </div>

        {prevPerf && prevPerf.sets && prevPerf.sets.length > 0 ? (
          <div className="space-y-1 pt-0.5">
            {prevPerf.sets.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-[#14171A] border border-[#272B30]/80"
              >
                <span className="text-[11px] font-bold text-[#6B7280]">Set {s.setNumber}</span>
                <span className="font-extrabold text-[#F5F5F5]">
                  {s.weight} kg <span className="text-[#9CA3AF] font-normal">× {s.reps} reps</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[#6B7280] italic py-1">
            No previous workout
          </div>
        )}
      </div>

      {/* Set Header */}
      <div className="flex items-center justify-between text-[10px] font-bold text-[#6B7280] uppercase px-2 mb-1.5">
        <span className="w-7 text-center">Set</span>
        <span className="w-18 hidden sm:block">Previous</span>
        <span className="flex-1 text-center">Weight</span>
        <span className="w-3"></span>
        <span className="flex-1 text-center">Reps</span>
        <span className="w-11 text-center">Done</span>
      </div>

      {/* Sets List */}
      <div className="space-y-1 mb-2.5">
        {sets.map((set, idx) => (
          <SetRow
            key={set.id}
            set={set}
            prevSet={prevPerf?.sets[idx]}
            onUpdate={(w, r) => updateSet(userId, workoutExercise.id, idx, w, r)}
            onToggleComplete={() => toggleSetCompleted(userId, workoutExercise.id, idx)}
            onRemove={() => removeSetFromExercise(userId, workoutExercise.id, idx)}
            canRemove={sets.length > 1}
          />
        ))}
      </div>

      {/* Card Actions: Add Set, Notes, & Done */}
      <div className="flex items-center justify-between pt-2 border-t border-[#272B30] gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addSetToExercise(userId, workoutExercise.id)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#E11D48]" />
            <span>Add Set</span>
          </Button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors font-medium cursor-pointer"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>{notes ? 'Edit Note' : 'Add Note'}</span>
          </button>
        </div>

        {/* Done / Finish Exercise Action */}
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleExerciseCompleted(userId, workoutExercise.id);
            if (onDone) {
              onDone();
            }
          }}
          className={`font-black px-4 cursor-pointer min-h-[38px] ${
            completed
              ? 'bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0D0F]'
              : 'bg-[#E11D48] hover:bg-[#F43F5E] text-[#FFFFFF]'
          }`}
        >
          <Check className="w-4 h-4 mr-1 stroke-[3]" />
          <span>{completed ? 'Done ✓' : 'Done'}</span>
        </Button>
      </div>

      {/* Optional Exercise Note Input */}
      {showNotes && (
        <div className="mt-2 pt-2 border-t border-[#272B30]">
          <input
            type="text"
            placeholder="Add note (e.g. seat height 4, felt easy)..."
            value={notes}
            onChange={(e) => updateExerciseNotes(userId, workoutExercise.id, e.target.value)}
            className="w-full bg-[#1B1F23] border border-[#272B30] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#6B7280] focus:outline-none focus:border-[#E11D48]"
          />
        </div>
      )}
    </Card>
  );
};
