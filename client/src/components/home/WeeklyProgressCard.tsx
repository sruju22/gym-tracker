import React from 'react';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { calculateStreak, getWeeklyProgress } from '../../utils/streakUtils';
import { Flame, Trophy, Calendar, Dumbbell, ChevronRight, Target, Award } from 'lucide-react';
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

  // Circular progress ring calculations
  const radius = 40;
  const stroke = 7;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (weekly.percentage / 100) * circumference;

  const remainingWorkouts = weekly.scheduledCount - weekly.completedCount;

  return (
    <Card className="w-full p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all shadow-sm flex flex-col justify-between">
      {/* 1. Header with Edit Plan Action */}
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

      {/* 2. Expanded Hero Cards: Current Streak + Weekly Goal with Circular Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-4">
        {/* Card A: Current Streak */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
            <Flame
              className={`w-4 h-4 ${
                streak.currentStreak > 0
                  ? 'text-amber-500 fill-amber-500 animate-pulse'
                  : 'text-[var(--text-muted)]'
              }`}
            />
            <span>CURRENT STREAK</span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tight leading-none">
              {streak.currentStreak}
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[var(--text-secondary)] mt-1">
              Day Streak
            </div>
          </div>

          <div className="text-xs font-semibold pt-1 border-t border-[var(--border-subtle)]/60">
            {streak.hasTrainedToday ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>Trained today</span>
                <span>✓</span>
              </span>
            ) : streak.currentStreak > 0 ? (
              <span className="text-[var(--text-secondary)]">Train today to extend</span>
            ) : (
              <span className="text-[var(--text-muted)]">Start your streak today</span>
            )}
          </div>
        </div>

        {/* Card B: Weekly Goal & Circular Indicator */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
            <Target className="w-4 h-4 text-[var(--primary)]" />
            <span>WEEKLY GOAL</span>
          </div>

          <div className="flex items-center gap-3.5 my-2.5">
            {/* Circular Progress Ring */}
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
                <span className="text-sm sm:text-base font-black text-[var(--text-main)] leading-none">
                  {weekly.percentage}%
                </span>
              </div>
            </div>

            {/* Workouts count */}
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)] leading-tight">
                {weekly.completedCount}{' '}
                <span className="text-sm font-bold text-[var(--text-secondary)]">
                  / {weekly.scheduledCount}
                </span>
              </div>
              <div className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                Workouts Completed
              </div>
            </div>
          </div>

          {/* Full Remaining-Workouts Message: Never Truncated with Ellipses */}
          <div className="text-xs font-semibold pt-1 border-t border-[var(--border-subtle)]/60">
            {weekly.completedCount >= weekly.scheduledCount ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>Weekly Goal Achieved! 🎉</span>
              </span>
            ) : (
              <span className="text-[var(--primary)] font-bold">
                {remainingWorkouts === 1
                  ? '1 workout remaining this week'
                  : `${remainingWorkouts} workouts remaining this week`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Rebalanced Volume & Sets Training Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-card)] px-4 py-3 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                Weekly Volume
              </div>
              <div className="text-sm sm:text-base font-black text-[var(--text-main)] truncate mt-0.5">
                {(weekly.totalVolume / 1000).toFixed(1)}k{' '}
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">kg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] px-4 py-3 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                Completed Sets
              </div>
              <div className="text-sm sm:text-base font-black text-[var(--text-main)] truncate mt-0.5">
                {weekly.totalSets}{' '}
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">sets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
