import {
  CardioSession,
  CardioWeeklyGoalSettings,
  DistanceUnit,
  UserCardioPreferences,
} from '../types';
import { getMondayOfWeek, getSundayOfWeek } from './analyticsEngine';
import { formatDuration } from './cardioMetrics';

export const DEFAULT_CARDIO_PREFERENCES: UserCardioPreferences = {
  preferredActivities: ['walking', 'running', 'cycling'],
  preferredDurationMinutes: 30,
  availableDaysPerWeek: 3,
  preferredIntensity: 'moderate',
};

export const DEFAULT_CARDIO_GOALS: CardioWeeklyGoalSettings = {
  durationMinutes: {
    enabled: true,
    target: 150, // 150 mins aerobic recommendation
  },
  distance: {
    enabled: false,
    target: 15,
    unit: 'km',
  },
  sessions: {
    enabled: true,
    target: 3,
  },
  isCustomized: false,
};

export type CanonicalFitnessGoal = 'fat_loss' | 'hypertrophy' | 'strength' | 'longevity';

/**
 * Normalizes user-entered or template fitness goal into a canonical goal type.
 */
export function normalizeFitnessGoal(rawGoal?: string): CanonicalFitnessGoal {
  const g = (rawGoal || '').toLowerCase();
  if (g.includes('fat') || g.includes('loss') || g.includes('conditioning')) return 'fat_loss';
  if (g.includes('strength') || g.includes('power')) return 'strength';
  if (
    g.includes('longevity') ||
    g.includes('general') ||
    g.includes('fitness') ||
    g.includes('health') ||
    g.includes('joint')
  ) {
    return 'longevity';
  }
  return 'hypertrophy';
}

/**
 * Generates goal-aware recommended weekly cardio targets based on fitness goal,
 * user preferences, and baseline health guidelines (minimum 150 mins for health).
 */
export function getRecommendedCardioGoals(
  fitnessGoal?: string,
  preferences?: UserCardioPreferences,
  experienceLevel?: string
): CardioWeeklyGoalSettings {
  const goal = normalizeFitnessGoal(fitnessGoal);
  const preferredDays = preferences?.availableDaysPerWeek;
  const preferredDur = preferences?.preferredDurationMinutes;

  let baseDuration: number;
  let baseSessions: number;

  switch (goal) {
    case 'fat_loss':
      baseDuration = 180; // 180 mins/week for fat loss & conditioning
      baseSessions = 4; // 3-4 sessions
      break;
    case 'hypertrophy':
      baseDuration = 150; // 150 mins general health, supportive
      baseSessions = 3;
      break;
    case 'strength':
      baseDuration = 150; // 150 mins general health, conditioning focus
      baseSessions = 3;
      break;
    case 'longevity':
    default:
      baseDuration = 150; // 150 mins balanced health
      baseSessions = 3;
      break;
  }

  // Adjust sessions based on user's available cardio days
  let targetSessions = baseSessions;
  if (Number.isFinite(preferredDays) && (preferredDays as number) > 0) {
    if (goal === 'fat_loss') {
      targetSessions = Math.min(Math.max(preferredDays as number, 3), 5);
    } else if (goal === 'longevity') {
      targetSessions = Math.min(Math.max(preferredDays as number, 3), 5);
    } else {
      // hypertrophy / strength: 2-3 sessions
      targetSessions = Math.min(Math.max(preferredDays as number, 2), 4);
    }
  }

  // Adjust duration based on preferred session duration and days, with general health floor (>= 150m)
  let targetDuration = baseDuration;
  if (
    Number.isFinite(preferredDur) &&
    (preferredDur as number) > 0 &&
    Number.isFinite(preferredDays) &&
    (preferredDays as number) > 0
  ) {
    const computedDuration = (preferredDur as number) * (preferredDays as number);
    const minFloor = goal === 'fat_loss' ? 180 : 150;
    targetDuration = Math.max(minFloor, computedDuration);
  }

  const hasDistanceActivity = preferences?.preferredActivities?.some(
    (a) => a === 'running' || a === 'cycling' || a === 'treadmill' || a === 'rowing'
  );

  return {
    durationMinutes: {
      enabled: true,
      target: targetDuration,
    },
    distance: {
      enabled: Boolean(hasDistanceActivity),
      target: goal === 'fat_loss' ? 20 : 15,
      unit: 'km',
    },
    sessions: {
      enabled: true,
      target: targetSessions,
    },
    isCustomized: false,
  };
}

/**
 * Resolves cardio goals safely without clobbering user manual custom targets.
 * Existing customized goals are strictly preserved.
 */
