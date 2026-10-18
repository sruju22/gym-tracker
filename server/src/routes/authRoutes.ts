import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  googleAuth,
  linkGoogleAccount,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// Protected auth endpoints
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/google/link', protect, linkGoogleAccount);

export default router;
