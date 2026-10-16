import React, { useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { FilterChip } from '../ui/FilterChip';
import { Exercise, MuscleGroup, Equipment, ExerciseType, MuscleArea } from '../../types';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';
import { matchExerciseSearch, scoreExerciseSearch } from '../../utils/search';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface ExerciseSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  preferredMuscleGroup?: MuscleGroup;
  title?: string;
}

export const ExerciseSelectModal: React.FC<ExerciseSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  preferredMuscleGroup,
  title = 'Select Exercise',
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { getExercises, addCustomExercise } = useWorkoutStore();
  const exercises = getExercises(userId);

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    preferredMuscleGroup || 'all'
  );
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>(preferredMuscleGroup || 'chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('dumbbell');
  const customType: ExerciseType = 'isolation';

  const trimmedSearch = search.trim();

  const filteredExercises = exercises
    .filter((ex) => {
      const matchesSearch = matchExerciseSearch(ex, trimmedSearch);
      let matchesMuscle = true;
      if (selectedMuscle !== 'all') {
        matchesMuscle =
          ex.primaryMuscle === selectedMuscle ||
          (ex.secondaryMuscles && ex.secondaryMuscles.includes(selectedMuscle));
      }
      return matchesSearch && matchesMuscle;
    })
    .sort((a, b) => {
      if (!trimmedSearch) return 0;
      return scoreExerciseSearch(b, trimmedSearch) - scoreExerciseSearch(a, trimmedSearch);
    });

  const handleCreateCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx = addCustomExercise(userId, {
      name: customName.trim(),
      primaryMuscle: customMuscle,
      muscleAreaEmphasis: [
        customMuscle === 'chest' ? 'mid_chest' : customMuscle === 'back' ? 'lats' : 'quads',
      ] as MuscleArea[],
      equipment: customEquipment,
      exerciseType: customType,
    });

    onSelect(newEx);
    setShowCreateCustom(false);
    setCustomName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {!showCreateCustom ? (
        <div className="space-y-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search exercises for combination..."
          />

          {/* Muscle filter chips */}
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

          {/* Exercise list */}
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  onSelect(ex);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl bg-[#1B1F23] hover:bg-[#272B30] border border-[#272B30] hover:border-[#E11D48]/50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-[#F5F5F5] truncate">{ex.name}</div>
                  <div className="text-[11px] text-[#9CA3AF] capitalize flex items-center gap-1.5 mt-0.5">
                    <span>{ex.primaryMuscle}</span>
                    <span>•</span>
                    <span className="text-[#6B7280]">{ex.equipment || 'Standard'}</span>
                    {ex.isCustom && (
                      <span className="text-[9px] font-bold text-[#E11D48] bg-[#E11D48]/15 px-1.5 py-0.2 rounded">
                        CUSTOM
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-xs font-bold text-[#E11D48] bg-[#E11D48]/10 px-2 py-1 rounded-md shrink-0">
                  Select
                </span>
              </button>
            ))}

            {filteredExercises.length === 0 && (
              <div className="py-8 text-center text-xs text-[#9CA3AF] space-y-2">
                <Dumbbell className="w-6 h-6 mx-auto text-[#6B7280] opacity-60" />
                <p>No matching exercises found.</p>
                <button
                  onClick={() => setShowCreateCustom(true)}
                  className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
                >
                  + Create custom exercise
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#272B30] flex items-center justify-between text-xs">
            <button
              onClick={() => setShowCreateCustom(true)}
              className="text-xs font-bold text-[#E11D48] hover:text-[#F43F5E] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Exercise</span>
            </button>
            <button
              onClick={onClose}
              className="text-xs text-[#9CA3AF] hover:text-[#F5F5F5] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Inline Custom Exercise Creator */
        <form onSubmit={handleCreateCustomSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#F5F5F5] mb-1">Exercise Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Incline Hammer Curl"
              required
              className="w-full bg-[#14171A] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-[#9CA3AF] mb-1">Muscle Group</label>
              <select
                value={customMuscle}
                onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                className="w-full bg-[#14171A] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] capitalize focus:border-[#E11D48] focus:outline-none"
              >
                {Object.values(MUSCLE_GROUPS).map((mg) => (
                  <option key={mg.id} value={mg.id}>
                    {mg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#9CA3AF] mb-1">Equipment</label>
              <select
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value as Equipment)}
                className="w-full bg-[#14171A] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] capitalize focus:border-[#E11D48] focus:outline-none"
              >
                <option value="dumbbell">Dumbbell</option>
                <option value="barbell">Barbell</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="ez_bar">EZ Bar</option>
                <option value="kettlebell">Kettlebell</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateCustom(false)}
              className="flex-1 py-2 text-xs font-bold text-[#9CA3AF] bg-[#1B1F23] hover:bg-[#272B30] rounded-xl cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!customName.trim()}
              className="flex-1 py-2 text-xs font-bold text-[#0B0D0F] bg-[#E11D48] hover:bg-[#F43F5E] disabled:opacity-50 rounded-xl cursor-pointer"
            >
              Create & Select
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
