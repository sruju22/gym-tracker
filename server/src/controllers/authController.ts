import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import Workout from '../models/Workout';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const generateToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  const options: SignOptions = {
    expiresIn: '7d',
  };
  return jwt.sign({ id: userId, email }, secret, options);
};

/**
 * Resolves onboarding eligibility without blindly marking accounts complete.
 * - If user.onboardingCompleted is explicitly boolean, respect it.
 * - For pre-existing accounts where onboardingCompleted was undefined in MongoDB:
 *   - If the user has saved fitness preferences or logged workouts -> mark complete and persist.
 *   - If the user has no workouts and no preferences -> mark incomplete and persist.
 */
export const resolveOnboardingStatus = async (user: any): Promise<boolean> => {
  if (typeof user.onboardingCompleted === 'boolean') {
    return user.onboardingCompleted;
  }

  // 1. Check if user already configured explicit fitness profile preferences
  const hasPreferences = Boolean(
    (user.fitnessGoal && String(user.fitnessGoal).trim()) ||
    (user.experienceLevel && String(user.experienceLevel).trim()) ||
    user.heightCm ||
    user.currentWeight
  );

  if (hasPreferences) {
    await User.findByIdAndUpdate(user._id, { $set: { onboardingCompleted: true } });
    user.onboardingCompleted = true;
    return true;
  }

  // 2. Check if user has recorded workout sessions
  try {
    const hasWorkouts = await Workout.exists({ userId: user._id.toString() });
    if (hasWorkouts) {
      await User.findByIdAndUpdate(user._id, { $set: { onboardingCompleted: true } });
      user.onboardingCompleted = true;
      return true;
    }
  } catch (err) {
    console.warn('[Onboarding] Error checking workouts for user:', err);
  }

  // 3. User has no workouts and no preferences -> mark incomplete and persist
  await User.findByIdAndUpdate(user._id, { $set: { onboardingCompleted: false } });
  user.onboardingCompleted = false;
  return false;
};

