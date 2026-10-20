import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import Workout from '../models/Workout';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

export async function runOnboardingMigration(): Promise<{
  totalUsers: number;
  markedComplete: number;
  markedIncomplete: number;
  alreadySet: number;
}> {
  if (!MONGODB_URI) {
    console.error('[Migration] CRITICAL: MONGODB_URI environment variable is not defined.');
    throw new Error('MONGODB_URI environment variable is required to run migrations.');
  }

  console.log('[Migration] Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);

  const users = await User.find({});
  let markedComplete = 0;
  let markedIncomplete = 0;
  let alreadySet = 0;

  console.log(`[Migration] Evaluating ${users.length} user records...`);

  for (const user of users) {
    if (typeof user.onboardingCompleted === 'boolean') {
      alreadySet++;
      continue;
    }

    // Check if user has explicit fitness preferences set
    const hasPreferences = Boolean(
      (user.fitnessGoal && String(user.fitnessGoal).trim()) ||
      (user.experienceLevel && String(user.experienceLevel).trim()) ||
      user.heightCm ||
      user.currentWeight
    );

    // Check if user has any recorded workouts
    const hasWorkouts = await Workout.exists({ userId: user._id.toString() });

    if (hasPreferences || hasWorkouts) {
      user.onboardingCompleted = true;
      await user.save();
      markedComplete++;
      console.log(`  ✓ ${user.email} -> marked COMPLETE (workouts: ${Boolean(hasWorkouts)}, preferences: ${hasPreferences})`);
    } else {
      user.onboardingCompleted = false;
      await user.save();
      markedIncomplete++;
      console.log(`  ○ ${user.email} -> marked INCOMPLETE (no workouts, no preferences)`);
    }
  }

  console.log('[Migration] Summary:', {
    totalUsers: users.length,
    markedComplete,
    markedIncomplete,
    alreadySet,
  });

  return {
    totalUsers: users.length,
    markedComplete,
    markedIncomplete,
    alreadySet,
  };
}

if (require.main === module) {
  runOnboardingMigration()
    .then(() => {
      console.log('[Migration] Complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
