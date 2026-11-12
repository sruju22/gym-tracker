/**
 * Universal Mobile Haptic Feedback Engine
 * 
 * Multi-layer tactile feedback designed for:
 * 1. Apple iOS Safari / WebKit: Native Taptic Engine switch trigger (<input type="checkbox" switch>)
 * 2. Apple iOS All Versions: Low-frequency sub-bass acoustic mechanical transient (50-70Hz)
 *    physically resonating the iPhone taptic chassis
 * 3. Android & Chrome: Native navigator.vibrate() API
 */

export type HapticType = 'light' | 'medium' | 'success' | 'warning';

let audioCtx: AudioContext | null = null;
let iosSwitchInput: HTMLInputElement | null = null;

// Initialize hidden iOS switch for Safari Taptic Engine within active viewport
const getIosSwitch = (): HTMLInputElement | null => {
  if (typeof document === 'undefined') return null;
  if (!iosSwitchInput) {
    let existing = document.getElementById('ios-haptic-switch') as HTMLInputElement | null;
    if (!existing) {
      existing = document.createElement('input');
      existing.type = 'checkbox';
      existing.id = 'ios-haptic-switch';
      existing.setAttribute('switch', '');
      // Keep inside active viewport so Safari does not cull/ignore hardware Taptic events
      existing.style.position = 'fixed';
      existing.style.bottom = '1px';
      existing.style.right = '1px';
      existing.style.width = '1px';
      existing.style.height = '1px';
      existing.style.opacity = '0.001';
      existing.style.pointerEvents = 'none';
      existing.style.zIndex = '-9999';
      existing.setAttribute('aria-hidden', 'true');
      document.body.appendChild(existing);
    }
    iosSwitchInput = existing;
  }
  return iosSwitchInput;
};

// Proactively unlock AudioContext on the first touch gesture anywhere
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtx && AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      getIosSwitch();
    } catch {}
  };
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
}

// Low-frequency mechanical impulse generator (50Hz-70Hz sub-bass transient)
const playTactileImpulse = (frequency = 60, durationMs = 12, volume = 0.6) => {
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

    // Fast snappy attack and rapid exponential decay
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
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'success':
          navigator.vibrate([18, 45, 25]);
          break;
        case 'warning':
          navigator.vibrate([35, 60, 40]);
          break;
        default:
          navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration error
    }
  }

  // 3. Web Audio tactile physical chassis vibration (deep resonant mechanical kick)
  switch (type) {
    case 'light':
      playTactileImpulse(62, 10, 0.65);
      break;
    case 'medium':
      playTactileImpulse(54, 16, 0.8);
      break;
    case 'success':
      playTactileImpulse(70, 10, 0.75);
      setTimeout(() => {
        const sw = getIosSwitch();
        if (sw) {
          try {
            sw.click();
          } catch {}
        }
        playTactileImpulse(85, 14, 0.85);
      }, 55);
      break;
    case 'warning':
      playTactileImpulse(48, 25, 0.9);
      setTimeout(() => playTactileImpulse(48, 25, 0.9), 75);
      break;
  }
};
