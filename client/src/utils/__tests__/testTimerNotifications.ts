import {
  getRecommendedRestSeconds,
  updateTabTitleWithTimer,
  restoreDefaultTabTitle,
} from '../timerNotification';
import { useTimerStore } from '../../store/timerStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`❌ ASSERTION FAILED: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

console.log('\n=== GYMTRACKIE REST TIMER & NOTIFICATIONS TEST SUITE ===\n');

// 1. Test Recommended Rest Periods
console.log('--- Test 1: Exercise Mechanics Rest Allocation ---');
assertEqual(getRecommendedRestSeconds('compound'), 180, 'Compound lifts must default to 180s (3 min)');
assertEqual(getRecommendedRestSeconds('isolation'), 90, 'Isolation lifts must default to 90s');
assertEqual(getRecommendedRestSeconds('machine'), 90, 'Machine lifts must default to 90s');
assertEqual(getRecommendedRestSeconds('cable'), 90, 'Cable lifts must default to 90s');
assertEqual(getRecommendedRestSeconds(undefined), 90, 'Undefined exercise type falls back safely to 90s');

// 2. Mock DOM environment for Document Title testing
console.log('--- Test 2: Dynamic Document Tab Title Formatting ---');
const originalDoc = typeof document !== 'undefined' ? document : undefined;
let mockTitle = '';
let mockHidden = false;

(globalThis as any).document = {
  get title() {
    return mockTitle;
  },
  set title(val: string) {
    mockTitle = val;
  },
  get hidden() {
    return mockHidden;
  },
};

// When tab is hidden and countdown is running
mockHidden = true;
updateTabTitleWithTimer(90, false);
assertEqual(mockTitle, '(01:30) Rest ⏱ · GymTrackie', 'Tab title should show (01:30) Rest when hidden');

updateTabTitleWithTimer(180, false);
assertEqual(mockTitle, '(03:00) Rest ⏱ · GymTrackie', 'Tab title should show (03:00) Rest for compound lifts');

// When timer finishes
updateTabTitleWithTimer(0, true);
assertEqual(mockTitle, '🔔 Ready for Next Set! · GymTrackie', 'Tab title should flash ready indicator on 0s');

// When user returns to tab
mockHidden = false;
restoreDefaultTabTitle();
assertEqual(mockTitle, 'GymTrackie — Fitness & Workout Tracking', 'Tab title should restore on focus/visibility');

// 3. Test TimerStore Lifecycle & Notification State
console.log('--- Test 3: Timer Store Lifecycle & Pending Alert State ---');
const store = useTimerStore.getState();

// Start compound rest timer with exercise name
store.startRestTimer(180, 'Smith Machine Incline Bench Press');
const stateAfterStart = useTimerStore.getState();
assert(stateAfterStart.isRestActive, 'Timer should be marked active');
assertEqual(stateAfterStart.restSecondsRemaining, 180, 'Seconds remaining should be 180');
assertEqual(stateAfterStart.exerciseName, 'Smith Machine Incline Bench Press', 'Exercise name preserved');
assert(!stateAfterStart.isReadyNotificationPending, 'Pending alert should be false while running');

// Fast forward end time to simulate timer reaching 0
useTimerStore.setState({ restEndTime: Date.now() - 1000 });
useTimerStore.getState().tick();

const stateAfterTick = useTimerStore.getState();
assert(!stateAfterTick.isRestActive, 'Timer should deactivate when finished');
assert(stateAfterTick.isReadyNotificationPending, 'Ready alert should be pending for other tabs');

// Dismissing notification
stateAfterTick.dismissReadyNotification();
assert(!useTimerStore.getState().isReadyNotificationPending, 'Dismiss resets pending flag');

// Clean up
store.stopRestTimer();
if (originalDoc) {
  (globalThis as any).document = originalDoc;
}

console.log('\n======================================================');
console.log('🎉 ALL REST TIMER & NOTIFICATION TESTS PASSED!');
console.log('======================================================\n');