const formatUserResponse = (user: any, isNewRegistration = false, resolvedOnboarding?: boolean) => {
  const onboardingStatus = isNewRegistration
    ? false
    : resolvedOnboarding !== undefined
    ? resolvedOnboarding
    : typeof user.onboardingCompleted === 'boolean'
    ? user.onboardingCompleted
    : false;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    authProvider: user.authProvider || 'local',
    googleLinked: Boolean(user.googleId),
    avatarUrl: user.avatarUrl || '',
    onboardingCompleted: onboardingStatus,
    fitnessGoal: user.fitnessGoal || '',
    experienceLevel: user.experienceLevel || '',
    trainingDaysPerWeek: user.trainingDaysPerWeek || 4,
    equipmentPreference: user.equipmentPreference || '',
    heightCm: user.heightCm || null,
    currentWeight: user.currentWeight || null,
    weightUnit: user.weightUnit || 'kg',
    createdAt: user.createdAt,
  };
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check MongoDB connection readiness
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        error: 'Database unavailable',
        details: 'The backend cannot connect to MongoDB Atlas. Please verify MONGODB_URI in Render dashboard.',
      });
      return;
    }

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({ error: 'Email is already registered' });
      return;
    }

    // 3. Password Hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create User Document with onboardingCompleted: false for new accounts
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      onboardingCompleted: false,
    });

    // 5. Generate Auth Token
    const token = generateToken(user._id.toString(), user.email);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatUserResponse(user, true),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during registration', details: error.message });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check MongoDB connection readiness
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        error: 'Database unavailable',
        details: 'The backend cannot connect to MongoDB Atlas. Please verify MONGODB_URI in Render dashboard.',
      });
      return;
    }

    // 1. Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Please provide both email and password' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 2. Find User
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // 3. Compare Password
    if (!user.passwordHash) {
      res.status(401).json({
        error: 'This account was registered with Google Sign-In. Please sign in using Google.',
        code: 'USE_GOOGLE_SIGN_IN',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Resolve onboarding eligibility accurately and persist
    const onboardingCompleted = await resolveOnboardingStatus(user);

    // 4. Generate Auth Token
    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: formatUserResponse(user, false, onboardingCompleted),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT middleware)
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const onboardingCompleted = await resolveOnboardingStatus(req.user);

    res.status(200).json({
      user: formatUserResponse(req.user, false, onboardingCompleted),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error retrieving user profile', details: error.message });
  }
};

/**
 * @desc    Update current user profile / complete onboarding
 * @route   PUT /api/auth/profile
 * @access  Private (Protected by JWT middleware)
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      name,
      fitnessGoal,
      experienceLevel,
      trainingDaysPerWeek,
      equipmentPreference,
      heightCm,
      currentWeight,
      weightUnit,
      onboardingCompleted,
    } = req.body;

    const updateFields: Record<string, any> = {};

    if (name && typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }
    if (fitnessGoal !== undefined) updateFields.fitnessGoal = fitnessGoal;
    if (experienceLevel !== undefined) updateFields.experienceLevel = experienceLevel;
    if (trainingDaysPerWeek !== undefined) updateFields.trainingDaysPerWeek = Number(trainingDaysPerWeek);
    if (equipmentPreference !== undefined) updateFields.equipmentPreference = equipmentPreference;
    if (heightCm !== undefined) updateFields.heightCm = heightCm ? Number(heightCm) : null;
    if (currentWeight !== undefined) {
      if (currentWeight === null || currentWeight === '' || Number(currentWeight) === 0) {
        updateFields.currentWeight = null;
      } else {
        const numWeight = Number(currentWeight);
        if (isNaN(numWeight) || numWeight < 20 || numWeight > 500) {
          res.status(400).json({ error: 'Please enter a valid body weight between 20 and 500 kg' });
          return;
        }
        updateFields.currentWeight = Math.round(numWeight * 10) / 10;
      }
    }
    if (weightUnit && (weightUnit === 'kg' || weightUnit === 'lbs')) updateFields.weightUnit = weightUnit;
    if (onboardingCompleted !== undefined) updateFields.onboardingCompleted = Boolean(onboardingCompleted);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: formatUserResponse(updatedUser, false, updatedUser.onboardingCompleted),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error updating profile', details: error.message });
  }
};

/**
 * Helper to safely verify a Google ID Token using official google-auth-library.
 * Validates signature, audience against process.env.GOOGLE_CLIENT_ID,
 * issuer, expiration, and verified email status.
 * Never logs credentials.
 */
// Fallback client ID matches the official web client ID configured in Google Cloud Console
const GOOGLE_CLIENT_ID_FALLBACK = '500048065533-fn8bfmvb8kds0440ntca7f1mjit3r42q.apps.googleusercontent.com';

const verifyGoogleToken = async (credential: string) => {
  const clientId =
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim()) ||
    GOOGLE_CLIENT_ID_FALLBACK;

  if (!clientId || !clientId.trim()) {
    throw new Error('CONFIG_ERROR: Google Client ID is not configured on the server.');
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('INVALID_TOKEN: Empty token payload.');
  }

  // Validate audience
  if (payload.aud !== clientId) {
    throw new Error('INVALID_AUDIENCE: Token audience mismatch.');
  }

  // Validate issuer
  if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('INVALID_ISSUER: Invalid token issuer.');
  }

  // Validate verified email status
  if (!payload.email_verified) {
    throw new Error('UNVERIFIED_EMAIL: Google email address is not verified.');
  }

  // Validate sub (Google's permanent user ID)
  if (!payload.sub) {
    throw new Error('MISSING_SUB: Google user ID (sub) is missing.');
  }

  return payload;
};

