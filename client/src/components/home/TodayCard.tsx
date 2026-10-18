import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { DayOfWeek, WorkoutSession } from '../../types';
import { getTodayDayOfWeek, formatDayName, parseLocalDate } from '../../utils/formatters';
import { DEFAULT_WORKOUT_PLAN } from '../../data/workoutPlan';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Edit3,
  Eye,
  Coffee,
  Play,
  Dumbbell,
  Clock,
  Flame,
  Sparkles,
  Calendar,
  AlertCircle,
  History,
  BookOpen,
  Plus,
} from 'lucide-react';

interface TodayCardProps {
  selectedDay?: DayOfWeek;
  selectedDate?: Date;
  onJumpToToday?: () => void;
  onOpenEditPlan?: () => void;
}

export const TodayCard: React.FC<TodayCardProps> = ({
  selectedDay,
  selectedDate,
  onJumpToToday,
  onOpenEditPlan,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const isGuest = !currentUser;
  const userId = currentUser?.id || 'guest';

  const {
    getWeeklyPlan,
    getActiveSession,
    getTodayCompletedWorkout,
    getHistory,
    getExercises,
    startTodayWorkout,
    startScheduledWorkout,
    startEditingWorkout,
    startCustomWorkout,
  } = useWorkoutStore();

  const [selectedReviewSession, setSelectedReviewSession] = useState<WorkoutSession | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [, setTick] = useState(0);

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

  // System's actual current date (never altered by calendar navigation)
  const now = new Date();
  const today = getTodayDayOfWeek();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Selected calendar date (strictly independent from actual today)
  const targetDate = selectedDate ? new Date(selectedDate.getTime()) : now;
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  const isPast = targetMidnight < todayMidnight;
  const isToday = targetMidnight === todayMidnight;
  const isFuture = targetMidnight > todayMidnight;

  const activeDay = selectedDay || today;

  const weeklyPlan = getWeeklyPlan(userId);
  const activeSession = getActiveSession(userId);
  const todayCompleted = isGuest ? null : getTodayCompletedWorkout(userId);
  const history = getHistory(userId);
  const allExercises = getExercises(userId);

  const targetConfig = (weeklyPlan && weeklyPlan[activeDay]) || DEFAULT_WORKOUT_PLAN[activeDay];

  // Match all historical completed sessions for the selected target date using local calendar date
  const sessionsForDate = useMemo(() => {
    return history.filter((h) => {
      if (h.status !== 'completed') return false;
      const d = parseLocalDate(h.completedAt || h.date);
      if (isNaN(d.getTime())) return false;
      const sMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return sMidnight === targetMidnight;
    });
  }, [history, targetMidnight]);

  // Recommended exercises for future workout preview
  const previewExercises = useMemo(() => {
    if (!targetConfig || targetConfig.isRest) return [];
    const targetMuscleNames = new Set(targetConfig.muscleGroups.map((m) => m.name.toLowerCase()));
    const matched = allExercises.filter((ex) => targetMuscleNames.has(ex.primaryMuscle.toLowerCase()));
    return matched.slice(0, 6);
  }, [targetConfig, allExercises]);

  const handleStartToday = () => {
    if (!activeSession) {
      startTodayWorkout(userId);
    }
    navigate('/workout');
  };

  const handleStartScheduled = (day: DayOfWeek) => {
    if (!activeSession) {
      if (day === today) {
        startTodayWorkout(userId);
      } else {
        startScheduledWorkout(userId, day);
      }
    }
    navigate('/workout');
  };

  const handleStartAdditional = () => {
    startCustomWorkout(userId, targetConfig.muscleGroups.map((m) => m.name));
    navigate('/workout');
  };

  const handleStartOptional = () => {
    startCustomWorkout(userId, ['chest', 'triceps']);
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

  const formattedTargetDate = targetDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // ==========================================
  // STATE 1: TODAY'S WORKOUT IN PROGRESS
  // ==========================================
  if (isToday && activeSession) {
    return (
      <Card className="w-full relative overflow-hidden border border-[var(--primary-border)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl shadow-lg shadow-red-500/5 text-[var(--text-main)] transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[var(--primary)]" />
            TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
          </span>
          <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary-subtle)] px-2.5 py-1 rounded-full border border-[var(--primary-border)] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            IN PROGRESS
          </span>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
            {activeSession.workoutName || targetConfig.name}
          </h2>
          <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
            <span>{activeSession.exercises.length} exercise{activeSession.exercises.length === 1 ? '' : 's'} added</span>
            <span>·</span>
            <span>Session active now</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/workout')}
          className="w-full h-13 sm:h-14 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
        >
          <Play className="w-4 h-4 fill-white stroke-[2.5]" />
          <span>CONTINUE WORKOUT</span>
        </button>
      </Card>
    );
  }

  // ==========================================
  // STATE 2: TODAY'S WORKOUT COMPLETED
  // ==========================================
  if (isToday && (todayCompleted || sessionsForDate.length > 0)) {
    const displaySessions = sessionsForDate.length > 0 ? sessionsForDate : (todayCompleted ? [todayCompleted] : []);

    return (
      <>
        <div className="space-y-3 w-full">
          <Card className="w-full relative overflow-hidden border border-emerald-500/30 bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl shadow-lg shadow-emerald-500/5 text-[var(--text-main)] transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                TODAY'S WORKOUT · {formatDayName(today).toUpperCase()}
              </span>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                {displaySessions.length > 1 ? `${displaySessions.length} SESSIONS COMPLETED` : 'COMPLETED'}
              </span>
            </div>

            {displaySessions.map((sessionRecord, idx) => {
              const finishedTime = formatCompletionTime(sessionRecord.completedAt || sessionRecord.date);

              return (
                <div
                  key={sessionRecord.id || idx}
                  className={`py-3 ${idx > 0 ? 'border-t border-[var(--border-subtle)] mt-3 pt-4' : ''}`}
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">
                        {sessionRecord.workoutName || targetConfig.name}
                      </h2>
                      {finishedTime && (
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                          Finished at {finishedTime}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>Completed today ✓</span>
                    </div>
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 text-center mb-3">
                    <div>
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Exercises</div>
                      <div className="text-base sm:text-lg font-black text-[var(--text-main)] mt-0.5">
                        {sessionRecord.exercises.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Sets</div>
                      <div className="text-base sm:text-lg font-black text-[var(--text-main)] mt-0.5">
                        {sessionRecord.totalSets}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Volume</div>
                      <div className="text-base sm:text-lg font-black text-[var(--primary)] mt-0.5">
                        {sessionRecord.totalVolume.toLocaleString()} <span className="text-[10px] font-bold">kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: View Workout & Edit Workout */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedReviewSession(sessionRecord)}
                      className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Workout</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        startEditingWorkout(userId, sessionRecord);
                        navigate('/workout');
                      }}
                      className="gap-2 py-3 rounded-xl font-black text-xs uppercase text-[var(--primary)] border-[var(--primary-border)] hover:bg-[var(--primary-subtle)]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Workout</span>
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Deliberate additional session link (not the primary or default action) */}
            <div className="pt-3 border-t border-[var(--border-subtle)] text-center">
              <button
                onClick={handleStartAdditional}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start an Additional Workout</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Modal for Reviewing Session Breakdown */}
        {selectedReviewSession && (
          <Modal
            isOpen={Boolean(selectedReviewSession)}
            onClose={() => setSelectedReviewSession(null)}
            title={selectedReviewSession.workoutName || 'Workout Details'}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pb-3 border-b border-[var(--border-subtle)]">
                <span>{new Date(selectedReviewSession.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                <span>
                  {formatCompletionTime(selectedReviewSession.completedAt || selectedReviewSession.date)}
                </span>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {selectedReviewSession.exercises.map((ex, idx) => (
                  <div key={ex.id || idx} className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-[var(--text-main)] uppercase">{ex.exercise?.name || 'Exercise'}</span>
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">{ex.sets.length} sets</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
                      {ex.sets.map((s, sIdx) => (
                        <div key={sIdx} className="flex justify-between text-[11px]">
                          <span>Set {s.setNumber}:</span>
                          <span className="font-semibold text-[var(--text-main)]">
                            {s.weight} kg × {s.reps} reps {s.completed ? '✓' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="secondary" fullWidth onClick={() => setSelectedReviewSession(null)}>
                Close
              </Button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  // ==========================================
  // STATE 3: PAST DAY SELECTION
  // (Never display a Start Workout action!)
  // ==========================================
  if (isPast) {
    // 3A. Past day HAS completed session(s)
    if (sessionsForDate.length > 0) {
      return (
        <>
          <div className="space-y-3 w-full">
            <Card className="w-full relative overflow-hidden border border-emerald-500/30 bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl shadow-sm text-[var(--text-main)] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  HISTORICAL WORKOUT{sessionsForDate.length > 1 ? 'S' : ''} · {formattedTargetDate.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  {onJumpToToday && (
                    <button
                      onClick={onJumpToToday}
                      className="text-[10px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                    >
                      Back to Today
                    </button>
                  )}
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    {sessionsForDate.length > 1 ? `${sessionsForDate.length} SESSIONS` : 'COMPLETED'}
                  </span>
                </div>
              </div>

              {sessionsForDate.map((pastRecord, idx) => {
                const finishedTime = formatCompletionTime(pastRecord.completedAt || pastRecord.date);

                return (
                  <div
                    key={pastRecord.id || idx}
                    className={`py-3 ${idx > 0 ? 'border-t border-[var(--border-subtle)] mt-3 pt-4' : ''}`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">
                          {pastRecord.workoutName || targetConfig.name}
                        </h2>
                        {finishedTime && (
                          <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                            Finished at {finishedTime}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-emerald-400">
                        Logged and saved for {formattedTargetDate}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 text-center mb-3">
                      <div>
                        <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Exercises</div>
                        <div className="text-base sm:text-lg font-black text-[var(--text-main)] mt-0.5">
                          {pastRecord.exercises.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Sets</div>
                        <div className="text-base sm:text-lg font-black text-[var(--text-main)] mt-0.5">
                          {pastRecord.totalSets}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Volume</div>
                        <div className="text-base sm:text-lg font-black text-[var(--primary)] mt-0.5">
                          {pastRecord.totalVolume.toLocaleString()} <span className="text-[10px] font-bold">kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Past Session Actions ONLY (No Start Workout Action) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedReviewSession(pastRecord)}
                        className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Workout</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          startEditingWorkout(userId, pastRecord);
                          navigate('/workout');
                        }}
                        className="gap-2 py-3 rounded-xl font-black text-xs uppercase text-[var(--primary)] border-[var(--primary-border)] hover:bg-[var(--primary-subtle)]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Workout</span>
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 border-t border-[var(--border-subtle)] text-center">
                <button
                  onClick={() => navigate('/history')}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] inline-flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View in Full History</span>
                </button>
              </div>
            </Card>
          </div>

          {/* Modal for Reviewing Session Breakdown */}
          {selectedReviewSession && (
            <Modal
              isOpen={Boolean(selectedReviewSession)}
              onClose={() => setSelectedReviewSession(null)}
              title={selectedReviewSession.workoutName || 'Historical Workout Details'}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pb-3 border-b border-[var(--border-subtle)]">
                  <span>{new Date(selectedReviewSession.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                  <span>
                    {formatCompletionTime(selectedReviewSession.completedAt || selectedReviewSession.date)}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {selectedReviewSession.exercises.map((ex, idx) => (
                    <div key={ex.id || idx} className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-[var(--text-main)] uppercase">{ex.exercise?.name || 'Exercise'}</span>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">{ex.sets.length} sets</span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
                        {ex.sets.map((s, sIdx) => (
                          <div key={sIdx} className="flex justify-between text-[11px]">
                            <span>Set {s.setNumber}:</span>
                            <span className="font-semibold text-[var(--text-main)]">
                              {s.weight} kg × {s.reps} reps {s.completed ? '✓' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="secondary" fullWidth onClick={() => setSelectedReviewSession(null)}>
                  Close
                </Button>
              </div>
            </Modal>
          )}
        </>
      );
    }

    // 3B. Past day was a scheduled REST DAY
    if (targetConfig.isRest) {
      return (
        <Card className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl text-[var(--text-main)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-500" />
              PAST SCHEDULE · {formattedTargetDate.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {onJumpToToday && (
                <button
                  onClick={onJumpToToday}
                  className="text-[10px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Back to Today
                </button>
              )}
              <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25 uppercase tracking-wider">
                REST DAY
              </span>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
              Rest Day
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Scheduled recovery day on {formatDayName(activeDay)}, {formattedTargetDate}. No workout was required.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              onClick={() => navigate('/history')}
              className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
            >
              <History className="w-3.5 h-3.5" />
              <span>View History</span>
            </Button>
            {onJumpToToday && (
              <Button
                variant="outline"
                onClick={onJumpToToday}
                className="py-3 rounded-xl font-black text-xs uppercase"
              >
                <span>Back to Today</span>
              </Button>
            )}
          </div>
        </Card>
      );
    }

    // 3C. Past day was scheduled but NO WORKOUT WAS COMPLETED
    return (
      <Card className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl text-[var(--text-main)] transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            PAST SCHEDULE · {formattedTargetDate.toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            {onJumpToToday && (
              <button
                onClick={onJumpToToday}
                className="text-[10px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                Back to Today
              </button>
            )}
            <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--bg-card)] px-2.5 py-1 rounded-full border border-[var(--border-subtle)] uppercase tracking-wider">
              WORKOUT NOT COMPLETED
            </span>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
            Workout not completed
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
            {targetConfig.name} was scheduled on {formatDayName(activeDay)}, {formattedTargetDate}, but was not completed.
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {targetConfig.muscleGroups.map((m) => (
              <span
                key={m.name}
                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                {m.displayName || m.name}
              </span>
            ))}
          </div>
        </div>

        {/* Never show Start Workout for past planned sessions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            onClick={() => navigate('/history')}
            className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
          >
            <History className="w-3.5 h-3.5" />
            <span>View History</span>
          </Button>
          {onJumpToToday && (
            <Button
              variant="outline"
              onClick={onJumpToToday}
              className="py-3 rounded-xl font-black text-xs uppercase"
            >
              <span>Back to Today</span>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // ==========================================
  // STATE 4: FUTURE DAY PREVIEW
  // (Do not present a normal Start Workout action!)
  // ==========================================
  if (isFuture) {
    if (targetConfig.isRest) {
      return (
        <Card className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl text-[var(--text-main)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-500" />
              FUTURE SCHEDULE · {formattedTargetDate.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {onJumpToToday && (
                <button
                  onClick={onJumpToToday}
                  className="text-[10px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Back to Today
                </button>
              )}
              <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25 uppercase tracking-wider">
                UPCOMING REST
              </span>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
              Scheduled Rest Day
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Planned recovery on {formatDayName(activeDay)}, {formattedTargetDate}. Prepare your body with rest and nutrition.
            </p>
          </div>

          <button
            onClick={handleStartOptional}
            className="w-full h-12 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] font-black text-xs sm:text-sm uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--primary-border)] hover:text-[var(--primary)] flex items-center justify-center gap-2 transition-all cursor-pointer mb-2.5"
          >
            <Dumbbell className="w-4 h-4" />
            <span>START OPTIONAL WORKOUT</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              onClick={() => {
                if (onOpenEditPlan) onOpenEditPlan();
                else navigate('/workout');
              }}
              className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>View Plan</span>
            </Button>
            {onJumpToToday && (
              <Button
                variant="outline"
                onClick={onJumpToToday}
                className="py-3 rounded-xl font-black text-xs uppercase"
              >
                <span>Back to Today</span>
              </Button>
            )}
          </div>
        </Card>
      );
    }

    // Future scheduled workout preview & start action
    return (
      <>
        <Card className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl text-[var(--text-main)] transition-all shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
              FUTURE SCHEDULE · {formattedTargetDate.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {onJumpToToday && (
                <button
                  onClick={onJumpToToday}
                  className="text-[10px] font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Back to Today
                </button>
              )}
              <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary-subtle)] px-2.5 py-1 rounded-full border border-[var(--primary-border)] uppercase tracking-wider">
                PLANNED
              </span>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-2">
              {targetConfig.name}
            </h2>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {targetConfig.muscleGroups.map((m) => (
                <span
                  key={m.name}
                  className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)]"
                >
                  {m.displayName || m.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-secondary)] mb-4">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>~45-60 min</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{targetConfig.muscleGroups.length * 2 || 5} Exercises Planned</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--bg-card)]/60 border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span>
                Scheduled for {formatDayName(activeDay)}, {formattedTargetDate}. You can start it now or preview the workout plan.
              </span>
            </div>
          </div>

          {/* Primary Action: Start Workout */}
          <button
            onClick={() => handleStartScheduled(activeDay)}
            className="w-full h-13 sm:h-14 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] group"
          >
            <Play className="w-4 h-4 fill-white stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span>START WORKOUT</span>
          </button>

          {/* Secondary Actions: Preview Workout & View Plan */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <Button
              variant="secondary"
              onClick={() => setIsPreviewModalOpen(true)}
              className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Workout</span>
            </Button>
            {onOpenEditPlan ? (
              <Button
                variant="outline"
                onClick={onOpenEditPlan}
                className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Plan</span>
              </Button>
            ) : onJumpToToday ? (
              <Button
                variant="outline"
                onClick={onJumpToToday}
                className="gap-2 py-3 rounded-xl font-black text-xs uppercase"
              >
                <span>Back to Today</span>
              </Button>
            ) : null}
          </div>
        </Card>

        {/* Future Workout Preview Modal */}
        {isPreviewModalOpen && (
          <Modal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            title={targetConfig.name}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pb-3 border-b border-[var(--border-subtle)]">
                <span>Scheduled for {formatDayName(activeDay)}, {formattedTargetDate}</span>
                <span className="font-bold text-[var(--primary)]">~45-60 min</span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase text-[var(--text-secondary)] mb-2">
                  Target Muscle Groups
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {targetConfig.muscleGroups.map((m) => (
                    <span
                      key={m.name}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                    >
                      {m.displayName || m.name}
                    </span>
                  ))}
                </div>
              </div>

              {previewExercises.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-[var(--text-secondary)] mb-2">
                    Planned Exercises
                  </div>
                  <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                    {previewExercises.map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-[var(--text-main)] truncate">
                            {ex.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] capitalize">
                            {ex.primaryMuscle} • {ex.equipment}
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-[var(--text-secondary)] shrink-0">
                          3–4 Sets
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                This workout session will be ready to start and log when {formatDayName(activeDay)} arrives.
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {onOpenEditPlan && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPreviewModalOpen(false);
                      onOpenEditPlan();
                    }}
                    className="font-bold text-xs"
                  >
                    Edit Routine Plan
                  </Button>
                )}
                <Button
                  variant="secondary"
                  fullWidth={!onOpenEditPlan}
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="font-bold text-xs"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  // ==========================================
  // STATE 5: TODAY REST DAY
  // ==========================================
  if (targetConfig.isRest) {
    return (
      <Card className="w-full relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl shadow-sm text-[var(--text-main)] transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            TODAY'S SCHEDULE · {formatDayName(today).toUpperCase()}
          </span>
          <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25 uppercase tracking-wider">
            REST & RECOVERY
          </span>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
            Rest & Recovery Day
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Rest is when muscles rebuild and grow stronger. Focus on hydration, quality nutrition, light mobility, and deep sleep.
          </p>
        </div>

        <button
          onClick={handleStartOptional}
          className="w-full h-12 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] font-black text-xs sm:text-sm uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--primary-border)] hover:text-[var(--primary)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Dumbbell className="w-4 h-4" />
          <span>START OPTIONAL WORKOUT</span>
        </button>
      </Card>
    );
  }

  // ==========================================
  // STATE 6: TODAY SCHEDULED WORKOUT
  // ==========================================
  const estimatedDuration = '~45-60 min';
  const exerciseCount = targetConfig.muscleGroups.length > 0 ? targetConfig.muscleGroups.length * 2 : 5;

  return (
    <Card className="w-full relative overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-3xl shadow-lg shadow-black/10 text-[var(--text-main)] transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
          TODAY'S FOCUS · {formatDayName(today).toUpperCase()}
        </span>
        <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary-subtle)] px-2.5 py-1 rounded-full border border-[var(--primary-border)] uppercase tracking-wider">
          SCHEDULED
        </span>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-main)] uppercase tracking-tight mb-2">
          {targetConfig.name}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {targetConfig.muscleGroups.map((m) => (
            <span
              key={m.name}
              className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)]"
            >
              {m.displayName || m.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>{estimatedDuration}</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>{exerciseCount} Exercises</span>
          </div>
        </div>
      </div>

      {/* High-Contrast Large Red Start Button */}
      <button
        onClick={handleStartToday}
        className="w-full h-13 sm:h-14 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-red-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] group"
      >
        <Play className="w-4 h-4 fill-white stroke-[2.5] group-hover:scale-110 transition-transform" />
        <span>START WORKOUT</span>
      </button>
    </Card>
  );
};
