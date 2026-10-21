import { Response } from 'express';
import Workout from '../models/Workout';
import User from '../models/User';
import Goal from '../models/Goal';
import WeightLog from '../models/WeightLog';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Calculates Estimated 1RM using Brzycki / Epley formula (matches frontend logic)
 * For reps = 1: 1RM = weight
 * For reps <= 12: 1RM = weight * (36 / (37 - reps))
 * For reps > 12: 1RM = weight * (1 + reps / 30)
 */
export const calculate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 12) {
    return Math.round(weight * (1 + reps / 30));
  }
  return Math.round(weight * (36 / (37 - reps)));
};

interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  type: string;
  value: number;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: Date;
  details: string;
}

/**
 * Helper to dynamically derive all Personal Records from WorkoutSession history
 */
const derivePRsFromHistory = async (userId: any): Promise<PRRecord[]> => {
  const completedSessions = await Workout.find({
    userId,
    status: 'completed',
  }).sort({ date: 1 });

  const prMap = new Map<string, PRRecord>();

  for (const session of completedSessions) {
    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        if (Array.isArray(s.stages) && s.stages.length > 0) {
          // Superset stages
          for (const st of s.stages) {
            if (st.completed && st.weight && st.weight > 0 && st.reps && st.reps > 0) {
              const weight = st.weight;
              const reps = st.reps;
              const est1RM = calculate1RM(weight, reps);
              const existingPR = prMap.get(st.exerciseId);

              const isNewPR =
                !existingPR ||
                weight > existingPR.weight ||
                est1RM > existingPR.estimated1RM ||
                (weight === existingPR.weight && reps > existingPR.reps);

              if (isNewPR) {
                const details = `${weight} kg × ${reps} reps (Est. 1RM ${est1RM} kg)`;
                prMap.set(st.exerciseId, {
                  exerciseId: st.exerciseId,
                  exerciseName: st.exerciseName,
                  type: 'max_weight',
                  value: weight,
                  weight,
                  reps,
                  estimated1RM: est1RM,
                  date: session.date,
                  details,
                });
              }
            }
          }
        } else if (s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0) {
          // Standalone set
          const weight = s.weight;
          const reps = s.reps;
          const est1RM = calculate1RM(weight, reps);
          const existingPR = prMap.get(ex.exerciseId);

          const isNewPR =
            !existingPR ||
            weight > existingPR.weight ||
            est1RM > existingPR.estimated1RM ||
            (weight === existingPR.weight && reps > existingPR.reps);

          if (isNewPR) {
            const details = `${weight} kg × ${reps} reps (Est. 1RM ${est1RM} kg)`;
            prMap.set(ex.exerciseId, {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: 'max_weight',
              value: weight,
              weight,
              reps,
              estimated1RM: est1RM,
              date: session.date,
              details,
            });
          }
        }
      }
    }
  }

  return Array.from(prMap.values());
};

/**
 * @desc    Get current Personal Records for all exercises (derived dynamically from WorkoutSession history)
 * @route   GET /api/progress/prs
 * @access  Private (JWT protected)
 */
export const getPersonalRecords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const prs = await derivePRsFromHistory(req.user._id);

    res.status(200).json({
      count: prs.length,
      personalRecords: prs,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch personal records', details: error.message });
  }
};

/**
 * @desc    Get previous performance details for a given exercise
 * @route   GET /api/progress/previous/:exerciseId
 * @access  Private (JWT protected)
 */
