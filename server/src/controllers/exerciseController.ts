import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Exercise from '../models/Exercise';

/**
 * @desc    Get all exercises (with optional filtering)
 * @route   GET /api/exercises
 */
export const getExercises = async (req: Request, res: Response): Promise<void> => {
  try {
    const { muscleGroup, category, equipment, search, isCustom } = req.query;
    const filter: Record<string, any> = {};

    if (muscleGroup && typeof muscleGroup === 'string') {
      filter.muscleGroup = { $regex: new RegExp(`^${muscleGroup}$`, 'i') };
    }

    if (category && typeof category === 'string') {
      filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (equipment && typeof equipment === 'string') {
      filter.equipment = { $regex: new RegExp(`^${equipment}$`, 'i') };
    }

    if (isCustom !== undefined) {
      filter.isCustom = isCustom === 'true';
    }

    if (search && typeof search === 'string') {
      filter.name = { $regex: search, $options: 'i' };
    }

    const exercises = await Exercise.find(filter).sort({ muscleGroup: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: exercises.length,
      data: exercises
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve exercises',
      error: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get single exercise by ID
 * @route   GET /api/exercises/:id
 */
export const getExerciseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid exercise ID format: ${id}`
      });
      return;
    }

    const exercise = await Exercise.findById(id);

    if (!exercise) {
      res.status(404).json({
        success: false,
        message: `Exercise not found with ID: ${id}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: exercise
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve exercise',
      error: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Create a new exercise
 * @route   POST /api/exercises
 */
export const createExercise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, muscleGroup, equipment, category, description, instructions, imageUrl, isCustom } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Exercise name is required'
      });
      return;
    }

    if (!muscleGroup || typeof muscleGroup !== 'string' || !muscleGroup.trim()) {
      res.status(400).json({
        success: false,
        message: 'Muscle group is required'
      });
      return;
    }

    const newExercise = await Exercise.create({
      name: name.trim(),
      muscleGroup: muscleGroup.trim(),
      equipment: equipment ? equipment.trim() : undefined,
      category: category ? category.trim() : undefined,
      description: description ? description.trim() : undefined,
      instructions: instructions ? instructions.trim() : undefined,
      imageUrl: imageUrl ? imageUrl.trim() : undefined,
      isCustom: Boolean(isCustom)
    });

    res.status(201).json({
      success: true,
      message: 'Exercise created successfully',
      data: newExercise
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create exercise',
      error: error.message || 'Invalid data'
    });
  }
};

/**
 * @desc    Update an exercise by ID
 * @route   PUT /api/exercises/:id
 */
export const updateExercise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid exercise ID format: ${id}`
      });
      return;
    }

    const exercise = await Exercise.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!exercise) {
      res.status(404).json({
        success: false,
        message: `Exercise not found with ID: ${id}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Exercise updated successfully',
      data: exercise
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update exercise',
      error: error.message || 'Invalid update data'
    });
  }
};

/**
 * @desc    Delete an exercise by ID
 * @route   DELETE /api/exercises/:id
 */
export const deleteExercise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid exercise ID format: ${id}`
      });
      return;
    }

    const exercise = await Exercise.findByIdAndDelete(id);

    if (!exercise) {
      res.status(404).json({
        success: false,
        message: `Exercise not found with ID: ${id}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Exercise deleted successfully',
      data: exercise
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete exercise',
      error: error.message || 'Server error'
    });
  }
};
