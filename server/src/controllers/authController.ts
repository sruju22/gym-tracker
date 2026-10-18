import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
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
    if (currentWeight !== undefined) updateFields.currentWeight = currentWeight ? Number(currentWeight) : null;
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
