import { Response } from 'express';
import WorkoutPlan from '../models/WorkoutPlan';
import { DEFAULT_WORKOUT_PLAN } from '../data/defaultWorkoutPlan';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * @desc    Get current authenticated user's workout plan
 * @route   GET /api/workout-plans
 * @access  Private (JWT protected)
 */
export const getWorkoutPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let plan = await WorkoutPlan.findOne({ userId: req.user._id });

    // Auto-initialize default plan if user doesn't have one saved yet
    if (!plan) {
      plan = await WorkoutPlan.create({
        userId: req.user._id,
        weeklyPlan: DEFAULT_WORKOUT_PLAN,
      });
    }

    res.status(200).json({ plan });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch workout plan', details: error.message });
  }
};

/**
 * @desc    Get workout plan by ID for current authenticated user
 * @route   GET /api/workout-plans/:id
 * @access  Private (JWT protected)
 */
export const getWorkoutPlanById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const plan = await WorkoutPlan.findById(id);

    if (!plan) {
      res.status(404).json({ error: 'Workout plan not found' });
      return;
    }

    // Ownership Enforcement
    if (plan.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this workout plan' });
      return;
    }

    res.status(200).json({ plan });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch workout plan', details: error.message });
  }
};

/**
 * @desc    Create a new workout plan for current authenticated user
 * @route   POST /api/workout-plans
 * @access  Private (JWT protected)
 */
export const createWorkoutPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { weeklyPlan } = req.body;

    if (!weeklyPlan) {
      res.status(400).json({ error: 'weeklyPlan object is required' });
      return;
    }

    // Prevent duplicate workout plans for the same user
    const existingPlan = await WorkoutPlan.findOne({ userId: req.user._id });
    if (existingPlan) {
      res.status(400).json({
        error: 'Workout plan already exists for this user. Use PUT /api/workout-plans/:id to update.',
        existingPlanId: existingPlan._id.toString(),
      });
      return;
    }

    // SECURITY: Always assign userId from authenticated JWT payload (req.user._id)
    const newPlan = await WorkoutPlan.create({
      userId: req.user._id,
      weeklyPlan,
    });

    res.status(201).json({
      message: 'Workout plan created successfully',
      plan: newPlan,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create workout plan', details: error.message });
  }
};

/**
 * @desc    Update workout plan by ID for current authenticated user
 * @route   PUT /api/workout-plans/:id
 * @access  Private (JWT protected)
 */
export const updateWorkoutPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const plan = await WorkoutPlan.findById(id);

    if (!plan) {
      res.status(404).json({ error: 'Workout plan not found' });
      return;
    }

    // Ownership Enforcement
    if (plan.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden: You do not own this workout plan' });
      return;
    }

    const { weeklyPlan } = req.body;

    if (!weeklyPlan) {
      res.status(400).json({ error: 'weeklyPlan object is required for update' });
      return;
    }

    plan.weeklyPlan = weeklyPlan;
    const updatedPlan = await plan.save();

    res.status(200).json({
      message: 'Workout plan updated successfully',
      plan: updatedPlan,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update workout plan', details: error.message });
  }
};
