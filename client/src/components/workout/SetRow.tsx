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
          ? 'bg-[var(--success-subtle)] border border-[var(--success-border)]'
          : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'
      }`}
    >
      {/* Set Number */}
      <div className="w-7 flex items-center justify-center">
        <span
          className={`text-xs font-black rounded-md w-6 h-6 flex items-center justify-center ${
            isCompleted
              ? 'bg-[var(--success)] text-white shadow-xs'
              : 'bg-[var(--border-subtle)] text-[var(--text-secondary)]'
          }`}
        >
          {set.setNumber}
        </span>
      </div>

      {/* Previous Performance Hint */}
      <div className="w-18 text-[11px] text-[var(--text-muted)] hidden sm:block truncate font-medium">
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
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none min-h-[42px]"
          />
          <span className="absolute right-2 text-[10px] font-medium text-[var(--text-muted)] pointer-events-none">
            kg
          </span>
        </div>
      </div>

      <span className="text-xs text-[var(--text-muted)] font-bold">×</span>

      {/* Reps Input */}
      <div className="flex-1 min-w-[70px]">
        <div className="relative flex items-center">
          <input
            type="number"
            inputMode="numeric"
            placeholder={prevSet ? String(prevSet.reps) : 'reps'}
            value={set.reps !== null ? set.reps : ''}
            onChange={handleRepsChange}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none min-h-[42px]"
          />
          <span className="absolute right-2 text-[10px] font-medium text-[var(--text-muted)] pointer-events-none">
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
            ? 'bg-[var(--success)] text-white shadow-sm shadow-emerald-500/25'
            : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-main)]'
        }`}
      >
        <Check className={`w-5 h-5 ${isCompleted ? 'stroke-[3] text-white' : 'stroke-2'}`} />
      </button>

      {/* Optional Remove Set Button */}
      {canRemove && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