export const getPreviousPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { exerciseId } = req.params;
    if (!exerciseId) {
      res.status(400).json({ error: 'Exercise ID is required' });
      return;
    }

    // Find most recent completed workout session containing this exercise (standalone or in superset stage)
    const workout = await Workout.findOne({
      userId: req.user._id,
      status: 'completed',
      $or: [
        { 'exercises.exerciseId': exerciseId },
        { 'exercises.sets.stages.exerciseId': exerciseId },
      ],
    }).sort({ date: -1 });

    if (!workout) {
      res.status(200).json({ previousPerformance: null });
      return;
    }

    const completedSets: Array<{ setNumber: number; weight: number; reps: number }> = [];
    let setNumberCounter = 1;

    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        if (Array.isArray(s.stages) && s.stages.length > 0) {
          for (const st of s.stages) {
            if (st.exerciseId === exerciseId && st.completed && st.weight && st.weight > 0 && st.reps && st.reps > 0) {
              completedSets.push({
                setNumber: setNumberCounter++,
                weight: st.weight,
                reps: st.reps,
              });
            }
          }
        } else if (ex.exerciseId === exerciseId && s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0) {
          completedSets.push({
            setNumber: setNumberCounter++,
            weight: s.weight,
            reps: s.reps,
          });
        }
      }
    }

    if (completedSets.length === 0) {
      res.status(200).json({ previousPerformance: null });
      return;
    }

    const weights = completedSets.map((s) => s.weight);
    const bestWeight = Math.max(...weights);
    const bestSet = completedSets.find((s) => s.weight === bestWeight) || completedSets[0];
    const estimated1RM = calculate1RM(bestSet.weight, bestSet.reps);

    res.status(200).json({
      previousPerformance: {
        exerciseId,
        date: workout.date,
        workoutName: workout.workoutName,
        sets: completedSets,
        bestWeight,
        bestReps: bestSet.reps,
        estimated1RM,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch previous performance', details: error.message });
  }
};

/**
 * @desc    Get strength progression chart data points for a specific exercise
 * @route   GET /api/progress/exercise/:exerciseId
 * @access  Private (JWT protected)
 */
export const getExerciseProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { exerciseId } = req.params;
    if (!exerciseId) {
      res.status(400).json({ error: 'Exercise ID is required' });
      return;
    }

    const sessions = await Workout.find({
      userId: req.user._id,
      status: 'completed',
      $or: [
        { 'exercises.exerciseId': exerciseId },
        { 'exercises.sets.stages.exerciseId': exerciseId },
      ],
    }).sort({ date: 1 });

    const strengthTimeline: Array<{
      date: Date;
      maxWeight: number;
      bestReps: number;
      estimated1RM: number;
      workoutName: string;
    }> = [];

    sessions.forEach((session) => {
      const workingSets: Array<{ weight: number; reps: number }> = [];

      for (const ex of session.exercises) {
        for (const s of ex.sets) {
          if (Array.isArray(s.stages) && s.stages.length > 0) {
            for (const st of s.stages) {
              if (st.exerciseId === exerciseId && st.completed && st.weight && st.weight > 0 && st.reps && st.reps > 0) {
                workingSets.push({ weight: st.weight, reps: st.reps });
              }
            }
          } else if (ex.exerciseId === exerciseId && s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0) {
            workingSets.push({ weight: s.weight, reps: s.reps });
          }
        }
      }

      if (workingSets.length > 0) {
        const weights = workingSets.map((s) => s.weight);
        const maxWeight = Math.max(...weights);
        const bestSet = workingSets.find((s) => s.weight === maxWeight) || workingSets[0];
        const estimated1RM = calculate1RM(bestSet.weight, bestSet.reps);

        strengthTimeline.push({
          date: session.date,
          maxWeight,
          bestReps: bestSet.reps,
          estimated1RM,
          workoutName: session.workoutName,
        });
      }
    });

    res.status(200).json({
      exerciseId,
      strengthTimeline,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch exercise progress', details: error.message });
  }
};

/**
 * @desc    Get progress summary metrics (total volume, total sets, total workouts)
 * @route   GET /api/progress/summary
 * @access  Private (JWT protected)
 */
export const getProgressSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const completedSessions = await Workout.find({
      userId: req.user._id,
      status: 'completed',
    });

    const totalVolume = completedSessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0);
    const totalSets = completedSessions.reduce((acc, s) => acc + (s.totalSets || 0), 0);

    res.status(200).json({
      totalVolume,
      totalSets,
      totalWorkouts: completedSessions.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch progress summary', details: error.message });
  }
};

