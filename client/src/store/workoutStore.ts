import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Exercise,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  WeeklySchedule,
  DayOfWeek,
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
  SavedCombination,
  CombinationType,
  WorkoutSetStage,
  WorkoutTemplate,
} from '../types';
import { normalizeCombinationExercises } from '../utils/combinationNormalizer';
import { INITIAL_EXERCISES } from '../data/exercises';
import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlan';
import { getTemplateById } from '../data/workoutTemplates';
import { MUSCLE_GROUPS } from '../data/muscleGroups';
import { getTodayDayOfWeek, isSameLocalDay } from '../utils/formatters';
import { calculate1RM } from '../utils/oneRM';
import { getLegSection, isLegSubArea } from '../utils/legSection';
import {
  fetchWorkoutPlan,
  updateWorkoutPlanApi,
  createWorkoutPlanApi,
  applyWorkoutTemplateApi,
} from '../api/workoutPlanApi';
import {
  fetchWorkoutHistoryApi,
  createWorkoutHistoryApi,
  updateWorkoutHistoryApi,
  deleteWorkoutHistoryApi,
} from '../api/workoutHistoryApi';
import { getStoredToken } from '../api/authApi';
import {
  fetchPersonalRecordsApi,
  fetchProgressSummaryApi,
  fetchVolumeTrendApi,
  ProgressSummaryResponse,
  VolumeTrendPoint,
} from '../api/progressApi';
import {
  fetchSavedCombinationsApi,
  createSavedCombinationApi,
  deleteSavedCombinationApi,
} from '../api/combinationApi';

export interface UserWorkoutData {
  history: WorkoutSession[];
  personalRecords: PersonalRecord[];
  customExercises: Exercise[];
  savedCombinations: SavedCombination[];
  weeklyPlan: WeeklySchedule;
  workoutPlanDocId?: string;
  activeTemplateId?: string;
  templateName?: string;
  fitnessGoal?: string;
  progressionRule?: string;
  activeSession: WorkoutSession | null;
  editingSession?: WorkoutSession | null;
  editingOriginalSession?: WorkoutSession | null;
  goals: Goal[];
  currentWeight?: number;
  progressSummary?: ProgressSummaryResponse;
  volumeTrend?: VolumeTrendPoint[];
}

interface WorkoutStore {
  userDataMap: Record<string, UserWorkoutData>;
  settings: UserSettings;
  isFinishing: boolean;
  saveError: string | null;

  // Selectors for active user ID
  getUserData: (userId: string) => UserWorkoutData;
  getExercises: (userId: string) => Exercise[];
  getWeeklyPlan: (userId: string) => WeeklySchedule;
  getActiveSession: (userId: string) => WorkoutSession | null;
  getEditingSession: (userId: string) => WorkoutSession | null;
  getTodayCompletedWorkout: (userId: string) => WorkoutSession | null;
  getHistory: (userId: string) => WorkoutSession[];
  getPersonalRecords: (userId: string) => PersonalRecord[];
  getExercisePR: (userId: string, exerciseId: string) => PersonalRecord | undefined;
  getPreviousPerformance: (userId: string, exerciseId: string) => PreviousPerformance | null;
  getGoals: (userId: string) => Goal[];
  getSavedCombinations: (userId: string) => SavedCombination[];
  fetchSavedCombinations: (userId: string) => Promise<void>;
  saveCombinationTemplate: (
    userId: string,
    template: Omit<SavedCombination, 'id' | 'createdAt'>
  ) => Promise<SavedCombination>;
  deleteCombinationTemplate: (userId: string, templateId: string) => Promise<boolean>;
  addCombinationToWorkout: (
    userId: string,
    combinationData: {
      combinationName: string;
      combinationType: CombinationType;
      techniqueLabel?: string;
      rounds: number;
      stages: Array<{
        exercise: Exercise;
        movementDescription?: string;
        targetWeight?: number | null;
        targetReps?: number | null;
      }>;
    }
  ) => void;
  removeCombinationFromWorkout: (userId: string, combinationId: string) => void;
  addRoundToCombination: (userId: string, combinationId: string) => void;
  updateCombinationStage: (
    userId: string,
    exerciseId: string,
    setIndex: number,
    stageIndex: number,
    weight: number | null,
    reps: number | null
  ) => void;
  toggleCombinationStageCompleted: (
    userId: string,
    exerciseId: string,
    setIndex: number,
    stageIndex: number
  ) => void;
  toggleCombinationSetCompleted: (
    userId: string,
    exerciseId: string,
    setIndex: number
  ) => void;
  removeSetFromCombination: (
    userId: string,
    exerciseId: string,
    setIndex: number
  ) => void;

