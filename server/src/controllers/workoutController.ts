import { Response } from 'express';
import mongoose from 'mongoose';
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
          if (Array.isArray(s.stages) && s.stages.length > 0) {
            let setHasCompletedStage = false;
            s.stages.forEach((st: any) => {
              if (st.completed && st.weight && st.reps) {
                totalVolume += Number(st.weight) * Number(st.reps);
                setHasCompletedStage = true;
              }
            });
            if (s.completed || setHasCompletedStage) {
              totalSets++;
            }
          } else if (s.completed && s.weight && s.reps) {
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

    const { status, limit, page, search, workoutType, startDate, endDate } = req.query;
    const filter: Record<string, any> = { userId: req.user._id };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (workoutType && typeof workoutType === 'string' && workoutType !== 'all') {
      filter.workoutName = { $regex: `^${workoutType.trim()}$`, $options: 'i' };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { workoutName: searchRegex },
        { 'exercises.exerciseName': searchRegex },
        { muscleGroups: searchRegex },
      ];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    const totalCount = await Workout.countDocuments(filter);

    let query = Workout.find(filter).sort({ date: -1, completedAt: -1, createdAt: -1 });

    const pageNum = page && !isNaN(Number(page)) ? Math.max(1, Number(page)) : 1;
    const limitNum = limit && !isNaN(Number(limit)) ? Number(limit) : 0;

    if (limitNum > 0) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const workouts = await query;
    res.status(200).json({
      count: workouts.length,
      totalCount,
      page: pageNum,
      totalPages: limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1,
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Workout session not found' });
      return;
    }

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
      clientSessionId,
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
      rating,
    } = req.body;

    if (!workoutName || typeof workoutName !== 'string' || !workoutName.trim()) {
      res.status(400).json({ error: 'Workout name is required' });
      return;
    }

    // IDEMPOTENCY GUARD: Prevent duplicate document creation from rapid clicks or retries
    if (clientSessionId && typeof clientSessionId === 'string' && clientSessionId.trim()) {
      const existingWorkout = await Workout.findOne({
        userId: req.user._id,
        clientSessionId: clientSessionId.trim(),
      });

      if (existingWorkout) {
        res.status(200).json({
          message: 'Workout session already saved',
          workout: existingWorkout,
          deduplicated: true,
        });
        return;
      }
    }

    const { totalVolume, totalSets } = calculateWorkoutTotals(exercises || []);

    // SECURITY: Always assign userId from authenticated JWT payload (req.user._id)
    const newWorkout = await Workout.create({
      userId: req.user._id,
      clientSessionId: clientSessionId ? String(clientSessionId).trim() : undefined,
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
      rating: rating || null,
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Workout session not found' });
      return;
    }

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
      rating,
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
    if (rating !== undefined) workout.rating = rating;

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Workout session not found' });
      return;
    }

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
