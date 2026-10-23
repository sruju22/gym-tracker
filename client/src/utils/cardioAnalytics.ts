import { CardioSession, CardioActivityType } from '../types';
import { formatDuration, getActivityLabel } from './cardioMetrics';
import { getMondayOfWeek, getSundayOfWeek } from './analyticsEngine';

export type CardioAnalyticsTimeRange = '7d' | '30d' | '12w';

export interface ActivityBreakdownItem {
  activityType: CardioActivityType;
  label: string;
  sessionCount: number;
  totalDurationMinutes: number;
  totalDurationFormatted: string;
  totalDistanceKm: number;
  totalDistanceFormatted: string;
  percentageOfDuration: number;
  percentageOfSessions: number;
}

export interface CardioWeeklyTrendPoint {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  durationMinutes: number;
  durationFormatted: string;
  sessionCount: number;
  distanceKm: number;
  activeDays: number;
}

export interface CardioDailyTrendPoint {
  date: string;
  dayLabel: string;
  durationMinutes: number;
  sessionCount: number;
  distanceKm: number;
}

export interface CardioPeriodSummary {
  totalSessions: number;
  totalDurationMinutes: number;
  totalDurationFormatted: string;
  averageDurationMinutes: number;
  averageDurationFormatted: string;
  totalDistanceKm: number;
  totalDistanceFormatted: string;
  distanceSessionCount: number;
  hasDistanceData: boolean;
  activeDaysCount: number;
  totalManualCalories: number;
  caloriesSessionCount: number;
}

export interface CardioComparison {
  hasComparisonData: boolean;
  sessionsDelta: number;
  sessionsDeltaPercent: number | null;
  durationDeltaMinutes: number;
  durationDeltaPercent: number | null;
  distanceDeltaKm: number;
  distanceDeltaPercent: number | null;
  activeDaysDelta: number;
}

export interface CardioConsistencyInsight {
  id: string;
  type: 'frequency' | 'activity' | 'trend' | 'streak';
  title: string;
  description: string;
  highlight?: string;
}

export interface ComprehensiveCardioAnalytics {
  timeRange: CardioAnalyticsTimeRange;
  currentPeriod: CardioPeriodSummary;
  previousPeriod: CardioPeriodSummary;
  comparison: CardioComparison;
  activityBreakdown: ActivityBreakdownItem[];
  topActivity: ActivityBreakdownItem | null;
  weeklyTrends: CardioWeeklyTrendPoint[];
  dailyTrends: CardioDailyTrendPoint[];
  insights: CardioConsistencyInsight[];
  totalLifetimeSessions: number;
}

/**
 * Deduplicates sessions by canonical id or clientSessionId
 */
export function deduplicateCardioSessions(sessions: CardioSession[]): CardioSession[] {
  if (!Array.isArray(sessions)) return [];
  const seenIds = new Set<string>();
  const seenClientSessionIds = new Set<string>();
  const result: CardioSession[] = [];

  for (const s of sessions) {
    const canonicalId = s.id || (s as any)._id;
    const csId = s.clientSessionId;

    const isDuplicate =
      (Boolean(canonicalId) && seenIds.has(canonicalId!)) ||
      (Boolean(csId) && seenClientSessionIds.has(csId!));

    if (isDuplicate) continue;

    if (canonicalId) seenIds.add(canonicalId);
    if (csId) seenClientSessionIds.add(csId);

    result.push(s);
  }

  return result;
}

/**
 * Calculates current and previous period date boundaries.
 * All ranges guarantee mutual exclusivity: no session is counted in both periods.
 */
export function getCardioPeriodBoundaries(
  timeRange: CardioAnalyticsTimeRange,
  now: Date = new Date()
): {
  currentStart: Date;
  currentEnd: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const currentEnd = new Date(now);
  currentEnd.setHours(23, 59, 59, 999);

  if (timeRange === '7d') {
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 6); // 7 calendar days including today
    currentStart.setHours(0, 0, 0, 0);

    const prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

    const prevStart = new Date(currentStart);
    prevStart.setDate(currentStart.getDate() - 7);
    prevStart.setHours(0, 0, 0, 0);

    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  if (timeRange === '30d') {
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 29); // 30 calendar days including today
    currentStart.setHours(0, 0, 0, 0);

    const prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

    const prevStart = new Date(currentStart);
    prevStart.setDate(currentStart.getDate() - 30);
    prevStart.setHours(0, 0, 0, 0);

    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  // '12w' - Grouped by 12 calendar weeks (Monday to Sunday)
  const thisMonday = getMondayOfWeek(now);
  const week12End = getSundayOfWeek(thisMonday);

  const startMonday = new Date(thisMonday);
  startMonday.setDate(startMonday.getDate() - 11 * 7); // 12 calendar weeks
  startMonday.setHours(0, 0, 0, 0);

  const prevEnd = new Date(startMonday);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

  const prevStart = new Date(startMonday);
  prevStart.setDate(startMonday.getDate() - 12 * 7);
  prevStart.setHours(0, 0, 0, 0);

  return {
    currentStart: startMonday,
    currentEnd: week12End,
    prevStart,
    prevEnd,
  };
}

