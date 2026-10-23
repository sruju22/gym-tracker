import { CardioSession, CardioPersonalRecord, CardioRecordType, DistanceUnit } from '../types';
import { normalizeDistance } from './cardioGoals';
import { formatDuration, formatPace, getActivityLabel } from './cardioMetrics';

const DISTANCE_BASED_ACTIVITIES = new Set([
  'running',
  'walking',
  'cycling',
  'treadmill',
  'elliptical',
  'rowing',
]);

/**
 * Derives the user's Cardio Personal Records strictly from valid recorded sessions.
 * Returns only records backed by actual historical data, recalculates dynamically,
 * and eliminates duplicates.
 */
export function deriveCardioPersonalRecords(
  sessions: CardioSession[]
): CardioPersonalRecord[] {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return [];
  }

  // Deduplicate sessions by ID or clientSessionId
  const sessionMap = new Map<string, CardioSession>();
  for (const s of sessions) {
    if (!s || !s.date) continue;
    const key = s.id || s._id || s.clientSessionId || `${s.date}-${s.activityType}`;
    sessionMap.set(key, s);
  }
  const validSessions = Array.from(sessionMap.values());

  const records: CardioPersonalRecord[] = [];

  // ==========================================
  // Record 1: Longest Duration
  // ==========================================
  let longestDurationSession: CardioSession | null = null;
  let maxDuration = 0;

  for (const s of validSessions) {
    const dur = Number(s.durationMinutes);
    if (Number.isFinite(dur) && dur > maxDuration) {
      maxDuration = dur;
      longestDurationSession = s;
    }
  }

  if (longestDurationSession && maxDuration > 0) {
    const actLabel = getActivityLabel(
      longestDurationSession.activityType,
      longestDurationSession.customActivityName
    );
    const dist = Number(longestDurationSession.distance);
    const hasDist = Number.isFinite(dist) && dist > 0;
    const distStr = hasDist
      ? ` • ${dist} ${longestDurationSession.distanceUnit || 'km'}`
      : '';

    records.push({
      id: `cardio-pr-duration-${longestDurationSession.id || longestDurationSession.date}`,
      type: 'longest_duration',
      title: 'Longest Cardio Duration',
      metricValue: formatDuration(maxDuration),
      rawValue: maxDuration,
      unit: 'minutes',
      activityType: longestDurationSession.activityType,
      customActivityName: longestDurationSession.customActivityName,
      date: longestDurationSession.date,
      details: `${actLabel}${distStr}`,
      sessionId: longestDurationSession.id || longestDurationSession.clientSessionId || '',
    });
  }

  // ==========================================
  // Record 2: Longest Distance
  // ==========================================
  let longestDistanceSession: CardioSession | null = null;
  let maxDistanceNormalizedKm = 0;

  for (const s of validSessions) {
    const dist = Number(s.distance);
    if (Number.isFinite(dist) && dist > 0) {
      const normKm = normalizeDistance(dist, s.distanceUnit || 'km', 'km');
      if (normKm > maxDistanceNormalizedKm) {
        maxDistanceNormalizedKm = normKm;
        longestDistanceSession = s;
      }
    }
  }

  if (longestDistanceSession && maxDistanceNormalizedKm > 0) {
    const actLabel = getActivityLabel(
      longestDistanceSession.activityType,
      longestDistanceSession.customActivityName
    );
    const originalDist = longestDistanceSession.distance!;
    const originalUnit = longestDistanceSession.distanceUnit || 'km';
    const durStr =
      longestDistanceSession.durationMinutes > 0
        ? ` in ${formatDuration(longestDistanceSession.durationMinutes)}`
        : '';

    records.push({
      id: `cardio-pr-distance-${longestDistanceSession.id || longestDistanceSession.date}`,
      type: 'longest_distance',
      title: 'Longest Recorded Distance',
      metricValue: `${originalDist} ${originalUnit}`,
      rawValue: maxDistanceNormalizedKm,
      unit: originalUnit,
      activityType: longestDistanceSession.activityType,
      customActivityName: longestDistanceSession.customActivityName,
      date: longestDistanceSession.date,
      details: `${actLabel}${durStr}`,
      sessionId: longestDistanceSession.id || longestDistanceSession.clientSessionId || '',
    });
  }

  // ==========================================
  // Record 3: Fastest Pace (Comparable Sessions)
  // ==========================================
  // Filter for distance-based activities with valid duration and distance
  const paceEligible = validSessions.filter((s) => {
    if (!DISTANCE_BASED_ACTIVITIES.has(s.activityType)) return false;
    const dur = Number(s.durationMinutes);
    const dist = Number(s.distance);
    return Number.isFinite(dur) && dur > 0 && Number.isFinite(dist) && dist > 0;
  });

  if (paceEligible.length > 0) {
    // Check if there are sessions with at least 1.0 km (comparable standard threshold)
    const comparableSessions = paceEligible.filter((s) => {
      const normKm = normalizeDistance(s.distance!, s.distanceUnit || 'km', 'km');
      return normKm >= 1.0;
    });

    const candidates = comparableSessions.length > 0 ? comparableSessions : paceEligible;

    let bestPaceSession: CardioSession | null = null;
    let minPacePerKm = Infinity;

    for (const s of candidates) {
      const normKm = normalizeDistance(s.distance!, s.distanceUnit || 'km', 'km');
      if (normKm > 0) {
        const pacePerKm = s.durationMinutes / normKm;
        if (pacePerKm < minPacePerKm && pacePerKm > 0.5) {
          // Guard against unrealistic human pace (< 30s/km)
          minPacePerKm = pacePerKm;
          bestPaceSession = s;
        }
      }
    }

    if (bestPaceSession && Number.isFinite(minPacePerKm) && minPacePerKm < Infinity) {
      const actLabel = getActivityLabel(
        bestPaceSession.activityType,
        bestPaceSession.customActivityName
      );
      const originalUnit: DistanceUnit = bestPaceSession.distanceUnit || 'km';

      // If user logged in miles, display pace in /mi for consistency with their input unit
      let displayPace = minPacePerKm;
      if (originalUnit === 'mi') {
        displayPace = minPacePerKm * 1.60934;
      }

      const formattedPaceStr = formatPace(displayPace, originalUnit);
      const distInfo = `${bestPaceSession.distance} ${originalUnit} in ${formatDuration(bestPaceSession.durationMinutes)}`;

      records.push({
        id: `cardio-pr-pace-${bestPaceSession.id || bestPaceSession.date}`,
        type: 'fastest_pace',
        title: 'Fastest Cardio Pace',
        metricValue: formattedPaceStr,
        rawValue: minPacePerKm,
        unit: `/${originalUnit}`,
        activityType: bestPaceSession.activityType,
        customActivityName: bestPaceSession.customActivityName,
        date: bestPaceSession.date,
        details: `${actLabel} • ${distInfo}`,
        sessionId: bestPaceSession.id || bestPaceSession.clientSessionId || '',
      });
    }
  }

  // ==========================================
  // Record 4: Highest Average Heart Rate
  // ==========================================
  let highestHrSession: CardioSession | null = null;
  let maxAvgHr = 0;

  for (const s of validSessions) {
    const hr = Number(s.averageHeartRate);
    if (Number.isFinite(hr) && hr > maxAvgHr && hr >= 40 && hr <= 240) {
      maxAvgHr = hr;
      highestHrSession = s;
    }
  }

  if (highestHrSession && maxAvgHr > 0) {
    const actLabel = getActivityLabel(
      highestHrSession.activityType,
      highestHrSession.customActivityName
    );

    records.push({
      id: `cardio-pr-hr-${highestHrSession.id || highestHrSession.date}`,
      type: 'highest_heart_rate',
      title: 'Peak Average Heart Rate',
      metricValue: `${maxAvgHr} bpm`,
      rawValue: maxAvgHr,
      unit: 'bpm',
      activityType: highestHrSession.activityType,
      customActivityName: highestHrSession.customActivityName,
      date: highestHrSession.date,
      details: `${actLabel} • ${formatDuration(highestHrSession.durationMinutes)}`,
      sessionId: highestHrSession.id || highestHrSession.clientSessionId || '',
    });
  }

  return records;
}
