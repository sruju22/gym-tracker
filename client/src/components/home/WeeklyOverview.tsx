import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { DayOfWeek } from '../../types';
import { getTodayDayOfWeek, formatDayName, parseLocalDate } from '../../utils/formatters';
import { Edit2, Calendar } from 'lucide-react';

interface WeeklyOverviewProps {
  onOpenEditPlan?: () => void;
}

export const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({ onOpenEditPlan }) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getWeeklyPlan, getHistory } = useWorkoutStore();
  const weeklyPlan = getWeeklyPlan(userId);
  const history = currentUser ? getHistory(userId) : [];

  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTick((t) => t + 1);
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  const today = getTodayDayOfWeek();
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const getStartAndEndOfWeek = () => {
    const now = new Date();
    const dayIndex = now.getDay();
    const diffToMonday = (dayIndex + 6) % 7;

    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { startOfWeek: monday.getTime(), endOfWeek: sunday.getTime() };
  };

  const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const completedDays = new Set<string>();

  history.forEach((h) => {
    if (h.status !== 'completed') return;
    const d = parseLocalDate(h.completedAt || h.date);
    const hTime = d.getTime();
    if (hTime >= startOfWeek && hTime <= endOfWeek) {
      const day = (h.dayOfWeek || '').trim().toLowerCase() || dayNames[d.getDay()];
      if (day) completedDays.add(day);
    }
  });

  return (
    <Card className="w-full p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
          <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>WEEKLY TRAINING SCHEDULE</span>
        </div>
        {onOpenEditPlan && (
          <button
            onClick={onOpenEditPlan}
            className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Customize Plan</span>
          </button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
        {days.map((day) => {
          const config = weeklyPlan[day];
          const isToday = day === today;
          const isCompleted = completedDays.has(day);

          return (
            <div
              key={day}
              className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors ${
                isToday
                  ? 'bg-[var(--primary-subtle)] border border-[var(--primary-border)] font-bold'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isCompleted
                      ? 'bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success-border)] font-black'
                      : isToday
                      ? 'bg-[var(--primary)] text-white font-black'
                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {isCompleted ? '✓' : isToday ? '•' : ''}
                </span>
                <span
                  className={`text-xs sm:text-sm capitalize truncate ${
                    isToday ? 'font-black text-[var(--text-main)]' : 'text-[var(--text-secondary)] font-medium'
                  }`}
                >
                  {formatDayName(day)}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium text-right truncate ml-2">
                {config.isRest ? (
                  <span className="text-[var(--text-muted)] font-normal">{config.name || 'Rest'}</span>
                ) : (
                  <span className={isToday ? 'font-bold text-[var(--text-main)]' : ''}>
                    {config.name || config.muscleGroups.map((m) => m.displayName).join(' + ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
