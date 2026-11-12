import React, { useState } from 'react';
import { SearchBar } from '../ui/SearchBar';
import { FilterChip } from '../ui/FilterChip';
import { MuscleGroup, Equipment, ExerciseType } from '../../types';
import { MUSCLE_GROUPS } from '../../data/muscleGroups';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

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
  const [showEquipmentFilter, setShowEquipmentFilter] = useState(false);

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
  ];

  const activeFilterCount =
    (selectedMuscle !== 'all' ? 1 : 0) + (selectedEquipment !== 'all' ? 1 : 0);

  const handleReset = () => {
    triggerHaptic('light');
    onSearchChange('');
    onMuscleChange('all');
    onEquipmentChange('all');
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-2 mb-2">
      {/* Top Search Bar with Equipment Filter Toggle & Reset Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Search exercises or target heads..."
          />
        </div>

        {/* Equipment Drawer Toggle Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowEquipmentFilter((prev) => !prev);
          }}
          className={`h-11 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shrink-0 select-none ${
            selectedEquipment !== 'all' || showEquipmentFilter
              ? 'bg-red-500 text-white border-red-500 shadow-xs'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)]'
          }`}
          title="Filter by Equipment"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Equipment</span>
          {selectedEquipment !== 'all' && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* Quick Reset Button if any filter or search active */}
        {(activeFilterCount > 0 || search.length > 0) && (
          <button
            type="button"
            onClick={handleReset}
            className="h-11 px-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
            title="Reset all filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Muscle Group Filter Strip */}
      <div className="w-full max-w-full min-w-0 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none touch-manipulation">
        <FilterChip
          label="All"
          active={selectedMuscle === 'all'}
          onClick={() => {
            triggerHaptic('light');
            onMuscleChange('all');
          }}
        />
        {Object.values(MUSCLE_GROUPS).map((mg) => (
          <FilterChip
            key={mg.id}
            label={mg.name}
            active={selectedMuscle === mg.id}
            onClick={() => {
              triggerHaptic('light');
              onMuscleChange(selectedMuscle === mg.id ? 'all' : mg.id);
            }}
          />
        ))}
      </div>

      {/* Collapsible / Expandable Equipment Filter Strip */}
      {showEquipmentFilter && (
        <div className="w-full max-w-full min-w-0 flex gap-1 overflow-x-auto py-1 px-1.5 rounded-xl bg-[var(--bg-surface)]/70 border border-[var(--border-subtle)] no-scrollbar text-xs select-none animate-slide-down">
          {equipments.map((eq) => (
            <button
              key={eq}
              onClick={() => {
                triggerHaptic('light');
                onEquipmentChange(selectedEquipment === eq ? 'all' : eq);
              }}
              className={`px-2.5 py-1 rounded-lg font-black capitalize whitespace-nowrap flex-shrink-0 transition-all cursor-pointer border text-[11px] ${
                selectedEquipment === eq
                  ? 'bg-red-500 text-white border-red-500 shadow-2xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
              }`}
            >
              {eq === 'all' ? 'All Gear' : eq.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
