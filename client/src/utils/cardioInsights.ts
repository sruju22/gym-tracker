import {
  CardioSession,
  CardioActivityType,
  CardioWeeklyGoalSettings,
} from '../types';
import {
  CardioAnalyticsTimeRange,
  getCardioPeriodBoundaries,
  deduplicateCardioSessions,
  summarizeCardioPeriod,
  computeActivityBreakdown,
  ActivityBreakdownItem,
  CardioPeriodSummary,
} from './cardioAnalytics';
import { normalizeDistance, calculateCardioWeeklyProgress } from './cardioGoals';
import { deriveCardioPersonalRecords } from './cardioRecords';
import { formatDuration, formatPace, getActivityLabel } from './cardioMetrics';

export type CardioInsightCategory =
  | 'performance_trend'
  | 'consistency'
  | 'activity_progression'
  | 'milestone'
  | 'recommendation';

export type CardioInsightTone = 'positive' | 'neutral' | 'caution' | 'celebration';

export interface PersonalizedCardioInsight {
  id: string;
  category: CardioInsightCategory;
  tone: CardioInsightTone;
  title: string;
  description: string;
  highlight?: string;
  activityType?: CardioActivityType;
  metricChange?: {
    metricName: string;
    currentValue: string;
    previousValue?: string;
    deltaPercent?: number | null;
    isImprovement?: boolean | null;
  };
  actionableTip?: string;
}

export interface DeriveCardioInsightsOptions {
  timeRange?: CardioAnalyticsTimeRange;
  referenceDate?: Date;
  weeklyGoals?: CardioWeeklyGoalSettings;
}

export interface CardioInsightsResult {
  timeRange: CardioAnalyticsTimeRange;
  insights: PersonalizedCardioInsight[];
  hasSufficientData: boolean;
  totalSessionsAnalyzed: number;
  periodSummary: {
    currentSessions: number;
    currentDurationFormatted: string;
    currentDistanceFormatted: string;
    previousSessions: number;
    previousDurationFormatted: string;
    previousDistanceFormatted: string;
  };
}

const DISTANCE_ACTIVITIES = new Set<CardioActivityType>([
  'running',
  'walking',
  'cycling',
  'treadmill',
  'elliptical',
  'rowing',
]);

/**
 * Derives comprehensive, personalized cardio insights strictly from the user's logged cardio sessions.
 * Never fabricates missing values (distance, pace, heart rate, calories).
 * Handles unit normalization, invalid dates, and zero baselines safely.
 */
