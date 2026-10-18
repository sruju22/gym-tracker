import React from 'react';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { calculateStreak, getWeeklyProgress } from '../../utils/streakUtils';
import { DayOfWeek } from '../../types';
import { getTodayDayOfWeek, formatDayName, parseLocalDate } from '../../utils/formatters';
import { Flame, Trophy, Calendar, Check, Coffee, Dumbbell, ChevronRight, Zap } from 'lucide-react';
import { Card } from '../ui/Card';

interface WeeklyProgressCardProps {
  onOpenEditPlan?: () => void;
}

export const WeeklyProgressCard: React.FC<WeeklyProgressCardProps> = ({ onOpenEditPlan }) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getHistory, getWeeklyPlan } = useWorkoutStore();
  const history = getHistory(userId);
  const weeklyPlan = getWeeklyPlan(userId);

  const streak = calculateStreak(history);
  const weekly = getWeeklyProgress(history, weeklyPlan);

  const today = getTodayDayOfWeek();
  const daysOrder: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const shortDayLabels: Record<DayOfWeek, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  // Compute the current week's time range
  const now = new Date();
  const dayIndex = now.getDay();
  const diffToMonday = (dayIndex + 6) % 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startOfWeek = monday.getTime();
  const endOfWeek = sunday.getTime();

  const completedDays = new Set<string>();
  const dayNameMapping: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  history.forEach((h) => {
    if (h.status !== 'completed') return;
    const d = parseLocalDate(h.completedAt || h.date);
    const time = d.getTime();
    if (time >= startOfWeek && time <= endOfWeek) {
      const dayKey = (h.dayOfWeek || '').trim().toLowerCase() || dayNameMapping[d.getDay()];
      if (dayKey) completedDays.add(dayKey);
    }
  });

  const todayIdx = daysOrder.indexOf(today);

  // Enlarged circular ring calculations
  const radius = 38;
  const stroke = 6.5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (weekly.percentage / 100) * circumference;

  return (
    <Card className="w-full p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 pb-1">
        <div className="flex items-center gap-2 text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-[var(--primary)]" />
          <span>WEEKLY PROGRESS & STREAK</span>
        </div>
        {onOpenEditPlan && (
          <button
            onClick={onOpenEditPlan}
            className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Edit Plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Prominent Hero Stats: Streak + Weekly Goal Completion */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
        {/* 1. Prominent Streak Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
            <Flame
              className={`w-4 h-4 ${
                streak.currentStreak > 0
                  ? 'text-amber-500 fill-amber-500 animate-pulse'
                  : 'text-[var(--text-muted)]'
              }`}
            />
            <span>CURRENT STREAK</span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight">
              {streak.currentStreak}
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[var(--text-secondary)] mt-0.5">
              Day Streak
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[var(--text-muted)] truncate">
            {streak.hasTrainedToday ? (
              <span className="text-emerald-400 font-bold">Trained today ✓</span>
            ) : streak.currentStreak > 0 ? (
              <span>Train today to extend</span>
            ) : (
              <span>Start your streak today</span>
            )}
          </div>
        </div>

        {/* 2. Prominent Weekly Goal & Circular Indicator */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 transition-colors">
          {/* Enlarged Circular Progress Ring */}
          <div className="relative flex-shrink-0 flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="text-[var(--bg-surface)]"
              />
              <circle
                stroke="var(--primary)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-black text-[var(--text-main)] leading-none">
                {weekly.percentage}%
              </span>
            </div>
          </div>

          {/* Goal Information */}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              WEEKLY GOAL
            </div>
            <div className="text-lg sm:text-xl font-black text-[var(--text-main)] leading-tight">
              {weekly.completedCount}{' '}
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                / {weekly.scheduledCount}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-[var(--primary)] mt-1 truncate">
              {weekly.completedCount >= weekly.scheduledCount
                ? 'Goal Achieved! 🎉'
                : `${weekly.scheduledCount - weekly.completedCount} left this week`}
            </div>
          </div>
        </div>
      </div>

      {/* Seven-Day Training Schedule with Expanded Breathing Room */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
            7-DAY TRAINING SCHEDULE
          </span>
          <span className="text-[11px] text-[var(--text-muted)] font-medium">
            {formatDayName(today)} (Today)
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {daysOrder.map((day, idx) => {
            const isToday = day === today;
            const isCompleted = completedDays.has(day);
            const config = weeklyPlan[day];
            const isRest = config?.isRest;
            const isFuture = idx > todayIdx;
            const isPastMissed = idx < todayIdx && !isCompleted && !isRest;

            // Short routine name
            const routineLabel = isRest
              ? 'Rest'
              : config?.name
              ? config.name.replace(/Workout|Routine/gi, '').trim().slice(0, 7)
              : 'Workout';

            return (
              <div
                key={day}
                className={`flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl border transition-all ${
                  isToday
                    ? 'bg-[var(--primary-subtle)] border-2 border-[var(--primary)] shadow-sm shadow-red-500/10'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isRest
                    ? 'bg-[var(--bg-card)]/40 border-[var(--border-subtle)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                }`}
              >
                {/* Day Header */}
                <span
                  className={`text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                    isToday
                      ? 'text-[var(--primary)] font-extrabold'
                      : isCompleted
                      ? 'text-emerald-400'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {shortDayLabels[day]}
                </span>

                {/* Status Icon / Badge */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center my-0.5 transition-transform ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isToday
                      ? 'bg-[var(--primary)] text-white font-black shadow-xs'
                      : isRest
                      ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                      : isFuture
                      ? 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                      : isPastMissed
                      ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                  }`}
                  title={`${formatDayName(day)}: ${config?.name || (isRest ? 'Rest Day' : 'Training Day')}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isRest ? (
                    <Coffee className="w-3.5 h-3.5 opacity-70" />
                  ) : isToday ? (
                    <Zap className="w-3.5 h-3.5 fill-white stroke-[2.5]" />
                  ) : (
                    <Dumbbell className="w-3.5 h-3.5 opacity-60" />
                  )}
                </div>

                {/* Subtitle / Focus Label */}
                <span
                  className={`text-[9px] font-bold mt-1.5 truncate max-w-full text-center ${
                    isToday
                      ? 'text-[var(--primary)] font-black'
                      : isCompleted
                      ? 'text-emerald-400'
                      : isRest
                      ? 'text-[var(--text-muted)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {routineLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balanced Bottom Training Stats */}
      <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-card)] px-3.5 py-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <div>
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">
                Weekly Volume
              </div>
              <div className="text-sm sm:text-base font-black text-[var(--text-main)]">
                {(weekly.totalVolume / 1000).toFixed(1)}k <span className="text-[11px] font-bold text-[var(--text-secondary)]">kg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] px-3.5 py-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <div>
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">
                Completed Sets
              </div>
              <div className="text-sm sm:text-base font-black text-[var(--text-main)]">
                {weekly.totalSets} <span className="text-[11px] font-bold text-[var(--text-secondary)]">sets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
