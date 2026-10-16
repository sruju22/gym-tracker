import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, AlertTriangle, Edit3, BookOpen, Eye, Coffee, Layers } from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { CombinationCard } from '../components/workout/CombinationCard';
import { CreateCombinationModal } from '../components/workout/CreateCombinationModal';
import { CoverageIndicator } from '../components/workout/CoverageIndicator';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';
import { WorkoutSummary } from '../components/workout/WorkoutSummary';
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
    startTodayWorkout,
    startCustomWorkout,
    startEditingWorkout,
    addExerciseToWorkout,
    addMuscleSectionToWorkout,
    toggleExerciseCompleted,
    cancelWorkout,
    cancelEditingWorkout,
    saveWorkoutEdits,
    finishWorkout,
    isFinishing,
    saveError,
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

  // Track explicit expansion overrides per exercise
  // By default:
  // - uncompleted exercises (and newly added exercises) are automatically EXPANDED
  // - completed exercises default to collapsed into their compact summary row
  // User can click any card header to expand or collapse it
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});

  const isExerciseExpanded = (workEx: WorkoutExercise) => {
    if (expandedOverrides[workEx.id] !== undefined) {
      return expandedOverrides[workEx.id];
    }
    return !workEx.completed;
  };

  const handleToggleExpand = (id: string, workEx: WorkoutExercise) => {
    const currentlyExpanded = isExerciseExpanded(workEx);
    setExpandedOverrides((prev) => ({
      ...prev,
      [id]: !currentlyExpanded,
    }));
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

  // Intercept in-app navigation when unsaved changes exist
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: any) => {
        if (!hasUnsavedChanges) return false;
        if (currentLocation.pathname === nextLocation.pathname) return false;
        // Mid-workout exercise library access is supported without losing progress
        if (nextLocation.pathname === '/exercises') return false;
        return true;
      },
      [hasUnsavedChanges]
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
      if (isEditing) {
        cancelEditingWorkout(userId);
      } else {
        cancelWorkout(userId);
      }
      navigate('/');
    }
  };

  const confirmDiscard = () => {
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
    setExpandedOverrides((prev) => ({
      ...prev,
      [currentExId]: false,
    }));
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
    // 1. TODAY'S SCHEDULED WORKOUT HAS BEEN COMPLETED AND SAVED
    if (todayCompleted) {
      const finishedTime = formatCompletionTime(todayCompleted.completedAt || todayCompleted.date);

      return (
        <div className="space-y-4 pb-12">
          <Header title="Workout Session" subtitle="Today's Workout Completed" />

          <Card className="w-full border border-[#22C55E]/40 bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
                TODAY'S WORKOUT · {formatDayName(todayDay).toUpperCase()}
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

            {/* Actions: Edit Workout & Review Details */}
            <div className="flex items-center gap-2.5 mb-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => startEditingWorkout(userId, todayCompleted)}
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

            {/* Clear Secondary Action: Start another workout session without overwriting */}
            <div className="text-center pt-2.5 border-t border-[#272B30]/60">
              <button
                onClick={() => startCustomWorkout(userId, ['chest'])}
                className="text-[11px] font-bold text-[#9CA3AF] hover:text-[#E11D48] transition-colors cursor-pointer"
              >
                + Start another workout session today
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
                {normalizeCombinationExercises(todayCompleted.exercises).map((ex, idx) => {
                  const hasNestedStages = ex.sets && ex.sets.some((s) => s.stages && s.stages.length > 0);

                  return (
                    <div key={ex.id || idx} className="bg-[#1B1F23] border border-[#272B30] rounded-xl p-3">
                      <div className="text-xs font-bold text-[#F5F5F5] mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{ex.combinationName || ex.exercise.name}</span>
                          {ex.stageDescription && (
                            <span className="text-[10px] text-[#9CA3AF] font-normal">
                              ({ex.stageDescription})
                            </span>
                          )}
                        </div>
                        {ex.combinationName && (
                          <span className="text-[9px] font-black uppercase text-[#E11D48] bg-[#E11D48]/15 px-1.5 py-0.2 rounded border border-[#E11D48]/30 shrink-0">
                            {ex.techniqueLabel || 'COMBINATION'}
                          </span>
                        )}
                      </div>

                      {hasNestedStages ? (
                        <div className="space-y-1.5 mt-2">
                          {ex.sets.map((s) => (
                            <div key={s.id || s.setNumber} className="bg-[#14171A] border border-[#272B30] rounded-lg p-2">
                              <div className="text-[11px] font-black text-[#F5F5F5] mb-1">
                                Set {s.setNumber} {s.completed ? <span className="text-[#22C55E]">✓</span> : ''}
                              </div>
                              <div className="space-y-1 pl-1">
                                {(s.stages || []).map((st, stIdx) => (
                                  <div key={st.id || stIdx} className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#9CA3AF] truncate mr-2">
                                      Stage {st.stageOrder || stIdx + 1}: {st.exerciseName}{' '}
                                      {st.movementDescription ? `[${st.movementDescription}]` : ''}
                                    </span>
                                    <span className={st.completed ? 'text-[#22C55E] font-bold shrink-0' : 'text-[#6B7280] shrink-0'}>
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
                                  ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]'
                                  : 'bg-[#14171A] border-[#272B30] text-[#9CA3AF]'
                              }`}
                            >
                              Set {s.setNumber}: {s.weight}kg × {s.reps}
                            </span>
                          ))}
                        </div>
                      )}

                      {ex.notes && (
                        <div className="mt-1.5 text-[11px] text-amber-300 bg-amber-500/15 p-1.5 rounded border border-amber-500/40 italic">
                          "{ex.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#272B30]">
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
        </div>
      );
    }

    // 2. DEDICATED REST DAY STATE
    if (todayConfig.isRest) {
      return (
        <div className="space-y-4 pb-12">
          <Header title="Workout Session" subtitle="Rest & Recovery Day" />

          <Card className="w-full border border-[#272B30] bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
                TODAY'S WORKOUT · {formatDayName(todayDay).toUpperCase()}
              </span>
              <span className="text-[10px] font-black text-[#9CA3AF] bg-[#1F2429] px-2.5 py-1 rounded-md border border-[#272B30] uppercase tracking-wider">
                REST DAY
              </span>
            </div>

            <div className="py-6 text-center">
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
                onClick={() => startCustomWorkout(userId, ['chest'])}
                className="text-xs font-bold text-[#9CA3AF] hover:text-[#E11D48] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Start an optional workout</span>
              </button>
            </div>
          </Card>
        </div>
      );
    }

    // 3. NORMAL SCHEDULED WORKOUT DAY — READY TO TRAIN
    return (
      <div className="space-y-4 pb-12">
        <Header title="Workout Session" subtitle="Ready to train" />

        <Card className="w-full border border-[#272B30] bg-[#14171A] p-5 sm:p-6 rounded-2xl shadow-sm text-[#F5F5F5]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] sm:text-xs font-bold text-[#6B7280] uppercase tracking-widest">
              TODAY'S WORKOUT · {formatDayName(todayDay).toUpperCase()}
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
              onClick={() => startTodayWorkout(userId)}
              className="font-extrabold py-3.5 sm:py-4 text-sm sm:text-base rounded-xl min-h-[48px] sm:min-h-[52px]"
            >
              <Play className="w-5 h-5 mr-2 fill-[#FFFFFF] text-[#FFFFFF]" />
              <span>START TODAY'S WORKOUT</span>
            </Button>

            <div className="text-center pt-3 mt-3 border-t border-[#272B30]/60">
              <button
                onClick={() => startCustomWorkout(userId, ['chest'])}
                className="text-xs font-bold text-[#9CA3AF] hover:text-[#E11D48] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Start a custom workout</span>
              </button>
            </div>
          </div>
        </Card>
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

  return (
    <div className="space-y-6 pb-24 max-w-full overflow-x-hidden">
      {/* Editing Mode Banner */}
      {isEditing && editingSession && (
        <div className="bg-[#1B1F23] border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" />
            Editing Saved Workout
          </span>
          <span className="text-[#9CA3AF] font-medium">
            {formatDateShort(editingSession.date)}
          </span>
        </div>
      )}

      {/* Guest Mode Banner */}
      {isGuest && (
        <div className="bg-[#14171A] border border-[#272B30] rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] text-[#9CA3AF]">
          <span>Guest Mode · Progress saved on this device only</span>
          <span className="text-[#E11D48] font-bold">Not Synced</span>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-xs font-bold px-3 py-2 rounded-xl text-center">
          {saveSuccessMsg}
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={handleSaveEdits} className="underline hover:text-white cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Workout Sticky Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#272B30] sticky top-0 bg-[#0B0D0F]/95 backdrop-blur-md z-20">
        <div className="min-w-0 mr-2">
          <span
            className={`text-[10px] font-extrabold uppercase tracking-widest ${
              isEditing ? 'text-amber-400' : 'text-[#E11D48]'
            }`}
          >
            {isEditing ? 'EDITING SAVED WORKOUT' : 'IN PROGRESS'}
          </span>
          <h1 className="text-lg font-black text-[#F5F5F5] uppercase tracking-tight truncate">
            {activeTitle}
          </h1>
          {activeSubtitle && (
            <div className="text-[11px] font-medium text-[#9CA3AF] truncate">
              {activeSubtitle}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleHeaderCancel}
            className="text-xs font-bold text-[#EF4444] hover:text-[#EF4444]/80 px-2 py-1 cursor-pointer"
          >
            Cancel
          </button>

          {isEditing ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdits}
              disabled={isFinishing}
              className="font-extrabold"
            >
              <Check className="w-4 h-4 mr-1 stroke-[3]" />
              <span>{isFinishing ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSummaryOpen(true)}
            >
              <Check className="w-4 h-4 mr-1 stroke-[3]" />
              <span>Finish</span>
            </Button>
          )}
        </div>
      </div>

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
                <h2 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E11D48] shadow-sm shadow-[#E11D48]/50"></span>
                  <span>{sec.displayName}</span>
                  <span className="text-xs text-[#6B7280] font-normal">
                    ({exList.length})
                  </span>
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenCombination(sec)}
                    className="text-xs font-bold text-[#9CA3AF] hover:text-[#E11D48] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Create a custom training combination (superset, drop set, etc.)"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#E11D48]" />
                    <span>+ Combination</span>
                  </button>

                  <button
                    onClick={() => handleOpenAdd(sec)}
                    className="text-xs font-bold text-[#E11D48] hover:text-[#F43F5E] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
                    />
                  );
                }
                return (
                  <ExerciseCard
                    key={workEx.id}
                    workoutExercise={workEx}
                    isExpanded={isExerciseExpanded(workEx)}
                    onToggleExpand={() => handleToggleExpand(workEx.id, workEx)}
                    onDone={() => handleExerciseDone(workEx.id)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Completion Indication Banner (Active Session only) */}
      {!isEditing &&
        currentSession.exercises.length > 0 &&
        currentSession.exercises.every((ex) => ex.completed) && (
          <div className="bg-[#22C55E]/10 border border-[#22C55E]/40 rounded-2xl p-5 text-center space-y-2.5 my-4">
            <div className="w-11 h-11 rounded-full bg-[#22C55E] text-[#0B0D0F] flex items-center justify-center mx-auto shadow-sm shadow-[#22C55E]/40">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wide">
              All Exercises Completed!
            </h3>
            <p className="text-xs text-[#9CA3AF] max-w-xs mx-auto leading-relaxed">
              Great job! Tap Finish below to save your workout and view your total volume & PR summary.
            </p>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setIsSummaryOpen(true)}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[#0B0D0F] font-black min-h-[46px] mt-1"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
              <span>FINISH & SAVE WORKOUT</span>
            </Button>
          </div>
        )}

      {/* Post-Completion Editing Bottom Save Actions */}
      {isEditing && (
        <div className="bg-[#1B1F23] border border-[#272B30] rounded-2xl p-4 space-y-2.5 mt-4">
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
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => handleOpenCombination()}
          className="bg-[#14171A] hover:bg-[#1B1F23] border border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-[#F5F5F5] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <Layers className="w-4 h-4 text-[#E11D48]" />
          <span>Create Combination</span>
        </button>

        <button
          onClick={() => setIsAddSectionModalOpen(true)}
          className="bg-[#14171A] hover:bg-[#1B1F23] border border-dashed border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-[#F5F5F5] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-[#E11D48]" />
          <span>Add Muscle Group</span>
        </button>

        <button
          onClick={() => navigate('/exercises')}
          className="bg-[#14171A] hover:bg-[#1B1F23] border border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-[#F5F5F5] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <BookOpen className="w-4 h-4 text-[#E11D48]" />
          <span>Browse Exercise Library</span>
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

      {/* Add Muscle Group Modal */}
      <Modal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        title="Add Muscle Group"
      >
        <div className="space-y-3">
          <p className="text-xs text-[#9CA3AF]">
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
                      ? 'bg-[#1B1F23]/50 border-[#272B30] opacity-50 cursor-not-allowed'
                      : 'bg-[#14171A] hover:bg-[#1B1F23] border-[#272B30] hover:border-[#E11D48]/60 cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{mg.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-[#F5F5F5]">{mg.name}</div>
                      <div className="text-[10px] text-[#9CA3AF]">
                        {mg.areas.length} muscle sub-areas
                      </div>
                    </div>
                  </div>

                  {isAlreadyAdded ? (
                    <span className="text-[10px] font-extrabold text-[#9CA3AF] bg-[#272B30] px-2 py-0.5 rounded-md">
                      Added
                    </span>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#1B1F23] border border-[#272B30] text-[#E11D48] flex items-center justify-center font-black text-xs">
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
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#F5F5F5]">
                Unsaved Progress Detected
              </h4>
              <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
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
              className="w-full text-center text-xs font-bold text-[#EF4444] hover:text-[#EF4444]/80 py-2 transition-colors cursor-pointer"
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
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
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
              className="font-bold bg-[#EF4444] hover:bg-[#DC2626] text-white"
            >
              Discard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
