import { Response } from 'express';
import Workout from '../models/Workout';
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
      const completedSets = ex.sets.filter(
        (s) => s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0
      );

      for (const s of completedSets) {
        const weight = s.weight!;
        const reps = s.reps!;
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

    // Find most recent completed workout session containing this exercise
    const workout = await Workout.findOne({
      userId: req.user._id,
      status: 'completed',
      'exercises.exerciseId': exerciseId,
    }).sort({ date: -1 });

    if (!workout) {
      res.status(200).json({ previousPerformance: null });
      return;
    }

    const matchingEx = workout.exercises.find((e) => e.exerciseId === exerciseId);
    if (!matchingEx) {
      res.status(200).json({ previousPerformance: null });
      return;
    }

    const completedSets = matchingEx.sets.filter(
      (s) => s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0
    );

    if (completedSets.length === 0) {
      res.status(200).json({ previousPerformance: null });
      return;
    }

    const weights = completedSets.map((s) => s.weight!);
    const bestWeight = Math.max(...weights);
    const bestSet = completedSets.find((s) => s.weight === bestWeight) || completedSets[0];
    const estimated1RM = calculate1RM(bestSet.weight!, bestSet.reps!);

    res.status(200).json({
      previousPerformance: {
        exerciseId,
        date: workout.date,
        workoutName: workout.workoutName,
        sets: completedSets.map((s) => ({
          setNumber: s.setNumber,
          weight: s.weight!,
          reps: s.reps!,
        })),
        bestWeight,
        bestReps: bestSet.reps!,
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
      'exercises.exerciseId': exerciseId,
    }).sort({ date: 1 });

    const strengthTimeline: Array<{
      date: Date;
      maxWeight: number;
      bestReps: number;
      estimated1RM: number;
      workoutName: string;
    }> = [];

    sessions.forEach((session) => {
      const matchingEx = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (matchingEx) {
        const completedSets = matchingEx.sets.filter(
          (s) => s.completed && s.weight && s.weight > 0 && s.reps && s.reps > 0
        );

        if (completedSets.length > 0) {
          const weights = completedSets.map((s) => s.weight!);
          const maxWeight = Math.max(...weights);
          const bestSet = completedSets.find((s) => s.weight === maxWeight) || completedSets[0];
          const estimated1RM = calculate1RM(bestSet.weight!, bestSet.reps!);

          strengthTimeline.push({
            date: session.date,
            maxWeight,
            bestReps: bestSet.reps!,
            estimated1RM,
            workoutName: session.workoutName,
          });
        }
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
 * @desc    Get progress summary metrics (total volume, total sets, exercise frequency)
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

    const frequencyMap: Record<string, number> = {};
    completedSessions.forEach((session) => {
      session.exercises.forEach((ex) => {
        frequencyMap[ex.exerciseName] = (frequencyMap[ex.exerciseName] || 0) + 1;
      });
    });

    const exerciseFrequency = Object.entries(frequencyMap)
      .map(([name, count]) => ({ exerciseName: name, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      totalVolume,
      totalSets,
      totalWorkouts: completedSessions.length,
      exerciseFrequency,
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
