import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { getTodayDayOfWeek, formatDayName } from '../../utils/formatters';
import { DEFAULT_WORKOUT_PLAN } from '../../data/workoutPlan';
import { useNavigate } from 'react-router-dom';
import { Check, Edit3, Eye, Coffee } from 'lucide-react';
import { UserModal } from '../auth/UserModal';

export const TodayCard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const isGuest = !currentUser;
  const userId = currentUser?.id || 'guest';
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const {
    getWeeklyPlan,
    getActiveSession,
    getTodayCompletedWorkout,
    startTodayWorkout,
    startEditingWorkout,
    startCustomWorkout,
  } = useWorkoutStore();

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [, setTick] = useState(0);

  // Periodic and focus-based tick to ensure date boundaries update automatically
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

  const weeklyPlan = getWeeklyPlan(userId);
  const activeSession = getActiveSession(userId);
  // Security guard: Guests NEVER have a completed workout record
  const todayCompleted = isGuest ? null : getTodayCompletedWorkout(userId);

  const today = getTodayDayOfWeek();
  const todayConfig = (weeklyPlan && weeklyPlan[today]) || DEFAULT_WORKOUT_PLAN[today];

  const handleStart = () => {
    if (!activeSession) {
      startTodayWorkout(userId);
    }
    navigate('/workout');
  };

  const handleStartOptional = () => {
    startCustomWorkout(userId, ['chest']);
    navigate('/workout');
  };

  const formatCompletionTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // 1. ACTIVE SESSION IN PROGRESS
  if (activeSession) {
    return (
      <Card className="w-full border border-[#E11D48]/40 bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
            TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
          </span>
          <span className="text-[10px] font-black text-[#E11D48] bg-[#E11D48]/15 px-2.5 py-1 rounded-md border border-[#E11D48]/40 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-pulse" />
            IN PROGRESS
          </span>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] uppercase tracking-tight mb-1">
            {activeSession.workoutName || todayConfig.name}
          </h2>
          <div className="text-xs font-semibold text-[#9CA3AF]">
            Workout currently active · {activeSession.exercises.length} exercise{activeSession.exercises.length === 1 ? '' : 's'} added
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/workout')}
          className="font-extrabold py-3.5 sm:py-4 text-sm sm:text-base rounded-xl min-h-[48px] sm:min-h-[52px]"
        >
          <span>CONTINUE WORKOUT</span>
        </Button>
      </Card>
    );
  }

  // 2. UNIQUE STATE: Today's Workout has been COMPLETED and SAVED
  if (todayCompleted) {
    const finishedTime = formatCompletionTime(todayCompleted.completedAt || todayCompleted.date);

    return (
      <>
        <Card className="w-full border border-[#22C55E]/40 bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
              TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
            </span>
            <span className="text-[10px] font-black text-[#22C55E] bg-[#22C55E]/15 px-2.5 py-1 rounded-md border border-[#22C55E]/40 uppercase tracking-wider flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              COMPLETED
            </span>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] uppercase tracking-tight mb-1 flex items-center gap-2">
              <span>{todayCompleted.workoutName || todayConfig.name}</span>
            </h2>
            <div className="text-xs font-bold text-[#22C55E] flex items-center gap-1.5">
              <span>You're done for today!</span>
              {finishedTime && (
                <span className="text-[#9CA3AF] font-medium">· Finished at {finishedTime}</span>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2 bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 text-center mb-5">
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Exercises</div>
              <div className="text-base sm:text-lg font-black text-[#F5F5F5]">
                {todayCompleted.exercises.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Sets Done</div>
              <div className="text-base sm:text-lg font-black text-[#F5F5F5]">
                {todayCompleted.totalSets}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Total Volume</div>
              <div className="text-base sm:text-lg font-black text-[#E11D48]">
                {todayCompleted.totalVolume} kg
              </div>
            </div>
          </div>

          {/* Actions: Edit Workout & Review */}
          <div className="flex items-center gap-2.5 mb-3">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                startEditingWorkout(userId, todayCompleted);
                navigate('/workout');
              }}
              className="font-bold flex items-center justify-center gap-1.5 min-h-[46px] border-[#272B30] hover:border-[#E11D48]/60 hover:text-[#F5F5F5]"
            >
              <Edit3 className="w-4 h-4 text-[#E11D48]" />
              <span>Edit Workout</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsReviewOpen(true)}
              className="font-bold flex items-center justify-center gap-1.5 min-h-[46px] border-[#272B30] hover:border-[#272B30] hover:text-[#F5F5F5]"
            >
              <Eye className="w-4 h-4 text-[#9CA3AF]" />
              <span>Review Details</span>
            </Button>
          </div>

          {/* Optional Extra Session Link */}
          <div className="text-center pt-2.5 border-t border-[#272B30]/60">
            <button
              onClick={handleStartOptional}
              className="text-[11px] font-bold text-[#9CA3AF] hover:text-[#E11D48] transition-colors cursor-pointer"
            >
              + Start another workout session today
            </button>
          </div>
        </Card>

        {/* Review Workout Modal */}
        <Modal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          title={`Today's Workout — ${(todayCompleted.workoutName || todayConfig.name).toUpperCase()}`}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 text-center">
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Exercises</div>
                <div className="text-sm font-black text-[#F5F5F5]">{todayCompleted.exercises.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Total Sets</div>
                <div className="text-sm font-black text-[#F5F5F5]">{todayCompleted.totalSets}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Volume</div>
                <div className="text-sm font-black text-[#E11D48]">{todayCompleted.totalVolume} kg</div>
              </div>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {todayCompleted.exercises.map((ex, idx) => (
                <div key={ex.id || idx} className="bg-[#1B1F23] border border-[#272B30] rounded-xl p-3">
                  <div className="text-xs font-bold text-[#F5F5F5] mb-1.5">{ex.exercise.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {ex.sets.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className={`border px-2 py-0.5 rounded text-[11px] font-semibold ${
                          s.completed
                            ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]'
                            : 'bg-[#14171A] border-[#272B30] text-[#9CA3AF]'
                        }`}
                      >
                        Set {s.setNumber}: {s.weight}kg × {s.reps}
                      </span>
                    ))}
                  </div>
                  {ex.notes && (
                    <div className="mt-1.5 text-[11px] text-amber-300 bg-amber-500/15 p-1.5 rounded border border-amber-500/40 italic">
                      "{ex.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#272B30]">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  setIsReviewOpen(false);
                  startEditingWorkout(userId, todayCompleted);
                  navigate('/workout');
                }}
                className="font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Workout</span>
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // 3. DEDICATED REST DAY STATE
  if (todayConfig.isRest) {
    return (
      <Card className="w-full border border-[#272B30] bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
            TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
          </span>
          <span className="text-[10px] font-black text-[#9CA3AF] bg-[#1F2429] px-2.5 py-1 rounded-md border border-[#272B30] uppercase tracking-wider">
            REST DAY
          </span>
        </div>

        <div className="py-5 sm:py-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1F2429] border border-[#272B30] flex items-center justify-center text-[#E11D48]">
            <Coffee className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] uppercase tracking-tight mb-2">
            REST DAY
          </h2>
          <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-sm mx-auto leading-relaxed font-medium">
            Recovery day. Let your muscles recover and get ready for your next session.
          </p>
        </div>

        <div className="text-center pt-3 border-t border-[#272B30]/60">
          <button
            onClick={handleStartOptional}
            className="text-xs font-bold text-[#9CA3AF] hover:text-[#E11D48] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>+ Start an optional workout</span>
          </button>
        </div>
      </Card>
    );
  }

  // 4. NORMAL SCHEDULED WORKOUT DAY — NOT STARTED
  return (
    <Card className="w-full border border-[#272B30] bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
          TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
        </span>
      </div>

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
          <span>START WORKOUT</span>
        </Button>

        {isGuest && (
          <div className="mt-3.5 pt-3 border-t border-[#272B30]/60 flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <span>Guest session · Workouts won't sync to cloud</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="font-bold text-[#E11D48] hover:text-[#F43F5E] transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      <UserModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </Card>
  );
};
