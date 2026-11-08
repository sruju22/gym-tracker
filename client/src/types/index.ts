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
  isCollapsed?: boolean;
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
export type CoverageStatus = 'direct' | 'supported' | 'optional';

export interface CoverageItem {
  area: MuscleArea;
  displayName: string;
  covered: boolean;
  status: CoverageStatus;
  exercises: string[];
  supportingExercises?: string[];
  directSets?: number;
  supportingSets?: number;
}

export interface MuscleGroupCoverage {
  muscleGroup: MuscleGroup;
  areas: CoverageItem[];
  totalAreas: number;
  coveredAreas: number;
  directCount: number;
  supportedCount: number;
  optionalCount: number;
}

// ===== Phase 9A Muscle Intelligence Engine Types =====
export type MuscleContributionTier =
  | 'prime'              // 1.00 - Prime mover / direct focus
  | 'major_synergist'    // 0.70 - 0.75 - Heavy compound co-activation
  | 'moderate_synergist' // 0.40 - 0.50 - Meaningful secondary assistance
  | 'stabilizer';        // 0.20 - 0.25 - Dynamic stabilization & isometric hold

export type MuscleReadinessStatus = 'ready' | 'recovering' | 'fatigued' | 'dormant';

export interface ExerciseBiomechanicalContribution {
  muscleGroup: MuscleGroup;
  subArea?: MuscleArea;
  tier: MuscleContributionTier;
  factor: number;
  isDirect: boolean;
  isUncertainMapping?: boolean;
}

export interface SubRegionStimulusSummary {
  area: MuscleArea;
  displayName: string;
  directSets7d: number;
  supportedSets7d: number;
  stimulusScore7d: number;
  confirmedStimulus7d?: number;
  uncertainStimulus7d?: number;
  directSets28d: number;
  supportedSets28d: number;
  stimulusScore28d: number;
  confirmedStimulus28d?: number;
  uncertainStimulus28d?: number;
  status: 'direct' | 'supported' | 'optional';
  contributingExercises: string[];
}

export interface MuscleIntelligenceGroupReport {
  muscleGroup: MuscleGroup;
  displayName: string;
  isScheduledInSplit: boolean;
  // 7-day metrics
  directSets7d: number;
  supportedSets7d: number;
  effectiveStimulus7d: number;
  confirmedStimulus7d: number;
  uncertainStimulus7d: number;
  hasUncertainContributions7d: boolean;
  // 28-day metrics
  directSets28d: number;
  supportedSets28d: number;
  effectiveStimulus28d: number;
  confirmedStimulus28d: number;
  uncertainStimulus28d: number;
  averageWeeklyStimulus28d: number;
  confirmedAverageWeeklyStimulus28d: number;
  hasUncertainContributions28d: boolean;
  // Sub-region breakdown
  subRegions: SubRegionStimulusSummary[];
  // Recovery & Readiness
  readiness: {
    status: MuscleReadinessStatus;
    label: string;
    acuteLoadScore: number;
    hoursSinceLastTrained: number | null;
    daysSinceLastTrained: number | null;
    explanation: string;
  };
  // Alerts & Observations
  isPersistentlyUnderexposed: boolean;
  isCompoundSupportedOnly: boolean;
  hasSingleSessionDensitySpike: boolean;
  observations: string[];
  contributingExercises: string[];
}

export interface MuscleIntelligenceSummary {
  auditPeriodDays: number;
  referenceDate: string;
  activeSplitName?: string;
  groups: MuscleIntelligenceGroupReport[];
  persistentUnderexposureAlerts: {
    target: string;
    muscleGroup: MuscleGroup;
    subArea?: MuscleArea;
    averageWeeklyStimulus: number;
    evidence: string;
    recommendation: string;
  }[];
  workloadDensityAlerts: {
    target: string;
    sessionDate: string;
    totalSets: number;
    evidence: string;
  }[];
  uncertainMappings: {
    exerciseId: string;
    exerciseName: string;
    muscleGroup?: MuscleGroup;
    factor?: number;
    setsRecorded7d?: number;
    setsRecorded28d?: number;
    estimatedStimulus7d?: number;
    estimatedStimulus28d?: number;
    reason: string;
  }[];
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
  photoUrl?: string;
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
  cardioPreferences?: UserCardioPreferences;
  selectedTemplateId?: string;
  heightCm?: number | null;
  currentWeight?: number | null;
  weightUnit?: 'kg' | 'lbs';
  createdAt: string;
}