/**
 * Summarizes volume, duration, distance, and active days for an arbitrary list of cardio sessions.
 */
export function summarizeCardioPeriod(sessions: CardioSession[]): CardioPeriodSummary {
  let totalDurationMinutes = 0;
  let totalDistanceKm = 0;
  let distanceSessionCount = 0;
  let totalManualCalories = 0;
  let caloriesSessionCount = 0;
  const activeDates = new Set<string>();

  for (const s of sessions) {
    const dur = Number(s.durationMinutes);
    if (Number.isFinite(dur) && dur > 0) {
      totalDurationMinutes += dur;
    }

    if (
      s.distance !== null &&
      s.distance !== undefined &&
      (s.distance as any) !== ''
    ) {
      const dist = Number(s.distance);
      if (Number.isFinite(dist) && dist >= 0) {
        let distKm = dist;
        if (s.distanceUnit === 'm') {
          distKm = dist / 1000;
        } else if (s.distanceUnit === 'mi') {
          distKm = dist * 1.60934;
        }
        totalDistanceKm += distKm;
        distanceSessionCount++;
      }
    }

    if (
      s.caloriesBurned !== null &&
      s.caloriesBurned !== undefined &&
      (s.caloriesBurned as any) !== ''
    ) {
      const cal = Number(s.caloriesBurned);
      if (Number.isFinite(cal) && cal > 0) {
        totalManualCalories += cal;
        caloriesSessionCount++;
      }
    }

    const d = new Date(s.date);
    if (!isNaN(d.getTime())) {
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      activeDates.add(dateKey);
    }
  }

  const totalSessions = sessions.length;
  const averageDurationMinutes =
    totalSessions > 0 ? Math.round(totalDurationMinutes / totalSessions) : 0;
  const roundedDistance = Math.round(totalDistanceKm * 10) / 10;

  return {
    totalSessions,
    totalDurationMinutes,
    totalDurationFormatted: formatDuration(totalDurationMinutes),
    averageDurationMinutes,
    averageDurationFormatted: formatDuration(averageDurationMinutes),
    totalDistanceKm: roundedDistance,
    totalDistanceFormatted: distanceSessionCount > 0 ? `${roundedDistance} km` : '—',
    distanceSessionCount,
    hasDistanceData: distanceSessionCount > 0,
    activeDaysCount: activeDates.size,
    totalManualCalories,
    caloriesSessionCount,
  };
}

/**
 * Calculates comparison deltas between current and previous period.
 */
export function computeCardioComparison(
  current: CardioPeriodSummary,
  prev: CardioPeriodSummary
): CardioComparison {
  const hasComparisonData = prev.totalSessions > 0;
  const sessionsDelta = current.totalSessions - prev.totalSessions;
  const sessionsDeltaPercent =
    prev.totalSessions > 0
      ? Math.round(((current.totalSessions - prev.totalSessions) / prev.totalSessions) * 100)
      : null;

  const durationDeltaMinutes = current.totalDurationMinutes - prev.totalDurationMinutes;
  const durationDeltaPercent =
    prev.totalDurationMinutes > 0
      ? Math.round(
          ((current.totalDurationMinutes - prev.totalDurationMinutes) / prev.totalDurationMinutes) *
            100
        )
      : null;

  const distanceDeltaKm = Math.round((current.totalDistanceKm - prev.totalDistanceKm) * 10) / 10;
  const distanceDeltaPercent =
    prev.totalDistanceKm > 0
      ? Math.round(((current.totalDistanceKm - prev.totalDistanceKm) / prev.totalDistanceKm) * 100)
      : null;

  const activeDaysDelta = current.activeDaysCount - prev.activeDaysCount;

  return {
    hasComparisonData,
    sessionsDelta,
    sessionsDeltaPercent,
    durationDeltaMinutes,
    durationDeltaPercent,
    distanceDeltaKm,
    distanceDeltaPercent,
    activeDaysDelta,
  };
}

