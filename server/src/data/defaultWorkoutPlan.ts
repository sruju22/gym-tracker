import { IWeeklySchedule } from '../models/WorkoutPlan';

export const DEFAULT_WORKOUT_PLAN: IWeeklySchedule = {
  monday: {
    name: 'Push A',
    isRest: false,
    muscleGroups: [
      {
        name: 'chest',
        displayName: 'Chest',
        subAreas: ['upper_chest', 'mid_chest', 'lower_chest'],
        exerciseCount: 3,
      },
      {
        name: 'shoulders',
        displayName: 'Shoulders',
        subAreas: ['front_delts', 'side_delts'],
        exerciseCount: 2,
      },
      {
        name: 'triceps',
        displayName: 'Triceps',
        subAreas: ['long_head_tricep', 'lateral_head_tricep', 'medial_head_tricep'],
        exerciseCount: 2,
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
        exerciseCount: 3,
      },
      {
        name: 'biceps',
        displayName: 'Biceps',
        subAreas: ['long_head_bicep', 'short_head_bicep'],
        exerciseCount: 2,
      },
      {
        name: 'shoulders',
        displayName: 'Rear Delts',
        subAreas: ['rear_delts'],
        exerciseCount: 2,
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
        exerciseCount: 2,
      },
      {
        name: 'legs',
        displayName: 'Hamstrings',
        subAreas: ['hamstrings'],
        exerciseCount: 2,
      },
      {
        name: 'glutes',
        displayName: 'Glutes',
        subAreas: ['glute_max', 'glute_med'],
        exerciseCount: 2,
      },
      {
        name: 'calves',
        displayName: 'Calves',
        subAreas: ['gastrocnemius', 'soleus'],
        exerciseCount: 2,
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
        exerciseCount: 3,
      },
      {
        name: 'shoulders',
        displayName: 'Shoulders',
        subAreas: ['front_delts', 'side_delts'],
        exerciseCount: 2,
      },
      {
        name: 'triceps',
        displayName: 'Triceps',
        subAreas: ['long_head_tricep', 'lateral_head_tricep', 'medial_head_tricep'],
        exerciseCount: 2,
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
        exerciseCount: 3,
      },
      {
        name: 'biceps',
        displayName: 'Biceps',
        subAreas: ['long_head_bicep', 'short_head_bicep'],
        exerciseCount: 2,
      },
      {
        name: 'shoulders',
        displayName: 'Rear Delts',
        subAreas: ['rear_delts'],
        exerciseCount: 2,
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
        exerciseCount: 2,
      },
      {
        name: 'back',
        displayName: 'Back',
        subAreas: ['lats', 'mid_back'],
        exerciseCount: 2,
      },
      {
        name: 'biceps',
        displayName: 'Biceps',
        subAreas: ['short_head_bicep', 'long_head_bicep'],
        exerciseCount: 2,
      },
      {
        name: 'triceps',
        displayName: 'Triceps',
        subAreas: ['lateral_head_tricep', 'long_head_tricep'],
        exerciseCount: 2,
      },
    ],
  },
  sunday: {
    name: 'Rest',
    isRest: true,
    muscleGroups: [],
  },
};
