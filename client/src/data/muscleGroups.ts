import { MuscleGroup, MuscleArea } from '../types';

export interface MuscleGroupMeta {
  id: MuscleGroup;
  name: string;
  color: string;
  accentColor: string;
  icon: string;
  areas: { id: MuscleArea; name: string }[];
}

export const MUSCLE_GROUPS: Record<MuscleGroup, MuscleGroupMeta> = {
  chest: {
    id: 'chest',
    name: 'Chest',
    color: '#ff6b6b',
    accentColor: 'rgba(255, 107, 107, 0.15)',
    icon: '🏋️‍♂️',
    areas: [
      { id: 'upper_chest', name: 'Upper Chest' },
      { id: 'mid_chest', name: 'Mid Chest' },
      { id: 'lower_chest', name: 'Lower Chest' },
    ],
  },
  back: {
    id: 'back',
    name: 'Back',
    color: '#4ecdc4',
    accentColor: 'rgba(78, 205, 196, 0.15)',
    icon: '🛶',
    areas: [
      { id: 'lats', name: 'Lats' },
      { id: 'upper_back', name: 'Upper Back' },
      { id: 'mid_back', name: 'Mid Back' },
      { id: 'traps', name: 'Traps' },
      { id: 'lower_back', name: 'Lower Back' },
    ],
  },
  shoulders: {
    id: 'shoulders',
    name: 'Shoulders',
    color: '#ffd93d',
    accentColor: 'rgba(255, 217, 61, 0.15)',
    icon: '🛡️',
    areas: [
      { id: 'front_delts', name: 'Front Delts' },
      { id: 'side_delts', name: 'Side Delts' },
      { id: 'rear_delts', name: 'Rear Delts' },
    ],
  },
  biceps: {
    id: 'biceps',
    name: 'Biceps',
    color: '#6c5ce7',
    accentColor: 'rgba(108, 92, 231, 0.15)',
    icon: '💪',
    areas: [
      { id: 'long_head_bicep', name: 'Long Head (Outer)' },
      { id: 'short_head_bicep', name: 'Short Head (Inner)' },
    ],
  },
  triceps: {
    id: 'triceps',
    name: 'Triceps',
    color: '#ff8a5c',
    accentColor: 'rgba(255, 138, 92, 0.15)',
    icon: '⚡',
    areas: [
      { id: 'long_head_tricep', name: 'Long Head' },
      { id: 'lateral_head_tricep', name: 'Lateral Head' },
      { id: 'medial_head_tricep', name: 'Medial Head' },
    ],
  },
  forearms: {
    id: 'forearms',
    name: 'Forearms',
    color: '#a8e6cf',
    accentColor: 'rgba(168, 230, 207, 0.15)',
    icon: '✊',
    areas: [
      { id: 'forearm_flexors', name: 'Flexors (Inner)' },
      { id: 'forearm_extensors', name: 'Extensors (Outer)' },
    ],
  },
  legs: {
    id: 'legs',
    name: 'Legs',
    color: '#3498db',
    accentColor: 'rgba(52, 152, 219, 0.15)',
    icon: '🦵',
    areas: [
      { id: 'quads', name: 'Quads' },
      { id: 'hamstrings', name: 'Hamstrings' },
    ],
  },
  glutes: {
    id: 'glutes',
    name: 'Glutes',
    color: '#e056a0',
    accentColor: 'rgba(224, 86, 160, 0.15)',
    icon: '🍑',
    areas: [
      { id: 'glutes', name: 'Glutes' },
    ],
  },
  calves: {
    id: 'calves',
    name: 'Calves',
    color: '#00b894',
    accentColor: 'rgba(0, 184, 148, 0.15)',
    icon: '🦶',
    areas: [
      { id: 'calves', name: 'Calves' },
    ],
  },
  core: {
    id: 'core',
    name: 'Core',
    color: '#fdcb6e',
    accentColor: 'rgba(253, 203, 110, 0.15)',
    icon: '🧘‍♂️',
    areas: [
      { id: 'upper_abs', name: 'Upper Abs' },
      { id: 'lower_abs', name: 'Lower Abs' },
      { id: 'obliques', name: 'Obliques' },
    ],
  },
};

export const getMuscleAreaName = (area: MuscleArea): string => {
  for (const mg of Object.values(MUSCLE_GROUPS)) {
    const found = mg.areas.find((a) => a.id === area);
    if (found) return found.name;
  }
  return area.replace(/_/g, ' ');
};
