import React from 'react';
import { DayOfWeek, WeeklySchedule, WorkoutSession } from '../../types';
import { getTodayDayOfWeek, formatDayName, parseLocalDate } from '../../utils/formatters';

interface WeekCalendarStripProps {
  selectedDay: DayOfWeek;
  selectedDate: Date;
  onSelectDay: (day: DayOfWeek, date: Date) => void;
  weeklyPlan: WeeklySchedule;
  history: WorkoutSession[];
}

interface DayItem {
  day: DayOfWeek;
  date: Date;
  shortName: string;
  dateNumber: number;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isFuture: boolean;
  isCompleted: boolean;
  isRest: boolean;
}

export const WeekCalendarStrip: React.FC<WeekCalendarStripProps> = ({
  selectedDay: _selectedDay,
  selectedDate,
  onSelectDay,
  weeklyPlan,
  history,
}) => {
  const today = getTodayDayOfWeek();

  // Compute the current week's dates starting from Monday in local time
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (dayIndex + 6) % 7;

  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);

  const startOfWeek = monday.getTime();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const endOfWeek = sunday.getTime();

  // Map completed days from history for this week
  const completedDateKeys = new Set<string>();

  history.forEach((h) => {
    if (h.status !== 'completed') return;
    const d = parseLocalDate(h.completedAt || h.date);
    const time = d.getTime();
    if (time >= startOfWeek && time <= endOfWeek) {
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      completedDateKeys.add(dateKey);
    }
  });

  const daysOrder: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const shortNames: Record<DayOfWeek, string> = {
    monday: 'MON',
    tuesday: 'TUE',
    wednesday: 'WED',
    thursday: 'THU',
    friday: 'FRI',
    saturday: 'SAT',
    sunday: 'SUN',
  };

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const selectedMidnight = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  ).getTime();

  const dayItems: DayItem[] = daysOrder.map((day, idx) => {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const itemMidnight = dayDate.getTime();

    const isToday = itemMidnight === todayMidnight;
    const isSelected = itemMidnight === selectedMidnight;
    const isPast = itemMidnight < todayMidnight;
    const isFuture = itemMidnight > todayMidnight;

    const dateKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
    const isCompleted = completedDateKeys.has(dateKey);
    const planConfig = weeklyPlan[day];
    const isRest = planConfig?.isRest ?? false;

    return {
      day,
      date: dayDate,
      shortName: shortNames[day],
      dateNumber: dayDate.getDate(),
      isToday,
      isSelected,
      isPast,
      isFuture,
      isCompleted,
      isRest,
    };
  });

  const isViewingToday = selectedMidnight === todayMidnight;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
          SCHEDULE · THIS WEEK
        </span>
        {!isViewingToday && (
          <button
            onClick={() => onSelectDay(today, new Date())}
            className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Jump to Today
          </button>
        )}
      </div>

      {/* Horizontal Swipeable Strip */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 w-full justify-between">
        {dayItems.map((item) => {
          const isSelected = item.isSelected;
          const isToday = item.isToday;

          return (
            <button
              key={item.day}
              onClick={() => onSelectDay(item.day, item.date)}
              className={`flex-1 min-w-[42px] max-w-[56px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                isSelected
                  ? 'bg-[var(--primary)] text-white shadow-md shadow-red-500/25 font-bold scale-[1.03]'
                  : isToday
                  ? 'bg-[var(--bg-surface)] text-[var(--text-main)] border-2 border-[var(--primary)] shadow-xs'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--text-main)]'
              }`}
              title={`${formatDayName(item.day)} ${item.dateNumber}`}
            >
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isSelected
                    ? 'text-white/90'
                    : isToday
                    ? 'text-[var(--primary)] font-black'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {item.shortName}
              </span>

              <span
                className={`text-sm sm:text-base font-black my-0.5 ${
                  isSelected
                    ? 'text-white'
                    : isToday
                    ? 'text-[var(--text-main)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {item.dateNumber}
              </span>

              {/* Status Indicator Dot */}
              <div className="h-2 flex items-center justify-center">
                {item.isCompleted ? (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-emerald-400'
                    }`}
                  />
                ) : isToday ? (
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isSelected ? 'bg-white' : 'bg-[var(--primary)]'
                    }`}
                  />
                ) : item.isRest ? (
                  <span
                    className={`w-1 h-0.5 rounded-full ${
                      isSelected ? 'bg-white/60' : 'bg-[var(--text-muted)]/50'
                    }`}
                  />
                ) : item.isPast ? (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-white/50' : 'bg-amber-500/50'
                    }`}
                    title="Workout not completed"
                  />
                ) : (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-white/70' : 'bg-[var(--text-muted)]/40'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
