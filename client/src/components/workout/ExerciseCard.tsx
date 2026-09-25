import React, { useState } from 'react';
import { Plus, Trash2, StickyNote, Dumbbell } from 'lucide-react';
import { WorkoutExercise } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SetRow } from './SetRow';
import { getMuscleAreaName } from '../../data/muscleGroups';
import { useWorkoutStore } from '../../store/workoutStore';

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ workoutExercise }) => {
  const { exercise, sets, notes, previousPerformance } = workoutExercise;
  const {
    updateSet,
    toggleSetCompleted,
    addSetToExercise,
    removeSetFromExercise,
    removeExerciseFromWorkout,
    updateExerciseNotes,
  } = useWorkoutStore();

  const [showNotes, setShowNotes] = useState(Boolean(notes));
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="mb-3 border border-slate-800 bg-[#121827]">
      {/* Exercise Card Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
          {!imgError ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
              <Dumbbell className="w-5 h-5 opacity-40" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-base font-extrabold text-slate-100 truncate leading-tight">
              {exercise.name}
            </h3>
            <button
              onClick={() => removeExerciseFromWorkout(workoutExercise.id)}
              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
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

      {/* Previous Performance Panel */}
      {previousPerformance && (
        <div className="bg-slate-900/80 rounded-xl p-2.5 mb-3 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Last session:</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            {previousPerformance.sets.map((s, idx) => (
              <span key={idx} className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-300">
                {s.weight}kg × {s.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Set Header */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase px-2 mb-1.5">
        <span className="w-7 text-center">Set</span>
        <span className="w-18 hidden sm:block">Previous</span>
        <span className="flex-1 text-center">Weight</span>
        <span className="w-3"></span>
        <span className="flex-1 text-center">Reps</span>
        <span className="w-11 text-center">Done</span>
      </div>

      {/* Sets List (Defaults to exactly 3 sets) */}
      <div className="space-y-1 mb-2.5">
        {sets.map((set, idx) => (
          <SetRow
            key={set.id}
            set={set}
            prevSet={previousPerformance?.sets[idx]}
            onUpdate={(w, r) => updateSet(workoutExercise.id, idx, w, r)}
            onToggleComplete={() => toggleSetCompleted(workoutExercise.id, idx)}
            onRemove={() => removeSetFromExercise(workoutExercise.id, idx)}
            canRemove={sets.length > 1}
          />
        ))}
      </div>

      {/* Card Actions: Add Set & Notes */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSetToExercise(workoutExercise.id)}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1 text-sky-400" />
          <span>Add Set</span>
        </Button>

        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>{notes ? 'Edit Note' : 'Add Note'}</span>
        </button>
      </div>

      {/* Optional Exercise Note Input */}
      {showNotes && (
        <div className="mt-2 pt-2 border-t border-slate-800/80">
          <input
            type="text"
            placeholder="Add note (e.g. seat height 4, felt easy)..."
            value={notes}
            onChange={(e) => updateExerciseNotes(workoutExercise.id, e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      )}
    </Card>
  );
};
