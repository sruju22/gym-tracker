import React from 'react';
import { SearchBar } from '../ui/SearchBar';
import { FilterChip } from '../ui/FilterChip';
import { MuscleGroup, Equipment, ExerciseType } from '../../types';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';

interface ExerciseFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedMuscle: MuscleGroup | 'all';
  onMuscleChange: (muscle: MuscleGroup | 'all') => void;
  selectedEquipment: Equipment | 'all';
  onEquipmentChange: (equipment: Equipment | 'all') => void;
  selectedType: ExerciseType | 'all';
  onTypeChange: (type: ExerciseType | 'all') => void;
}

export const ExerciseFilter: React.FC<ExerciseFilterProps> = ({
  search,
  onSearchChange,
  selectedMuscle,
  onMuscleChange,
  selectedEquipment,
  onEquipmentChange,
}) => {
  const equipments: (Equipment | 'all')[] = [
    'all',
    'barbell',
    'dumbbell',
    'cable',
    'machine',
    'bodyweight',
    'ez_bar',
    'kettlebell',
    'bands',
    'other',
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-2.5 mb-3">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder="Search exercises or sub-muscles..."
      />

      {/* Horizontal scrolling Muscle Chips */}
      <div className="w-full max-w-full min-w-0 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        <FilterChip
          label="All Muscles"
          active={selectedMuscle === 'all'}
          onClick={() => onMuscleChange('all')}
        />
        {Object.values(MUSCLE_GROUPS).map((mg) => (
          <FilterChip
            key={mg.id}
            label={mg.name}
            active={selectedMuscle === mg.id}
            onClick={() => onMuscleChange(mg.id)}
          />
        ))}
      </div>

      {/* Secondary filter chips for equipment */}
      <div className="w-full max-w-full min-w-0 flex gap-1 overflow-x-auto pb-1 no-scrollbar text-xs select-none">
        {equipments.map((eq) => (
          <button
            key={eq}
            onClick={() => onEquipmentChange(eq)}
            className={`px-2.5 py-1 rounded-lg font-bold capitalize whitespace-nowrap flex-shrink-0 transition-all cursor-pointer border ${
              selectedEquipment === eq
                ? 'bg-[#E11D48] text-[#FFFFFF] border-[#F43F5E] font-extrabold shadow-sm shadow-[#E11D48]/20'
                : 'bg-[#1B1F23] text-[#9CA3AF] border border-[#272B30] hover:bg-[#23282D] hover:text-[#F5F5F5]'
            }`}
          >
            {eq === 'all' ? 'All Equipment' : eq.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
};