/**
 * Computes activity-type breakdown for sessions in the current period.
 */
export function computeActivityBreakdown(
  sessions: CardioSession[],
  totalDurationMinutes: number
): ActivityBreakdownItem[] {
  const map = new Map<
    CardioActivityType,
    { sessionCount: number; duration: number; distanceKm: number }
  >();

  for (const s of sessions) {
    const type = s.activityType || 'other';
    const entry = map.get(type) || { sessionCount: 0, duration: 0, distanceKm: 0 };
    entry.sessionCount++;
    const dur = Number(s.durationMinutes) || 0;
    entry.duration += dur;

    if (
      s.distance !== null &&
      s.distance !== undefined &&
      (s.distance as any) !== ''
    ) {
      const dist = Number(s.distance);
      if (Number.isFinite(dist) && dist >= 0) {
        let distKm = dist;
        if (s.distanceUnit === 'm') distKm = dist / 1000;
        else if (s.distanceUnit === 'mi') distKm = dist * 1.60934;
        entry.distanceKm += distKm;
      }
    }
    map.set(type, entry);
  }

  const items: ActivityBreakdownItem[] = [];
  const totalSessions = sessions.length;

  for (const [type, data] of map.entries()) {
    const distRounded = Math.round(data.distanceKm * 10) / 10;
    items.push({
      activityType: type,
      label: getActivityLabel(type),
      sessionCount: data.sessionCount,
      totalDurationMinutes: data.duration,
      totalDurationFormatted: formatDuration(data.duration),
      totalDistanceKm: distRounded,
      totalDistanceFormatted: distRounded > 0 ? `${distRounded} km` : '—',
      percentageOfDuration:
        totalDurationMinutes > 0
          ? Math.round((data.duration / totalDurationMinutes) * 1000) / 10
          : 0,
      percentageOfSessions:
        totalSessions > 0
          ? Math.round((data.sessionCount / totalSessions) * 1000) / 10
          : 0,
    });
  }

  return items.sort((a, b) => b.totalDurationMinutes - a.totalDurationMinutes);
}

/**
 * Computes weekly trend data points for the given period.
 */
export function computeWeeklyTrends(
  sessions: CardioSession[],
  timeRange: CardioAnalyticsTimeRange,
  boundaries: { currentStart: Date; currentEnd: Date }
): CardioWeeklyTrendPoint[] {
  const points: CardioWeeklyTrendPoint[] = [];

  if (timeRange === '12w') {
    const startMonday = getMondayOfWeek(boundaries.currentStart);
    for (let i = 0; i < 12; i++) {
      const wMonday = new Date(startMonday);
      wMonday.setDate(startMonday.getDate() + i * 7);
      const wSunday = getSundayOfWeek(wMonday);
      const wStart = wMonday.getTime();
      const wEnd = wSunday.getTime();

      const weekSessions = sessions.filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= wStart && t <= wEnd;
      });

      const summary = summarizeCardioPeriod(weekSessions);
      const mMonth = wMonday.toLocaleDateString('en-US', { month: 'short' });
      const mDay = wMonday.getDate();

      points.push({
        weekStart: wMonday.toISOString(),
        weekEnd: wSunday.toISOString(),
        weekLabel: `W${i + 1} (${mMonth} ${mDay})`,
        durationMinutes: summary.totalDurationMinutes,
        durationFormatted: summary.totalDurationFormatted,
        sessionCount: summary.totalSessions,
        distanceKm: summary.totalDistanceKm,
        activeDays: summary.activeDaysCount,
      });
    }
  } else if (timeRange === '30d') {
    // 5 weekly buckets covering the 30-day window
    const firstMonday = getMondayOfWeek(boundaries.currentStart);
    for (let i = 0; i < 5; i++) {
      const wMonday = new Date(firstMonday);
      wMonday.setDate(firstMonday.getDate() + i * 7);
      const wSunday = getSundayOfWeek(wMonday);
      const wStart = wMonday.getTime();
      const wEnd = wSunday.getTime();

      const weekSessions = sessions.filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= wStart && t <= wEnd;
      });

      const summary = summarizeCardioPeriod(weekSessions);
      const mMonth = wMonday.toLocaleDateString('en-US', { month: 'short' });
      const mDay = wMonday.getDate();

      points.push({
        weekStart: wMonday.toISOString(),
        weekEnd: wSunday.toISOString(),
        weekLabel: `W${i + 1} (${mMonth} ${mDay})`,
        durationMinutes: summary.totalDurationMinutes,
        durationFormatted: summary.totalDurationFormatted,
        sessionCount: summary.totalSessions,
        distanceKm: summary.totalDistanceKm,
        activeDays: summary.activeDaysCount,
      });
    }
  } else {
    // 7d: Single week container or 2 partial weeks
    const firstMonday = getMondayOfWeek(boundaries.currentStart);
    const lastMonday = getMondayOfWeek(boundaries.currentEnd);
    const numWeeks = firstMonday.getTime() === lastMonday.getTime() ? 1 : 2;

    for (let i = 0; i < numWeeks; i++) {
      const wMonday = new Date(firstMonday);
      wMonday.setDate(firstMonday.getDate() + i * 7);
      const wSunday = getSundayOfWeek(wMonday);
      const wStart = Math.max(wMonday.getTime(), boundaries.currentStart.getTime());
      const wEnd = Math.min(wSunday.getTime(), boundaries.currentEnd.getTime());

      const weekSessions = sessions.filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= wStart && t <= wEnd;
      });

      const summary = summarizeCardioPeriod(weekSessions);
      const mMonth = wMonday.toLocaleDateString('en-US', { month: 'short' });
      const mDay = wMonday.getDate();

      points.push({
        weekStart: wMonday.toISOString(),
        weekEnd: wSunday.toISOString(),
        weekLabel: numWeeks === 1 ? 'Last 7 Days' : `Week ${i + 1} (${mMonth} ${mDay})`,
        durationMinutes: summary.totalDurationMinutes,
        durationFormatted: summary.totalDurationFormatted,
        sessionCount: summary.totalSessions,
        distanceKm: summary.totalDistanceKm,
        activeDays: summary.activeDaysCount,
      });
    }
  }

  return points;
}

