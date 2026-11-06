import mongoose from 'mongoose';
import Workout, { IWorkoutSession, IWorkoutExercise, IWorkoutSet } from '../models/Workout';
import WorkoutPlan, { IWorkoutPlanDocument } from '../models/WorkoutPlan';
import Goal, { IGoalDocument } from '../models/Goal';
import User, { IUserDocument } from '../models/User';

/**
 * Calculates Estimated 1RM using Brzycki / Epley formula (matching GymTrackie core)
 */
export const calculate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 12) {
    return Math.round(weight * (1 + reps / 30));
  }
  return Math.round(weight * (36 / (37 - reps)));
};

export interface ClientIntelligenceSnapshot {
  muscleReadiness?: Record<string, { state: string; score?: number }>;
  persistentUnderexposure?: Array<{
    muscle: string;
    subRegion?: string;
    exposureRatio?: number;
    reason?: string;
  }>;
  adaptiveRecommendations?: Array<{
    exerciseName: string;
    primaryAction: string;
    targetWeight?: number | null;
    targetReps?: number | null;
    rationale?: string;
    reasonCode?: string;
    confidence?: string;
  }>;
}

export interface PRSummary {
  exerciseName: string;
  bestWeight: number;
  reps: number;
  estimated1RM: number;
  date: string;
}

