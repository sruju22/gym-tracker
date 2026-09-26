import { Response } from 'express';
import Workout from '../models/Workout';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Helper to calculate total volume and completed sets for a workout session
 */
const calculateWorkoutTotals = (exercises: any[]) => {
  let totalVolume = 0;
  let totalSets = 0;

  if (Array.isArray(exercises)) {
    exercises.forEach((ex) => {
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach((s: any) => {
          if (s.completed && s.weight && s.reps) {
            totalVolume += Number(s.weight) * Number(s.reps);
            totalSets++;
          }
        });
      }
    });
  }

  return { totalVolume, totalSets };
};

/**
 * @desc    Get all workout sessions for current authenticated user
 * @route   GET /api/workouts
 * @access  Private (JWT protected)
 */
export const getWorkouts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { status, limit } = req.query;
    const filter: Record<string, any> = { userId: req.user._id };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    let query = Workout.find(filter).sort({ date: -1 });

    if (limit && !isNaN(Number(limit))) {
      query = query.limit(Number(limit));
    }

    const workouts = await query;
    res.status(200).json({
      count: workouts.length,
      workouts,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch workouts', details: error.message });
  }
};

/**
 * @desc    Get single workout session by ID for current authenticated user
 * @route   GET /api/workouts/:id
 * @access  Private (JWT protected)
 */
export const getWorkoutById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const workout = await Workout.findById(id);

    if (!workout) {
      res.status(404).json({ error: 'Workout session not found' });
      return;
    }

    // Ownership Enforcement
    if (workout.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this workout session' });
      return;
    }

    res.status(200).json({ workout });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch workout session', details: error.message });
  }
};

/**
 * @desc    Create new workout session for current authenticated user
 * @route   POST /api/workouts or POST /api/workouts/history
 * @access  Private (JWT protected)
 */
export const createWorkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      workoutPlanId,
      workoutName,
      date,
      dayOfWeek,
      muscleGroups,
      status,
      startedAt,
      completedAt,
      duration,
      exercises,
      notes,
    } = req.body;

    if (!workoutName || typeof workoutName !== 'string' || !workoutName.trim()) {
      res.status(400).json({ error: 'Workout name is required' });
      return;
    }

    const { totalVolume, totalSets } = calculateWorkoutTotals(exercises || []);

    // SECURITY: Always assign userId from authenticated JWT payload (req.user._id)
    const newWorkout = await Workout.create({
      userId: req.user._id,
      workoutPlanId: workoutPlanId || undefined,
      workoutName: workoutName.trim(),
      date: date ? new Date(date) : new Date(),
      dayOfWeek: dayOfWeek || 'monday',
      muscleGroups: Array.isArray(muscleGroups) ? muscleGroups : [],
      status: status || 'completed',
      startedAt: startedAt ? new Date(startedAt) : undefined,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      duration: typeof duration === 'number' ? duration : 0,
      exercises: Array.isArray(exercises) ? exercises : [],
      notes: notes || '',
      totalVolume,
      totalSets,
    });

    res.status(201).json({
      message: 'Workout session created successfully',
      workout: newWorkout,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create workout session', details: error.message });
  }
};

/**
 * @desc    Update an existing workout session for current authenticated user
 * @route   PUT /api/workouts/:id or PUT /api/workouts/history/:id
 * @access  Private (JWT protected)
 */
export const updateWorkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const workout = await Workout.findById(id);

    if (!workout) {
      res.status(404).json({ error: 'Workout session not found' });
      return;
    }

    // Ownership Enforcement
    if (workout.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this workout session' });
      return;
    }

    const {
      workoutPlanId,
      workoutName,
      date,
      dayOfWeek,
      muscleGroups,
      status,
      completedAt,
      duration,
      exercises,
      notes,
    } = req.body;

    if (workoutPlanId !== undefined) workout.workoutPlanId = workoutPlanId;
    if (workoutName) workout.workoutName = workoutName.trim();
    if (date) workout.date = new Date(date);
    if (dayOfWeek) workout.dayOfWeek = dayOfWeek;
    if (muscleGroups && Array.isArray(muscleGroups)) workout.muscleGroups = muscleGroups;
    if (status) workout.status = status;
    if (completedAt) workout.completedAt = new Date(completedAt);
    if (duration !== undefined) workout.duration = duration;
    if (notes !== undefined) workout.notes = notes;

    if (exercises && Array.isArray(exercises)) {
      workout.exercises = exercises;
      const { totalVolume, totalSets } = calculateWorkoutTotals(exercises);
      workout.totalVolume = totalVolume;
      workout.totalSets = totalSets;
    }

    const updatedWorkout = await workout.save();

    res.status(200).json({
      message: 'Workout session updated successfully',
      workout: updatedWorkout,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update workout session', details: error.message });
  }
};

/**
 * @desc    Delete a workout session for current authenticated user
 * @route   DELETE /api/workouts/:id or DELETE /api/workouts/history/:id
 * @access  Private (JWT protected)
 */
export const deleteWorkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const workout = await Workout.findById(id);

    if (!workout) {
      res.status(404).json({ error: 'Workout session not found' });
      return;
    }

    // Ownership Enforcement
    if (workout.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this workout session' });
      return;
    }

    await Workout.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Workout session deleted successfully',
      id,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete workout session', details: error.message });
  }
};

// History route handler aliases
export const getWorkoutHistory = getWorkouts;
export const getWorkoutHistoryById = getWorkoutById;
export const createWorkoutHistory = createWorkout;
export const updateWorkoutHistory = updateWorkout;
export const deleteWorkoutHistory = deleteWorkout;
