import { Router } from 'express';
import {
  getCombinationTemplates,
  createCombinationTemplate,
  updateCombinationTemplate,
  deleteCombinationTemplate,
} from '../controllers/combinationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect all combination template endpoints with JWT authentication middleware
router.use(protect);

router.route('/')
  .get(getCombinationTemplates)
  .post(createCombinationTemplate);

router.route('/:id')
  .put(updateCombinationTemplate)
  .delete(deleteCombinationTemplate);

export default router;