export function resolveCardioWeeklyGoals(
  existingGoals?: CardioWeeklyGoalSettings,
  fitnessGoal?: string,
  preferences?: UserCardioPreferences,
  experienceLevel?: string
): CardioWeeklyGoalSettings {
  if (existingGoals && existingGoals.isCustomized) {
    return existingGoals;
  }

  // Safeguard: if existing goal has values distinctly altered from default, treat as customized
  if (
    existingGoals &&
    (existingGoals.durationMinutes?.target !== DEFAULT_CARDIO_GOALS.durationMinutes.target ||
      existingGoals.sessions?.target !== DEFAULT_CARDIO_GOALS.sessions.target)
  ) {
    return {
      ...existingGoals,
      isCustomized: true,
    };
  }

  return getRecommendedCardioGoals(fitnessGoal, preferences, experienceLevel);
}

/**
 * Normalizes distance between units (km, mi, m).
 */
export function normalizeDistance(
  distance: number,
  fromUnit: DistanceUnit = 'km',
  toUnit: DistanceUnit = 'km'
): number {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  if (fromUnit === toUnit) return distance;

  // Step 1: Convert from source unit to kilometers
  let km = distance;
  if (fromUnit === 'm') {
    km = distance / 1000;
  } else if (fromUnit === 'mi') {
    km = distance * 1.60934;
  }

  // Step 2: Convert from kilometers to target unit
  if (toUnit === 'm') {
    return Math.round(km * 1000);
  }
  if (toUnit === 'mi') {
    return Math.round((km / 1.60934) * 100) / 100;
  }
  return Math.round(km * 100) / 100;
}

export interface CardioGoalItemProgress {
  type: 'duration' | 'distance' | 'sessions';
  label: string;
  enabled: boolean;
  target: number;
  current: number;
  unit: string;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
  formattedCurrent: string;
  formattedTarget: string;
  formattedRemaining: string;
}

export interface CardioWeeklyProgress {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  items: CardioGoalItemProgress[];
  activeCount: number;
  completedCount: number;
  allCompleted: boolean;
  totalWeeklyDurationMinutes: number;
  totalWeeklySessions: number;
  totalWeeklyDistanceKm: number;
}

/**
 * Returns Monday 00:00:00 to Sunday 23:59:59 week boundaries and label for a given reference date.
 */
