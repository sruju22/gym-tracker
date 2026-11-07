/**
 * GymTrackie Phase 11B.1 — AI Coach Reliability & Production Protection Verification Suite
 *
 * Automated verification of the 14 requirements:
 * 1. Primary model success
 * 2. Primary 503 followed by successful fallback
 * 3. Primary 429 with appropriate fallback behavior
 * 4. Exhausted quota without endless retries
 * 5. Primary timeout
 * 6. Fallback timeout
 * 7. Invalid API key with no retry
 * 8. Burst limit (max 3 req / 10s per user)
 * 9. Daily per-user limit (max 30 req / 24h per user)
 * 10. Two different users maintaining independent counters
 * 11. Multiple requests by the same user tracking properly
 * 12. Existing 20-per-15-minute window limit
 * 13. Missing API key safe error handling
 * 14. Existing workout context and privacy protections
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import {
  chatWithCoach,
  classifyProviderError,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODEL,
} from '../controllers/coachController';
import {
  coachBurstLimiter,
  coachRateLimiter,
  coachDailyLimiter,
  resetCoachRateLimiters,
} from '../routes/coachRoutes';
import User from '../models/User';
import Workout from '../models/Workout';
import WorkoutPlan from '../models/WorkoutPlan';
import Goal from '../models/Goal';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(
      `❌ ASSERTION FAILED: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`
    );
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {} as Record<string, any>,
    onEnd: null as (() => void) | null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      if (typeof this.onEnd === 'function') {
        this.onEnd();
      }
      return this;
    },
    setHeader(name: string, value: any) {
      this.headers[name.toLowerCase()] = String(value);
      return this;
    },
    getHeader(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
  return res;
}

// In-Memory Database store for isolation testing
const mockUserStore = new Map<string, any>();
const mockPlanStore = new Map<string, any>();
const mockGoalStore: any[] = [];
const mockWorkoutStore: any[] = [];

function setupMongooseStubs() {
  (User as any).findById = (id: any) => {
    const idStr = id?.toString();
    const user = mockUserStore.get(idStr);
    return {
      select: () => ({
        lean: async () => (user ? { ...user } : null),
      }),
      lean: async () => (user ? { ...user } : null),
    };
  };

  (WorkoutPlan as any).findOne = (query: any) => {
    const userIdStr = query?.userId?.toString();
    const plan = mockPlanStore.get(userIdStr);
    return {
      lean: async () => (plan ? JSON.parse(JSON.stringify(plan)) : null),
    };
  };

  (Goal as any).find = (query: any) => {
    const userIdStr = query?.userId?.toString();
    const goals = mockGoalStore.filter((g) => g.userId?.toString() === userIdStr);
    return {
      limit: (n: number) => ({
        select: () => ({
          lean: async () => goals.slice(0, n).map((g) => ({ ...g })),
        }),
        lean: async () => goals.slice(0, n).map((g) => ({ ...g })),
      }),
      lean: async () => goals.map((g) => ({ ...g })),
    };
  };

  (Workout as any).find = (query: any) => {
    const userIdStr = query?.userId?.toString();
    let workouts = mockWorkoutStore.filter((w) => w.userId?.toString() === userIdStr);

    if (query?.date && query.date.$gte) {
      workouts = workouts.filter((w) => new Date(w.date) >= query.date.$gte);
    }

    const createChainable = (items: any[]) => ({
      sort: (sortObj: any) => {
        const sorted = [...items].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return sortObj.date === -1 ? dateB - dateA : dateA - dateB;
        });
        return {
          limit: (n: number) => ({
            lean: async () => sorted.slice(0, n).map((w) => JSON.parse(JSON.stringify(w))),
          }),
          lean: async () => sorted.map((w) => JSON.parse(JSON.stringify(w))),
        };
      },
      limit: (n: number) => ({
        lean: async () => items.slice(0, n).map((w) => JSON.parse(JSON.stringify(w))),
      }),
      lean: async () => items.map((w) => JSON.parse(JSON.stringify(w))),
    });

    return createChainable(workouts);
  };
}

async function runReliabilityTestSuite() {
  console.log('\n=============================================================');
  console.log('🛡️ GymTrackie Phase 11B.1 — AI Coach Reliability & Protection');
  console.log('=============================================================\n');

  setupMongooseStubs();

  // Set an API key in environment for mock testing
  process.env.GEMINI_API_KEY = 'test_mock_api_key_valid_length_1234567890';
  process.env.GEMINI_TIMEOUT_MS = '1000'; // 1 second timeout for fast testing

  const testUserId = new mongoose.Types.ObjectId();
  mockUserStore.set(testUserId.toString(), {
    _id: testUserId,
    fitnessGoal: 'Hypertrophy',
    experienceLevel: 'Intermediate',
    trainingDaysPerWeek: 4,
    equipmentPreference: 'commercial_gym',
  });

  const dummyClient = new GoogleGenAI({ apiKey: 'dummy' });
  const ModelsPrototype = Object.getPrototypeOf(dummyClient.models);

  // -------------------------------------------------------------------------
  // TEST 1: Primary Model Success
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Primary Model Success ---');
  let modelsCalled: string[] = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    return {
      text: 'Great job maintaining your bench press volume. Here is your target for next session.',
    };
  };

  const req1: any = {
    user: { _id: testUserId },
    body: { message: 'How is my bench press progressing?' },
  };
  const res1 = createMockResponse();
  await chatWithCoach(req1, res1);

  assertEqual(res1.statusCode, 200, 'Primary model success returns HTTP 200');
  assertEqual(res1.body?.error, null, 'Error is null on success');
  assertEqual(modelsCalled.length, 1, 'Only primary model was called (no fallback attempt)');
  assertEqual(modelsCalled[0], DEFAULT_PRIMARY_MODEL, `Primary model is ${DEFAULT_PRIMARY_MODEL}`);

  // -------------------------------------------------------------------------
  // TEST 2: Primary 503 Followed by Successful Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Primary 503 Followed by Successful Fallback ---');
  modelsCalled = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    if (params.model === DEFAULT_PRIMARY_MODEL) {
      const err: any = new Error('503 Service Unavailable: This model is experiencing high demand');
      err.status = 503;
      throw err;
    }
    return {
      text: 'Fallback response: Your chest volume has been consistent over the last 30 days.',
    };
  };

  const req2: any = {
    user: { _id: testUserId },
    body: { message: 'Can you summarize my chest volume?' },
  };
  const res2 = createMockResponse();
  await chatWithCoach(req2, res2);

  assertEqual(res2.statusCode, 200, 'Primary 503 recovers via fallback with HTTP 200');
  assertEqual(modelsCalled.length, 2, 'Exactly 2 models called: primary then fallback');
  assertEqual(modelsCalled[0], DEFAULT_PRIMARY_MODEL, 'First attempted primary model');
  assertEqual(modelsCalled[1], DEFAULT_FALLBACK_MODEL, 'Second attempted fallback model');
  assert(res2.body?.message.includes('Fallback response'), 'Received text from fallback model');

  // -------------------------------------------------------------------------
  // TEST 3: Primary 429 with Appropriate Fallback Behavior
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Primary 429 with Fallback Behavior ---');
  modelsCalled = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    if (params.model === DEFAULT_PRIMARY_MODEL) {
      const err: any = new Error('RESOURCE_EXHAUSTED: Rate limit exceeded for primary model');
      err.status = 429;
      throw err;
    }
    return {
      text: 'Recovered via fallback after primary model 429 rate limit.',
    };
  };

  const req3: any = {
    user: { _id: testUserId },
    body: { message: 'Am I lifting heavy enough?' },
  };
  const res3 = createMockResponse();
  await chatWithCoach(req3, res3);

  assertEqual(res3.statusCode, 200, 'Primary 429 recovers via fallback model');
  assertEqual(modelsCalled.length, 2, 'Fell back to second model');
  assert(res3.body?.message.includes('Recovered via fallback'), 'Content returned from fallback');

  // -------------------------------------------------------------------------
  // TEST 4: Exhausted Quota Without Endless Retries
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Exhausted Project Quota Without Endless Retries ---');
  modelsCalled = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    const err: any = new Error(
      "RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'Queries' and limit 'Queries per day'. Check your plan and billing."
    );
    err.status = 429;
    throw err;
  };

  const req4: any = {
    user: { _id: testUserId },
    body: { message: 'How do I squat deeper?' },
  };
  const res4 = createMockResponse();
  await chatWithCoach(req4, res4);

  assertEqual(res4.statusCode, 429, 'Exhausted quota returns HTTP 429');
  assertEqual(res4.body?.error, 'PROVIDER_QUOTA_EXCEEDED', 'Error code is PROVIDER_QUOTA_EXCEEDED');
  assertEqual(modelsCalled.length, 1, 'Loop aborted immediately without trying fallback (non-retryable)');

  // -------------------------------------------------------------------------
  // TEST 5: Primary Timeout Followed by Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Primary Timeout Followed by Fallback ---');
  modelsCalled = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    if (params.model === DEFAULT_PRIMARY_MODEL) {
      // Simulate hanging request that triggers timeout
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { text: 'Late response' };
    }
    return {
      text: 'Fallback succeeded after primary timed out.',
    };
  };

  const req5: any = {
    user: { _id: testUserId },
    body: { message: 'What is my current split?' },
  };
  const res5 = createMockResponse();
  await chatWithCoach(req5, res5);

  assertEqual(res5.statusCode, 200, 'Primary timeout recovers via fallback model');
  assertEqual(modelsCalled.length, 2, 'Primary timed out and fallback was called');
  assert(res5.body?.message.includes('Fallback succeeded'), 'Response received from fallback');

  // -------------------------------------------------------------------------
  // TEST 6: Fallback Timeout
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Fallback Timeout ---');
  modelsCalled = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    // Both models hang past the 1000ms timeout
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { text: 'Too late' };
  };

  const req6: any = {
    user: { _id: testUserId },
    body: { message: 'Give me a warm-up routine.' },
  };
  const res6 = createMockResponse();
  await chatWithCoach(req6, res6);

  assertEqual(res6.statusCode, 504, 'Both timeouts return HTTP 504 Gateway Timeout');
  assertEqual(res6.body?.error, 'PROVIDER_TIMEOUT', 'Error code is PROVIDER_TIMEOUT');
  assertEqual(modelsCalled.length, 2, 'Bounded at exactly 2 attempts');
  assert(res6.body?.message.includes('timed out'), 'User message indicates timeout');

  // -------------------------------------------------------------------------
  // TEST 7: Invalid API Key with No Retry
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Invalid API Key with No Retry ---');
  modelsCalled = [];

  ModelsPrototype.generateContentInternal = async (params: any) => {
    modelsCalled.push(params.model);
    const err: any = new Error('API key not valid. Please pass a valid API key.');
    err.status = 400;
    throw err;
  };

  const req7: any = {
    user: { _id: testUserId },
    body: { message: 'Hello Coach!' },
  };
  const res7 = createMockResponse();
  await chatWithCoach(req7, res7);

  assertEqual(res7.statusCode, 502, 'Auth error returns HTTP 502');
  assertEqual(res7.body?.error, 'PROVIDER_AUTH_ERROR', 'Error code is PROVIDER_AUTH_ERROR');
  assertEqual(modelsCalled.length, 1, 'Does not retry when API key is invalid (aborts immediately)');

  // -------------------------------------------------------------------------
  // TEST 8: Burst Limit (Max 3 req / 10s per user)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Burst Limit (Max 3 req / 10s) ---');
  const burstUserId = 'burst_user_test_123';
  resetCoachRateLimiters(burstUserId);

  const mockBurstReq: any = {
    user: { _id: burstUserId },
    ip: '127.0.0.1',
  };

  let burstBlocked = false;
  let blockedRes: any = null;

  for (let i = 1; i <= 4; i++) {
    const res = createMockResponse();
    let nextCalled = false;
    await new Promise<void>((resolve) => {
      res.onEnd = () => resolve();
      coachBurstLimiter(mockBurstReq, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    if (i <= 3) {
      assert(nextCalled, `Burst request #${i} allowed`);
    } else {
      burstBlocked = res.statusCode === 429;
      blockedRes = res;
    }
  }

  assert(burstBlocked, '4th request within 10s was blocked by coachBurstLimiter');
  assertEqual(blockedRes.statusCode, 429, 'Burst limit returns HTTP 429');
  assertEqual(blockedRes.body?.error, 'RATE_LIMITED', 'Burst limit error is RATE_LIMITED');
  assertEqual(blockedRes.headers['retry-after'], '10', 'Retry-After header is 10 seconds');

  // -------------------------------------------------------------------------
  // TEST 9: Daily Per-User Limit (Max 30 req / 24h)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Daily Per-User Limit (Max 30 req / 24h) ---');
  const dailyUserId = 'daily_user_test_456';
  resetCoachRateLimiters(dailyUserId);

  const mockDailyReq: any = {
    user: { _id: dailyUserId },
    ip: '127.0.0.1',
  };

  let dailyBlocked = false;
  let dailyBlockedRes: any = null;

  for (let i = 1; i <= 31; i++) {
    const res = createMockResponse();
    let nextCalled = false;
    await new Promise<void>((resolve) => {
      res.onEnd = () => resolve();
      coachDailyLimiter(mockDailyReq, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    if (i <= 30) {
      if (i === 1 || i === 15 || i === 30) {
        assert(nextCalled, `Daily request #${i} allowed`);
      }
    } else {
      dailyBlocked = res.statusCode === 429;
      dailyBlockedRes = res;
    }
  }

  assert(dailyBlocked, '31st request was blocked by coachDailyLimiter');
  assertEqual(dailyBlockedRes.statusCode, 429, 'Daily limit returns HTTP 429');
  assertEqual(dailyBlockedRes.body?.error, 'DAILY_LIMIT_REACHED', 'Daily limit error is DAILY_LIMIT_REACHED');
  assertEqual(dailyBlockedRes.headers['retry-after'], '3600', 'Retry-After header set for daily reset');

  // -------------------------------------------------------------------------
  // TEST 10: Two Different Users Maintain Independent Counters
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Multi-User Rate Limit Isolation ---');
  const userA = 'user_isolated_A';
  const userB = 'user_isolated_B';
  resetCoachRateLimiters(userA);
  resetCoachRateLimiters(userB);

  // Exhaust User A's burst limit
  for (let i = 0; i < 3; i++) {
    const res = createMockResponse();
    await new Promise<void>((resolve) => {
      res.onEnd = () => resolve();
      coachBurstLimiter({ user: { _id: userA }, ip: '192.168.1.100' } as any, res, () => resolve());
    });
  }

  // 4th request from User A must be blocked
  const resA = createMockResponse();
  let nextA = false;
  await new Promise<void>((resolve) => {
    resA.onEnd = () => resolve();
    coachBurstLimiter({ user: { _id: userA }, ip: '192.168.1.100' } as any, resA, () => {
      nextA = true;
      resolve();
    });
  });
  assert(!nextA && resA.statusCode === 429, 'User A is blocked after 3 requests');

  // User B sharing the EXACT SAME IP must NOT be blocked
  const resB = createMockResponse();
  let nextB = false;
  await new Promise<void>((resolve) => {
    resB.onEnd = () => resolve();
    coachBurstLimiter({ user: { _id: userB }, ip: '192.168.1.100' } as any, resB, () => {
      nextB = true;
      resolve();
    });
  });
  assert(nextB, 'User B request is allowed despite sharing the exact same IP address with User A');
  console.log('🔒 Verified: Multi-user rate limiting is strictly isolated by authenticated user ID.');

  // -------------------------------------------------------------------------
  // TEST 11: Multiple Requests by the Same User Track Correctly
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: Multiple Requests Track Correctly ---');
  const userTrack = 'user_tracking_test';
  resetCoachRateLimiters(userTrack);

  const resT1 = createMockResponse();
  let pass1 = false;
  await new Promise<void>((resolve) => {
    resT1.onEnd = () => resolve();
    coachBurstLimiter({ user: { _id: userTrack } } as any, resT1, () => {
      pass1 = true;
      resolve();
    });
  });
  assert(pass1, 'Request 1 recorded and allowed');

  const resT2 = createMockResponse();
  let pass2 = false;
  await new Promise<void>((resolve) => {
    resT2.onEnd = () => resolve();
    coachBurstLimiter({ user: { _id: userTrack } } as any, resT2, () => {
      pass2 = true;
      resolve();
    });
  });
  assert(pass2, 'Request 2 recorded and allowed');

  // -------------------------------------------------------------------------
  // TEST 12: Existing 20-per-15-Minute Window Limit
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 12: Existing 20-per-15-Minute Window Limit ---');
  const user15m = 'user_15m_test';
  resetCoachRateLimiters(user15m);

  let windowBlocked = false;
  let windowBlockedRes: any = null;

  for (let i = 1; i <= 21; i++) {
    const res = createMockResponse();
    let nextCalled = false;
    await new Promise<void>((resolve) => {
      res.onEnd = () => resolve();
      coachRateLimiter({ user: { _id: user15m } } as any, res, () => {
        nextCalled = true;
        resolve();
      });
    });

    if (i <= 20) {
      if (i === 1 || i === 10 || i === 20) {
        assert(nextCalled, `15-minute window request #${i} allowed`);
      }
    } else {
      windowBlocked = res.statusCode === 429;
      windowBlockedRes = res;
    }
  }

  assert(windowBlocked, '21st request was blocked by 15-minute limiter');
  assertEqual(windowBlockedRes.statusCode, 429, 'Returns HTTP 429 on window breach');
  assertEqual(windowBlockedRes.body?.error, 'RATE_LIMITED', 'Error is RATE_LIMITED');

  // -------------------------------------------------------------------------
  // TEST 13: Missing API Key Safe Handling
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 13: Missing API Key Safe Handling ---');
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const noKeyReq: any = {
    user: { _id: testUserId },
    body: { message: 'How do I squat?' },
  };
  const noKeyRes = createMockResponse();
  await chatWithCoach(noKeyReq, noKeyRes);

  assertEqual(noKeyRes.statusCode, 503, 'Missing API key returns HTTP 503');
  assertEqual(noKeyRes.body?.error, 'API_KEY_NOT_CONFIGURED', 'Error code is API_KEY_NOT_CONFIGURED');
  process.env.GEMINI_API_KEY = savedKey; // Restore

  // -------------------------------------------------------------------------
  // TEST 14: Existing Workout Context & Privacy Protections
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 14: Existing Workout Context & Privacy Protections ---');
  const privUserA = new mongoose.Types.ObjectId();
  const privUserB = new mongoose.Types.ObjectId();

  mockUserStore.set(privUserA.toString(), {
    _id: privUserA,
    email: 'secret_a@gymtrackie.com',
    passwordHash: '$2b$10$supersecretpasshashA',
    googleId: 'google_oauth_id_A_secret',
    fitnessGoal: 'Strength',
  });

  mockWorkoutStore.push({
    _id: new mongoose.Types.ObjectId(),
    userId: privUserA,
    workoutName: 'Heavy Chest Day',
    date: new Date('2026-11-05'),
    status: 'completed',
    exercises: [
      {
        exerciseName: 'Barbell Bench Press',
        sets: [{ setNumber: 1, weight: 100, reps: 5, completed: true }],
      },
    ],
  });

  ModelsPrototype.generateContentInternal = async (params: any) => {
    const promptStr = JSON.stringify(params.contents);
    assert(!promptStr.includes('secret_a@gymtrackie.com'), 'Prompt strictly excludes email address');
    assert(!promptStr.includes('supersecretpasshashA'), 'Prompt strictly excludes passwordHash');
    assert(!promptStr.includes('google_oauth_id_A_secret'), 'Prompt strictly excludes googleId');
    assert(promptStr.includes('Heavy Chest Day'), 'Prompt includes User A workout');
    assert(promptStr.includes('Barbell Bench Press'), 'Prompt includes User A exercise');

    return {
      text: 'Verified: Privacy protections and multi-tenant scoping preserved.',
    };
  };

  const privReq: any = {
    user: { _id: privUserA },
    body: { message: 'What was my latest bench weight?' },
  };
  const privRes = createMockResponse();
  await chatWithCoach(privReq, privRes);

  assertEqual(privRes.statusCode, 200, 'Grounded privacy-safe chat returns HTTP 200');

  console.log('\n=============================================================');
  console.log('🎉 ALL 14 RELIABILITY & PROTECTION SUITES PASSED SUCCESSFULLY!');
  console.log('=============================================================\n');
}

runReliabilityTestSuite().catch((err) => {
  console.error('Fatal error during reliability test suite:', err);
  process.exit(1);
});
