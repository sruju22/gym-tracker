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
} from '../types';
import { INITIAL_EXERCISES } from '../data/exercises';
import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlan';
import { getTodayDayOfWeek } from '../utils/formatters';
import { calculate1RM } from '../utils/oneRM';

interface WorkoutStore {
  // State
  exercises: Exercise[];
  weeklyPlan: WeeklySchedule;
  activeSession: WorkoutSession | null;
  history: WorkoutSession[];
  personalRecords: PersonalRecord[];
  settings: UserSettings;

  // Actions - Workout Session
  startTodayWorkout: () => void;
  startCustomWorkout: (muscleGroups: MuscleGroup[]) => void;
  updateSet: (exerciseId: string, setIndex: number, weight: number | null, reps: number | null) => void;
  toggleSetCompleted: (exerciseId: string, setIndex: number) => void;
  addSetToExercise: (exerciseId: string) => void;
  removeSetFromExercise: (exerciseId: string, setIndex: number) => void;
  addExerciseToWorkout: (exercise: Exercise) => void;
  removeExerciseFromWorkout: (exerciseId: string) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;

  // Actions - Exercise Library & Custom
  addCustomExercise: (exerciseData: {
    name: string;
    primaryMuscle: MuscleGroup;
    muscleAreaEmphasis: MuscleArea[];
    equipment: Equipment;
    exerciseType: ExerciseType;
    imageUrl?: string;
    notes?: string;
  }) => Exercise;

  // Actions - Plan Settings
  updateWeeklyPlan: (newPlan: WeeklySchedule) => void;
  updateUserSettings: (newSettings: Partial<UserSettings>) => void;
}