/**
 * @desc    Authenticate with Google ID token (Login or Register)
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    // Check MongoDB connection readiness
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        error: 'Database unavailable',
        details: 'The backend cannot connect to MongoDB Atlas. Please verify MONGODB_URI in Render dashboard.',
      });
      return;
    }

    if (!credential || typeof credential !== 'string' || !credential.trim()) {
      res.status(400).json({ error: 'Google ID token credential is required' });
      return;
    }

    let payload: any;
    try {
      payload = await verifyGoogleToken(credential);
    } catch (err: any) {
      if (err.message?.startsWith('CONFIG_ERROR:')) {
        res.status(500).json({
          error: 'Google Sign-In is not configured on the server',
          details: 'Please ensure GOOGLE_CLIENT_ID environment variable is set in the Render dashboard.',
        });
        return;
      }
      res.status(401).json({
        error: 'Invalid or expired Google credential',
        details: err.message || 'Verification failed',
      });
      return;
    }

    const googleSub = payload.sub;
    const normalizedEmail = (payload.email || '').trim().toLowerCase();
    const googleName =
      (payload.name && payload.name.trim()) ||
      payload.given_name ||
      normalizedEmail.split('@')[0] ||
      'Athlete';
    const googlePicture = payload.picture || '';

    // 1. Check if user is already linked with this Google sub
    let user = await User.findOne({ googleId: googleSub });

    if (user) {
      // Existing Google user -> Sign In
      if (!user.avatarUrl && googlePicture) {
        user.avatarUrl = googlePicture;
        await user.save();
      }

      const onboardingCompleted = await resolveOnboardingStatus(user);
      const token = generateToken(user._id.toString(), user.email);

      res.status(200).json({
        message: 'Google login successful',
        token,
        user: formatUserResponse(user, false, onboardingCompleted),
        isNewUser: false,
      });
      return;
    }

    // 2. Check if user exists with the same email (created with email/password)
    const existingEmailUser = await User.findOne({ email: normalizedEmail });
    if (existingEmailUser) {
      // Do NOT silently link accounts based only on email!
      // Direct user to sign in with their existing method first
      res.status(409).json({
        error:
          'An account with this email already exists using email and password. Please sign in with your email and password first, or link your Google account in Settings.',
        code: 'ACCOUNT_EXISTS_WITH_PASSWORD',
        email: normalizedEmail,
      });
      return;
    }

    // 3. Genuinely new user -> Create user with normal defaults & onboardingCompleted: false
    try {
      user = await User.create({
        name: googleName,
        email: normalizedEmail,
        googleId: googleSub,
        authProvider: 'google',
        avatarUrl: googlePicture,
        onboardingCompleted: false, // New users must complete onboarding
      });

      const token = generateToken(user._id.toString(), user.email);

      res.status(201).json({
        message: 'Google registration successful',
        token,
        user: formatUserResponse(user, true, false),
        isNewUser: true,
      });
    } catch (createErr: any) {
      // Handle potential race condition on unique googleId or email
      if (createErr.code === 11000) {
        const concurrentUser = await User.findOne({ googleId: googleSub });
        if (concurrentUser) {
          const onboardingCompleted = await resolveOnboardingStatus(concurrentUser);
          const token = generateToken(concurrentUser._id.toString(), concurrentUser.email);
          res.status(200).json({
            message: 'Google login successful',
            token,
            user: formatUserResponse(concurrentUser, false, onboardingCompleted),
            isNewUser: false,
          });
          return;
        }
      }
      throw createErr;
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Server error during Google authentication',
      details: error.message,
    });
  }
};

/**
 * @desc    Link Google account to currently authenticated user
 * @route   POST /api/auth/google/link
 * @access  Private (Protected by JWT middleware)
 */
export const linkGoogleAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== 'string' || !credential.trim()) {
      res.status(400).json({ error: 'Google ID token credential is required' });
      return;
    }

    let payload: any;
    try {
      payload = await verifyGoogleToken(credential);
    } catch (err: any) {
      res.status(401).json({
        error: 'Invalid or expired Google credential',
        details: err.message || 'Verification failed',
      });
      return;
    }

    const googleSub = payload.sub;

    // Check if another user already has this googleId
    const existingLinkedUser = await User.findOne({
      googleId: googleSub,
      _id: { $ne: req.user._id },
    });

    if (existingLinkedUser) {
      res.status(409).json({
        error: 'This Google account is already linked to another GymTrackie user account.',
      });
      return;
    }

    req.user.googleId = googleSub;
    if (!req.user.avatarUrl && payload.picture) {
      req.user.avatarUrl = payload.picture;
    }
    await req.user.save();

    res.status(200).json({
      message: 'Google account linked successfully',
      user: formatUserResponse(req.user, false, req.user.onboardingCompleted),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Server error linking Google account',
      details: error.message,
    });
  }
};
