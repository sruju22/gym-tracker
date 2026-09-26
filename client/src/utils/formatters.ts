import { DayOfWeek } from '../types';

export function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayIndex = new Date().getDay();
  return days[todayIndex];
}

export function formatDayName(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatVolume(volume: number): string {
  if (volume < 1000) {
    return `${Math.round(volume)}`;
  }
  const inK = volume / 1000;
  const formatted = parseFloat(inK.toFixed(2)).toString();
  return `${formatted}k`;
}
