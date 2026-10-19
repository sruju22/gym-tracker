import { Router } from 'express';
import {
  getWorkoutPlan,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  getWorkoutTemplates,
  applyWorkoutTemplate,
} from '../controllers/workoutPlanController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all workout plan endpoints with JWT authentication middleware
router.use(protect);

router.get('/templates', getWorkoutTemplates);
router.post('/apply-template', applyWorkoutTemplate);

router.route('/')
  .get(getWorkoutPlan)
  .post(createWorkoutPlan);

router.route('/:id')
  .get(getWorkoutPlanById)
  .put(updateWorkoutPlan);

export default router;
