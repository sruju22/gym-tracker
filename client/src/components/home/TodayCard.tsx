import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { getTodayDayOfWeek, formatDayName } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const TodayCard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getWeeklyPlan, getActiveSession, startTodayWorkout } = useWorkoutStore();

  const weeklyPlan = getWeeklyPlan(userId);
  const activeSession = getActiveSession(userId);

  const today = getTodayDayOfWeek();
  const todayConfig = weeklyPlan[today];

  const handleStart = () => {
    if (!activeSession) {
      startTodayWorkout(userId);
    }
    navigate('/workout');
  };

  const isRest = todayConfig.isRest;

  return (
    <Card className="w-full border border-[#272B30] bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
          TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
        </span>
        {activeSession && (
          <span className="text-[10px] font-black text-[#E11D48] bg-[#E11D48]/15 px-2.5 py-1 rounded-md border border-[#E11D48]/40 uppercase tracking-wider">
            IN PROGRESS
          </span>
        )}
      </div>

      {isRest ? (
        <div className="py-4 text-center">
          <h2 className="text-xl font-black text-[#F5F5F5] mb-2">Rest & Recovery Day</h2>
          <p className="text-xs text-[#9CA3AF] mb-5 max-w-xs mx-auto leading-relaxed">
            Take time off to rebuild muscle tissue. Or launch a custom session.
          </p>
          <Button variant="secondary" size="md" onClick={handleStart} fullWidth>
            Start Optional Session
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] uppercase tracking-tight mb-3">
            {todayConfig.name || todayConfig.muscleGroups.map((mg) => mg.displayName).join(' + ')}
          </h2>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6 text-xs sm:text-sm text-[#9CA3AF] font-medium">
            {todayConfig.muscleGroups.map((mg, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#6B7280] font-normal">·</span>}
                <span className="font-bold text-[#F5F5F5]">{mg.displayName}</span>
              </React.Fragment>
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleStart}
            className="font-extrabold py-3.5 sm:py-4 text-sm sm:text-base rounded-xl min-h-[48px] sm:min-h-[52px]"
          >
            <span>{activeSession ? 'CONTINUE WORKOUT' : 'START WORKOUT'}</span>
          </Button>
        </div>
      )}
    </Card>
  );
};
