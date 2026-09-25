import React from 'react';
import { useWorkoutStore } from '../../store/workoutStore';

export const QuickStatsRow: React.FC = () => {
  const { history, personalRecords } = useWorkoutStore();

  const totalVolume = history.reduce((acc, h) => acc + h.totalVolume, 0);
  const totalSets = history.reduce((acc, h) => acc + h.totalSets, 0);

  return (
    <div className="grid grid-cols-3 gap-2.5 w-full">
      <div className="bg-[#121827] border border-slate-800 rounded-2xl p-3 text-center shadow-xs">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          THIS WEEK
        </div>
        <div className="text-base font-extrabold text-slate-100">
          {history.length} <span className="text-xs font-normal text-slate-400">days</span>
        </div>
      </div>

      <div className="bg-[#121827] border border-slate-800 rounded-2xl p-3 text-center shadow-xs">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          VOLUME
        </div>
        <div className="text-base font-black text-sky-400">
          {(totalVolume / 1000).toFixed(1)}k <span className="text-xs font-normal text-slate-400">kg</span>
        </div>
      </div>

      <div className="bg-[#121827] border border-slate-800 rounded-2xl p-3 text-center shadow-xs">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          TOTAL SETS
        </div>
        <div className="text-base font-extrabold text-slate-100">
          {totalSets} <span className="text-xs font-normal text-slate-400">sets</span>
        </div>
      </div>
    </div>
  );
};
