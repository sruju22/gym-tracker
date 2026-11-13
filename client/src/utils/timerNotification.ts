/**
 * GymTrackie Rest Timer Notification & Dynamic Tab Title Utilities
 * Supports iOS PWA WebKit ServiceWorker showNotification, Background Audio Keep-Alive,
 * dynamic tab title updates, and tight auto-closing.
 */

const DEFAULT_TITLE = 'GymTrackie — Fitness & Workout Tracking';
let activeNotification: Notification | null = null;
let titleResetTimeout: ReturnType<typeof setTimeout> | null = null;
let silentAudio: HTMLAudioElement | null = null;

/**
 * Determine recommended rest duration based on exercise mechanics:
 * - Compound multi-joint lifts: 180s (3 minutes) for ATP-CP and CNS recovery
 * - Isolation / machine / cable lifts: 90s (1.5 minutes) for optimal training density
 */
export const getRecommendedRestSeconds = (exerciseType?: string): number => {
  if (exerciseType === 'compound') {
    return 180;
  }
  return 90;
};

/**
 * Check if the browser environment supports Notifications.
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current notification permission state safely.
 */
export const getNotificationPermissionState = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
};

/**
 * Check whether app is running as an installed standalone PWA on iOS.
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent || '');
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
};

/**
 * iOS WebKit Background Audio Keep-Alive:
 * Prevents iOS from freezing the background JavaScript timer during a rest period.
 */
export const startBackgroundKeepAlive = (): void => {
  if (typeof window === 'undefined') return;
  try {
    if (!silentAudio) {
      // 1-second inaudible WAV audio data URI
      silentAudio = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      );
      silentAudio.loop = true;
      silentAudio.volume = 0.01;
    }
    silentAudio.play().catch(() => {});
  } catch {}
};

export const stopBackgroundKeepAlive = (): void => {
  if (silentAudio) {
    try {
      silentAudio.pause();
      silentAudio.currentTime = 0;
    } catch {}
  }
};

/**
 * Safely request notification permissions in response to a direct user action.
 */
export const requestTimerNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    // Fallback for older browsers using callback syntax
    return new Promise<boolean>((resolve) => {
      try {
        Notification.requestPermission((perm) => {
          resolve(perm === 'granted');
        });
      } catch {
        resolve(false);
      }
    });
  }
};

/**
 * Update browser tab title to show active rest countdown when tab is hidden or backgrounded.
 */
export const updateTabTitleWithTimer = (secondsRemaining: number, isFinished: boolean = false): void => {
  if (typeof document === 'undefined') return;

  if (titleResetTimeout) {
    clearTimeout(titleResetTimeout);
    titleResetTimeout = null;
  }

  if (isFinished) {
    document.title = '🔔 Ready for Next Set! · GymTrackie';
    return;
  }

  if (secondsRemaining > 0 && document.hidden) {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    document.title = `(${pad(mins)}:${pad(secs)}) Rest ⏱ · GymTrackie`;
  }
};

/**
 * Reset document title back to default.
 */
export const restoreDefaultTabTitle = (): void => {
  if (typeof document === 'undefined') return;
  document.title = DEFAULT_TITLE;
};

/**
 * Trigger system notification when outside the app / browser tab is backgrounded.
 * Uses ServiceWorker registration (mandatory for iOS PWA) with standard Notification fallback.
 */
export const showRestCompleteNotification = async (exerciseName?: string | null): Promise<void> => {
  if (typeof window === 'undefined') return;

  const title = 'Ready for Next Set! 🏋️';
  const body = exerciseName
    ? `Rest finished! Time to hit your next set of ${exerciseName}.`
    : 'Rest finished! Time to hit your next set.';

  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/gymtrackie-icon.svg',
    badge: '/favicon.svg',
    tag: 'gymtrackie-rest-notification',
    renotify: true,
    silent: false,
  };

  // 1. Service Worker showNotification (Required for iOS WebKit PWA and modern Android/Chrome)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    } catch {
      // Fall through to standard notification if service worker invocation fails
    }
  }

  // 2. Standard Notification fallback (for desktop browsers)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if (activeNotification) {
        try {
          activeNotification.close();
        } catch {}
        activeNotification = null;
      }

      const notification = new Notification(title, notificationOptions);
      activeNotification = notification;

      notification.onclick = () => {
        try {
          window.focus();
          notification.close();
        } catch {}
      };

      setTimeout(() => {
        try {
          if (activeNotification === notification) {
            notification.close();
            activeNotification = null;
          }
        } catch {}
      }, 5000);
    } catch {}
  }
};