/**
 * @desc    Get volume trend timeline across completed workout sessions
 * @route   GET /api/progress/volume-trend
 * @access  Private (JWT protected)
 */
export const getVolumeTrend = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const completedSessions = await Workout.find({
      userId: req.user._id,
      status: 'completed',
    }).sort({ date: 1 });

    const volumeTrend = completedSessions.map((s) => ({
      date: s.date,
      totalVolume: s.totalVolume,
      workoutName: s.workoutName,
    }));

    res.status(200).json({
      volumeTrend,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch volume trend', details: error.message });
  }
};

/**
 * Helper to calculate dynamic progress for goals based on persisted backend data
 */
export interface GoalProgressResult {
  currentValue: number | null;
  progressPercentage: number | null;
  remainingDistance: number | null;
  statusMessage: string;
  isAchieved: boolean;
}

export function calculateGoalProgress(
  goal: {
    type: string;
    startValue: number;
    targetValue: number;
    exerciseId?: string | null;
    unit?: string;
  },
  context: {
    latestWeight: number | null;
    exercisePRs: Map<string, number>;
    completedWorkoutsCount: number;
  }
): GoalProgressResult {
  const { type, startValue, targetValue, exerciseId, unit = 'kg' } = goal;

  // 1. Weight Gain Goal (target > start)
  if (type === 'weight_gain' || (type === 'body_weight' && targetValue >= startValue)) {
    if (context.latestWeight === null || context.latestWeight === undefined) {
      return {
        currentValue: null,
        progressPercentage: null,
        remainingDistance: Math.max(0, targetValue - startValue),
        statusMessage: 'No body weight logged yet. Log your current weight to start tracking.',
        isAchieved: false,
      };
    }
    const current = context.latestWeight;
    const totalDist = targetValue - startValue;
    if (totalDist <= 0) {
      const isAchieved = current >= targetValue;
      return {
        currentValue: current,
        progressPercentage: isAchieved ? 100 : 0,
        remainingDistance: 0,
        statusMessage: isAchieved ? 'Target weight reached!' : 'Target equals start value',
        isAchieved,
      };
    }
    const gained = current - startValue;
    const rawPct = Math.round((gained / totalDist) * 100);
    const progressPercentage = Math.min(100, Math.max(0, rawPct));
    const remainingDistance = Math.max(0, Math.round((targetValue - current) * 10) / 10);
    const isAchieved = current >= targetValue;
    return {
      currentValue: current,
      progressPercentage,
      remainingDistance,
      statusMessage: isAchieved ? 'Target weight reached!' : `${remainingDistance} ${unit} to gain`,
      isAchieved,
    };
  }

  // 2. Weight Loss Goal (target < start)
  if (type === 'weight_loss' || (type === 'body_weight' && targetValue < startValue)) {
    if (context.latestWeight === null || context.latestWeight === undefined) {
      return {
        currentValue: null,
        progressPercentage: null,
        remainingDistance: Math.max(0, startValue - targetValue),
        statusMessage: 'No body weight logged yet. Log your current weight to start tracking.',
        isAchieved: false,
      };
    }
    const current = context.latestWeight;
    const totalDist = startValue - targetValue;
    if (totalDist <= 0) {
      const isAchieved = current <= targetValue;
      return {
        currentValue: current,
        progressPercentage: isAchieved ? 100 : 0,
        remainingDistance: 0,
        statusMessage: isAchieved ? 'Target weight reached!' : 'Target equals start value',
        isAchieved,
      };
    }
    const lost = startValue - current;
    const rawPct = Math.round((lost / totalDist) * 100);
    const progressPercentage = Math.min(100, Math.max(0, rawPct));
    const remainingDistance = Math.max(0, Math.round((current - targetValue) * 10) / 10);
    const isAchieved = current <= targetValue;
    return {
      currentValue: current,
      progressPercentage,
      remainingDistance,
      statusMessage: isAchieved ? 'Target weight reached!' : `${remainingDistance} ${unit} to lose`,
      isAchieved,
    };
  }

  // 3. Strength Goal (Exercise max weight / PR)
  if (type === 'strength' || type === 'exercise_strength') {
    if (!exerciseId || !context.exercisePRs.has(exerciseId)) {
      return {
        currentValue: null,
        progressPercentage: null,
        remainingDistance: Math.max(0, targetValue - startValue),
        statusMessage: 'No completed sets recorded for this exercise yet. Complete a workout to track progress.',
        isAchieved: false,
      };
    }
    const current = context.exercisePRs.get(exerciseId)!;
    const totalDist = targetValue - startValue;
    if (totalDist <= 0) {
      const isAchieved = current >= targetValue;
      return {
        currentValue: current,
        progressPercentage: isAchieved ? 100 : 0,
        remainingDistance: 0,
        statusMessage: isAchieved ? 'Strength target achieved!' : 'Target equals start value',
        isAchieved,
      };
    }
    const increase = current - startValue;
    const rawPct = Math.round((increase / totalDist) * 100);
    const progressPercentage = Math.min(100, Math.max(0, rawPct));
    const remainingDistance = Math.max(0, Math.round((targetValue - current) * 10) / 10);
    const isAchieved = current >= targetValue;
    return {
      currentValue: current,
      progressPercentage,
      remainingDistance,
      statusMessage: isAchieved ? 'Strength target achieved!' : `${remainingDistance} ${unit} to target`,
      isAchieved,
    };
  }

  // 4. Workout Consistency Goal (completed workouts vs target)
  if (type === 'consistency') {
    const current = context.completedWorkoutsCount;
    const totalDist = targetValue - startValue;
    if (totalDist <= 0) {
      const isAchieved = current >= targetValue;
      return {
        currentValue: current,
        progressPercentage: isAchieved ? 100 : 0,
        remainingDistance: 0,
        statusMessage: isAchieved ? 'Consistency target achieved!' : 'Target met',
        isAchieved,
      };
    }
    const done = current - startValue;
    const rawPct = Math.round((done / totalDist) * 100);
    const progressPercentage = Math.min(100, Math.max(0, rawPct));
    const remainingDistance = Math.max(0, targetValue - current);
    const isAchieved = current >= targetValue;
    return {
      currentValue: current,
      progressPercentage,
      remainingDistance,
      statusMessage: isAchieved ? 'Consistency goal reached!' : `${remainingDistance} workouts remaining`,
      isAchieved,
    };
  }

  // Fallback
  return {
    currentValue: null,
    progressPercentage: null,
    remainingDistance: null,
    statusMessage: 'Custom goal',
    isAchieved: false,
  };
}

