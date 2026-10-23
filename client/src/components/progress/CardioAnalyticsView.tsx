import React, { useState, useMemo } from 'react';
import {
  Flame,
  Footprints,
  Bike,
  Timer,
  Zap,
  Waves,
  TrendingUp,
  Activity,
  Clock,
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Target,
  ChevronRight,
  Trophy,
  Lightbulb,
} from 'lucide-react';
import { CardioSession, CardioActivityType } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  CardioAnalyticsTimeRange,
  getComprehensiveCardioAnalytics,
} from '../../utils/cardioAnalytics';
import { calculateCardioWeeklyProgress } from '../../utils/cardioGoals';
import { deriveCardioPersonalRecords } from '../../utils/cardioRecords';
import {
  deriveCardioInsights,
  CardioInsightCategory,
  CardioInsightTone,
} from '../../utils/cardioInsights';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface CardioAnalyticsViewProps {
  cardioSessions: CardioSession[];
  onLogCardio?: () => void;
  onNavigateToGoals?: () => void;
  onNavigateToRecords?: () => void;
}

const getActivityIcon = (type: CardioActivityType) => {
  switch (type) {
    case 'running':
      return <Flame className="w-4 h-4 text-orange-400" />;
    case 'walking':
      return <Footprints className="w-4 h-4 text-emerald-400" />;
    case 'cycling':
      return <Bike className="w-4 h-4 text-sky-400" />;
    case 'treadmill':
      return <Timer className="w-4 h-4 text-purple-400" />;
    case 'elliptical':
      return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'rowing':
      return <Waves className="w-4 h-4 text-blue-400" />;
    case 'stair_climber':
      return <TrendingUp className="w-4 h-4 text-rose-400" />;
    case 'other':
    default:
      return <Activity className="w-4 h-4 text-neutral-400" />;
  }
};

