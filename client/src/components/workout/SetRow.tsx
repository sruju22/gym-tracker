import React, { useState, useRef } from 'react';
import { Check, Trash2, AlertCircle, Disc } from 'lucide-react';
import { WorkoutSet } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import { useTimerStore } from '../../store/timerStore';
import { PlateCalculatorModal } from './PlateCalculatorModal';

interface SetRowProps {
  set: WorkoutSet;
  prevSet?: { weight: number; reps: number };
  onUpdate: (weight: number | null, reps: number | null) => void;
  onToggleComplete: () => void;
  onCompleteWithAutoFill?: (fallbackWeight?: number | null, fallbackReps?: number | null) => boolean;
  onRemove?: () => void;
  canRemove?: boolean;
  defaultRestSeconds?: number;
  exerciseName?: string;
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  prevSet,
  onUpdate,
  onToggleComplete,
  onCompleteWithAutoFill,
  onRemove,
  canRemove = false,
  defaultRestSeconds = 90,
  exerciseName,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canRemove || !onRemove) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || !canRemove || !onRemove) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
      if (diffX < 0) {
        setSwipeX(Math.max(-80, diffX));
      } else {
        setSwipeX(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    touchStartX.current = null;
    touchStartY.current = null;

    if (swipeX <= -60 && canRemove && onRemove) {
      triggerHaptic('warning');
      onRemove();
    }
    setSwipeX(0);
  };

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
    triggerHaptic('light');
    const base = set.weight !== null && set.weight > 0
      ? set.weight
      : (prevSet && prevSet.weight > 0 ? prevSet.weight : 0);
    const nextVal = Math.max(0, Math.round((base + delta) * 10) / 10);
    const repsVal = set.reps !== null && set.reps > 0 ? set.reps : (prevSet?.reps ?? 10);
    onUpdate(nextVal, repsVal);
    if (feedbackMsg) setFeedbackMsg(null);
  };

  const adjustReps = (delta: number) => {
    triggerHaptic('light');
    const base = set.reps !== null && set.reps > 0
      ? set.reps
      : (prevSet && prevSet.reps > 0 ? prevSet.reps : 10);
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
      triggerHaptic('light');
      onToggleComplete();
      useTimerStore.getState().stopRestTimer();
      setFeedbackMsg(null);
      return;
    }

    // 2. If valid manual inputs exist, validate and complete
    if (isValid) {
      triggerHaptic('success');
      if (onCompleteWithAutoFill) {
        onCompleteWithAutoFill(set.weight, set.reps);
      } else {
        onToggleComplete();
      }
      useTimerStore.getState().startRestTimer(defaultRestSeconds, exerciseName);
      setFeedbackMsg(null);
      return;
    }

    // 3. One-tap autofill from previous workout performance
    if (prevSet && prevSet.weight > 0 && prevSet.reps > 0) {
      triggerHaptic('success');
      const finalWeight = (set.weight !== null && set.weight > 0) ? set.weight : prevSet.weight;
      const finalReps = (set.reps !== null && set.reps > 0) ? set.reps : prevSet.reps;

      if (onCompleteWithAutoFill) {
        onCompleteWithAutoFill(finalWeight, finalReps);
      } else {
        onUpdate(finalWeight, finalReps);
        onToggleComplete();
      }
      useTimerStore.getState().startRestTimer(defaultRestSeconds, exerciseName);
      setFeedbackMsg(null);
      return;
    }

    // 4. Never silently ignore checkmark: provide clear feedback
    triggerHaptic('warning');
    setFeedbackMsg('Enter weight & reps');
    setFeedbackMsg('Enter weight & reps');
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 2500);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background Delete Action Bar revealed ONLY when actively swiping left */}
      {canRemove && onRemove && swipeX < 0 && (
        <div
          onClick={() => {
            triggerHaptic('warning');
            onRemove();
          }}
          style={{
            opacity: Math.min(1, Math.abs(swipeX) / 30),
          }}
          className="absolute inset-y-0 right-0 w-20 bg-rose-600 text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer rounded-r-xl select-none z-0"
        >
          <Trash2 className="w-4 h-4 stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase tracking-wider">Delete</span>
        </div>
      )}

      {/* Main Set Container with Solid Background */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        className="relative z-10 flex flex-col gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1.5 sm:p-2 shadow-2xs"
      >
        {/* Main Set Input Row */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 rounded-lg transition-all ${
            isCompleted
              ? 'bg-[var(--success-subtle)] border border-[var(--success-border)]'
              : feedbackMsg
              ? 'bg-amber-500/10 border border-amber-500/40 shadow-xs'
              : 'bg-[var(--bg-surface)]'
          }`}
        >
          {/* Set Number */}
          <div className="w-7 sm:w-8 flex flex-col items-center justify-center shrink-0">
            <span
              className={`text-xs font-black rounded-md w-6 h-6 flex items-center justify-center transition-all ${
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

          {/* Weight Input + Plate Helper Button */}
          <div className="flex-1 min-w-[75px] sm:min-w-[90px]">
            <div className="relative flex items-center">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={prevSet ? String(prevSet.weight) : 'kg'}
                value={set.weight !== null ? set.weight : ''}
                onChange={handleWeightChange}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-lg px-2 py-1.5 pr-8 text-center text-sm font-black text-[var(--text-main)] placeholder:text-[var(--text-muted)]/70 placeholder:font-normal focus:outline-none min-h-[40px] touch-manipulation transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsPlateModalOpen(true);
                }}
                className="absolute right-1 px-1 py-0.5 rounded text-[10px] font-bold text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-0.5"
                title="Open Plate Breakdown Helper"
              >
                <span>kg</span>
                <Disc className="w-2.5 h-2.5 opacity-60" />
              </button>
            </div>
          </div>

          <span className="text-xs text-[var(--text-muted)] font-black">×</span>

          {/* Reps Input */}
          <div className="flex-1 min-w-[70px] sm:min-w-[85px]">
            <div className="relative flex items-center">
              <input
                type="number"
                inputMode="numeric"
                placeholder={prevSet ? String(prevSet.reps) : '10'}
                value={set.reps !== null ? set.reps : ''}
                onChange={handleRepsChange}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded-lg px-2.5 py-1.5 text-center text-sm font-black text-[var(--text-main)] placeholder:text-[var(--text-muted)]/70 placeholder:font-normal focus:outline-none min-h-[40px] touch-manipulation transition-colors"
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
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
              isCompleted
                ? 'bg-[var(--success)] text-white shadow-sm shadow-emerald-500/25'
                : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-main)]'
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
              title="Remove set (or swipe left)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sub-row: Previous Performance & Ergonomic Quick Stepper Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-1 text-[10px] min-h-[28px]">
          {/* Set / Previous column label */}
          <div className="w-7 sm:w-8 shrink-0 flex items-center justify-center text-[10px] text-[var(--text-muted)] font-medium">
            {prevSet ? (
              <span className="block sm:hidden truncate text-[9px] text-[var(--text-muted)] font-semibold" title={`Prev: ${prevSet.weight}kg × ${prevSet.reps}`}>
                Prev
              </span>
            ) : (
              <span className="block sm:hidden text-[9px] text-[var(--text-muted)] font-medium">New</span>
            )}
          </div>

          {/* Previous hint desktop */}
          <div className="w-18 hidden sm:block text-[10px] text-[var(--text-muted)] truncate font-medium">
            {prevSet ? `${prevSet.weight}k × ${prevSet.reps}` : 'Baseline'}
          </div>

          {/* Weight Quick Stepper: Aligned directly under Weight input */}
          <div className="flex-1 min-w-[75px] sm:min-w-[90px]">
            {!isCompleted ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adjustWeight(-2.5)}
                  className="flex-1 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--primary)] active:text-white active:scale-95 border border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer select-none touch-manipulation shadow-2xs"
                  title="Decrease weight by 2.5 kg"
                >
                  -2.5
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adjustWeight(2.5)}
                  className="flex-1 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--primary)] active:text-white active:scale-95 border border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer select-none touch-manipulation shadow-2xs"
                  title="Increase weight by 2.5 kg"
                >
                  +2.5
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-[var(--success)] block text-center truncate">
                {set.weight} kg
              </span>
            )}
          </div>

          <span className="text-xs text-[var(--text-muted)] font-black opacity-0 select-none">×</span>

          {/* Reps Quick Stepper: Aligned directly under Reps input */}
          <div className="flex-1 min-w-[70px] sm:min-w-[85px]">
            {!isCompleted ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adjustReps(-1)}
                  className="flex-1 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--primary)] active:text-white active:scale-95 border border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer select-none touch-manipulation shadow-2xs"
                  title="Decrease reps by 1"
                >
                  -1
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adjustReps(1)}
                  className="flex-1 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--primary)] active:text-white active:scale-95 border border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer select-none touch-manipulation shadow-2xs"
                  title="Increase reps by 1"
                >
                  +1
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-[var(--success)] block text-center truncate">
                {set.reps} reps
              </span>
            )}
          </div>

          {/* Right column placeholder for alignment */}
          <div className="w-10 sm:w-11 shrink-0 flex items-center justify-center">
            {feedbackMsg && (
              <span className="text-[9px] font-black text-amber-500 animate-pulse text-center leading-tight">
                Fill kg/r
              </span>
            )}
          </div>
          {canRemove && onRemove && <div className="w-4 shrink-0" />}
        </div>
      </div>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        isOpen={isPlateModalOpen}
        onClose={() => setIsPlateModalOpen(false)}
        initialWeight={set.weight || prevSet?.weight || 60}
      />
    </div>
  );
};
