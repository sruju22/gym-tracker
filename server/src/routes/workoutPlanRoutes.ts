import { Router } from 'express';
import {
  getWorkoutPlan,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
} from '../controllers/workoutPlanController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all workout plan endpoints with JWT authentication middleware
router.use(protect);

router.route('/')
  .get(getWorkoutPlan)
  .post(createWorkoutPlan);

router.route('/:id')
  .get(getWorkoutPlanById)
  .put(updateWorkoutPlan);

export default router;
