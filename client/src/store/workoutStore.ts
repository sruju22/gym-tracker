import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Exercise,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  WeeklySchedule,
  PersonalRecord,
  UserSettings,
  MuscleGroup,
  MuscleArea,
  Equipment,
  ExerciseType,
  PreviousPerformance,
  Goal,
  GoalType,
  MuscleGroupConfig,
} from '../types';
import { INITIAL_EXERCISES } from '../data/exercises';
import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlan';
import { MUSCLE_GROUPS } from '../data/muscleGroups';
import { getTodayDayOfWeek } from '../utils/formatters';
import { calculate1RM } from '../utils/oneRM';
import { fetchWorkoutPlan, updateWorkoutPlanApi, createWorkoutPlanApi } from '../api/workoutPlanApi';
import { fetchWorkoutHistoryApi, createWorkoutHistoryApi } from '../api/workoutHistoryApi';
import {
  fetchPersonalRecordsApi,
  fetchProgressSummaryApi,
  fetchVolumeTrendApi,
  ProgressSummaryResponse,
  VolumeTrendPoint,
} from '../api/progressApi';

export interface UserWorkoutData {
  history: WorkoutSession[];
  personalRecords: PersonalRecord[];
  customExercises: Exercise[];
  weeklyPlan: WeeklySchedule;
  workoutPlanDocId?: string;
  activeSession: WorkoutSession | null;
  goals: Goal[];
  currentWeight?: number;
  progressSummary?: ProgressSummaryResponse;
  volumeTrend?: VolumeTrendPoint[];
}

interface WorkoutStore {
  userDataMap: Record<string, UserWorkoutData>;
  settings: UserSettings;
  isFinishing: boolean;

  // Selectors for active user ID
  getUserData: (userId: string) => UserWorkoutData;
  getExercises: (userId: string) => Exercise[];
  getWeeklyPlan: (userId: string) => WeeklySchedule;
  getActiveSession: (userId: string) => WorkoutSession | null;
  getHistory: (userId: string) => WorkoutSession[];
  getPersonalRecords: (userId: string) => PersonalRecord[];
  getExercisePR: (userId: string, exerciseId: string) => PersonalRecord | undefined;
  getPreviousPerformance: (userId: string, exerciseId: string) => PreviousPerformance | null;
  getGoals: (userId: string) => Goal[];

  // Actions - Workout Session & Progress
  fetchHistory: (userId: string) => Promise<WorkoutSession[]>;
  fetchBackendPRs: (userId: string) => Promise<PersonalRecord[]>;
  fetchProgressStats: (userId: string) => Promise<void>;
  startTodayWorkout: (userId: string) => void;
  startCustomWorkout: (userId: string, muscleGroups: MuscleGroup[]) => void;
  addMuscleSectionToWorkout: (userId: string, muscleGroup: MuscleGroup) => void;
  updateSet: (userId: string, exerciseId: string, setIndex: number, weight: number | null, reps: number | null) => void;
  toggleSetCompleted: (userId: string, exerciseId: string, setIndex: number) => void;
  addSetToExercise: (userId: string, exerciseId: string) => void;
  removeSetFromExercise: (userId: string, exerciseId: string, setIndex: number) => void;
  addExerciseToWorkout: (userId: string, exercise: Exercise) => void;
  removeExerciseFromWorkout: (userId: string, exerciseId: string) => void;
  toggleExerciseCompleted: (userId: string, exerciseId: string) => void;
  updateExerciseNotes: (userId: string, exerciseId: string, notes: string) => void;
  finishWorkout: (userId: string) => void;
  cancelWorkout: (userId: string) => void;

  // Actions - Custom Exercises (CRUD)
  addCustomExercise: (
    userId: string,
    exerciseData: {
      name: string;
      primaryMuscle: MuscleGroup;
      muscleAreaEmphasis: MuscleArea[];
      equipment: Equipment;
      exerciseType: ExerciseType;
      imageUrl?: string;
      notes?: string;
    }
  ) => Exercise;

  updateCustomExercise: (
    userId: string,
    exerciseId: string,
    exerciseData: Partial<{
      name: string;
      primaryMuscle: MuscleGroup;
      muscleAreaEmphasis: MuscleArea[];
      equipment: Equipment;
      exerciseType: ExerciseType;
      instructions: string[];
      imageUrl?: string;
    }>
  ) => void;

  deleteCustomExercise: (userId: string, exerciseId: string) => void;

