import React from 'react';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { calculateStreak, getWeeklyProgress } from '../../utils/streakUtils';
import { Flame, CheckCircle2, Dumbbell, Trophy } from 'lucide-react';
import { Card } from '../ui/Card';

export const QuickStatsRow: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getHistory, getWeeklyPlan } = useWorkoutStore();
  const history = getHistory(userId);
  const weeklyPlan = getWeeklyPlan(userId);

  const streak = calculateStreak(history);
  const weekly = getWeeklyProgress(history, weeklyPlan);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
      {/* 1. Streak Stat */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center transition-colors">
        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          <Flame className={`w-3.5 h-3.5 ${streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500' : 'text-[var(--text-muted)]'}`} />
          <span>STREAK</span>
        </div>
        <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
          {streak.currentStreak} <span className="text-xs font-bold text-[var(--text-secondary)]">days</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
          {streak.hasTrainedToday ? 'Trained today ✓' : 'Keep it going!'}
        </div>
      </Card>

      {/* 2. Weekly Completion */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center transition-colors">
        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
          <span>THIS WEEK</span>
        </div>
        <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
          {weekly.completedCount} <span className="text-xs font-bold text-[var(--text-secondary)]">/ {weekly.scheduledCount}</span>
        </div>
        <div className="text-[10px] text-[var(--success)] font-bold mt-0.5">
          {weekly.percentage}% completed
        </div>
      </Card>

      {/* 3. Weekly Volume */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center transition-colors">
        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          <Trophy className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>VOLUME</span>
        </div>
        <div className="text-xl sm:text-2xl font-black text-[var(--primary)]">
          {(weekly.totalVolume / 1000).toFixed(1)}k <span className="text-xs font-bold text-[var(--text-secondary)]">kg</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
          Lifted this week
        </div>
      </Card>

      {/* 4. Weekly Sets */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center transition-colors">
        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          <Dumbbell className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span>TOTAL SETS</span>
        </div>
        <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
          {weekly.totalSets} <span className="text-xs font-bold text-[var(--text-secondary)]">sets</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
          Completed sets
        </div>
      </Card>
    </div>
  );
};
