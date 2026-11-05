import React, { useState } from 'react';
import { Check, Trash2, AlertCircle } from 'lucide-react';
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
    const repsVal = set.reps !== null ? set.reps : (prevSet?.reps ?? null);
    onUpdate(nextVal, repsVal);
    if (feedbackMsg) setFeedbackMsg(null);
  };

  const adjustReps = (delta: number) => {
    const base = set.reps !== null && set.reps > 0
      ? set.reps
      : (prevSet && prevSet.reps > 0 ? prevSet.reps : 0);
    const nextVal = Math.max(1, base + delta);
    const weightVal = set.weight !== null ? set.weight : (prevSet?.weight ?? null);
    onUpdate(weightVal, nextVal);
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
        {/* Set Number */}
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

        {/* Weight Input (Clean, touch-friendly, no overlapping buttons) */}
        <div className="flex-1 min-w-[75px] sm:min-w-[90px]">
          <div className="relative flex items-center">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={prevSet ? String(prevSet.weight) : 'kg'}
              value={set.weight !== null ? set.weight : ''}
              onChange={handleWeightChange}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-xl px-3 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none min-h-[42px] touch-manipulation transition-colors"
            />
            <span className="absolute right-2 text-[10px] font-bold text-[var(--text-muted)] pointer-events-none select-none">
              kg
            </span>
          </div>
        </div>

        <span className="text-xs text-[var(--text-muted)] font-black">×</span>

        {/* Reps Input (Clean, touch-friendly, no overlapping buttons) */}
        <div className="flex-1 min-w-[70px] sm:min-w-[85px]">
          <div className="relative flex items-center">
            <input
              type="number"
              inputMode="numeric"
              placeholder={prevSet ? String(prevSet.reps) : 'reps'}
              value={set.reps !== null ? set.reps : ''}
              onChange={handleRepsChange}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-xl px-3 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none min-h-[42px] touch-manipulation transition-colors"
            />
            <span className="absolute right-2 text-[10px] font-bold text-[var(--text-muted)] pointer-events-none select-none">
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

      {/* Sub-row: Previous Performance & Quick Adjust Controls */}
      <div className="flex items-center justify-between px-2 min-h-[22px] text-[10px]">
        {/* Previous set hint */}
        <div className="text-[10px] text-[var(--text-muted)] font-medium truncate">
          {prevSet ? `Prev: ${prevSet.weight}kg × ${prevSet.reps}` : 'First time set'}
        </div>

        {/* Feedback warning notice if user tapped check on empty row */}
        {feedbackMsg ? (
          <span className="text-[10px] font-extrabold text-amber-500 flex items-center gap-1 ml-auto animate-pulse">
            <AlertCircle className="w-3 h-3" /> {feedbackMsg}
          </span>
        ) : !isCompleted ? (
          /* Touch-friendly Quick Steppers: shown only when set is active/uncompleted */
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Weight quick adjust */}
            <div className="inline-flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5 shadow-2xs">
              <span className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase px-1">Wt</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adjustWeight(-2.5)}
                className="h-5 px-1.5 rounded text-[10px] font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-main)] active:bg-[var(--primary-subtle)] active:text-[var(--primary)] transition-all cursor-pointer select-none touch-manipulation"
                title="Decrease weight by 2.5 kg"
              >
                -2.5
              </button>
              <span className="w-px h-2.5 bg-[var(--border-subtle)]" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adjustWeight(2.5)}
                className="h-5 px-1.5 rounded text-[10px] font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-main)] active:bg-[var(--primary-subtle)] active:text-[var(--primary)] transition-all cursor-pointer select-none touch-manipulation"
                title="Increase weight by 2.5 kg"
              >
                +2.5
              </button>
            </div>

            {/* Reps quick adjust */}
            <div className="inline-flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5 shadow-2xs">
              <span className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase px-1">Reps</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adjustReps(-1)}
                className="h-5 px-1.5 rounded text-[10px] font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-main)] active:bg-[var(--primary-subtle)] active:text-[var(--primary)] transition-all cursor-pointer select-none touch-manipulation"
                title="Decrease reps by 1"
              >
                -1
              </button>
              <span className="w-px h-2.5 bg-[var(--border-subtle)]" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adjustReps(1)}
                className="h-5 px-1.5 rounded text-[10px] font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-main)] active:bg-[var(--primary-subtle)] active:text-[var(--primary)] transition-all cursor-pointer select-none touch-manipulation"
                title="Increase reps by 1"
              >
                +1
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
