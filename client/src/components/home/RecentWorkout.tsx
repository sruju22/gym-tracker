import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { formatDateShort, formatDayName } from '../../utils/formatters';
import { History, Dumbbell, ChevronRight } from 'lucide-react';

export const RecentWorkout: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getHistory } = useWorkoutStore();
  const history = getHistory(userId).filter((h) => h.status === 'completed');
  const recentWorkouts = history.slice(0, 3);

  return (
    <Card className="w-full p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>RECENT ACTIVITY</span>
        </div>
        {recentWorkouts.length > 0 && (
          <button
            onClick={() => navigate('/history')}
            className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {recentWorkouts.length === 0 ? (
        // Meaningful Clean Empty State (No fake data or fake stats)
        <div className="py-6 px-4 text-center rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)]">
          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2.5">
            <Dumbbell className="w-5 h-5 stroke-[1.8]" />
          </div>
          <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider mb-1">
            No Logged Workouts Yet
          </h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Complete your first training session to view your activity feed, total volume, and personal records here.
          </p>
        </div>
      ) : (
        // Compact List of Recent Workouts
        <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
          {recentWorkouts.map((workout) => (
            <div
              key={workout.id}
              onClick={() => navigate('/history')}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group cursor-pointer hover:bg-[var(--bg-card)]/40 px-2 -mx-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-[var(--text-main)] uppercase tracking-tight truncate group-hover:text-[var(--primary)] transition-colors">
                    {workout.workoutName || (workout.muscleGroups && workout.muscleGroups.join(' + ')) || 'Workout'}
                  </h4>
                  <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">
                    {formatDateShort(workout.date)} · <span className="capitalize">{formatDayName(workout.dayOfWeek)}</span> · {workout.exercises.length} ex ({workout.totalSets} sets)
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <div className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                    {workout.totalVolume ? workout.totalVolume.toLocaleString() : 0} <span className="text-[10px] text-[var(--text-secondary)] font-bold">kg</span>
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] uppercase font-extrabold">Volume</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
