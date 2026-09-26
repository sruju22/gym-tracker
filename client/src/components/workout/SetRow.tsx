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

  const isValid =
    set.weight !== null &&
    set.weight > 0 &&
    set.reps !== null &&
    set.reps > 0;

  const isCompleted = set.completed && isValid;

  const handleToggle = () => {
    if (!set.completed && !isValid) {
      return;
    }
    onToggleComplete();
  };

  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition-all ${
        isCompleted
          ? 'bg-[#22C55E]/10 border border-[#22C55E]/30'
          : 'bg-[#1B1F23] border border-[#272B30]'
      }`}
    >
      {/* Set Number */}
      <div className="w-7 flex items-center justify-center">
        <span
          className={`text-xs font-black rounded-md w-6 h-6 flex items-center justify-center ${
            isCompleted ? 'bg-[#22C55E] text-[#0B0D0F] shadow-xs' : 'bg-[#272B30] text-[#9CA3AF]'
          }`}
        >
          {set.setNumber}
        </span>
      </div>

      {/* Previous Performance Hint */}
      <div className="w-18 text-[11px] text-[#6B7280] hidden sm:block truncate font-medium">
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
            className="w-full bg-[#0B0D0F] border border-[#272B30] focus:border-[#E11D48] rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-[#F5F5F5] placeholder-[#6B7280] focus:outline-none min-h-[42px]"
          />
          <span className="absolute right-2 text-[10px] font-medium text-[#6B7280] pointer-events-none">
            kg
          </span>
        </div>
      </div>

      <span className="text-xs text-[#6B7280] font-bold">×</span>

      {/* Reps Input */}
      <div className="flex-1 min-w-[70px]">
        <div className="relative flex items-center">
          <input
            type="number"
            inputMode="numeric"
            placeholder={prevSet ? String(prevSet.reps) : 'reps'}
            value={set.reps !== null ? set.reps : ''}
            onChange={handleRepsChange}
            className="w-full bg-[#0B0D0F] border border-[#272B30] focus:border-[#E11D48] rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-[#F5F5F5] placeholder-[#6B7280] focus:outline-none min-h-[42px]"
          />
          <span className="absolute right-2 text-[10px] font-medium text-[#6B7280] pointer-events-none">
            reps
          </span>
        </div>
      </div>

      {/* Complete Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
          isCompleted
            ? 'bg-[#22C55E] text-[#0B0D0F] shadow-sm shadow-[#22C55E]/30'
            : 'bg-[#272B30] text-[#6B7280] hover:bg-[#32373E] hover:text-[#F5F5F5]'
        }`}
      >
        <Check className={`w-5 h-5 ${isCompleted ? 'stroke-[3] text-[#0B0D0F]' : 'stroke-2'}`} />
      </button>

      {/* Optional Remove Set Button */}
      {canRemove && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-[#6B7280] hover:text-[#EF4444] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
