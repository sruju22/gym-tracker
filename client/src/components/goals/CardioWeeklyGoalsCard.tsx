import React, { useState, useMemo } from 'react';
import {
  Flame,
  CheckCircle2,
  Edit2,
  Clock,
  Footprints,
  Calendar,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { calculateCardioWeeklyProgress } from '../../utils/cardioGoals';
import { CardioWeeklyGoalSettings, DistanceUnit } from '../../types';

interface CardioWeeklyGoalsCardProps {
  onNavigateToLogCardio?: () => void;
}

export const CardioWeeklyGoalsCard: React.FC<CardioWeeklyGoalsCardProps> = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getCardioSessions, getCardioGoals, updateCardioGoals } = useWorkoutStore();

  const sessions = getCardioSessions(userId);
  const settings = getCardioGoals(userId);

  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states for edit modal
  const [durationEnabled, setDurationEnabled] = useState(settings.durationMinutes.enabled);
  const [durationTarget, setDurationTarget] = useState(settings.durationMinutes.target.toString());

  const [distanceEnabled, setDistanceEnabled] = useState(settings.distance.enabled);
  const [distanceTarget, setDistanceTarget] = useState(settings.distance.target.toString());
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(settings.distance.unit || 'km');

  const [sessionsEnabled, setSessionsEnabled] = useState(settings.sessions.enabled);
  const [sessionsTarget, setSessionsTarget] = useState(settings.sessions.target.toString());

  // Calculate dynamic weekly progress
  const weeklyProgress = useMemo(() => {
    return calculateCardioWeeklyProgress(sessions, settings);
  }, [sessions, settings]);

  const { items, activeCount, completedCount, allCompleted, weekLabel } = weeklyProgress;

  const handleOpenEdit = () => {
    setDurationEnabled(settings.durationMinutes.enabled);
    setDurationTarget(settings.durationMinutes.target.toString());
    setDistanceEnabled(settings.distance.enabled);
    setDistanceTarget(settings.distance.target.toString());
    setDistanceUnit(settings.distance.unit || 'km');
    setSessionsEnabled(settings.sessions.enabled);
    setSessionsTarget(settings.sessions.target.toString());
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedDur = Math.max(1, parseInt(durationTarget, 10) || 150);
    const parsedDist = Math.max(0.1, parseFloat(distanceTarget) || 10);
    const parsedSess = Math.max(1, parseInt(sessionsTarget, 10) || 3);

    const updated: Partial<CardioWeeklyGoalSettings> = {
      durationMinutes: {
        enabled: durationEnabled,
        target: parsedDur,
      },
      distance: {
        enabled: distanceEnabled,
        target: parsedDist,
        unit: distanceUnit,
      },
      sessions: {
        enabled: sessionsEnabled,
        target: parsedSess,
      },
    };

    updateCardioGoals(userId, updated);
    setIsEditOpen(false);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'duration':
        return <Clock className="w-4 h-4 text-orange-400" />;
      case 'distance':
        return <Footprints className="w-4 h-4 text-sky-400" />;
      case 'sessions':
      default:
        return <Calendar className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <>
      <Card className="flex flex-col bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-xs">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">
                  Weekly Cardio Goals
                </h3>
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    {completedCount} of {activeCount} met
                  </span>
                )}
                {allCompleted && (
                  <Badge variant="success" size="sm" className="gap-1 font-bold text-[10px]">
                    <Trophy className="w-3 h-3 text-emerald-400" />
                    All Met!
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                Current Week ({weekLabel})
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenEdit}
            className="gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Targets</span>
          </Button>
        </div>

        {/* Goals List / Empty State */}
        {activeCount === 0 ? (
          <div className="py-6 px-4 text-center border border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)]/50 space-y-2">
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              No weekly cardio goals are currently enabled.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenEdit}
              className="text-xs font-bold gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Configure Weekly Targets</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items
              .filter((item) => item.enabled)
              .map((goal) => {
                return (
                  <div
                    key={goal.type}
                    className="p-3 sm:p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          {getIconForType(goal.type)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                            <span>{goal.label}</span>
                            {goal.isCompleted && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-medium">
                            {goal.formattedCurrent} / {goal.formattedTarget}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-black ${
                            goal.isCompleted ? 'text-emerald-400' : 'text-[var(--text-main)]'
                          }`}
                        >
                          {goal.percentage}%
                        </span>
                        <div className="text-[10px] text-[var(--text-secondary)] font-medium">
                          {goal.formattedRemaining}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar with milestone styling */}
                    <div className="relative w-full h-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          goal.isCompleted ? 'bg-emerald-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(goal.current > 0 ? 4 : 0, goal.percentage))}%` }}
                      />
                      {/* Milestone indicators at 25%, 50%, 75% */}
                      <div className="absolute top-0 bottom-0 left-1/4 w-0.5 bg-white/10" />
                      <div className="absolute top-0 bottom-0 left-2/4 w-0.5 bg-white/10" />
                      <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-white/10" />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Edit Weekly Goals Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Configure Weekly Cardio Goals"
        maxWidth="max-w-md"
      >
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Set weekly targets for cardio duration, distance, and session consistency.
        </p>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {/* Goal 1: Duration */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="goal-toggle-duration"
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id="goal-toggle-duration"
                  type="checkbox"
                  checked={durationEnabled}
                  onChange={(e) => setDurationEnabled(e.target.checked)}
                  className="rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  Weekly Cardio Duration
                </span>
              </label>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">Minutes</span>
            </div>

            {durationEnabled && (
              <div className="pt-1">
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={durationTarget}
                  onChange={(e) => setDurationTarget(e.target.value)}
                  placeholder="e.g. 150"
                  unit="mins"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  150 minutes per week is the standard aerobic exercise guideline.
                </p>
              </div>
            )}
          </div>

          {/* Goal 2: Distance */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="goal-toggle-distance"
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id="goal-toggle-distance"
                  type="checkbox"
                  checked={distanceEnabled}
                  onChange={(e) => setDistanceEnabled(e.target.checked)}
                  className="rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  Weekly Cardio Distance
                </span>
              </label>
              <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                {(['km', 'mi'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setDistanceUnit(unit)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      distanceUnit === unit
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            {distanceEnabled && (
              <div className="pt-1">
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={distanceTarget}
                  onChange={(e) => setDistanceTarget(e.target.value)}
                  placeholder="e.g. 15"
                  unit={distanceUnit}
                />
              </div>
            )}
          </div>

          {/* Goal 3: Sessions */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="goal-toggle-sessions"
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id="goal-toggle-sessions"
                  type="checkbox"
                  checked={sessionsEnabled}
                  onChange={(e) => setSessionsEnabled(e.target.checked)}
                  className="rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  Weekly Number of Sessions
                </span>
              </label>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">Count</span>
            </div>

            {sessionsEnabled && (
              <div className="pt-1">
                <Input
                  type="number"
                  min="1"
                  max="14"
                  step="1"
                  value={sessionsTarget}
                  onChange={(e) => setSessionsTarget(e.target.value)}
                  placeholder="e.g. 3"
                  unit="sessions"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              Save Targets
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
