import { Response } from 'express';
import mongoose from 'mongoose';
import WorkoutPlan from '../models/WorkoutPlan';
import User from '../models/User';
import { DEFAULT_WORKOUT_PLAN } from '../data/defaultWorkoutPlan';
import {
  WORKOUT_TEMPLATES,
  getRecommendedTemplate,
  getTemplateById,
} from '../data/workoutTemplates';
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

    // Auto-initialize plan if user doesn't have one saved yet
    if (!plan) {
      // Check user's onboarding preferences to recommend a sensible default
      const user = await User.findById(req.user._id);
      const goal = user?.fitnessGoal || 'Muscle Building & Hypertrophy';
      const days = user?.trainingDaysPerWeek || 4;
      const experience = user?.experienceLevel;
      const equipment = user?.equipmentPreference;

      let template = user?.selectedTemplateId ? getTemplateById(user.selectedTemplateId) : null;
      if (!template) {
        template = getRecommendedTemplate(goal, days, experience, equipment);
      }

      plan = await WorkoutPlan.create({
        userId: req.user._id,
        weeklyPlan: template?.weeklySchedule || DEFAULT_WORKOUT_PLAN,
        templateId: template?.id || 'hypertrophy-ppl-6day',
        templateName: template?.name || 'Push / Pull / Legs (PPL) — 6-Day',
        fitnessGoal: goal,
        trainingDaysPerWeek: days,
        progressionRule: template?.progressionMethodology || '',
      });

      if (user && template && user.selectedTemplateId !== template.id) {
        user.selectedTemplateId = template.id;
        await user.save();
      }
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Workout plan not found' });
      return;
    }

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

    const { weeklyPlan, templateId, templateName, fitnessGoal, trainingDaysPerWeek, progressionRule } = req.body;

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
      templateId: templateId || '',
      templateName: templateName || '',
      fitnessGoal: fitnessGoal || '',
      trainingDaysPerWeek: trainingDaysPerWeek || 4,
      progressionRule: progressionRule || '',
    });

    if (templateId) {
      await User.findByIdAndUpdate(req.user._id, { selectedTemplateId: templateId });
    }

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Workout plan not found' });
      return;
    }

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

    const { weeklyPlan, templateId, templateName, fitnessGoal, trainingDaysPerWeek, progressionRule } = req.body;

    if (!weeklyPlan) {
      res.status(400).json({ error: 'weeklyPlan object is required for update' });
      return;
    }

    plan.weeklyPlan = weeklyPlan;
    if (templateId !== undefined) plan.templateId = templateId;
    if (templateName !== undefined) plan.templateName = templateName;
    if (fitnessGoal !== undefined) plan.fitnessGoal = fitnessGoal;
    if (trainingDaysPerWeek !== undefined) plan.trainingDaysPerWeek = trainingDaysPerWeek;
    if (progressionRule !== undefined) plan.progressionRule = progressionRule;

    const updatedPlan = await plan.save();

    if (templateId) {
      await User.findByIdAndUpdate(req.user._id, { selectedTemplateId: templateId });
    }

    res.status(200).json({
      message: 'Workout plan updated successfully',
      plan: updatedPlan,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update workout plan', details: error.message });
  }
};

/**
 * @desc    Get all available workout split templates
 * @route   GET /api/workout-plans/templates
 * @access  Public (or Private)
 */
export const getWorkoutTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const goal = (req.query.goal as string) || '';
    const days = parseInt(req.query.days as string, 10) || 0;

    let recommendedTemplateId: string | null = null;
    if (goal || days) {
      const rec = getRecommendedTemplate(goal, days);
      recommendedTemplateId = rec.id;
    } else if (req.user) {
      const user = await User.findById(req.user._id);
      if (user?.fitnessGoal) {
        const rec = getRecommendedTemplate(user.fitnessGoal, user.trainingDaysPerWeek || 4, user.experienceLevel, user.equipmentPreference);
        recommendedTemplateId = rec.id;
      }
    }

    res.status(200).json({
      templates: WORKOUT_TEMPLATES,
      recommendedTemplateId,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
  }
};

/**
 * @desc    Apply a specific template to the authenticated user's workout plan
 * @route   POST /api/workout-plans/apply-template
 * @access  Private (JWT protected)
 */
export const applyWorkoutTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { templateId } = req.body;
    if (!templateId) {
      res.status(400).json({ error: 'templateId is required' });
      return;
    }

    const template = getTemplateById(templateId);
    if (!template) {
      res.status(404).json({ error: `Template with ID '${templateId}' not found` });
      return;
    }

    let plan = await WorkoutPlan.findOne({ userId: req.user._id });

    if (plan) {
      plan.weeklyPlan = template.weeklySchedule;
      plan.templateId = template.id;
      plan.templateName = template.name;
      plan.fitnessGoal = template.goal;
      plan.trainingDaysPerWeek = template.daysPerWeek;
      plan.progressionRule = template.progressionMethodology;
      await plan.save();
    } else {
      plan = await WorkoutPlan.create({
        userId: req.user._id,
        weeklyPlan: template.weeklySchedule,
        templateId: template.id,
        templateName: template.name,
        fitnessGoal: template.goal,
        trainingDaysPerWeek: template.daysPerWeek,
        progressionRule: template.progressionMethodology,
      });
    }

    // Sync selectedTemplateId and fitnessGoal to User profile without deleting historical data
    await User.findByIdAndUpdate(req.user._id, {
      selectedTemplateId: template.id,
      fitnessGoal: template.goal,
      trainingDaysPerWeek: template.daysPerWeek,
    });

    res.status(200).json({
      message: `Template '${template.name}' applied successfully. All workout history preserved.`,
      plan,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to apply workout template', details: error.message });
  }
};
