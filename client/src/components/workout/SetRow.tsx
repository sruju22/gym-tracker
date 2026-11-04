import React, { useState } from 'react';
import { Check, Trash2, Plus, Minus, AlertCircle } from 'lucide-react';
import { WorkoutSet } from '../../types';

interface SetRowProps {
  set: WorkoutSet;
  prevSet?: { weight: number; reps: number };
  onUpdate: (weight: number | null, reps: number | null) => void;
  onToggleComplete: () => void;
  onCompleteWithAutoFill?: (fallbackWeight?: number | null, fallbackReps?: number | null) => boolean;
  onRemove?: () => void;
  canRemove?: boolean;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  prevSet,
  onUpdate,
  onToggleComplete,
  onCompleteWithAutoFill,
  onRemove,
  canRemove = false,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    onUpdate(val, set.reps);
    if (feedbackMsg) setFeedbackMsg(null);
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
    onUpdate(set.weight, val);
    if (feedbackMsg) setFeedbackMsg(null);
  };

  const adjustWeight = (delta: number) => {
    const base = set.weight !== null && set.weight > 0
      ? set.weight
      : (prevSet && prevSet.weight > 0 ? prevSet.weight : 0);
    const nextVal = Math.max(0, Math.round((base + delta) * 10) / 10);
    onUpdate(nextVal, set.reps);
    if (feedbackMsg) setFeedbackMsg(null);
  };

  const adjustReps = (delta: number) => {
    const base = set.reps !== null && set.reps > 0
      ? set.reps
      : (prevSet && prevSet.reps > 0 ? prevSet.reps : 0);
    const nextVal = Math.max(1, base + delta);
    onUpdate(set.weight, nextVal);
    if (feedbackMsg) setFeedbackMsg(null);
  };

  const isValid =
    set.weight !== null &&
    set.weight > 0 &&
    set.reps !== null &&
    set.reps > 0;

  const isCompleted = set.completed && isValid;

  const handleToggle = () => {
    // 1. If already completed, toggle off
    if (set.completed) {
      onToggleComplete();
      setFeedbackMsg(null);
      return;
    }

    // 2. If valid manual inputs exist, validate and complete
    if (isValid) {
      if (onCompleteWithAutoFill) {
        onCompleteWithAutoFill(set.weight, set.reps);
      } else {
        onToggleComplete();
      }
      setFeedbackMsg(null);
      return;
    }

    // 3. One-tap autofill from previous workout performance
    if (prevSet && prevSet.weight > 0 && prevSet.reps > 0) {
      const finalWeight = (set.weight !== null && set.weight > 0) ? set.weight : prevSet.weight;
      const finalReps = (set.reps !== null && set.reps > 0) ? set.reps : prevSet.reps;

      if (onCompleteWithAutoFill) {
        onCompleteWithAutoFill(finalWeight, finalReps);
      } else {
        onUpdate(finalWeight, finalReps);
        onToggleComplete();
      }
      setFeedbackMsg(null);
      return;
    }

    // 4. Never silently ignore checkmark: provide clear feedback
    setFeedbackMsg('Enter weight & reps');
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={`flex items-center gap-1.5 sm:gap-2 py-1.5 px-2 rounded-xl transition-all ${
          isCompleted
            ? 'bg-[var(--success-subtle)] border border-[var(--success-border)]'
            : feedbackMsg
            ? 'bg-amber-500/10 border border-amber-500/40 shadow-xs'
            : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'
        }`}
      >
        {/* Set Number & Mobile Previous Hint */}
        <div className="w-7 sm:w-8 flex flex-col items-center justify-center shrink-0">
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

        {/* Previous Performance Hint (Desktop Column) */}
        <div className="w-18 text-[11px] text-[var(--text-muted)] hidden sm:block truncate font-medium">
          {prevSet ? `${prevSet.weight}kg × ${prevSet.reps}` : '—'}
        </div>

        {/* Weight Input & Steppers */}
        <div className="flex-1 min-w-[80px]">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => adjustWeight(-2.5)}
              className="absolute left-1 z-10 w-5 h-5 flex items-center justify-center rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer select-none"
              title="-2.5 kg"
            >
              -
            </button>
            <input
              type="number"
              inputMode="decimal"
              placeholder={prevSet ? String(prevSet.weight) : 'kg'}
              value={set.weight !== null ? set.weight : ''}
              onChange={handleWeightChange}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-lg px-6 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none min-h-[42px]"
            />
            <button
              type="button"
              onClick={() => adjustWeight(2.5)}
              className="absolute right-5 sm:right-6 z-10 w-5 h-5 flex items-center justify-center rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer select-none"
              title="+2.5 kg"
            >
              +
            </button>
            <span className="absolute right-1 text-[9px] font-medium text-[var(--text-muted)] pointer-events-none">
              kg
            </span>
          </div>
        </div>

        <span className="text-xs text-[var(--text-muted)] font-bold">×</span>

        {/* Reps Input & Steppers */}
        <div className="flex-1 min-w-[75px]">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              className="absolute left-1 z-10 w-5 h-5 flex items-center justify-center rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer select-none"
              title="-1 rep"
            >
              -
            </button>
            <input
              type="number"
              inputMode="numeric"
              placeholder={prevSet ? String(prevSet.reps) : 'reps'}
              value={set.reps !== null ? set.reps : ''}
              onChange={handleRepsChange}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-lg px-6 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none min-h-[42px]"
            />
            <button
              type="button"
              onClick={() => adjustReps(1)}
              className="absolute right-5 sm:right-6 z-10 w-5 h-5 flex items-center justify-center rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer select-none"
              title="+1 rep"
            >
              +
            </button>
            <span className="absolute right-1 text-[9px] font-medium text-[var(--text-muted)] pointer-events-none">
              r
            </span>
          </div>
        </div>

        {/* Complete Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
            isCompleted
              ? 'bg-[var(--success)] text-white shadow-sm shadow-emerald-500/25'
              : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-main)]'
          }`}
          title={isCompleted ? 'Mark incomplete' : prevSet ? `Log ${prevSet.weight}kg × ${prevSet.reps}` : 'Mark complete'}
        >
          <Check className={`w-5 h-5 ${isCompleted ? 'stroke-[3] text-white' : 'stroke-2'}`} />
        </button>

        {/* Optional Remove Set Button */}
        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer shrink-0"
            title="Remove set"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Compact Mobile Previous Hint & Feedback Notice */}
      <div className="flex items-center justify-between px-2 text-[10px]">
        <div className="sm:hidden text-[10px] text-[var(--text-muted)] font-medium truncate">
          {prevSet ? `Prev: ${prevSet.weight}kg × ${prevSet.reps}` : 'First time set'}
        </div>
        {feedbackMsg && (
          <span className="text-[10px] font-extrabold text-amber-500 flex items-center gap-1 ml-auto animate-pulse">
            <AlertCircle className="w-3 h-3" /> {feedbackMsg}
          </span>
        )}
      </div>
    </div>
  );
};