  // Actions - Workout Session & Progress
  fetchHistory: (userId: string) => Promise<WorkoutSession[]>;
  fetchBackendPRs: (userId: string) => Promise<PersonalRecord[]>;
  fetchProgressStats: (userId: string) => Promise<void>;
  startTodayWorkout: (userId: string) => void;
  startScheduledWorkout: (userId: string, day: DayOfWeek) => void;
  startCustomWorkout: (userId: string, muscleGroups: MuscleGroup[]) => void;
  startEditingWorkout: (userId: string, session: WorkoutSession) => void;
  cancelEditingWorkout: (userId: string) => void;
  saveWorkoutEdits: (userId: string) => Promise<boolean>;
  deleteWorkout: (userId: string, workoutId: string) => Promise<boolean>;
  addMuscleSectionToWorkout: (userId: string, muscleGroup: MuscleGroup) => void;
  updateSet: (userId: string, exerciseId: string, setIndex: number, weight: number | null, reps: number | null) => void;
  toggleSetCompleted: (userId: string, exerciseId: string, setIndex: number) => void;
  addSetToExercise: (userId: string, exerciseId: string) => void;
  removeSetFromExercise: (userId: string, exerciseId: string, setIndex: number) => void;
  addExerciseToWorkout: (userId: string, exercise: Exercise) => void;
  removeExerciseFromWorkout: (userId: string, exerciseId: string) => void;
  toggleExerciseCompleted: (userId: string, exerciseId: string) => void;
  updateExerciseNotes: (userId: string, exerciseId: string, notes: string) => void;
  finishWorkout: (userId: string) => Promise<boolean>;
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
  getActiveTemplateId: (userId: string) => string | undefined;
  getActiveTemplate: (userId: string) => WorkoutTemplate | undefined;
  applyWorkoutTemplate: (userId: string, templateId: string) => Promise<boolean>;
  updateUserSettings: (newSettings: Partial<UserSettings>) => void;
  handleUserLogout: () => void;
}