// Initial mock past history for demonstration
const MOCK_HISTORY: WorkoutSession[] = [
  {
    id: 'hist_1',
    date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    dayOfWeek: 'monday',
    muscleGroups: ['chest', 'triceps'],
    status: 'completed',
    totalVolume: 4250,
    totalSets: 21,
    exercises: [
      {
        id: 'hex_1',
        exerciseId: 'ex_bench_press',
        exercise: INITIAL_EXERCISES[0],
        order: 1,
        notes: 'Felt strong on bench today',
        sets: [
          { id: 'hs_1', setNumber: 1, weight: 60, reps: 10, completed: true },
          { id: 'hs_2', setNumber: 2, weight: 60, reps: 9, completed: true },
          { id: 'hs_3', setNumber: 3, weight: 55, reps: 10, completed: true },
        ],
      },
      {
        id: 'hex_2',
        exerciseId: 'ex_incline_db_press',
        exercise: INITIAL_EXERCISES[1],
        order: 2,
        notes: '',
        sets: [
          { id: 'hs_4', setNumber: 1, weight: 24, reps: 10, completed: true },
          { id: 'hs_5', setNumber: 2, weight: 24, reps: 10, completed: true },
          { id: 'hs_6', setNumber: 3, weight: 22, reps: 12, completed: true },
        ],
      },
    ],
  },
];

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      exercises: INITIAL_EXERCISES,
      weeklyPlan: DEFAULT_WORKOUT_PLAN,
      activeSession: null,
      history: MOCK_HISTORY,
      personalRecords: [
        {
          id: 'pr_1',
          exerciseId: 'ex_bench_press',
          exerciseName: 'Flat Barbell Bench Press',
          type: 'max_weight',
          value: 60,
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          details: '60 kg × 10 reps',
        },
      ],
      settings: {
        weightUnit: 'kg',
        theme: 'dark',
        defaultSetsPerExercise: 3,
        rotationWindowDays: 7,
      },

      // Start today's workout based on weekly plan
      startTodayWorkout: () => {
        const { weeklyPlan, activeSession } = get();
        if (activeSession) return; // Already in progress

        const today = getTodayDayOfWeek();
        const dayConfig = weeklyPlan[today];

        if (dayConfig.isRest) {
          // If rest day, start empty custom workout
          get().startCustomWorkout(['chest']);
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
          exercises: [], // User selects exercises from library
          totalVolume: 0,
          totalSets: 0,
        };

        set({ activeSession: newSession });
      },

      startCustomWorkout: (muscleGroups: MuscleGroup[]) => {
        const { exercises, activeSession } = get();
        if (activeSession) return;

        const today = getTodayDayOfWeek();
        const initialWorkoutExercises: WorkoutExercise[] = [];
        let orderCount = 1;

        muscleGroups.forEach((mg) => {
          const matching = exercises.filter((e) => e.primaryMuscle === mg);
          matching.slice(0, 3).forEach((ex) => {
            initialWorkoutExercises.push({
              id: `we_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              exerciseId: ex.id,
              exercise: ex,
              order: orderCount++,
              notes: '',
              sets: Array.from({ length: 3 }, (_, i) => ({
                id: `set_${Date.now()}_${i + 1}`,
                setNumber: i + 1,
                weight: null,
                reps: null,
                completed: false,
              })),
            });
          });
        });

        const newSession: WorkoutSession = {
          id: `session_${Date.now()}`,
          date: new Date().toISOString(),
          dayOfWeek: today,
          muscleGroups,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          exercises: initialWorkoutExercises,
          totalVolume: 0,
          totalSets: initialWorkoutExercises.reduce((acc, e) => acc + e.sets.length, 0),
        };

        set({ activeSession: newSession });
      },

      updateSet: (exerciseId, setIndex, weight, reps) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;

          const updatedSets = [...ex.sets];
          if (updatedSets[setIndex]) {
            updatedSets[setIndex] = {
              ...updatedSets[setIndex],
              weight,
              reps,
            };
          }
          return { ...ex, sets: updatedSets };
        });

        set({
          activeSession: {
            ...activeSession,
            exercises: updatedExercises,
          },
        });
      },

      toggleSetCompleted: (exerciseId, setIndex) => {
        const { activeSession, personalRecords } = get();
        if (!activeSession) return;

        const newPRs: PersonalRecord[] = [...personalRecords];

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;

          const updatedSets = [...ex.sets];
          const currentSet = updatedSets[setIndex];
          if (currentSet) {
            const nextCompletedState = !currentSet.completed;
            updatedSets[setIndex] = {
              ...currentSet,
              completed: nextCompletedState,
            };

            // PR Check when set is marked completed
            if (nextCompletedState && currentSet.weight && currentSet.reps) {
              const weight = currentSet.weight;
              const reps = currentSet.reps;
              const est1RM = calculate1RM(weight, reps);

              // Check existing weight PR
              const existingWeightPR = newPRs.find(
                (p) => p.exerciseId === ex.exerciseId && p.type === 'max_weight'
              );

              if (!existingWeightPR || weight > existingWeightPR.value) {
                if (existingWeightPR) {
                  existingWeightPR.value = weight;
                  existingWeightPR.date = new Date().toISOString();
                  existingWeightPR.details = `${weight} kg × ${reps} reps`;
                } else {
                  newPRs.push({
                    id: `pr_${Date.now()}`,
                    exerciseId: ex.exerciseId,
                    exerciseName: ex.exercise.name,
                    type: 'max_weight',
                    value: weight,
                    date: new Date().toISOString(),
                    details: `${weight} kg × ${reps} reps`,
                  });
                }
              }
            }
          }
          return { ...ex, sets: updatedSets };
        });

        set({
          personalRecords: newPRs,
          activeSession: {
            ...activeSession,
            exercises: updatedExercises,
          },
        });
      },

      addSetToExercise: (exerciseId) => {
        const { activeSession } = get();
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

        set({
          activeSession: {
            ...activeSession,
            exercises: updatedExercises,
            totalSets: activeSession.totalSets + 1,
          },
        });
      },

      removeSetFromExercise: (exerciseId, setIndex) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId !== exerciseId && ex.id !== exerciseId) return ex;
          if (ex.sets.length <= 1) return ex; // Keep at least 1 set

          const filteredSets = ex.sets.filter((_, idx) => idx !== setIndex);
          const reindexedSets = filteredSets.map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
          }));

          return { ...ex, sets: reindexedSets };
        });

        set({
          activeSession: {
            ...activeSession,
            exercises: updatedExercises,
          },
        });
      },

      addExerciseToWorkout: (exercise) => {
        const { activeSession } = get();
        if (!activeSession) return;

        // Check if already in session
        if (activeSession.exercises.some((e) => e.exerciseId === exercise.id)) return;

        const newWorkoutExercise: WorkoutExercise = {
          id: `we_${Date.now()}`,
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

        set({
          activeSession: {
            ...activeSession,
            exercises: [...activeSession.exercises, newWorkoutExercise],
            totalSets: activeSession.totalSets + 3,
          },
        });
      },

      removeExerciseFromWorkout: (exerciseId) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const filtered = activeSession.exercises.filter(
          (ex) => ex.exerciseId !== exerciseId && ex.id !== exerciseId
        );

        set({
          activeSession: {
            ...activeSession,
            exercises: filtered,
          },
        });
      },

      updateExerciseNotes: (exerciseId, notes) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const updatedExercises = activeSession.exercises.map((ex) => {
          if (ex.exerciseId === exerciseId || ex.id === exerciseId) {
            return { ...ex, notes };
          }
          return ex;
        });

        set({
          activeSession: {
            ...activeSession,
            exercises: updatedExercises,
          },
        });
      },

      finishWorkout: () => {
        const { activeSession, history } = get();
        if (!activeSession) return;

        let totalVolume = 0;
        let totalCompletedSets = 0;

        activeSession.exercises.forEach((ex) => {
          ex.sets.forEach((s) => {
            if (s.completed && s.weight && s.reps) {
              totalVolume += s.weight * s.reps;
              totalCompletedSets++;
            }
          });
        });

        const completedSession: WorkoutSession = {
          ...activeSession,
          status: 'completed',
          completedAt: new Date().toISOString(),
          totalVolume,
          totalSets: totalCompletedSets,
        };

        set({
          history: [completedSession, ...history],
          activeSession: null,
        });
      },

      cancelWorkout: () => {
        set({ activeSession: null });
      },

      addCustomExercise: (exerciseData) => {
        const { exercises } = get();
        const newExercise: Exercise = {
          id: `custom_${Date.now()}`,
          name: exerciseData.name,
          primaryMuscle: exerciseData.primaryMuscle,
          secondaryMuscles: [],
          muscleAreaEmphasis: exerciseData.muscleAreaEmphasis,
          equipment: exerciseData.equipment,
          exerciseType: exerciseData.exerciseType,
          difficulty: 'intermediate',
          instructions: exerciseData.notes ? [exerciseData.notes] : ['Custom user exercise.'],
          imageUrl:
            exerciseData.imageUrl ||
            '/exercises/flat-barbell-bench-press/0.jpg',
          tags: ['custom', exerciseData.primaryMuscle],
          isCustom: true,
        };

        set({ exercises: [newExercise, ...exercises] });
        return newExercise;
      },

      updateWeeklyPlan: (newPlan) => set({ weeklyPlan: newPlan }),
      updateUserSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    }),
    {
      name: 'gym-tracker-store-v1',
      partialize: (state) => ({
        exercises: state.exercises,
        weeklyPlan: state.weeklyPlan,
        activeSession: state.activeSession,
        history: state.history,
        personalRecords: state.personalRecords,
        settings: state.settings,
      }),
      merge: (persistedState: any, currentState: WorkoutStore) => {
        const merged = { ...currentState, ...persistedState };
        merged.weeklyPlan = DEFAULT_WORKOUT_PLAN;
        
        const customExercises = Array.isArray(merged.exercises)
          ? merged.exercises.filter((ex: Exercise) => ex.isCustom)
          : [];
        merged.exercises = [...INITIAL_EXERCISES, ...customExercises];
        
        return merged;
      },
    }
  )
);
