import React from 'react';
import { Timer, Plus, X, Volume2, VolumeX } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';

export const RestTimerBar: React.FC = () => {
  const {
    restSecondsRemaining,
    restTotalSeconds,
    isRestActive,
    isSoundEnabled,
    addSeconds,
    stopRestTimer,
    toggleSound,
  } = useTimerStore();

  if (!isRestActive || restSecondsRemaining <= 0) return null;

  const minutes = Math.floor(restSecondsRemaining / 60);
  const seconds = restSecondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.min(
    100,
    Math.max(0, ((restTotalSeconds - restSecondsRemaining) / (restTotalSeconds || 1)) * 100)
  );

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+10px)] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm animate-slide-up pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-[#18181B]/95 dark:bg-[#121212]/95 backdrop-blur-xl border border-[var(--primary)]/50 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(239,68,68,0.2)] p-2.5 sm:p-3 text-[var(--text-main)] flex items-center justify-between gap-3">
        {/* Subtle background progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--primary)]/10 transition-all duration-1000 ease-linear pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Timer Display */}
        <div className="relative flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] shrink-0 shadow-xs animate-pulse">
            <Timer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
                Rest Timer
              </span>
              <button
                type="button"
                onClick={toggleSound}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-0.5 cursor-pointer"
                title={isSoundEnabled ? 'Mute chime' : 'Enable chime'}
              >
                {isSoundEnabled ? (
                  <Volume2 className="w-3 h-3 text-[var(--text-secondary)]" />
                ) : (
                  <VolumeX className="w-3 h-3 text-[var(--text-muted)]" />
                )}
              </button>
            </div>
            <span className="text-base sm:text-lg font-black text-[var(--text-main)] tracking-tight font-mono">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => addSeconds(30)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] active:scale-95 border border-[var(--border-subtle)] text-xs font-black text-[var(--text-main)] flex items-center gap-1 transition-all cursor-pointer shadow-xs select-none touch-manipulation"
            title="Add 30 seconds"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>+30s</span>
          </button>

          <button
            type="button"
            onClick={stopRestTimer}
            className="p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-rose-500/20 active:scale-95 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-400 transition-all cursor-pointer shadow-xs"
            title="Skip Rest"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
