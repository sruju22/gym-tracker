import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Protected auth endpoint
router.get('/me', protect, getMe);

export default router;
