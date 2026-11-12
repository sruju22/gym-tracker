import React, { useEffect } from 'react';
import { Timer, Plus, X, Volume2, VolumeX } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

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

  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.id || 'guest';
  const activeSession = useWorkoutStore((state) => state.getActiveSession(userId));
  const editingSession = useWorkoutStore((state) => state.getEditingSession(userId));
  const currentSession = editingSession || activeSession;

  // A rest timer is strictly valid only when an active workout with exercises is present
  const hasValidSessionExercises = Boolean(
    currentSession &&
    currentSession.exercises &&
    currentSession.exercises.length > 0
  );

  useEffect(() => {
    if (isRestActive && !hasValidSessionExercises) {
      stopRestTimer();
    }
  }, [isRestActive, hasValidSessionExercises, stopRestTimer]);

  if (!isRestActive || restSecondsRemaining <= 0 || !hasValidSessionExercises) return null;

  const minutes = Math.floor(restSecondsRemaining / 60);
  const seconds = restSecondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.min(
    100,
    Math.max(0, ((restTotalSeconds - restSecondsRemaining) / (restTotalSeconds || 1)) * 100)
  );

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+10px)] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm animate-slide-up pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-red-500/50 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_24px_rgba(239,68,68,0.22)] p-2.5 sm:p-3 text-[var(--text-main)] flex items-center justify-between gap-3">
        {/* Glowing bottom progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] transition-all duration-1000 ease-linear pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Subtle background glow */}
        <div
          className="absolute inset-y-0 left-0 bg-red-500/5 transition-all duration-1000 ease-linear pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Timer Display */}
        <div className="relative flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0 shadow-xs animate-pulse">
            <Timer className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                Rest Timer
              </span>
              <button
                type="button"
                onClick={toggleSound}
                className="text-[var(--text-muted)] hover:text-white transition-colors p-0.5 cursor-pointer"
                title={isSoundEnabled ? 'Mute chime' : 'Enable chime'}
              >
                {isSoundEnabled ? (
                  <Volume2 className="w-3 h-3 text-red-400/80" />
                ) : (
                  <VolumeX className="w-3 h-3 text-[var(--text-muted)]" />
                )}
              </button>
            </div>
            <span className="text-lg sm:text-xl font-black text-white tracking-tight font-mono drop-shadow-[0_2px_8px_rgba(239,68,68,0.3)]">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => addSeconds(30)}
            className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500 active:text-white text-red-400 border border-red-500/40 text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs select-none touch-manipulation active:scale-95"
            title="Add 30 seconds"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+30s</span>
          </button>

          <button
            type="button"
            onClick={stopRestTimer}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-rose-500/25 active:scale-95 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer shadow-xs"
            title="Skip Rest"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
