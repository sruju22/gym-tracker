import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import { chatWithCoach } from '../controllers/coachController';

const router = Router();

/**
 * Sensible rate limiting for AI Coach chat requests:
 * 20 requests per 15 minutes per user (or IP fallback).
 * Prevents API quota exhaustion and accidental spam.
 */
export const coachRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20, // Max 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?._id ? authReq.user._id.toString() : req.ip || 'anonymous_ip';
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'You have reached the request limit for the AI Coach. Please wait a few minutes before trying again.',
      dataSources: [],
      error: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

// POST /api/coach/chat - Protected endpoint with rate limiting
router.post('/chat', protect, coachRateLimiter, chatWithCoach);

export default router;
