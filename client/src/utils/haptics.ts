/**
 * Native Haptic Feedback Utility for Mobile Web
 * Uses navigator.vibrate with graceful fallbacks
 */

export type HapticType = 'light' | 'medium' | 'success' | 'warning';

export const triggerHaptic = (type: HapticType = 'light') => {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof navigator.vibrate !== 'function'
  ) {
    return;
  }

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
    // Silently handle devices that do not support or restrict vibration
  }
};
