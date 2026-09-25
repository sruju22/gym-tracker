import React from 'react';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { formatDateShort } from '../../utils/formatters';

export const RecentWorkout: React.FC = () => {
  const { history } = useWorkoutStore();
  const lastWorkout = history[0];

  if (!lastWorkout) return null;

  return (
    <Card className="w-full p-5 sm:p-6 rounded-2xl border border-slate-800 bg-[#121827]">
      <h3 className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        RECENT WORKOUT
      </h3>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm sm:text-base font-black text-slate-100 uppercase">
          {lastWorkout.muscleGroups.join(' + ')}
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {formatDateShort(lastWorkout.date)}
        </span>
      </div>

      <div className="text-xs sm:text-sm text-slate-400 font-medium">
        {lastWorkout.exercises.length} exercises · {lastWorkout.totalSets} sets · <span className="text-sky-400 font-bold">{lastWorkout.totalVolume.toLocaleString()} kg</span>
      </div>
    </Card>
  );
};
