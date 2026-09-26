import React from 'react';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

export const QuickStatsRow: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getHistory } = useWorkoutStore();
  const history = getHistory(userId);

  const totalVolume = history.reduce((acc, h) => acc + h.totalVolume, 0);
  const totalSets = history.reduce((acc, h) => acc + h.totalSets, 0);

  return (
    <div className="grid grid-cols-3 gap-2.5 w-full">
      <div className="bg-[#14171A] border border-[#272B30] rounded-2xl p-3 text-center shadow-xs">
        <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-0.5">
          THIS WEEK
        </div>
        <div className="text-base font-extrabold text-[#F5F5F5]">
          {history.length} <span className="text-xs font-normal text-[#9CA3AF]">days</span>
        </div>
      </div>

      <div className="bg-[#14171A] border border-[#272B30] rounded-2xl p-3 text-center shadow-xs">
        <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-0.5">
          VOLUME
        </div>
        <div className="text-base font-black text-[#E11D48]">
          {(totalVolume / 1000).toFixed(1)}k <span className="text-xs font-normal text-[#9CA3AF]">kg</span>
        </div>
      </div>

      <div className="bg-[#14171A] border border-[#272B30] rounded-2xl p-3 text-center shadow-xs">
        <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-0.5">
          TOTAL SETS
        </div>
        <div className="text-base font-extrabold text-[#F5F5F5]">
          {totalSets} <span className="text-xs font-normal text-[#9CA3AF]">sets</span>
        </div>
      </div>
    </div>
  );
};
