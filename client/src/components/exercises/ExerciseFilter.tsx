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

      {/* Horizontal scrolling Muscle Chips — ONLY this row scrolls, page stays locked */}
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
            className={`px-2.5 py-1 rounded-lg font-bold capitalize whitespace-nowrap flex-shrink-0 transition-all border ${
              selectedEquipment === eq
                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {eq === 'all' ? 'All Equipment' : eq.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  );
};
