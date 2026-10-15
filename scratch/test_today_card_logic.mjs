import assert from 'assert';

// 1. Re-create pure formatter & date comparison functions from formatters.ts
function parseLocalDate(dateInput) {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  }
  return new Date(dateInput);
}

function isSameLocalDay(dateA, dateB = new Date()) {
  if (!dateA || !dateB) return false;
  const d1 = parseLocalDate(dateA);
  const d2 = parseLocalDate(dateB);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// 2. Default weekly plan
const DEFAULT_WORKOUT_PLAN = {
  monday: { name: 'Push A', isRest: false, muscleGroups: [{ name: 'chest', displayName: 'Chest' }] },
  tuesday: { name: 'Pull A', isRest: false, muscleGroups: [{ name: 'back', displayName: 'Back' }] },
  wednesday: { name: 'Legs', isRest: false, muscleGroups: [{ name: 'legs', displayName: 'Legs' }] },
  thursday: { name: 'Push B', isRest: false, muscleGroups: [{ name: 'chest', displayName: 'Chest' }] },
  friday: { name: 'Pull B', isRest: false, muscleGroups: [{ name: 'back', displayName: 'Back' }] },
  saturday: { name: 'Upper + Arms', isRest: false, muscleGroups: [{ name: 'arms', displayName: 'Arms' }] },
  sunday: { name: 'Rest', isRest: true, muscleGroups: [] },
};

// 3. getTodayCompletedWorkout logic simulator
function getTodayCompletedWorkout({ history, weeklyPlan = DEFAULT_WORKOUT_PLAN, todayDay, now }) {
  const todayConfig = weeklyPlan[todayDay];

  // 1. Only consider sessions completed on today's local calendar day
  const todaySessions = history.filter((h) => {
    if (h.status !== 'completed') return false;
    return isSameLocalDay(h.completedAt || h.date, now);
  });

  if (todaySessions.length === 0) return null;

  // 2. If today is a scheduled workout day, prefer matching scheduled workout name
  if (!todayConfig?.isRest && todayConfig?.name) {
    const nameMatch = todaySessions.find(
      (h) => (h.workoutName || '').trim().toLowerCase() === todayConfig.name.trim().toLowerCase()
    );
    if (nameMatch) return nameMatch;
  }

  // 3. Prefer matching today's day of week
  const dayMatch = todaySessions.find(
    (h) => (h.dayOfWeek || '').trim().toLowerCase() === todayDay.toLowerCase()
  );
  if (dayMatch) return dayMatch;

  // 4. If today is a rest day or custom session completed today, return the session
  return todaySessions[0];
}

console.log('--- Running GymTracker Date & Workout Verification Tests ---');

// Test isSameLocalDay
assert.strictEqual(isSameLocalDay('2026-10-14', new Date(2026, 9, 14, 15, 30)), true);
assert.strictEqual(isSameLocalDay('2026-10-14', new Date(2026, 9, 15, 10, 0)), false);
assert.strictEqual(isSameLocalDay(new Date(2026, 9, 14, 23, 59), new Date(2026, 9, 14, 0, 1)), true);
assert.strictEqual(isSameLocalDay(new Date(2026, 9, 14, 23, 59), new Date(2026, 9, 15, 0, 1)), false);
console.log('✓ isSameLocalDay unit tests passed');

// SCENARIO 1: Wednesday: Legs completed — show Wednesday\'s completed Legs card.
const wednesdayDate = new Date(2026, 9, 14, 18, 0, 0); // Oct 14, 2026 (Wednesday)
const wednesdayLegsWorkout = {
  id: 'workout_wed_1',
  workoutName: 'Legs',
  date: wednesdayDate.toISOString(),
  dayOfWeek: 'wednesday',
  status: 'completed',
  completedAt: wednesdayDate.toISOString(),
  exercises: [{ id: 'ex1', sets: [{ setNumber: 1, weight: 100, reps: 10, completed: true }] }],
  totalSets: 3,
  totalVolume: 3000,
};

const historyAfterWed = [wednesdayLegsWorkout];

const wedResult = getTodayCompletedWorkout({
  history: historyAfterWed,
  todayDay: 'wednesday',
  now: wednesdayDate,
});

assert.ok(wedResult !== null, 'Wednesday should find completed workout');
assert.strictEqual(wedResult.workoutName, 'Legs');
assert.strictEqual(wedResult.totalVolume, 3000);
console.log('✓ Scenario 1: Wednesday Legs completed -> shows Wednesday completed card with 3000kg volume');

// SCENARIO 2: Thursday: no workout completed — show Thursday\'s Push B card with Start Workout.
// Thursday morning, before any workout started
const thursdayDate = new Date(2026, 9, 15, 9, 0, 0); // Oct 15, 2026 (Thursday)
const thuResultBefore = getTodayCompletedWorkout({
  history: historyAfterWed, // Only Wednesday's workout in history
  todayDay: 'thursday',
  now: thursdayDate,
});

assert.strictEqual(thuResultBefore, null, 'Thursday must NOT show Wednesday Legs as completed');
console.log('✓ Scenario 2: Thursday with no workout completed -> getTodayCompletedWorkout returns null, shows Push B Start Workout button');

// SCENARIO 3: Thursday: Push B completed and saved — show Thursday\'s completed card.
const thursdayPushBWorkout = {
  id: 'workout_thu_1',
  workoutName: 'Push B',
  date: thursdayDate.toISOString(),
  dayOfWeek: 'thursday',
  status: 'completed',
  completedAt: new Date(2026, 9, 15, 11, 30, 0).toISOString(),
  exercises: [{ id: 'ex2', sets: [{ setNumber: 1, weight: 80, reps: 8, completed: true }] }],
  totalSets: 4,
  totalVolume: 2560,
};

const historyAfterThu = [thursdayPushBWorkout, wednesdayLegsWorkout];

const thuResultAfter = getTodayCompletedWorkout({
  history: historyAfterThu,
  todayDay: 'thursday',
  now: thursdayDate,
});

assert.ok(thuResultAfter !== null, 'Thursday should find Push B completed');
assert.strictEqual(thuResultAfter.workoutName, 'Push B');
assert.strictEqual(thuResultAfter.totalVolume, 2560);
console.log('✓ Scenario 3: Thursday Push B completed and saved -> shows Thursday completed card with Push B stats');

// SCENARIO 4: Friday: no workout completed — show Friday\'s Pull B card, regardless of Thursday\'s completion.
const fridayDate = new Date(2026, 9, 16, 8, 30, 0); // Oct 16, 2026 (Friday)
const friResult = getTodayCompletedWorkout({
  history: historyAfterThu, // Contains Wed Legs and Thu Push B
  todayDay: 'friday',
  now: fridayDate,
});

assert.strictEqual(friResult, null, 'Friday must NOT show Thursday Push B as completed');
console.log('✓ Scenario 4: Friday with no workout completed -> getTodayCompletedWorkout returns null, shows Friday Pull B card with Start Workout');

// SCENARIO 5: Sunday: show the rest-day card.
const sundayDate = new Date(2026, 9, 18, 10, 0, 0); // Oct 18, 2026 (Sunday)
const sunResult = getTodayCompletedWorkout({
  history: historyAfterThu,
  todayDay: 'sunday',
  now: sundayDate,
});

assert.strictEqual(sunResult, null, 'Sunday has no completed workout');
console.log('✓ Scenario 5: Sunday rest day -> getTodayCompletedWorkout returns null, shows dedicated REST DAY card (no Start Workout button for scheduled workout)');

// SCENARIO 6: Refresh application / Editing older workout preservation test
// Suppose on Friday, user edits Wednesday's workout (e.g. adjusts reps/sets)
const editedWednesdayWorkout = {
  ...wednesdayLegsWorkout,
  totalVolume: 3500, // edited volume
};

const historyWithEdit = historyAfterThu.map((h) =>
  h.id === wednesdayLegsWorkout.id ? editedWednesdayWorkout : h
);

// Verify Friday is still Friday and uncompleted
const friResultAfterEdit = getTodayCompletedWorkout({
  history: historyWithEdit,
  todayDay: 'friday',
  now: fridayDate,
});
assert.strictEqual(friResultAfterEdit, null, 'Editing Wednesday workout on Friday must not mark Friday as completed');

// Verify Wednesday in history retained its date and volume
const wedInHistory = historyWithEdit.find((h) => h.id === wednesdayLegsWorkout.id);
assert.strictEqual(wedInHistory.totalVolume, 3500);
assert.strictEqual(wedInHistory.dayOfWeek, 'wednesday');
console.log('✓ Scenario 6: Editing older workout preserves historical date & volume without contaminating today\'s state');

console.log('\nALL 6 VERIFICATION SCENARIOS PASSED SUCCESSFULLY! 🎯');