// Clean default user data structure (never pre-populates with another account's history)
const createDefaultUserData = (): UserWorkoutData => {
  return {
    history: [],
    personalRecords: [],
    customExercises: [],
    savedCombinations: [],
    weeklyPlan: JSON.parse(JSON.stringify(DEFAULT_WORKOUT_PLAN)),
    activeTemplateId: 'hypertrophy-ppl-6day',
    templateName: 'Push / Pull / Legs (PPL) — 6-Day',
    fitnessGoal: 'Muscle Building & Hypertrophy',
    progressionRule: 'Double Progression: Keep weight constant until reaching top of rep range, then increase load by 2.5–5 kg.',
    activeSession: null,
    editingSession: null,
    editingOriginalSession: null,
    currentWeight: 70,
    goals: [],
  };
};

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      userDataMap: {},
      settings: {
        weightUnit: 'kg',
        theme: 'dark',
        defaultSetsPerExercise: 3,
        rotationWindowDays: 7,
      },
      isFinishing: false,
      saveError: null,

      handleUserLogout: () => {
        set((state) => {
          const updatedMap = { ...state.userDataMap };
          if (updatedMap['guest']) {
            updatedMap['guest'] = {
              ...updatedMap['guest'],
              activeSession: null,
              editingSession: null,
              editingOriginalSession: null,
            };
          }
          return {
            userDataMap: updatedMap,
            isFinishing: false,
            saveError: null,
          };
        });
      },

      // Selectors with auto-fallback for newly created users
      getUserData: (userId: string) => {
        const targetId = userId || 'guest';
        const { userDataMap } = get();
        if (!userDataMap[targetId]) {
          const newDefault = createDefaultUserData();
          set((state) => ({
            userDataMap: {
              ...state.userDataMap,
              [targetId]: newDefault,
            },
          }));
          return newDefault;
        }
        const data = userDataMap[targetId];
        if (
          data.weeklyPlan?.wednesday &&
          data.weeklyPlan.wednesday.name === 'Legs' &&
          !data.weeklyPlan.wednesday.muscleGroups.some((m) => m.name === 'forearms')
        ) {
          data.weeklyPlan.wednesday = JSON.parse(JSON.stringify(DEFAULT_WORKOUT_PLAN.wednesday));
        }
        if (!data.savedCombinations) {
          data.savedCombinations = [];
        }
        return data;
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
        if (userData.activeSession && userData.activeSession.exercises) {
          userData.activeSession.exercises = normalizeCombinationExercises(userData.activeSession.exercises);
        }
        return userData.activeSession;
      },

      getEditingSession: (userId: string) => {
        const userData = get().getUserData(userId);
        if (userData.editingSession && userData.editingSession.exercises) {
          userData.editingSession.exercises = normalizeCombinationExercises(userData.editingSession.exercises);
        }
        return userData.editingSession || null;
      },

      getTodayCompletedWorkout: (userId: string) => {
        // Unauthenticated or guest visitors NEVER have a completed workout card
        if (!userId || userId === 'guest') return null;
        const userData = get().getUserData(userId);
        const history = userData.history || [];
        const todayDay = getTodayDayOfWeek();
        const weeklyPlan = userData.weeklyPlan || DEFAULT_WORKOUT_PLAN;
        const todayConfig = weeklyPlan[todayDay];
        const now = new Date();

        // 1. Only consider sessions completed on today's local calendar day
        const todaySessions = history.filter((h) => {
          if (h.status !== 'completed') return false;
          return isSameLocalDay(h.completedAt || h.date, now);
        });

        if (todaySessions.length === 0) return null;

        // Sort descending by completion time so latest session is evaluated first
        todaySessions.sort(
          (a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()
        );

        // 2. If today is a scheduled workout day, prefer matching scheduled workout name
        if (!todayConfig?.isRest && todayConfig?.name) {
          const nameMatch = todaySessions.find(
            (h) => (h.workoutName || '').trim().toLowerCase() === todayConfig.name.trim().toLowerCase()
          );
          if (nameMatch) return nameMatch;
        }

        // 3. Prefer matching today's day of week
        const dayMatch = todaySessions.find(
          (h) => (h.dayOfWeek || '').trim().toLowerCase() === todayDay.toLowerCase()
        );
        if (dayMatch) return dayMatch;

        // 4. If today is a rest day or custom session completed today, return the latest session
        return todaySessions[0];
      },

      getHistory: (userId: string) => {
        const userData = get().getUserData(userId);
        const history = userData.history || [];
        const normalized = history.map((session) => ({
          ...session,
          exercises: normalizeCombinationExercises(session.exercises || []),
        }));
        return [...normalized].sort(
          (a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()
        );
      },

      getPersonalRecords: (userId: string) => {
        const userData = get().getUserData(userId);
        const storedPRs = userData.personalRecords || [];
        if (storedPRs.length > 0) {
          const prMap = new Map<string, PersonalRecord>();
          storedPRs.forEach((pr) => {
            const key = (pr.exerciseId || pr.exerciseName || pr.id).trim().toLowerCase();
            const existing = prMap.get(key);
            if (!existing) {
              prMap.set(key, pr);
            } else {
              const weight = pr.weight ?? pr.value ?? 0;
              const exWeight = existing.weight ?? existing.value ?? 0;
              const est1RM = pr.estimated1RM ?? 0;
              const exEst1RM = existing.estimated1RM ?? 0;
              if (
                weight > exWeight ||
                est1RM > exEst1RM ||
                (weight === exWeight && (pr.reps ?? 0) > (existing.reps ?? 0))
              ) {
                prMap.set(key, pr);
              }
            }
          });
          return Array.from(prMap.values());
        }

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

      getSavedCombinations: (userId: string) => {
        const userData = get().getUserData(userId);
        return userData.savedCombinations || [];
      },

      fetchSavedCombinations: async (userId: string) => {
        if (!userId || userId === 'guest') return;
        try {
          const backendCombinations = await fetchSavedCombinationsApi();
          if (Array.isArray(backendCombinations)) {
            set((state) => {
              const uData = state.getUserData(userId);
              return {
                userDataMap: {
                  ...state.userDataMap,
                  [userId]: {
                    ...uData,
                    savedCombinations: backendCombinations,
                  },
                },
              };
            });
          }
        } catch (err) {
          console.warn('Could not fetch saved combinations from backend, using local copy:', err);
        }
      },

      saveCombinationTemplate: async (userId: string, templateData) => {
        let savedItem: SavedCombination = {
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          userId,
          name: templateData.name,
          type: templateData.type,
          techniqueLabel: templateData.techniqueLabel || 'Custom Combination',
          rounds: templateData.rounds,
          stages: templateData.stages,
          createdAt: new Date().toISOString(),
        };

        const token = getStoredToken();
        if (userId && userId !== 'guest' && token) {
          try {
            const backendSaved = await createSavedCombinationApi(templateData);
            if (backendSaved && backendSaved.id) {
              savedItem = backendSaved;
            }
          } catch (err) {
            console.warn('Could not persist combination template to backend, saved locally:', err);
          }
        }

        set((state) => {
          const uData = state.getUserData(userId);
          const existing = uData.savedCombinations || [];
          return {
            userDataMap: {
              ...state.userDataMap,
              [userId]: {
                ...uData,
                savedCombinations: [savedItem, ...existing.filter((x) => x.id !== savedItem.id)],
              },
            },
          };
        });

        return savedItem;
      },

      deleteCombinationTemplate: async (userId: string, templateId: string) => {
        const token = getStoredToken();
        if (userId && userId !== 'guest' && token) {
          try {
            await deleteSavedCombinationApi(templateId);
          } catch (err) {
            console.warn('Could not delete combination template from backend:', err);
          }
        }

        set((state) => {
          const uData = state.getUserData(userId);
          const updated = (uData.savedCombinations || []).filter((c) => c.id !== templateId);
          return {
            userDataMap: {
              ...state.userDataMap,
              [userId]: {
                ...uData,
                savedCombinations: updated,
              },
            },
          };
        });

        return true;
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
        if (!userId || userId === 'guest' || !getStoredToken()) {
          return get().getHistory(userId);
        }
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
        if (!userId || userId === 'guest' || !getStoredToken()) {
          return get().getPersonalRecords(userId);
        }
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
        if (!userId || userId === 'guest' || !getStoredToken()) {
          return;
        }
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

      startScheduledWorkout: (userId: string, day: DayOfWeek) => {
        const userData = get().getUserData(userId);
        if (userData.activeSession) return;

        const plan = userData.weeklyPlan || DEFAULT_WORKOUT_PLAN;
        const dayConfig = plan[day] || DEFAULT_WORKOUT_PLAN[day];

        if (dayConfig.isRest) {
          get().startCustomWorkout(userId, ['chest']);
          return;
        }

        const targetMuscles = dayConfig.muscleGroups.map((m: MuscleGroupConfig) => m.name);

        const newSession: WorkoutSession = {
          id: `session_${Date.now()}`,
          workoutName: dayConfig.name,
          date: new Date().toISOString(),
          dayOfWeek: day,
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

      startEditingWorkout: (userId: string, session: WorkoutSession) => {
        const cloned: WorkoutSession = JSON.parse(JSON.stringify(session));
        if (cloned.exercises) {
          cloned.exercises = normalizeCombinationExercises(cloned.exercises);
        }
        if (!cloned.sections || cloned.sections.length === 0) {
          cloned.sections = cloned.muscleGroups.map((mg) => ({
            name: mg,
            displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
          }));
        }

        set((state) => ({
          saveError: null,
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              editingSession: cloned,
              editingOriginalSession: JSON.parse(JSON.stringify(session)),
            },
          },
        }));
      },

      cancelEditingWorkout: (userId: string) => {
        set((state) => ({
          saveError: null,
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              editingSession: null,
              editingOriginalSession: null,
            },
          },
        }));
      },

      saveWorkoutEdits: async (userId: string) => {
        const { isFinishing } = get();
        if (isFinishing) return false;

        const userData = get().getUserData(userId);
        const { editingSession, personalRecords } = userData;
        if (!editingSession) return false;

        set({ isFinishing: true, saveError: null });

        try {
          let totalVolume = 0;
          let totalCompletedSets = 0;
          const updatedPRs: PersonalRecord[] = [...personalRecords];

          editingSession.exercises.forEach((ex) => {
            ex.sets.forEach((s) => {
              if (Array.isArray(s.stages) && s.stages.length > 0) {
                let setHasCompletedStage = false;
                s.stages.forEach((st) => {
                  if (st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0) {
                    const weight = st.weight!;
                    const reps = st.reps!;
                    totalVolume += weight * reps;
                    setHasCompletedStage = true;

                    const est1RM = calculate1RM(weight, reps);
                    const prIndex = updatedPRs.findIndex((p) => p.exerciseId === st.exerciseId);
                    const existingPR = prIndex >= 0 ? updatedPRs[prIndex] : null;

                    const isNewPR =
                      !existingPR ||
                      weight > existingPR.weight ||
                      est1RM > existingPR.estimated1RM ||
                      (weight === existingPR.weight && reps > existingPR.reps);

                    if (isNewPR) {
                      const prRecord: PersonalRecord = {
                        id: existingPR ? existingPR.id : `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        exerciseId: st.exerciseId,
                        exerciseName: st.exerciseName,
                        type: 'max_weight',
                        value: weight,
                        weight,
                        reps,
                        estimated1RM: est1RM,
                        date: editingSession.date || new Date().toISOString(),
                        details: `${weight} kg × ${reps} reps (Est. 1RM ${est1RM} kg)`,
                      };

                      if (prIndex >= 0) {
                        updatedPRs[prIndex] = prRecord;
                      } else {
                        updatedPRs.push(prRecord);
                      }
                    }
                  }
                });
                if (s.completed || setHasCompletedStage) {
                  totalCompletedSets++;
                }
              } else if (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) {
                const weight = s.weight!;
                const reps = s.reps!;
                totalVolume += weight * reps;
                totalCompletedSets++;

                const est1RM = calculate1RM(weight, reps);
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
                    date: editingSession.date || new Date().toISOString(),
                    details: `${weight} kg × ${reps} reps (Est. 1RM ${est1RM} kg)`,
                  };

                  if (prIndex >= 0) {
                    updatedPRs[prIndex] = prRecord;
                  } else {
                    updatedPRs.push(prRecord);
                  }
                }
              }
            });
          });

          const apiExercises = editingSession.exercises.map((ex) => ({
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
              completed: Boolean(
                (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) ||
                (Array.isArray(s.stages) && s.stages.length > 0 && s.stages.every((st) => st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0))
              ),
              stages: Array.isArray(s.stages) && s.stages.length > 0
                ? s.stages.map((st) => ({
                    stageOrder: st.stageOrder,
                    exerciseId: st.exerciseId,
                    exerciseName: st.exerciseName,
                    movementDescription: st.movementDescription || null,
                    targetWeight: st.targetWeight ?? null,
                    targetReps: st.targetReps ?? null,
                    weight: st.weight,
                    reps: st.reps,
                    completed: Boolean(st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0),
                  }))
                : undefined,
            })),
            notes: ex.notes || '',
            combinationId: ex.combinationId || null,
            combinationName: ex.combinationName || null,
            combinationType: ex.combinationType || null,
            techniqueLabel: ex.techniqueLabel || null,
            stageDescription: ex.stageDescription || null,
            stageOrder: ex.stageOrder || null,
          }));

          const apiPayload = {
            workoutName: editingSession.workoutName,
            date: editingSession.date,
            dayOfWeek: editingSession.dayOfWeek,
            muscleGroups: editingSession.muscleGroups,
            status: 'completed' as const,
            exercises: apiExercises,
            totalVolume,
            totalSets: totalCompletedSets,
          };

          const token = getStoredToken();
          if (userId !== 'guest' && token) {
            await updateWorkoutHistoryApi(editingSession.id, apiPayload);
          }

          const updatedSession: WorkoutSession = {
            ...editingSession,
            status: 'completed',
            totalVolume,
            totalSets: totalCompletedSets,
            exercises: editingSession.exercises.map((ex) => ({
              ...ex,
              sets: ex.sets.map((s) => ({
                ...s,
                completed: Boolean(
                  (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) ||
                  (Array.isArray(s.stages) && s.stages.length > 0 && s.stages.every((st) => st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0))
                ),
                stages: Array.isArray(s.stages) && s.stages.length > 0
                  ? s.stages.map((st) => ({
                      ...st,
                      completed: Boolean(st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0),
                    }))
                  : undefined,
              })),
            })),
          };

          set((state) => {
            const uData = state.getUserData(userId);
            const updatedHistory = uData.history.map((h) =>
              h.id === editingSession.id ? updatedSession : h
            );
            return {
              isFinishing: false,
              saveError: null,
              userDataMap: {
                ...state.userDataMap,
                [userId]: {
                  ...uData,
                  history: updatedHistory,
                  personalRecords: updatedPRs,
                  editingSession: null,
                  editingOriginalSession: null,
                },
              },
            };
          });

          get().fetchBackendPRs(userId);
          get().fetchProgressStats(userId);

          return true;
        } catch (err: any) {
          set({
            isFinishing: false,
            saveError: err.message || 'Failed to update workout session',
          });
          return false;
        }
      },

      deleteWorkout: async (userId: string, workoutId: string) => {
        try {
          const token = getStoredToken();
          if (userId !== 'guest' && token) {
            await deleteWorkoutHistoryApi(workoutId);
          }

          set((state) => {
            const uData = state.getUserData(userId);
            const updatedHistory = (uData.history || []).filter(
              (h) => h.id !== workoutId && (h as any)._id !== workoutId
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

          if (userId !== 'guest' && token) {
            get().fetchBackendPRs(userId);
            get().fetchProgressStats(userId);
          }

          return true;
        } catch (err: any) {
          console.error('Failed to delete workout session:', err);
          return false;
        }
      },

      addMuscleSectionToWorkout: (userId: string, muscleGroup: MuscleGroup) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const currentSections = targetSession.sections && targetSession.sections.length > 0
          ? [...targetSession.sections]
          : targetSession.muscleGroups.map((mg) => ({
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
        const updatedMuscleGroups = targetSession.muscleGroups.includes(muscleGroup)
          ? targetSession.muscleGroups
          : [...targetSession.muscleGroups, muscleGroup];

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                muscleGroups: updatedMuscleGroups,
                sections: updatedSections,
              },
            },
          },
        }));
      },

      updateSet: (userId, exerciseId, setIndex, weight, reps) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
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
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      toggleSetCompleted: (userId, exerciseId, setIndex) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
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
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      addSetToExercise: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
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
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
                totalSets: targetSession.totalSets + 1,
              },
            },
          },
        }));
      },

      removeSetFromExercise: (userId, exerciseId, setIndex) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
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
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      addExerciseToWorkout: (userId, exercise) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        if (targetSession.exercises.some((e) => e.exerciseId === exercise.id)) return;

        const newWorkoutExercise: WorkoutExercise = {
          id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          exerciseId: exercise.id,
          exercise,
          order: targetSession.exercises.length + 1,
          notes: '',
          sets: Array.from({ length: 3 }, (_, i) => ({
            id: `set_${Date.now()}_${i + 1}`,
            setNumber: i + 1,
            weight: null,
            reps: null,
            completed: false,
          })),
        };

        const currentSections: MuscleGroupConfig[] = targetSession.sections && targetSession.sections.length > 0
          ? [...targetSession.sections]
          : targetSession.muscleGroups.map((mg) => ({
              name: mg,
              displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
            }));

        let updatedSections: MuscleGroupConfig[] = currentSections;
        let updatedMuscleGroups = targetSession.muscleGroups;

        if (exercise.primaryMuscle === 'legs' || exercise.primaryMuscle === 'glutes' || exercise.primaryMuscle === 'calves') {
          const legSec = getLegSection(exercise) || 'quads';
          const legNames: Record<string, string> = {
            quads: 'Quads',
            hamstrings: 'Hamstrings',
            glutes: 'Glutes',
            calves: 'Calves',
          };
          const legMg: MuscleGroup = legSec === 'glutes' ? 'glutes' : legSec === 'calves' ? 'calves' : 'legs';
          if (!currentSections.some((s) => isLegSubArea(s.subAreas, s.displayName) === legSec)) {
            updatedSections = [
              ...currentSections,
              { name: legMg, displayName: legNames[legSec], subAreas: [legSec as any] },
            ];
            if (!updatedMuscleGroups.includes(legMg)) {
              updatedMuscleGroups = [...updatedMuscleGroups, legMg];
            }
          }
        } else if (!currentSections.some((s) => s.name === exercise.primaryMuscle)) {
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
              [sessionKey]: {
                ...targetSession,
                muscleGroups: updatedMuscleGroups,
                sections: updatedSections,
                exercises: [...targetSession.exercises, newWorkoutExercise],
                totalSets: targetSession.totalSets + 3,
              },
            },
          },
        }));
      },

      removeExerciseFromWorkout: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const filtered = targetSession.exercises.filter((ex) => {
          if (ex.id === exerciseId) return false;
          if (!exerciseId.startsWith('we_') && ex.exerciseId === exerciseId) return false;
          return true;
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: filtered,
              },
            },
          },
        }));
      },

      addCombinationToWorkout: (userId, combinationData) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const combinationId = `combo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        const currentSections: MuscleGroupConfig[] =
          targetSession.sections && targetSession.sections.length > 0
            ? [...targetSession.sections]
            : targetSession.muscleGroups.map((mg) => ({
                name: mg,
                displayName: MUSCLE_GROUPS[mg]?.name.toUpperCase() || mg.toUpperCase(),
              }));

        let updatedSections: MuscleGroupConfig[] = [...currentSections];
        let updatedMuscleGroups = [...targetSession.muscleGroups];

        // Ensure all component exercises' muscle groups are present in sections
        combinationData.stages.forEach((stage) => {
          const ex = stage.exercise;
          if (ex.primaryMuscle === 'legs' || ex.primaryMuscle === 'glutes' || ex.primaryMuscle === 'calves') {
            const legSec = getLegSection(ex) || 'quads';
            const legNames: Record<string, string> = {
              quads: 'Quads',
              hamstrings: 'Hamstrings',
              glutes: 'Glutes',
              calves: 'Calves',
            };
            const legMg: MuscleGroup = legSec === 'glutes' ? 'glutes' : legSec === 'calves' ? 'calves' : 'legs';
            if (!updatedSections.some((s) => isLegSubArea(s.subAreas, s.displayName) === legSec)) {
              updatedSections = [
                ...updatedSections,
                { name: legMg, displayName: legNames[legSec], subAreas: [legSec as any] },
              ];
              if (!updatedMuscleGroups.includes(legMg)) {
                updatedMuscleGroups = [...updatedMuscleGroups, legMg];
              }
            }
          } else if (!updatedSections.some((s) => s.name === ex.primaryMuscle)) {
            const meta = MUSCLE_GROUPS[ex.primaryMuscle];
            const newSec = {
              name: ex.primaryMuscle,
              displayName: meta ? meta.name.toUpperCase() : ex.primaryMuscle.toUpperCase(),
            };
            updatedSections = [...updatedSections, newSec];
            if (!updatedMuscleGroups.includes(ex.primaryMuscle)) {
              updatedMuscleGroups = [...updatedMuscleGroups, ex.primaryMuscle];
            }
          }
        });

        const roundsCount = Math.max(1, combinationData.rounds || 3);

        // Sets contain stages: each set has the full list of configured stages
        const sets: WorkoutSet[] = Array.from({ length: roundsCount }, (_, rIdx) => {
          const setNumber = rIdx + 1;
          const stages: WorkoutSetStage[] = combinationData.stages.map((stage, stIdx) => ({
            id: `stage_${Date.now()}_${setNumber}_${stIdx + 1}`,
            stageOrder: stIdx + 1,
            exerciseId: stage.exercise.id,
            exerciseName: stage.exercise.name,
            movementDescription: stage.movementDescription || undefined,
            targetWeight: stage.targetWeight ?? null,
            targetReps: stage.targetReps ?? null,
            weight: stage.targetWeight ?? null,
            reps: stage.targetReps ?? null,
            completed: false,
          }));

          return {
            id: `set_${Date.now()}_${setNumber}_${Math.random().toString(36).substr(2, 4)}`,
            setNumber,
            weight: null,
            reps: null,
            completed: false,
            stages,
          };
        });

        const primaryExercise = combinationData.stages[0]?.exercise || INITIAL_EXERCISES[0];

        const comboExercise: WorkoutExercise = {
          id: `we_${combinationId}`,
          exerciseId: primaryExercise.id,
          exercise: primaryExercise,
          order: targetSession.exercises.length + 1,
          notes: '',
          combinationId,
          combinationName: combinationData.combinationName,
          combinationType: combinationData.combinationType,
          techniqueLabel: combinationData.techniqueLabel,
          sets,
          completed: false,
        };

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                muscleGroups: updatedMuscleGroups,
                sections: updatedSections,
                exercises: [...targetSession.exercises, comboExercise],
                totalSets: targetSession.totalSets + sets.length,
              },
            },
          },
        }));
      },

      removeCombinationFromWorkout: (userId, combinationId) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const removedExercise = targetSession.exercises.find(
          (ex) => ex.combinationId === combinationId || ex.id === combinationId
        );
        const removedSetsCount = removedExercise ? removedExercise.sets.length : 0;

        const remainingExercises = targetSession.exercises.filter(
          (ex) => ex.combinationId !== combinationId && ex.id !== combinationId
        );

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: remainingExercises,
                totalSets: Math.max(0, targetSession.totalSets - removedSetsCount),
              },
            },
          },
        }));
      },

      addRoundToCombination: (userId, combinationId) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        let addedSetsCount = 0;
        const updatedExercises = targetSession.exercises.map((ex) => {
          if (ex.combinationId !== combinationId && ex.id !== combinationId) return ex;

          const lastSet = ex.sets[ex.sets.length - 1];
          const newSetNumber = ex.sets.length + 1;

          const newStages: WorkoutSetStage[] = (lastSet?.stages || []).map((st, idx) => ({
            id: `stage_${Date.now()}_${newSetNumber}_${idx + 1}`,
            stageOrder: st.stageOrder,
            exerciseId: st.exerciseId,
            exerciseName: st.exerciseName,
            movementDescription: st.movementDescription,
            targetWeight: st.targetWeight ?? null,
            targetReps: st.targetReps ?? null,
            weight: st.weight ?? st.targetWeight ?? null,
            reps: st.reps ?? st.targetReps ?? null,
            completed: false,
          }));

          const newSet: WorkoutSet = {
            id: `set_${Date.now()}_${newSetNumber}_${Math.random().toString(36).substr(2, 4)}`,
            setNumber: newSetNumber,
            weight: null,
            reps: null,
            completed: false,
            stages: newStages,
          };
          addedSetsCount++;

          return {
            ...ex,
            sets: [...ex.sets, newSet],
            completed: false,
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
                totalSets: targetSession.totalSets + addedSetsCount,
              },
            },
          },
        }));
      },

      updateCombinationStage: (userId, exerciseId, setIndex, stageIndex, weight, reps) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
          if (ex.id !== exerciseId && ex.combinationId !== exerciseId) return ex;

          const updatedSets = ex.sets.map((s, sIdx) => {
            if (sIdx !== setIndex || !s.stages) return s;

            const updatedStages = s.stages.map((st, stIdx) => {
              if (stIdx !== stageIndex) return st;
              return {
                ...st,
                weight,
                reps,
              };
            });

            return {
              ...s,
              stages: updatedStages,
            };
          });

          return {
            ...ex,
            sets: updatedSets,
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      toggleCombinationStageCompleted: (userId, exerciseId, setIndex, stageIndex) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
          if (ex.id !== exerciseId && ex.combinationId !== exerciseId) return ex;

          const updatedSets = ex.sets.map((s, sIdx) => {
            if (sIdx !== setIndex || !s.stages) return s;

            const updatedStages = s.stages.map((st, stIdx) => {
              if (stIdx !== stageIndex) return st;
              const nextCompleted = !st.completed;
              return {
                ...st,
                completed: nextCompleted,
                weight: nextCompleted && (st.weight === null || st.weight <= 0) ? (st.targetWeight ?? 0) : st.weight,
                reps: nextCompleted && (st.reps === null || st.reps <= 0) ? (st.targetReps ?? 10) : st.reps,
              };
            });

            const allStagesDone = updatedStages.length > 0 && updatedStages.every((st) => st.completed);

            return {
              ...s,
              completed: allStagesDone,
              stages: updatedStages,
            };
          });

          const allSetsDone = updatedSets.length > 0 && updatedSets.every((s) => s.completed);

          return {
            ...ex,
            completed: allSetsDone,
            sets: updatedSets,
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      toggleCombinationSetCompleted: (userId, exerciseId, setIndex) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
          if (ex.id !== exerciseId && ex.combinationId !== exerciseId) return ex;

          const updatedSets = ex.sets.map((s, sIdx) => {
            if (sIdx !== setIndex || !s.stages) return s;

            const targetComplete = !s.completed;
            const updatedStages = s.stages.map((st) => ({
              ...st,
              completed: targetComplete,
              weight: targetComplete && (st.weight === null || st.weight <= 0) ? (st.targetWeight ?? 0) : st.weight,
              reps: targetComplete && (st.reps === null || st.reps <= 0) ? (st.targetReps ?? 10) : st.reps,
            }));

            return {
              ...s,
              completed: targetComplete,
              stages: updatedStages,
            };
          });

          const allSetsDone = updatedSets.length > 0 && updatedSets.every((s) => s.completed);

          return {
            ...ex,
            completed: allSetsDone,
            sets: updatedSets,
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      removeSetFromCombination: (userId, exerciseId, setIndex) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
          if (ex.id !== exerciseId && ex.combinationId !== exerciseId) return ex;
          if (ex.sets.length <= 1) return ex;

          const filteredSets = ex.sets.filter((_, idx) => idx !== setIndex);
          const renumberedSets = filteredSets.map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
          }));

          return {
            ...ex,
            sets: renumberedSets,
          };
        });

        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
                totalSets: Math.max(0, targetSession.totalSets - 1),
              },
            },
          },
        }));
      },

      toggleExerciseCompleted: (userId, exerciseId) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
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
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      updateExerciseNotes: (userId, exerciseId, notes) => {
        const userData = get().getUserData(userId);
        const targetSession = userData.editingSession || userData.activeSession;
        const sessionKey = userData.editingSession ? 'editingSession' : 'activeSession';
        if (!targetSession) return;

        const updatedExercises = targetSession.exercises.map((ex) => {
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
              [sessionKey]: {
                ...targetSession,
                exercises: updatedExercises,
              },
            },
          },
        }));
      },

      finishWorkout: async (userId: string) => {
        const { isFinishing } = get();
        if (isFinishing) return false;

        set({ isFinishing: true, saveError: null });

        try {
          const userData = get().getUserData(userId);
          const { activeSession, history, personalRecords, goals } = userData;

          if (!activeSession) {
            set({ isFinishing: false });
            return false;
          }

          let totalVolume = 0;
          let totalCompletedSets = 0;
          const updatedPRs: PersonalRecord[] = [...personalRecords];
          const newPRsInSession: PersonalRecord[] = [];
          const updatedGoals: Goal[] = [...goals];

          activeSession.exercises.forEach((ex) => {
            ex.sets.forEach((s) => {
              if (Array.isArray(s.stages) && s.stages.length > 0) {
                let setHasCompletedStage = false;
                s.stages.forEach((st) => {
                  if (st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0) {
                    const weight = st.weight!;
                    const reps = st.reps!;
                    totalVolume += weight * reps;
                    setHasCompletedStage = true;

                    const est1RM = calculate1RM(weight, reps);
                    const prIndex = updatedPRs.findIndex((p) => p.exerciseId === st.exerciseId);
                    const existingPR = prIndex >= 0 ? updatedPRs[prIndex] : null;

                    const isNewPR =
                      !existingPR ||
                      weight > existingPR.weight ||
                      est1RM > existingPR.estimated1RM ||
                      (weight === existingPR.weight && reps > existingPR.reps);

                    if (isNewPR) {
                      const prRecord: PersonalRecord = {
                        id: existingPR ? existingPR.id : `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        exerciseId: st.exerciseId,
                        exerciseName: st.exerciseName,
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

                      if (!newPRsInSession.some((p) => p.exerciseId === st.exerciseId)) {
                        newPRsInSession.push(prRecord);
                      }

                      // Update strength goal for this exercise if present
                      updatedGoals.forEach((g) => {
                        if (g.type === 'exercise_strength' && g.exerciseId === st.exerciseId) {
                          g.currentValue = Math.max(g.currentValue, weight);
                          g.updatedAt = new Date().toISOString();
                        }
                      });
                    }
                  }
                });
                if (s.completed || setHasCompletedStage) {
                  totalCompletedSets++;
                }
              } else if (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) {
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
              completed: Boolean(
                (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) ||
                (Array.isArray(s.stages) && s.stages.length > 0 && s.stages.every((st) => st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0))
              ),
              stages: Array.isArray(s.stages) && s.stages.length > 0
                ? s.stages.map((st) => ({
                    stageOrder: st.stageOrder,
                    exerciseId: st.exerciseId,
                    exerciseName: st.exerciseName,
                    movementDescription: st.movementDescription || null,
                    targetWeight: st.targetWeight ?? null,
                    targetReps: st.targetReps ?? null,
                    weight: st.weight,
                    reps: st.reps,
                    completed: Boolean(st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0),
                  }))
                : undefined,
            })),
            notes: ex.notes || '',
            combinationId: ex.combinationId || null,
            combinationName: ex.combinationName || null,
            combinationType: ex.combinationType || null,
            techniqueLabel: ex.techniqueLabel || null,
            stageDescription: ex.stageDescription || null,
            stageOrder: ex.stageOrder || null,
          }));

          const apiPayload = {
            clientSessionId: activeSession.id,
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

          let mongoId = activeSession.id;
          const token = getStoredToken();

          // Await API persistence only if authenticated user
          if (userId !== 'guest' && token) {
            const res = await createWorkoutHistoryApi(apiPayload);
            if (res && res.workout && res.workout._id) {
              mongoId = res.workout._id;
            }
          }

          const completedSession: WorkoutSession = {
            ...activeSession,
            id: mongoId,
            clientSessionId: activeSession.id,
            status: 'completed',
            completedAt: new Date().toISOString(),
            totalVolume,
            totalSets: totalCompletedSets,
            newPRs: newPRsInSession,
            exercises: activeSession.exercises.map((ex) => ({
              ...ex,
              sets: ex.sets.map((s) => ({
                ...s,
                completed: Boolean(
                  (s.completed && s.weight !== null && s.weight > 0 && s.reps !== null && s.reps > 0) ||
                  (Array.isArray(s.stages) && s.stages.length > 0 && s.stages.every((st) => st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0))
                ),
                stages: Array.isArray(s.stages) && s.stages.length > 0
                  ? s.stages.map((st) => ({
                      ...st,
                      completed: Boolean(st.completed && st.weight !== null && st.weight > 0 && st.reps !== null && st.reps > 0),
                    }))
                  : undefined,
              })),
            })),
          };

          // Filter out any existing item with the same ID or clientSessionId (idempotency guard)
          const filteredHistory = history.filter(
            (h) =>
              h.id !== mongoId &&
              h.id !== activeSession.id &&
              (!h.clientSessionId || h.clientSessionId !== activeSession.id)
          );

          // ONLY update history and clear activeSession upon successful save
          set((state) => ({
            isFinishing: false,
            saveError: null,
            userDataMap: {
              ...state.userDataMap,
              [userId]: {
                ...state.getUserData(userId),
                history: [completedSession, ...filteredHistory],
                personalRecords: updatedPRs,
                goals: updatedGoals,
                activeSession: null,
              },
            },
          }));

          if (userId !== 'guest' && token) {
            get().fetchBackendPRs(userId);
            get().fetchProgressStats(userId);
          }

          return true;
        } catch (error: any) {
          set({
            isFinishing: false,
            saveError: error.message || 'Failed to save workout session',
          });
          return false;
        }
      },

      cancelWorkout: (userId) => {
        set((state) => ({
          saveError: null,
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
        if (!userId || userId === 'guest' || !getStoredToken()) {
          return get().getWeeklyPlan(userId);
        }
        try {
          const res = await fetchWorkoutPlan();
          if (res && res.plan) {
            const { _id, weeklyPlan, templateId, templateName, fitnessGoal, progressionRule } = res.plan;
            set((state) => ({
              userDataMap: {
                ...state.userDataMap,
                [userId]: {
                  ...state.getUserData(userId),
                  weeklyPlan,
                  workoutPlanDocId: _id,
                  activeTemplateId: templateId || state.getUserData(userId).activeTemplateId,
                  templateName: templateName || state.getUserData(userId).templateName,
                  fitnessGoal: fitnessGoal || state.getUserData(userId).fitnessGoal,
                  progressionRule: progressionRule || state.getUserData(userId).progressionRule,
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

        if (!userId || userId === 'guest' || !getStoredToken()) {
          return;
        }

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

      getActiveTemplateId: (userId: string) => {
        return get().getUserData(userId).activeTemplateId;
      },

      getActiveTemplate: (userId: string) => {
        const activeId = get().getUserData(userId).activeTemplateId;
        if (activeId) {
          return getTemplateById(activeId);
        }
        return undefined;
      },

      applyWorkoutTemplate: async (userId: string, templateId: string) => {
        const template = getTemplateById(templateId);
        if (!template) {
          console.warn(`Template with id ${templateId} not found`);
          return false;
        }

        const newWeeklyPlan = JSON.parse(JSON.stringify(template.weeklySchedule));

        // Optimistic local store update:
        // CRITICAL REQUIREMENT: Completed workout history, PRs, custom exercises, and bodyweight stats
        // are NEVER wiped or overwritten when switching templates.
        set((state) => ({
          userDataMap: {
            ...state.userDataMap,
            [userId]: {
              ...state.getUserData(userId),
              weeklyPlan: newWeeklyPlan,
              activeTemplateId: template.id,
              templateName: template.name,
              fitnessGoal: template.goal,
              progressionRule: template.progressionMethodology,
            },
          },
        }));

        if (userId && userId !== 'guest' && getStoredToken()) {
          try {
            const res = await applyWorkoutTemplateApi(templateId);
            if (res && res.plan) {
              set((state) => ({
                userDataMap: {
                  ...state.userDataMap,
                  [userId]: {
                    ...state.getUserData(userId),
                    workoutPlanDocId: res.plan._id,
                    activeTemplateId: res.plan.templateId || template.id,
                    templateName: res.plan.templateName || template.name,
                    fitnessGoal: res.plan.fitnessGoal || template.goal,
                    progressionRule: res.plan.progressionRule || template.progressionMethodology,
                  },
                },
              }));
            }
          } catch (err) {
            console.error('Failed to apply workout template to backend:', err);
          }
        }

        return true;
      },

      updateUserSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    }),
    {
      name: 'gym-tracker-store-v4',
      onRehydrateStorage: () => (state) => {
        if (state && state.userDataMap) {
          if ('user_srujan' in state.userDataMap) {
            delete state.userDataMap['user_srujan'];
          }
        }
      },
    }
  )
);
