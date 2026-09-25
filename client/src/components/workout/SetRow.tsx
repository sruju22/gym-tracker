import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { WorkoutSet } from '../../types';

interface SetRowProps {
  set: WorkoutSet;
  prevSet?: { weight: number; reps: number };
  onUpdate: (weight: number | null, reps: number | null) => void;
  onToggleComplete: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  prevSet,
  onUpdate,
  onToggleComplete,
  onRemove,
  canRemove = false,
}) => {
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    onUpdate(val, set.reps);
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
    onUpdate(set.weight, val);
  };

  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition-all ${
        set.completed
          ? 'bg-sky-950/40 border border-sky-800/60'
          : 'bg-slate-900/80 border border-slate-800'
      }`}
    >
      {/* Set Number */}
      <div className="w-7 flex items-center justify-center">
        <span
          className={`text-xs font-black rounded-md w-6 h-6 flex items-center justify-center ${
            set.completed ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/20' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {set.setNumber}
        </span>
      </div>

      {/* Previous Performance Hint */}
      <div className="w-18 text-[11px] text-slate-500 hidden sm:block truncate font-medium">
        {prevSet ? `${prevSet.weight}kg × ${prevSet.reps}` : '—'}
      </div>

      {/* Weight Input */}
      <div className="flex-1 min-w-[75px]">
        <div className="relative flex items-center">
          <input
            type="number"
            inputMode="decimal"
            placeholder={prevSet ? String(prevSet.weight) : 'kg'}
            value={set.weight !== null ? set.weight : ''}
            onChange={handleWeightChange}
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-slate-100 placeholder-slate-600 focus:outline-none min-h-[42px]"
          />
          <span className="absolute right-2 text-[10px] font-medium text-slate-500 pointer-events-none">
            kg
          </span>
        </div>
      </div>

      <span className="text-xs text-slate-500 font-bold">×</span>

      {/* Reps Input */}
      <div className="flex-1 min-w-[70px]">
        <div className="relative flex items-center">
          <input
            type="number"
            inputMode="numeric"
            placeholder={prevSet ? String(prevSet.reps) : 'reps'}
            value={set.reps !== null ? set.reps : ''}
            onChange={handleRepsChange}
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-slate-100 placeholder-slate-600 focus:outline-none min-h-[42px]"
          />
          <span className="absolute right-2 text-[10px] font-medium text-slate-500 pointer-events-none">
            reps
          </span>
        </div>
      </div>

      {/* Complete Button */}
      <button
        onClick={onToggleComplete}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
          set.completed
            ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/30'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        <Check className={`w-5 h-5 ${set.completed ? 'stroke-[3] text-slate-950' : 'stroke-2'}`} />
      </button>

      {/* Optional Remove Set Button */}
      {canRemove && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
