import { Router } from 'express';
import {
  getWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutHistory,
  getWorkoutHistoryById,
  createWorkoutHistory,
  updateWorkoutHistory,
  deleteWorkoutHistory,
} from '../controllers/workoutController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all workout endpoints with JWT authentication middleware
router.use(protect);

// Explicit history endpoints (/api/workouts/history and /api/workouts/history/:id)
router.route('/history')
  .get(getWorkoutHistory)
  .post(createWorkoutHistory);

router.route('/history/:id')
  .get(getWorkoutHistoryById)
  .put(updateWorkoutHistory)
  .delete(deleteWorkoutHistory);

// Base workout session endpoints (/api/workouts and /api/workouts/:id)
router.route('/')
  .get(getWorkouts)
  .post(createWorkout);

router.route('/:id')
  .get(getWorkoutById)
  .put(updateWorkout)
  .delete(deleteWorkout);

export default router;
