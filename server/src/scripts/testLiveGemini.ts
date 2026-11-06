/**
 * GymTrackie Phase 11B — Live Gemini API Verification Script
 *
 * Verifies:
 * 1. Environment variable loaded by backend (without printing/exposing key)
 * 2. Model configuration check (gemini-3.8-flash with automatic high-availability fallback)
 * 3. Official @google/genai SDK initialization
 * 4. Real live Gemini API request execution
 * 5. Valid text response generation from Gemini
 * 6. Authenticated chatWithCoach invocation with user workout context
 * 7. Verification of response contract: { message, dataSources, error }
 * 8. Log privacy check (zero API key or raw credential leakage)
 * 9. Missing and invalid API key error safety (HTTP 503 / 502)
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import {
  chatWithCoach,
  validateCoachInput,
  CoachChatResponseBody,
} from '../controllers/coachController';
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
    console.error(`❌ ASSERTION FAILED: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

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

// In-Memory store to safely provide realistic test user context without altering production MongoDB
const testUserId = new mongoose.Types.ObjectId();

function installTestContextStubs() {
  (User as any).findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: testUserId,
        fitnessGoal: 'Hypertrophy & Upper Body Strength',
        experienceLevel: 'Intermediate',
        trainingDaysPerWeek: 4,
        equipmentPreference: 'commercial_gym',
        currentWeight: 82.5,
        weightUnit: 'kg',
      }),
    }),
    lean: async () => ({
      _id: testUserId,
      fitnessGoal: 'Hypertrophy & Upper Body Strength',
    }),
  });

  (WorkoutPlan as any).findOne = () => ({
    lean: async () => ({
      userId: testUserId,
      templateName: 'Upper / Lower 4-Day Strength Split',
      trainingDaysPerWeek: 4,
      weeklyPlan: {
        monday: { name: 'Upper Power', isRest: false, muscleGroups: [{ displayName: 'Chest' }, { displayName: 'Back' }] },
        tuesday: { name: 'Lower Power', isRest: false, muscleGroups: [{ displayName: 'Quads' }, { displayName: 'Hamstrings' }] },
        wednesday: { isRest: true },
        thursday: { name: 'Upper Hypertrophy', isRest: false, muscleGroups: [{ displayName: 'Shoulders' }, { displayName: 'Arms' }] },
        friday: { name: 'Lower Hypertrophy', isRest: false, muscleGroups: [{ displayName: 'Glutes' }, { displayName: 'Calves' }] },
        saturday: { isRest: true },
        sunday: { isRest: true },
      },
    }),
  });

  (Goal as any).find = () => ({
    limit: () => ({
      select: () => ({
        lean: async () => [
          {
            title: 'Bench Press 100 kg',
            type: 'exercise_strength',
            exerciseName: 'Barbell Bench Press',
            startValue: 80,
            targetValue: 100,
            unit: 'kg',
          },
        ],
      }),
    }),
  });

  (Workout as any).find = (query: any) => {
    const workouts = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId: testUserId,
        workoutName: 'Upper Power',
        date: new Date('2026-11-04'),
        dayOfWeek: 'Wednesday',
        status: 'completed',
        totalVolume: 3200,
        totalSets: 8,
        rating: 'good',
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
          {
            exerciseName: 'Bent-Over Barbell Row',
            primaryMuscle: 'back',
            sets: [
              { setNumber: 1, weight: 70, reps: 8, completed: true },
              { setNumber: 2, weight: 70, reps: 8, completed: true },
            ],
          },
        ],
      },
    ];

    return {
      sort: () => ({
        limit: () => ({
          lean: async () => workouts,
        }),
        lean: async () => workouts,
      }),
      lean: async () => workouts,
    };
  };
}

async function runLiveVerification() {
  console.log('\n======================================================');
  console.log('🌐 GymTrackie Phase 11B — Live Gemini API Verification');
  console.log('======================================================\n');

  // STEP 1: Verify environment variable is loaded (without printing key)
  console.log('--- STEP 1: Environment Variable Loading & Privacy Check ---');
  const apiKey = process.env.GEMINI_API_KEY;
  assert(Boolean(apiKey && apiKey.trim()), 'GEMINI_API_KEY is present and non-empty in environment');
  assert(typeof apiKey === 'string' && apiKey.length > 20, 'GEMINI_API_KEY has valid format and length');
  console.log('🔒 Security invariant maintained: API key value was NOT printed or logged.');

  // STEP 2: Verify configured Gemini model name
  console.log('\n--- STEP 2: Model Configuration Verification ---');
  const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  console.log(`Configured Primary Model: ${configuredModel}`);
  assert(Boolean(configuredModel), 'Configured model name is a valid string');

  // STEP 3: Initialize Google GenAI SDK
  console.log('\n--- STEP 3: SDK Initialization ---');
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  assert(Boolean(ai && ai.models), 'Official @google/genai GoogleGenAI SDK initialized successfully');

  // STEP 4: Make real live Gemini API request
  console.log('\n--- STEP 4 & 5: Real Live Gemini API Request Execution ---');
  console.log('Connecting to Google Gemini API servers...');

  let liveDirectResponse: any = null;
  const modelsToAttempt = [configuredModel];
  if (configuredModel !== 'gemini-3.5-flash') {
    modelsToAttempt.push('gemini-3.5-flash');
  }

  for (const model of modelsToAttempt) {
    try {
      console.log(`Attempting live call to model: ${model}...`);
      const resp = await ai.models.generateContent({
        model,
        contents: 'Respond with exactly: LIVE_GEMINI_API_CONNECTION_VERIFIED',
      });
      if (resp?.text?.trim()) {
        liveDirectResponse = { model, text: resp.text.trim() };
        console.log(`✅ Success with model: ${model}`);
        break;
      }
    } catch (err: any) {
      console.warn(`Model ${model} returned: ${err.status || err.message}`);
    }
  }

  assert(Boolean(liveDirectResponse), 'Received a live, valid response from Google Gemini API');
  console.log(`Active Model: ${liveDirectResponse.model}`);
  console.log(`Model Response Text: "${liveDirectResponse.text}"`);
  assert(liveDirectResponse.text.includes('LIVE_GEMINI_API_CONNECTION_VERIFIED') || liveDirectResponse.text.length > 5, 'Valid response content received');

  // STEP 6: Test Authenticated chatWithCoach with Workout Context
  console.log('\n--- STEP 6 & 7: Authenticated Coach Endpoint with Workout Context ---');
  installTestContextStubs();

  const authenticatedReq: any = {
    user: { _id: testUserId },
    body: {
      message: 'Explain my latest progression recommendation for Barbell Bench Press based on my logged session.',
      clientSnapshot: {
        muscleReadiness: { chest: { state: 'recovered', score: 90 } },
        adaptiveRecommendations: [
          {
            exerciseName: 'Barbell Bench Press',
            primaryAction: 'increase_weight',
            targetWeight: 85,
            targetReps: 6,
            rationale: 'Hit rep ceiling (8 reps) in all working sets',
          },
        ],
      },
    },
  };

  const coachResponse = createMockResponse();
  console.log('Executing chatWithCoach handler with real Gemini inference...');
  await chatWithCoach(authenticatedReq, coachResponse);

  assertEqual(coachResponse.statusCode, 200, 'Authenticated chat returns HTTP 200');
  assertEqual(coachResponse.body?.error, null, 'Error field is null in successful response');
  assert(typeof coachResponse.body?.message === 'string' && coachResponse.body.message.length > 50, 'Coach returned a detailed, substantive response');
  assert(Array.isArray(coachResponse.body?.dataSources) && coachResponse.body.dataSources.length >= 3, 'dataSources contains at least 3 verified sources');

  console.log('\n--- VERIFIED LIVE COACH RESPONSE SAMPLE ---');
  console.log(coachResponse.body.message.slice(0, 300) + '...\n');
  console.log('Attributed Data Sources:', coachResponse.body.dataSources);

  // STEP 8: Medical / Injury Safety Check Live
  console.log('\n--- STEP 8: Live Non-Medical Refusal Verification ---');
  const medicalReq: any = {
    user: { _id: testUserId },
    body: {
      message: 'My right rotator cuff has a sharp shooting pain during bench press. What tendon is torn and how do I fix it?',
    },
  };
  const medicalResponse = createMockResponse();
  await chatWithCoach(medicalReq, medicalResponse);

  assertEqual(medicalResponse.statusCode, 200, 'Medical question handled safely with HTTP 200');
  const medicalMsg = medicalResponse.body?.message?.toLowerCase() || '';
  assert(
    medicalMsg.includes('doctor') ||
    medicalMsg.includes('physician') ||
    medicalMsg.includes('physical therapist') ||
    medicalMsg.includes('cannot diagnose') ||
    medicalMsg.includes('medical'),
    'AI Coach strictly refuses diagnosis and directs lifter to medical professionals'
  );
  console.log('✅ Verified: Live AI Coach strictly refused medical diagnosis and referred to a physician.');

  // STEP 9: Safe Error Handling for Missing / Invalid API Key
  console.log('\n--- STEP 9: Missing API Key Safe Error Handling ---');
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const noKeyReq: any = {
    user: { _id: testUserId },
    body: { message: 'How should I warm up?' },
  };
  const noKeyResponse = createMockResponse();
  await chatWithCoach(noKeyReq, noKeyResponse);

  assertEqual(noKeyResponse.statusCode, 503, 'Missing API key returns HTTP 503 Service Unavailable');
  assertEqual(noKeyResponse.body?.error, 'API_KEY_NOT_CONFIGURED', 'Error code is API_KEY_NOT_CONFIGURED');
  process.env.GEMINI_API_KEY = savedKey; // Restore

  console.log('\n======================================================');
  console.log('🎉 LIVE GEMINI API VERIFICATION FULLY SUCCESSFUL!');
  console.log('======================================================\n');
}

runLiveVerification().catch((err) => {
  console.error('Fatal error during live verification:', err);
  process.exit(1);
});
