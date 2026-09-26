import React, { useState, useEffect } from 'react';
import { Exercise, MuscleGroup, MuscleArea, Equipment, ExerciseType } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';

interface EditCustomExerciseModalProps {
  isOpen: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (updatedData: {
    name: string;
    primaryMuscle: MuscleGroup;
    muscleAreaEmphasis: MuscleArea[];
    equipment: Equipment;
    exerciseType: ExerciseType;
    instructions: string[];
  }) => void;
}

const EQUIPMENT_OPTIONS: { id: Equipment; name: string }[] = [
  { id: 'barbell', name: 'Barbell' },
  { id: 'dumbbell', name: 'Dumbbell' },
  { id: 'cable', name: 'Cable' },
  { id: 'machine', name: 'Machine' },
  { id: 'bodyweight', name: 'Bodyweight' },
  { id: 'ez_bar', name: 'EZ Bar' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'bands', name: 'Bands' },
  { id: 'other', name: 'Other' },
];

const EXERCISE_TYPES: { id: ExerciseType; name: string }[] = [
  { id: 'compound', name: 'Compound' },
  { id: 'isolation', name: 'Isolation' },
  { id: 'cable', name: 'Cable' },
  { id: 'machine', name: 'Machine' },
  { id: 'bodyweight', name: 'Bodyweight' },
];

export const EditCustomExerciseModal: React.FC<EditCustomExerciseModalProps> = ({
  isOpen,
  exercise,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest');
  const [selectedSubAreas, setSelectedSubAreas] = useState<MuscleArea[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('compound');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setPrimaryMuscle(exercise.primaryMuscle);
      setSelectedSubAreas(exercise.muscleAreaEmphasis || []);
      setEquipment(exercise.equipment);
      setExerciseType(exercise.exerciseType);
      setNotes(exercise.instructions ? exercise.instructions.join('\n') : '');
    }
  }, [exercise]);

  if (!isOpen || !exercise) return null;

  const currentMuscleGroupInfo = MUSCLE_GROUPS[primaryMuscle];

  const toggleSubArea = (areaId: MuscleArea) => {
    if (selectedSubAreas.includes(areaId)) {
      setSelectedSubAreas(selectedSubAreas.filter((a) => a !== areaId));
    } else {
      setSelectedSubAreas([...selectedSubAreas, areaId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      primaryMuscle,
      muscleAreaEmphasis: selectedSubAreas,
      equipment,
      exerciseType,
      instructions: notes.trim() ? notes.split('\n').filter(Boolean) : ['Custom exercise instructions.'],
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Custom Exercise">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar">
        <Input
          label="Exercise Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Incline Cable Fly"
          required
        />

        <div>
          <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
            Primary Muscle Group
          </label>
          <select
            value={primaryMuscle}
            onChange={(e) => {
              const mg = e.target.value as MuscleGroup;
              setPrimaryMuscle(mg);
              setSelectedSubAreas([]);
            }}
            className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2.5 text-sm font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48] capitalize"
          >
            {Object.values(MUSCLE_GROUPS).map((mg) => (
              <option key={mg.id} value={mg.id}>
                {mg.name}
              </option>
            ))}
          </select>
        </div>

        {currentMuscleGroupInfo && currentMuscleGroupInfo.areas.length > 0 && (
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
              Target Sub-Areas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {currentMuscleGroupInfo.areas.map((sa) => {
                const isSelected = selectedSubAreas.includes(sa.id);
                return (
                  <button
                    type="button"
                    key={sa.id}
                    onClick={() => toggleSubArea(sa.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E11D48] text-[#FFFFFF] border-[#F43F5E]'
                        : 'bg-[#1B1F23] text-[#9CA3AF] border-[#272B30] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {sa.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
              Equipment
            </label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
              className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
              Exercise Type
            </label>
            <select
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
              className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
            >
              {EXERCISE_TYPES.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
            Instructions / Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#E11D48] resize-none"
            placeholder="Add execution instructions or form cues..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth>
            Update Exercise
          </Button>
        </div>
      </form>
    </Modal>
  );
};
