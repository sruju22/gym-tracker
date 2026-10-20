import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  Dumbbell,
  Repeat,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Flame,
  Smile,
  Check,
} from 'lucide-react';
import { WorkoutSession, PersonalRecord } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import {
  formatWorkoutDuration,
  generateWorkoutInsight,
  getPreviousExerciseBest,
} from '../../utils/workoutInsights';

interface WorkoutCompletionScreenProps {
  session: WorkoutSession;
  onDone: () => void;
  onViewHistory?: () => void;
  isModal?: boolean;
}

export const WorkoutCompletionScreen: React.FC<WorkoutCompletionScreenProps> = ({
  session,
  onDone,
  onViewHistory,
  isModal = false,
}) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.id || 'guest';
  const getHistory = useWorkoutStore((state) => state.getHistory);
  const settings = useWorkoutStore((state) => state.settings);
  const updateWorkoutFeedback = useWorkoutStore((state) => state.updateWorkoutFeedback);

  const weightUnit = settings.weightUnit || 'kg';
  const history = getHistory(userId);

  // Collapsible breakdown state (default collapsed for an uncluttered mobile view)
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  // Feedback rating and notes state
  const [selectedRating, setSelectedRating] = useState<'easy' | 'good' | 'hard' | null>(
    session.rating || null
  );
  const [notes, setNotes] = useState(session.notes || '');
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // Calculate metrics
  const { totalReps, totalCompletedSets, completedExercisesCount, totalPlannedExercises } =
    useMemo(() => {
      let repsCount = 0;
      let completedSetsCount = 0;
      let completedExCount = 0;
      const totalPlanned = Array.isArray(session.exercises) ? session.exercises.length : 0;

      session.exercises?.forEach((ex) => {
        let hasCompletedSetInExercise = false;
        ex.sets?.forEach((s) => {
          if (Array.isArray(s.stages) && s.stages.length > 0) {
            s.stages.forEach((st) => {
              if (st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0) {
                repsCount += st.reps;
                hasCompletedSetInExercise = true;
              }
            });
            if (s.completed || s.stages.some((st) => st.completed)) {
              completedSetsCount++;
            }
          } else if (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) {
            repsCount += s.reps;
            completedSetsCount++;
            hasCompletedSetInExercise = true;
          }
        });
        if (hasCompletedSetInExercise) {
          completedExCount++;
        }
      });

      return {
        totalReps: repsCount,
        totalCompletedSets: completedSetsCount || session.totalSets || 0,
        completedExercisesCount: completedExCount,
        totalPlannedExercises: totalPlanned,
      };
    }, [session]);

  const durationFormatted = formatWorkoutDuration(session.duration, session.startedAt, session.completedAt);
  const workoutInsight = useMemo(
    () => generateWorkoutInsight(session, history, weightUnit),
    [session, history, weightUnit]
  );

  const formattedDate = useMemo(() => {
    try {
      const d = session.completedAt ? new Date(session.completedAt) : new Date(session.date);
      return d.toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Today';
    }
  }, [session]);

  const handleRatingSelect = async (rating: 'easy' | 'good' | 'hard') => {
    const newRating = selectedRating === rating ? null : rating;
    setSelectedRating(newRating);
    await updateWorkoutFeedback(userId, session.id || session.clientSessionId || '', {
      rating: newRating,
    });
  };

  const handleNotesBlur = async () => {
    await updateWorkoutFeedback(userId, session.id || session.clientSessionId || '', {
      notes,
    });
    setIsNotesSaved(true);
    setTimeout(() => setIsNotesSaved(false), 2000);
  };

  // Planned vs completed adherence calculation
  const isAllPlannedCompleted =
    totalPlannedExercises > 0 && completedExercisesCount === totalPlannedExercises;

  return (
    <div
      className={`w-full max-w-lg mx-auto text-white select-none ${
        isModal ? 'p-2 sm:p-4' : 'px-4 py-4 sm:py-6'
      }`}
    >
      {/* 1. Rewarding Celebration Header */}
      <div className="text-center space-y-2 mb-4">
        {/* Celebration Trophy Icon with Crimson Glow */}
        <div className="relative inline-flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.45) 0%, transparent 70%)',
            }}
          />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-[#2a1317] to-[#161214] border-2 border-red-500/40 flex items-center justify-center shadow-lg shadow-red-950/40">
            <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--primary)] drop-shadow" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Session Recorded & Saved</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Workout Complete!
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            <span className="text-zinc-200 font-bold">
              {session.workoutName || 'Workout Session'}
            </span>{' '}
            · {formattedDate}
          </p>
        </div>
      </div>

      {/* 2. Concise Data-Backed Insight Card (Requirement 3) */}
      {workoutInsight && (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#1c1417] via-[#16141a] to-[#12131a] border border-red-500/25 shadow-md shadow-black/40 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-[var(--primary)] mt-0.5">
            {workoutInsight.type === 'pr' ? (
              <Award className="w-4 h-4 text-amber-400" />
            ) : workoutInsight.type === 'volume_increase' ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : workoutInsight.type === 'perfect_completion' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
              {workoutInsight.title}
            </div>
            <p className="text-xs text-zinc-300 font-medium mt-0.5 leading-snug">
              {workoutInsight.description}
            </p>
          </div>
        </div>
      )}

      {/* 3. Key Metrics Grid (Requirement 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {/* Total Volume */}
        <div className="bg-[#15171e] border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
            <Dumbbell className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Volume</span>
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-white tracking-tight">
              {Math.round(session.totalVolume || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase">{weightUnit} lifted</div>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-[#15171e] border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Duration</span>
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-white tracking-tight">
              {durationFormatted}
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold">
              {session.startedAt ? 'session time' : 'not timed'}
            </div>
          </div>
        </div>

        {/* Working Sets */}
        <div className="bg-[#15171e] border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Sets</span>
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-white tracking-tight">
              {totalCompletedSets}
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold">working sets</div>
          </div>
        </div>

        {/* Total Reps */}
        <div className="bg-[#15171e] border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
            <Repeat className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Reps</span>
          </div>
          <div className="mt-1.5">
            <div className="text-lg sm:text-xl font-black text-white tracking-tight">
              {totalReps}
            </div>
            <div className="text-[10px] text-zinc-400 font-semibold">reps completed</div>
          </div>
        </div>
      </div>

      {/* Planned vs Completed Adherence Pill */}
      {totalPlannedExercises > 0 && (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-[#12141a] border border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">Exercise Adherence:</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black ${
                isAllPlannedCompleted ? 'text-emerald-400' : 'text-zinc-200'
              }`}
            >
              {completedExercisesCount} of {totalPlannedExercises} Completed
            </span>
            {isAllPlannedCompleted && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                100%
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Meaningful Achievements: Personal Records (Requirement 2) */}
      {Array.isArray(session.newPRs) && session.newPRs.length > 0 && (
        <div className="mb-4 bg-[#181216] border border-red-500/35 rounded-2xl p-3.5 shadow-lg shadow-black/50 space-y-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Personal Records Achieved ({session.newPRs.length})
            </h3>
          </div>

          <div className="space-y-2">
            {session.newPRs.map((pr: PersonalRecord) => {
              const badgeLabel =
                pr.prCategory === 'max_weight'
                  ? 'Heaviest Weight'
                  : pr.prCategory === 'max_reps'
                  ? 'Most Reps'
                  : pr.prCategory === 'max_1rm'
                  ? 'Strength 1RM'
                  : 'New Baseline';

              const badgeColor =
                pr.prCategory === 'max_weight'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : pr.prCategory === 'max_reps'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : pr.prCategory === 'max_1rm'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30';

              return (
                <div
                  key={pr.id}
                  className="bg-[#120f13] border border-red-900/30 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{pr.exerciseName}</div>
                    <div className="text-[11px] text-zinc-300 mt-0.5">{pr.details}</div>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${badgeColor}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Collapsible Workout Breakdown & Optional Feedback (Requirement 4) */}
      <div className="mb-4 bg-[#13151c] border border-zinc-800/80 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer touch-manipulation"
          aria-expanded={isBreakdownOpen}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-200">
              Workout Breakdown & Notes
            </span>
            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-medium">
              Optional details
            </span>
          </div>
          {isBreakdownOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {isBreakdownOpen && (
          <div className="p-4 pt-1 border-t border-zinc-800/80 space-y-4">
            {/* Session Rating: Easy / Good / Hard */}
            <div>
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                How did this workout feel?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRatingSelect('easy')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                    selectedRating === 'easy'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                      : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Easy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRatingSelect('good')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                    selectedRating === 'good'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/20'
                      : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Good</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRatingSelect('hard')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                    selectedRating === 'hard'
                      ? 'bg-red-500/20 border-red-500 text-red-300 shadow-sm shadow-red-500/20'
                      : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Hard</span>
                </button>
              </div>
            </div>

            {/* Workout Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                  Session Notes (Optional)
                </label>
                {isNotesSaved && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Log energy levels, form cues, or adjustments..."
                rows={2}
                className="w-full bg-[#0d0e12] border border-zinc-700/80 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>

            {/* Exercise-by-Exercise Breakdown */}
            <div className="space-y-3 pt-1">
              <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Completed Exercise Sets
              </div>
              <div className="space-y-2">
                {session.exercises?.map((ex, exIdx) => {
                  const completedSets = ex.sets?.filter((s) => s.completed) || [];
                  const prevBest = getPreviousExerciseBest(
                    ex.exerciseId || ex.id,
                    history,
                    session.id
                  );

                  return (
                    <div
                      key={ex.id || exIdx}
                      className="bg-[#0e1015] border border-zinc-800/70 rounded-xl p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {ex.exercise?.name || `Exercise ${exIdx + 1}`}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                          {ex.exercise?.primaryMuscle || 'Exercise'}
                        </span>
                      </div>

                      {/* Sets list */}
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-300">
                        {completedSets.length > 0 ? (
                          completedSets.map((s, sIdx) => (
                            <span
                              key={s.id || sIdx}
                              className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50 text-[10px] font-semibold"
                            >
                              S{s.setNumber || sIdx + 1}: {s.weight || 0} {weightUnit} × {s.reps || 0}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic">
                            No completed working sets
                          </span>
                        )}
                      </div>

                      {/* Historical Comparison */}
                      {prevBest && (
                        <div className="text-[10px] text-zinc-400 font-medium pt-0.5">
                          Previous best: {prevBest.weight} {weightUnit} × {prevBest.reps} reps
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Primary Action Buttons (Requirement 5 & 6) */}
      <div className="space-y-2 pt-1">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onDone}
          className="h-12 min-h-[48px] rounded-xl text-sm font-black justify-center shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all duration-120 touch-manipulation motion-reduce:transition-none motion-reduce:transform-none"
        >
          <span>Done</span>
        </Button>

        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="w-full py-2.5 text-center text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:opacity-75 touch-manipulation"
          >
            <span>View in Workout History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
