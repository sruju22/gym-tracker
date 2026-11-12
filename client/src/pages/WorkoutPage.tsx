import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, AlertTriangle, Edit3, BookOpen, Coffee, Layers, Trophy, Flame, Zap, Clock, Sparkles, RotateCcw } from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { CombinationCard } from '../components/workout/CombinationCard';
import { CreateCombinationModal } from '../components/workout/CreateCombinationModal';
import { CoverageIndicator } from '../components/workout/CoverageIndicator';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';
import { WorkoutSummary } from '../components/workout/WorkoutSummary';
import { WorkoutCompletionScreen } from '../components/workout/WorkoutCompletionScreen';
import { LogCardioModal } from '../components/cardio/LogCardioModal';
import { useTimerStore } from '../store/timerStore';
import { triggerHaptic } from '../utils/haptics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { MuscleGroupConfig, WorkoutExercise } from '../types';
import { MUSCLE_GROUPS } from '../data/muscleGroups';
import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlan';
import { getLegSection, isLegSubArea } from '../utils/legSection';
import { formatDateShort, getTodayDayOfWeek, formatDayName } from '../utils/formatters';
import { normalizeCombinationExercises } from '../utils/combinationNormalizer';

export const WorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const isGuest = !currentUser;

  const {
    getActiveSession,
    getEditingSession,
    getTodayCompletedWorkout,
    getWeeklyPlan,
    getHistory,
    startTodayWorkout,
    startCustomWorkout,
    startEditingWorkout,
    addExerciseToWorkout,
    addMuscleSectionToWorkout,
    moveExerciseInWorkout,
    toggleExerciseCompleted,
    setExerciseCollapsed,
    toggleExerciseExpanded,
    cancelWorkout,
    cancelEditingWorkout,
    saveWorkoutEdits,
    finishWorkout,
    isFinishing,
    saveError,
    lastCompletedSession,
    clearLastCompletedSession,
  } = useWorkoutStore();

  const activeSession = getActiveSession(userId);
  const editingSession = getEditingSession(userId);
  const isEditing = Boolean(editingSession);
  const currentSession = editingSession || activeSession;
  const todayCompleted = isGuest ? null : getTodayCompletedWorkout(userId);
  const weeklyPlan = getWeeklyPlan(userId);
  const todayDay = getTodayDayOfWeek();
  const todayConfig = (weeklyPlan && weeklyPlan[todayDay]) || DEFAULT_WORKOUT_PLAN[todayDay];

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showCompletionSummaryModal, setShowCompletionSummaryModal] = useState(false);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [targetSectionForAdd, setTargetSectionForAdd] = useState<MuscleGroupConfig | undefined>(
    undefined
  );
  const [isCombinationModalOpen, setIsCombinationModalOpen] = useState(false);
  const [targetSectionForCombination, setTargetSectionForCombination] = useState<
    MuscleGroupConfig | undefined
  >(undefined);
  const [isLogCardioOpen, setIsLogCardioOpen] = useState(false);

  // Live Elapsed Workout Stopwatch
  const sessionStartedAt = currentSession?.startedAt;
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (!sessionStartedAt) return 0;
    const ms = new Date(sessionStartedAt).getTime();
    return isNaN(ms) ? 0 : Math.max(0, Math.floor((Date.now() - ms) / 1000));
  });

  useEffect(() => {
    if (!sessionStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const calcElapsed = () => {
      const ms = new Date(sessionStartedAt).getTime();
      return isNaN(ms) ? 0 : Math.max(0, Math.floor((Date.now() - ms) / 1000));
    };

    const interval = setInterval(() => {
      setElapsedSeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartedAt]);

  const formatStopwatch = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Split family classification helper:
  // Strictly segregates 'push', 'pull', 'legs' to prevent cross-contamination
  const getSplitCategory = (name?: string): 'push' | 'pull' | 'legs' | 'other' => {
    if (!name) return 'other';
    const lower = name.toLowerCase().trim();
    if (lower.startsWith('push') || lower.includes('push')) return 'push';
    if (lower.startsWith('pull') || lower.includes('pull')) return 'pull';
    if (lower.startsWith('leg') || lower.includes('leg')) return 'legs';
    return 'other';
  };

  // Find last matching completed session for "Load Last [Routine]" button
  const currentWorkoutName = currentSession?.workoutName?.trim();
  const currentSessionId = currentSession?.id;
  const currentCategory = getSplitCategory(currentWorkoutName);

  const lastMatchingCompletedSession = useMemo(() => {
    if (!currentWorkoutName && !currentSession?.muscleGroups?.length) return null;
    const history = getHistory(userId);
    const completedWithExercises = history.filter(
      (h) =>
        h.status === 'completed' &&
        Array.isArray(h.exercises) &&
        h.exercises.length > 0 &&
        h.id !== currentSessionId
    );

    if (completedWithExercises.length === 0) return null;

    // 1. Exact Workout Name Match (Highest priority)
    // E.g. If current is "Push B", find the most recent completed "Push B"
    if (currentWorkoutName) {
      const exactMatch = completedWithExercises.find(
        (h) => h.workoutName?.trim().toLowerCase() === currentWorkoutName.toLowerCase()
      );
      if (exactMatch) return exactMatch;
    }

    // 2. Same Split Family Match (Second priority)
    // E.g. If current is "Push B" and user has never done Push B before, find latest "Push A" or "Push"
    // CRITICAL: A "Pull" or "Legs" session will NEVER match a "Push" session!
    if (currentCategory !== 'other') {
      const sameFamilyMatch = completedWithExercises.find(
        (h) => getSplitCategory(h.workoutName) === currentCategory
      );
      if (sameFamilyMatch) return sameFamilyMatch;
    }

    // 3. Strict Muscle Group Match (For custom named workouts without push/pull/legs in title)
    if (currentCategory === 'other' && currentSession?.muscleGroups?.length) {
      const currentMuscles = new Set(currentSession.muscleGroups);
      const muscleMatch = completedWithExercises.find((h) => {
        const pastCategory = getSplitCategory(h.workoutName);
        if (pastCategory !== 'other') return false; // Don't match generic custom workout to specific Push/Pull/Legs
        const pastMuscles = h.muscleGroups || [];
        const shared = pastMuscles.filter((m) => currentMuscles.has(m));
        return shared.length >= Math.ceil(currentMuscles.size * 0.5);
      });
      if (muscleMatch) return muscleMatch;
    }

    return null;
  }, [getHistory, userId, currentWorkoutName, currentSessionId, currentCategory, currentSession?.muscleGroups]);

  const isExactRoutineMatch = Boolean(
    lastMatchingCompletedSession &&
    currentWorkoutName &&
    lastMatchingCompletedSession.workoutName?.trim().toLowerCase() === currentWorkoutName.toLowerCase()
  );
  const targetRoutineName = lastMatchingCompletedSession?.workoutName || currentWorkoutName || 'Routine';

  const handleLoadLastMatchingRoutine = () => {
    if (!lastMatchingCompletedSession || !currentSession) return;
    triggerHaptic('success');

    let addedCount = 0;
    const currentExercises = currentSession.exercises || [];
    lastMatchingCompletedSession.exercises.forEach((pastEx) => {
      const alreadyPresent = currentExercises.some(
        (cur) => cur.exerciseId === pastEx.exerciseId || cur.exercise?.id === pastEx.exercise?.id
      );
      if (!alreadyPresent && pastEx.exercise) {
        addExerciseToWorkout(userId, pastEx.exercise);
        addedCount++;
      }
    });

    setSaveSuccessMsg(
      `Loaded ${addedCount || lastMatchingCompletedSession.exercises.length} exercises from ${
        lastMatchingCompletedSession.workoutName || currentSession.workoutName
      }!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Track per-exercise expansion / collapse state:
  // - If explicitly collapsed or expanded in active session state, respect workEx.isCollapsed
  // - Otherwise, completed exercises default to collapsed and uncompleted default to expanded
  const isExerciseExpanded = (workEx: WorkoutExercise) => {
    if (workEx.isCollapsed !== undefined) {
      return !workEx.isCollapsed;
    }
    return !workEx.completed;
  };

  const handleToggleExpand = (id: string, _workEx: WorkoutExercise) => {
    toggleExerciseExpanded(userId, id);
  };

  // Track meaningful unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (isEditing && editingSession) {
      const original = useWorkoutStore.getState().userDataMap[userId]?.editingOriginalSession;
      if (!original) return false;
      return JSON.stringify(editingSession.exercises) !== JSON.stringify(original.exercises);
    }
    if (activeSession) {
      return (
        activeSession.exercises.length > 0 &&
        activeSession.exercises.some(
          (ex) =>
            Boolean(ex.notes) ||
            ex.sets.some(
              (s) =>
                (s.weight !== null && s.weight > 0) ||
                (s.reps !== null && s.reps > 0) ||
                s.completed
            )
        )
      );
    }
    return false;
  }, [isEditing, editingSession, activeSession, userId]);

  const MAIN_APP_ROUTES = ['/', '/workout', '/exercises', '/history', '/progress', '/settings'];

  // Intercept in-app navigation when unsaved changes exist (e.g. leaving the app or discarding edits)
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: any) => {
        if (!hasUnsavedChanges) return false;
        if (currentLocation.pathname === nextLocation.pathname) return false;
        // Allow seamless bottom-tab and main app navigation during an active in-progress workout session
        if (!isEditing && MAIN_APP_ROUTES.includes(nextLocation.pathname)) return false;
        return true;
      },
      [hasUnsavedChanges, isEditing]
    )
  );

  // Intercept browser refresh / window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Navigation Blocker Actions
  const handleSaveAndProceed = async () => {
    if (isFinishing) return;
    if (isEditing) {
      const success = await saveWorkoutEdits(userId);
      if (success) {
        blocker.proceed?.();
      }
    } else {
      const success = await finishWorkout(userId);
      if (success) {
        blocker.proceed?.();
      }
    }
  };

  const handleDiscardAndProceed = () => {
    if (isEditing) {
      cancelEditingWorkout(userId);
    } else {
      cancelWorkout(userId);
    }
    blocker.proceed?.();
  };

  // Explicit Header Cancel
  const handleHeaderCancel = () => {
    if (hasUnsavedChanges) {
      setIsCancelConfirmOpen(true);
    } else {
      useTimerStore.getState().stopRestTimer();
      if (isEditing) {
        cancelEditingWorkout(userId);
      } else {
        cancelWorkout(userId);
      }
      navigate('/');
    }
  };

  const confirmDiscard = () => {
    useTimerStore.getState().stopRestTimer();
    if (isEditing) {
      cancelEditingWorkout(userId);
    } else {
      cancelWorkout(userId);
    }
    setIsCancelConfirmOpen(false);
    navigate('/');
  };

  // Save Edits Handler (Post-Completion Editing)
  const handleSaveEdits = async () => {
    if (isFinishing) return;
    const success = await saveWorkoutEdits(userId);
    if (success) {
      setSaveSuccessMsg('Workout edits saved successfully!');
      setTimeout(() => {
        navigate(-1);
      }, 700);
    }
  };

  const handleExerciseDone = (currentExId: string) => {
    toggleExerciseCompleted(userId, currentExId);
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

  if (!currentSession) {
    // 0. A workout was just finished and saved: Render dedicated completion celebration view
    if (lastCompletedSession) {
      return (
        <div className="pb-12 animate-auth-entrance">
          <WorkoutCompletionScreen
            session={lastCompletedSession}
            onDone={() => {
              clearLastCompletedSession();
              navigate('/');
            }}
            onViewHistory={() => {
              clearLastCompletedSession();
              navigate('/history');
            }}
          />
        </div>
      );
    }

    // 1. TODAY'S SCHEDULED WORKOUT HAS BEEN COMPLETED AND SAVED
    if (todayCompleted) {
      const finishedTime = formatCompletionTime(todayCompleted.completedAt || todayCompleted.date);

      return (
        <div className="space-y-4 pb-12">
          <Header title="Workout Session" subtitle="Today's Workout Completed" />

          <Card className="w-full border border-[var(--success-border)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-2xl shadow-sm text-[var(--text-main)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                TODAY'S WORKOUT · {formatDayName(todayDay).toUpperCase()}
              </span>
              <span className="text-[10px] font-black text-[var(--success)] bg-[var(--success-subtle)] px-2.5 py-1 rounded-md border border-[var(--success-border)] uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                COMPLETED
              </span>
            </div>

            <div className="mb-4">
              <div className="flex flex-col mb-1">
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <span>{todayCompleted.workoutName || 'Completed Workout'}</span>
                </h2>
                {todayConfig?.name &&
                  todayCompleted.workoutName &&
                  todayCompleted.workoutName.trim().toLowerCase() !== todayConfig.name.trim().toLowerCase() && (
                    <div className="mt-1">
                      <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)] uppercase tracking-wider inline-flex items-center gap-1">
                        <span>Scheduled:</span>
                        <span className="text-[var(--text-main)] font-black">{todayConfig.name}</span>
                      </span>
                    </div>
                  )}
              </div>
              <div className="text-xs font-bold text-[var(--success)] flex items-center gap-1.5">
                <span>You're done for today!</span>
                {finishedTime && (
                  <span className="text-[var(--text-secondary)] font-medium">· Finished at {finishedTime}</span>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center mb-5">
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Exercises</div>
                <div className="text-base sm:text-lg font-black text-[var(--text-main)]">
                  {todayCompleted.exercises.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Sets Done</div>
                <div className="text-base sm:text-lg font-black text-[var(--text-main)]">
                  {todayCompleted.totalSets}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Volume</div>
                <div className="text-base sm:text-lg font-black text-[var(--primary)]">
                  {todayCompleted.totalVolume} kg
                </div>
              </div>
            </div>

            {/* Actions: Edit Workout & Completion Summary */}
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => startEditingWorkout(userId, todayCompleted)}
                className="font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Edit3 className="w-4 h-4 text-[var(--primary)]" />
                <span>Edit Workout</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setShowCompletionSummaryModal(true)}
                className="font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Trophy className="w-4 h-4 text-white" />
                <span>Summary</span>
              </Button>
            </div>

            {/* Clear Secondary Action: Start another workout session without overwriting */}
            <div className="text-center pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-center gap-3">
              <button
                onClick={() => startCustomWorkout(userId, ['chest'])}
                className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
              >
                + Start another workout session today
              </button>
              <span className="text-[var(--text-muted)] text-[10px]">•</span>
              <button
                onClick={() => setIsLogCardioOpen(true)}
                className="text-[11px] font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Flame className="w-3 h-3" />
                <span>Log cardio session</span>
              </button>
            </div>
          </Card>

          {/* Review Details Modal */}
          <Modal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            title={`Today's Workout — ${(todayCompleted.workoutName || todayConfig.name).toUpperCase()}`}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
                <div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Exercises</div>
                  <div className="text-sm font-black text-[var(--text-main)]">{todayCompleted.exercises.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Sets</div>
                  <div className="text-sm font-black text-[var(--text-main)]">{todayCompleted.totalSets}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Volume</div>
                  <div className="text-sm font-black text-[var(--primary)]">{todayCompleted.totalVolume} kg</div>
                </div>
              </div>

              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {normalizeCombinationExercises(todayCompleted.exercises).map((ex, idx) => {
                  const hasNestedStages = ex.sets && ex.sets.some((s) => s.stages && s.stages.length > 0);

                  return (
                    <div key={ex.id || idx} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3">
                      <div className="text-xs font-bold text-[var(--text-main)] mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{ex.combinationName || ex.exercise.name}</span>
                          {ex.stageDescription && (
                            <span className="text-[10px] text-[var(--text-secondary)] font-normal">
                              ({ex.stageDescription})
                            </span>
                          )}
                        </div>
                        {ex.combinationName && (
                          <span className="text-[9px] font-black uppercase text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary-border)] shrink-0">
                            {ex.techniqueLabel || 'COMBINATION'}
                          </span>
                        )}
                      </div>

                      {hasNestedStages ? (
                        <div className="space-y-1.5 mt-2">
                          {ex.sets.map((s) => (
                            <div key={s.id || s.setNumber} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2">
                              <div className="text-[11px] font-black text-[var(--text-main)] mb-1">
                                Set {s.setNumber} {s.completed ? <span className="text-[var(--success)]">✓</span> : ''}
                              </div>
                              <div className="space-y-1 pl-1">
                                {(s.stages || []).map((st, stIdx) => (
                                  <div key={st.id || stIdx} className="flex items-center justify-between text-[11px]">
                                    <span className="text-[var(--text-secondary)] truncate mr-2">
                                      Stage {st.stageOrder || stIdx + 1}: {st.exerciseName}{' '}
                                      {st.movementDescription ? `[${st.movementDescription}]` : ''}
                                    </span>
                                    <span className={st.completed ? 'text-[var(--success)] font-bold shrink-0' : 'text-[var(--text-muted)] shrink-0'}>
                                      {st.weight ?? 0}kg × {st.reps ?? 0}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ex.sets.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className={`border px-2 py-0.5 rounded text-[11px] font-semibold ${
                                s.completed
                                  ? 'bg-[var(--success-subtle)] border-[var(--success-border)] text-[var(--success)]'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                              }`}
                            >
                              Set {s.setNumber}: {s.weight}kg × {s.reps}
                            </span>
                          ))}
                        </div>
                      )}

                      {ex.notes && (
                        <div className="mt-1.5 text-[11px] text-amber-500 bg-amber-500/15 p-1.5 rounded border border-amber-500/40 italic">
                          "{ex.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setIsReviewOpen(false);
                    startEditingWorkout(userId, todayCompleted);
                  }}
                  className="font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Workout</span>
                </Button>
              </div>
            </div>
          </Modal>

          <LogCardioModal
            isOpen={isLogCardioOpen}
            onClose={() => setIsLogCardioOpen(false)}
          />

          {/* Post-Workout Completion Summary Modal */}
          {showCompletionSummaryModal && todayCompleted && (
            <Modal
              isOpen={showCompletionSummaryModal}
              onClose={() => setShowCompletionSummaryModal(false)}
              maxWidth="max-w-xl"
              title="Workout Complete"
            >
              <WorkoutCompletionScreen
                session={todayCompleted}
                isModal={true}
                onDone={() => setShowCompletionSummaryModal(false)}
                onViewHistory={() => {
                  setShowCompletionSummaryModal(false);
                  navigate('/history');
                }}
              />
            </Modal>
          )}
        </div>
      );
    }

    // 2. DEDICATED REST DAY STATE
    if (todayConfig.isRest) {
      return (
        <div className="space-y-4 pb-12">
          <Header title="Workout Session" subtitle="Rest & Recovery Day" />

          <Card className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-2xl shadow-sm text-[var(--text-main)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                TODAY'S WORKOUT · {formatDayName(todayDay).toUpperCase()}
              </span>
              <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--bg-card)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)] uppercase tracking-wider">
                REST DAY
              </span>
            </div>

            <div className="py-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
                <Coffee className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-2">
                REST DAY
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed font-medium">
                Recovery day. Let your muscles recover and get ready for your next session.
              </p>
            </div>

            <div className="text-center pt-3 border-t border-[var(--border-subtle)] flex items-center justify-center gap-3">
              <button
                onClick={() => startCustomWorkout(userId, ['chest'])}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Start an optional workout</span>
              </button>
              <span className="text-[var(--text-muted)] text-xs">•</span>
              <button
                onClick={() => setIsLogCardioOpen(true)}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Log cardio</span>
              </button>
            </div>
          </Card>

          <LogCardioModal
            isOpen={isLogCardioOpen}
            onClose={() => setIsLogCardioOpen(false)}
          />

          {/* Post-Workout Completion Summary Modal */}
          {showCompletionSummaryModal && todayCompleted && (
            <Modal
              isOpen={showCompletionSummaryModal}
              onClose={() => setShowCompletionSummaryModal(false)}
              maxWidth="max-w-xl"
              title="Workout Complete"
            >
              <WorkoutCompletionScreen
                session={todayCompleted}
                isModal={true}
                onDone={() => setShowCompletionSummaryModal(false)}
                onViewHistory={() => {
                  setShowCompletionSummaryModal(false);
                  navigate('/history');
                }}
              />
            </Modal>
          )}
        </div>
      );
    }

    // 3. NORMAL SCHEDULED WORKOUT DAY — READY TO TRAIN
    return (
      <div className="space-y-4 pb-12">
        <Header title="Workout Session" subtitle="Ready to train" />

        <Card className="w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 rounded-2xl shadow-sm text-[var(--text-main)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
              TODAY'S WORKOUT · {formatDayName(todayDay).toUpperCase()}
            </span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] uppercase tracking-tight mb-3">
              {todayConfig.name || todayConfig.muscleGroups.map((mg) => mg.displayName).join(' + ')}
            </h2>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              {todayConfig.muscleGroups.map((mg, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-[var(--text-muted)] font-normal">·</span>}
                  <span className="font-bold text-[var(--text-main)]">{mg.displayName}</span>
                </React.Fragment>
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => startTodayWorkout(userId)}
              className="font-extrabold py-3.5 sm:py-4 text-sm sm:text-base rounded-xl min-h-[48px] sm:min-h-[52px]"
            >
              <Play className="w-5 h-5 mr-2 fill-white text-white" />
              <span>START TODAY'S WORKOUT</span>
            </Button>

            <div className="text-center pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-center gap-3">
              <button
                onClick={() => startCustomWorkout(userId, ['chest'])}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Start a custom workout</span>
              </button>
              <span className="text-[var(--text-muted)] text-xs">•</span>
              <button
                onClick={() => setIsLogCardioOpen(true)}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Log cardio</span>
              </button>
            </div>
          </div>
        </Card>

        <LogCardioModal
          isOpen={isLogCardioOpen}
          onClose={() => setIsLogCardioOpen(false)}
        />
      </div>
    );
  }

  // Derive sections list from currentSession.sections or currentSession.muscleGroups
  const sectionsList: MuscleGroupConfig[] =
    currentSession.sections && currentSession.sections.length > 0
      ? currentSession.sections
      : currentSession.muscleGroups.map((mg) => ({
          name: mg,
          displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
        }));

  const handleOpenAdd = (section?: MuscleGroupConfig) => {
    setTargetSectionForAdd(section);
    setIsAddSheetOpen(true);
  };

  const handleOpenCombination = (section?: MuscleGroupConfig) => {
    setTargetSectionForCombination(section);
    setIsCombinationModalOpen(true);
  };

  const activeTitle =
    currentSession.workoutName ||
    (currentSession.sections && currentSession.sections.length > 0
      ? currentSession.sections.map((s) => s.displayName).join(' + ')
      : currentSession.muscleGroups.join(' + '));

  const activeSubtitle =
    currentSession.sections && currentSession.sections.length > 0
      ? currentSession.sections.map((s) => s.displayName).join(' · ')
      : '';

  // Check if ALL exercises across all sections are actually done
  const isAllWorkoutCompleted = useMemo(() => {
    if (isEditing) return false;
    const exercises = currentSession.exercises;
    if (!exercises || exercises.length === 0) return false;

    // 1. Every existing exercise in the session must be completed
    if (!exercises.every((ex) => ex.completed)) return false;

    // 2. If the workout has scheduled muscle sections (e.g. Chest, Shoulders, Triceps in Push B),
    // every section must contain at least 1 exercise before declaring the workout completed.
    if (sectionsList && sectionsList.length > 0) {
      const allSectionsCovered = sectionsList.every((sec) => {
        const legKey = isLegSubArea(sec.subAreas, sec.displayName);
        const secExercises = exercises.filter((ex) => {
          if (legKey) {
            return getLegSection(ex.exercise) === legKey;
          }
          if (sec.subAreas && sec.subAreas.length > 0) {
            return ex.exercise.muscleAreaEmphasis.some((area) => sec.subAreas!.includes(area));
          }
          return ex.exercise.primaryMuscle === sec.name;
        });
        return secExercises.length > 0;
      });
      if (!allSectionsCovered) return false;
    }

    return true;
  }, [isEditing, currentSession.exercises, sectionsList]);

  return (
    <div className="space-y-6 pb-36 md:pb-24 max-w-full">
      {/* Workout Sticky Header - Permanently pinned at the top on mobile & desktop */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-3 bg-[var(--bg-main)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isEditing ? 'text-amber-500' : 'text-[var(--primary)]'
                }`}
              >
                {isEditing ? 'EDITING' : 'IN PROGRESS'}
              </span>
              {/* Prominent Live Stopwatch Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{formatStopwatch(elapsedSeconds)}</span>
              </div>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[var(--text-main)] uppercase tracking-tight truncate mt-0.5">
              {activeTitle}
            </h1>
            {activeSubtitle && (
              <div className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
                {activeSubtitle}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Safe cancel action */}
            <button
              type="button"
              onClick={handleHeaderCancel}
              className="text-xs font-bold text-[var(--text-muted)] hover:text-rose-400 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Discard or exit workout"
            >
              Cancel
            </button>

            {isEditing ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdits}
                disabled={isFinishing}
                className="font-black h-9 px-3.5 shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4 mr-1 stroke-[3]" />
                <span>{isFinishing ? 'Saving...' : 'Save'}</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSummaryOpen(true)}
                className="font-black h-9 px-3.5 shadow-sm active:scale-95 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
              >
                <Check className="w-4 h-4 mr-1 stroke-[3]" />
                <span>Finish</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editing Mode Banner */}
      {isEditing && editingSession && (
        <div className="bg-[var(--bg-card)] border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-amber-500 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" />
            Editing Saved Workout
          </span>
          <span className="text-[var(--text-secondary)] font-medium">
            {formatDateShort(editingSession.date)}
          </span>
        </div>
      )}

      {/* Guest Mode Banner */}
      {isGuest && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <span>Guest Mode · Progress saved on this device only</span>
          <span className="text-[var(--primary)] font-bold">Not Synced</span>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-[var(--success-subtle)] border border-[var(--success-border)] text-[var(--success)] text-xs font-bold px-3 py-2 rounded-xl text-center">
          {saveSuccessMsg}
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="bg-[var(--danger-subtle)] border border-[var(--danger-border)] text-[var(--danger)] text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={handleSaveEdits} className="underline hover:text-[var(--text-main)] cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ⚡ Quick Routine Loader: "Load Last [Workout Name]" */}
      {!isEditing && lastMatchingCompletedSession && (
        <div className="bg-gradient-to-r from-red-600/10 via-[var(--bg-card)] to-[var(--bg-card)] border border-[var(--primary)]/30 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary)] flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-[var(--text-main)] truncate">
                  {isExactRoutineMatch
                    ? `Load Last ${targetRoutineName}`
                    : `Load Last ${targetRoutineName} Routine`}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-[var(--primary-subtle)] text-[var(--primary)] px-1.5 py-0.5 rounded-full border border-[var(--primary-border)]">
                  {lastMatchingCompletedSession.exercises.length} Exercises
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                {isExactRoutineMatch
                  ? `Autofill all ${lastMatchingCompletedSession.exercises.length} exercises from ${formatDateShort(lastMatchingCompletedSession.date)} with your latest weights & reps`
                  : `No past ${activeTitle} recorded yet. Autofill from your previous ${targetRoutineName} (${formatDateShort(lastMatchingCompletedSession.date)})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadLastMatchingRoutine}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white text-xs font-black shadow-xs cursor-pointer shrink-0 transition-all select-none touch-manipulation"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load {isExactRoutineMatch ? `Last ${targetRoutineName}` : `${targetRoutineName} Routine`}</span>
          </button>
        </div>
      )}

      {/* Render sections per targeted workout area */}
      <div className="space-y-6">
        {sectionsList.map((sec) => {
          const legKey = isLegSubArea(sec.subAreas, sec.displayName);
          const exList = currentSession.exercises.filter((ex) => {
            if (legKey) {
              return getLegSection(ex.exercise) === legKey;
            }
            if (sec.subAreas && sec.subAreas.length > 0) {
              return ex.exercise.muscleAreaEmphasis.some((area) => sec.subAreas!.includes(area));
            }
            return ex.exercise.primaryMuscle === sec.name;
          });

          return (
            <div key={sec.displayName} className="space-y-2.5">
              {/* Section Title Bar */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-sm"></span>
                  <span>{sec.displayName}</span>
                  <span className="text-xs text-[var(--text-muted)] font-normal">
                    ({exList.length})
                  </span>
                </h2>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenCombination(sec)}
                    className="px-2 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="Create a custom training combination (superset, drop set, etc.)"
                  >
                    <Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>+ Combo</span>
                  </button>

                  <button
                    onClick={() => handleOpenAdd(sec)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Exercise</span>
                  </button>
                </div>
              </div>

              {/* Sub-area Coverage Indicator */}
              <CoverageIndicator
                muscleGroup={sec.name}
                sectionTitle={sec.displayName}
                subAreas={sec.subAreas}
              />

              {/* Exercise Cards & Combination Groups */}
              {normalizeCombinationExercises(exList).map((workEx) => {
                if (
                  workEx.combinationId ||
                  (workEx.sets && workEx.sets.some((s) => Array.isArray(s.stages) && s.stages.length > 0))
                ) {
                  return (
                    <CombinationCard
                      key={workEx.combinationId || workEx.id}
                      workoutExercise={workEx}
                      isExpanded={isExerciseExpanded(workEx)}
                      onToggleExpand={() => handleToggleExpand(workEx.id, workEx)}
                    />
                  );
                }
                const exIndex = currentSession.exercises.findIndex((e) => e.id === workEx.id);
                const canMoveUp = exIndex > 0;
                const canMoveDown = exIndex < currentSession.exercises.length - 1;

                return (
                  <ExerciseCard
                    key={workEx.id}
                    workoutExercise={workEx}
                    isExpanded={isExerciseExpanded(workEx)}
                    onToggleExpand={() => handleToggleExpand(workEx.id, workEx)}
                    onDone={() => handleExerciseDone(workEx.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onMoveUp={() => moveExerciseInWorkout(userId, workEx.id, 'up')}
                    onMoveDown={() => moveExerciseInWorkout(userId, workEx.id, 'down')}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Completion Indication Banner (Active Session only) */}
      {isAllWorkoutCompleted && (
        <div className="bg-[var(--success-subtle)] border border-[var(--success-border)] rounded-2xl p-5 text-center space-y-2.5 my-4">
            <div className="w-11 h-11 rounded-full bg-[var(--success)] text-white flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wide">
              All Exercises Completed!
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Great job! Tap Finish below to save your workout and view your total volume & PR summary.
            </p>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setIsSummaryOpen(true)}
              className="bg-[var(--success)] hover:opacity-90 text-white font-black min-h-[46px] mt-1"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
              <span>FINISH & SAVE WORKOUT</span>
            </Button>
          </div>
        )}

      {/* Post-Completion Editing Bottom Save Actions */}
      {isEditing && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-2.5 mt-4">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleSaveEdits}
            disabled={isFinishing}
            className="font-extrabold min-h-[46px]"
          >
            <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
            <span>{isFinishing ? 'SAVING CHANGES...' : 'SAVE WORKOUT CHANGES'}</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleHeaderCancel}
            disabled={isFinishing}
            className="font-bold"
          >
            Cancel & Discard Changes
          </Button>
        </div>
      )}

      {/* Actions to Add New Muscle Section, Create Combination or Browse Exercise Library */}
      <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          onClick={() => handleOpenCombination()}
          className="bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Layers className="w-4 h-4 text-[var(--primary)]" />
          <span>Combination</span>
        </button>

        <button
          onClick={() => setIsAddSectionModalOpen(true)}
          className="bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4 text-[var(--primary)]" />
          <span>Muscle Group</span>
        </button>

        <button
          onClick={() => navigate('/exercises')}
          className="col-span-2 sm:col-span-1 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <BookOpen className="w-4 h-4 text-[var(--primary)]" />
          <span>Browse Library</span>
        </button>
      </div>

      {/* Modals */}
      <CreateCombinationModal
        isOpen={isCombinationModalOpen}
        onClose={() => setIsCombinationModalOpen(false)}
        preferredMuscleGroup={targetSectionForCombination?.name}
      />

      <AddExerciseSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSelectExercise={(ex) => addExerciseToWorkout(userId, ex)}
        targetMuscleGroup={targetSectionForAdd?.name}
        targetSubAreas={targetSectionForAdd?.subAreas}
        targetSectionName={targetSectionForAdd?.displayName}
        onBrowseLibrary={() => {
          setIsAddSheetOpen(false);
          navigate('/exercises');
        }}
      />

      <WorkoutSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />

      {showCompletionSummaryModal && todayCompleted && (
        <Modal
          isOpen={showCompletionSummaryModal}
          onClose={() => setShowCompletionSummaryModal(false)}
          maxWidth="max-w-xl"
          title="Workout Complete"
        >
          <WorkoutCompletionScreen
            session={todayCompleted}
            isModal={true}
            onDone={() => setShowCompletionSummaryModal(false)}
            onViewHistory={() => {
              setShowCompletionSummaryModal(false);
              navigate('/history');
            }}
          />
        </Modal>
      )}

      {/* Add Muscle Group Modal */}
      <Modal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        title="Add Muscle Group"
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            Select a muscle group to add a new section to your current workout.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {Object.values(MUSCLE_GROUPS).map((mg) => {
              const isAlreadyAdded = sectionsList.some((s) => s.name === mg.id);
              return (
                <button
                  key={mg.id}
                  disabled={isAlreadyAdded}
                  onClick={() => {
                    addMuscleSectionToWorkout(userId, mg.id);
                    setIsAddSectionModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                    isAlreadyAdded
                      ? 'bg-[var(--bg-card)]/50 border-[var(--border-subtle)] opacity-50 cursor-not-allowed'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)] cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{mg.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-[var(--text-main)]">{mg.name}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {mg.areas.length} muscle sub-areas
                      </div>
                    </div>
                  </div>

                  {isAlreadyAdded ? (
                    <span className="text-[10px] font-extrabold text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-md">
                      Added
                    </span>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--primary)] flex items-center justify-center font-black text-xs">
                      +
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Custom Confirmation Modal for Unsaved Navigation Blocker */}
      <Modal
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Workout not saved!"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[var(--text-main)]">
                Unsaved Progress Detected
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                You have an unfinished workout with unsaved progress. If you leave now, your changes may be lost.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={isFinishing}
              onClick={() => blocker.reset?.()}
              className="font-bold"
            >
              Stay in Workout
            </Button>

            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={isFinishing}
              onClick={handleSaveAndProceed}
              className="font-black"
            >
              {isFinishing
                ? 'Saving Workout...'
                : isEditing
                ? 'Save Changes & Leave'
                : 'Save Workout & Leave'}
            </Button>

            <button
              onClick={handleDiscardAndProceed}
              disabled={isFinishing}
              className="w-full text-center text-xs font-bold text-[var(--danger)] hover:opacity-80 py-2 transition-colors cursor-pointer"
            >
              Leave Without Saving
            </button>
          </div>
        </div>
      </Modal>

      {/* Header Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title={isEditing ? 'Discard Changes?' : 'Discard Workout?'}
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {isEditing
              ? 'Are you sure you want to discard your edits? Your previous saved workout will remain unchanged.'
              : 'Are you sure you want to discard this workout? All sets and progress entered during this session will be lost.'}
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsCancelConfirmOpen(false)}
              className="font-bold"
            >
              Keep Workout
            </Button>

            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={confirmDiscard}
              className="font-bold"
            >
              Discard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
