import { Router } from 'express';
import {
  getPersonalRecords,
  getPreviousPerformance,
  getExerciseProgress,
  getProgressSummary,
  getVolumeTrend,
} from '../controllers/progressController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all progress endpoints with JWT authentication middleware
router.use(protect);

router.get('/prs', getPersonalRecords);
router.get('/previous/:exerciseId', getPreviousPerformance);
router.get('/exercise/:exerciseId', getExerciseProgress);
router.get('/summary', getProgressSummary);
router.get('/volume-trend', getVolumeTrend);

export default router;