export function getCardioWeekBoundaries(referenceDate: Date = new Date()): {
  start: Date;
  end: Date;
  weekLabel: string;
} {
  const start = getMondayOfWeek(referenceDate);
  const end = getSundayOfWeek(start);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();

  const weekLabel =
    startMonth === endMonth
      ? `${startMonth} ${startDay} – ${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  return { start, end, weekLabel };
}

/**
 * Calculates weekly cardio goal progress for the current calendar week (Monday to Sunday).
 * Handles missing/zero values safely and strictly derives from actual recorded sessions.
 */
export function calculateCardioWeeklyProgress(
  sessions: CardioSession[],
  settings: CardioWeeklyGoalSettings = DEFAULT_CARDIO_GOALS,
  referenceDate: Date = new Date()
): CardioWeeklyProgress {
  const { start, end, weekLabel } = getCardioWeekBoundaries(referenceDate);
  const startTime = start.getTime();
  const endTime = end.getTime();

  // Deduplicate and filter sessions strictly within the calendar week
  const sessionMap = new Map<string, CardioSession>();
  for (const s of sessions) {
    if (!s || !s.date) continue;
    const sDate = new Date(s.date).getTime();
    if (isNaN(sDate) || sDate < startTime || sDate > endTime) continue;
    const key = s.id || s._id || s.clientSessionId || `${s.date}-${s.activityType}`;
    sessionMap.set(key, s);
  }

  const weekSessions = Array.from(sessionMap.values());

  // Aggregate week metrics
  let totalDurationMinutes = 0;
  let totalDistanceInGoalUnit = 0;
  let totalDistanceKm = 0;

  const targetDistanceUnit = settings.distance?.unit || 'km';

  for (const s of weekSessions) {
    const dur = Number(s.durationMinutes);
    if (Number.isFinite(dur) && dur > 0) {
      totalDurationMinutes += dur;
    }

    const dist = Number(s.distance);
    if (Number.isFinite(dist) && dist > 0) {
      const distUnit = s.distanceUnit || 'km';
      const inGoalUnit = normalizeDistance(dist, distUnit, targetDistanceUnit);
      totalDistanceInGoalUnit += inGoalUnit;

      const inKm = normalizeDistance(dist, distUnit, 'km');
      totalDistanceKm += inKm;
    }
  }

  const totalSessionsCount = weekSessions.length;

  // Build Item 1: Duration
  const durTarget = Math.max(0, Number(settings.durationMinutes?.target) || 0);
  const durEnabled = Boolean(settings.durationMinutes?.enabled);
  const durCurrent = totalDurationMinutes;
  const durPercent =
    durTarget > 0 ? Math.min(100, Math.round((durCurrent / durTarget) * 100)) : 0;
  const durRemaining = Math.max(0, durTarget - durCurrent);
  const durCompleted = durEnabled && durTarget > 0 && durCurrent >= durTarget;

  const durationItem: CardioGoalItemProgress = {
    type: 'duration',
    label: 'Weekly Duration',
    enabled: durEnabled,
    target: durTarget,
    current: durCurrent,
    unit: 'mins',
    percentage: durPercent,
    remaining: durRemaining,
    isCompleted: durCompleted,
    formattedCurrent: formatDuration(durCurrent),
    formattedTarget: formatDuration(durTarget),
    formattedRemaining: durCompleted
      ? 'Target achieved!'
      : `${formatDuration(durRemaining)} remaining`,
  };

  // Build Item 2: Distance
  const distTarget = Math.max(0, Number(settings.distance?.target) || 0);
  const distEnabled = Boolean(settings.distance?.enabled);
  const roundedDistCurrent = Math.round(totalDistanceInGoalUnit * 10) / 10;
  const distPercent =
    distTarget > 0 ? Math.min(100, Math.round((roundedDistCurrent / distTarget) * 100)) : 0;
  const distRemaining = Math.max(0, Math.round((distTarget - roundedDistCurrent) * 10) / 10);
  const distCompleted = distEnabled && distTarget > 0 && roundedDistCurrent >= distTarget;

  const distanceItem: CardioGoalItemProgress = {
    type: 'distance',
    label: 'Weekly Distance',
    enabled: distEnabled,
    target: distTarget,
    current: roundedDistCurrent,
    unit: targetDistanceUnit,
    percentage: distPercent,
    remaining: distRemaining,
    isCompleted: distCompleted,
    formattedCurrent: `${roundedDistCurrent} ${targetDistanceUnit}`,
    formattedTarget: `${distTarget} ${targetDistanceUnit}`,
    formattedRemaining: distCompleted
      ? 'Target achieved!'
      : `${distRemaining} ${targetDistanceUnit} remaining`,
  };

  // Build Item 3: Sessions
  const sessTarget = Math.max(0, Math.round(Number(settings.sessions?.target) || 0));
  const sessEnabled = Boolean(settings.sessions?.enabled);
  const sessCurrent = totalSessionsCount;
  const sessPercent =
    sessTarget > 0 ? Math.min(100, Math.round((sessCurrent / sessTarget) * 100)) : 0;
  const sessRemaining = Math.max(0, sessTarget - sessCurrent);
  const sessCompleted = sessEnabled && sessTarget > 0 && sessCurrent >= sessTarget;

  const sessionsItem: CardioGoalItemProgress = {
    type: 'sessions',
    label: 'Weekly Sessions',
    enabled: sessEnabled,
    target: sessTarget,
    current: sessCurrent,
    unit: 'sessions',
    percentage: sessPercent,
    remaining: sessRemaining,
    isCompleted: sessCompleted,
    formattedCurrent: `${sessCurrent} ${sessCurrent === 1 ? 'session' : 'sessions'}`,
    formattedTarget: `${sessTarget} ${sessTarget === 1 ? 'session' : 'sessions'}`,
    formattedRemaining: sessCompleted
      ? 'Target achieved!'
      : `${sessRemaining} ${sessRemaining === 1 ? 'session' : 'sessions'} remaining`,
  };

  const items: CardioGoalItemProgress[] = [durationItem, distanceItem, sessionsItem];
  const activeItems = items.filter((i) => i.enabled);
  const activeCount = activeItems.length;
  const completedCount = activeItems.filter((i) => i.isCompleted).length;
  const allCompleted = activeCount > 0 && completedCount === activeCount;

  return {
    weekStart: start,
    weekEnd: end,
    weekLabel,
    items,
    activeCount,
    completedCount,
    allCompleted,
    totalWeeklyDurationMinutes: totalDurationMinutes,
    totalWeeklySessions: totalSessionsCount,
    totalWeeklyDistanceKm: Math.round(totalDistanceKm * 10) / 10,
  };
}
