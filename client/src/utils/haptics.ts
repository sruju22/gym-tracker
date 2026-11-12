/**
 * Universal Mobile Haptic Feedback Engine
 * 
 * Multi-layer tactile feedback designed for:
 * 1. Apple iOS Safari / WebKit: Native Taptic Engine switch trigger (<input type="checkbox" switch>)
 * 2. Apple iOS All Versions: Low-frequency Web Audio tactile impulse that physically vibrates the iPhone frame
 * 3. Android & Chrome: Native navigator.vibrate() API
 */

export type HapticType = 'light' | 'medium' | 'success' | 'warning';

let audioCtx: AudioContext | null = null;
let iosSwitchInput: HTMLInputElement | null = null;

// Initialize hidden iOS switch for Safari Taptic Engine
const getIosSwitch = (): HTMLInputElement | null => {
  if (typeof document === 'undefined') return null;
  if (!iosSwitchInput) {
    let existing = document.getElementById('ios-haptic-switch') as HTMLInputElement | null;
    if (!existing) {
      existing = document.createElement('input');
      existing.type = 'checkbox';
      existing.id = 'ios-haptic-switch';
      existing.setAttribute('switch', '');
      existing.style.position = 'fixed';
      existing.style.top = '-9999px';
      existing.style.left = '-9999px';
      existing.style.opacity = '0';
      existing.style.pointerEvents = 'none';
      existing.setAttribute('aria-hidden', 'true');
      document.body.appendChild(existing);
    }
    iosSwitchInput = existing;
  }
  return iosSwitchInput;
};

// Web Audio mechanical impulse generator (physically resonates through iPhone speaker & aluminum chassis)
const playTactileImpulse = (frequency = 130, durationMs = 18, volume = 0.22) => {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Fast snappy attack and exponential decay
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch {
    // Audio context may be restricted before first touch gesture
  }
};

export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof window === 'undefined') return;

  // 1. iOS Safari Taptic Engine Switch Trigger (iOS 17.4+ / iOS 18+)
  const switchEl = getIosSwitch();
  if (switchEl) {
    try {
      switchEl.click();
    } catch {
      // Ignore if DOM operation fails
    }
  }

  // 2. Android & Chromium Native Vibration API
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(28);
          break;
        case 'success':
          navigator.vibrate([18, 50, 25]);
          break;
        case 'warning':
          navigator.vibrate([35, 70, 45]);
          break;
        default:
          navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration error
    }
  }

  // 3. Web Audio tactile physical chassis vibration
  switch (type) {
    case 'light':
      playTactileImpulse(140, 15, 0.18);
      break;
    case 'medium':
      playTactileImpulse(110, 22, 0.28);
      break;
    case 'success':
      playTactileImpulse(180, 20, 0.22);
      setTimeout(() => playTactileImpulse(240, 25, 0.25), 60);
      break;
    case 'warning':
      playTactileImpulse(80, 35, 0.35);
      setTimeout(() => playTactileImpulse(80, 35, 0.35), 90);
      break;
  }
};
