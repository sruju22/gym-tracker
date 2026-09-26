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
  const userId = currentUser?.id || 'user_srujan';

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
    const existing = currentDayConfig.muscleGroups;
    if (existing.some((m) => m.name === selectedMuscleToAdd)) return;

    const mgInfo = MUSCLE_GROUPS[selectedMuscleToAdd];
    const displayName = mgInfo ? mgInfo.name : selectedMuscleToAdd;
    const allSubAreas = mgInfo ? mgInfo.areas.map((s) => s.id) : [];

    const newMuscleConfig = {
      name: selectedMuscleToAdd,
      displayName,
      subAreas: allSubAreas,
      exerciseCount: 3,
    };

    setEditedPlan((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        muscleGroups: [...prev[activeDay].muscleGroups, newMuscleConfig],
      },
    }));
  };

  const handleRemoveMuscleGroup = (index: number) => {
    setEditedPlan((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        muscleGroups: prev[activeDay].muscleGroups.filter((_, i) => i !== index),
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
                    ? 'bg-[#E11D48] text-[#FFFFFF] border-[#F43F5E] font-black shadow-sm shadow-[#E11D48]/20'
                    : dayCfg.isRest
                    ? 'bg-[#14171A] text-[#6B7280] border-[#272B30]'
                    : 'bg-[#1B1F23] text-[#F5F5F5] border-[#272B30] hover:bg-[#23282D]'
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
        <div className="bg-[#14171A] border border-[#272B30] rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                Workout Name ({activeDay.toUpperCase()})
              </label>
              <input
                type="text"
                value={currentDayConfig.name}
                onChange={(e) => handleUpdateDayName(e.target.value)}
                disabled={currentDayConfig.isRest}
                className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-sm font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48] disabled:opacity-50"
                placeholder="e.g. Push A"
              />
            </div>

            <button
              onClick={handleToggleRest}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer mt-5 ${
                currentDayConfig.isRest
                  ? 'bg-[#E11D48]/15 text-[#E11D48] border-[#E11D48]/40'
                  : 'bg-[#1B1F23] text-[#9CA3AF] border-[#272B30] hover:text-[#F5F5F5]'
              }`}
            >
              {currentDayConfig.isRest ? 'Rest Day (ON)' : 'Set Rest Day'}
            </button>
          </div>

          {!currentDayConfig.isRest ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#F5F5F5] uppercase tracking-wider">
                  Assigned Muscle Groups ({currentDayConfig.muscleGroups.length})
                </span>
              </div>

              <div className="space-y-2">
                {currentDayConfig.muscleGroups.map((mg, index) => (
                  <div
                    key={`${mg.name}_${index}`}
                    className="flex items-center justify-between bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell className="w-4 h-4 text-[#E11D48]" />
                      <span className="text-xs font-bold text-[#F5F5F5] capitalize truncate">
                        {mg.displayName || mg.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveMuscleGroup(index)}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors cursor-pointer"
                      title="Remove muscle group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {currentDayConfig.muscleGroups.length === 0 && (
                  <div className="text-center py-4 text-xs text-[#9CA3AF] italic">
                    No muscle groups assigned yet. Add one below.
                  </div>
                )}
              </div>

              {/* Add Muscle Group Control */}
              <div className="flex gap-2 pt-2 border-t border-[#272B30]">
                <select
                  value={selectedMuscleToAdd}
                  onChange={(e) => setSelectedMuscleToAdd(e.target.value as MuscleGroup)}
                  className="flex-1 bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48] capitalize"
                >
                  {Object.values(MUSCLE_GROUPS).map((mg) => (
                    <option key={mg.id} value={mg.id}>
                      {mg.name}
                    </option>
                  ))}
                </select>

                <Button variant="secondary" size="sm" onClick={handleAddMuscleGroup} className="gap-1">
                  <Plus className="w-3.5 h-3.5 text-[#E11D48]" />
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-[#9CA3AF] bg-[#1B1F23]/50 rounded-xl border border-[#272B30]">
              😴 This day is marked as Rest Day. No muscles assigned.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs text-[#9CA3AF]">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </Button>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="w-4 h-4" />
              Save Plan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