/**
 * @desc    Get all fitness goals with dynamically computed progress
 * @route   GET /api/progress/goals
 * @access  Private (JWT protected)
 */
export const getGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user._id;

    const [goals, userDoc, latestWeightLog, prs, completedCount] = await Promise.all([
      Goal.find({ userId }).sort({ isPrimary: -1, createdAt: -1 }),
      User.findById(userId).select('currentWeight weightUnit'),
      WeightLog.findOne({ userId }).sort({ date: -1 }),
      derivePRsFromHistory(userId),
      Workout.countDocuments({ userId, status: 'completed' }),
    ]);

    const latestWeight = latestWeightLog?.weight ?? userDoc?.currentWeight ?? null;
    const prMap = new Map<string, number>();
    for (const pr of prs) {
      prMap.set(pr.exerciseId, pr.weight);
    }

    const enrichedGoals = goals.map((goal) => {
      const calculation = calculateGoalProgress(
        {
          type: goal.type,
          startValue: goal.startValue,
          targetValue: goal.targetValue,
          exerciseId: goal.exerciseId,
          unit: goal.unit,
        },
        {
          latestWeight,
          exercisePRs: prMap,
          completedWorkoutsCount: completedCount,
        }
      );

      const goalObj = goal.toJSON();
      return {
        ...goalObj,
        currentValue: calculation.currentValue,
        progressPercentage: calculation.progressPercentage,
        remainingDistance: calculation.remainingDistance,
        statusMessage: calculation.statusMessage,
        isAchieved: calculation.isAchieved,
      };
    });

    res.status(200).json({
      count: enrichedGoals.length,
      goals: enrichedGoals,
      context: {
        latestWeight,
        weightUnit: userDoc?.weightUnit || 'kg',
        totalWorkouts: completedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch goals', details: error.message });
  }
};

/**
 * @desc    Create a new fitness goal
 * @route   POST /api/progress/goals
 * @access  Private (JWT protected)
 */
export const createGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user._id;
    const {
      title,
      type,
      exerciseId,
      exerciseName,
      startValue,
      targetValue,
      unit,
      targetDate,
      isPrimary,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Goal title is required' });
      return;
    }
    if (!type) {
      res.status(400).json({ error: 'Goal type is required' });
      return;
    }
    if (startValue === undefined || startValue === null || isNaN(Number(startValue))) {
      res.status(400).json({ error: 'Valid starting value is required' });
      return;
    }
    if (targetValue === undefined || targetValue === null || isNaN(Number(targetValue))) {
      res.status(400).json({ error: 'Valid target value is required' });
      return;
    }

    if (Boolean(isPrimary)) {
      await Goal.updateMany({ userId }, { $set: { isPrimary: false } });
    }

    const newGoal = await Goal.create({
      userId,
      title: title.trim(),
      type,
      exerciseId: exerciseId || null,
      exerciseName: exerciseName || null,
      startValue: Number(startValue),
      targetValue: Number(targetValue),
      unit: unit || 'kg',
      targetDate: targetDate ? new Date(targetDate) : null,
      isPrimary: Boolean(isPrimary),
      notes: notes || '',
      status: 'active',
    });

    res.status(201).json({
      message: 'Goal created successfully',
      goal: newGoal,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create goal', details: error.message });
  }
};

/**
 * @desc    Update an existing fitness goal
 * @route   PUT /api/progress/goals/:id
 * @access  Private (JWT protected)
 */
export const updateGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    const userId = req.user._id;

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const {
      title,
      type,
      exerciseId,
      exerciseName,
      startValue,
      targetValue,
      unit,
      targetDate,
      status,
      isPrimary,
      notes,
    } = req.body;

    if (title !== undefined) goal.title = title.trim();
    if (type !== undefined) goal.type = type;
    if (exerciseId !== undefined) goal.exerciseId = exerciseId;
    if (exerciseName !== undefined) goal.exerciseName = exerciseName;
    if (startValue !== undefined) goal.startValue = Number(startValue);
    if (targetValue !== undefined) goal.targetValue = Number(targetValue);
    if (unit !== undefined) goal.unit = unit;
    if (targetDate !== undefined) goal.targetDate = targetDate ? new Date(targetDate) : null;
    if (status !== undefined) goal.status = status;
    if (notes !== undefined) goal.notes = notes;

    if (isPrimary !== undefined && Boolean(isPrimary) && !goal.isPrimary) {
      await Goal.updateMany({ userId, _id: { $ne: goal._id } }, { $set: { isPrimary: false } });
      goal.isPrimary = true;
    } else if (isPrimary !== undefined) {
      goal.isPrimary = Boolean(isPrimary);
    }

    await goal.save();

    res.status(200).json({
      message: 'Goal updated successfully',
      goal,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update goal', details: error.message });
  }
};

/**
 * @desc    Delete a fitness goal
 * @route   DELETE /api/progress/goals/:id
 * @access  Private (JWT protected)
 */
export const deleteGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    const userId = req.user._id;

    const result = await Goal.findOneAndDelete({ _id: id, userId });
    if (!result) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.status(200).json({ message: 'Goal deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete goal', details: error.message });
  }
};

