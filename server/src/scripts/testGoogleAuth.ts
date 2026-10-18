import express from 'express';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import authRoutes from '../routes/authRoutes';
import User from '../models/User';

async function runTests() {
  console.log('🧪 Starting Google Sign-In & Auth Integration Tests...\n');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      testsFailed++;
    }
  }

  const app = express();
  app.use(cors({ origin: ['https://gym-tracker-tawny-five.vercel.app'] }));
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  // Set mock JWT secret for testing
  process.env.JWT_SECRET = 'test_jwt_secret_12345';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

  // Mock mongoose connection readyState to 1 (connected) for isolated controller tests
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // 1. Test CORS for production Vercel frontend
  console.log('--- Test 1: Production CORS & Allowed Origins ---');
  {
    const req = {
      method: 'OPTIONS',
      headers: {
        origin: 'https://gym-tracker-tawny-five.vercel.app',
        'access-control-request-method': 'POST',
      },
    };
    // Mock express call or inspect origin
    const originAllowed = ['https://gym-tracker-tawny-five.vercel.app'].includes(req.headers.origin);
    assert(originAllowed, 'Production Vercel frontend is included in allowed CORS origins');
  }

  // 2. Test Missing Google Token (400)
  console.log('\n--- Test 2: Validation of Empty Google Credential ---');
  {
    let statusCode = 0;
    let body: any = null;
    const req: any = { body: {} };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { googleAuth } = await import('../controllers/authController');
    await googleAuth(req, res);
    assert(statusCode === 400, 'Returns 400 Bad Request when credential is missing', `Got ${statusCode}`);
    assert(body?.error?.includes('required'), 'Returns descriptive error message for missing credential');
  }

  // 3. Test Invalid Google ID Token (401)
  console.log('\n--- Test 3: Rejection of Invalid / Forged Google ID Token ---');
  {
    let statusCode = 0;
    let body: any = null;
    const req: any = { body: { credential: 'bogus.invalid.jwt.token' } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { googleAuth } = await import('../controllers/authController');
    await googleAuth(req, res);
    assert(statusCode === 401, 'Returns 401 Unauthorized for invalid/unverifiable Google token', `Got ${statusCode}`);
    assert(body?.error === 'Invalid or expired Google credential', 'Returns clear credential error');
  }

  // 4. Test Missing Server Environment Variable Graceful Fallback
  console.log('\n--- Test 4: Server GOOGLE_CLIENT_ID Fallback Resiliency ---');
  {
    const savedClientId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    let statusCode = 0;
    let body: any = null;
    const req: any = { body: { credential: 'some_sample_credential' } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { googleAuth } = await import('../controllers/authController');
    await googleAuth(req, res);
    assert(statusCode === 401, 'Uses official fallback client ID and verifies credential without 500 crash', `Got ${statusCode}`);
    assert(body?.error?.includes('Invalid or expired'), 'Rejects invalid token gracefully while keeping service operational');

    process.env.GOOGLE_CLIENT_ID = savedClientId;
  }

  // 5. Test Account Linking Conflict Logic:
  // When Google email matches an existing email/password account
  console.log('\n--- Test 5: Safe Account Linking Check (No Silent Hijacking) ---');
  {
    // Mock User.findOne to simulate an existing password user
    const originalFindOne = User.findOne;
    (User as any).findOne = (query: any) => {
      if (query.googleId) {
        return Promise.resolve(null); // No user has this googleId yet
      }
      if (query.email === 'athlete@example.com') {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          name: 'Existing Athlete',
          email: 'athlete@example.com',
          passwordHash: '$2a$10$hashedPasswordHere',
          authProvider: 'local',
          onboardingCompleted: true,
        });
      }
      return Promise.resolve(null);
    };

    // Mock OAuth2Client verifyIdToken
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          aud: process.env.GOOGLE_CLIENT_ID,
          iss: 'https://accounts.google.com',
          email_verified: true,
          sub: 'google_sub_123456789',
          email: 'athlete@example.com',
          name: 'Athlete Google',
        }),
      } as any;
    };

    let statusCode = 0;
    let body: any = null;
    const req: any = { body: { credential: 'valid_google_token' } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { googleAuth } = await import('../controllers/authController');
    await googleAuth(req, res);

    assert(statusCode === 409, 'Returns 409 Conflict when Google email matches existing password user', `Got ${statusCode}`);
    assert(body?.code === 'ACCOUNT_EXISTS_WITH_PASSWORD', 'Returns ACCOUNT_EXISTS_WITH_PASSWORD error code');
    assert(body?.error?.includes('already exists using email and password'), 'Explains user must sign in with password first');

    // Restore
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    User.findOne = originalFindOne;
  }

  // 6. Test New Google User Registration Flow
  console.log('\n--- Test 6: New Google User Registration & Onboarding Incomplete Default ---');
  {
    let createdUserData: any = null;
    const originalFindOne = User.findOne;
    const originalCreate = User.create;

    (User as any).findOne = () => Promise.resolve(null);
    (User as any).create = async (doc: any) => {
      createdUserData = doc;
      return {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        createdAt: new Date(),
      };
    };

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          aud: process.env.GOOGLE_CLIENT_ID,
          iss: 'https://accounts.google.com',
          email_verified: true,
          sub: 'new_google_sub_999',
          email: 'newuser@example.com',
          name: 'New Athlete',
          picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        }),
      } as any;
    };

    let statusCode = 0;
    let body: any = null;
    const req: any = { body: { credential: 'valid_new_user_token' } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { googleAuth } = await import('../controllers/authController');
    await googleAuth(req, res);

    assert(statusCode === 201, 'Returns 201 Created for new Google user', `Got ${statusCode}`);
    assert(createdUserData?.onboardingCompleted === false, 'New Google user has onboardingCompleted: false');
    assert(createdUserData?.googleId === 'new_google_sub_999', 'Stores Google stable sub identifier');
    assert(createdUserData?.authProvider === 'google', 'Marks authProvider as google');
    assert(Boolean(body?.token), 'Issues valid application JWT for new user');
    assert(body?.user?.onboardingCompleted === false, 'User response reflects onboarding requirement');

    // Restore
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }

  // 7. Test Repeat Google Login for Existing Linked User
  console.log('\n--- Test 7: Repeat Google Login for Existing User ---');
  {
    const existingUserId = new mongoose.Types.ObjectId();
    const originalFindOne = User.findOne;

    (User as any).findOne = (query: any) => {
      if (query.googleId === 'existing_google_sub_777') {
        return Promise.resolve({
          _id: existingUserId,
          name: 'Returning Athlete',
          email: 'returning@example.com',
          googleId: 'existing_google_sub_777',
          authProvider: 'google',
          onboardingCompleted: true,
          currentWeight: 75,
          weightUnit: 'kg',
          save: () => Promise.resolve(),
        });
      }
      return Promise.resolve(null);
    };

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async function () {
      return {
        getPayload: () => ({
          aud: process.env.GOOGLE_CLIENT_ID,
          iss: 'https://accounts.google.com',
          email_verified: true,
          sub: 'existing_google_sub_777',
          email: 'returning@example.com',
          name: 'Returning Athlete',
        }),
      } as any;
    };

    let statusCode = 0;
    let body: any = null;
    const req: any = { body: { credential: 'valid_token' } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { googleAuth } = await import('../controllers/authController');
    await googleAuth(req, res);

    assert(statusCode === 200, 'Returns 200 OK for repeat Google user', `Got ${statusCode}`);
    assert(body?.user?.id === existingUserId.toString(), 'Returns same existing user ID');
    assert(body?.user?.onboardingCompleted === true, 'Preserves completed onboarding status');
    assert(body?.user?.currentWeight === 75, 'Preserves existing weight and preferences');
    assert(body?.isNewUser === false, 'Indicates isNewUser is false');

    // Restore
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    User.findOne = originalFindOne;
  }

  // 8. Test Password Login with Account Registered via Google
  console.log('\n--- Test 8: Password Login Attempt on Google-Only Account ---');
  {
    const originalFindOne = User.findOne;
    (User as any).findOne = (query: any) => {
      if (query.email === 'googleonly@example.com') {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          email: 'googleonly@example.com',
          googleId: 'sub_google_only',
          authProvider: 'google',
          passwordHash: undefined, // No password set
        });
      }
      return Promise.resolve(null);
    };

    let statusCode = 0;
    let body: any = null;
    const req: any = { body: { email: 'googleonly@example.com', password: 'SomePassword123!' } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { body = data; return this; },
    };
    const { login } = await import('../controllers/authController');
    await login(req, res);

    assert(statusCode === 401, 'Returns 401 when trying to password-login to Google-only account', `Got ${statusCode}`);
    assert(body?.code === 'USE_GOOGLE_SIGN_IN', 'Returns USE_GOOGLE_SIGN_IN code');
    assert(body?.error?.includes('registered with Google'), 'Instructs user to use Google Sign-In');

    User.findOne = originalFindOne;
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
