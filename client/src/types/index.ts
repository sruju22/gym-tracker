// ===== Exercise Types =====
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'forearms' | 'legs' | 'glutes' | 'calves' | 'core';

export type MuscleArea =
  // Chest
  | 'upper_chest' | 'mid_chest' | 'lower_chest'
  // Back
  | 'lats' | 'upper_back' | 'mid_back' | 'traps' | 'lower_back'
  // Shoulders
  | 'front_delts' | 'side_delts' | 'rear_delts'
  // Biceps
  | 'long_head_bicep' | 'short_head_bicep'
  // Triceps
  | 'long_head_tricep' | 'lateral_head_tricep' | 'medial_head_tricep'
  // Forearms
  | 'forearm_flexors' | 'forearm_extensors'
  // Legs
  | 'quads' | 'hamstrings'
  // Glutes
  | 'glute_max' | 'glute_med'
  // Calves
  | 'gastrocnemius' | 'soleus'
  // Core
  | 'upper_abs' | 'lower_abs' | 'obliques';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable'
  | 'bodyweight' | 'ez_bar' | 'kettlebell' | 'bands' | 'other';

export type ExerciseType =
  | 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  muscleAreaEmphasis: MuscleArea[];
  equipment: Equipment;
  exerciseType: ExerciseType;
  difficulty: Difficulty;
  instructions: string[];
  imageUrl: string;
  imageEnd?: string;
  tags: string[];
  isCustom: boolean;
}

// ===== Workout Types =====
export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  sets: WorkoutSet[];
  notes: string;
  previousPerformance?: PreviousPerformance;
}

export interface PreviousPerformance {
  date: string;
  workoutName?: string;
  sets: { setNumber: number; weight: number; reps: number }[];
  bestWeight: number;
  bestReps: number;
  estimated1RM: number;
}

export interface WorkoutSession {
  id: string;
  workoutName?: string;
  date: string;
  dayOfWeek: DayOfWeek;
  muscleGroups: MuscleGroup[];
  sections?: MuscleGroupConfig[];
  status: 'planned' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  exercises: WorkoutExercise[];
  totalVolume: number;
  totalSets: number;
  newPRs?: PersonalRecord[];
}

// ===== Schedule Types =====
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface MuscleGroupConfig {
  name: MuscleGroup;
  displayName: string;
  subAreas?: MuscleArea[];
  exerciseCount?: number;
}

export interface DayConfig {
  name: string;
  isRest: boolean;
  muscleGroups: MuscleGroupConfig[];
}

export type WeeklySchedule = Record<DayOfWeek, DayConfig>;

// ===== Coverage Types =====
export interface CoverageItem {
  area: MuscleArea;
  displayName: string;
  covered: boolean;
  exercises: string[];
}

export interface MuscleGroupCoverage {
  muscleGroup: MuscleGroup;
  areas: CoverageItem[];
  totalAreas: number;
  coveredAreas: number;
}

// ===== Personal Records =====
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_1rm' | 'max_volume';
  value: number; // Max weight
  weight: number;
  reps: number;
  estimated1RM: number;
  highestVolume?: number;
  date: string;
  details?: string;
}

// ===== Fitness Goals =====
export type GoalType = 'body_weight' | 'exercise_strength';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  exerciseId?: string;
  exerciseName?: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: 'kg' | 'lbs';
  createdAt: string;
  updatedAt: string;
}

// ===== User & Auth Types =====
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  currentWeight?: number;
}

export interface UserSettings {
  weightUnit: 'kg' | 'lbs';
  theme: 'dark' | 'light';
  defaultSetsPerExercise: number;
  rotationWindowDays: number;
}