/**
 * @desc    Update goal status (active, completed, paused, archived)
 * @route   PATCH /api/progress/goals/:id/status
 * @access  Private (JWT protected)
 */
export const updateGoalStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!['active', 'completed', 'paused', 'archived'].includes(status)) {
      res.status(400).json({ error: 'Invalid goal status' });
      return;
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: id, userId },
      { $set: { status } },
      { new: true }
    );

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.status(200).json({ message: `Goal status updated to ${status}`, goal });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update goal status', details: error.message });
  }
};

/**
 * @desc    Get weight logs timeline for authenticated user
 * @route   GET /api/progress/weight
 * @access  Private (JWT protected)
 */
export const getWeightLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user._id;

    const [logs, userDoc] = await Promise.all([
      WeightLog.find({ userId }).sort({ date: -1 }),
      User.findById(userId).select('currentWeight weightUnit'),
    ]);

    const latestWeight = logs[0]?.weight ?? userDoc?.currentWeight ?? null;
    const oldestWeight = logs[logs.length - 1]?.weight ?? latestWeight;
    const weightChange = latestWeight !== null && oldestWeight !== null ? Math.round((latestWeight - oldestWeight) * 10) / 10 : 0;

    res.status(200).json({
      count: logs.length,
      logs,
      latestWeight,
      unit: userDoc?.weightUnit || 'kg',
      weightChange,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch weight logs', details: error.message });
  }
};

