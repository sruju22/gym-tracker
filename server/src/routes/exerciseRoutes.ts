import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
} from '../controllers/exerciseController';

const router = Router();

router.route('/')
  .get(getExercises)
  .post(protect, createExercise);

router.route('/:id')
  .get(getExerciseById)
  .put(protect, updateExercise)
  .delete(protect, deleteExercise);

export default router;