/**
 * Computes daily trend data points for the 7d view.
 */
export function computeDailyTrends(
  sessions: CardioSession[],
  currentStart: Date,
  _currentEnd?: Date
): CardioDailyTrendPoint[] {
  const points: CardioDailyTrendPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(currentStart);
    d.setDate(currentStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);

    const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayLabel = `${dayName} ${d.getDate()}`;

    const daySessions = sessions.filter((s) => {
      const sDate = new Date(s.date);
      if (isNaN(sDate.getTime())) return false;
      const sKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;
      return sKey === dKey;
    });

    const summary = summarizeCardioPeriod(daySessions);

    points.push({
      date: d.toISOString(),
      dayLabel,
      durationMinutes: summary.totalDurationMinutes,
      sessionCount: summary.totalSessions,
      distanceKm: summary.totalDistanceKm,
    });
  }

  return points;
}

/**
 * Derives factual, grounded consistency insights from recorded cardio sessions.
 */
export function deriveCardioConsistencyInsights(
  current: CardioPeriodSummary,
  comparison: CardioComparison,
  topActivity: ActivityBreakdownItem | null,
  timeRange: CardioAnalyticsTimeRange,
  weeklyTrends: CardioWeeklyTrendPoint[]
): CardioConsistencyInsight[] {
  const insights: CardioConsistencyInsight[] = [];

  if (current.totalSessions === 0) {
    return insights;
  }

  // 1. Frequency Insight
  if (timeRange === '7d') {
    insights.push({
      id: 'insight_freq',
      type: 'frequency',
      title: 'Training Frequency',
      description: `You logged cardio on ${current.activeDaysCount} of the last 7 days.`,
      highlight: `${current.activeDaysCount} / 7 days`,
    });
  } else if (timeRange === '30d') {
    const avgPerWeek = Math.round((current.activeDaysCount / 4.3) * 10) / 10;
    insights.push({
      id: 'insight_freq',
      type: 'frequency',
      title: 'Weekly Frequency',
      description: `Averaged ${avgPerWeek} cardio active days per week over the last 30 days.`,
      highlight: `${avgPerWeek} days/wk`,
    });
  } else {
    const avgPerWeek = Math.round((current.activeDaysCount / 12) * 10) / 10;
    insights.push({
      id: 'insight_freq',
      type: 'frequency',
      title: '12-Week Consistency',
      description: `Averaged ${avgPerWeek} cardio active days per week across 12 training weeks.`,
      highlight: `${avgPerWeek} days/wk`,
    });
  }

  // 2. Top Activity Preference
  if (topActivity) {
    insights.push({
      id: 'insight_activity',
      type: 'activity',
      title: 'Primary Activity',
      description: `${topActivity.label} was your top activity, accounting for ${topActivity.percentageOfDuration}% of your cardio duration across ${topActivity.sessionCount} sessions.`,
      highlight: `${topActivity.label} (${topActivity.percentageOfDuration}%)`,
    });
  }

  // 3. Period Comparison Trend
  if (comparison.hasComparisonData && comparison.durationDeltaPercent !== null) {
    if (comparison.durationDeltaPercent > 5) {
      insights.push({
        id: 'insight_trend',
        type: 'trend',
        title: 'Volume Progression',
        description: `Cardio duration increased by +${comparison.durationDeltaPercent}% compared to the prior equivalent period (${current.totalDurationFormatted} vs ${formatDuration(current.totalDurationMinutes - comparison.durationDeltaMinutes)}).`,
        highlight: `+${comparison.durationDeltaPercent}% duration`,
      });
    } else if (comparison.durationDeltaPercent < -5) {
      insights.push({
        id: 'insight_trend',
        type: 'trend',
        title: 'Volume Adjustment',
        description: `Cardio duration adjusted by ${comparison.durationDeltaPercent}% compared to the prior period (${current.totalDurationFormatted} vs ${formatDuration(current.totalDurationMinutes - comparison.durationDeltaMinutes)}).`,
        highlight: `${comparison.durationDeltaPercent}% duration`,
      });
    } else {
      insights.push({
        id: 'insight_trend',
        type: 'trend',
        title: 'Steady Volume',
        description: `Cardio volume remained steady within ±5% compared to the prior period.`,
        highlight: 'Steady volume',
      });
    }
  } else if (!comparison.hasComparisonData) {
    insights.push({
      id: 'insight_trend',
      type: 'trend',
      title: 'Baseline Established',
      description: `First active training period established with ${current.totalDurationFormatted} of cardio across ${current.totalSessions} sessions.`,
      highlight: `${current.totalDurationFormatted} total`,
    });
  }

  // 4. Streak & Active Weeks
  if (timeRange === '12w') {
    const activeWeeks = weeklyTrends.filter((w) => w.sessionCount > 0).length;
    insights.push({
      id: 'insight_streak',
      type: 'streak',
      title: 'Active Weeks',
      description: `Completed cardio sessions in ${activeWeeks} of the last 12 training weeks.`,
      highlight: `${activeWeeks} / 12 weeks`,
    });
  }

  return insights;
}