/**
 * @desc    Log a body weight entry and update profile currentWeight if latest
 * @route   POST /api/progress/weight
 * @access  Private (JWT protected)
 */
export const logWeight = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user._id;
    const { weight, unit = 'kg', date, notes = '' } = req.body;

    const numWeight = Number(weight);
    if (isNaN(numWeight) || numWeight < 20 || numWeight > 500) {
      res.status(400).json({ error: 'Please enter a realistic body weight between 20 and 500 kg (or 44 and 1100 lbs)' });
      return;
    }

    const roundedWeight = Math.round(numWeight * 10) / 10;
    const entryDate = date ? new Date(date) : new Date();
    if (isNaN(entryDate.getTime())) {
      res.status(400).json({ error: 'Invalid date provided' });
      return;
    }

    // Check for existing log on the same calendar day (UTC)
    const startOfDay = new Date(entryDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(entryDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let log = await WeightLog.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (log) {
      log.weight = roundedWeight;
      log.unit = unit === 'lbs' ? 'lbs' : 'kg';
      log.notes = notes ? String(notes).trim() : log.notes;
      log.date = entryDate;
      await log.save();
    } else {
      log = await WeightLog.create({
        userId,
        weight: roundedWeight,
        unit: unit === 'lbs' ? 'lbs' : 'kg',
        date: entryDate,
        notes: notes ? String(notes).trim() : '',
      });
    }

    // Update User.currentWeight and User.weightUnit if this log is latest
    const laterLog = await WeightLog.findOne({
      userId,
      date: { $gt: entryDate },
    });

    if (!laterLog) {
      await User.findByIdAndUpdate(userId, {
        currentWeight: roundedWeight,
        weightUnit: unit === 'lbs' ? 'lbs' : 'kg',
      });
    }

    res.status(200).json({
      message: 'Weight logged successfully',
      log,
      currentWeight: roundedWeight,
      unit: unit === 'lbs' ? 'lbs' : 'kg',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to log body weight', details: error.message });
  }
};

/**
 * @desc    Delete a body weight entry
 * @route   DELETE /api/progress/weight/:id
 * @access  Private (JWT protected)
 */
export const deleteWeightLog = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    const userId = req.user._id;

    const deleted = await WeightLog.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      res.status(404).json({ error: 'Weight log entry not found' });
      return;
    }

    // Refresh User.currentWeight to new latest entry
    const newLatest = await WeightLog.findOne({ userId }).sort({ date: -1 });
    await User.findByIdAndUpdate(userId, {
      currentWeight: newLatest ? newLatest.weight : null,
    });

    res.status(200).json({
      message: 'Weight log deleted successfully',
      id,
      currentWeight: newLatest ? newLatest.weight : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete weight log', details: error.message });
  }
};

