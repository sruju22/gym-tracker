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
  | 'glutes' | 'glute_max' | 'glute_med'
  // Calves
  | 'calves' | 'gastrocnemius' | 'soleus'
  // Core
  | 'upper_abs' | 'lower_abs' | 'obliques';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable'
  | 'bodyweight' | 'ez_bar' | 'kettlebell' | 'bands' | 'other';

export type ExerciseType =
  | 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  muscleAreaEmphasis: MuscleArea[];
  equipment: Equipment;
  equipmentName?: string;
  exerciseType: ExerciseType;
  difficulty: Difficulty;
  instructions: string[];
  imageUrl: string;
  imageEnd?: string;
  tags: string[];
  isCustom: boolean;
}

// ===== Workout Types =====
export interface WorkoutSetStage {
  id: string;
  stageOrder: number;
  exerciseId: string;
  exerciseName: string;
  movementDescription?: string;
  targetWeight?: number | null;
  targetReps?: number | null;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
  stages?: WorkoutSetStage[];
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  sets: WorkoutSet[];
  notes: string;
  previousPerformance?: PreviousPerformance;
  completed?: boolean;
  combinationId?: string;
  combinationName?: string;
  combinationType?: CombinationType;
  techniqueLabel?: string;
  stageDescription?: string;
  stageOrder?: number;
}

// ===== Combination Types =====
export type CombinationType =
  | 'combine_exercises'
  | 'combine_movements'
  | 'change_weights'
  | 'build_own';

export interface CombinationStage {
  id: string;
  exerciseId: string;
  exerciseName: string;
  movementDescription?: string;
  targetWeight?: number | null;
  targetReps?: number | null;
}

export interface SavedCombination {
  id: string;
  userId?: string;
  name: string;
  type: CombinationType;
  techniqueLabel?: string;
  rounds: number;
  stages: CombinationStage[];
  createdAt: string;
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
  clientSessionId?: string;
  workoutName?: string;
  date: string;
  dayOfWeek: DayOfWeek;
  muscleGroups: MuscleGroup[];
  sections?: MuscleGroupConfig[];
  status: 'planned' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  rating?: 'easy' | 'good' | 'hard' | null;
  totalVolume: number;
  totalSets: number;
  newPRs?: PersonalRecord[];
  syncedToBackend?: boolean;
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
  prCategory?: 'max_weight' | 'max_reps' | 'max_1rm' | 'baseline';
  value: number; // Max weight
  weight: number;
  reps: number;
  estimated1RM: number;
  highestVolume?: number;
  previousValue?: number;
  date: string;
  details?: string;
}

// ===== Fitness Goals =====
export type GoalType =
  | 'weight_gain'
  | 'weight_loss'
  | 'strength'
  | 'consistency'
  | 'body_weight'
  | 'exercise_strength';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal {
  id: string;
  _id?: string;
  userId?: string;
  title: string;
  type: GoalType;
  exerciseId?: string;
  exerciseName?: string;
  startValue: number;
  currentValue?: number | null;
  targetValue: number;
  unit: 'kg' | 'lbs' | 'workouts';
  targetDate?: string | null;
  status: GoalStatus;
  isPrimary?: boolean;
  notes?: string;
  progressPercentage?: number | null;
  remainingDistance?: number | null;
  statusMessage?: string;
  isAchieved?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Body Weight Tracking =====
export interface WeightLog {
  id: string;
  _id?: string;
  userId?: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== User & Auth Types =====
export interface User {
  id: string;
  name: string;
  email: string;
  authProvider?: 'local' | 'google';
  googleLinked?: boolean;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
  fitnessGoal?: string;
  experienceLevel?: string;
  trainingDaysPerWeek?: number;
  equipmentPreference?: string;
  selectedTemplateId?: string;
  heightCm?: number | null;
  currentWeight?: number | null;
  weightUnit?: 'kg' | 'lbs';
  createdAt: string;
}

export interface UserSettings {
  weightUnit: 'kg' | 'lbs';
  theme: 'dark' | 'light' | 'system';
  defaultSetsPerExercise: number;
  rotationWindowDays: number;
}

// ===== Workout Template Types =====
export interface WorkoutTemplate {
  id: string;
  name: string;
  category: 'hypertrophy' | 'strength' | 'fat_loss' | 'longevity';
  goal: string;
  daysPerWeek: number;
  experienceLevel: string;
  equipment: string;
  shortDescription: string;
  progressionMethodology: string;
  setRepGuidance: string;
  recoveryNotes: string;
  conditioningNotes?: string;
  weeklySchedule: WeeklySchedule;
}


