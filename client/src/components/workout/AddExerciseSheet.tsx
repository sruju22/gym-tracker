import React, { useState } from 'react';
import { Plus, Search, Dumbbell } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { FilterChip } from '../ui/FilterChip';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Exercise, MuscleGroup, MuscleArea, Equipment, ExerciseType } from '../../types';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';
import { useWorkoutStore } from '../../store/workoutStore';

interface AddExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  targetMuscleGroup?: MuscleGroup;
  targetSubAreas?: MuscleArea[];
  targetSectionName?: string;
}

export const AddExerciseSheet: React.FC<AddExerciseSheetProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
  targetMuscleGroup,
  targetSubAreas,
  targetSectionName,
}) => {
  const { exercises, addCustomExercise } = useWorkoutStore();

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    targetMuscleGroup || 'all'
  );
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Custom Exercise Form state
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('dumbbell');
  const [customType, setCustomType] = useState<ExerciseType>('isolation');
  const [customArea, setCustomArea] = useState<MuscleArea>('mid_chest');

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesMuscle = true;
    if (targetSubAreas && targetSubAreas.length > 0) {
      matchesMuscle = ex.muscleAreaEmphasis.some((area) => targetSubAreas.includes(area));
    } else if (selectedMuscle !== 'all') {
      matchesMuscle = ex.primaryMuscle === selectedMuscle;
    }
    
    return matchesSearch && matchesMuscle;
  });

  const handleCreateCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx = addCustomExercise({
      name: customName,
      primaryMuscle: customMuscle,
      muscleAreaEmphasis: [customArea],
      equipment: customEquipment,
      exerciseType: customType,
    });

    onSelectExercise(newEx);
    setShowCreateCustom(false);
    setCustomName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={targetSectionName ? `Add ${targetSectionName} Exercise` : "Add Exercise"}>
      {!showCreateCustom ? (
        <div className="space-y-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search exercise library..." />

          {/* Muscle filter horizontal scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip
              label="All Muscles"
              active={selectedMuscle === 'all'}
              onClick={() => setSelectedMuscle('all')}
            />
            {Object.values(MUSCLE_GROUPS).map((mg) => (
              <FilterChip
                key={mg.id}
                label={mg.name}
                active={selectedMuscle === mg.id}
                onClick={() => setSelectedMuscle(mg.id)}
              />
            ))}
          </div>

          {/* Action to trigger Create Custom Exercise */}
          <button
            onClick={() => setShowCreateCustom(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center font-black">
                +
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100">Create Custom Exercise</div>
                <div className="text-[11px] text-slate-400">Add to your personal library</div>
              </div>
            </div>
          </button>

          {/* Exercises List */}
          <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                onClick={() => {
                  onSelectExercise(ex);
                  onClose();
                }}
                className="bg-[#121827] border border-slate-800 hover:border-sky-500/60 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  {!imgErrors[ex.id] ? (
                    <img
                      src={ex.imageUrl}
                      alt={ex.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800"
                      onError={() => setImgErrors((prev) => ({ ...prev, [ex.id]: true }))}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Dumbbell className="w-4 h-4 opacity-40" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-100">{ex.name}</div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {ex.primaryMuscle} • {ex.muscleAreaEmphasis.map((area) => area.replace(/_/g, ' ')).join(', ')} • {ex.equipment}
                    </div>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 text-sky-400 flex items-center justify-center font-black text-xs">
                  +
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Create Custom Exercise Form */
        <form onSubmit={handleCreateCustomSubmit} className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-slate-100 uppercase">New Custom Exercise</h4>
            <button
              type="button"
              onClick={() => setShowCreateCustom(false)}
              className="text-xs text-sky-400 font-semibold hover:text-sky-300"
            >
              Back to Library
            </button>
          </div>

          <Input
            label="Exercise Name"
            placeholder="e.g. Incline Cable Press"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Muscle Group
            </label>
            <select
              value={customMuscle}
              onChange={(e) => {
                const mg = e.target.value as MuscleGroup;
                setCustomMuscle(mg);
                setCustomArea(MUSCLE_GROUPS[mg].areas[0].id);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {Object.values(MUSCLE_GROUPS).map((mg) => (
                <option key={mg.id} value={mg.id}>
                  {mg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Muscle Area Emphasis
            </label>
            <select
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value as MuscleArea)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {MUSCLE_GROUPS[customMuscle].areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Equipment
              </label>
              <select
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value as Equipment)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="barbell">Barbell</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="ez_bar">EZ-Bar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Exercise Type
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as ExerciseType)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
                <option value="machine">Machine</option>
                <option value="cable">Cable</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth size="md">
            Save & Add to Workout
          </Button>
        </form>
      )}
    </Modal>
  );
};
