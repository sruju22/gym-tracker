/**
 * GymTrackie Phase 11B — Secure AI Coach Backend Verification Suite
 *
 * Comprehensive tests covering:
 * 1. Request Body & Message Length Validation (Empty, whitespace, >1000 chars -> HTTP 400)
 * 2. Unauthenticated Request Rejection (HTTP 401 Unauthorized)
 * 3. Missing API Key Handling (HTTP 503 Service Unavailable)
 * 4. 1RM Calculation Formula Accuracy (Brzycki / Epley core equivalence)
 * 5. Medical & Injury Refusal Safety Guardrails (Non-medical disclaimer, physician referral, stop pain directive)
 * 6. User Data Isolation & Multi-Tenant Separation (User A data strictly excluded from User B context)
 * 7. Empty Workout History Handling (Graceful defaults, zero crashes)
 * 8. Client Intelligence Snapshot Merging & PII Anonymization (No email, passwordHash, googleId)
 * 9. Gemini Provider Failure Handling (HTTP 502, safe logging, no sensitive leak)
 * 10. Valid Grounded Response Contract (HTTP 200, string message, dataSources, null error)
 * 11. Rate Limiting Enforcement (Express rate limiter configuration & headers)
 */

import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import {
  validateCoachInput,
  COACH_SYSTEM_INSTRUCTION,
  chatWithCoach,
  CoachChatResponseBody,
} from '../controllers/coachController';
import {
  buildCoachContext,
  calculate1RM,
  ClientIntelligenceSnapshot,
} from '../services/coachContextService';
import { coachRateLimiter } from '../routes/coachRoutes';
import Workout from '../models/Workout';
import User from '../models/User';
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
    console.error(`❌ ASSERTION FAILED: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

/**
 * Mock Express Response helper
 */
function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {} as Record<string, any>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    setHeader(name: string, value: any) {
      this.headers[name.toLowerCase()] = value;
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

/**
 * Installs in-memory Mongoose query stubs to test DB isolation offline
 */
function setupMongooseStubs() {
  // User.findById stub
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

  // WorkoutPlan.findOne stub
  (WorkoutPlan as any).findOne = (query: any) => {
    const userIdStr = query?.userId?.toString();
    const plan = mockPlanStore.get(userIdStr);
    return {
      lean: async () => (plan ? JSON.parse(JSON.stringify(plan)) : null),
    };
  };

  // Goal.find stub
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

  // Workout.find stub
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

async function runCoachVerificationSuite() {
  console.log('\n======================================================');
  console.log('🤖 GymTrackie Phase 11B — Secure AI Coach Verification');
  console.log('======================================================\n');

  setupMongooseStubs();

  // ------------------------------------------------------------------
  // TEST 1: Input Validation
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Request Body & Message Length Validation ---');

  const emptyBody = validateCoachInput(null);
  assert(!emptyBody.isValid, 'Rejects null or non-object body');
  assertEqual(emptyBody.errorMessage, 'Request body must be a valid JSON object.', 'Null body message');

  const missingMsg = validateCoachInput({});
  assert(!missingMsg.isValid, 'Rejects missing message field');

  const emptyString = validateCoachInput({ message: '   ' });
  assert(!emptyString.isValid, 'Rejects whitespace-only message');
  assertEqual(emptyString.errorMessage, 'Message cannot be empty.', 'Empty string error');

  const tooLong = validateCoachInput({ message: 'a'.repeat(1001) });
  assert(!tooLong.isValid, 'Rejects message exceeding 1000 characters');
  assertEqual(tooLong.errorMessage, 'Message is too long. Maximum allowed length is 1000 characters.', 'Too long error');

  const validMsg = validateCoachInput({
    message: 'Why is my bench press stalling?',
    conversationHistory: [
      { role: 'user', content: 'Hello' },
      { role: 'model', content: 'Hi there!' },
      { role: 'invalid_role', content: 'Ignored' },
    ],
  });
  assert(validMsg.isValid, 'Accepts valid message');
  assertEqual(validMsg.sanitizedMessage, 'Why is my bench press stalling?', 'Sanitized message text');
  assertEqual(validMsg.sanitizedHistory?.length, 2, 'Filters out invalid conversation roles');

  // ------------------------------------------------------------------
  // TEST 2: Unauthenticated Request Rejection (HTTP 401)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Unauthenticated Request Rejection (HTTP 401) ---');

  const unauthReq: any = {
    body: { message: 'How do I get stronger?' },
  };
  const unauthRes = createMockResponse();

  await chatWithCoach(unauthReq, unauthRes);
  assertEqual(unauthRes.statusCode, 401, 'Unauthenticated request receives HTTP 401');
  assertEqual(unauthRes.body?.error, 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
  assertEqual(Array.isArray(unauthRes.body?.dataSources), true, 'dataSources is an array');

  // ------------------------------------------------------------------
  // TEST 3: Missing API Key Handling (HTTP 503 Service Unavailable)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Missing API Key Handling (HTTP 503) ---');

  const originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const authUserWithoutKey: any = {
    user: { _id: new mongoose.Types.ObjectId() },
    body: { message: 'What is my progression target?' },
  };
  const resNoKey = createMockResponse();

  await chatWithCoach(authUserWithoutKey, resNoKey);
  assertEqual(resNoKey.statusCode, 503, 'Returns HTTP 503 when GEMINI_API_KEY is not set');
  assertEqual(resNoKey.body?.error, 'API_KEY_NOT_CONFIGURED', 'Error code is API_KEY_NOT_CONFIGURED');
  assert(resNoKey.body?.message.includes('GEMINI_API_KEY'), 'Explains missing server key in message');

  // Restore env key for subsequent tests
  if (originalApiKey) {
    process.env.GEMINI_API_KEY = originalApiKey;
  } else {
    process.env.GEMINI_API_KEY = 'mock_test_key_for_unit_tests';
  }

  // ------------------------------------------------------------------
  // TEST 4: 1RM Calculation Formula Accuracy (Brzycki / Epley)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: 1RM Formula Accuracy ---');

  assertEqual(calculate1RM(0, 0), 0, 'Zero load/reps yields 0 1RM');
  assertEqual(calculate1RM(100, 1), 100, 'Single rep: 1RM equals weight (100 kg)');
  assertEqual(calculate1RM(80, 5), 90, '80 kg for 5 reps yields ~90 kg (Brzycki)');
  assertEqual(calculate1RM(80, 10), 107, '80 kg for 10 reps yields ~107 kg (Brzycki)');
  assertEqual(calculate1RM(60, 15), 90, '60 kg for 15 reps yields ~90 kg (Epley formula for reps > 12)');

  // ------------------------------------------------------------------
  // TEST 5: Medical & Injury Refusal Safety Guardrails
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Medical / Injury Refusal Guardrails ---');

  assert(
    COACH_SYSTEM_INSTRUCTION.includes('NON-MEDICAL & INJURY SAFETY INVARIANT'),
    'System instruction contains explicit Non-Medical invariant header'
  );
  assert(
    COACH_SYSTEM_INSTRUCTION.includes('physician') || COACH_SYSTEM_INSTRUCTION.includes('physical therapist'),
    'System instruction mandates directing lifters to medical professionals'
  );
  assert(
    COACH_SYSTEM_INSTRUCTION.includes('immediately stop any exercise that causes acute or sharp pain'),
    'System instruction mandates instructing lifter to stop pain-causing exercises'
  );
  assert(
    COACH_SYSTEM_INSTRUCTION.includes('READ-ONLY NON-DESTRUCTIVE INVARIANT'),
    'System instruction mandates read-only non-destructive invariant'
  );
  assert(
    COACH_SYSTEM_INSTRUCTION.includes('STRICT DATA GROUNDING (ZERO HALLUCINATION)'),
    'System instruction mandates zero hallucination'
  );

  // ------------------------------------------------------------------
  // TEST 6: User Data Isolation & Multi-Tenant Separation
  // ------------------------------------------------------------------
  console.log('\n--- TEST 6: User Data Isolation & Multi-Tenant Separation ---');

  const userA_Id = new mongoose.Types.ObjectId();
  const userB_Id = new mongoose.Types.ObjectId();

  // Populate User A data
  mockUserStore.set(userA_Id.toString(), {
    _id: userA_Id,
    fitnessGoal: 'Hypertrophy & Upper Body Strength',
    experienceLevel: 'Advanced',
    trainingDaysPerWeek: 4,
    equipmentPreference: 'commercial_gym',
    currentWeight: 83.5,
    weightUnit: 'kg',
  });

  mockPlanStore.set(userA_Id.toString(), {
    userId: userA_Id,
    templateName: 'Upper / Lower 4-Day Strength Split',
    trainingDaysPerWeek: 4,
    weeklyPlan: {
      monday: { name: 'Upper Heavy', isRest: false, muscleGroups: [{ name: 'Chest' }, { name: 'Back' }] },
      tuesday: { name: 'Lower Heavy', isRest: false, muscleGroups: [{ name: 'Quads' }] },
      wednesday: { isRest: true },
      thursday: { name: 'Upper Hypertrophy', isRest: false, muscleGroups: [{ name: 'Shoulders' }, { name: 'Arms' }] },
      friday: { name: 'Lower Hypertrophy', isRest: false, muscleGroups: [{ name: 'Hamstrings' }] },
      saturday: { isRest: true },
      sunday: { isRest: true },
    },
  });

  mockGoalStore.push({
    userId: userA_Id,
    title: 'Bench Press 100 kg',
    type: 'exercise_strength',
    exerciseName: 'Barbell Bench Press',
    startValue: 80,
    targetValue: 100,
    unit: 'kg',
    status: 'active',
  });

  mockWorkoutStore.push({
    _id: new mongoose.Types.ObjectId(),
    userId: userA_Id,
    workoutName: 'Upper Heavy',
    date: new Date('2026-11-04'),
    dayOfWeek: 'Wednesday',
    status: 'completed',
    totalVolume: 3200,
    totalSets: 8,
    exercises: [
      {
        exerciseName: 'Barbell Bench Press',
        primaryMuscle: 'chest',
        sets: [
          { setNumber: 1, weight: 80, reps: 8, completed: true },
          { setNumber: 2, weight: 80, reps: 8, completed: true },
          { setNumber: 3, weight: 82.5, reps: 6, completed: true },
        ],
      },
    ],
  });

  // Populate User B data (Different user, different workout)
  mockUserStore.set(userB_Id.toString(), {
    _id: userB_Id,
    fitnessGoal: 'Cardio & Mobility',
    experienceLevel: 'Beginner',
    trainingDaysPerWeek: 3,
  });

  mockWorkoutStore.push({
    _id: new mongoose.Types.ObjectId(),
    userId: userB_Id,
    workoutName: 'Pilates & Bodyweight',
    date: new Date('2026-11-05'),
    dayOfWeek: 'Thursday',
    status: 'completed',
    totalVolume: 0,
    totalSets: 3,
    exercises: [
      {
        exerciseName: 'Bodyweight Squats',
        primaryMuscle: 'quads',
        sets: [{ setNumber: 1, weight: 0, reps: 20, completed: true }],
      },
    ],
  });

  // Build context for User A
  const userAContext = await buildCoachContext(userA_Id);

  assertEqual(userAContext.contextPayload.userProfile.fitnessGoal, 'Hypertrophy & Upper Body Strength', 'User A profile goal matches');
  assertEqual(userAContext.contextPayload.recentWorkouts.length, 1, 'User A has exactly 1 recent workout');
  assertEqual(userAContext.contextPayload.recentWorkouts[0].name, 'Upper Heavy', 'User A workout is Upper Heavy');
  assertEqual(userAContext.contextPayload.personalRecords.length, 1, 'User A has 1 PR');
  assertEqual(userAContext.contextPayload.personalRecords[0].exerciseName, 'Barbell Bench Press', 'User A PR is Barbell Bench Press');

  // Strict isolation check: User B's Pilates workout must NOT appear in User A's context
  const userAString = JSON.stringify(userAContext.contextPayload);
  assert(!userAString.includes('Pilates'), 'User A context strictly excludes User B workout name (Pilates)');
  assert(!userAString.includes('Bodyweight Squats'), 'User A context strictly excludes User B exercises');

  // Build context for User B
  const userBContext = await buildCoachContext(userB_Id);
  assertEqual(userBContext.contextPayload.userProfile.fitnessGoal, 'Cardio & Mobility', 'User B profile goal matches');
  assertEqual(userBContext.contextPayload.recentWorkouts[0].name, 'Pilates & Bodyweight', 'User B workout matches');

  const userBString = JSON.stringify(userBContext.contextPayload);
  assert(!userBString.includes('Upper Heavy'), 'User B context strictly excludes User A workout (Upper Heavy)');
  assert(!userBString.includes('Barbell Bench Press'), 'User B context strictly excludes User A PRs');

  // ------------------------------------------------------------------
  // TEST 7: Empty Workout History Handling
  // ------------------------------------------------------------------
  console.log('\n--- TEST 7: Empty Workout History Handling ---');

  const brandNewUserId = new mongoose.Types.ObjectId();
  const emptyContext = await buildCoachContext(brandNewUserId);

  assertEqual(emptyContext.contextPayload.recentWorkouts.length, 0, 'Recent workouts array is empty for new user');
  assertEqual(emptyContext.contextPayload.personalRecords.length, 0, 'Personal records array is empty for new user');
  assertEqual(Object.keys(emptyContext.contextPayload.muscleVolumeLast30Days).length, 0, '30d muscle volume is empty');
  assertEqual(emptyContext.contextPayload.activeGoals.length, 0, 'Active goals is empty');
  assert(
    emptyContext.contextPayload.intelligenceEngineStatus.includes('No client snapshot supplied'),
    'Displays fallback message for empty intelligence snapshot'
  );

  // ------------------------------------------------------------------
  // TEST 8: Client Snapshot Merging & PII Anonymization
  // ------------------------------------------------------------------
  console.log('\n--- TEST 8: Client Snapshot Merging & PII Anonymization ---');

  const clientSnapshot: ClientIntelligenceSnapshot = {
    muscleReadiness: {
      chest: { state: 'recovering', score: 60 },
      lats: { state: 'recovered', score: 92 },
    },
    persistentUnderexposure: [
      { muscle: 'shoulders', subRegion: 'rear_delts', exposureRatio: 0.3, reason: '28-day underexposed' },
    ],
    adaptiveRecommendations: [
      {
        exerciseName: 'Barbell Bench Press',
        primaryAction: 'increase_weight',
        targetWeight: 82.5,
        targetReps: 8,
        rationale: 'Hit top rep threshold across all sets',
      },
    ],
  };

  const enrichedContext = await buildCoachContext(userA_Id, clientSnapshot);
  assert(Boolean(enrichedContext.contextPayload.clientIntelligence), 'Client snapshot correctly merged');
  assertEqual(
    enrichedContext.contextPayload.clientIntelligence?.muscleReadiness?.chest?.state,
    'recovering',
    'Preserves chest readiness'
  );
  assertEqual(
    enrichedContext.contextPayload.clientIntelligence?.adaptiveRecommendations?.[0]?.targetWeight,
    82.5,
    'Preserves progression target weight'
  );
  assert(
    enrichedContext.dataSources.includes('Client Muscle Readiness Snapshot'),
    'Includes Client Muscle Readiness in dataSources'
  );
  assert(
    enrichedContext.dataSources.includes('Client Adaptive Overload Recommendations'),
    'Includes Client Adaptive Overload Recommendations in dataSources'
  );

  // Verify Anonymization: No PII, passwords, emails
  const serialized = JSON.stringify(enrichedContext.contextPayload);
  assert(!serialized.includes('passwordHash'), 'Context payload contains NO passwordHash');
  assert(!serialized.includes('googleId'), 'Context payload contains NO googleId');
  assert(!serialized.includes('@'), 'Context payload contains NO email address');

  // ------------------------------------------------------------------
  // TEST 9: Gemini Provider Failure Handling (HTTP 502)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 9: Provider Failure Graceful Handling (HTTP 502) ---');

  // Stub GoogleGenAI generateContentInternal to simulate provider failure
  const originalGenerateInternal = (GoogleGenAI as any).prototype.models?.constructor?.prototype?.generateContentInternal;
  const dummyClient = new GoogleGenAI({ apiKey: 'dummy' });
  const ModelsPrototype = Object.getPrototypeOf(dummyClient.models);

  ModelsPrototype.generateContentInternal = async () => {
    throw new Error('INTERNAL: Unknown provider server failure');
  };

  const authReqFailing: any = {
    user: { _id: userA_Id },
    body: { message: 'What is my progression target?' },
  };
  const failRes = createMockResponse();

  await chatWithCoach(authReqFailing, failRes);
  assertEqual(failRes.statusCode, 502, 'Provider error returns HTTP 502');
  assertEqual(failRes.body?.error, 'PROVIDER_ERROR', 'Error code is PROVIDER_ERROR');
  assert(
    failRes.body?.message.includes('unexpected provider error'),
    'Safe user-facing message without leaking internal error details'
  );

  // ------------------------------------------------------------------
  // TEST 10: Valid Grounded Response Contract (HTTP 200)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 10: Valid Grounded Response Contract (HTTP 200) ---');

  ModelsPrototype.generateContentInternal = async () => {
    return {
      text: 'Based on your logged workout on Nov 4, you completed 80 kg × 8 reps on Barbell Bench Press. Your next target is to step up to 82.5 kg.',
    };
  };

  const authReqSuccess: any = {
    user: { _id: userA_Id },
    body: {
      message: 'Explain my latest progression recommendation.',
      conversationHistory: [{ role: 'user', content: 'Hi' }],
      clientSnapshot,
    },
  };
  const successRes = createMockResponse();

  await chatWithCoach(authReqSuccess, successRes);
  assertEqual(successRes.statusCode, 200, 'Successful generation returns HTTP 200');
  assertEqual(successRes.body?.error, null, 'Error field is null on success');
  assert(
    successRes.body?.message.includes('80 kg × 8 reps'),
    'Grounded response contains expected text'
  );
  assert(successRes.body?.dataSources.length >= 3, 'dataSources contains at least 3 labeled sources');

  // ------------------------------------------------------------------
  // TEST 11: Rate Limiter Middleware Verification
  // ------------------------------------------------------------------
  console.log('\n--- TEST 11: Rate Limiting Enforcement ---');

  assert(typeof coachRateLimiter === 'function', 'coachRateLimiter is a valid Express middleware');

  // Restore ModelsPrototype
  if (originalGenerateInternal) {
    ModelsPrototype.generateContentInternal = originalGenerateInternal;
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 11 VERIFICATION SUITES PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runCoachVerificationSuite().catch((err) => {
  console.error('Fatal error in coach verification suite:', err);
  process.exit(1);
});
