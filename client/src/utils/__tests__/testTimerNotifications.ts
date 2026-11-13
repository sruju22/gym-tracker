import assert from 'node:assert';
import {
  getRecommendedRestSeconds,
  updateTabTitleWithTimer,
  restoreDefaultTabTitle,
} from '../timerNotification';
import { useTimerStore } from '../../store/timerStore';

console.log('\n=== GYMTRACKIE REST TIMER & NOTIFICATIONS TEST SUITE ===\n');

// 1. Test Recommended Rest Periods
console.log('--- Test 1: Exercise Mechanics Rest Allocation ---');
assert.strictEqual(getRecommendedRestSeconds('compound'), 180, 'Compound lifts must default to 180s (3 min)');
assert.strictEqual(getRecommendedRestSeconds('isolation'), 90, 'Isolation lifts must default to 90s');
assert.strictEqual(getRecommendedRestSeconds('machine'), 90, 'Machine lifts must default to 90s');
assert.strictEqual(getRecommendedRestSeconds('cable'), 90, 'Cable lifts must default to 90s');
assert.strictEqual(getRecommendedRestSeconds(undefined), 90, 'Undefined exercise type falls back safely to 90s');
console.log('  ✅ Compound allocates 180s (3m) and isolation allocates 90s correctly');

// 2. Mock DOM environment for Document Title testing
console.log('--- Test 2: Dynamic Document Tab Title Formatting ---');
const originalDoc = global.document;
let mockTitle = '';
let mockHidden = false;

(global as any).document = {
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
assert.strictEqual(mockTitle, '(01:30) Rest ⏱ · GymTrackie', 'Tab title should show (01:30) Rest when hidden');

updateTabTitleWithTimer(180, false);
assert.strictEqual(mockTitle, '(03:00) Rest ⏱ · GymTrackie', 'Tab title should show (03:00) Rest for compound lifts');

// When timer finishes
updateTabTitleWithTimer(0, true);
assert.strictEqual(mockTitle, '🔔 Ready for Next Set! · GymTrackie', 'Tab title should flash ready indicator on 0s');

// When user returns to tab
mockHidden = false;
restoreDefaultTabTitle();
assert.strictEqual(mockTitle, 'GymTrackie — Fitness & Workout Tracking', 'Tab title should restore on focus/visibility');
console.log('  ✅ Dynamic tab title correctly tracks countdown, completion, and restoration');

// 3. Test TimerStore Lifecycle & Notification State
console.log('--- Test 3: Timer Store Lifecycle & Pending Alert State ---');
const store = useTimerStore.getState();

// Start compound rest timer with exercise name
store.startRestTimer(180, 'Smith Machine Incline Bench Press');
const stateAfterStart = useTimerStore.getState();
assert.strictEqual(stateAfterStart.isRestActive, true, 'Timer should be marked active');
assert.strictEqual(stateAfterStart.restSecondsRemaining, 180, 'Seconds remaining should be 180');
assert.strictEqual(stateAfterStart.exerciseName, 'Smith Machine Incline Bench Press', 'Exercise name preserved');
assert.strictEqual(stateAfterStart.isReadyNotificationPending, false, 'Pending alert should be false while running');

// Fast forward end time to simulate timer reaching 0
useTimerStore.setState({ restEndTime: Date.now() - 1000 });
useTimerStore.getState().tick();

const stateAfterTick = useTimerStore.getState();
assert.strictEqual(stateAfterTick.isRestActive, false, 'Timer should deactivate when finished');
assert.strictEqual(stateAfterTick.isReadyNotificationPending, true, 'Ready alert should be pending for other tabs');

// Dismissing notification
stateAfterTick.dismissReadyNotification();
assert.strictEqual(useTimerStore.getState().isReadyNotificationPending, false, 'Dismiss resets pending flag');

// Clean up
store.stopRestTimer();
(global as any).document = originalDoc;

console.log('  ✅ Timer store lifecycle, exercise name association, and alert states verified');

console.log('\n======================================================');
console.log('🎉 ALL REST TIMER & NOTIFICATION TESTS PASSED!');
console.log('======================================================\n');
