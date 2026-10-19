import { Router } from 'express';
import {
  getPersonalRecords,
  getPreviousPerformance,
  getExerciseProgress,
  getProgressSummary,
  getVolumeTrend,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalStatus,
  getWeightLogs,
  logWeight,
  deleteWeightLog,
} from '../controllers/progressController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all progress endpoints with JWT authentication middleware
router.use(protect);

// Personal Records & Exercise Progression
router.get('/prs', getPersonalRecords);
router.get('/previous/:exerciseId', getPreviousPerformance);
router.get('/exercise/:exerciseId', getExerciseProgress);
router.get('/summary', getProgressSummary);
router.get('/volume-trend', getVolumeTrend);

// Fitness Goals
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);
router.patch('/goals/:id/status', updateGoalStatus);

// Body Weight Logging & History
router.get('/weight', getWeightLogs);
router.post('/weight', logWeight);
router.delete('/weight/:id', deleteWeightLog);

export default router;
