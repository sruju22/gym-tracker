import { Router } from 'express';
import {
  getCardioSessions,
  getCardioSessionById,
  createCardioSession,
  updateCardioSession,
  deleteCardioSession,
} from '../controllers/cardioController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Enforce JWT authentication on all cardio routes
router.use(protect);

router.get('/', getCardioSessions);
router.post('/', createCardioSession);
router.get('/:id', getCardioSessionById);
router.put('/:id', updateCardioSession);
router.delete('/:id', deleteCardioSession);

export default router;
