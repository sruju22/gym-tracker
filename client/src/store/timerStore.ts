import { create } from 'zustand';
import { triggerHaptic } from '../utils/haptics';

interface TimerState {
  restSecondsRemaining: number;
  restTotalSeconds: number;
  isRestActive: boolean;
  isSoundEnabled: boolean;
  startRestTimer: (durationSeconds?: number) => void;
  addSeconds: (seconds: number) => void;
  stopRestTimer: () => void;
  toggleSound: () => void;
  tick: () => void;
}

let restInterval: ReturnType<typeof setInterval> | null = null;

// Synthesize pleasant sound chimes via Web Audio API (zero external asset dependencies, works offline)
const playChime = (type: 'beep' | 'done') => {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'beep') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Done chime: two-tone ascending chord
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // Audio Context might be suspended until user interaction
  }
};

export const useTimerStore = create<TimerState>((set, get) => ({
  restSecondsRemaining: 0,
  restTotalSeconds: 90,
  isRestActive: false,
  isSoundEnabled: true,

  startRestTimer: (durationSeconds = 90) => {
    if (restInterval) {
      clearInterval(restInterval);
    }

    triggerHaptic('light');

    set({
      restSecondsRemaining: durationSeconds,
      restTotalSeconds: durationSeconds,
      isRestActive: true,
    });

    restInterval = setInterval(() => {
      get().tick();
    }, 1000);
  },

  addSeconds: (seconds = 30) => {
    triggerHaptic('light');
    set((state) => {
      const nextRemaining = state.restSecondsRemaining + seconds;
      const nextTotal = Math.max(state.restTotalSeconds, nextRemaining);
      return {
        restSecondsRemaining: nextRemaining,
        restTotalSeconds: nextTotal,
      };
    });
  },

  stopRestTimer: () => {
    if (restInterval) {
      clearInterval(restInterval);
      restInterval = null;
    }
    set({
      isRestActive: false,
      restSecondsRemaining: 0,
    });
  },

  toggleSound: () => {
    set((state) => ({ isSoundEnabled: !state.isSoundEnabled }));
  },

  tick: () => {
    const { restSecondsRemaining, isSoundEnabled } = get();

    if (restSecondsRemaining <= 1) {
      if (restInterval) {
        clearInterval(restInterval);
        restInterval = null;
      }

      if (isSoundEnabled) {
        playChime('done');
      }
      triggerHaptic('success');

      set({
        isRestActive: false,
        restSecondsRemaining: 0,
      });
      return;
    }

    // Play subtle countdown beep on last 3 seconds
    if (restSecondsRemaining <= 4 && restSecondsRemaining > 1) {
      if (isSoundEnabled) {
        playChime('beep');
      }
      triggerHaptic('light');
    }

    set({
      restSecondsRemaining: restSecondsRemaining - 1,
    });
  },
}));
