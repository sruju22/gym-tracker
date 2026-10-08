import { WeeklySchedule } from '../types';

export const DEFAULT_WORKOUT_PLAN: WeeklySchedule = {
  monday: {
    name: 'Push A',
    isRest: false,
    muscleGroups: [
      {
        name: 'chest',
        displayName: 'Chest',
        subAreas: ['upper_chest', 'mid_chest', 'lower_chest'],
      },
      {
        name: 'shoulders',
        displayName: 'Shoulders',
        subAreas: ['front_delts', 'side_delts'],
      },
      {
        name: 'triceps',
        displayName: 'Triceps',
        subAreas: ['long_head_tricep', 'lateral_head_tricep', 'medial_head_tricep'],
      },
    ],
  },
  tuesday: {
    name: 'Pull A',
    isRest: false,
    muscleGroups: [
      {
        name: 'back',
        displayName: 'Back',
        subAreas: ['lats', 'upper_back'],
      },
      {
        name: 'biceps',
        displayName: 'Biceps',
        subAreas: ['long_head_bicep', 'short_head_bicep'],
      },
      {
        name: 'shoulders',
        displayName: 'Rear Delts',
        subAreas: ['rear_delts'],
      },
    ],
  },
  wednesday: {
    name: 'Legs',
    isRest: false,
    muscleGroups: [
      {
        name: 'legs',
        displayName: 'Quads',
        subAreas: ['quads'],
      },
      {
        name: 'legs',
        displayName: 'Hamstrings',
        subAreas: ['hamstrings'],
      },
      {
        name: 'glutes',
        displayName: 'Glutes',
        subAreas: ['glutes'],
      },
      {
        name: 'calves',
        displayName: 'Calves',
        subAreas: ['calves'],
      },
    ],
  },
  thursday: {
    name: 'Push B',
    isRest: false,
    muscleGroups: [
      {
        name: 'chest',
        displayName: 'Chest',
        subAreas: ['upper_chest', 'mid_chest', 'lower_chest'],
      },
      {
        name: 'shoulders',
        displayName: 'Shoulders',
        subAreas: ['front_delts', 'side_delts'],
      },
      {
        name: 'triceps',
        displayName: 'Triceps',
        subAreas: ['long_head_tricep', 'lateral_head_tricep', 'medial_head_tricep'],
      },
    ],
  },
  friday: {
    name: 'Pull B',
    isRest: false,
    muscleGroups: [
      {
        name: 'back',
        displayName: 'Back',
        subAreas: ['mid_back', 'traps', 'lower_back'],
      },
      {
        name: 'biceps',
        displayName: 'Biceps',
        subAreas: ['long_head_bicep', 'short_head_bicep'],
      },
      {
        name: 'shoulders',
        displayName: 'Rear Delts',
        subAreas: ['rear_delts'],
      },
    ],
  },
  saturday: {
    name: 'Upper + Arms',
    isRest: false,
    muscleGroups: [
      {
        name: 'chest',
        displayName: 'Chest',
        subAreas: ['upper_chest', 'mid_chest'],
      },
      {
        name: 'back',
        displayName: 'Back',
        subAreas: ['lats', 'mid_back'],
      },
      {
        name: 'biceps',
        displayName: 'Biceps',
        subAreas: ['short_head_bicep', 'long_head_bicep'],
      },
      {
        name: 'triceps',
        displayName: 'Triceps',
        subAreas: ['lateral_head_tricep', 'long_head_tricep'],
      },
    ],
  },
  sunday: {
    name: 'Rest',
    isRest: true,
    muscleGroups: [],
  },
};
