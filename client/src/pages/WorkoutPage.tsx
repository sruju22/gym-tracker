import React, { useState } from 'react';
import { Play, Plus, Check, Dumbbell } from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { CoverageIndicator } from '../components/workout/CoverageIndicator';
import { AddExerciseSheet } from '../components/workout/AddExerciseSheet';
import { WorkoutSummary } from '../components/workout/WorkoutSummary';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Exercise, MuscleGroupConfig, MuscleGroup } from '../types';
import { MUSCLE_GROUPS } from '../data/muscleGroups';

export const WorkoutPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const {
    getActiveSession,
    startTodayWorkout,
    addExerciseToWorkout,
    addMuscleSectionToWorkout,
    cancelWorkout,
  } = useWorkoutStore();

  const activeSession = getActiveSession(userId);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [targetSectionForAdd, setTargetSectionForAdd] = useState<MuscleGroupConfig | undefined>(
    undefined
  );

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <Header title="Workout Session" subtitle="No active workout" />

        <Card className="text-center py-10 my-4 border-dashed border-[#272B30] bg-[#14171A]">
          <div className="w-14 h-14 rounded-2xl bg-[#E11D48]/15 text-[#E11D48] border border-[#E11D48]/40 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#F5F5F5] mb-1">Ready to Train?</h2>
          <p className="text-xs text-[#9CA3AF] max-w-xs mx-auto mb-5">
            Launch today's scheduled workout session or create a custom workout.
          </p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => startTodayWorkout(userId)}
          >
            <Play className="w-5 h-5 mr-2 fill-[#FFFFFF] text-[#FFFFFF]" />
            <span>START TODAY'S WORKOUT</span>
          </Button>
        </Card>
      </div>
    );
  }

  // Derive sections list from activeSession.sections or activeSession.muscleGroups
  const sectionsList: MuscleGroupConfig[] = activeSession.sections && activeSession.sections.length > 0
    ? activeSession.sections
    : activeSession.muscleGroups.map((mg) => ({
        name: mg,
        displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
      }));

  const handleOpenAdd = (section?: MuscleGroupConfig) => {
    setTargetSectionForAdd(section);
    setIsAddSheetOpen(true);
  };

  const handleSelectSuggested = (exercise: Exercise) => {
    addExerciseToWorkout(userId, exercise);
  };

  const activeTitle = activeSession.workoutName || (
    activeSession.sections && activeSession.sections.length > 0
      ? activeSession.sections.map((s) => s.displayName).join(' + ')
      : activeSession.muscleGroups.join(' + ')
  );

  const activeSubtitle = activeSession.sections && activeSession.sections.length > 0
    ? activeSession.sections.map((s) => s.displayName).join(' · ')
    : '';

  return (
    <div className="space-y-6 pb-24 max-w-full overflow-x-hidden">
      {/* Workout Active Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#272B30] sticky top-0 bg-[#0B0D0F]/95 backdrop-blur-md z-20">
        <div>
          <span className="text-[10px] font-extrabold text-[#E11D48] uppercase tracking-widest">
            IN PROGRESS
          </span>
          <h1 className="text-lg font-black text-[#F5F5F5] uppercase tracking-tight">
            {activeTitle}
          </h1>
          {activeSubtitle && (
            <div className="text-[11px] font-medium text-[#9CA3AF]">
              {activeSubtitle}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => cancelWorkout(userId)}
            className="text-xs font-bold text-[#EF4444] hover:text-[#EF4444]/80 px-2 py-1 cursor-pointer"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSummaryOpen(true)}
          >
            <Check className="w-4 h-4 mr-1 stroke-[3]" />
            <span>Finish</span>
          </Button>
        </div>
      </div>

      {/* Render sections per targeted workout area */}
      <div className="space-y-6">
        {sectionsList.map((sec) => {
          const exList = activeSession.exercises.filter((ex) => {
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

                <button
                  onClick={() => handleOpenAdd(sec)}
                  className="text-xs font-bold text-[#E11D48] hover:text-[#F43F5E] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exercise</span>
                </button>
              </div>

              {/* Sub-area Coverage Indicator for this specific section */}
              <CoverageIndicator
                muscleGroup={sec.name}
                sectionTitle={sec.displayName}
                subAreas={sec.subAreas}
              />

              {/* Exercise Cards in this section */}
              {exList.map((workEx) => (
                <ExerciseCard
                  key={workEx.id}
                  workoutExercise={workEx}
                  isExpanded={activeExerciseId === workEx.id}
                  onToggleExpand={() =>
                    setActiveExerciseId(activeExerciseId === workEx.id ? null : workEx.id)
                  }
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Action to Add New Muscle / Workout Section */}
      <div className="pt-2">
        <button
          onClick={() => setIsAddSectionModalOpen(true)}
          className="w-full bg-[#14171A] hover:bg-[#1B1F23] border border-dashed border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-bold text-[#F5F5F5] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-[#E11D48]" />
          <span>+ Add Muscle Group</span>
        </button>
      </div>

      {/* Modals */}
      <AddExerciseSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSelectExercise={(ex) => addExerciseToWorkout(userId, ex)}
        targetMuscleGroup={targetSectionForAdd?.name}
        targetSubAreas={targetSectionForAdd?.subAreas}
        targetSectionName={targetSectionForAdd?.displayName}
      />

      <WorkoutSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />

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
    </div>
  );
};
