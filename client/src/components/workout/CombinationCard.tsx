import React, { useState } from 'react';
import {
  Layers,
  ChevronUp,
  Trash2,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { WorkoutExercise, CombinationType } from '../../types';
import { Card } from '../ui/Card';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { normalizeCombinationExercises } from '../../utils/combinationNormalizer';

interface CombinationCardProps {
  workoutExercise?: WorkoutExercise;
  // Backward compatibility props:
  combinationId?: string;
  combinationName?: string;
  combinationType?: CombinationType;
  exercises?: WorkoutExercise[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const CombinationCard: React.FC<CombinationCardProps> = ({
  workoutExercise,
  combinationId: legacyComboId,
  combinationName: legacyComboName,
  combinationType: _legacyComboType,
  exercises: legacyExercises,
  isExpanded,
  onToggleExpand,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const {
    updateCombinationStage,
    toggleCombinationStageCompleted,
    toggleCombinationSetCompleted,
    addRoundToCombination,
    removeSetFromCombination,
    removeCombinationFromWorkout,
  } = useWorkoutStore();

  const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Resolve the single WorkoutExercise container (normalizing legacy multi-exercise array if passed)
  const workEx: WorkoutExercise | null = React.useMemo(() => {
    if (workoutExercise) {
      if (workoutExercise.sets && workoutExercise.sets.some((s) => Array.isArray(s.stages) && s.stages.length > 0)) {
        return workoutExercise;
      }
      const normalized = normalizeCombinationExercises([workoutExercise]);
      return normalized[0] || workoutExercise;
    }
    if (legacyExercises && legacyExercises.length > 0) {
      const normalized = normalizeCombinationExercises(legacyExercises);
      return normalized[0] || null;
    }
    return null;
  }, [workoutExercise, legacyExercises]);

  if (!workEx) return null;

  const combinationId = workEx.combinationId || legacyComboId || workEx.id;
  const combinationName = workEx.combinationName || legacyComboName || 'Custom Combination';
  const techniqueLabel = workEx.techniqueLabel || 'COMBINATION';

  const cardExpanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  // Determine stage count and completed sets
  const sets = workEx.sets || [];
  const stageCount = sets[0]?.stages?.length || 0;

  // Calculate completed volume
  let comboVolume = 0;

  sets.forEach((set) => {
    if (set.stages && set.stages.length > 0) {
      set.stages.forEach((st) => {
        if (st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0) {
          comboVolume += st.weight * st.reps;
        }
      });
    } else if (set.completed && set.weight !== null && set.weight > 0 && set.reps !== null && set.reps > 0) {
      comboVolume += set.weight * set.reps;
    }
  });

  const isAllCompleted =
    sets.length > 0 && sets.every((s) => s.completed || (s.stages && s.stages.length > 0 && s.stages.every((st) => st.completed)));

  // Collapsed Completed View
  if (!cardExpanded && isAllCompleted) {
    return (
      <div
        onClick={toggleExpand}
        className="mb-3 bg-[var(--bg-surface)] border border-[var(--success-border)] hover:border-[var(--success)] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-xs"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="w-7 h-7 rounded-full bg-[var(--success-subtle)] border border-[var(--success-border)] text-[var(--success)] flex items-center justify-center font-black shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-black uppercase text-[var(--success)] bg-[var(--success-subtle)] px-1.5 py-0.2 rounded border border-[var(--success-border)]">
                {techniqueLabel}
              </span>
              <span className="truncate min-w-0">{combinationName}</span>
            </div>
            <div className="text-[11px] text-[var(--success)] font-bold truncate mt-0.5">
              {sets.length} sets • {stageCount} stages • {comboVolume} kg
            </div>
          </div>
        </div>

        <div className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg shrink-0 hover:text-[var(--text-main)] transition-colors">
          Edit
        </div>
      </div>
    );
  }

  // Collapsed In-Progress View
  if (!cardExpanded && !isAllCompleted) {
    return (
      <div
        onClick={toggleExpand}
        className="mb-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--primary)] flex items-center justify-center font-black text-xs shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-black uppercase text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary-border)]">
                {techniqueLabel}
              </span>
              <span className="truncate min-w-0">{combinationName}</span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
              {sets.length} sets • {stageCount} stages {comboVolume > 0 ? `• ${comboVolume} kg` : ''}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-extrabold text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary-border)] px-2.5 py-1 rounded-lg shrink-0">
          Expand
        </div>
      </div>
    );
  }

  // Expanded Active View: Sets contain stages!
  return (
    <>
      <Card
        className={`mb-4 border transition-all ${
          isAllCompleted
            ? 'border-[var(--success-border)] bg-[var(--bg-surface)] shadow-md'
            : 'border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-md'
        }`}
      >
        {/* Combination Outer Header */}
        <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div
            onClick={toggleExpand}
            className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary-border)] px-1.5 py-0.2 rounded">
                  {techniqueLabel}
                </span>
                <h3 className="text-sm sm:text-base font-black text-[var(--text-main)] truncate leading-tight">
                  {combinationName}
                </h3>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>
                  {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                </span>
                <span>•</span>
                <span>
                  {stageCount} {stageCount === 1 ? 'stage' : 'stages'}
                </span>
                {comboVolume > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[var(--primary)] font-bold">{comboVolume} kg volume</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleExpand}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              title="Collapse combination"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
              title="Remove combination"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PARENT ROWS/CARDS: Sets contain stages */}
        <div className="space-y-3">
          {sets.map((set, setIdx) => {
            const isSetCompleted =
              set.completed || (set.stages && set.stages.length > 0 && set.stages.every((st) => st.completed));

            return (
              <div
                key={set.id || `set_${setIdx}`}
                className={`rounded-xl border p-3 transition-colors ${
                  isSetCompleted
                    ? 'bg-[var(--bg-card)] border-[var(--success-border)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                }`}
              >
                {/* Set Parent Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                      SET {set.setNumber}
                    </span>
                    {isSetCompleted ? (
                      <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success-subtle)] border border-[var(--success-border)] px-1.5 py-0.2 rounded">
                        Done
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {set.stages?.filter((s) => s.completed).length || 0}/{set.stages?.length || 0} completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Completing a set means completing all required movements within that set */}
                    <button
                      type="button"
                      onClick={() => toggleCombinationSetCompleted(userId, workEx.id, setIdx)}
                      className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isSetCompleted
                          ? 'bg-[var(--success)] text-white border-[var(--success)] hover:opacity-90'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--success)] hover:text-[var(--success)]'
                      }`}
                      title={isSetCompleted ? 'Mark set incomplete' : 'Mark all stages in this set complete'}
                    >
                      <Check className={`w-3.5 h-3.5 ${isSetCompleted ? 'stroke-[3]' : 'text-[var(--text-muted)]'}`} />
                      <span>{isSetCompleted ? 'Completed' : 'Complete Set'}</span>
                    </button>

                    {sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSetFromCombination(userId, workEx.id, setIdx)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                        title="Remove this set"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* NESTED STAGES inside this set */}
                <div className="space-y-2">
                  {(set.stages || []).map((stage, stageIdx) => {
                    const isStageCompleted = stage.completed;

                    return (
                      <div
                        key={stage.id || `st_${setIdx}_${stageIdx}`}
                        className={`rounded-lg p-2.5 border transition-all ${
                          isStageCompleted
                            ? 'bg-[var(--bg-surface)] border-[var(--success-border)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                        }`}
                      >
                        {/* Stage Identification & Target Hint */}
                        <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-subtle)] px-1.5 py-0.2 rounded shrink-0">
                              Stage {stage.stageOrder || stageIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-main)] truncate">
                              {stage.exerciseName}
                            </span>
                            {stage.movementDescription && (
                              <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary-border)] px-1.5 py-0.2 rounded shrink-0 truncate max-w-[150px]">
                                {stage.movementDescription}
                              </span>
                            )}
                          </div>

                          {(stage.targetWeight !== null || stage.targetReps !== null) && (
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                              Target:{' '}
                              {stage.targetWeight !== null && stage.targetWeight !== undefined
                                ? `${stage.targetWeight}kg × `
                                : ''}
                              {stage.targetReps ?? 10} reps
                            </span>
                          )}
                        </div>

                        {/* Stage Performance Inputs: Weight, Reps, and Individual Done Check */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Weight Input */}
                            <div className="flex-1 min-w-[70px]">
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  placeholder={stage.targetWeight ? String(stage.targetWeight) : '0'}
                                  value={stage.weight !== null && stage.weight !== undefined ? stage.weight : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                    updateCombinationStage(
                                      userId,
                                      workEx.id,
                                      setIdx,
                                      stageIdx,
                                      isNaN(val as number) ? null : val,
                                      stage.reps
                                    );
                                  }}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs font-bold text-[var(--text-main)] text-center rounded-lg py-1.5 px-2 outline-none transition-colors"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] pointer-events-none">
                                  kg
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-bold text-[var(--text-muted)]">×</span>

                            {/* Reps Input */}
                            <div className="flex-1 min-w-[70px]">
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder={stage.targetReps ? String(stage.targetReps) : '0'}
                                  value={stage.reps !== null && stage.reps !== undefined ? stage.reps : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                    updateCombinationStage(
                                      userId,
                                      workEx.id,
                                      setIdx,
                                      stageIdx,
                                      stage.weight,
                                      isNaN(val as number) ? null : val
                                    );
                                  }}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs font-bold text-[var(--text-main)] text-center rounded-lg py-1.5 px-2 outline-none transition-colors"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] pointer-events-none">
                                  reps
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stage Complete Checkmark Button */}
                          <button
                            type="button"
                            onClick={() => toggleCombinationStageCompleted(userId, workEx.id, setIdx, stageIdx)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                              isStageCompleted
                                ? 'bg-[var(--success)] text-white border-[var(--success)]'
                                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--success)] hover:text-[var(--success)]'
                            }`}
                            title={isStageCompleted ? 'Mark stage incomplete' : 'Complete stage'}
                          >
                            <Check className={`w-4 h-4 ${isStageCompleted ? 'stroke-[3]' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Combination Bottom Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-subtle)] gap-2">
          <button
            type="button"
            onClick={() => addRoundToCombination(userId, combinationId)}
            className="text-xs font-bold text-[var(--primary)] hover:opacity-80 flex items-center gap-1.5 cursor-pointer bg-[var(--primary-subtle)] px-3 py-1.5 rounded-lg border border-[var(--primary-border)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Set</span>
          </button>

          <button
            type="button"
            onClick={toggleExpand}
            className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] transition-colors"
          >
            <span>Done</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-[var(--text-main)]">Remove Combination</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to remove <span className="text-[var(--text-main)] font-bold">{combinationName}</span> and all its logged sets from this workout session?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeCombinationFromWorkout(userId, combinationId);
                  setIsDeleteConfirmOpen(false);
                }}
                className="text-xs font-bold text-white bg-[var(--danger)] hover:opacity-90 px-3 py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
