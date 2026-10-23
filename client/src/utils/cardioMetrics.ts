import { CardioActivityType, DistanceUnit } from '../types';

export interface ActivityMetadata {
  type: CardioActivityType;
  label: string;
  defaultUnit: DistanceUnit;
  hasDistance: boolean;
}

export const CARDIO_ACTIVITIES: ActivityMetadata[] = [
  { type: 'running', label: 'Running', defaultUnit: 'km', hasDistance: true },
  { type: 'walking', label: 'Walking', defaultUnit: 'km', hasDistance: true },
  { type: 'cycling', label: 'Cycling', defaultUnit: 'km', hasDistance: true },
  { type: 'treadmill', label: 'Treadmill', defaultUnit: 'km', hasDistance: true },
  { type: 'elliptical', label: 'Elliptical', defaultUnit: 'km', hasDistance: true },
  { type: 'rowing', label: 'Rowing', defaultUnit: 'm', hasDistance: true },
  { type: 'stair_climber', label: 'Stair Climber', defaultUnit: 'km', hasDistance: false },
  { type: 'other', label: 'Other Activity', defaultUnit: 'km', hasDistance: true },
];

export const getActivityLabel = (type: CardioActivityType, customName?: string): string => {
  if (type === 'other' && customName && customName.trim()) {
    return customName.trim();
  }
  const found = CARDIO_ACTIVITIES.find((a) => a.type === type);
  return found ? found.label : type;
};

/**
 * Calculates average pace (minutes per unit).
 * When unit is meters ('m'), converts to km so pace is minutes per km.
 */
export const calculatePace = (
  durationMinutes: number,
  distance: number,
  unit: DistanceUnit = 'km'
): number | null => {
  if (!Number.isFinite(durationMinutes) || !Number.isFinite(distance)) return null;
  if (durationMinutes <= 0 || distance <= 0) return null;

  const effectiveDistance = unit === 'm' ? distance / 1000 : distance;
  if (effectiveDistance <= 0) return null;

  const pace = durationMinutes / effectiveDistance;
  return Number.isFinite(pace) ? Math.round(pace * 100) / 100 : null;
};

/**
 * Calculates average speed (units per hour).
 * When unit is meters ('m'), converts to km/h.
 */
export const calculateSpeed = (
  durationMinutes: number,
  distance: number,
  unit: DistanceUnit = 'km'
): number | null => {
  if (!Number.isFinite(durationMinutes) || !Number.isFinite(distance)) return null;
  if (durationMinutes <= 0 || distance <= 0) return null;

  const effectiveDistance = unit === 'm' ? distance / 1000 : distance;
  if (effectiveDistance <= 0) return null;

  const speed = (effectiveDistance / durationMinutes) * 60;
  return Number.isFinite(speed) ? Math.round(speed * 10) / 10 : null;
};

/**
 * Formats pace into "M:SS /unit" (e.g. 5.5 -> "5:30 /km").
 */
export const formatPace = (
  paceMinutes: number | null | undefined,
  unit: DistanceUnit = 'km'
): string => {
  if (paceMinutes === null || paceMinutes === undefined || !Number.isFinite(paceMinutes) || paceMinutes <= 0) {
    return '—';
  }

  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);

  // Handle rounding roll-over (e.g. 59.8 secs -> 60 secs)
  const adjustedMins = secs === 60 ? mins + 1 : mins;
  const adjustedSecs = secs === 60 ? 0 : secs;

  const paddedSecs = adjustedSecs < 10 ? `0${adjustedSecs}` : `${adjustedSecs}`;
  const unitLabel = unit === 'mi' ? '/mi' : '/km';

  return `${adjustedMins}:${paddedSecs} ${unitLabel}`;
};

/**
 * Formats speed into "X.X km/h" or "X.X mph".
 */
export const formatSpeed = (
  speed: number | null | undefined,
  unit: DistanceUnit = 'km'
): string => {
  if (speed === null || speed === undefined || !Number.isFinite(speed) || speed <= 0) {
    return '—';
  }

  const unitLabel = unit === 'mi' ? 'mph' : 'km/h';
  return `${speed.toFixed(1)} ${unitLabel}`;
};

/**
 * Formats duration cleanly (e.g. 45 -> "45m", 75 -> "1h 15m")
 */
export const formatDuration = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
  const totalMins = Math.round(minutes);
  const hrs = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;

  if (hrs === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hrs}h`;
  return `${hrs}h ${remainingMins}m`;
};
