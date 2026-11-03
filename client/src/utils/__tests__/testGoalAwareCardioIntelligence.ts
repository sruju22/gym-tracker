/**
 * GymTrackie — Goal-Aware Cardio Intelligence Test Suite
 *
 * Verifies:
 * 1. Goal-based targets (Fat Loss, Hypertrophy, Strength, Longevity)
 * 2. General health guideline protection (never drops below 150m)
 * 3. Preference adaptation (duration * days, distance enabling)
 * 4. Custom target preservation against goal changes
 * 5. Goal-aware priority ranking in Weekly Coaching
 * 6. Recovery-aware cardio scheduling & lower-body interference safeguards
 * 7. Real activity influence and target-met behavior (no extra cardio push)
 * 8. Legacy user migration and safe defaulting
 */

declare const process: { exit: (code: number) => void };

import {
  getRecommendedCardioGoals,
  resolveCardioWeeklyGoals,
  normalizeFitnessGoal,
  DEFAULT_CARDIO_GOALS,
  DEFAULT_CARDIO_PREFERENCES,
} from '../cardioGoals';
import { deriveWeeklyCoaching } from '../weeklyCoaching';
import {
  WorkoutSession,
  WeeklySchedule,
  CardioSession,
  CardioWeeklyGoalSettings,
  UserCardioPreferences,
} from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ ${message}`);
}

console.log('\n=== GYMTRACKIE: GOAL-AWARE CARDIO INTELLIGENCE TESTS ===\n');

// ---------------------------------------------------------------------------
// Test 1: Goal-Based Starting Recommendations
// ---------------------------------------------------------------------------
console.log('--- Test 1: Goal-Based Starting Recommendations ---');
const fatLossGoals = getRecommendedCardioGoals('Fat Loss & Conditioning');
assert(fatLossGoals.durationMinutes.target === 180, 'Fat Loss recommends 180 mins/week');
assert(fatLossGoals.sessions.target >= 3 && fatLossGoals.sessions.target <= 4, 'Fat Loss recommends 3-4 sessions');

const hypertrophyGoals = getRecommendedCardioGoals('Muscle Building & Hypertrophy');
assert(hypertrophyGoals.durationMinutes.target === 150, 'Muscle Building recommends 150 mins aerobic base');
assert(hypertrophyGoals.sessions.target === 3, 'Muscle Building recommends 3 flexible sessions');

const strengthGoals = getRecommendedCardioGoals('Strength & Power');
assert(strengthGoals.durationMinutes.target === 150, 'Strength & Power recommends 150 mins conditioning base');
assert(strengthGoals.sessions.target === 3, 'Strength & Power recommends 3 conditioning sessions');

const longevityGoals = getRecommendedCardioGoals('General Fitness & Longevity');
assert(longevityGoals.durationMinutes.target === 150, 'Longevity recommends 150 mins baseline');
assert(longevityGoals.sessions.target === 3, 'Longevity recommends 3 balanced sessions');

// ---------------------------------------------------------------------------
// Test 2: General Health Floor (Do not reduce below health guidance)
// ---------------------------------------------------------------------------
console.log('--- Test 2: General Health Floor Protection ---');
const lowPreference: UserCardioPreferences = {
  preferredActivities: ['walking'],
  preferredDurationMinutes: 15,
  availableDaysPerWeek: 2, // 15m * 2 = 30m
  preferredIntensity: 'low',
};
const floorGoals = getRecommendedCardioGoals('Muscle Building & Hypertrophy', lowPreference);
assert(
  floorGoals.durationMinutes.target >= 150,
  `Aerobic target (${floorGoals.durationMinutes.target}m) maintains general health floor >= 150m`
);

// ---------------------------------------------------------------------------
// Test 3: Preference Adaptation (Duration * Days & Activity Modality)
// ---------------------------------------------------------------------------
console.log('--- Test 3: Preference Adaptation ---');
const customPref: UserCardioPreferences = {
  preferredActivities: ['running', 'cycling'],
  preferredDurationMinutes: 45,
  availableDaysPerWeek: 4, // 45 * 4 = 180m
  preferredIntensity: 'moderate',
};
const adaptedGoals = getRecommendedCardioGoals('General Fitness & Longevity', customPref);
assert(adaptedGoals.durationMinutes.target === 180, 'Adapted duration matches preferred 45m * 4 = 180m');
assert(adaptedGoals.sessions.target === 4, 'Adapted sessions matches available 4 days/week');
assert(adaptedGoals.distance.enabled === true, 'Distance tracking enabled for running/cycling user');

// ---------------------------------------------------------------------------
// Test 4: Custom Target Preservation (Never overwrite user custom goals)
// ---------------------------------------------------------------------------
console.log('--- Test 4: Custom Target Preservation ---');
const userCustomGoal: CardioWeeklyGoalSettings = {
  durationMinutes: { enabled: true, target: 210 },
  distance: { enabled: true, target: 25, unit: 'km' },
  sessions: { enabled: true, target: 5 },
  isCustomized: true,
};

// User changes goal from Fat Loss to Muscle Building
const preservedAfterGoalChange = resolveCardioWeeklyGoals(
  userCustomGoal,
  'Muscle Building & Hypertrophy',
  DEFAULT_CARDIO_PREFERENCES
);
assert(preservedAfterGoalChange.durationMinutes.target === 210, 'Custom duration 210m preserved when changing fitness goal');
assert(preservedAfterGoalChange.sessions.target === 5, 'Custom sessions target 5 preserved');
assert(preservedAfterGoalChange.distance.target === 25, 'Custom distance target 25km preserved');

// Legacy user with edited targets but without isCustomized flag
const legacyCustomGoal: CardioWeeklyGoalSettings = {
  durationMinutes: { enabled: true, target: 200 },
  distance: { enabled: false, target: 15, unit: 'km' },
  sessions: { enabled: true, target: 4 },
};
const legacyPreserved = resolveCardioWeeklyGoals(legacyCustomGoal, 'Strength & Power');
assert(legacyPreserved.durationMinutes.target === 200, 'Legacy user with non-default 200m target preserved');
assert(legacyPreserved.isCustomized === true, 'Legacy custom target safely flagged as customized');

// ---------------------------------------------------------------------------
// Test 5: Goal-Aware Priority Ranking in Weekly Coaching
// ---------------------------------------------------------------------------
console.log('--- Test 5: Goal-Aware Priority Ranking in Weekly Coaching ---');

const baseSchedule: WeeklySchedule = {
  monday: { name: 'Leg Day', isRest: false, muscleGroups: [{ name: 'legs' as any }] },
  tuesday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
  wednesday: { name: 'Push Strength', isRest: false, muscleGroups: [{ name: 'chest' as any }] },
  thursday: { name: 'Rest', isRest: true, muscleGroups: [] },
  friday: { name: 'Pull Strength', isRest: false, muscleGroups: [{ name: 'back' as any }] },
  saturday: { name: 'Rest', isRest: true, muscleGroups: [] },
  sunday: { name: 'Rest', isRest: true, muscleGroups: [] },
};

// Scenario A: Fat Loss on a Rest Day (Tuesday)
const refTuesday = new Date(2026, 9, 27); // Oct 27, 2026 is Tuesday
const fatLossCoaching = deriveWeeklyCoaching({
  history: [],
  cardioSessions: [], // 0 cardio logged yet
  weeklyPlan: baseSchedule,
  fitnessGoal: 'Fat Loss & Conditioning',
  referenceDate: refTuesday,
});

const fatLossCardioStep = fatLossCoaching.actionableSteps.find((s) => s.category === 'cardio_goal');
assert(Boolean(fatLossCardioStep), 'Cardio step is present for Fat Loss');
assert(fatLossCardioStep?.priority === 'high', 'Cardio receives HIGH priority in Fat Loss');
assert(
  fatLossCoaching.actionableSteps[0].category === 'cardio_goal',
  'On a rest day in Fat Loss, cardio ranks #1 at top of priority action steps'
);

// Scenario B: Muscle Building with Today Workout Available (Monday)
const refMonday = new Date(2026, 9, 26); // Monday
const hypertrophyCoaching = deriveWeeklyCoaching({
  history: [],
  cardioSessions: [],
  weeklyPlan: baseSchedule,
  fitnessGoal: 'Muscle Building & Hypertrophy',
  referenceDate: refMonday,
});

const hyperCardioStep = hypertrophyCoaching.actionableSteps.find((s) => s.category === 'cardio_goal');
assert(hyperCardioStep?.priority === 'medium', 'Cardio receives MEDIUM (supportive) priority in Muscle Building');
assert(
  hypertrophyCoaching.actionableSteps[0].category === 'schedule_adherence',
  'Today workout ranks #1 above cardio in Muscle Building'
);

// ---------------------------------------------------------------------------
// Test 6: Recovery-Aware Cardio Scheduling & Leg Day Interference
// ---------------------------------------------------------------------------
console.log('--- Test 6: Recovery-Aware Cardio Scheduling & Leg Day Safeguards ---');

// User completed heavy legs on Monday (diff = 1 day ago on Tuesday)
const completedLegSession: WorkoutSession = {
  id: 'sess_leg_mon',
  name: 'Heavy Leg Day',
  date: '2026-10-26T10:00:00.000Z',
  completedAt: '2026-10-26T11:00:00.000Z',
  status: 'completed',
  totalVolume: 5000,
  totalSets: 15,
  totalReps: 120,
  durationMinutes: 60,
  muscleGroups: ['legs'],
  exercises: [
    {
      exerciseId: 'squat',
      exercise: { id: 'squat', name: 'Barbell Squat', primaryMuscle: 'legs' as any } as any,
      sets: [{ setNumber: 1, weight: 100, reps: 5, completed: true }],
    },
  ],
};

const recoveryCoaching = deriveWeeklyCoaching({
  history: [completedLegSession],
  cardioSessions: [],
  weeklyPlan: baseSchedule,
  fitnessGoal: 'Muscle Building & Hypertrophy',
  referenceDate: refTuesday,
  cardioPreferences: {
    preferredActivities: ['running', 'stair_climber'],
    preferredDurationMinutes: 30,
    availableDaysPerWeek: 3,
  },
});

const legAlert = recoveryCoaching.recoveryAlerts.find((a) => a.type === 'active_recovery');
assert(Boolean(legAlert), 'Lower-body recovery alert emitted following demanding leg session');
assert(
  legAlert?.message.includes('low-impact') || legAlert?.message.includes('walking'),
  'Alert advises low-impact cardio to facilitate recovery'
);

const recoveryCardioStep = recoveryCoaching.actionableSteps.find((s) => s.category === 'cardio_goal');
assert(
  recoveryCardioStep?.rationale.includes('low-impact') || recoveryCardioStep?.rationale.includes('recovering'),
  'Cardio action step advises low-impact walking/spin rather than high-impact eccentric running'
);

// ---------------------------------------------------------------------------
// Test 7: Real Activity Influence & Target-Met Behavior
// ---------------------------------------------------------------------------
console.log('--- Test 7: Real Activity Influence & Target-Met Behavior ---');

// User logs cardio session meeting the weekly target
const loggedCardio: CardioSession = {
  id: 'cardio_1',
  activityType: 'cycling',
  date: '2026-10-27T08:00:00.000Z',
  durationMinutes: 180, // Meets 180m target
  distance: 30,
  distanceUnit: 'km',
};

const targetMetCoaching = deriveWeeklyCoaching({
  history: [completedLegSession],
  cardioSessions: [loggedCardio],
  weeklyPlan: baseSchedule,
  fitnessGoal: 'Fat Loss & Conditioning',
  referenceDate: refTuesday,
});

assert(targetMetCoaching.overview.cardioDurationMinutes === 180, 'Overview reflects exact 180m logged');
const cardioPushStep = targetMetCoaching.actionableSteps.find((s) => s.category === 'cardio_goal');
assert(!cardioPushStep, 'Does NOT recommend more cardio volume once target is met');

const milestoneStep = targetMetCoaching.actionableSteps.find((s) => s.category === 'milestone');
assert(Boolean(milestoneStep), 'Emits milestone celebrating target achievement');
assert(milestoneStep?.priority === 'low', 'Milestone assigned low priority so recovery/lifting takes precedence');

// ---------------------------------------------------------------------------
// Test 8: Legacy User Migration & Safe Defaulting
// ---------------------------------------------------------------------------
console.log('--- Test 8: Legacy User Migration & Safe Defaulting ---');

// Empty context with no cardioPreferences or goals provided
const legacyCoaching = deriveWeeklyCoaching({
  history: [],
  weeklyPlan: baseSchedule,
  referenceDate: refTuesday,
});

assert(legacyCoaching.hasSufficientData === false, 'Handles empty legacy user without errors');
assert(legacyCoaching.overview.plannedStrengthDays === 3, 'Calculates planned strength days correctly');
assert(legacyCoaching.overview.cardioSessionsCount === 0, 'Zero cardio sessions cleanly handled');
assert(legacyCoaching.actionableSteps.length > 0, 'Produces valid default onboarding coaching steps');

console.log('\n🎉 ALL GOAL-AWARE CARDIO INTELLIGENCE TESTS PASSED SUCCESSFULLY!\n');
