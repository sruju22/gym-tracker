import React from 'react';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { DayOfWeek } from '../../types';
import { getTodayDayOfWeek, formatDayName } from '../../utils/formatters';
import { Edit2 } from 'lucide-react';

interface WeeklyOverviewProps {
  onOpenEditPlan?: () => void;
}

export const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({ onOpenEditPlan }) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getWeeklyPlan, getHistory } = useWorkoutStore();
  const weeklyPlan = getWeeklyPlan(userId);
  const history = getHistory(userId);

  const today = getTodayDayOfWeek();

  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const completedDays = new Set(
    history
      .filter((h) => h.status === 'completed')
      .map((h) => h.dayOfWeek)
  );

  return (
    <Card className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-5 rounded-2xl border border-[#272B30] bg-[#14171A]">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
          WEEKLY SCHEDULE
        </h3>
        {onOpenEditPlan && (
          <button
            onClick={onOpenEditPlan}
            className="flex items-center gap-1 text-xs font-bold text-[#E11D48] hover:text-[#F43F5E] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Customize Plan</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-evenly divide-y divide-[#272B30] min-h-0">
        {days.map((day) => {
          const config = weeklyPlan[day];
          const isToday = day === today;
          const isCompleted = completedDays.has(day);

          return (
            <div
              key={day}
              className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors ${
                isToday ? 'bg-[#E11D48]/10 border border-[#E11D48]/30 text-[#F5F5F5] font-bold' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span
                  className={`text-sm sm:text-base ${
                    isCompleted
                      ? 'text-[#22C55E] font-extrabold' // Green reserved for SUCCESS/COMPLETED
                      : isToday
                      ? 'text-[#E11D48] font-bold'
                      : 'text-[#6B7280]'
                  }`}
                >
                  {isCompleted ? '✓' : isToday ? '●' : '○'}
                </span>
                <span className={`text-xs sm:text-sm capitalize ${isToday ? 'font-bold text-[#F5F5F5]' : 'text-[#9CA3AF] font-medium'}`}>
                  {formatDayName(day)}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-[#9CA3AF] font-medium">
                {config.isRest ? (
                  <span className="text-[#6B7280] font-normal">{config.name || 'Rest'}</span>
                ) : (
                  <span>{config.name || config.muscleGroups.map((m) => m.displayName).join(' + ')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
