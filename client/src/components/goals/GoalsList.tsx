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
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getGoals, addGoal, updateGoal, deleteGoal, updateCurrentWeight } = useWorkoutStore();
  const goals = currentUser ? getGoals(userId) : [];

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);

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

  const handleUpdateWeight = () => {
    const val = parseFloat(weightInput);
    if (!isNaN(val) && val > 0) {
      updateCurrentWeight(userId, val);
      setShowWeightInput(false);
      setWeightInput('');
    }
  };

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
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[var(--text-secondary)]" />
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">Log Current Body Weight</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {currentUser?.name}: <span className="text-[var(--text-main)] font-bold">{goals.find((g) => g.type === 'body_weight')?.currentValue || 66} kg</span>
              </div>
            </div>
          </div>

          {!showWeightInput ? (
            <button
              onClick={() => setShowWeightInput(true)}
              className="text-xs font-extrabold text-[var(--primary)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              Update Weight
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                placeholder="kg"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-16 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
              <Button variant="primary" size="sm" onClick={handleUpdateWeight} className="px-2 py-1 min-h-[30px] text-xs">
                Save
              </Button>
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
        onSave={(data) => {
          if (editingGoal) {
            updateGoal(userId, editingGoal.id, data);
          } else {
            addGoal(userId, data);
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
