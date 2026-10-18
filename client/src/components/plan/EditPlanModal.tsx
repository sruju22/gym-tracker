import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { DayOfWeek, WeeklySchedule, DayConfig, MuscleGroup } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';
import { Plus, Trash2, RotateCcw, Save, Dumbbell } from 'lucide-react';

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK: { id: DayOfWeek; shortLabel: string }[] = [
  { id: 'monday', shortLabel: 'Mon' },
  { id: 'tuesday', shortLabel: 'Tue' },
  { id: 'wednesday', shortLabel: 'Wed' },
  { id: 'thursday', shortLabel: 'Thu' },
  { id: 'friday', shortLabel: 'Fri' },
  { id: 'saturday', shortLabel: 'Sat' },
  { id: 'sunday', shortLabel: 'Sun' },
];

export const EditPlanModal: React.FC<EditPlanModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const { getWeeklyPlan, updateWeeklyPlan, resetWeeklyPlan } = useWorkoutStore();

  const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');
  const [editedPlan, setEditedPlan] = useState<WeeklySchedule>(() => getWeeklyPlan(userId));
  const [selectedMuscleToAdd, setSelectedMuscleToAdd] = useState<MuscleGroup>('chest');

  useEffect(() => {
    if (isOpen) {
      setEditedPlan(JSON.parse(JSON.stringify(getWeeklyPlan(userId))));
    }
  }, [isOpen, userId, getWeeklyPlan]);

  if (!isOpen) return null;

  const currentDayConfig: DayConfig = editedPlan[activeDay];

  const handleUpdateDayName = (newName: string) => {
    setEditedPlan((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        name: newName,
      },
    }));
  };

  const handleToggleRest = () => {
    setEditedPlan((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        isRest: !prev[activeDay].isRest,
      },
    }));
  };

  const handleAddMuscleGroup = () => {
    const mgMeta = MUSCLE_GROUPS[selectedMuscleToAdd];
    if (!mgMeta) return;

    const alreadyAdded = currentDayConfig.muscleGroups.some((m) => m.name === selectedMuscleToAdd);
    if (alreadyAdded) return;

    setEditedPlan((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        muscleGroups: [
          ...prev[activeDay].muscleGroups,
          {
            name: selectedMuscleToAdd,
            displayName: mgMeta.name.toUpperCase(),
            subAreas: mgMeta.areas.map((a) => a.id),
          },
        ],
      },
    }));
  };

  const handleRemoveMuscleGroup = (index: number) => {
    setEditedPlan((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        muscleGroups: prev[activeDay].muscleGroups.filter((_, idx) => idx !== index),
      },
    }));
  };

  const handleSave = () => {
    updateWeeklyPlan(userId, editedPlan);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Reset workout split to default schedule?')) {
      resetWeeklyPlan(userId);
      setEditedPlan(JSON.parse(JSON.stringify(getWeeklyPlan(userId))));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Workout Plan">
      <div className="space-y-4">
        {/* Day Selector Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
          {DAYS_OF_WEEK.map(({ id, shortLabel }) => {
            const dayCfg = editedPlan[id];
            const isActive = activeDay === id;
            return (
              <button
                key={id}
                onClick={() => setActiveDay(id)}
                className={`flex-1 min-w-[44px] py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] font-black shadow-sm shadow-red-500/20'
                    : dayCfg.isRest
                    ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">{shortLabel}</div>
                <div className="text-xs truncate font-extrabold mt-0.5">
                  {dayCfg.isRest ? 'Rest' : dayCfg.name.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Day Config Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Workout Name ({activeDay.toUpperCase()})
              </label>
              <input
                type="text"
                value={currentDayConfig.name}
                onChange={(e) => handleUpdateDayName(e.target.value)}
                disabled={currentDayConfig.isRest}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
                placeholder="e.g. Push A"
              />
            </div>

            <button
              onClick={handleToggleRest}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer mt-5 ${
                currentDayConfig.isRest
                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary-border)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
              }`}
            >
              {currentDayConfig.isRest ? 'Rest Day (ON)' : 'Set Rest Day'}
            </button>
          </div>

          {!currentDayConfig.isRest ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">
                  Assigned Muscle Groups ({currentDayConfig.muscleGroups.length})
                </span>
              </div>

              <div className="space-y-2">
                {currentDayConfig.muscleGroups.map((mg, index) => (
                  <div
                    key={`${mg.name}_${index}`}
                    className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell className="w-4 h-4 text-[var(--primary)]" />
                      <span className="text-xs font-bold text-[var(--text-main)] capitalize truncate">
                        {mg.displayName || mg.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveMuscleGroup(index)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                      title="Remove muscle group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {currentDayConfig.muscleGroups.length === 0 && (
                  <div className="text-center py-4 text-xs text-[var(--text-secondary)] italic">
                    No muscle groups assigned. Add muscles below to build this day's routine.
                  </div>
                )}
              </div>

              {/* Add Muscle Section */}
              <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <select
                  value={selectedMuscleToAdd}
                  onChange={(e) => setSelectedMuscleToAdd(e.target.value as MuscleGroup)}
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] capitalize"
                >
                  {Object.keys(MUSCLE_GROUPS).map((mgKey) => (
                    <option key={mgKey} value={mgKey}>
                      {MUSCLE_GROUPS[mgKey as MuscleGroup].name}
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddMuscleGroup}
                  className="gap-1 px-3 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Muscle</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
              This day is designated as a complete rest day for recovery.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Split</span>
          </Button>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
