import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Check,
  Bookmark,
  Sparkles,
  Shuffle,
  TrendingDown,
  Edit2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Exercise,
  CombinationType,
  MuscleGroup,
  SavedCombination,
} from '../../types';
import { ExerciseSelectModal } from './ExerciseSelectModal';
import {
  suggestTechnique,
  generateDefaultCombinationName,
} from '../../utils/techniqueSuggester';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface CreateCombinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferredMuscleGroup?: MuscleGroup;
}

interface BuilderStage {
  id: string;
  exercise: Exercise | null;
  movementDescription: string;
  targetWeight: number | null;
  targetReps: number | null;
}

export const CreateCombinationModal: React.FC<CreateCombinationModalProps> = ({
  isOpen,
  onClose,
  preferredMuscleGroup,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const {
    getSavedCombinations,
    saveCombinationTemplate,
    deleteCombinationTemplate,
    addCombinationToWorkout,
    getExercises,
  } = useWorkoutStore();

  const savedTemplates = getSavedCombinations(userId);
  const allExercises = getExercises(userId);

  // Screen modes: 'options' | 'builder' | 'saved'
  const [screen, setScreen] = useState<'options' | 'builder' | 'saved'>('options');
  const [selectedType, setSelectedType] = useState<CombinationType>('combine_exercises');

  // Builder state
  const [rounds, setRounds] = useState<number>(3);
  const [stages, setStages] = useState<BuilderStage[]>([]);
  const [combinationName, setCombinationName] = useState<string>('');
  const [techniqueLabel, setTechniqueLabel] = useState<string>('Custom Combination');
  const [isEditingTechnique, setIsEditingTechnique] = useState<boolean>(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);

  // Exercise Picker sub-modal
  const [pickerStageIndex, setPickerStageIndex] = useState<number | null>(null);

  const handleClose = () => {
    setScreen('options');
    setIsEditingTechnique(false);
    setSaveAsTemplate(false);
    onClose();
  };

  // Helper to find a default exercise from the preferred muscle group
  const getDefaultExercise = (): Exercise | null => {
    if (preferredMuscleGroup) {
      const found = allExercises.find((e) => e.primaryMuscle === preferredMuscleGroup);
      if (found) return found;
    }
    return allExercises[0] || null;
  };

  // Initialize shared builder based on chosen entry option
  const handleSelectOption = (type: CombinationType) => {
    setSelectedType(type);
    setRounds(3);
    setSaveAsTemplate(false);
    setIsEditingTechnique(false);

    const defaultEx = getDefaultExercise();

    switch (type) {
      case 'combine_exercises': {
        // Starts with 2 exercise slots
        const secondEx =
          allExercises.find(
            (e) =>
              e.primaryMuscle === (preferredMuscleGroup || defaultEx?.primaryMuscle) &&
              e.id !== defaultEx?.id
          ) || defaultEx;

        const initialStages: BuilderStage[] = [
          {
            id: `st_${Date.now()}_1`,
            exercise: defaultEx,
            movementDescription: '',
            targetWeight: null,
            targetReps: 10,
          },
          {
            id: `st_${Date.now()}_2`,
            exercise: secondEx,
            movementDescription: '',
            targetWeight: null,
            targetReps: 12,
          },
        ];
        setStages(initialStages);
        const suggestion = suggestTechnique(
          initialStages.map((s) => ({
            exerciseId: s.exercise?.id,
            exerciseName: s.exercise?.name,
          })),
          type
        );
        setTechniqueLabel(suggestion.label);
        setCombinationName(
          generateDefaultCombinationName(
            initialStages.map((s) => ({ exerciseName: s.exercise?.name })),
            type,
            suggestion.label
          )
        );
        break;
      }

      case 'combine_movements': {
        // Starts with 1 parent exercise and 2 movement stages
        const initialStages: BuilderStage[] = [
          {
            id: `st_${Date.now()}_1`,
            exercise: defaultEx,
            movementDescription: 'Partial Reps',
            targetWeight: null,
            targetReps: 8,
          },
          {
            id: `st_${Date.now()}_2`,
            exercise: defaultEx,
            movementDescription: 'Full Reps',
            targetWeight: null,
            targetReps: 8,
          },
        ];
        setStages(initialStages);
        const suggestion = suggestTechnique(
          initialStages.map((s) => ({
            exerciseId: s.exercise?.id,
            exerciseName: s.exercise?.name,
            movementDescription: s.movementDescription,
          })),
          type
        );
        setTechniqueLabel(suggestion.label);
        setCombinationName(
          generateDefaultCombinationName(
            initialStages.map((s) => ({ exerciseName: s.exercise?.name })),
            type,
            suggestion.label
          )
        );
        break;
      }

      case 'change_weights': {
        // Starts with 1 exercise and 3 weight change stages
        const initialStages: BuilderStage[] = [
          {
            id: `st_${Date.now()}_1`,
            exercise: defaultEx,
            movementDescription: 'Heavy Weight',
            targetWeight: 50,
            targetReps: 8,
          },
          {
            id: `st_${Date.now()}_2`,
            exercise: defaultEx,
            movementDescription: 'Reduce Weight',
            targetWeight: 40,
            targetReps: 10,
          },
          {
            id: `st_${Date.now()}_3`,
            exercise: defaultEx,
            movementDescription: 'Burnout',
            targetWeight: 30,
            targetReps: 12,
          },
        ];
        setStages(initialStages);
        const suggestion = suggestTechnique(
          initialStages.map((s) => ({
            exerciseId: s.exercise?.id,
            exerciseName: s.exercise?.name,
            targetWeight: s.targetWeight,
          })),
          type
        );
        setTechniqueLabel(suggestion.label);
        setCombinationName(
          generateDefaultCombinationName(
            initialStages.map((s) => ({ exerciseName: s.exercise?.name })),
            type,
            suggestion.label
          )
        );
        break;
      }

      case 'build_own':
      default: {
        // Starts blank with 1 empty stage
        const initialStages: BuilderStage[] = [
          {
            id: `st_${Date.now()}_1`,
            exercise: defaultEx,
            movementDescription: '',
            targetWeight: null,
            targetReps: 10,
          },
        ];
        setStages(initialStages);
        setTechniqueLabel('Custom Combination');
        setCombinationName('Custom Combination');
        break;
      }
    }

    setScreen('builder');
  };

  // Re-evaluate technique and name suggestions when stages change
  const currentSuggestion = useMemo(() => {
    return suggestTechnique(
      stages.map((s) => ({
        exerciseId: s.exercise?.id,
        exerciseName: s.exercise?.name,
        movementDescription: s.movementDescription,
        targetWeight: s.targetWeight,
        targetReps: s.targetReps,
      })),
      selectedType
    );
  }, [stages, selectedType]);

  // Stage Manipulation
  const handleUpdateStage = (
    index: number,
    field: keyof BuilderStage,
    value: any
  ) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddStage = (templateExercise?: Exercise | null, defaultMovement?: string) => {
    const parentEx = templateExercise || stages[0]?.exercise || getDefaultExercise();
    const newStage: BuilderStage = {
      id: `st_${Date.now()}_${stages.length + 1}`,
      exercise: parentEx,
      movementDescription: defaultMovement || '',
      targetWeight: null,
      targetReps: 10,
    };
    setStages((prev) => [...prev, newStage]);
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    setStages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  // Apply suggestion
  const handleApplySuggestion = () => {
    setTechniqueLabel(currentSuggestion.label);
    const generatedName = generateDefaultCombinationName(
      stages.map((s) => ({ exerciseName: s.exercise?.name })),
      selectedType,
      currentSuggestion.label
    );
    if (!combinationName || combinationName.startsWith('Custom') || combinationName.includes('Combo')) {
      setCombinationName(generatedName);
    }
  };

  // Load an existing saved template into the active workout or builder
  const handleUseSavedTemplate = (template: SavedCombination) => {
    const templateStages = template.stages.map((s) => {
      const foundEx = allExercises.find((e) => e.id === s.exerciseId) || {
        id: s.exerciseId,
        name: s.exerciseName,
        primaryMuscle: 'chest',
        secondaryMuscles: [],
        muscleAreaEmphasis: [],
        equipment: 'dumbbell',
        exerciseType: 'isolation',
        difficulty: 'intermediate',
        instructions: [],
        imageUrl: '',
        tags: [],
        isCustom: false,
      };

      return {
        exercise: foundEx as Exercise,
        movementDescription: s.movementDescription,
        targetWeight: s.targetWeight,
        targetReps: s.targetReps,
      };
    });

    addCombinationToWorkout(userId, {
      combinationName: template.name,
      combinationType: template.type,
      techniqueLabel: template.techniqueLabel,
      rounds: template.rounds,
      stages: templateStages,
    });

    handleClose();
  };

  const handleEditSavedTemplate = (template: SavedCombination) => {
    setSelectedType(template.type);
    setRounds(template.rounds);
    setTechniqueLabel(template.techniqueLabel || 'Custom Combination');
    setCombinationName(template.name);

    const loadedStages: BuilderStage[] = template.stages.map((s, idx) => {
      const foundEx = allExercises.find((e) => e.id === s.exerciseId) || {
        id: s.exerciseId,
        name: s.exerciseName,
        primaryMuscle: 'chest',
        secondaryMuscles: [],
        muscleAreaEmphasis: [],
        equipment: 'dumbbell',
        exerciseType: 'isolation',
        difficulty: 'intermediate',
        instructions: [],
        imageUrl: '',
        tags: [],
        isCustom: false,
      };

      return {
        id: `st_${Date.now()}_${idx}`,
        exercise: foundEx as Exercise,
        movementDescription: s.movementDescription || '',
        targetWeight: s.targetWeight ?? null,
        targetReps: s.targetReps ?? null,
      };
    });

    setStages(loadedStages);
    setScreen('builder');
  };

  // Validation
  const isValid = useMemo(() => {
    if (stages.length === 0) return false;
    return stages.every((s) => s.exercise !== null);
  }, [stages]);

  // Final Action: Save & Add to Workout
  const handleAddToWorkout = async () => {
    if (!isValid) return;

    const finalName =
      combinationName.trim() ||
      generateDefaultCombinationName(
        stages.map((s) => ({ exerciseName: s.exercise?.name })),
        selectedType,
        techniqueLabel
      );

    const stagesPayload = stages.map((s) => ({
      exercise: s.exercise!,
      movementDescription: s.movementDescription.trim() || undefined,
      targetWeight: s.targetWeight,
      targetReps: s.targetReps,
    }));

    // If user opted to save for future workouts, persist as template
    if (saveAsTemplate) {
      await saveCombinationTemplate(userId, {
        name: finalName,
        type: selectedType,
        techniqueLabel,
        rounds,
        stages: stagesPayload.map((s, idx) => ({
          id: `stage_${idx + 1}`,
          exerciseId: s.exercise.id,
          exerciseName: s.exercise.name,
          movementDescription: s.movementDescription,
          targetWeight: s.targetWeight,
          targetReps: s.targetReps,
        })),
      });
    }

    // Add workout instance to active session
    addCombinationToWorkout(userId, {
      combinationName: finalName,
      combinationType: selectedType,
      techniqueLabel,
      rounds,
      stages: stagesPayload,
    });

    handleClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={
          screen === 'options'
            ? 'Create a Combination'
            : screen === 'saved'
            ? 'Saved Combinations'
            : selectedType === 'combine_exercises'
            ? 'Combine Exercises'
            : selectedType === 'combine_movements'
            ? 'Combine Movements'
            : selectedType === 'change_weights'
            ? 'Change Weights'
            : 'Build My Own'
        }
      >
        {/* ============================================================ */}
        {/* 1. INITIAL SCREEN — FOUR SIMPLE OPTIONS                      */}
        {/* ============================================================ */}
        {screen === 'options' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  What are you planning to do?
                </p>
              </div>

              {savedTemplates.length > 0 && (
                <button
                  onClick={() => setScreen('saved')}
                  className="text-xs font-bold text-[var(--primary)] hover:opacity-80 flex items-center gap-1 cursor-pointer bg-[var(--primary-subtle)] px-2.5 py-1 rounded-lg border border-[var(--primary-border)] transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved ({savedTemplates.length})</span>
                </button>
              )}
            </div>

            {/* Four Compact Selectable Cards */}
            <div className="space-y-2.5">
              {/* Option 1: Combine Exercises */}
              <button
                onClick={() => handleSelectOption('combine_exercises')}
                className="w-full text-left p-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all cursor-pointer group flex items-start justify-between"
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                      Combine Exercises
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Combine two or more exercises in a chosen order.
                    </p>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      <span className="text-[var(--text-secondary)]">e.g.</span>
                      <span>Curl → Hammer Curl → Reverse Curl</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] shrink-0 mt-1 transition-colors" />
              </button>

              {/* Option 2: Combine Movements */}
              <button
                onClick={() => handleSelectOption('combine_movements')}
                className="w-full text-left p-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all cursor-pointer group flex items-start justify-between"
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                      Combine Movements
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Define multiple stages within the same exercise or equipment setup.
                    </p>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      <span className="text-[var(--text-secondary)]">e.g.</span>
                      <span>Partial Reps → Full Reps</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] shrink-0 mt-1 transition-colors" />
              </button>

              {/* Option 3: Change Weights */}
              <button
                onClick={() => handleSelectOption('change_weights')}
                className="w-full text-left p-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all cursor-pointer group flex items-start justify-between"
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                      Change Weights
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Define stages with individual weight and repetition targets.
                    </p>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] mt-1 flex items-center gap-1">
                      <span className="text-[var(--text-secondary)]">e.g.</span>
                      <span>Heavy Weight → Reduce Weight → Continue</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] shrink-0 mt-1 transition-colors" />
              </button>

              {/* Option 4: Build My Own */}
              <button
                onClick={() => handleSelectOption('build_own')}
                className="w-full text-left p-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all cursor-pointer group flex items-start justify-between"
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                      Build My Own
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Start with a blank builder where you can create any custom sequence.
                    </p>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] mt-1">
                      Blank sequence with exercises, movement & weight stages
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] shrink-0 mt-1 transition-colors" />
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. REUSABLE COMBINATION BUILDER                              */}
        {/* ============================================================ */}
        {screen === 'builder' && (
          <div className="space-y-4">
            {/* Header Navigation & Rounds Selector */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <button
                onClick={() => setScreen('options')}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Type</span>
              </button>

              <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">Rounds:</span>
                <button
                  type="button"
                  onClick={() => setRounds((r) => Math.max(1, r - 1))}
                  className="w-5 h-5 rounded bg-[var(--bg-surface)] text-[var(--text-main)] hover:text-[var(--primary)] text-xs font-black flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="text-xs font-black text-[var(--primary)] w-4 text-center">
                  {rounds}
                </span>
                <button
                  type="button"
                  onClick={() => setRounds((r) => Math.min(10, r + 1))}
                  className="w-5 h-5 rounded bg-[var(--bg-surface)] text-[var(--text-main)] hover:text-[var(--primary)] text-xs font-black flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-2.5"
                >
                  {/* Stage Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary-border)] px-1.5 py-0.5 rounded">
                        Stage {idx + 1}
                      </span>
                      {selectedType === 'combine_movements' && (
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                          Movement Stage
                        </span>
                      )}
                      {selectedType === 'change_weights' && (
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                          Weight Stage
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveStage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer"
                        title="Move stage up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStage(idx, 'down')}
                        disabled={idx === stages.length - 1}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer"
                        title="Move stage down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer ml-1"
                          title="Remove stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Exercise Picker Trigger */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setPickerStageIndex(idx)}
                      className="w-full text-left p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-[var(--text-main)] truncate">
                          {stage.exercise?.name || 'Tap to select exercise...'}
                        </div>
                        {stage.exercise && (
                          <div className="text-[10px] text-[var(--text-secondary)] capitalize">
                            {stage.exercise.primaryMuscle} • {stage.exercise.equipment || 'Standard'}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-extrabold text-[var(--primary)] bg-[var(--primary-subtle)] px-2 py-0.5 rounded shrink-0">
                        {stage.exercise ? 'Change' : 'Select'}
                      </span>
                    </button>
                  </div>

                  {/* Movement Description (for combine_movements, change_weights, or build_own) */}
                  {(selectedType === 'combine_movements' ||
                    selectedType === 'change_weights' ||
                    selectedType === 'build_own') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-bold">
                        <span>Movement / Stage Label</span>
                      </div>
                      <input
                        type="text"
                        value={stage.movementDescription}
                        onChange={(e) =>
                          handleUpdateStage(idx, 'movementDescription', e.target.value)
                        }
                        placeholder="e.g., Partial Reps, Drop 1, Slow Tempo"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
                      />
                      {/* Quick Chips for Common Movement Variations */}
                      {selectedType === 'combine_movements' && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {['Partial Reps', 'Full Reps', 'Top Half', 'Bottom Half', 'Slow Tempo', 'Hold'].map(
                            (chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() =>
                                  handleUpdateStage(idx, 'movementDescription', chip)
                                }
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                  stage.movementDescription === chip
                                    ? 'bg-[var(--primary-subtle)] border-[var(--primary)] text-[var(--primary)]'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                                }`}
                              >
                                {chip}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Target Weight & Reps */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">
                        Target Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={stage.targetWeight !== null ? stage.targetWeight : ''}
                        onChange={(e) =>
                          handleUpdateStage(
                            idx,
                            'targetWeight',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        placeholder="Optional"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">
                        Target Reps
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={stage.targetReps !== null ? stage.targetReps : ''}
                        onChange={(e) =>
                          handleUpdateStage(
                            idx,
                            'targetReps',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        placeholder="e.g., 10"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Stage Buttons based on entry option */}
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedType === 'combine_exercises' && (
                <button
                  type="button"
                  onClick={() => handleAddStage(null)}
                  className="flex-1 py-2 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--primary)] flex items-center justify-center gap-1.5 bg-[var(--bg-card)]/60 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Exercise</span>
                </button>
              )}

              {selectedType === 'combine_movements' && (
                <button
                  type="button"
                  onClick={() => handleAddStage(stages[0]?.exercise, 'Burnout')}
                  className="flex-1 py-2 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--primary)] flex items-center justify-center gap-1.5 bg-[var(--bg-card)]/60 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Movement Stage</span>
                </button>
              )}

              {selectedType === 'change_weights' && (
                <button
                  type="button"
                  onClick={() => {
                    const lastWeight = stages[stages.length - 1]?.targetWeight;
                    const nextWeight = lastWeight ? Math.max(5, lastWeight - 10) : null;
                    handleAddStage(stages[0]?.exercise, `Drop ${stages.length}`);
                    if (nextWeight) {
                      handleUpdateStage(stages.length, 'targetWeight', nextWeight);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--primary)] flex items-center justify-center gap-1.5 bg-[var(--bg-card)]/60 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Weight Stage</span>
                </button>
              )}

              {selectedType === 'build_own' && (
                <div className="w-full grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddStage(null)}
                    className="py-2 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1 bg-[var(--bg-card)]/60 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Exercise</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStage(stages[0]?.exercise, 'Stage Variation')}
                    className="py-2 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1 bg-[var(--bg-card)]/60 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Stage Variation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Technique Label & Name Customization */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-2.5">
              {/* Technique Suggestion Row */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                  Technique Recognition:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary-border)] px-2 py-0.5 rounded">
                    {techniqueLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTechnique(!isEditingTechnique)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    title="Edit technique label"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Suggestion prompt if different from current label */}
              {currentSuggestion.label !== techniqueLabel && (
                <div className="flex items-center justify-between bg-[var(--bg-surface)] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-[11px]">
                  <span className="text-amber-500 font-semibold">
                    Suggested: {currentSuggestion.label}
                  </span>
                  <button
                    type="button"
                    onClick={handleApplySuggestion}
                    className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Editable Technique Input */}
              {isEditingTechnique && (
                <div>
                  <input
                    type="text"
                    value={techniqueLabel}
                    onChange={(e) => setTechniqueLabel(e.target.value)}
                    placeholder="Custom Combination, Superset, Drop Set, etc."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
              )}

              {/* Combination Name */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">
                  Combination Name
                </label>
                <input
                  type="text"
                  value={combinationName}
                  onChange={(e) => setCombinationName(e.target.value)}
                  placeholder="e.g., Biceps Tri-Set"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:border-[var(--primary)] focus:outline-none font-bold"
                />
              </div>

              {/* Save As Template Checkbox */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] text-[var(--primary)] focus:ring-0 focus:ring-offset-0 bg-[var(--bg-input)] w-4 h-4"
                />
                <span className="text-xs text-[var(--text-main)] font-medium">
                  Save combination for future workouts
                </span>
              </label>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleClose}
                className="flex-1 font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!isValid}
                onClick={handleAddToWorkout}
                className="flex-1 font-black min-h-[44px]"
              >
                <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
                <span>Add to Workout</span>
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. SAVED COMBINATION TEMPLATES                               */}
        {/* ============================================================ */}
        {screen === 'saved' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <button
                onClick={() => setScreen('options')}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Options</span>
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                {savedTemplates.length} saved
              </span>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary-border)]">
                          {template.techniqueLabel || 'COMBINATION'}
                        </span>
                        <h4 className="text-xs font-black text-[var(--text-main)]">
                          {template.name}
                        </h4>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
                        {template.stages.map((s) => s.exerciseName).join(' → ')}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {template.rounds} rounds • {template.stages.length} stages
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCombinationTemplate(userId, template.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => handleEditSavedTemplate(template)}
                      className="flex-1 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      Customize
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseSavedTemplate(template)}
                      className="flex-1 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[11px] font-black text-white transition-colors cursor-pointer"
                    >
                      Use in Workout
                    </button>
                  </div>
                </div>
              ))}

              {savedTemplates.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)] space-y-1">
                  <Bookmark className="w-6 h-6 mx-auto text-[var(--text-muted)] opacity-60" />
                  <p>No saved combination templates yet.</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Create a combination and check "Save combination for future workouts".
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Exercise Picker Sub-Modal */}
      {pickerStageIndex !== null && (
        <ExerciseSelectModal
          isOpen={pickerStageIndex !== null}
          onClose={() => setPickerStageIndex(null)}
          preferredMuscleGroup={preferredMuscleGroup}
          onSelect={(selectedEx) => {
            handleUpdateStage(pickerStageIndex, 'exercise', selectedEx);
            setPickerStageIndex(null);
          }}
        />
      )}
    </>
  );
};
