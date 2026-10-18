import React, { useState } from 'react';
import { Target, Plus, Edit2, Trash2, Scale, CheckCircle2 } from 'lucide-react';
import { Goal } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { GoalModal } from './GoalModal';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';

export const GoalsList: React.FC = () => {
  const { currentUser, updateProfile } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getGoals, addGoal, updateGoal, deleteGoal, updateCurrentWeight } = useWorkoutStore();
  const goals = currentUser ? getGoals(userId) : [];

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleOpenDelete = (goal: Goal) => {
    setDeletingGoal(goal);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingGoal) {
      deleteGoal(userId, deletingGoal.id);
      setIsDeleteModalOpen(false);
      setDeletingGoal(null);
    }
  };

  const handleOpenWeightInput = () => {
    setWeightInput(currentUser?.currentWeight ? String(currentUser.currentWeight) : '');
    setWeightError(null);
    setShowWeightInput(true);
  };

  const handleUpdateWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val < 20 || val > 500) {
      setWeightError('Weight must be between 20 and 500 kg');
      return;
    }
    setWeightError(null);
    setIsUpdatingWeight(true);
    try {
      const rounded = Math.round(val * 10) / 10;
      await updateProfile({ currentWeight: rounded });
      updateCurrentWeight(userId, rounded);
      setShowWeightInput(false);
      setWeightInput('');
    } catch (err: any) {
      console.error('Failed to update weight:', err);
      setWeightError(err?.message || 'Failed to update weight');
    } finally {
      setIsUpdatingWeight(false);
    }
  };

  const bodyWeightGoal = goals.find((g) => g.type === 'body_weight');
  const displayedWeight = currentUser?.currentWeight ?? bodyWeightGoal?.currentValue ?? null;
  const unitLabel = currentUser?.weightUnit || bodyWeightGoal?.unit || 'kg';

  return (
    <Card className="flex-1 flex flex-col justify-between bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl min-h-0">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
              Fitness Goals ({goals.length})
            </h3>
          </div>

          <Button variant="primary" size="sm" onClick={handleOpenAdd} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Goal</span>
          </Button>
        </div>

        {/* Quick Body Weight Log Row */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">Log Current Body Weight</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {currentUser?.name || 'Current'}:{' '}
                {displayedWeight !== null ? (
                  <span className="text-[var(--text-main)] font-bold">
                    {displayedWeight} {unitLabel}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] italic">Not set</span>
                )}
              </div>
            </div>
          </div>

          {!showWeightInput ? (
            <button
              onClick={handleOpenWeightInput}
              className="text-xs font-extrabold text-[var(--primary)] hover:opacity-80 transition-opacity cursor-pointer self-start sm:self-auto"
            >
              Update Weight
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  placeholder={unitLabel}
                  value={weightInput}
                  onChange={(e) => {
                    setWeightInput(e.target.value);
                    if (weightError) setWeightError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateWeight();
                    if (e.key === 'Escape') {
                      setShowWeightInput(false);
                      setWeightError(null);
                    }
                  }}
                  disabled={isUpdatingWeight}
                  className="w-20 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpdateWeight}
                  disabled={isUpdatingWeight}
                  className="px-2.5 py-1 min-h-[30px] text-xs font-bold"
                >
                  {isUpdatingWeight ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowWeightInput(false);
                    setWeightError(null);
                  }}
                  disabled={isUpdatingWeight}
                  className="px-2 py-1 min-h-[30px] text-xs"
                >
                  Cancel
                </Button>
              </div>
              {weightError && (
                <div className="text-[10px] text-[var(--danger)] font-medium">
                  {weightError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goals List */}
        <div className="space-y-2.5">
          {goals.map((goal) => {
            const isIncreasing = goal.targetValue >= goal.startValue;

            let percentage = 0;
            if (goal.type === 'exercise_strength') {
              percentage = Math.min(100, Math.max(0, Math.round((goal.currentValue / goal.targetValue) * 100)));
            } else if (isIncreasing) {
              const totalDist = goal.targetValue - goal.startValue;
              const currentDist = goal.currentValue - goal.startValue;
              percentage = totalDist > 0 ? Math.min(100, Math.max(0, Math.round((currentDist / totalDist) * 100))) : 100;
            } else {
              const totalDist = goal.startValue - goal.targetValue;
              const currentDist = goal.startValue - goal.currentValue;
              percentage = totalDist > 0 ? Math.min(100, Math.max(0, Math.round((currentDist / totalDist) * 100))) : 100;
            }

            const isCompleted = percentage >= 100;

            return (
              <div key={goal.id} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[var(--text-main)]">{goal.title}</span>
                      {isCompleted && (
                        <Badge variant="success" size="sm" className="gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[var(--success)]" /> Achieved
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
                      Current: <span className="text-[var(--primary)] font-bold">{goal.currentValue} {goal.unit}</span> · Goal: <span className="text-[var(--text-main)] font-bold">{goal.targetValue} {goal.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(goal)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)]">
                    <span>Progress: {goal.startValue} → {goal.targetValue} {goal.unit}</span>
                    <span className={isCompleted ? 'text-[var(--success)]' : 'text-[var(--primary)]'}>{percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isCompleted ? 'bg-[var(--success)]' : 'bg-[var(--primary)]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="text-center py-6 text-xs text-[var(--text-secondary)] italic">
              No active fitness goals. Click "Add Goal" above to create one!
            </div>
          )}
        </div>
      </div>

      <GoalModal
        isOpen={isGoalModalOpen}
        goal={editingGoal}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={async (data) => {
          if (editingGoal) {
            updateGoal(userId, editingGoal.id, data);
          } else {
            addGoal(userId, data);
          }
          if (data.type === 'body_weight' && typeof data.currentValue === 'number' && data.currentValue > 0) {
            try {
              await updateProfile({ currentWeight: data.currentValue });
              updateCurrentWeight(userId, data.currentValue);
            } catch (err) {
              console.error('Failed to sync body weight goal to profile:', err);
            }
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Fitness Goal"
        message={`Are you sure you want to delete "${deletingGoal?.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingGoal(null);
        }}
      />
    </Card>
  );
};