const getActivityColorClass = (type: CardioActivityType): { bar: string; text: string; bg: string } => {
  switch (type) {
    case 'running':
      return { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    case 'walking':
      return { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'cycling':
      return { bar: 'bg-sky-500', text: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' };
    case 'treadmill':
      return { bar: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
    case 'elliptical':
      return { bar: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
    case 'rowing':
      return { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'stair_climber':
      return { bar: 'bg-rose-500', text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    case 'other':
    default:
      return { bar: 'bg-neutral-500', text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20' };
  }
};

const getInsightToneClasses = (tone: CardioInsightTone) => {
  switch (tone) {
    case 'positive':
      return {
        cardBg: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/25',
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        iconBg: 'bg-emerald-500/15 text-emerald-400',
      };
    case 'celebration':
      return {
        cardBg: 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        iconBg: 'bg-amber-500/15 text-amber-400',
      };
    case 'caution':
      return {
        cardBg: 'bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/30',
        badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        iconBg: 'bg-orange-500/15 text-orange-400',
      };
    case 'neutral':
    default:
      return {
        cardBg: 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border-[var(--border-subtle)]',
        badge: 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
        iconBg: 'bg-[var(--bg-card)] text-[var(--text-secondary)]',
      };
  }
};

const getCategoryIcon = (category: CardioInsightCategory) => {
  switch (category) {
    case 'performance_trend':
      return <TrendingUp className="w-3.5 h-3.5" />;
    case 'consistency':
      return <Clock className="w-3.5 h-3.5" />;
    case 'activity_progression':
      return <Footprints className="w-3.5 h-3.5" />;
    case 'milestone':
      return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
    case 'recommendation':
      return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
  }
};

export const CardioAnalyticsView: React.FC<CardioAnalyticsViewProps> = ({
  cardioSessions,
  onLogCardio,
  onNavigateToGoals,
  onNavigateToRecords,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { getCardioGoals } = useWorkoutStore();
  const cardioGoals = getCardioGoals(userId);

  const weeklyGoalProgress = useMemo(() => {
    return calculateCardioWeeklyProgress(cardioSessions, cardioGoals);
  }, [cardioSessions, cardioGoals]);

  const cardioPRs = useMemo(() => {
    return deriveCardioPersonalRecords(cardioSessions);
  }, [cardioSessions]);

  const [timeRange, setTimeRange] = useState<CardioAnalyticsTimeRange>('30d');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [selectedInsightCategory, setSelectedInsightCategory] = useState<string>('all');

  // Filter raw sessions by activity if selected
  const filteredSessions = useMemo(() => {
    if (selectedActivity === 'all') return cardioSessions;
    return cardioSessions.filter((s) => s.activityType === selectedActivity);
  }, [cardioSessions, selectedActivity]);

  const analytics = useMemo(() => {
    return getComprehensiveCardioAnalytics(filteredSessions, timeRange);
  }, [filteredSessions, timeRange]);

  const { currentPeriod, comparison, activityBreakdown, weeklyTrends, dailyTrends } =
    analytics;

  const personalizedResult = useMemo(() => {
    return deriveCardioInsights(filteredSessions, {
      timeRange,
      weeklyGoals: cardioGoals,
    });
  }, [filteredSessions, timeRange, cardioGoals]);

  const availableInsightCategories = useMemo(() => {
    const cats = new Set(personalizedResult.insights.map((i) => i.category));
    return [
      { id: 'all', label: 'All' },
      ...(cats.has('performance_trend') ? [{ id: 'performance_trend', label: 'Trends' }] : []),
      ...(cats.has('consistency') ? [{ id: 'consistency', label: 'Consistency' }] : []),
      ...(cats.has('activity_progression') ? [{ id: 'activity_progression', label: 'Activities' }] : []),
      ...(cats.has('milestone') ? [{ id: 'milestone', label: 'Milestones' }] : []),
      ...(cats.has('recommendation') ? [{ id: 'recommendation', label: 'Tips' }] : []),
    ];
  }, [personalizedResult.insights]);

  const displayedInsights = useMemo(() => {
    if (selectedInsightCategory === 'all') return personalizedResult.insights;
    return personalizedResult.insights.filter((i) => i.category === selectedInsightCategory);
  }, [personalizedResult.insights, selectedInsightCategory]);

  // Maximum value for the trend chart scaling
  const maxTrendDuration = useMemo(() => {
    if (timeRange === '7d') {
      const max = Math.max(...dailyTrends.map((d) => d.durationMinutes), 0);
      return Math.max(max, 30);
    }
    const max = Math.max(...weeklyTrends.map((w) => w.durationMinutes), 0);
    return Math.max(max, 60);
  }, [timeRange, dailyTrends, weeklyTrends]);

  // Handle empty state: zero lifetime sessions logged
  if (cardioSessions.length === 0) {
    return (
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-8 sm:p-12 text-center rounded-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto shadow-sm">
          <Flame className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
            No Cardio Sessions Logged Yet
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Record your runs, walks, cycling, treadmill, and rowing to track duration trends, distance volume, and activity breakdowns.
          </p>
        </div>
        {onLogCardio && (
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={onLogCardio}
              className="gap-2 font-bold shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Log Your First Cardio Session</span>
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Time Range Selector & Activity Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 rounded-2xl">
        {/* Time Period Tabs */}
        <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)] gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            className={`flex-1 sm:flex-none py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeRange === '7d'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('30d')}
            className={`flex-1 sm:flex-none py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeRange === '30d'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('12w')}
            className={`flex-1 sm:flex-none py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeRange === '12w'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Last 12 Weeks
          </button>
        </div>

        {/* Activity Filter Dropdown & Log Action */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-0">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0">
              Activity:
            </span>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full sm:w-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[var(--primary)] cursor-pointer truncate"
            >
              <option value="all">All Activities ({cardioSessions.length})</option>
              <option value="running">Running</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
              <option value="treadmill">Treadmill</option>
              <option value="elliptical">Elliptical</option>
              <option value="rowing">Rowing</option>
              <option value="stair_climber">Stair Climber</option>
              <option value="other">Other Activity</option>
            </select>
          </div>

          {onLogCardio && (
            <Button
              variant="primary"
              size="sm"
              onClick={onLogCardio}
              className="gap-1.5 text-xs font-bold shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Cardio</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Key Cardio Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Total Sessions */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 text-center rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              Cardio Sessions
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
              {currentPeriod.totalSessions}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
            {comparison.hasComparisonData ? (
              comparison.sessionsDelta >= 0 ? (
                <span className="text-emerald-400 font-bold flex items-center">
                  <ArrowUpRight className="w-3 h-3" />
                  {comparison.sessionsDelta > 0 && '+'}
                  {comparison.sessionsDelta}
                  {comparison.sessionsDeltaPercent !== null && ` (${comparison.sessionsDeltaPercent > 0 ? '+' : ''}${comparison.sessionsDeltaPercent}%)`}
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center">
                  <ArrowDownRight className="w-3 h-3" />
                  {comparison.sessionsDelta}
                  {comparison.sessionsDeltaPercent !== null && ` (${comparison.sessionsDeltaPercent}%)`}
                </span>
              )
            ) : (
              <span className="text-[var(--text-muted)] font-medium">Current period</span>
            )}
          </div>
        </Card>

        {/* Card 2: Total Duration */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 text-center rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              Total Duration
            </div>
            <div className="text-xl sm:text-2xl font-black text-orange-400 truncate">
              {currentPeriod.totalDurationFormatted}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
            {comparison.hasComparisonData && comparison.durationDeltaPercent !== null ? (
              comparison.durationDeltaPercent >= 0 ? (
                <span className="text-emerald-400 font-bold flex items-center">
                  <ArrowUpRight className="w-3 h-3" />
                  {comparison.durationDeltaPercent > 0 && '+'}
                  {comparison.durationDeltaPercent}% vs prior
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center">
                  <ArrowDownRight className="w-3 h-3" />
                  {comparison.durationDeltaPercent}% vs prior
                </span>
              )
            ) : (
              <span className="text-[var(--text-muted)] font-medium">Logged time</span>
            )}
          </div>
        </Card>

        {/* Card 3: Total Distance */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 text-center rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              Total Distance
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-400 truncate">
              {currentPeriod.totalDistanceFormatted}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)] font-medium">
            {currentPeriod.hasDistanceData
              ? `${currentPeriod.distanceSessionCount} of ${currentPeriod.totalSessions} with dist`
              : 'No distance logged'}
          </div>
        </Card>

        {/* Card 4: Average Duration & Active Days */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 text-center rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              Avg Session
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {currentPeriod.averageDurationFormatted}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-[var(--text-secondary)] font-semibold">
            {currentPeriod.activeDaysCount} active {currentPeriod.activeDaysCount === 1 ? 'day' : 'days'}
          </div>
        </Card>
      </div>

      {/* 2b. Compact Weekly Goals & Records Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Weekly Goal Progress Quick Summary */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--text-main)] truncate">
                  Weekly Goals
                </span>
                {weeklyGoalProgress.activeCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                    {weeklyGoalProgress.completedCount}/{weeklyGoalProgress.activeCount} met
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                {weeklyGoalProgress.activeCount === 0
                  ? 'No weekly goals enabled'
                  : weeklyGoalProgress.items
                      .filter((i) => i.enabled)
                      .map((i) => `${i.formattedCurrent} (${i.percentage}%)`)
                      .join(' • ')}
              </div>
            </div>
          </div>

          {onNavigateToGoals && (
            <button
              type="button"
              onClick={onNavigateToGoals}
              className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <span>Goals</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </Card>

        {/* Cardio Records Quick Summary */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--text-main)] truncate">
                  Cardio Records
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-surface)] text-amber-400 border border-[var(--border-subtle)] shrink-0">
                  {cardioPRs.length} PRs
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                {cardioPRs.length === 0
                  ? 'Complete a session to log PRs'
                  : cardioPRs
                      .map((r) => `${r.title.replace('Cardio ', '').replace('Personal ', '')}: ${r.metricValue}`)
                      .slice(0, 2)
                      .join(' • ')}
              </div>
            </div>
          </div>

          {onNavigateToRecords && (
            <button
              type="button"
              onClick={onNavigateToRecords}
              className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <span>Records</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </Card>
      </div>

      {/* 3. Duration & Sessions Trend Chart */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              {timeRange === '7d' ? 'Daily Duration Trend' : 'Weekly Duration Trend'}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
              <span>Duration (mins)</span>
            </div>
          </div>
        </div>

        {/* Chart Render */}
        {currentPeriod.totalSessions === 0 ? (
          <div className="py-10 text-center space-y-1">
            <p className="text-xs font-bold text-[var(--text-main)]">
              No Cardio Recorded in This Period
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Switch time periods or log a session to view progression trends.
            </p>
          </div>
        ) : timeRange === '7d' ? (
          /* 7-Day Daily Bar Chart */
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end h-36 sm:h-40 pt-4 pb-1">
              {dailyTrends.map((d) => {
                const heightPercent =
                  maxTrendDuration > 0
                    ? Math.min(100, Math.round((d.durationMinutes / maxTrendDuration) * 100))
                    : 0;
                const hasActivity = d.durationMinutes > 0;

                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center justify-end h-full gap-1 group relative cursor-pointer"
                    title={`${d.dayLabel}: ${d.durationMinutes}m across ${d.sessionCount} sessions${d.distanceKm > 0 ? ` (${d.distanceKm} km)` : ''}`}
                  >
                    {/* Value on hover or if active */}
                    <span className="text-[9px] font-bold text-[var(--text-muted)] group-hover:text-orange-400 transition-colors">
                      {hasActivity ? `${d.durationMinutes}m` : '0m'}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[28px] sm:max-w-[36px] bg-[var(--bg-surface)] rounded-t-lg h-full flex items-end p-0.5 overflow-hidden">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          hasActivity ? 'bg-orange-500 group-hover:bg-orange-400' : 'bg-transparent'
                        }`}
                        style={{ height: `${Math.max(hasActivity ? 8 : 0, heightPercent)}%` }}
                      />
                    </div>

                    {/* Day Label */}
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors truncate">
                      {d.dayLabel.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Multi-Week Weekly Bar Chart */
          <div className="space-y-2">
            <div
              className={`grid ${
                timeRange === '12w' ? 'grid-cols-6 sm:grid-cols-12' : 'grid-cols-5'
              } gap-1.5 sm:gap-2.5 items-end h-36 sm:h-40 pt-4 pb-1`}
            >
              {weeklyTrends.map((w) => {
                const heightPercent =
                  maxTrendDuration > 0
                    ? Math.min(100, Math.round((w.durationMinutes / maxTrendDuration) * 100))
                    : 0;
                const hasActivity = w.durationMinutes > 0;

                return (
                  <div
                    key={w.weekStart}
                    className="flex flex-col items-center justify-end h-full gap-1 group relative cursor-pointer"
                    title={`${w.weekLabel}: ${w.durationMinutes}m across ${w.sessionCount} sessions${w.distanceKm > 0 ? ` (${w.distanceKm} km)` : ''}`}
                  >
                    {/* Value indicator */}
                    <span className="text-[9px] font-bold text-[var(--text-muted)] group-hover:text-orange-400 transition-colors truncate w-full text-center">
                      {hasActivity ? `${w.durationMinutes}m` : '0m'}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[24px] sm:max-w-[32px] bg-[var(--bg-surface)] rounded-t-lg h-full flex items-end p-0.5 overflow-hidden">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          hasActivity ? 'bg-orange-500 group-hover:bg-orange-400' : 'bg-transparent'
                        }`}
                        style={{ height: `${Math.max(hasActivity ? 8 : 0, heightPercent)}%` }}
                      />
                    </div>

                    {/* Week label */}
                    <span className="text-[9px] sm:text-[10px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors truncate">
                      {w.weekLabel.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 4. Activity-Type Breakdown */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Activity Breakdown
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-medium">
            {activityBreakdown.length} {activityBreakdown.length === 1 ? 'type' : 'types'} active
          </span>
        </div>

        {activityBreakdown.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
            No activities recorded in this timeframe.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Visual Multi-Segment Distribution Bar */}
            <div className="w-full h-3 bg-[var(--bg-surface)] rounded-full overflow-hidden flex p-0.5 gap-0.5">
              {activityBreakdown.map((item) => {
                const colors = getActivityColorClass(item.activityType);
                return (
                  <div
                    key={item.activityType}
                    className={`h-full rounded-full ${colors.bar} transition-all`}
                    style={{ width: `${Math.max(2, item.percentageOfDuration)}%` }}
                    title={`${item.label}: ${item.percentageOfDuration}% (${item.totalDurationFormatted})`}
                  />
                );
              })}
            </div>

            {/* Activity List Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {activityBreakdown.map((item) => {
                const colors = getActivityColorClass(item.activityType);
                return (
                  <div
                    key={item.activityType}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                        {getActivityIcon(item.activityType)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-main)] truncate">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                          {item.sessionCount} {item.sessionCount === 1 ? 'session' : 'sessions'}
                          {item.totalDistanceKm > 0 && ` • ${item.totalDistanceFormatted}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-[var(--text-main)]">
                        {item.totalDurationFormatted}
                      </div>
                      <div className={`text-[10px] font-bold ${colors.text}`}>
                        {item.percentageOfDuration}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 5. Personalized Cardio Insights Section */}
      {personalizedResult.insights.length > 0 && (
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
                Personalized Cardio Insights
              </h3>
              <Badge variant="secondary" size="sm" className="font-bold text-[10px] ml-1">
                {displayedInsights.length}
              </Badge>
            </div>

            {/* Quick Category Filter Pills */}
            {availableInsightCategories.length > 2 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {availableInsightCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedInsightCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedInsightCategory === cat.id
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {displayedInsights.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
              No insights in this category for the selected period.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedInsights.map((insight) => {
                const toneClasses = getInsightToneClasses(insight.tone);

                return (
                  <div
                    key={insight.id}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all space-y-2 flex flex-col justify-between ${toneClasses.cardBg}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${toneClasses.iconBg}`}
                          >
                            {getCategoryIcon(insight.category)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[var(--text-main)] truncate">
                              {insight.title}
                            </h4>
                            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                              {insight.category.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {insight.highlight && (
                          <Badge
                            variant="secondary"
                            size="sm"
                            className={`font-bold text-[10px] shrink-0 ${toneClasses.badge}`}
                          >
                            {insight.highlight}
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {insight.description}
                      </p>
                    </div>

                    {insight.actionableTip && (
                      <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-start gap-1.5 text-[11px]">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[var(--text-secondary)] font-medium leading-snug">
                          <span className="text-amber-400 font-bold">Suggestion: </span>
                          {insight.actionableTip}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
