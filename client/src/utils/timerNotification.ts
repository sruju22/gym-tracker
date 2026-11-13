/**
 * GymTrackie Rest Timer Notification & Dynamic Tab Title Utilities
 * Safely handles Web Notifications, tight auto-closing, and out-of-tab title indicators.
 */

const DEFAULT_TITLE = 'GymTrackie — Fitness & Workout Tracking';
let activeNotification: Notification | null = null;
let titleResetTimeout: ReturnType<typeof setTimeout> | null = null;

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
 * Safely request notification permissions in background without disrupting user flow.
 */
export const requestTimerNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
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
 * Automatically tightly closes after 5 seconds to prevent system clutter.
 */
export const showRestCompleteNotification = (exerciseName?: string | null): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    // Close existing notification if any
    if (activeNotification) {
      try {
        activeNotification.close();
      } catch {}
      activeNotification = null;
    }

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

    const notification = new Notification(title, notificationOptions);

    activeNotification = notification;

    notification.onclick = () => {
      try {
        window.focus();
        notification.close();
      } catch {}
    };

    // Tightly close notification after 5 seconds so it doesn't linger forever
    setTimeout(() => {
      try {
        if (activeNotification === notification) {
          notification.close();
          activeNotification = null;
        }
      } catch {}
    }, 5000);
  } catch {
    // Notification constructor failed or blocked
  }
};