  // Actions - Fitness Goals (CRUD)
  addGoal: (
    userId: string,
    goalData: {
      title: string;
      type: GoalType;
      exerciseId?: string;
      exerciseName?: string;
      startValue: number;
      currentValue: number;
      targetValue: number;
      unit: 'kg' | 'lbs';
    }
  ) => Goal;

  updateGoal: (userId: string, goalId: string, goalData: Partial<Goal>) => void;
  deleteGoal: (userId: string, goalId: string) => void;
  updateCurrentWeight: (userId: string, newWeight: number) => void;

  // Actions - Plan Settings & User Settings
  fetchWeeklyPlan: (userId: string) => Promise<WeeklySchedule>;
  updateWeeklyPlan: (userId: string, newPlan: WeeklySchedule) => Promise<void>;
  resetWeeklyPlan: (userId: string) => Promise<void>;
  updateUserSettings: (newSettings: Partial<UserSettings>) => void;
}

// Initial mock data structure for Srujan
const createDefaultUserData = (): UserWorkoutData => {
  const sampleBenchEx = INITIAL_EXERCISES[0] || {
    id: 'ex_bench_press',
    name: 'Flat Barbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    muscleAreaEmphasis: ['mid_chest'],
    equipment: 'barbell',
    exerciseType: 'compound',
    difficulty: 'intermediate',
    instructions: ['Lie on bench', 'Lower bar to chest', 'Press up'],
    imageUrl: '/exercises/flat-barbell-bench-press/0.jpg',
    tags: ['chest', 'barbell'],
    isCustom: false,
  };

  const sampleLatRaiseEx = INITIAL_EXERCISES.find((e) => e.name.toLowerCase().includes('lateral raise')) || {
    id: 'ex_lateral_raise',
    name: 'Dumbbell Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    muscleAreaEmphasis: ['side_delts'],
    equipment: 'dumbbell',
    exerciseType: 'isolation',
    difficulty: 'beginner',
    instructions: ['Raise dumbbells laterally to shoulder level'],
    imageUrl: '/exercises/dumbbell-lateral-raise/0.jpg',
    tags: ['shoulders', 'dumbbell'],
    isCustom: false,
  };

  return {
    history: [
      {
        id: 'hist_1',
        workoutName: 'Push A',
        date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        dayOfWeek: 'monday',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        status: 'completed',
        totalVolume: 4250,
        totalSets: 6,
        exercises: [
          {
            id: 'hex_1',
            exerciseId: sampleBenchEx.id,
            exercise: sampleBenchEx,
            order: 1,
            notes: 'Strong bench session',
            sets: [
              { id: 'hs_1', setNumber: 1, weight: 70, reps: 10, completed: true },
              { id: 'hs_2', setNumber: 2, weight: 75, reps: 8, completed: true },
              { id: 'hs_3', setNumber: 3, weight: 75, reps: 5, completed: true },
            ],
          },
          {
            id: 'hex_2',
            exerciseId: sampleLatRaiseEx.id,
            exercise: sampleLatRaiseEx,
            order: 2,
            notes: 'Strict form',
            sets: [
              { id: 'hs_4', setNumber: 1, weight: 12, reps: 12, completed: true },
              { id: 'hs_5', setNumber: 2, weight: 14, reps: 10, completed: true },
              { id: 'hs_6', setNumber: 3, weight: 14, reps: 10, completed: true },
            ],
          },
        ],
      },
    ],
    personalRecords: [],
    customExercises: [],
    weeklyPlan: JSON.parse(JSON.stringify(DEFAULT_WORKOUT_PLAN)),
    activeSession: null,
    currentWeight: 66,
    goals: [
      {
        id: 'goal_1',
        title: 'Target Body Weight',
        type: 'body_weight',
        startValue: 66,
        currentValue: 66,
        targetValue: 72,
        unit: 'kg',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal_2',
        title: 'Bench Press Target',
        type: 'exercise_strength',
        exerciseId: sampleBenchEx.id,
        exerciseName: sampleBenchEx.name,
        startValue: 75,
        currentValue: 75,
        targetValue: 100,
        unit: 'kg',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
};

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      userDataMap: {
        user_srujan: createDefaultUserData(),
      },
      settings: {
        weightUnit: 'kg',
        theme: 'dark',
        defaultSetsPerExercise: 3,
        rotationWindowDays: 7,
      },
      isFinishing: false,

      // Selectors with auto-fallback for newly created users
      getUserData: (userId: string) => {
        const { userDataMap } = get();
        if (!userDataMap[userId]) {
          const newDefault: UserWorkoutData = {
            history: [],
            personalRecords: [],
            customExercises: [],
            weeklyPlan: JSON.parse(JSON.stringify(DEFAULT_WORKOUT_PLAN)),
            activeSession: null,
            goals: [],
            currentWeight: 70,
          };
          set((state) => ({
            userDataMap: {
              ...state.userDataMap,
              [userId]: newDefault,
            },
          }));
          return newDefault;
        }
        return userDataMap[userId];
      },

      getExercises: (userId: string) => {
        const userData = get().getUserData(userId);
        return [...INITIAL_EXERCISES, ...(userData.customExercises || [])];
      },

      getWeeklyPlan: (userId: string) => {
        const userData = get().getUserData(userId);
        return userData.weeklyPlan || DEFAULT_WORKOUT_PLAN;
      },

      getActiveSession: (userId: string) => {
        const userData = get().getUserData(userId);
        return userData.activeSession;
      },

      getHistory: (userId: string) => {
        const userData = get().getUserData(userId);
        return userData.history || [];
      },

      getPersonalRecords: (userId: string) => {
        const userData = get().getUserData(userId);
        const storedPRs = userData.personalRecords || [];
        if (storedPRs.length > 0) return storedPRs;

        const history = userData.history || [];
        const prMap = new Map<string, PersonalRecord>();

        history
          .filter((h) => h.status === 'completed')
          .forEach((session) => {
            session.exercises.forEach((ex) => {
              const completedSets = ex.sets.filter(
                (s) => s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0
              );
              completedSets.forEach((s) => {
                const weight = s.weight!;
                const reps = s.reps!;
                const est1RM = calculate1RM(weight, reps);
                const exId = ex.exerciseId || ex.id;
                const existing = prMap.get(exId);

                const isBetter =
                  !existing ||
                  weight > existing.weight ||
                  est1RM > existing.estimated1RM ||
                  (weight === existing.weight && reps > existing.reps);

                if (isBetter) {
                  prMap.set(exId, {
                    id: existing ? existing.id : `pr_${exId}`,
                    exerciseId: exId,
                    exerciseName: ex.exercise.name,
                    type: 'max_weight',
                    value: weight,
                    weight,
                    reps,
                    estimated1RM: est1RM,
                    date: session.date,
                  });
                }
              });
            });
          });

        return Array.from(prMap.values());
      },

      getExercisePR: (userId: string, exerciseId: string) => {
        const prs = get().getPersonalRecords(userId);
        return prs.find((p) => p.exerciseId === exerciseId || p.id === exerciseId);
      },

      getGoals: (userId: string) => {
        const userData = get().getUserData(userId);
        return userData.goals || [];
      },

      getPreviousPerformance: (userId: string, exerciseId: string) => {
        const history = get().getHistory(userId);

        // Find most recent completed workout containing this exercise
        const completedSessions = history
          .filter((h) => h.status === 'completed')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const session of completedSessions) {
          const matchingEx = session.exercises.find(
            (e) => e.exerciseId === exerciseId || e.exercise.id === exerciseId
          );
          if (matchingEx) {
            const completedSets = matchingEx.sets.filter(
              (s) => s.completed && s.weight !== null && s.reps !== null
            );
            if (completedSets.length > 0) {
              const formattedSets = completedSets.map((s) => ({
                setNumber: s.setNumber,
                weight: s.weight!,
                reps: s.reps!,
              }));
              const bestWeight = Math.max(...formattedSets.map((s) => s.weight));
              const bestSet = formattedSets.find((s) => s.weight === bestWeight) || formattedSets[0];
              const estimated1RM = calculate1RM(bestSet.weight, bestSet.reps);

              return {
                date: session.date,
                workoutName: session.workoutName,
                sets: formattedSets,
                bestWeight,
                bestReps: bestSet.reps,
                estimated1RM,
              };
            }
          }
        }
        return null;
      },

      // Workout Session Actions
      fetchHistory: async (userId: string) => {
        try {
          const data = await fetchWorkoutHistoryApi();
          if (data && Array.isArray(data.workouts)) {
            const backendHistory: WorkoutSession[] = data.workouts.map((w: any) => ({
              id: w._id || w.id,
              workoutName: w.workoutName,
              date: typeof w.date === 'string' ? w.date : new Date(w.date).toISOString(),
              dayOfWeek: w.dayOfWeek,
              muscleGroups: w.muscleGroups || [],
              status: w.status || 'completed',
              startedAt: w.startedAt ? new Date(w.startedAt).toISOString() : undefined,
              completedAt: w.completedAt ? new Date(w.completedAt).toISOString() : undefined,
              totalVolume: w.totalVolume || 0,
              totalSets: w.totalSets || 0,
              exercises: Array.isArray(w.exercises)
                ? w.exercises.map((ex: any) => ({
                    id: ex.id || ex.exerciseId,
                    exerciseId: ex.exerciseId,
                    exercise: {
                      id: ex.exerciseId,
                      name: ex.exerciseName,
                      primaryMuscle: ex.primaryMuscle || 'chest',
                      secondaryMuscles: [],
                      muscleAreaEmphasis: ex.muscleAreaEmphasis || [],
                      equipment: ex.equipment || 'barbell',
                      exerciseType: ex.exerciseType || 'compound',
                      difficulty: 'intermediate',
                      instructions: [],
                      imageUrl: `/exercises/${ex.exerciseName ? ex.exerciseName.replace(/ /g, '_') : 'default'}/0.jpg`,
                      tags: [],
                      isCustom: false,
                    },
                    order: ex.order || 1,
                    sets: Array.isArray(ex.sets)
                      ? ex.sets.map((s: any) => ({
                          id: `set_${s.setNumber}`,
                          setNumber: s.setNumber,
                          weight: s.weight,
                          reps: s.reps,
                          completed: s.completed,
                        }))
                      : [],
                    notes: ex.notes || '',
                  }))
                : [],
            }));

            set((state) => ({
              userDataMap: {
                ...state.userDataMap,
                [userId]: {
                  ...state.getUserData(userId),
                  history: backendHistory,
                },
              },
            }));

            return backendHistory;
          }
        } catch (err) {
          console.warn('Failed to fetch backend workout history:', err);
        }
        return get().getHistory(userId);
      },

      fetchBackendPRs: async (userId: string) => {
        try {
          const res = await fetchPersonalRecordsApi();
          if (res && Array.isArray(res.personalRecords)) {
            set((state) => ({
              userDataMap: {
                ...state.userDataMap,
                [userId]: {
                  ...state.getUserData(userId),
                  personalRecords: res.personalRecords,
                },
              },
            }));
            return res.personalRecords;
          }
        } catch (err) {
          console.warn('Failed to fetch backend PRs, fallback to local calculation:', err);
        }
        return get().getPersonalRecords(userId);
      },

      fetchProgressStats: async (userId: string) => {
        try {
          const [summaryRes, trendRes] = await Promise.all([
            fetchProgressSummaryApi(),
            fetchVolumeTrendApi(),
          ]);

          set((state) => ({
            userDataMap: {
              ...state.userDataMap,
              [userId]: {
                ...state.getUserData(userId),
                progressSummary: summaryRes,
                volumeTrend: trendRes.volumeTrend,
              },
            },
          }));
        } catch (err) {
          console.warn('Failed to fetch backend progress stats:', err);
        }
      },

      startTodayWorkout: (userId: string) => {
        const userData = get().getUserData(userId);
        if (userData.activeSession) return;

        const plan = userData.weeklyPlan || DEFAULT_WORKOUT_PLAN;
        const today = getTodayDayOfWeek();
        const dayConfig = plan[today];

        if (dayConfig.isRest) {
          get().startCustomWorkout(userId, ['chest']);
          return;
        }

        const targetMuscles = dayConfig.muscleGroups.map((m) => m.name);

        const newSession: WorkoutSession = {
          id: `session_${Date.now()}`,
          workoutName: dayConfig.name,
          date: new Date().toISOString(),
          dayOfWeek: today,
          muscleGroups: targetMuscles,
          sections: dayConfig.muscleGroups,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          exercises: [],
          totalVolume: 0,
          totalSets: 0,
        };

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: newSession,
            },
          },
        }));
      },

      startCustomWorkout: (userId: string, muscleGroups: MuscleGroup[]) => {
        const userData = get().getUserData(userId);
        if (userData.activeSession) return;

        const today = getTodayDayOfWeek();

        const sections: MuscleGroupConfig[] = [];
        muscleGroups.forEach((mg) => {
          if (mg === 'legs') {
            sections.push(
              { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
              { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
              { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
              { name: 'calves', displayName: 'Calves', subAreas: ['calves'] }
            );
          } else if (mg === 'glutes') {
            sections.push({ name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] });
          } else if (mg === 'calves') {
            sections.push({ name: 'calves', displayName: 'Calves', subAreas: ['calves'] });
          } else {
            sections.push({
              name: mg,
              displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
            });
          }
        });

        const newSession: WorkoutSession = {
          id: `session_${Date.now()}`,
          workoutName: 'Custom Workout',
          date: new Date().toISOString(),
          dayOfWeek: today,
          muscleGroups,
          sections,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          exercises: [],
          totalVolume: 0,
          totalSets: 0,
        };

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: newSession,
            },
          },
        }));
      },

      addMuscleSectionToWorkout: (userId: string, muscleGroup: MuscleGroup) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const currentSections = activeSession.sections && activeSession.sections.length > 0
          ? [...activeSession.sections]
          : activeSession.muscleGroups.map((mg) => ({
              name: mg,
              displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
            }));

        const newSections: MuscleGroupConfig[] = [];

        if (muscleGroup === 'legs') {
          const legItems: MuscleGroupConfig[] = [
            { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
            { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
            { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
            { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          ];
          legItems.forEach((item) => {
            if (!currentSections.some((s) => s.displayName === item.displayName)) {
              newSections.push(item);
            }
          });
        } else if (muscleGroup === 'glutes') {
          if (!currentSections.some((s) => s.displayName === 'Glutes')) {
            newSections.push({ name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] });
          }
        } else if (muscleGroup === 'calves') {
          if (!currentSections.some((s) => s.displayName === 'Calves')) {
            newSections.push({ name: 'calves', displayName: 'Calves', subAreas: ['calves'] });
          }
        } else {
          if (!currentSections.some((s) => s.name === muscleGroup)) {
            const meta = MUSCLE_GROUPS[muscleGroup];
            newSections.push({
              name: muscleGroup,
              displayName: meta ? meta.name.toUpperCase() : muscleGroup.toUpperCase(),
            });
          }
        }

        if (newSections.length === 0) return;

        const updatedSections = [...currentSections, ...newSections];
        const updatedMuscleGroups = activeSession.muscleGroups.includes(muscleGroup)
          ? activeSession.muscleGroups
          : [...activeSession.muscleGroups, muscleGroup];

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                muscleGroups: updatedMuscleGroups,
                sections: updatedSections,
              },
            },
          },
        }));
      },

      updateSet: (userId, exerciseId, setIndex, weight, reps) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;

          const updatedSets = [...ex.sets];
          const currentSet = updatedSets[setIndex];
          if (currentSet) {
            const isValid = weight !== null && weight > 0 && reps !== null && reps > 0;
            updatedSets[setIndex] = {
              ...currentSet,
              weight,
              reps,
              completed: currentSet.completed && isValid,
            };
          }
          return { ...ex, sets: updatedSets };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      toggleSetCompleted: (userId, exerciseId, setIndex) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;

          const updatedSets = [...ex.sets];
          const currentSet = updatedSets[setIndex];
          if (currentSet) {
            const isValid =
              currentSet.weight !== null &&
              currentSet.weight > 0 &&
              currentSet.reps !== null &&
              currentSet.reps > 0;

            if (!currentSet.completed && !isValid) {
              return ex;
            }

            updatedSets[setIndex] = {
              ...currentSet,
              completed: !currentSet.completed && isValid,
            };
          }
          return { ...ex, sets: updatedSets };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      addSetToExercise: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;

          const lastSet = ex.sets[ex.sets.length - 1];
          const newSetNumber = ex.sets.length + 1;

          const newSet: WorkoutSet = {
            id: `set_${Date.now()}_${newSetNumber}`,
            setNumber: newSetNumber,
            weight: lastSet ? lastSet.weight : null,
            reps: lastSet ? lastSet.reps : null,
            completed: false,
          };

          return { ...ex, sets: [...ex.sets, newSet] };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: updatedExercises,
                totalSets: activeSession.totalSets + 1,
              },
            },
          },
        }));
      },

      removeSetFromExercise: (userId, exerciseId, setIndex) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;
          if (ex.sets.length <= 1) return ex;

          const filteredSets = ex.sets.filter((_, idx) => idx !== setIndex);
          const reindexedSets = filteredSets.map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
          }));

          return { ...ex, sets: reindexedSets };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      addExerciseToWorkout: (userId, exercise) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        if (activeSession.exercises.some((e) => e.exerciseId === exercise.id)) return;

        const newWorkoutExercise: WorkoutExercise = {
          id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          exerciseId: exercise.id,
          exercise,
          order: activeSession.exercises.length + 1,
          notes: '',
          sets: Array.from({ length: 3 }, (_, i) => ({
            id: `set_${Date.now()}_${i + 1}`,
            setNumber: i + 1,
            weight: null,
            reps: null,
            completed: false,
          })),
        };

        const currentSections = activeSession.sections && activeSession.sections.length > 0
          ? [...activeSession.sections]
          : activeSession.muscleGroups.map((mg) => ({
              name: mg,
              displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
            }));

        let updatedSections = currentSections;
        let updatedMuscleGroups = activeSession.muscleGroups;

        if (!currentSections.some((s) => s.name === exercise.primaryMuscle)) {
          const meta = MUSCLE_GROUPS[exercise.primaryMuscle];
          const newSec = {
            name: exercise.primaryMuscle,
            displayName: meta ? meta.name.toUpperCase() : exercise.primaryMuscle.toUpperCase(),
          };
          updatedSections = [...currentSections, newSec];
          if (!updatedMuscleGroups.includes(exercise.primaryMuscle)) {
            updatedMuscleGroups = [...updatedMuscleGroups, exercise.primaryMuscle];
          }
        }

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                muscleGroups: updatedMuscleGroups,
                sections: updatedSections,
                exercises: [...activeSession.exercises, newWorkoutExercise],
                totalSets: activeSession.totalSets + 3,
              },
            },
          },
        }));
      },

      removeExerciseFromWorkout: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const filtered = activeSession.exercises.filter(
          (ex) => ex.exerciseId !== exerciseId && ex.id !== exerciseId
        );

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: filtered,
              },
            },
          },
        }));
      },

      toggleExerciseCompleted: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId === exerciseId || ex.id === exerciseId) {
            const nextCompleted = !ex.completed;
            const updatedSets = nextCompleted
              ? ex.sets.map((s) => {
                  const isValid = s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0;
                  return { ...s, completed: s.completed || isValid };
                })
              : ex.sets;

            return { ...ex, completed: nextCompleted, sets: updatedSets };
          }
          return ex;
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      updateExerciseNotes: (userId, exerciseId, notes) => {
        const userData = get().getUserData(userId);
        const { activeSession } = userData;
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId === exerciseId || ex.id === exerciseId) {
            return { ...ex, notes };
          }
          return ex;
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: {
                ...activeSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      finishWorkout: (userId) => {
        const { isFinishing } = get();
        if (isFinishing) return;

        set({ isFinishing: true });

        try {
          const userData = get().getUserData(userId);
          const { activeSession, history, personalRecords, goals } = userData;

          if (!activeSession) {
            set({ isFinishing: false });
            return;
          }

          let totalVolume = 0;
          let totalCompletedSets = 0;
          const updatedPRs: PersonalRecord[] = [...personalRecords];
          const newPRsInSession: PersonalRecord[] = [];
          const updatedGoals: Goal[] = [...goals];

          activeSession.exercises.forEach((ex) => {
            const completedSets = ex.sets.filter(
              (s) => s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0
            );

            completedSets.forEach((s) => {
              const weight = s.weight!;
              const reps = s.reps!;
              totalVolume += weight * reps;
              totalCompletedSets++;

              const est1RM = calculate1RM(weight, reps);

              // Check existing PR for this exercise
              const prIndex = updatedPRs.findIndex((p) => p.exerciseId === ex.exerciseId);
              const existingPR = prIndex >= 0 ? updatedPRs[prIndex] : null;

              const isNewPR =
                !existingPR ||
                weight > existingPR.weight ||
                est1RM > existingPR.estimated1RM ||
                (weight === existingPR.weight && reps > existingPR.reps);

              if (isNewPR) {
                const prRecord: PersonalRecord = {
                  id: existingPR ? existingPR.id : `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                  exerciseId: ex.exerciseId,
                  exerciseName: ex.exercise.name,
                  type: 'max_weight',
                  value: weight,
                  weight,
                  reps,
                  estimated1RM: est1RM,
                  date: new Date().toISOString(),
                  details: `${weight} kg × ${reps} reps (Est. 1RM ${est1RM} kg)`,
                };

                if (prIndex >= 0) {
                  updatedPRs[prIndex] = prRecord;
                } else {
                  updatedPRs.push(prRecord);
                }

                if (!newPRsInSession.some((p) => p.exerciseId === ex.exerciseId)) {
                  newPRsInSession.push(prRecord);
                }

                // Update strength goal for this exercise if present
                updatedGoals.forEach((g) => {
                  if (g.type === 'exercise_strength' && g.exerciseId === ex.exerciseId) {
                    g.currentValue = Math.max(g.currentValue, weight);
                    g.updatedAt = new Date().toISOString();
                  }
                });
              }
            });
          });

          const apiExercises = activeSession.exercises.map((ex) => ({
            exerciseId: ex.exerciseId || ex.exercise.id,
            exerciseName: ex.exercise.name,
            primaryMuscle: ex.exercise.primaryMuscle,
            muscleAreaEmphasis: ex.exercise.muscleAreaEmphasis,
            equipment: ex.exercise.equipment,
            exerciseType: ex.exercise.exerciseType,
            order: ex.order,
            sets: ex.sets.map((s) => ({
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              completed: Boolean(s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0),
            })),
            notes: ex.notes || '',
          }));

          const apiPayload = {
            workoutName: activeSession.workoutName || 'Workout Session',
            date: activeSession.date || new Date().toISOString(),
            dayOfWeek: activeSession.dayOfWeek || 'monday',
            muscleGroups: activeSession.muscleGroups || [],
            status: 'completed' as const,
            startedAt: activeSession.startedAt,
            completedAt: new Date().toISOString(),
            duration: activeSession.startedAt
              ? Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)
              : 0,
            exercises: apiExercises,
            notes: '',
            totalVolume,
            totalSets: totalCompletedSets,
            workoutPlanId: userData.workoutPlanDocId || undefined,
          };

          const completedSession: WorkoutSession = {
            ...activeSession,
            status: 'completed',
            completedAt: new Date().toISOString(),
            totalVolume,
            totalSets: totalCompletedSets,
            newPRs: newPRsInSession,
            exercises: activeSession.exercises.map((ex) => ({
              ...ex,
              sets: ex.sets.map((s) => ({
                ...s,
                completed: Boolean(s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0),
              })),
            })),
          };

          // Optimistically save locally
          set((state) => ({
            isFinishing: false,
            userDataMap: {
              ...state.userDataMap,
              [userId]: {
                ...state.getUserData(userId),
                history: [completedSession, ...history],
                personalRecords: updatedPRs,
                goals: updatedGoals,
                activeSession: null,
              },
            },
          }));

          // Async persist to MongoDB Atlas backend
          createWorkoutHistoryApi(apiPayload)
            .then((res) => {
              if (res && res.workout && res.workout._id) {
                const mongoId = res.workout._id;
                set((state) => {
                  const uData = state.getUserData(userId);
                  const updatedHistory = uData.history.map((h) =>
                    h.id === completedSession.id ? { ...h, id: mongoId } : h
                  );
                  return {
                    userDataMap: {
                      ...state.userDataMap,
                      [userId]: {
                        ...uData,
                        history: updatedHistory,
                      },
                    },
                  };
                });
              }
              // Refresh backend PRs and progress summary stats dynamically derived from MongoDB WorkoutSessions
              get().fetchBackendPRs(userId);
              get().fetchProgressStats(userId);
            })
            .catch((err) => {
              console.error('Failed to persist completed workout session to backend:', err);
            });
        } catch (error) {
          set({ isFinishing: false });
        }
      },

      cancelWorkout: (userId) => {
        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              activeSession: null,
            },
          },
        }));
      },

      // Custom Exercises Actions
      addCustomExercise: (userId, exerciseData) => {
        const userData = get().getUserData(userId);
        const newExercise: Exercise = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: exerciseData.name,
          primaryMuscle: exerciseData.primaryMuscle,
          secondaryMuscles: [],
          muscleAreaEmphasis: exerciseData.muscleAreaEmphasis,
          equipment: exerciseData.equipment,
          exerciseType: exerciseData.exerciseType,
          difficulty: 'intermediate',
          instructions: exerciseData.notes
            ? [exerciseData.notes]
            : ['User-created custom exercise.'],
          imageUrl:
            exerciseData.imageUrl ||
            '/exercises/flat-barbell-bench-press/0.jpg',
          tags: ['custom', exerciseData.primaryMuscle],
          isCustom: true,
        };

        const updatedCustom = [newExercise, ...(userData.customExercises || [])];

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              customExercises: updatedCustom,
            },
          },
        }));

        return newExercise;
      },

      updateCustomExercise: (userId, exerciseId, exerciseData) => {
        const userData = get().getUserData(userId);
        const updatedCustom = userData.customExercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            ...exerciseData,
            name: exerciseData.name ?? ex.name,
            primaryMuscle: exerciseData.primaryMuscle ?? ex.primaryMuscle,
            muscleAreaEmphasis: exerciseData.muscleAreaEmphasis ?? ex.muscleAreaEmphasis,
            equipment: exerciseData.equipment ?? ex.equipment,
            exerciseType: exerciseData.exerciseType ?? ex.exerciseType,
            instructions: exerciseData.instructions ?? ex.instructions,
            imageUrl: exerciseData.imageUrl ?? ex.imageUrl,
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              customExercises: updatedCustom,
            },
          },
        }));
      },

      deleteCustomExercise: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const filteredCustom = userData.customExercises.filter((ex) => ex.id !== exerciseId);

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              customExercises: filteredCustom,
            },
          },
        }));
      },

      // Goals Actions
      addGoal: (userId, goalData) => {
        const userData = get().getUserData(userId);
        const newGoal: Goal = {
          id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: goalData.title,
          type: goalData.type,
          exerciseId: goalData.exerciseId,
          exerciseName: goalData.exerciseName,
          startValue: goalData.startValue,
          currentValue: goalData.currentValue,
          targetValue: goalData.targetValue,
          unit: goalData.unit,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedGoals = [newGoal, ...(userData.goals || [])];

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              goals: updatedGoals,
            },
          },
        }));

        return newGoal;
      },

      updateGoal: (userId, goalId, goalData) => {
        const userData = get().getUserData(userId);
        const updatedGoals = userData.goals.map((g) => {
          if (g.id !== goalId) return g;
          return {
            ...g,
            ...goalData,
            updatedAt: new Date().toISOString(),
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              goals: updatedGoals,
            },
          },
        }));
      },

      deleteGoal: (userId, goalId) => {
        const userData = get().getUserData(userId);
        const filteredGoals = userData.goals.filter((g) => g.id !== goalId);

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              goals: filteredGoals,
            },
          },
        }));
      },

      updateCurrentWeight: (userId, newWeight) => {
        const userData = get().getUserData(userId);
        const updatedGoals = userData.goals.map((g) => {
          if (g.type === 'body_weight') {
            return {
              ...g,
              currentValue: newWeight,
              updatedAt: new Date().toISOString(),
            };
          }
          return g;
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              currentWeight: newWeight,
              goals: updatedGoals,
            },
          },
        }));
      },

      // Weekly Plan Actions
      fetchWeeklyPlan: async (userId: string) => {
        try {
          const res = await fetchWorkoutPlan();
          if (res && res.plan) {
            const { _id, weeklyPlan } = res.plan;
            set((state) => ({
              userDataMap: {
                ...state.userDataMap,
                [userId]: {
                  ...state.getUserData(userId),
                  weeklyPlan,
                  workoutPlanDocId: _id,
                },
              },
            }));
            return weeklyPlan;
          }
        } catch (err) {
          console.warn('Failed to fetch backend workout plan, fallback to local state:', err);
        }
        return get().getWeeklyPlan(userId);
      },

      updateWeeklyPlan: async (userId, newPlan) => {
        // Optimistic local state update
        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              weeklyPlan: newPlan,
            },
          },
        }));

        const userData = get().getUserData(userId);
        const docId = userData.workoutPlanDocId;

        try {
          if (docId) {
            const res = await updateWorkoutPlanApi(docId, newPlan);
            if (res && res.plan && res.plan._id) {
              set((state) => ({
                userDataMap: {
                  ...state.userDataMap,
                  [userId]: {
                    ...state.getUserData(userId),
                    workoutPlanDocId: res.plan._id,
                  },
                },
              }));
            }
          } else {
            const res = await createWorkoutPlanApi(newPlan);
            if (res && res.plan && res.plan._id) {
              set((state) => ({
                userDataMap: {
                  ...state.userDataMap,
                  [userId]: {
                    ...state.getUserData(userId),
                    workoutPlanDocId: res.plan._id,
                  },
                },
              }));
            }
          }
        } catch (err) {
          console.error('Failed to persist workout plan update to backend:', err);
        }
      },

      resetWeeklyPlan: async (userId) => {
        const defaultPlan = JSON.parse(JSON.stringify(DEFAULT_WORKOUT_PLAN));
        await get().updateWeeklyPlan(userId, defaultPlan);
      },

      updateUserSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    }),
    {
      name: 'gym-tracker-store-v3',
    }
  )
);
