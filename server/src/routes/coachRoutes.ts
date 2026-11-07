import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import { chatWithCoach } from '../controllers/coachController';

const router = Router();

/**
 * Resolves the rate-limiting key strictly using the verified authenticated user ID.
 * Multi-user protection invariant: Users sharing a corporate or household NAT/IP
 * will never consume each other's individual request limits.
 *
 * NOTE FOR MULTI-INSTANCE DEPLOYMENTS:
 * These in-memory stores (MemoryStore) run per backend process. In clustered or horizontally
 * scaled multi-instance environments (e.g. multiple Render containers or serverless instances),
 * limits are tracked independently per container. When scaling to multi-container clusters,
 * migrate store configuration to Redis (e.g., rate-limit-redis).
 */
export const resolveUserRateLimitKey = (req: any): string => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user._id) {
    return `user:${authReq.user._id.toString()}`;
  }
  return `ip:${req.ip || 'anonymous'}`;
};

/**
 * 1. Short-term burst protection:
 * Maximum 3 requests per 10 seconds per authenticated user.
 * Mitigates rapid click-spamming, accidental double submissions, or frontend script loops.
 */
export const coachBurstLimiter = rateLimit({
  windowMs: 10 * 1000, // 10-second window
  max: 3, // Max 3 requests per 10s
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: resolveUserRateLimitKey,
  handler: (req, res) => {
    res.setHeader('Retry-After', '10');
    res.status(429).json({
      message: 'Too many requests in a short period. Please wait a few seconds before asking the AI Coach again.',
      dataSources: [],
      error: 'RATE_LIMITED',
      retryAfter: 10,
    });
  },
});

/**
 * 2. Medium-term sliding window limiter:
 * 20 requests per 15 minutes per user.
 * Preserves the baseline established in Phase 11B foundation.
 */
export const coachRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 20, // Max 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: resolveUserRateLimitKey,
  handler: (req, res) => {
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      message: 'You have reached the request limit for the AI Coach (20 requests per 15 minutes). Please wait a few minutes before trying again.',
      dataSources: [],
      error: 'RATE_LIMITED',
      retryAfter: 60,
    });
  },
});

/**
 * 3. Daily quota limiter:
 * Maximum 30 AI Coach requests per user per 24 hours.
 * Protects global Gemini API quota from being exhausted by a single power user.
 */
export const coachDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24-hour sliding window
  max: 30, // Max 30 requests per day
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: resolveUserRateLimitKey,
  handler: (req, res) => {
    res.setHeader('Retry-After', '3600');
    res.status(429).json({
      message: 'You have reached your daily limit of 30 AI Coach requests. Your limit will reset tomorrow.',
      dataSources: [],
      error: 'DAILY_LIMIT_REACHED',
      retryAfter: 3600,
    });
  },
});

/**
 * Test & administration helper to reset rate limiter counters for a given user.
 */
export function resetCoachRateLimiters(userId?: string) {
  if (userId) {
    const key = `user:${userId}`;
    coachBurstLimiter.resetKey?.(key);
    coachRateLimiter.resetKey?.(key);
    coachDailyLimiter.resetKey?.(key);
  }
}

// POST /api/coach/chat - Protected endpoint with 3-tier rate limiting (Burst -> 15-min -> Daily)
router.post(
  '/chat',
  protect,
  coachBurstLimiter,
  coachRateLimiter,
  coachDailyLimiter,
  chatWithCoach
);

export default router;
