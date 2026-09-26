import React, { useState } from 'react';
import { Plus, Trash2, StickyNote, Dumbbell, History, Trophy } from 'lucide-react';
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
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ workoutExercise }) => {
  const { exercise, sets, notes } = workoutExercise;
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const {
    updateSet,
    toggleSetCompleted,
    addSetToExercise,
    removeSetFromExercise,
    removeExerciseFromWorkout,
    updateExerciseNotes,
    getPreviousPerformance,
    getExercisePR,
  } = useWorkoutStore();

  const [showNotes, setShowNotes] = useState(Boolean(notes));
  const [imgError, setImgError] = useState(false);

  const prevPerf = getPreviousPerformance(userId, exercise.id);
  const exercisePR = getExercisePR(userId, exercise.id);

  return (
    <Card className="mb-3 border border-[#272B30] bg-[#14171A]">
      {/* Exercise Card Header */}
      <div className="flex items-start gap-3 mb-3">
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
            <h3 className="text-base font-extrabold text-[#F5F5F5] truncate leading-tight">
              {exercise.name}
            </h3>
            <button
              onClick={() => removeExerciseFromWorkout(userId, workoutExercise.id)}
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

      {/* PR & Previous Performance Panel */}
      <div className="space-y-1.5 mb-3">
        {exercisePR && (
          <div className="bg-[#E11D48]/10 border border-[#E11D48]/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#E11D48] font-black">
              <Trophy className="w-3.5 h-3.5" />
              <span>Personal Record</span>
            </div>
            <div className="text-xs font-bold text-[#F5F5F5]">
              {exercisePR.weight} kg × {exercisePR.reps} <span className="text-[11px] text-[#9CA3AF] font-normal">(1RM: {exercisePR.estimated1RM} kg)</span>
            </div>
          </div>
        )}

        <div className="bg-[#1B1F23] rounded-xl px-3 py-2 border border-[#272B30] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#9CA3AF] font-medium">
            <History className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Previous:</span>
          </div>

          {prevPerf ? (
            <div className="flex items-center gap-1.5 font-semibold text-[#F5F5F5] truncate max-w-[70%]">
              <span className="text-[11px] text-[#6B7280] font-normal mr-1">{formatDateShort(prevPerf.date)}:</span>
              {prevPerf.sets.map((s, idx) => (
                <span key={idx} className="bg-[#14171A] border border-[#272B30] px-1.5 py-0.5 rounded text-[11px] text-[#9CA3AF]">
                  {s.weight}kg × {s.reps}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#6B7280] italic">First time performing this exercise</span>
          )}
        </div>
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

      {/* Card Actions: Add Set & Notes */}
      <div className="flex items-center justify-between pt-2 border-t border-[#272B30]">
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