/**
 * Main analytics pipeline: computes comprehensive cardio analytics for a given time range.
 */
export function getComprehensiveCardioAnalytics(
  rawSessions: CardioSession[],
  timeRange: CardioAnalyticsTimeRange = '30d',
  now: Date = new Date()
): ComprehensiveCardioAnalytics {
  const allSessions = deduplicateCardioSessions(rawSessions);
  const boundaries = getCardioPeriodBoundaries(timeRange, now);

  const currentSessions = allSessions.filter((s) => {
    const t = new Date(s.date).getTime();
    if (isNaN(t)) return false;
    return t >= boundaries.currentStart.getTime() && t <= boundaries.currentEnd.getTime();
  });

  const previousSessions = allSessions.filter((s) => {
    const t = new Date(s.date).getTime();
    if (isNaN(t)) return false;
    return t >= boundaries.prevStart.getTime() && t <= boundaries.prevEnd.getTime();
  });

  const currentPeriod = summarizeCardioPeriod(currentSessions);
  const previousPeriod = summarizeCardioPeriod(previousSessions);
  const comparison = computeCardioComparison(currentPeriod, previousPeriod);

  const activityBreakdown = computeActivityBreakdown(
    currentSessions,
    currentPeriod.totalDurationMinutes
  );
  const topActivity = activityBreakdown.length > 0 ? activityBreakdown[0] : null;

  const weeklyTrends = computeWeeklyTrends(currentSessions, timeRange, boundaries);
  const dailyTrends =
    timeRange === '7d'
      ? computeDailyTrends(currentSessions, boundaries.currentStart, boundaries.currentEnd)
      : [];

  const insights = deriveCardioConsistencyInsights(
    currentPeriod,
    comparison,
    topActivity,
    timeRange,
    weeklyTrends
  );

  return {
    timeRange,
    currentPeriod,
    previousPeriod,
    comparison,
    activityBreakdown,
    topActivity,
    weeklyTrends,
    dailyTrends,
    insights,
    totalLifetimeSessions: allSessions.length,
  };
}
