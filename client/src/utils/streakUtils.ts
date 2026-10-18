import { WorkoutSession, WeeklySchedule, DayOfWeek } from '../types';
import { parseLocalDate } from './formatters';

export interface StreakInfo {
  currentStreak: number;
  hasTrainedToday: boolean;
  longestStreak: number;
}

export interface WeeklyProgressInfo {
  completedCount: number;
  scheduledCount: number;
  percentage: number;
  totalVolume: number;
  totalSets: number;
}

export function calculateStreak(history: WorkoutSession[]): StreakInfo {
  const completed = history.filter((h) => h.status === 'completed');
  if (completed.length === 0) {
    return { currentStreak: 0, hasTrainedToday: false, longestStreak: 0 };
  }

  // Get unique sorted dates (descending) in YYYY-MM-DD
  const dateSet = new Set<string>();
  completed.forEach((h) => {
    const d = parseLocalDate(h.completedAt || h.date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateSet.add(`${year}-${month}-${day}`);
    }
  });

  const sortedDates = Array.from(dateSet).sort().reverse();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, hasTrainedToday: false, longestStreak: 0 };
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const hasTrainedToday = sortedDates.includes(todayStr);
  const startsFromTodayOrYesterday = sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr;

  let currentStreak = 0;
  if (startsFromTodayOrYesterday) {
    let checkDate = sortedDates[0] === todayStr ? now : yesterday;
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (sortedDates.includes(expectedStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest streak across all dates
  let longestStreak = currentStreak;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const curr = parseLocalDate(dateStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((prevDate.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = curr;
  }

  return {
    currentStreak,
    hasTrainedToday,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}

export function getWeeklyProgress(
  history: WorkoutSession[],
  weeklyPlan: WeeklySchedule
): WeeklyProgressInfo {
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (dayIndex + 6) % 7;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startOfWeek = monday.getTime();
  const endOfWeek = sunday.getTime();

  // Scheduled count: non-rest days
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const scheduledCount = days.filter((d) => weeklyPlan[d] && !weeklyPlan[d].isRest).length || 4;

  let completedCount = 0;
  let totalVolume = 0;
  let totalSets = 0;

  const countedDays = new Set<string>();

  history.forEach((h) => {
    if (h.status !== 'completed') return;
    const d = parseLocalDate(h.completedAt || h.date);
    const t = d.getTime();
    if (t >= startOfWeek && t <= endOfWeek) {
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!countedDays.has(dayKey)) {
        countedDays.add(dayKey);
        completedCount++;
      }
      totalVolume += h.totalVolume || 0;
      totalSets += h.totalSets || 0;
    }
  });

  const percentage = Math.min(100, Math.round((completedCount / scheduledCount) * 100));

  return {
    completedCount,
    scheduledCount,
    percentage,
    totalVolume,
    totalSets,
  };
}
