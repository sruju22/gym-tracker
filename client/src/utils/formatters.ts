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

export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  }
  return new Date(dateInput);
}

export function isSameLocalDay(
  dateA?: string | Date | null,
  dateB: string | Date = new Date()
): boolean {
  if (!dateA || !dateB) return false;
  const d1 = parseLocalDate(dateA);
  const d2 = parseLocalDate(dateB);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