export function deriveCardioInsights(
  rawSessions: CardioSession[],
  options: DeriveCardioInsightsOptions = {}
): CardioInsightsResult {
  const timeRange: CardioAnalyticsTimeRange = options.timeRange || '30d';
  const now = options.referenceDate || new Date();
  const weeklyGoals = options.weeklyGoals;

  // Deduplicate and filter out sessions with invalid dates
  const allSessions = deduplicateCardioSessions(rawSessions).filter((s) => {
    if (!s || !s.date) return false;
    const t = new Date(s.date).getTime();
    return !isNaN(t);
  });

  // Empty state handling
  if (allSessions.length === 0) {
    return {
      timeRange,
      insights: [],
      hasSufficientData: false,
      totalSessionsAnalyzed: 0,
      periodSummary: {
        currentSessions: 0,
        currentDurationFormatted: '0m',
        currentDistanceFormatted: '—',
        previousSessions: 0,
        previousDurationFormatted: '0m',
        previousDistanceFormatted: '—',
      },
    };
  }

  // Calculate strict mutually-exclusive period boundaries
  const boundaries = getCardioPeriodBoundaries(timeRange, now);

  const currentSessions = allSessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= boundaries.currentStart.getTime() && t <= boundaries.currentEnd.getTime();
  });

  const previousSessions = allSessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= boundaries.prevStart.getTime() && t <= boundaries.prevEnd.getTime();
  });

  const currentPeriod = summarizeCardioPeriod(currentSessions);
  const previousPeriod = summarizeCardioPeriod(previousSessions);

  const insights: PersonalizedCardioInsight[] = [];

  // ==========================================
  // 1. PERFORMANCE TRENDS
  // ==========================================
  if (currentPeriod.totalSessions === 0) {
    insights.push({
      id: 'trend-no-period-sessions',
      category: 'performance_trend',
      tone: 'neutral',
      title: `No ${timeRange.toUpperCase()} Cardio Logged`,
      description: `No cardio sessions were recorded in the selected ${timeRange.toUpperCase()} window. Switch to a broader time period or log a session to view progression trends.`,
      highlight: 'No data in period',
    });
  } else if (previousPeriod.totalSessions === 0) {
    insights.push({
      id: 'trend-baseline-established',
      category: 'performance_trend',
      tone: 'neutral',
      title: 'Initial Cardio Baseline',
      description: `Logged ${currentPeriod.totalDurationFormatted} across ${currentPeriod.totalSessions} ${
        currentPeriod.totalSessions === 1 ? 'session' : 'sessions'
      }, establishing your training baseline for this period.`,
      highlight: `${currentPeriod.totalDurationFormatted} baseline`,
      metricChange: {
        metricName: 'Duration',
        currentValue: currentPeriod.totalDurationFormatted,
        deltaPercent: null,
        isImprovement: null,
      },
    });
  } else {
    // Both periods have sessions: compute duration trend
    const durDelta = currentPeriod.totalDurationMinutes - previousPeriod.totalDurationMinutes;
    const durDeltaPct = Math.round((durDelta / previousPeriod.totalDurationMinutes) * 100);

    if (durDeltaPct > 5) {
      insights.push({
        id: 'trend-duration-progression',
        category: 'performance_trend',
        tone: 'positive',
        title: 'Cardio Duration Progression',
        description: `Total cardio duration grew by +${durDeltaPct}% (${currentPeriod.totalDurationFormatted} vs ${previousPeriod.totalDurationFormatted}), adding +${formatDuration(
          durDelta
        )} of aerobic conditioning.`,
        highlight: `+${durDeltaPct}% duration`,
        metricChange: {
          metricName: 'Duration',
          currentValue: currentPeriod.totalDurationFormatted,
          previousValue: previousPeriod.totalDurationFormatted,
          deltaPercent: durDeltaPct,
          isImprovement: true,
        },
      });
    } else if (durDeltaPct < -5) {
      insights.push({
        id: 'trend-duration-adjustment',
        category: 'performance_trend',
        tone: 'neutral',
        title: 'Duration Adjustment',
        description: `Cardio duration shifted by ${durDeltaPct}% (${currentPeriod.totalDurationFormatted} vs ${previousPeriod.totalDurationFormatted}), down ${formatDuration(
          Math.abs(durDelta)
        )}.`,
        highlight: `${durDeltaPct}% duration`,
        metricChange: {
          metricName: 'Duration',
          currentValue: currentPeriod.totalDurationFormatted,
          previousValue: previousPeriod.totalDurationFormatted,
          deltaPercent: durDeltaPct,
          isImprovement: false,
        },
      });
    } else {
      insights.push({
        id: 'trend-duration-steady',
        category: 'performance_trend',
        tone: 'neutral',
        title: 'Stable Training Duration',
        description: `Cardio duration remained consistent within ±5% compared to the prior period (${currentPeriod.totalDurationFormatted} vs ${previousPeriod.totalDurationFormatted}).`,
        highlight: 'Steady volume (±5%)',
        metricChange: {
          metricName: 'Duration',
          currentValue: currentPeriod.totalDurationFormatted,
          previousValue: previousPeriod.totalDurationFormatted,
          deltaPercent: durDeltaPct,
          isImprovement: null,
        },
      });
    }

    // Distance Trend (only if BOTH periods contain valid distance measurements)
    if (
      currentPeriod.hasDistanceData &&
      previousPeriod.hasDistanceData &&
      previousPeriod.totalDistanceKm > 0
    ) {
      const distDelta = currentPeriod.totalDistanceKm - previousPeriod.totalDistanceKm;
      const distDeltaPct = Math.round((distDelta / previousPeriod.totalDistanceKm) * 100);

      if (distDeltaPct > 5) {
        insights.push({
          id: 'trend-distance-progression',
          category: 'performance_trend',
          tone: 'positive',
          title: 'Distance Volume Expansion',
          description: `Accumulated ${currentPeriod.totalDistanceFormatted}, an increase of +${distDeltaPct}% (+${distDelta.toFixed(
            1
          )} km) over the prior period (${previousPeriod.totalDistanceFormatted}).`,
          highlight: `+${distDeltaPct}% distance`,
          metricChange: {
            metricName: 'Distance',
            currentValue: currentPeriod.totalDistanceFormatted,
            previousValue: previousPeriod.totalDistanceFormatted,
            deltaPercent: distDeltaPct,
            isImprovement: true,
          },
        });
      } else if (distDeltaPct < -5) {
        insights.push({
          id: 'trend-distance-adjustment',
          category: 'performance_trend',
          tone: 'neutral',
          title: 'Distance Volume Shift',
          description: `Logged ${currentPeriod.totalDistanceFormatted} compared to ${previousPeriod.totalDistanceFormatted} in the previous period.`,
          highlight: `${distDeltaPct}% distance`,
          metricChange: {
            metricName: 'Distance',
            currentValue: currentPeriod.totalDistanceFormatted,
            previousValue: previousPeriod.totalDistanceFormatted,
            deltaPercent: distDeltaPct,
            isImprovement: false,
          },
        });
      } else {
        insights.push({
          id: 'trend-distance-steady',
          category: 'performance_trend',
          tone: 'neutral',
          title: 'Consistent Distance Output',
          description: `Total measured distance remained steady at ${currentPeriod.totalDistanceFormatted} (within ±5% of previous period).`,
          highlight: 'Steady distance',
        });
      }
    }

    // Average Session Duration
    const avgCur = currentPeriod.averageDurationMinutes;
    const avgPrev = previousPeriod.averageDurationMinutes;
    const avgDelta = Math.round(avgCur - avgPrev);

    if (Math.abs(avgDelta) >= 5) {
      if (avgDelta > 0) {
        insights.push({
          id: 'trend-session-duration-increase',
          category: 'performance_trend',
          tone: 'positive',
          title: 'Longer Session Format',
          description: `Average session length increased by +${avgDelta}m (${formatDuration(
            avgCur
          )} vs ${formatDuration(avgPrev)}), building aerobic base stamina.`,
          highlight: `+${avgDelta}m avg/session`,
        });
      } else {
        insights.push({
          id: 'trend-session-duration-decrease',
          category: 'performance_trend',
          tone: 'neutral',
          title: 'Briefer Session Format',
          description: `Average session length was ${Math.abs(avgDelta)}m shorter (${formatDuration(
            avgCur
          )} vs ${formatDuration(avgPrev)}), reflecting shorter, higher-tempo workouts.`,
          highlight: `-${Math.abs(avgDelta)}m avg/session`,
        });
      }
    }

    // Compatible Activity Pace Comparison (NEVER compare running pace to cycling pace)
    const matchingActivities = Array.from(DISTANCE_ACTIVITIES).filter((act) => {
      const curHas = currentSessions.some((s) => s.activityType === act);
      const prevHas = previousSessions.some((s) => s.activityType === act);
      return curHas && prevHas;
    });

    for (const act of matchingActivities) {
      const curActSessions = currentSessions.filter(
        (s) =>
          s.activityType === act &&
          Number(s.durationMinutes) > 0 &&
          Number(s.distance) > 0
      );
      const prevActSessions = previousSessions.filter(
        (s) =>
          s.activityType === act &&
          Number(s.durationMinutes) > 0 &&
          Number(s.distance) > 0
      );

      const curDistKm = curActSessions.reduce(
        (sum, s) => sum + normalizeDistance(s.distance!, s.distanceUnit || 'km', 'km'),
        0
      );
      const curDurMins = curActSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      const prevDistKm = prevActSessions.reduce(
        (sum, s) => sum + normalizeDistance(s.distance!, s.distanceUnit || 'km', 'km'),
        0
      );
      const prevDurMins = prevActSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      // Only compare pace when both periods have at least 1.0 km of recorded distance
      if (curDistKm >= 1.0 && prevDistKm >= 1.0) {
        const curPaceMinPerKm = curDurMins / curDistKm;
        const prevPaceMinPerKm = prevDurMins / prevDistKm;
        const paceDiff = curPaceMinPerKm - prevPaceMinPerKm;

        // At least 6 seconds per km difference (|0.10| min/km)
        if (paceDiff <= -0.1) {
          const secFaster = Math.round(Math.abs(paceDiff) * 60);
          const actLabel = getActivityLabel(act);
          insights.push({
            id: `trend-pace-${act}-faster`,
            category: 'performance_trend',
            tone: 'positive',
            title: `${actLabel} Pace Improvement`,
            description: `Average ${actLabel.toLowerCase()} pace improved to ${formatPace(
              curPaceMinPerKm,
              'km'
            )} (${secFaster}s/km faster than previous period's ${formatPace(prevPaceMinPerKm, 'km')}).`,
            highlight: `${secFaster}s/km faster`,
            activityType: act,
          });
          break; // Surface the top compatible pace insight
        } else if (paceDiff >= 0.25) {
          const secSlower = Math.round(paceDiff * 60);
          const actLabel = getActivityLabel(act);
          insights.push({
            id: `trend-pace-${act}-slower`,
            category: 'performance_trend',
            tone: 'neutral',
            title: `${actLabel} Pace Adjustment`,
            description: `Average ${actLabel.toLowerCase()} pace was ${formatPace(
              curPaceMinPerKm,
              'km'
            )} (${secSlower}s/km more conservative than ${formatPace(prevPaceMinPerKm, 'km')}).`,
            highlight: `${formatPace(curPaceMinPerKm, 'km')}`,
            activityType: act,
          });
          break;
        }
      }
    }
  }

  // ==========================================
  // 2. CONSISTENCY INSIGHTS
  // ==========================================
  if (previousPeriod.totalSessions > 0 && currentPeriod.totalSessions > 0) {
    const sessionDelta = currentPeriod.totalSessions - previousPeriod.totalSessions;
    if (sessionDelta > 0) {
      insights.push({
        id: 'consistency-frequency-increase',
        category: 'consistency',
        tone: 'positive',
        title: 'Increased Session Frequency',
        description: `Completed ${currentPeriod.totalSessions} sessions (${sessionDelta > 0 ? `+${sessionDelta}` : sessionDelta} more than the prior period of ${
          previousPeriod.totalSessions
        }).`,
        highlight: `+${sessionDelta} sessions`,
        metricChange: {
          metricName: 'Sessions',
          currentValue: `${currentPeriod.totalSessions}`,
          previousValue: `${previousPeriod.totalSessions}`,
          deltaPercent: Math.round((sessionDelta / previousPeriod.totalSessions) * 100),
          isImprovement: true,
        },
      });
    } else if (sessionDelta < 0) {
      insights.push({
        id: 'consistency-frequency-decrease',
        category: 'consistency',
        tone: 'neutral',
        title: 'Session Frequency Shift',
        description: `Logged ${currentPeriod.totalSessions} sessions compared to ${previousPeriod.totalSessions} in the previous period.`,
        highlight: `${sessionDelta} sessions`,
        metricChange: {
          metricName: 'Sessions',
          currentValue: `${currentPeriod.totalSessions}`,
          previousValue: `${previousPeriod.totalSessions}`,
          deltaPercent: Math.round((sessionDelta / previousPeriod.totalSessions) * 100),
          isImprovement: false,
        },
      });
    } else {
      insights.push({
        id: 'consistency-frequency-steady',
        category: 'consistency',
        tone: 'positive',
        title: 'Consistent Routine',
        description: `Maintained a steady routine with exactly ${currentPeriod.totalSessions} sessions, matching your prior period cadence.`,
        highlight: 'Steady routine',
      });
    }
  }

  // Active Days Regularity
  if (currentPeriod.activeDaysCount > 0) {
    if (timeRange === '7d' && currentPeriod.activeDaysCount >= 3) {
      insights.push({
        id: 'consistency-active-days-7d',
        category: 'consistency',
        tone: 'positive',
        title: 'High Weekly Regularity',
        description: `Active on ${currentPeriod.activeDaysCount} of 7 days, maintaining strong cardiovascular rhythm.`,
        highlight: `${currentPeriod.activeDaysCount}/7 days`,
      });
    } else if (timeRange === '30d' && currentPeriod.activeDaysCount >= 8) {
      insights.push({
        id: 'consistency-active-days-30d',
        category: 'consistency',
        tone: 'positive',
        title: 'Consistent Monthly Cadence',
        description: `Trained on ${currentPeriod.activeDaysCount} distinct days across the past 30 days.`,
        highlight: `${currentPeriod.activeDaysCount} active days`,
      });
    }
  }

  // Weekly Goal Alignment (if goals passed)
  if (weeklyGoals) {
    const weeklyProgress = calculateCardioWeeklyProgress(currentSessions, weeklyGoals);
    if (weeklyProgress.activeCount > 0) {
      if (weeklyProgress.allCompleted) {
        insights.push({
          id: 'consistency-goals-completed',
          category: 'consistency',
          tone: 'celebration',
          title: 'Weekly Targets Achieved',
          description: `All ${weeklyProgress.activeCount} active weekly cardio goals achieved for this calendar week.`,
          highlight: '100% goals met',
        });
      } else if (weeklyProgress.completedCount > 0) {
        insights.push({
          id: 'consistency-goals-partial',
          category: 'consistency',
          tone: 'neutral',
          title: 'Weekly Goal Progress',
          description: `Achieved ${weeklyProgress.completedCount} of ${weeklyProgress.activeCount} active weekly cardio goals.`,
          highlight: `${weeklyProgress.completedCount}/${weeklyProgress.activeCount} met`,
        });
      }
    }
  }

  // ==========================================
  // 3. ACTIVITY-SPECIFIC INSIGHTS
  // ==========================================
  if (currentSessions.length > 0) {
    const activityBreakdown = computeActivityBreakdown(
      currentSessions,
      currentPeriod.totalDurationMinutes
    );
    const topActivity = activityBreakdown.length > 0 ? activityBreakdown[0] : null;

    if (topActivity && topActivity.percentageOfDuration >= 65) {
      insights.push({
        id: 'activity-preference-dominant',
        category: 'activity_progression',
        tone: 'neutral',
        title: `Focused ${topActivity.label} Routine`,
        description: `${topActivity.label} accounted for ${topActivity.percentageOfDuration}% of your total duration across ${topActivity.sessionCount} sessions.`,
        highlight: `${topActivity.percentageOfDuration}% ${topActivity.label}`,
        activityType: topActivity.activityType,
      });
    } else if (activityBreakdown.length >= 3) {
      insights.push({
        id: 'activity-cross-training',
        category: 'activity_progression',
        tone: 'positive',
        title: 'Cross-Training Variety',
        description: `Engaged in ${activityBreakdown.length} distinct cardio activities, promoting balanced conditioning and varied movement patterns.`,
        highlight: `${activityBreakdown.length} activities`,
      });
    }

    // Top activity longest effort improvement
    if (topActivity && previousSessions.length > 0) {
      const curTopSessions = currentSessions.filter((s) => s.activityType === topActivity.activityType);
      const prevTopSessions = previousSessions.filter((s) => s.activityType === topActivity.activityType);

      const curMaxDur = Math.max(...curTopSessions.map((s) => Number(s.durationMinutes) || 0), 0);
      const prevMaxDur = Math.max(...prevTopSessions.map((s) => Number(s.durationMinutes) || 0), 0);

      if (curMaxDur > prevMaxDur && prevMaxDur > 0) {
        insights.push({
          id: `activity-peak-duration-${topActivity.activityType}`,
          category: 'activity_progression',
          tone: 'positive',
          title: `${topActivity.label} Duration Peak`,
          description: `Your longest single ${topActivity.label.toLowerCase()} effort reached ${formatDuration(
            curMaxDur
          )} (up from ${formatDuration(prevMaxDur)} in the prior period).`,
          highlight: `Peak ${formatDuration(curMaxDur)}`,
          activityType: topActivity.activityType,
        });
      }
    }
  }

  // ==========================================
  // 4. PERSONAL MILESTONES (Reusing Phase 5.3 PRs)
  // ==========================================
  const allCardioPRs = deriveCardioPersonalRecords(allSessions);

  // Check if any PR was achieved in the current period window
  const currentPeriodPRs = allCardioPRs.filter((pr) => {
    const prTime = new Date(pr.date).getTime();
    return (
      prTime >= boundaries.currentStart.getTime() && prTime <= boundaries.currentEnd.getTime()
    );
  });

  if (currentPeriodPRs.length > 0) {
    const topPR = currentPeriodPRs[0];
    insights.push({
      id: `milestone-pr-${topPR.type}`,
      category: 'milestone',
      tone: 'celebration',
      title: `Milestone: ${topPR.title}`,
      description: `Achieved ${topPR.metricValue} on ${new Date(topPR.date).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      })} (${topPR.details}).`,
      highlight: 'Personal Record',
      activityType: topPR.activityType,
    });
  }

  // Cumulative distance milestone in period
  if (currentPeriod.totalDistanceKm >= 50) {
    insights.push({
      id: 'milestone-50k-club',
      category: 'milestone',
      tone: 'celebration',
      title: '50+ km Cumulative Distance',
      description: `Crossed 50 km of total cardio distance in this period (${currentPeriod.totalDistanceFormatted}).`,
      highlight: '50+ km milestone',
    });
  } else {
    // 60-minute continuous session milestone
    const sixtyMinSession = currentSessions.find((s) => Number(s.durationMinutes) >= 60);
    if (sixtyMinSession) {
      insights.push({
        id: 'milestone-60min-session',
        category: 'milestone',
        tone: 'positive',
        title: '60-Minute Endurance Effort',
        description: `Completed an extended continuous cardio session lasting ${formatDuration(
          sixtyMinSession.durationMinutes
        )}.`,
        highlight: '60+ min effort',
        activityType: sixtyMinSession.activityType,
      });
    }
  }

  // ==========================================
  // 5. ACTIONABLE RECOMMENDATIONS (Conservative & Evidence-Based)
  // ==========================================
  if (currentPeriod.totalSessions === 0) {
    insights.push({
      id: 'rec-restart-momentum',
      category: 'recommendation',
      tone: 'neutral',
      title: 'Ready to Resume',
      description:
        'When resuming cardio after a break, starting with a relaxed 15–20 minute walk or light cycle helps build momentum without fatigue.',
      actionableTip: 'Start with a short 15–20 minute session.',
    });
  } else {
    const durDelta =
      previousPeriod.totalDurationMinutes > 0
        ? Math.round(
            ((currentPeriod.totalDurationMinutes - previousPeriod.totalDurationMinutes) /
              previousPeriod.totalDurationMinutes) *
              100
          )
        : 0;

    // Volume expansion safeguard: avoid aggressive volume spikes (> 25%)
    if (durDelta > 25 && previousPeriod.totalDurationMinutes >= 60) {
      insights.push({
        id: 'rec-volume-consolidation',
        category: 'recommendation',
        tone: 'caution',
        title: 'Volume Consolidation Cue',
        description: `Your cardio duration expanded by +${durDelta}% this period. Hold this duration steady for the next week to allow tendon and cardiovascular adaptation before adding further volume.`,
        actionableTip: 'Consolidate at current duration before increasing volume.',
      });
    } else if (timeRange === '7d' && currentPeriod.totalSessions === 1) {
      insights.push({
        id: 'rec-add-second-session',
        category: 'recommendation',
        tone: 'neutral',
        title: 'Consistency Opportunity',
        description:
          'You logged 1 cardio session this week. Adding a second moderate 20–30 minute session builds aerobic capacity without excessive fatigue.',
        actionableTip: 'Schedule a second 20–30 min session this week.',
      });
    } else if (
      (timeRange === '7d' && currentPeriod.totalDurationMinutes >= 150) ||
      (timeRange === '30d' && currentPeriod.totalDurationMinutes >= 600)
    ) {
      insights.push({
        id: 'rec-aerobic-guidelines-met',
        category: 'recommendation',
        tone: 'positive',
        title: 'Aerobic Guidelines Met',
        description:
          'You met the standard 150-minute weekly aerobic guideline recommended for cardiovascular health. Prioritize hydration and recovery between hard sessions.',
        actionableTip: 'Maintain current cadence and focus on recovery.',
      });
    } else {
      // General balanced recommendation
      insights.push({
        id: 'rec-steady-progression',
        category: 'recommendation',
        tone: 'neutral',
        title: 'Progressive Conditioning',
        description:
          'Consistency in aerobic training yields optimal cardiovascular gains. Maintain steady pacing and ensure adequate rest days alongside strength workouts.',
        actionableTip: 'Keep consistent pacing across training days.',
      });
    }
  }

  return {
    timeRange,
    insights,
    hasSufficientData: currentPeriod.totalSessions > 0,
    totalSessionsAnalyzed: allSessions.length,
    periodSummary: {
      currentSessions: currentPeriod.totalSessions,
      currentDurationFormatted: currentPeriod.totalDurationFormatted,
      currentDistanceFormatted: currentPeriod.totalDistanceFormatted,
      previousSessions: previousPeriod.totalSessions,
      previousDurationFormatted: previousPeriod.totalDurationFormatted,
      previousDistanceFormatted: previousPeriod.totalDistanceFormatted,
    },
  };
}