export interface WorkoutSetSummary {
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export interface WorkoutExerciseSummary {
  exerciseName: string;
  primaryMuscle?: string;
  completedSets: WorkoutSetSummary[];
}

export interface WorkoutSummary {
  id?: string;
  date: string;
  name: string;
  dayOfWeek: string;
  rating?: string | null;
  totalVolumeKg: number;
  totalSets: number;
  durationMinutes?: number;
  exercises: WorkoutExerciseSummary[];
}

export interface CoachContextPayload {
  userProfile: {
    fitnessGoal?: string;
    experienceLevel?: string;
    trainingDaysPerWeek?: number;
    equipmentPreference?: string;
    currentWeight?: number;
    weightUnit?: string;
  };
  activePlan: {
    templateName?: string;
    trainingDaysPerWeek?: number;
    weeklySchedule: Record<string, string>;
  } | null;
  activeGoals: Array<{
    title: string;
    type: string;
    exerciseName?: string;
    startValue: number;
    targetValue: number;
    unit: string;
  }>;
  personalRecords: PRSummary[];
  recentWorkouts: WorkoutSummary[];
  muscleVolumeLast30Days: Record<string, number>;
  clientIntelligence: ClientIntelligenceSnapshot | null;
  intelligenceEngineStatus: string;
}

export interface CoachContextResult {
  contextPayload: CoachContextPayload;
  dataSources: string[];
}

/**
 * Derives top Personal Records across completed sessions for a given user
 */
export async function deriveUserPRs(userId: mongoose.Types.ObjectId | string, limit = 12): Promise<PRSummary[]> {
  const completedSessions = await Workout.find({
    userId,
    status: 'completed',
  })
    .sort({ date: 1 })
    .lean();

  const prMap = new Map<string, PRSummary>();

  for (const session of completedSessions) {
    const sessionDate = session.date ? new Date(session.date).toISOString().split('T')[0] : 'Unknown';

    for (const ex of session.exercises || []) {
      for (const s of ex.sets || []) {
        if (Array.isArray(s.stages) && s.stages.length > 0) {
          for (const st of s.stages) {
            if (st.completed && st.weight != null && st.weight > 0 && st.reps != null && st.reps > 0) {
              const weight = st.weight;
              const reps = st.reps;
              const est1RM = calculate1RM(weight, reps);
              const key = st.exerciseName.trim().toLowerCase();
              const existing = prMap.get(key);

              if (!existing || weight > existing.bestWeight || est1RM > existing.estimated1RM) {
                prMap.set(key, {
                  exerciseName: st.exerciseName,
                  bestWeight: weight,
                  reps,
                  estimated1RM: est1RM,
                  date: sessionDate,
                });
              }
            }
          }
        } else if (s.completed && s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0) {
          const weight = s.weight;
          const reps = s.reps;
          const est1RM = calculate1RM(weight, reps);
          const key = ex.exerciseName.trim().toLowerCase();
          const existing = prMap.get(key);

          if (!existing || weight > existing.bestWeight || est1RM > existing.estimated1RM) {
            prMap.set(key, {
              exerciseName: ex.exerciseName,
              bestWeight: weight,
              reps,
              estimated1RM: est1RM,
              date: sessionDate,
            });
          }
        }
      }
    }
  }

  // Sort by highest 1RM and limit
  return Array.from(prMap.values())
    .sort((a, b) => b.estimated1RM - a.estimated1RM)
    .slice(0, limit);
}

/**
 * Builds a compact, grounded context payload for the AI Coach from MongoDB records
 * Strictly scoped to `userId`. Anonymizes PII (removes email, name, passwordHash, googleId).
 */
export async function buildCoachContext(
  userId: mongoose.Types.ObjectId | string,
  rawClientSnapshot?: any
): Promise<CoachContextResult> {
  const dataSources: string[] = [];

  // 1. Fetch User Profile (Anonymized)
  const user = await User.findById(userId)
    .select('fitnessGoal experienceLevel trainingDaysPerWeek equipmentPreference currentWeight weightUnit')
    .lean();

  const userProfile = {
    fitnessGoal: user?.fitnessGoal || 'General Strength & Hypertrophy',
    experienceLevel: user?.experienceLevel || 'Intermediate',
    trainingDaysPerWeek: user?.trainingDaysPerWeek || 4,
    equipmentPreference: user?.equipmentPreference || 'commercial_gym',
    currentWeight: user?.currentWeight,
    weightUnit: user?.weightUnit || 'kg',
  };
  if (user) {
    dataSources.push('User Training Profile');
  }

  // 2. Fetch Active Workout Plan & Weekly Schedule
  const plan = await WorkoutPlan.findOne({ userId }).lean();
  let activePlan: CoachContextPayload['activePlan'] = null;

  if (plan && plan.weeklyPlan) {
    const scheduleSummary: Record<string, string> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (const day of days) {
      const dayConf = (plan.weeklyPlan as any)[day];
      if (!dayConf || dayConf.isRest) {
        scheduleSummary[day] = 'Rest Day';
      } else {
        const muscles = (dayConf.muscleGroups || []).map((m: any) => m.displayName || m.name).join(', ');
        scheduleSummary[day] = `${dayConf.name || 'Workout'}: ${muscles || 'Full Body'}`;
      }
    }

    activePlan = {
      templateName: plan.templateName || 'Custom Split',
      trainingDaysPerWeek: plan.trainingDaysPerWeek || 4,
      weeklySchedule: scheduleSummary,
    };
    dataSources.push('Active Training Plan');
  }

  // 3. Fetch Active Goals
  const goals = await Goal.find({ userId, status: 'active' })
    .limit(5)
    .select('title type exerciseName startValue targetValue unit')
    .lean();

  const activeGoals = goals.map((g) => ({
    title: g.title,
    type: g.type,
    exerciseName: g.exerciseName,
    startValue: g.startValue,
    targetValue: g.targetValue,
    unit: g.unit,
  }));
  if (activeGoals.length > 0) {
    dataSources.push(`Active Goals (${activeGoals.length})`);
  }

  // 4. Fetch Recent Completed Workouts (Last 10 sessions)
  const recentWorkoutsDocs = await Workout.find({
    userId,
    status: 'completed',
  })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  const recentWorkouts: WorkoutSummary[] = recentWorkoutsDocs.map((w) => {
    const formattedDate = w.date ? new Date(w.date).toISOString().split('T')[0] : 'Unknown';

    const exerciseSummaries: WorkoutExerciseSummary[] = (w.exercises || []).map((ex) => {
      const completedSets: WorkoutSetSummary[] = [];

      for (const s of ex.sets || []) {
        if (Array.isArray(s.stages) && s.stages.length > 0) {
          for (const st of s.stages) {
            if (st.completed && (st.reps != null && st.reps > 0)) {
              completedSets.push({
                setNumber: completedSets.length + 1,
                weight: st.weight != null ? Number(st.weight) : null,
                reps: Number(st.reps),
              });
            }
          }
        } else if (s.completed && s.reps != null && s.reps > 0) {
          completedSets.push({
            setNumber: s.setNumber || completedSets.length + 1,
            weight: s.weight != null ? Number(s.weight) : null,
            reps: Number(s.reps),
          });
        }
      }

      return {
        exerciseName: ex.exerciseName,
        primaryMuscle: ex.primaryMuscle,
        completedSets,
      };
    });

    return {
      id: w._id ? w._id.toString() : undefined,
      date: formattedDate,
      name: w.workoutName || 'Workout',
      dayOfWeek: w.dayOfWeek || '',
      rating: w.rating || null,
      totalVolumeKg: Math.round(w.totalVolume || 0),
      totalSets: w.totalSets || 0,
      durationMinutes: w.duration ? Math.round(w.duration / 60) : undefined,
      exercises: exerciseSummaries,
    };
  });

  if (recentWorkouts.length > 0) {
    dataSources.push(`Completed Workouts (${recentWorkouts.length})`);
  }

  // 5. Calculate 30-Day Completed Working Sets per Muscle Group directly from MongoDB
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const thirtyDayWorkouts = await Workout.find({
    userId,
    status: 'completed',
    date: { $gte: thirtyDaysAgo },
  }).lean();

  const muscleVolumeLast30Days: Record<string, number> = {};
  for (const session of thirtyDayWorkouts) {
    for (const ex of session.exercises || []) {
      const muscle = (ex.primaryMuscle || 'other').trim().toLowerCase();
      let completedSetCount = 0;
      for (const s of ex.sets || []) {
        if (s.completed && s.reps != null && s.reps > 0) {
          completedSetCount += 1;
        }
      }
      if (completedSetCount > 0) {
        muscleVolumeLast30Days[muscle] = (muscleVolumeLast30Days[muscle] || 0) + completedSetCount;
      }
    }
  }
  if (Object.keys(muscleVolumeLast30Days).length > 0) {
    dataSources.push('30-Day Muscle Volume Tallies');
  }

  // 6. Calculate Top PRs
  const personalRecords = await deriveUserPRs(userId);
  if (personalRecords.length > 0) {
    dataSources.push(`Personal Records (${personalRecords.length})`);
  }

  // 7. Process Client Intelligence Snapshot (if safely provided)
  let clientIntelligence: ClientIntelligenceSnapshot | null = null;
  let intelligenceEngineStatus =
    'No client snapshot supplied. Live biomechanical readiness and adaptive progressive targets are evaluated on the client workout screens.';

  if (rawClientSnapshot && typeof rawClientSnapshot === 'object') {
    clientIntelligence = {};

    if (rawClientSnapshot.muscleReadiness && typeof rawClientSnapshot.muscleReadiness === 'object') {
      clientIntelligence.muscleReadiness = rawClientSnapshot.muscleReadiness;
      dataSources.push('Client Muscle Readiness Snapshot');
    }

    if (Array.isArray(rawClientSnapshot.persistentUnderexposure)) {
      clientIntelligence.persistentUnderexposure = rawClientSnapshot.persistentUnderexposure.slice(0, 10);
      dataSources.push('Client Persistent Underexposure Alerts');
    }

    if (Array.isArray(rawClientSnapshot.adaptiveRecommendations)) {
      clientIntelligence.adaptiveRecommendations = rawClientSnapshot.adaptiveRecommendations.slice(0, 10);
      dataSources.push('Client Adaptive Overload Recommendations');
    }

    intelligenceEngineStatus =
      'Client intelligence snapshot received. Combined with historical MongoDB data for contextual accuracy.';
  }

  const contextPayload: CoachContextPayload = {
    userProfile,
    activePlan,
    activeGoals,
    personalRecords,
    recentWorkouts,
    muscleVolumeLast30Days,
    clientIntelligence,
    intelligenceEngineStatus,
  };

  return {
    contextPayload,
    dataSources,
  };
}
