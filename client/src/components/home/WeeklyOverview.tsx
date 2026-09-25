import React from 'react';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { DayOfWeek } from '../../types';
import { getTodayDayOfWeek, formatDayName } from '../../utils/formatters';

export const WeeklyOverview: React.FC = () => {
  const { weeklyPlan, history } = useWorkoutStore();
  const today = getTodayDayOfWeek();

  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const completedDays = new Set(
    history
      .filter((h) => h.status === 'completed')
      .map((h) => h.dayOfWeek)
  );

  return (
    <Card className="w-full flex-1 flex flex-col min-h-0 p-4 sm:p-5 rounded-2xl border border-slate-800 bg-[#121827]">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
          WEEKLY SCHEDULE
        </h3>
      </div>

      <div className="flex-1 flex flex-col justify-evenly divide-y divide-slate-800/80 min-h-0">
        {days.map((day) => {
          const config = weeklyPlan[day];
          const isToday = day === today;
          const isCompleted = completedDays.has(day);

          return (
            <div
              key={day}
              className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors ${
                isToday ? 'bg-sky-950/40 border border-sky-800/40 text-slate-100 font-bold' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className={`text-sm sm:text-base ${isCompleted ? 'text-sky-400 font-bold' : isToday ? 'text-sky-400 font-bold' : 'text-slate-600'}`}>
                  {isCompleted ? '✓' : isToday ? '●' : '○'}
                </span>
                <span className={`text-xs sm:text-sm capitalize ${isToday ? 'font-bold text-slate-100' : 'text-slate-300 font-medium'}`}>
                  {formatDayName(day)}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                {config.isRest ? (
                  <span className="text-slate-500 font-normal">{config.name || 'Rest'}</span>
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
