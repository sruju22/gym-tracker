import React, { useState, useEffect } from 'react';
import { Dumbbell } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { FilterChip } from '../ui/FilterChip';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Exercise, MuscleGroup, MuscleArea, Equipment, ExerciseType } from '../../types';
import { MUSCLE_GROUPS, getMuscleAreaName } from '../../data/muscleGroups';
import { getLegSection, isLegSubArea } from '../../utils/legSection';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

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
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getExercises, addCustomExercise } = useWorkoutStore();
  const exercises = getExercises(userId);

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    targetMuscleGroup || 'all'
  );
  const [selectedSubArea, setSelectedSubArea] = useState<MuscleArea | 'all'>('all');
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedMuscle(targetMuscleGroup || 'all');
      setSelectedSubArea('all');
      setSearch('');
    }
  }, [isOpen, targetMuscleGroup]);

  // Custom Exercise Form state
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>(targetMuscleGroup || 'chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('dumbbell');
  const [customType, setCustomType] = useState<ExerciseType>('isolation');
  const [customArea, setCustomArea] = useState<MuscleArea>('mid_chest');

  const targetLegKey = isLegSubArea(targetSubAreas, targetSectionName);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase().trim());

    if (targetLegKey && (selectedMuscle === 'all' || selectedMuscle === targetMuscleGroup) && selectedSubArea === 'all') {
      return matchesSearch && getLegSection(ex) === targetLegKey;
    }

    let matchesMuscle = true;
    if (selectedMuscle !== 'all') {
      matchesMuscle =
        ex.primaryMuscle === selectedMuscle ||
        (ex.secondaryMuscles && ex.secondaryMuscles.includes(selectedMuscle));
    }

    let matchesSubArea = true;
    if (selectedSubArea !== 'all') {
      matchesSubArea = ex.muscleAreaEmphasis.includes(selectedSubArea);
    }

    return matchesSearch && matchesMuscle && matchesSubArea;
  });

  const handleCreateCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx = addCustomExercise(userId, {
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
              onClick={() => {
                setSelectedMuscle('all');
                setSelectedSubArea('all');
              }}
            />
            {Object.values(MUSCLE_GROUPS).map((mg) => (
              <FilterChip
                key={mg.id}
                label={mg.name}
                active={selectedMuscle === mg.id}
                onClick={() => {
                  setSelectedMuscle(mg.id);
                  setSelectedSubArea('all');
                }}
              />
            ))}
          </div>

          {/* Sub-area / Muscle Head filter chips */}
          {selectedMuscle !== 'all' && MUSCLE_GROUPS[selectedMuscle]?.areas && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-[#272B30]">
              <FilterChip
                label="All Target Areas"
                active={selectedSubArea === 'all'}
                onClick={() => setSelectedSubArea('all')}
              />
              {MUSCLE_GROUPS[selectedMuscle].areas.map((area) => (
                <FilterChip
                  key={area.id}
                  label={area.name}
                  active={selectedSubArea === area.id}
                  onClick={() => setSelectedSubArea(area.id)}
                />
              ))}
            </div>
          )}

          {/* Action to trigger Create Custom Exercise */}
          <button
            onClick={() => setShowCreateCustom(true)}
            className="w-full bg-[#1B1F23] hover:bg-[#23282D] border border-[#272B30] rounded-xl p-3 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E11D48] text-[#FFFFFF] flex items-center justify-center font-black">
                +
              </div>
              <div>
                <div className="text-xs font-bold text-[#F5F5F5]">Create Custom Exercise</div>
                <div className="text-[11px] text-[#9CA3AF]">Add to your personal library</div>
              </div>
            </div>
          </button>

          {/* Exercises List */}
          <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
            {filteredExercises.length > 0 ? (
              filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => {
                    onSelectExercise(ex);
                    onClose();
                  }}
                  className="bg-[#14171A] border border-[#272B30] hover:border-[#E11D48]/60 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    {!imgErrors[ex.id] ? (
                      <img
                        src={ex.imageUrl}
                        alt={ex.name}
                        loading="lazy"
                        className="w-10 h-10 rounded-lg object-cover bg-[#1B1F23] border border-[#272B30]"
                        onError={() => setImgErrors((prev) => ({ ...prev, [ex.id]: true }))}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#1B1F23] border border-[#272B30] flex items-center justify-center text-[#6B7280]">
                        <Dumbbell className="w-4 h-4 opacity-40" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-[#F5F5F5]">{ex.name}</div>
                      <div className="text-[11px] text-[#9CA3AF] capitalize">
                        {ex.primaryMuscle} • {ex.muscleAreaEmphasis.map((area) => getMuscleAreaName(area)).join(', ')} • {ex.equipment}
                      </div>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-[#1B1F23] border border-[#272B30] text-[#E11D48] flex items-center justify-center font-black text-xs">
                    +
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#9CA3AF] py-6 text-center font-medium">
                No matching exercises found for this muscle section.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Create Custom Exercise Form */
        <form onSubmit={handleCreateCustomSubmit} className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold text-[#F5F5F5] uppercase">New Custom Exercise</h4>
            <button
              type="button"
              onClick={() => setShowCreateCustom(false)}
              className="text-xs text-[#E11D48] font-semibold hover:text-[#F43F5E]"
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
            <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-1">
              Muscle Group
            </label>
            <select
              value={customMuscle}
              onChange={(e) => {
                const mg = e.target.value as MuscleGroup;
                setCustomMuscle(mg);
                const info = MUSCLE_GROUPS[mg];
                if (info && info.areas.length > 0) {
                  setCustomArea(info.areas[0].id);
                }
              }}
              className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
            >
              {Object.values(MUSCLE_GROUPS).map((mg) => (
                <option key={mg.id} value={mg.id}>
                  {mg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-1">
              Muscle Area Emphasis
            </label>
            <select
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value as MuscleArea)}
              className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
            >
              {(MUSCLE_GROUPS[customMuscle]?.areas || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                Equipment
              </label>
              <select
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value as Equipment)}
                className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
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
              <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                Exercise Type
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as ExerciseType)}
                className="w-full bg-[#1B1F23] border border-[#272B30] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#E11D48]"
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
