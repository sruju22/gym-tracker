import React, { useState, useEffect } from 'react';
import { Goal, GoalType, MuscleGroup } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface GoalModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (goalData: {
    title: string;
    type: GoalType;
    exerciseId?: string;
    exerciseName?: string;
    startValue: number;
    currentValue: number;
    targetValue: number;
    unit: 'kg' | 'lbs';
  }) => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, goal, onClose, onSave }) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';
  const { getExercises } = useWorkoutStore();
  const exercises = getExercises(userId);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<GoalType>('body_weight');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [startValue, setStartValue] = useState<number | ''>('');
  const [currentValue, setCurrentValue] = useState<number | ''>('');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setType(goal.type);
      setSelectedExerciseId(goal.exerciseId || '');
      setStartValue(goal.startValue);
      setCurrentValue(goal.currentValue);
      setTargetValue(goal.targetValue);
      setUnit(goal.unit);
    } else {
      setTitle('Target Body Weight');
      setType('body_weight');
      setSelectedExerciseId(exercises[0]?.id || '');
      setStartValue(66);
      setCurrentValue(66);
      setTargetValue(72);
      setUnit('kg');
    }
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: GoalType) => {
    setType(newType);
    if (newType === 'body_weight') {
      setTitle('Target Body Weight');
      setStartValue(66);
      setCurrentValue(66);
      setTargetValue(72);
    } else {
      const ex = exercises.find((e) => e.id === selectedExerciseId) || exercises[0];
      setTitle(`${ex?.name || 'Exercise'} Target`);
      setStartValue(60);
      setCurrentValue(60);
      setTargetValue(100);
    }
  };

  const handleExerciseChange = (exId: string) => {
    setSelectedExerciseId(exId);
    const ex = exercises.find((e) => e.id === exId);
    if (ex && type === 'exercise_strength') {
      setTitle(`${ex.name} Target`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startValue === '' || currentValue === '' || targetValue === '') return;

    const selectedEx = exercises.find((e) => e.id === selectedExerciseId);

    onSave({
      title: title.trim() || (type === 'body_weight' ? 'Body Weight Goal' : `${selectedEx?.name} Goal`),
      type,
      exerciseId: type === 'exercise_strength' ? selectedExerciseId : undefined,
      exerciseName: type === 'exercise_strength' ? selectedEx?.name : undefined,
      startValue: Number(startValue),
      currentValue: Number(currentValue),
      targetValue: Number(targetValue),
      unit,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? 'Edit Fitness Goal' : 'Create Fitness Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
            Goal Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('body_weight')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                type === 'body_weight'
                  ? 'bg-[#E11D48] text-[#FFFFFF] border-[#F43F5E]'
                  : 'bg-[#1B1F23] text-[#9CA3AF] border-[#272B30] hover:text-[#F5F5F5]'
              }`}
            >
              ⚖️ Body Weight
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('exercise_strength')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                type === 'exercise_strength'
                  ? 'bg-[#E11D48] text-[#FFFFFF] border-[#F43F5E]'
                  : 'bg-[#1B1F23] text-[#9CA3AF] border-[#272B30] hover:text-[#F5F5F5]'
              }`}
            >
              🏋️ Strength / Lift
            </button>
          </div>
        </div>

        {type === 'exercise_strength' && (
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
              Target Exercise
            </label>
            <select
              value={selectedExerciseId}
              onChange={(e) => handleExerciseChange(e.target.value)}
              className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2.5 text-sm font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.primaryMuscle})
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Goal Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Bench Press 100kg"
          required
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Starting"
            type="number"
            step="0.5"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
            unit={unit}
            required
          />
          <Input
            label="Current"
            type="number"
            step="0.5"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
            unit={unit}
            required
          />
          <Input
            label="Target"
            type="number"
            step="0.5"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
            unit={unit}
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth>
            {goal ? 'Update Goal' : 'Save Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
