import React, { useState } from 'react';
import { Check, Award, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { WorkoutSession } from '../../types';
import { WorkoutCompletionScreen } from './WorkoutCompletionScreen';

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

  const activeSession = getActiveSession(userId);
  const personalRecords = getPersonalRecords(userId);
  const weightUnit = settings.weightUnit || 'kg';

  // If a session has been successfully saved, render the post-workout completion screen
  const sessionToShow = savedSession || lastCompletedSession;

  if (sessionToShow) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => {
          clearLastCompletedSession();
          onClose();
        }}
        maxWidth="max-w-xl"
        title="Workout Complete"
      >
        <WorkoutCompletionScreen
          session={sessionToShow}
          isModal={true}
          onDone={() => {
            clearLastCompletedSession();
            onClose();
            navigate('/');
          }}
          onViewHistory={() => {
            clearLastCompletedSession();
            onClose();
            navigate('/history');
          }}
        />
      </Modal>
    );
  }

  if (!activeSession) return null;

  let totalVolume = 0;
  let totalCompletedSets = 0;
  activeSession.exercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (Array.isArray(s.stages) && s.stages.length > 0) {
        let setHasCompletedStage = false;
        s.stages.forEach((st) => {
          if (st.completed && st.weight && st.reps) {
            totalVolume += Number(st.weight) * Number(st.reps);
            setHasCompletedStage = true;
          }
        });
        if (s.completed || setHasCompletedStage) {
          totalCompletedSets++;
        }
      } else if (s.completed && s.weight && s.reps) {
        totalVolume += Number(s.weight) * Number(s.reps);
        totalCompletedSets++;
      }
    });
  });

  const handleFinish = async () => {
    if (isFinishing) return;
    setLocalError(null);
    try {
      // Capture session before clearing
      const sessionSnapshot = { ...activeSession };
      const success = await finishWorkout(userId);
      if (success) {
        // Retrieve newly saved completed session from store
        const completed = useWorkoutStore.getState().lastCompletedSession || sessionSnapshot;
        setSavedSession(completed as WorkoutSession);
      } else {
        setLocalError('Failed to save workout session to database. Please retry.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save workout session. Please retry.');
    }
  };

  const errorMessage = localError || saveError;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isFinishing ? () => {} : onClose}
      maxWidth="max-w-md"
      title="Finish Workout"
    >
      <div className="text-center py-2 space-y-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">
            Review Workout Session
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Confirm your logged sets and save your session progress.
          </p>
        </div>

        {/* Warning if no completed sets */}
        {totalCompletedSets === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-400 font-semibold text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              No sets have been checked as completed yet. Complete your working sets to log volume and personal records.
            </div>
          </div>
        )}

        {/* Key Metrics grid */}
        <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4">
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
              Exercises
            </div>
            <div className="text-lg font-black text-[var(--text-main)]">
              {activeSession.exercises.length}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
              Completed Sets
            </div>
            <div className="text-lg font-black text-[var(--text-main)]">
              {totalCompletedSets}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
              Volume
            </div>
            <div className="text-lg font-black text-[var(--primary)]">
              {Math.round(totalVolume).toLocaleString()} {weightUnit}
            </div>
          </div>
        </div>

        {/* PR Alert preview if achieved */}
        {personalRecords.length > 0 && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2.5 text-left">
            <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-amber-500 uppercase">
                Active Personal Records ({personalRecords.length})
              </div>
              <div className="text-xs text-[var(--text-main)] font-semibold truncate">
                {personalRecords[personalRecords.length - 1].exerciseName}:{' '}
                {personalRecords[personalRecords.length - 1].details}
              </div>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="bg-[var(--danger-subtle)] border border-[var(--danger-border)] rounded-xl p-3 text-xs text-[var(--danger)] font-bold text-left flex items-start justify-between gap-2">
            <span>{errorMessage}</span>
            <button
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
          className="font-extrabold h-12 min-h-[48px] rounded-xl justify-center touch-manipulation active:scale-[0.98] transition-all duration-120"
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
