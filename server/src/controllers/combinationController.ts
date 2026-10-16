import { Response } from 'express';
import CombinationTemplate from '../models/CombinationTemplate';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * @desc    Get all saved combination templates for current authenticated user
 * @route   GET /api/combinations
 * @access  Private (JWT protected)
 */
export const getCombinationTemplates = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const templates = await CombinationTemplate.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({ templates });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch combination templates',
      details: error.message,
    });
  }
};

/**
 * @desc    Create/Save a combination template for current authenticated user
 * @route   POST /api/combinations
 * @access  Private (JWT protected)
 */
export const createCombinationTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name, type, techniqueLabel, rounds, stages } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Combination name is required' });
      return;
    }

    const newTemplate = await CombinationTemplate.create({
      userId: req.user._id,
      name: name.trim(),
      type: type || 'combine_exercises',
      techniqueLabel: techniqueLabel ? techniqueLabel.trim() : 'Custom Combination',
      rounds: typeof rounds === 'number' && rounds >= 1 ? rounds : 3,
      stages: Array.isArray(stages) ? stages : [],
    });

    res.status(201).json({
      message: 'Combination template saved successfully',
      template: newTemplate,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to save combination template',
      details: error.message,
    });
  }
};

/**
 * @desc    Delete a saved combination template for current authenticated user
 * @route   DELETE /api/combinations/:id
 * @access  Private (JWT protected)
 */
export const deleteCombinationTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    const deleted = await CombinationTemplate.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deleted) {
      res.status(404).json({ error: 'Combination template not found or unauthorized' });
      return;
    }

    res.status(200).json({
      message: 'Combination template deleted successfully',
      id,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete combination template',
      details: error.message,
    });
  }
};
