import React, { useState, useMemo } from 'react';
import {
  Check,
  Award,
  AlertCircle,
  Loader2,
  Clock,
  Dumbbell,
  Layers,
  Smile,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { WorkoutSession } from '../../types';
import { calculateMuscleCoverage } from '../../utils/coverage';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';

interface WorkoutSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.id || 'guest';

  const {
    getActiveSession,
    getPersonalRecords,
    finishWorkout,
    isFinishing,
    saveError,
    lastCompletedSession,
    clearLastCompletedSession,
    settings,
  } = useWorkoutStore();

  const [localError, setLocalError] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<WorkoutSession | null>(null);
  const [rating, setRating] = useState<'easy' | 'good' | 'hard' | null>(null);
  const [notes, setNotes] = useState('');

  const activeSession = getActiveSession(userId);
  const personalRecords = getPersonalRecords(userId);
  const weightUnit = settings.weightUnit || 'kg';

  // Calculate volume & completed sets
  const { totalVolume, totalCompletedSets, durationFormatted } = useMemo(() => {
    if (!activeSession) {
      return { totalVolume: 0, totalCompletedSets: 0, durationFormatted: '0m' };
    }

    let volume = 0;
    let completedSets = 0;

    activeSession.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (Array.isArray(s.stages) && s.stages.length > 0) {
          let stageCompleted = false;
          s.stages.forEach((st) => {
            if (st.completed && st.weight && st.reps) {
              volume += Number(st.weight) * Number(st.reps);
              stageCompleted = true;
            }
          });
          if (s.completed || stageCompleted) completedSets++;
        } else if (s.completed && s.weight && s.reps) {
          volume += Number(s.weight) * Number(s.reps);
          completedSets++;
        }
      });
    });

    const durationSeconds = activeSession.startedAt
      ? Math.max(1, Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
      : 0;
    const mins = Math.floor(durationSeconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationFormatted = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;

    return { totalVolume: volume, totalCompletedSets: completedSets, durationFormatted };
  }, [activeSession]);

  // Sub-region coverage analysis
  const coverageAnalysis = useMemo(() => {
    if (!activeSession) return [];
    const groups = activeSession.muscleGroups || [];
    return groups.map((mg) => {
      const cov = calculateMuscleCoverage(mg, activeSession.exercises);
      const directAreas = cov.areas.filter((i) => i.status === 'direct').map((i) => i.displayName);
      const supportedAreas = cov.areas.filter((i) => i.status === 'supported').map((i) => i.displayName);
      return {
        muscleGroup: mg,
        groupName: MUSCLE_GROUPS[mg]?.name || mg,
        directAreas,
        supportedAreas,
      };
    });
  }, [activeSession]);

  const handleFinish = async () => {
    if (isFinishing) return;
    setLocalError(null);
    try {
      const sessionSnapshot = activeSession ? { ...activeSession } : null;
      const success = await finishWorkout(userId, {
        rating,
        notes: notes.trim(),
      });
      if (success) {
        const completed = useWorkoutStore.getState().lastCompletedSession || sessionSnapshot;
        setSavedSession(completed as WorkoutSession);
      } else {
        setLocalError('Failed to save workout session to database. Please retry.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save workout session. Please retry.');
    }
  };

  const handleDone = () => {
    clearLastCompletedSession();
    setSavedSession(null);
    onClose();
    navigate('/');
  };

  const handleViewHistory = () => {
    clearLastCompletedSession();
    setSavedSession(null);
    onClose();
    navigate('/history');
  };

  const sessionToShow = savedSession || lastCompletedSession;

  // 1. Post-Finish Celebratory Completion State
  if (sessionToShow) {
    const sessionVolume = sessionToShow.totalVolume ?? totalVolume;
    const sessionSets = sessionToShow.totalSets ?? totalCompletedSets;
    const sessionRating = sessionToShow.rating || rating;
    const newPRs = sessionToShow.newPRs || [];

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleDone}
        maxWidth="max-w-md"
        title="Workout Complete"
      >
        <div className="text-center py-3 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.25)] animate-bounce-subtle">
            <Award className="w-8 h-8 text-amber-400" />
          </div>

          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">
              Workout Completed!
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Saved to your training log and recovery engine.
            </p>
          </div>

          {/* Quick Metrics Recap */}
          <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 text-center">
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                Volume
              </div>
              <div className="text-base font-black text-[var(--primary)]">
                {Math.round(sessionVolume).toLocaleString()} {weightUnit}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                Sets Done
              </div>
              <div className="text-base font-black text-[var(--text-main)]">
                {sessionSets}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                Difficulty
              </div>
              <div className="text-base font-black text-amber-400 capitalize">
                {sessionRating || 'Logged'}
              </div>
            </div>
          </div>

          {/* New PRs celebration banner */}
          {newPRs.length > 0 && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wide">
                <Sparkles className="w-4 h-4" />
                <span>{newPRs.length} New Personal Record{newPRs.length > 1 ? 's' : ''}!</span>
              </div>
              {newPRs.map((pr) => (
                <div key={pr.id} className="text-xs text-[var(--text-main)] font-semibold truncate pl-5">
                  • {pr.exerciseName}: <span className="text-amber-300">{pr.details}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleDone}
              className="h-12 min-h-[48px] rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <button
              type="button"
              onClick={handleViewHistory}
              className="w-full py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] font-semibold transition-colors cursor-pointer"
            >
              View in Workout History
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (!activeSession) return null;

  const errorMessage = localError || saveError;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isFinishing ? () => {} : onClose}
      maxWidth="max-w-md"
      title="Finish Workout"
    >
      <div className="text-center py-1 space-y-3.5">
        <div>
          <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">
            Review & Complete Workout
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Log session difficulty and save your progress.
          </p>
        </div>

        {/* Warning if no completed sets */}
        {totalCompletedSets === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-400 font-semibold text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              No sets checked complete yet. Tapping confirm will record zero volume.
            </div>
          </div>
        )}

        {/* Key Metrics 4-Grid */}
        <div className="grid grid-cols-4 gap-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
          <div>
            <div className="text-[9px] text-[var(--text-secondary)] uppercase font-bold flex items-center justify-center gap-0.5">
              <Dumbbell className="w-2.5 h-2.5" /> Vol
            </div>
            <div className="text-sm font-black text-[var(--primary)] truncate">
              {Math.round(totalVolume).toLocaleString()}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">{weightUnit}</div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--text-secondary)] uppercase font-bold flex items-center justify-center gap-0.5">
              <Layers className="w-2.5 h-2.5" /> Sets
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">
              {totalCompletedSets}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">done</div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--text-secondary)] uppercase font-bold flex items-center justify-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> Time
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">
              {durationFormatted}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">duration</div>
          </div>

          <div>
            <div className="text-[9px] text-[var(--text-secondary)] uppercase font-bold flex items-center justify-center gap-0.5">
              <Award className="w-2.5 h-2.5" /> Moves
            </div>
            <div className="text-sm font-black text-[var(--text-main)]">
              {activeSession.exercises.length}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">exercises</div>
          </div>
        </div>

        {/* Sub-region Muscle Coverage Breakdown */}
        {coverageAnalysis.length > 0 && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-left space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Muscle & Region Coverage
            </div>
            <div className="space-y-1">
              {coverageAnalysis.map((ca) => (
                <div key={ca.muscleGroup} className="text-[11px] leading-tight">
                  <span className="font-bold text-[var(--text-main)]">{ca.groupName}: </span>
                  {ca.directAreas.length > 0 && (
                    <span className="text-emerald-400 font-medium">
                      Direct ({ca.directAreas.join(', ')})
                    </span>
                  )}
                  {ca.directAreas.length > 0 && ca.supportedAreas.length > 0 && (
                    <span className="text-[var(--text-muted)]"> · </span>
                  )}
                  {ca.supportedAreas.length > 0 && (
                    <span className="text-sky-400 font-medium">
                      Supported ({ca.supportedAreas.join(', ')})
                    </span>
                  )}
                  {ca.directAreas.length === 0 && ca.supportedAreas.length === 0 && (
                    <span className="text-[var(--text-muted)]">Targeting full group</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty Rating */}
        <div className="text-left space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
            <Smile className="w-3 h-3 text-[var(--primary)]" />
            <span>How did the workout feel?</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRating(rating === 'easy' ? null : 'easy')}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rating === 'easy'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>🟢</span>
              <span>Easy</span>
            </button>
            <button
              type="button"
              onClick={() => setRating(rating === 'good' ? null : 'good')}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rating === 'good'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>🟡</span>
              <span>Good</span>
            </button>
            <button
              type="button"
              onClick={() => setRating(rating === 'hard' ? null : 'hard')}
              className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rating === 'hard'
                  ? 'bg-red-500/20 text-red-400 border-red-500 shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>🔴</span>
              <span>Hard</span>
            </button>
          </div>
        </div>

        {/* Workout Notes */}
        <div className="text-left space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Session Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Great chest pump, bench press felt lighter than usual..."
            rows={2}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
          />
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="bg-[var(--danger-subtle)] border border-[var(--danger-border)] rounded-xl p-2.5 text-xs text-[var(--danger)] font-bold text-left flex items-start justify-between gap-2">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={handleFinish}
              className="text-[var(--text-main)] underline hover:text-[var(--danger)] shrink-0 font-extrabold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleFinish}
          disabled={isFinishing}
          className="font-extrabold h-12 min-h-[48px] rounded-xl justify-center touch-manipulation active:scale-[0.98] transition-all duration-120 cursor-pointer shadow-md"
        >
          {isFinishing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>SAVING WORKOUT SESSION...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 stroke-[3]" />
              <span>CONFIRM & SAVE WORKOUT</span>
            </div>
          )}
        </Button>
      </div>
    </Modal>
  );
};
