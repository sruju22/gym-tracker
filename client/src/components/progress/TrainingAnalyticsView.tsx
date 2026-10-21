import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  Flame,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Info,
  Sparkles,
  Target,
} from 'lucide-react';
import { Exercise, WorkoutSession, WeeklySchedule } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatDateShort, formatVolume } from '../../utils/formatters';
import {
  AnalyticsTimeRange,
  getComprehensiveAnalytics,
  getExerciseStrengthProgression,
  ExerciseProgressionAnalytics,
} from '../../utils/analyticsEngine';

interface TrainingAnalyticsViewProps {
  history: WorkoutSession[];
  exercises: Exercise[];
  weeklyPlan?: WeeklySchedule;
  targetDaysPerWeek?: number;
}

export const TrainingAnalyticsView: React.FC<TrainingAnalyticsViewProps> = ({
  history,
  exercises,
  weeklyPlan,
  targetDaysPerWeek = 4,
}) => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [progressionMetric, setProgressionMetric] = useState<'1rm' | 'max_weight' | 'volume'>('1rm');
  const [showHistoryTable, setShowHistoryTable] = useState(false);

  // Derive comprehensive analytics memoized on history & timeRange
  const analytics = useMemo(() => {
    return getComprehensiveAnalytics(
      history,
      exercises,
      weeklyPlan,
      targetDaysPerWeek,
      timeRange
    );
  }, [history, exercises, weeklyPlan, targetDaysPerWeek, timeRange]);

  // Collect all unique exercises that have completed sets in history
  const performedExerciseOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isCustom: boolean; lastDate: string }>();

    for (const session of history) {
      if (session.status !== 'completed' || !Array.isArray(session.exercises)) continue;
      for (const exItem of session.exercises) {
        // Direct exercise
        const exId = exItem.exerciseId || (exItem.exercise && exItem.exercise.id);
        const exName = exItem.exercise?.name || (exItem as any).exerciseName || exId;
        const isCustom = exId?.startsWith('custom_') || Boolean(exItem.exercise?.isCustom);

        if (exId && !map.has(exId)) {
          map.set(exId, {
            id: exId,
            name: exName,
            isCustom,
            lastDate: session.completedAt || session.date,
          });
        }

        // Superset stages
        for (const set of exItem.sets || []) {
          if (Array.isArray(set.stages)) {
            for (const st of set.stages) {
              if (st.exerciseId && !map.has(st.exerciseId)) {
                map.set(st.exerciseId, {
                  id: st.exerciseId,
                  name: st.exerciseName || st.exerciseId,
                  isCustom: st.exerciseId.startsWith('custom_'),
                  lastDate: session.completedAt || session.date,
                });
              }
            }
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.lastDate).getTime();
      const timeB = new Date(b.lastDate).getTime();
      return timeB - timeA;
    });
  }, [history]);

  // Selected exercise for strength progression
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    return performedExerciseOptions[0]?.id || exercises[0]?.id || 'ex_bench_press';
  });

  // Calculate progression for currently selected exercise
  const currentProgression = useMemo<ExerciseProgressionAnalytics>(() => {
    const exFallback = exercises.find((e) => e.id === selectedExerciseId);
    return getExerciseStrengthProgression(history, selectedExerciseId, exFallback?.name);
  }, [history, selectedExerciseId, exercises]);

  // Empty state if user has no completed sessions
  if (analytics.consistency.totalWorkouts === 0) {
    return (
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-6 sm:p-8 text-center rounded-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--primary)]">
          <TrendingUp className="w-7 h-7 stroke-[2]" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-base font-bold text-[var(--text-main)]">No Training Analytics Yet</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Complete and save your first workout to unlock strength progression charts, weekly volume trends, and muscle coverage insights.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
      {/* 1. Header Toolbar with Time Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
            Training Intelligence
          </h2>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center bg-[var(--bg-input)] p-0.5 rounded-xl border border-[var(--border-subtle)]">
          {(['7d', '30d', '90d', 'all'] as AnalyticsTimeRange[]).map((range) => {
            const labels: Record<string, string> = {
              '7d': '7D',
              '30d': '30D',
              '90d': '90D',
              all: 'All',
            };
            const active = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  active
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Consistency & Frequency Card */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Training Consistency
            </h3>
          </div>

          {/* Streak Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {analytics.consistency.currentDailyStreak > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-3 h-3 fill-amber-400" />
                <span>{analytics.consistency.currentDailyStreak}d Streak</span>
              </span>
            )}
            {analytics.consistency.currentWeeklyStreak > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>{analytics.consistency.currentWeeklyStreak}w Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Workouts
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
              {analytics.consistency.totalWorkouts}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">Completed</div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Last 7 Days
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {analytics.consistency.workoutsLast7Days}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">Workouts</div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Weekly Avg
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
              {analytics.consistency.weeklyAverageWorkouts}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">Workouts/week</div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Best Streak
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {analytics.consistency.longestDailyStreak}d
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">
              {analytics.consistency.longestWeeklyStreak} weeks max
            </div>
          </div>
        </div>

        {/* 8-Week Visual Consistency Strip */}
        {analytics.consistency.weeklyBreakdown.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-[var(--text-secondary)] flex justify-between items-center">
              <span>8-Week Consistency History</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Target: {targetDaysPerWeek} sessions/wk
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
              {analytics.consistency.weeklyBreakdown.map((w, idx) => {
                const isCurrent = idx === analytics.consistency.weeklyBreakdown.length - 1;
                const ratio = Math.min(1, w.completedCount / (w.targetCount || 1));
                let barColor = 'bg-[var(--bg-surface)]';
                if (w.completedCount >= w.targetCount) barColor = 'bg-emerald-500';
                else if (w.completedCount > 0) barColor = 'bg-[var(--primary)]';

                return (
                  <div
                    key={w.weekStart}
                    className={`flex flex-col items-center justify-between p-1.5 rounded-lg border text-center transition-all ${
                      isCurrent
                        ? 'border-[var(--primary)] bg-[var(--primary-subtle)]/30'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                    }`}
                    title={`${w.weekLabel}: ${w.completedCount} / ${w.targetCount} sessions`}
                  >
                    <span className="text-[9px] font-bold text-[var(--text-muted)] truncate w-full">
                      W{idx + 1}
                    </span>
                    <div className="w-full bg-[var(--bg-input)] rounded-full h-1.5 my-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-black ${
                        w.isMet ? 'text-emerald-400' : 'text-[var(--text-main)]'
                      }`}
                    >
                      {w.completedCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 3. Strength Progression for Selected Exercise */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Strength Progression
            </h3>
          </div>

          {/* Exercise Dropdown */}
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] max-w-[180px] sm:max-w-[260px] truncate cursor-pointer shrink-0"
          >
            {performedExerciseOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-[var(--bg-surface)] text-[var(--text-main)]">
                {opt.name} {opt.isCustom ? '(Custom)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3">
          <button
            onClick={() => setProgressionMetric('1rm')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              progressionMetric === '1rm'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Estimated 1RM
          </button>
          <button
            onClick={() => setProgressionMetric('max_weight')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              progressionMetric === 'max_weight'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Max Weight Lifted
          </button>
          <button
            onClick={() => setProgressionMetric('volume')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              progressionMetric === 'volume'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            Set Volume
          </button>
        </div>

        {/* Progression Analytics Insight Banner */}
        {currentProgression.timeline.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {currentProgression.exerciseName}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-[var(--text-main)]">
                    {progressionMetric === '1rm'
                      ? `${currentProgression.currentEstimated1RM} kg`
                      : progressionMetric === 'max_weight'
                      ? `${currentProgression.currentMaxWeight} kg`
                      : `${formatVolume(currentProgression.timeline[currentProgression.timeline.length - 1].totalVolume)} kg`}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {progressionMetric === '1rm'
                      ? 'Current Est. 1RM'
                      : progressionMetric === 'max_weight'
                      ? 'Heaviest Weight'
                      : 'Latest Volume'}
                  </span>
                </div>
              </div>

              {/* Trend Badge */}
              <div className="flex items-center gap-2">
                {currentProgression.trend === 'improving' && (
                  <Badge variant="success" size="sm" className="font-bold">
                    ↑ Improving ({currentProgression.trendDeltaPercent}% delta)
                  </Badge>
                )}
                {currentProgression.trend === 'stable' && (
                  <Badge variant="info" size="sm" className="font-bold text-sky-400 border-sky-400/20">
                    ≈ Stable Performance
                  </Badge>
                )}
                {currentProgression.trend === 'declining' && (
                  <Badge variant="warning" size="sm" className="font-bold text-amber-400 border-amber-400/20">
                    ↓ Working Load Adjusted
                  </Badge>
                )}
                {currentProgression.trend === 'unknown' && (
                  <Badge variant="secondary" size="sm" className="font-bold">
                    Baseline Established
                  </Badge>
                )}
              </div>
            </div>

            {/* SVG Strength Timeline Graph */}
            <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 overflow-hidden">
              {currentProgression.timeline.length === 1 ? (
                <div className="py-8 text-center space-y-1">
                  <p className="text-xs font-bold text-[var(--text-main)]">
                    Single Session Recorded: {currentProgression.currentMaxWeight} kg ×{' '}
                    {currentProgression.timeline[0].bestReps} reps
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Complete this exercise in another workout to plot progression trends.
                  </p>
                </div>
              ) : (
                <svg
                  viewBox="0 0 320 150"
                  className="w-full h-auto max-h-48 overflow-hidden text-[var(--border-subtle)]"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Grid lines */}
                  <line x1="20" y1="24" x2="300" y2="24" stroke="currentColor" strokeDasharray="3 3" />
                  <line x1="20" y1="74" x2="300" y2="74" stroke="currentColor" strokeDasharray="3 3" />
                  <line x1="20" y1="124" x2="300" y2="124" stroke="currentColor" strokeDasharray="3 3" />

                  {(() => {
                    const chartWidth = 320;
                    const chartHeight = 150;
                    const paddingTop = 24;
                    const paddingBottom = 26;
                    const paddingLeft = 28;
                    const paddingRight = 28;
                    const graphWidth = chartWidth - paddingLeft - paddingRight;
                    const graphHeight = chartHeight - paddingTop - paddingBottom;

                    const dataPoints = currentProgression.timeline.map((pt) => {
                      if (progressionMetric === '1rm') return pt.bestEstimated1RM;
                      if (progressionMetric === 'max_weight') return pt.maxWeight;
                      return pt.totalVolume;
                    });

                    const rawMax = Math.max(...dataPoints);
                    const rawMin = Math.min(...dataPoints);
                    const range = rawMax - rawMin;
                    const maxVal = rawMax + Math.max(range * 0.15, 2);
                    const minVal = Math.max(0, rawMin - Math.max(range * 0.15, 2));
                    const valRange = maxVal - minVal || 1;

                    return currentProgression.timeline.map((pt, i) => {
                      const val = dataPoints[i];
                      const x =
                        paddingLeft +
                        (currentProgression.timeline.length > 1
                          ? (i / (currentProgression.timeline.length - 1)) * graphWidth
                          : graphWidth / 2);

                      const y = paddingTop + graphHeight - ((val - minVal) / valRange) * graphHeight;

                      const prevVal = dataPoints[i - 1];
                      let prevX = x;
                      let prevY = y;
                      if (i > 0) {
                        prevX =
                          paddingLeft +
                          ((i - 1) / (currentProgression.timeline.length - 1)) * graphWidth;
                        prevY =
                          paddingTop + graphHeight - ((prevVal - minVal) / valRange) * graphHeight;
                      }

                      const labelY = i % 2 === 1 && currentProgression.timeline.length > 4 ? y + 14 : y - 6;

                      return (
                        <g key={i}>
                          {i > 0 && (
                            <line
                              x1={prevX}
                              y1={prevY}
                              x2={x}
                              y2={y}
                              stroke="var(--primary)"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          )}
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="var(--primary)"
                            stroke="var(--bg-surface)"
                            strokeWidth="1.5"
                          />
                          <text
                            x={x}
                            y={labelY}
                            textAnchor="middle"
                            fill="var(--text-main)"
                            fontSize="9"
                            fontWeight="bold"
                          >
                            {progressionMetric === 'volume' ? formatVolume(val) : `${val}kg`}
                          </text>
                          <text
                            x={x}
                            y={chartHeight - 6}
                            textAnchor="middle"
                            fill="var(--text-secondary)"
                            fontSize="8"
                            fontWeight="600"
                          >
                            {formatDateShort(pt.date)}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
            </div>

            {/* Evidence-Based Progression Reason */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
              <Info className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
              <span>{currentProgression.trendReason}</span>
            </div>

            {/* Transparent formula & interpretation note */}
            <div className="text-[10px] text-[var(--text-muted)] italic px-1">
              Estimated 1RM is calculated using the documented Brzycki (≤12 reps) and Epley (&gt;12 reps) formulas from verified working sets.
            </div>

            {/* Toggle Past Session History Drawer */}
            <div className="pt-1">
              <button
                onClick={() => setShowHistoryTable(!showHistoryTable)}
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                <span>{showHistoryTable ? 'Hide' : 'View'} Recorded Session Breakdown ({currentProgression.timeline.length} sessions)</span>
                {showHistoryTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHistoryTable && (
                <div className="mt-2.5 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-input)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Workout</th>
                        <th className="p-2.5">Top Set</th>
                        <th className="p-2.5">Est. 1RM</th>
                        <th className="p-2.5">Sets</th>
                        <th className="p-2.5">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
                      {currentProgression.timeline.slice().reverse().map((t, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-card)]">
                          <td className="p-2.5 font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                            {formatDateShort(t.date)}
                          </td>
                          <td className="p-2.5 font-medium truncate max-w-[120px]">
                            {t.workoutName}
                          </td>
                          <td className="p-2.5 font-bold whitespace-nowrap">
                            {t.maxWeight} kg × {t.bestReps}
                          </td>
                          <td className="p-2.5 font-semibold text-[var(--primary)] whitespace-nowrap">
                            {t.bestEstimated1RM} kg
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)] whitespace-nowrap">
                            {t.completedSetsCount} sets
                          </td>
                          <td className="p-2.5 font-medium whitespace-nowrap">
                            {formatVolume(t.totalVolume)} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
            No completed working sets found for {currentProgression.exerciseName}.
          </div>
        )}
      </Card>

      {/* 4. Training Volume Analytics */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Training Volume Trends
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {timeRange === 'all' ? 'All Time' : `Last ${timeRange.replace('d', ' Days')}`}
          </span>
        </div>

        {/* Volume Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Load-Volume
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--primary)]">
              {formatVolume(analytics.volume.totalLoadVolume)}
              <span className="text-xs font-normal text-[var(--text-secondary)] ml-0.5">kg</span>
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">Total lifted</div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Working Sets
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
              {analytics.volume.totalCompletedSets}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">Completed</div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              Total Reps
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {analytics.volume.totalReps}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-medium">Reps performed</div>
          </div>
        </div>

        {/* Weekly Volume SVG Bar Chart */}
        {analytics.volume.weeklyVolume.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[var(--text-secondary)]">Weekly Load-Volume</div>
            <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 overflow-hidden">
              <svg
                viewBox="0 0 320 120"
                className="w-full h-auto max-h-36 overflow-hidden text-[var(--border-subtle)]"
                preserveAspectRatio="xMidYMid meet"
              >
                {(() => {
                  const weeks = analytics.volume.weeklyVolume.slice(-8); // Show max last 8 weeks
                  const chartWidth = 320;
                  const chartHeight = 120;
                  const paddingLeft = 20;
                  const paddingRight = 20;
                  const paddingTop = 20;
                  const paddingBottom = 22;
                  const graphWidth = chartWidth - paddingLeft - paddingRight;
                  const graphHeight = chartHeight - paddingTop - paddingBottom;

                  const maxVol = Math.max(...weeks.map((w) => w.loadVolume), 100);
                  const barWidth = Math.max(12, Math.min(28, (graphWidth / weeks.length) * 0.65));

                  return weeks.map((w, idx) => {
                    const x =
                      paddingLeft +
                      idx * (graphWidth / weeks.length) +
                      (graphWidth / weeks.length - barWidth) / 2;
                    const barHeight = Math.max(4, (w.loadVolume / maxVol) * graphHeight);
                    const y = paddingTop + graphHeight - barHeight;

                    return (
                      <g key={w.weekStart}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="3"
                          fill="var(--primary)"
                          opacity="0.85"
                        />
                        <text
                          x={x + barWidth / 2}
                          y={y - 4}
                          textAnchor="middle"
                          fill="var(--text-main)"
                          fontSize="8"
                          fontWeight="bold"
                        >
                          {formatVolume(w.loadVolume)}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          fill="var(--text-secondary)"
                          fontSize="7.5"
                          fontWeight="600"
                        >
                          {w.weekLabel.split('–')[0].trim()}
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] italic px-1">
              Load volume is the sum of weight × reps across completed sets. Cross-exercise totals should be evaluated within the context of movement selection.
            </div>
          </div>
        )}
      </Card>

      {/* 5. Muscle-Group Coverage Breakdown */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Muscle-Group Coverage
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Primary sets (1.0x) & Secondary (0.5x)
          </span>
        </div>

        {/* Muscle Progress Bars */}
        <div className="space-y-3">
          {analytics.muscleCoverage.map((mg) => {
            const maxSets = Math.max(
              ...analytics.muscleCoverage.map((m) => m.effectiveSets),
              15
            );
            const ratio = Math.min(1, mg.effectiveSets / maxSets);

            return (
              <div key={mg.muscleGroup} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[var(--text-main)] capitalize">
                      {mg.displayName}
                    </span>
                    {mg.scheduledInSplit && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                        In Split
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-black text-[var(--text-main)]">
                      {mg.effectiveSets} <span className="font-normal text-[var(--text-muted)]">sets</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      ({mg.directSets} direct{mg.secondarySets > 0 ? ` + ${mg.secondarySets} sec` : ''})
                    </span>
                    {mg.daysSinceLastTrained !== null ? (
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                        {mg.daysSinceLastTrained === 0
                          ? 'Trained today'
                          : `${mg.daysSinceLastTrained}d ago`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">Not trained</span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 6. Recent Milestones */}
      {analytics.recentMilestones.length > 0 && (
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Recent Milestones & Personal Records
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {analytics.recentMilestones.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] gap-2"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--text-main)]">{m.title}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{m.subtitle}</div>
                  <div className="text-[9.5px] text-[var(--text-muted)] font-medium pt-0.5">
                    {formatDateShort(m.date)}
                  </div>
                </div>
                <Badge variant="warning" size="sm" className="font-bold shrink-0">
                  {m.badge}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
