/**
 * Universal Mobile Haptic Feedback Engine
 * 
 * Hardware-only silent physical tactile feedback:
 * 1. Apple iOS Safari / WebKit: Native hardware Taptic Engine switch trigger (<input type="checkbox" switch>)
 * 2. Android & Chrome: Native hardware vibration API (navigator.vibrate)
 * 
 * 100% silent — zero audio speaker playback.
 */

export type HapticType = 'light' | 'medium' | 'success' | 'warning';

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

// Proactively initialize switch element on touch
if (typeof window !== 'undefined') {
  const initHaptics = () => {
    getIosSwitch();
  };
  window.addEventListener('touchstart', initHaptics, { passive: true, once: true });
  window.addEventListener('pointerdown', initHaptics, { passive: true, once: true });
}

export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof window === 'undefined') return;

  // 1. iOS Safari Hardware Taptic Engine Switch Trigger
  const switchEl = getIosSwitch();
  if (switchEl) {
    try {
      switchEl.click();
      if (type === 'success') {
        setTimeout(() => {
          try {
            switchEl.click();
          } catch {}
        }, 50);
      }
    } catch {
      // Ignore if DOM operation fails
    }
  }

  // 2. Android & Chromium Native Hardware Vibration API (completely silent)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(20);
          break;
        case 'medium':
          navigator.vibrate(35);
          break;
        case 'success':
          navigator.vibrate([25, 40, 30]);
          break;
        case 'warning':
          navigator.vibrate([40, 50, 40]);
          break;
        default:
          navigator.vibrate(20);
      }
    } catch {
      // Ignore vibration error
    }
  }
};
