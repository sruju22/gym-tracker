import React from 'react';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { formatDateShort } from '../../utils/formatters';

export const RecentWorkout: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getHistory } = useWorkoutStore();
  const history = getHistory(userId);
  const lastWorkout = history[0];

  if (!lastWorkout) return null;

  return (
    <Card className="w-full p-5 sm:p-6 rounded-2xl border border-[#272B30] bg-[#14171A]">
      <h3 className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-3">
        RECENT WORKOUT
      </h3>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm sm:text-base font-black text-[#F5F5F5] uppercase">
          {lastWorkout.workoutName || lastWorkout.muscleGroups.join(' + ')}
        </span>
        <span className="text-xs text-[#9CA3AF] font-medium">
          {formatDateShort(lastWorkout.date)}
        </span>
      </div>

      <div className="text-xs sm:text-sm text-[#9CA3AF] font-medium">
        {lastWorkout.exercises.length} exercises · {lastWorkout.totalSets} sets · <span className="text-[#E11D48] font-bold">{lastWorkout.totalVolume.toLocaleString()} kg</span>
      </div>
    </Card>
  );
};