export interface EquipmentIncrementSettings {
  dumbbellIncrementKg?: number;
  barbellIncrementKg?: number;
  cableIncrementKg?: number;
  machineIncrementKg?: number;
  dumbbellConvention?: 'per_dumbbell' | 'combined';
  availableDumbbellWeightsKg?: number[];
  availablePlatesKg?: number[];
}

export type ProgressionAction =
  | 'increase_weight'
  | 'increase_reps'
  | 'maintain_load'
  | 'reduce_load'
  | 'insufficient_data';

export interface UnifiedProgressionDecision {
  exerciseId: string;
  exerciseName: string;
  equipment: Equipment;
  isBodyweight: boolean;
  currentWorkingWeight: number;
  currentReps: number;
  completedSetsCount: number;
  allSetsHitUpperTarget: boolean;
  previousWorkingWeight: number | null;
  previousReps: number | null;
  targetRepRange: { min: number; max: number };
  action: ProgressionAction;
  title: string;
  actionHeadline: string;
  recommendedWeight: number | null;
  recommendedReps: number;
  loadChangeKg: number | null;
  reason: string;
  evidenceHeadline: string;
  evidenceDetails: string[];
  equipmentIncrementKg: number | null;
  equipmentConvention: 'per_dumbbell' | 'combined';
  isJumpTooLarge: boolean;
  nextSessionApplicable: boolean;
  isApplied?: boolean;
}

// ===== Phase 10 Adaptive Training Decision Engine Types =====
export type AdaptivePrimaryAction =
  | 'increase_weight'
  | 'increase_reps'
  | 'maintain_progression'
  | 'insufficient_data'
  | 'recovery_aware_recommendation';

export type AdaptiveAdditionalRecommendationType =
  | 'volume_adjustment'
  | 'stimulus_exercise_adjustment'
  | 'recovery_advisory'
  | 'performance_review';

export type AdaptiveConfidenceLevel =
  | 'high'
  | 'medium'
  | 'provisional'
  | 'insufficient_data';

export type AdaptivePrimaryReasonCode =
  | 'OVERLOAD_WEIGHT_INCREMENT'
  | 'OVERLOAD_REPS_BUILDING'
  | 'OVERLOAD_REPS_CONSOLIDATE_HIGH_INCREMENT'
  | 'OVERLOAD_REPS_ALL_SETS_UNFINISHED'
  | 'BODYWEIGHT_REPS_OVERLOAD'
  | 'RECOVERY_PRIMARY_ACUTE_FATIGUE_HOLD'
  | 'RECOVERY_PERFORMANCE_COLLAPSE_DELOAD'
  | 'PLATEAU_STAGNANT_PERFORMANCE_REVIEW'
  | 'BASELINE_INSUFFICIENT_DATA';

export interface AdaptiveAdditionalRecommendation {
  type: AdaptiveAdditionalRecommendationType;
  title: string;
  actionText: string;
  rationale: string;
  reasonCode: string;
  suggestedExerciseId?: string;
  suggestedExerciseName?: string;
  targetMuscleGroup?: MuscleGroup;
  targetSubArea?: MuscleArea;
}

export interface AdaptiveTrainingDecision {
  exerciseId: string;
  exerciseName: string;
  equipment: Equipment;
  isBodyweight: boolean;
  primaryMuscle: MuscleGroup;
  primarySubArea?: MuscleArea;

