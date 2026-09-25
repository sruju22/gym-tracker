import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { getTodayDayOfWeek, formatDayName } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const TodayCard: React.FC = () => {
  const navigate = useNavigate();
  const { weeklyPlan, activeSession, startTodayWorkout } = useWorkoutStore();
  const today = getTodayDayOfWeek();
  const todayConfig = weeklyPlan[today];

  const handleStart = () => {
    if (!activeSession) {
      startTodayWorkout();
    }
    navigate('/workout');
  };

  const isRest = todayConfig.isRest;

  return (
    <Card className="w-full border border-slate-800 bg-[#121827] p-5 sm:p-6 rounded-2xl shadow-sm text-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
          TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
        </span>
        {activeSession && (
          <span className="text-[10px] font-black text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-md border border-sky-800/60 uppercase tracking-wider">
            IN PROGRESS
          </span>
        )}
      </div>

      {isRest ? (
        <div className="py-4 text-center">
          <h2 className="text-xl font-black text-slate-100 mb-2">Rest & Recovery Day</h2>
          <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto leading-relaxed">
            Take time off to rebuild muscle tissue. Or launch a custom session.
          </p>
          <Button variant="secondary" size="md" onClick={handleStart} fullWidth>
            Start Optional Session
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 uppercase tracking-tight mb-3">
            {todayConfig.name || todayConfig.muscleGroups.map((mg) => mg.displayName).join(' + ')}
          </h2>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6 text-xs sm:text-sm text-slate-300 font-medium">
            {todayConfig.muscleGroups.map((mg, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-600 font-normal">·</span>}
                <span className="font-bold text-slate-200">{mg.displayName}</span>
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
