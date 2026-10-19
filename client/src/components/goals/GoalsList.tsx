import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertCircle,
  Dumbbell,
  TrendingDown,
  TrendingUp,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { Goal, GoalStatus } from '../../types';
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

  const {
    getGoals,
    fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    updateGoalStatus,
  } = useWorkoutStore();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('active');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // Fetch latest goals and calculated progress
  useEffect(() => {
    if (currentUser) {
      fetchGoals(userId);
    }
  }, [currentUser, userId]);

  const rawGoals = currentUser ? getGoals(userId) : [];

  // Filter goals by status tab
  const filteredGoals = useMemo(() => {
    if (statusFilter === 'all') return rawGoals;
    if (statusFilter === 'archived') {
      return rawGoals.filter((g) => g.status === 'archived');
    }
    if (statusFilter === 'completed') {
      return rawGoals.filter((g) => g.status === 'completed' || g.isAchieved);
    }
    // Default 'active': includes both active and paused goals
    return rawGoals.filter((g) => g.status === 'active' || g.status === 'paused');
  }, [rawGoals, statusFilter]);

  // Identify Primary Goal (explicitly marked primary or first active goal)
  const primaryGoal = useMemo(() => {
    if (statusFilter === 'archived' || statusFilter === 'completed') return null;
    const explicitlyPrimary = filteredGoals.find((g) => g.isPrimary && g.status === 'active');
    if (explicitlyPrimary) return explicitlyPrimary;
    return filteredGoals.find((g) => g.status === 'active') || null;
  }, [filteredGoals, statusFilter]);

  // Secondary goals are the remaining items
  const secondaryGoals = useMemo(() => {
    if (!primaryGoal) return filteredGoals;
    return filteredGoals.filter((g) => g.id !== primaryGoal.id && (g as any)._id !== (primaryGoal as any)._id);
  }, [filteredGoals, primaryGoal]);

  const activeCount = rawGoals.filter((g) => g.status === 'active').length;
  const completedCount = rawGoals.filter((g) => g.status === 'completed' || g.isAchieved).length;

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

  const handleConfirmDelete = async () => {
    if (deletingGoal) {
      const id = deletingGoal.id || (deletingGoal as any)._id;
      await deleteGoal(userId, id);
      setIsDeleteModalOpen(false);
      setDeletingGoal(null);
    }
  };

  const handleToggleStatus = async (goal: Goal) => {
    const id = goal.id || (goal as any)._id;
    const nextStatus: GoalStatus = goal.status === 'paused' ? 'active' : 'paused';
    await updateGoalStatus(userId, id, nextStatus);
  };

  const handleArchiveGoal = async (goal: Goal) => {
    const id = goal.id || (goal as any)._id;
    const nextStatus: GoalStatus = goal.status === 'archived' ? 'active' : 'archived';
    await updateGoalStatus(userId, id, nextStatus);
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'weight_loss':
        return <TrendingDown className="w-4 h-4 text-blue-400" />;
      case 'weight_gain':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'strength':
      case 'exercise_strength':
        return <Dumbbell className="w-4 h-4 text-amber-400" />;
      case 'consistency':
        return <Trophy className="w-4 h-4 text-purple-400" />;
      default:
        return <Target className="w-4 h-4 text-[var(--primary)]" />;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'weight_loss':
        return 'Weight Loss';
      case 'weight_gain':
        return 'Weight Gain';
      case 'strength':
      case 'exercise_strength':
        return 'Strength';
      case 'consistency':
        return 'Consistency';
      default:
        return 'Fitness';
    }
  };

  const formatDaysRemaining = (targetDateStr?: string | null) => {
    if (!targetDateStr) return null;
    try {
      const target = new Date(targetDateStr).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'Deadline passed';
      if (diffDays === 0) return 'Due today';
      if (diffDays === 1) return '1 day remaining';
      return `${diffDays} days left`;
    } catch {
      return null;
    }
  };

  return (
    <Card className="flex flex-col bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl">
      {/* Header and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-xs">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
                Fitness Goals
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {activeCount} active · {completedCount} done
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">
              Target objectives with verified progress
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="gap-1.5 text-xs font-bold self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Goal</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl mb-4 overflow-x-auto no-scrollbar">
        {(['active', 'completed', 'all', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${
              statusFilter === tab
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            {tab}
            {tab === 'active' && activeCount > 0 && ` (${activeCount})`}
            {tab === 'completed' && completedCount > 0 && ` (${completedCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {/* Featured Primary Goal Hero Card */}
        {primaryGoal && (
          <div className="relative rounded-2xl bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-card)] border border-[var(--primary)]/40 p-4 sm:p-5 shadow-lg shadow-[var(--primary)]/5 space-y-4">
            {/* Header / Badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[var(--primary)]" /> Primary Goal
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center gap-1">
                    {getCategoryIcon(primaryGoal.type)}
                    {getCategoryLabel(primaryGoal.type)}
                  </span>
                  {primaryGoal.status === 'paused' && (
                    <Badge variant="warning" size="sm">
                      Paused
                    </Badge>
                  )}
                  {primaryGoal.isAchieved && (
                    <Badge variant="success" size="sm" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Achieved
                    </Badge>
                  )}
                </div>

                <h4 className="text-base sm:text-lg font-black text-[var(--text-main)] tracking-tight">
                  {primaryGoal.title}
                </h4>

                {primaryGoal.notes && (
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    {primaryGoal.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(primaryGoal)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                  title={primaryGoal.status === 'paused' ? 'Resume Goal' : 'Pause Goal'}
                >
                  {primaryGoal.status === 'paused' ? (
                    <PlayCircle className="w-4 h-4" />
                  ) : (
                    <PauseCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(primaryGoal)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                  title="Edit Goal"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleArchiveGoal(primaryGoal)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title="Archive Goal"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDelete(primaryGoal)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Target Date Chip */}
            {primaryGoal.targetDate && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Target: {new Date(primaryGoal.targetDate).toLocaleDateString()}</span>
                {formatDaysRemaining(primaryGoal.targetDate) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-muted)] font-bold">
                    {formatDaysRemaining(primaryGoal.targetDate)}
                  </span>
                )}
              </div>
            )}

            {/* Progress Section */}
            {primaryGoal.progressPercentage !== null && primaryGoal.progressPercentage !== undefined ? (
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                      Progress
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-[var(--primary)]">
                        {primaryGoal.currentValue ?? primaryGoal.startValue}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        / {primaryGoal.targetValue} {primaryGoal.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
                      {primaryGoal.progressPercentage}%
                    </span>
                    {primaryGoal.remainingDistance !== null && primaryGoal.remainingDistance !== undefined && (
                      <div className="text-[11px] font-semibold text-[var(--text-muted)]">
                        {primaryGoal.remainingDistance > 0
                          ? `${primaryGoal.remainingDistance} ${primaryGoal.unit} remaining`
                          : 'Target reached!'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Animated Progress Bar with Milestone Markers */}
                <div className="relative w-full h-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 rounded-full ${
                      primaryGoal.isAchieved ? 'bg-emerald-500' : 'bg-[var(--primary)]'
                    }`}
                    style={{ width: `${primaryGoal.progressPercentage}%` }}
                  />
                  {/* Milestone indicators at 25%, 50%, 75% */}
                  <div className="absolute top-0 bottom-0 left-1/4 w-0.5 bg-white/20" />
                  <div className="absolute top-0 bottom-0 left-2/4 w-0.5 bg-white/20" />
                  <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-white/20" />
                </div>
              </div>
            ) : (
              /* Missing Data Prompt (No fabrication) */
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-0.5">
                  <div className="font-bold">Data Required for Progress Tracking</div>
                  <div className="text-[11px] text-amber-200/90 font-medium leading-relaxed">
                    {primaryGoal.statusMessage ||
                      (primaryGoal.type.includes('weight')
                        ? 'No body weight logged yet. Log your weight in the Body Weight card above to begin calculating progress.'
                        : `No completed sets logged yet for ${primaryGoal.exerciseName || 'this exercise'}. Complete a workout with this exercise to start tracking.`)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Secondary Goals Rows */}
        {secondaryGoals.map((goal) => {
          const isExpanded = expandedGoalId === goal.id || expandedGoalId === (goal as any)._id;
          const goalId = goal.id || (goal as any)._id;
          const progress = goal.progressPercentage;

          return (
            <div
              key={goalId}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden transition-all hover:border-[var(--border-strong)]"
            >
              {/* Row Summary */}
              <div
                className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setExpandedGoalId(isExpanded ? null : goalId)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    {getCategoryIcon(goal.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                        {goal.title}
                      </span>
                      {goal.isPrimary && (
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                      {goal.isAchieved && (
                        <Badge variant="success" size="sm">
                          Done
                        </Badge>
                      )}
                      {goal.status === 'paused' && (
                        <Badge variant="warning" size="sm">
                          Paused
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-0.5">
                      <span>
                        Target: {goal.targetValue} {goal.unit}
                      </span>
                      {goal.currentValue !== null && goal.currentValue !== undefined && (
                        <span>· Current: {goal.currentValue} {goal.unit}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {progress !== null && progress !== undefined ? (
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                        {progress}%
                      </div>
                      <div className="w-16 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            goal.isAchieved ? 'bg-emerald-500' : 'bg-[var(--primary)]'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                      Log Data
                    </div>
                  )}

                  <div className="text-[var(--text-muted)]">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail Panel */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--border-subtle)]/60 bg-[var(--bg-card)]/50 space-y-3 animate-fade-in">
                  {/* Status / Missing Data message */}
                  {progress === null || progress === undefined ? (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        {goal.statusMessage ||
                          'No history available for this goal yet. Complete activities matching this target to calculate progress.'}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--bg-surface)] text-center">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                          Start
                        </span>
                        <span className="text-xs font-extrabold text-[var(--text-main)]">
                          {goal.startValue} {goal.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                          Current
                        </span>
                        <span className="text-xs font-extrabold text-[var(--primary)]">
                          {goal.currentValue ?? goal.startValue} {goal.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                          Target
                        </span>
                        <span className="text-xs font-extrabold text-[var(--text-main)]">
                          {goal.targetValue} {goal.unit}
                        </span>
                      </div>
                    </div>
                  )}

                  {goal.targetDate && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Target Date: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      {formatDaysRemaining(goal.targetDate) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-muted)] font-bold">
                          {formatDaysRemaining(goal.targetDate)}
                        </span>
                      )}
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-xs text-[var(--text-secondary)] font-medium italic">
                      "{goal.notes}"
                    </p>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleStatus(goal)}
                      className="text-xs py-1 px-2.5 h-auto font-bold gap-1"
                    >
                      {goal.status === 'paused' ? (
                        <>
                          <PlayCircle className="w-3 h-3 text-emerald-400" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3 h-3 text-amber-400" />
                          <span>Pause</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(goal)}
                      className="text-xs py-1 px-2.5 h-auto font-bold gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleArchiveGoal(goal)}
                      className="text-xs py-1 px-2.5 h-auto font-bold gap-1 text-[var(--text-muted)] hover:text-amber-400"
                    >
                      <Archive className="w-3 h-3" />
                      <span>{goal.status === 'archived' ? 'Unarchive' : 'Archive'}</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDelete(goal)}
                      className="text-xs py-1 px-2.5 h-auto font-bold gap-1 text-[var(--text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty States */}
        {filteredGoals.length === 0 && (
          <div className="text-center py-8 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--primary)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">
                No {statusFilter !== 'all' ? statusFilter : ''} goals found
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 max-w-xs mx-auto">
                Set measurable fitness goals to track your strength milestones, body changes, and consistency.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs font-bold mx-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Fitness Goal</span>
            </Button>
          </div>
        )}
      </div>

      {/* Goal Edit / Create Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        goal={editingGoal}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={async (data) => {
          if (editingGoal) {
            const id = editingGoal.id || (editingGoal as any)._id;
            await updateGoal(userId, id, data);
          } else {
            await addGoal(userId, data);
          }
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Fitness Goal"
        message={`Are you sure you want to delete the goal "${deletingGoal?.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingGoal(null);
        }}
      />
    </Card>
  );
};