  // Integrated performance state from last session
  currentWorkingWeight: number;
  currentReps: number;
  completedSetsCount: number;
  allSetsHitUpperTarget: boolean;
  targetRepRange: { min: number; max: number };

  // Primary Progression Decision (Exactly ONE)
  primaryAction: AdaptivePrimaryAction;
  primaryReasonCode: AdaptivePrimaryReasonCode;
  title: string;
  actionHeadline: string;
  primaryRationale: string;
  supportingEvidence: string[];

  // Actionable Targets (staged via Apply in Workout)
  targets: {
    recommendedWeight: number | null;
    recommendedReps: number;
    recommendedSets?: number;
    loadChangeKg: number | null;
    isJumpTooLarge: boolean;
    nextSessionApplicable: boolean;
    isApplied: boolean;
  };

  // Additional Training Recommendations (Zero or more explainable recommendations)
  additionalRecommendations: AdaptiveAdditionalRecommendation[];

  // Context & Diagnostics
  confidence: AdaptiveConfidenceLevel;
  warnings: string[];
  limitations: string[];
  dataSufficiency: {
    totalExposures: number;
    hasSufficientHistory: boolean;
    statusLabel: string;
  };

  // Muscle Intelligence context snapshot
  intelligenceContext: {
    primaryReadiness: MuscleReadinessStatus;
    primaryAcuteLoadScore: number;
    hoursSinceLastTrained: number | null;
    daysSinceLastTrained: number | null;
    synergistReadinessSummary: {
      muscleGroup: MuscleGroup;
      status: MuscleReadinessStatus;
      acuteLoadScore: number;
    }[];
    isScheduledInSplit: boolean;
    isCompoundSupportedOnly: boolean;
    hasUncertainMappingExposure: boolean;
  };
}

export interface UserSettings {
  weightUnit: 'kg' | 'lbs';
  theme: 'dark' | 'light' | 'system';
  defaultSetsPerExercise: number;
  rotationWindowDays: number;
  equipmentIncrements?: EquipmentIncrementSettings;
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

// ===== Cardio & Conditioning Types =====
export type CardioActivityType =
  | 'running'
  | 'walking'
  | 'cycling'
  | 'treadmill'
  | 'elliptical'
  | 'rowing'
  | 'stair_climber'
  | 'other';

export type CardioIntensity = 'low' | 'moderate' | 'high';

export interface UserCardioPreferences {
  preferredActivities: CardioActivityType[];
  preferredDurationMinutes: number; // e.g. 20, 30, 45, 60
  availableDaysPerWeek: number; // e.g. 2, 3, 4, 5
  preferredIntensity?: CardioIntensity;
}

export type DistanceUnit = 'km' | 'mi' | 'm';

export interface CardioSession {
  id: string;
  _id?: string;
  clientSessionId?: string;
  userId?: string;
  activityType: CardioActivityType;
  customActivityName?: string;
  date: string;
  durationMinutes: number;
  distance?: number | null;
  distanceUnit?: DistanceUnit;
  paceMinutesPerUnit?: number | null;
  speedPerHour?: number | null;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  caloriesBurned?: number | null;
  notes?: string;
  syncedToBackend?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Cardio Goals & PR Types =====
export interface CardioWeeklyGoalSettings {
  durationMinutes: {
    enabled: boolean;
    target: number; // in minutes
  };
  distance: {
    enabled: boolean;
    target: number;
    unit: DistanceUnit;
  };
  sessions: {
    enabled: boolean;
    target: number; // count of sessions
  };
  isCustomized?: boolean; // When true, user manual edits are preserved against goal changes
}

export type CardioRecordType =
  | 'longest_duration'
  | 'longest_distance'
  | 'fastest_pace'
  | 'highest_heart_rate';

export interface CardioPersonalRecord {
  id: string;
  type: CardioRecordType;
  title: string;
  metricValue: string;
  rawValue: number;
  unit?: string;
  activityType: CardioActivityType;
  customActivityName?: string;
  date: string;
  details?: string;
  sessionId: string;
}




