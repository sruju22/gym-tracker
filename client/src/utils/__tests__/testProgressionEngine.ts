/**
 * GymTrackie — Phase 7: Smart Training Progression & Plateau Detection Test Suite
 *
 * Validates:
 * 1. Insufficient history (< 3 exposures).
 * 2. Consistent performance improvement (linear overload).
 * 3. Double progression (repetition gains at constant working weight).
 * 4. Potential plateau across multiple exposures (watch at 3, confirmed at 4).
 * 5. Normal performance fluctuations vs. false plateau classification.
 * 6. Missing and invalid set data handling (0 reps, uncompleted sets).
 * 7. Incomplete workout session exclusion (status: 'in_progress' ignored).
 * 8. Pure bodyweight exercise handling (repetition volume progression).
 * 9. Recency guard (dormant exercise > 60 days ago is NOT an active plateau).
 * 10. Weight units normalization (lbs to kg).
 * 11. Routine-wide progression summary aggregation.
 * 12. Complete determinism across repeated executions.
 */

import {
  WorkoutSession,
  Exercise,
  Equipment,
} from '../../types';
import {
  analyzeExerciseProgression,
  analyzeRoutineProgression,
  normalizeWeightToKg,
} from '../progressionEngine';

declare const process: { exit: (code: number) => void };

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
    );
  }
}

const benchPressExercise: Exercise = {
  id: 'ex_bench_press',
  name: 'Barbell Bench Press',
  primaryMuscle: 'chest',
  secondaryMuscles: ['triceps', 'shoulders'],
  muscleAreaEmphasis: ['mid_chest'],
  equipment: 'barbell',
  exerciseType: 'compound',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['compound', 'push'],
  isCustom: false,
};

const pullUpExercise: Exercise = {
  id: 'ex_pullup',
  name: 'Pull Up',
  primaryMuscle: 'back',
  secondaryMuscles: ['biceps'],
  muscleAreaEmphasis: ['lats'],
  equipment: 'bodyweight',
  exerciseType: 'bodyweight',
  difficulty: 'intermediate',
  instructions: [],
  imageUrl: '',
  tags: ['bodyweight', 'pull'],
  isCustom: false,
};

async function runTests() {
  console.log('\n=== GYMTRACKIE PHASE 7: SMART TRAINING PROGRESSION & PLATEAU TESTS ===\n');

  // Fixed reference date: Wednesday, Oct 21, 2026 at 12:00 UTC
  const refDate = new Date('2026-10-21T12:00:00Z');

  // ==========================================
  // Test 1: Insufficient History (< 3 exposures)
  // ==========================================
  console.log('--- Test 1: Insufficient History (< 3 exposures) ---');
  {
    // A: Zero sessions
    const emptyReport = analyzeExerciseProgression([], benchPressExercise, { referenceDate: refDate });
    assertEqual(emptyReport.status, 'insufficient_data', 'Zero sessions returns insufficient_data');
    assertEqual(emptyReport.totalExposures, 0, 'Total exposures is 0');
    assertEqual(emptyReport.plateauSeverity, 'none', 'Plateau severity is none');
    assertEqual(emptyReport.evidence.hasSufficientData, false, 'hasSufficientData is false');

    // B: 1 session
    const singleSessionHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-18T10:00:00Z',
        completedAt: '2026-10-18T11:00:00Z',
        dayOfWeek: 'sunday',
        status: 'completed',
        workoutName: 'Upper Power',
        muscleGroups: ['chest'],
        totalVolume: 1200,
        totalSets: 3,
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [
              { id: 'set_1', setNumber: 1, weight: 80, reps: 5, completed: true },
              { id: 'set_2', setNumber: 2, weight: 80, reps: 5, completed: true },
            ],
          },
        ],
      },
    ];

    const singleReport = analyzeExerciseProgression(singleSessionHistory, benchPressExercise, { referenceDate: refDate });
    assertEqual(singleReport.status, 'insufficient_data', 'Single session returns insufficient_data');
    assertEqual(singleReport.statusLabel, 'Keep Logging Workouts', 'Single session has friendly status label');
    assertEqual(singleReport.totalExposures, 1, 'Total exposures is 1');
    assertEqual(singleReport.plateauSeverity, 'none', 'Single session is never a plateau');
    assertEqual(
      singleReport.recommendation.actionText,
      'Log 2 more workouts with this exercise so we can track your progress more reliably.',
      'Dynamic calculation for 2 more workouts needed'
    );

    // C: 2 sessions (1 more needed)
    const twoSessionsHistory: WorkoutSession[] = [
      ...singleSessionHistory,
      {
        id: 's_2',
        date: '2026-10-20T10:00:00Z',
        completedAt: '2026-10-20T11:00:00Z',
        dayOfWeek: 'tuesday',
        status: 'completed',
        workoutName: 'Upper Hypertrophy',
        muscleGroups: ['chest'],
        totalVolume: 1275,
        totalSets: 3,
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 85, reps: 5, completed: true }],
          },
        ],
      },
    ];
    const twoReport = analyzeExerciseProgression(twoSessionsHistory, benchPressExercise, { referenceDate: refDate });
    assertEqual(twoReport.status, 'progressing', 'Weight increased on 2nd session is progressing');
    assertEqual(twoReport.statusLabel, 'Making Progress', '2-session progress has friendly Making Progress label');
    assertEqual(
      twoReport.recommendation.actionText,
      'Log one more workout with this exercise so we can track your progress more reliably.',
      'Dynamic calculation for 1 more workout needed'
    );
  }

  // ==========================================
  // Test 2: Consistent Performance Improvement (Linear Overload)
  // ==========================================
  console.log('--- Test 2: Consistent Performance Improvement ---');
  {
    const progressingHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-07T10:00:00Z', // 14 days ago
        completedAt: '2026-10-07T11:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1200,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-10-14T10:00:00Z', // 7 days ago
        completedAt: '2026-10-14T11:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1237.5,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 82.5, reps: 5, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-10-21T10:00:00Z', // Today
        completedAt: '2026-10-21T11:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1275,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 85, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(progressingHistory, benchPressExercise, { referenceDate: refDate });
    assertEqual(report.status, 'progressing', 'Linear load increase classified as progressing');
    assertEqual(report.statusLabel, 'Making Progress', 'Friendly status label for progressing');
    assertEqual(report.plateauSeverity, 'none', 'Plateau severity is none');
    assertEqual(report.totalExposures, 3, 'Total exposures is 3');
    assertEqual(report.metricDeltas.weightDeltaKg, 5, 'Weight delta is +5 kg');
    assert(report.evidence.headline.includes('85 kg'), 'Headline reflects latest top set of 85 kg');
    assertEqual(report.recommendation.type, 'continue_load', 'Recommends continuing progression');
  }

  // ==========================================
  // Test 3: Double Progression (Repetition Gains at Constant Weight)
  // ==========================================
  console.log('--- Test 3: Double Progression (Reps at Fixed Weight) ---');
  {
    // User kept weight at 70 kg, but increased reps from 8 -> 9 -> 10
    const doubleProgressionHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-07T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 560,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 70, reps: 8, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-10-14T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 630,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 70, reps: 9, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 700,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 70, reps: 10, completed: true }],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(doubleProgressionHistory, benchPressExercise, { referenceDate: refDate });
    // MUST NOT be classified as plateau!
    assertEqual(report.status, 'progressing', 'Repetition progression at constant load is progressing, NOT plateau');
    assertEqual(report.plateauSeverity, 'none', 'Severity is none');
    assert(
      report.evidence.details.some((d) => d.includes('Double progression')),
      'Evidence explicitly recognizes double progression'
    );
    assertEqual(report.recommendation.type, 'double_progression_increase', 'Recommends load increase once top reps met');
  }

  // ==========================================
  // Test 4: Potential Plateau Across Multiple Exposures
  // ==========================================
  console.log('--- Test 4: Potential Plateau Across Multiple Exposures ---');
  {
    // Stagnant at 100 kg x 5 reps for 3 consecutive exposures
    const plateauHistory3: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-07T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1500,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 100, reps: 5, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-10-14T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1500,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 100, reps: 5, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1500,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 100, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const report3 = analyzeExerciseProgression(plateauHistory3, benchPressExercise, { referenceDate: refDate });
    assertEqual(report3.status, 'potential_plateau', 'Stalled across 3 exposures is potential_plateau');
    assertEqual(report3.statusLabel, 'Progress May Have Slowed', 'Friendly status label: Progress May Have Slowed');
    assert(
      report3.evidence.headline.includes('Progress may have slowed'),
      'Evidence headline uses friendly progress may have slowed language'
    );
    assertEqual(report3.stallDurationSessions, 3, 'Stall duration is 3 sessions');
    assertEqual(report3.plateauSeverity, 'watch', '3 sessions stall is severity: watch');
    assert(report3.recommendation.type === 'plateau_microload', 'Recommends micro-loading for stalled compound');

    // Add 4th stagnant session -> confirmed plateau
    const plateauHistory4: WorkoutSession[] = [
      {
        id: 's_0',
        date: '2026-09-30T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1500,
        totalSets: 3,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_0',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_0', setNumber: 1, weight: 100, reps: 5, completed: true }],
          },
        ],
      },
      ...plateauHistory3,
    ];

    const report4 = analyzeExerciseProgression(plateauHistory4, benchPressExercise, { referenceDate: refDate });
    assertEqual(report4.status, 'potential_plateau', '4 stagnant exposures is potential_plateau');
    assertEqual(report4.stallDurationSessions, 4, 'Stall duration is 4 sessions');
    assertEqual(report4.plateauSeverity, 'confirmed', '4 sessions stall escalates to confirmed');
  }

  // ==========================================
  // Test 5: Normal Performance Fluctuations vs Plateau
  // ==========================================
  console.log('--- Test 5: Normal Performance Fluctuations ---');
  {
    // Session 1: 60 kg x 8 reps -> Session 2: 62.5 kg x 6 reps -> Session 3: 60 kg x 8 reps
    const fluctuatingHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-07T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 480,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 60, reps: 8, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-10-14T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 375,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 62.5, reps: 6, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 480,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 60, reps: 8, completed: true }],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(fluctuatingHistory, benchPressExercise, { referenceDate: refDate });
    assertEqual(report.status, 'fluctuating', 'Normal variance classified as fluctuating, not plateau');
    assertEqual(report.plateauSeverity, 'none', 'Fluctuating has severity: none');
  }

  // ==========================================
  // Test 6: Missing and Invalid Set Data Handling
  // ==========================================
  console.log('--- Test 6: Missing and Invalid Set Data Handling ---');
  {
    const dirtyHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 500,
        totalSets: 1,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [
              { id: 'set_valid', setNumber: 1, weight: 80, reps: 6, completed: true },
              { id: 'set_uncompleted', setNumber: 2, weight: 85, reps: 5, completed: false }, // Must ignore
              { id: 'set_zero_reps', setNumber: 3, weight: 90, reps: 0, completed: true }, // Must ignore
              { id: 'set_negative_weight', setNumber: 4, weight: -10, reps: 8, completed: true }, // Must ignore
            ],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(dirtyHistory, benchPressExercise, { referenceDate: refDate });
    assertEqual(report.totalExposures, 1, 'Only 1 exposure recorded');
    assertEqual(report.latestExposure?.topSet.weight, 80, 'Top set is 80 kg (invalid sets skipped)');
    assertEqual(report.latestExposure?.topSet.reps, 6, 'Top set reps is 6');
    assertEqual(report.latestExposure?.completedSetsCount, 1, 'Strictly 1 valid set counted');
  }

  // ==========================================
  // Test 7: Incomplete Workout Sessions Exclusion
  // ==========================================
  console.log('--- Test 7: Incomplete Workouts Exclusion ---');
  {
    const incompleteHistory: WorkoutSession[] = [
      {
        id: 's_draft',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'in_progress', // Draft!
        totalVolume: 5000,
        totalSets: 5,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_draft',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 120, reps: 10, completed: true }],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(incompleteHistory, benchPressExercise, { referenceDate: refDate });
    assertEqual(report.totalExposures, 0, 'Incomplete/in_progress sessions are strictly excluded');
  }

  // ==========================================
  // Test 8: Bodyweight Exercises (Rep-Based Progression)
  // ==========================================
  console.log('--- Test 8: Bodyweight Exercises ---');
  {
    const pullupHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-07T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 0,
        totalSets: 1,
        muscleGroups: ['back'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_pullup',
            exercise: pullUpExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 0, reps: 8, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-10-14T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 0,
        totalSets: 1,
        muscleGroups: ['back'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_pullup',
            exercise: pullUpExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 0, reps: 10, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 0,
        totalSets: 1,
        muscleGroups: ['back'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_pullup',
            exercise: pullUpExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 0, reps: 12, completed: true }],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(pullupHistory, pullUpExercise, { referenceDate: refDate });
    assertEqual(report.isBodyweight, true, 'isBodyweight is true');
    assertEqual(report.status, 'progressing', 'Bodyweight rep volume gain is progressing');
    assertEqual(report.latestExposure?.topSet.reps, 12, 'Latest top set is 12 reps');
  }

  // ==========================================
  // Test 9: Recency Guard: Dormant Exercise vs Active Plateau
  // ==========================================
  console.log('--- Test 9: Recency Guard (Dormant vs Plateau) ---');
  {
    // Stagnant sessions performed in May 2026 (> 150 days before October reference date)
    const oldHistory: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-05-01T10:00:00Z',
        dayOfWeek: 'friday',
        status: 'completed',
        totalVolume: 1000,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-05-08T10:00:00Z',
        dayOfWeek: 'friday',
        status: 'completed',
        totalVolume: 1000,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-05-15T10:00:00Z',
        dayOfWeek: 'friday',
        status: 'completed',
        totalVolume: 1000,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const report = analyzeExerciseProgression(oldHistory, benchPressExercise, { referenceDate: refDate });
    // Must NOT be classified as potential_plateau because it has been out of rotation for months!
    assertEqual(report.status, 'dormant', 'Exercise last performed > 60 days ago is dormant');
    assertEqual(report.plateauSeverity, 'none', 'Dormant exercise has plateau severity: none');
    assertEqual(report.evidence.isRecencyGuarded, true, 'isRecencyGuarded is true');
  }

  // ==========================================
  // Test 10: Mixed Weight Units Normalization (lbs to kg)
  // ==========================================
  console.log('--- Test 10: Mixed Weight Units Normalization ---');
  {
    const rawLbs = 100;
    const inKg = normalizeWeightToKg(rawLbs, 'lbs');
    assertEqual(inKg, 45.36, '100 lbs normalizes accurately to 45.36 kg');
    assertEqual(normalizeWeightToKg(50, 'kg'), 50, 'kg remains unchanged');
    assertEqual(normalizeWeightToKg(0, 'lbs'), 0, '0 stays 0');
  }

  // ==========================================
  // Test 11: Routine-Wide Progression & Plateau Summary
  // ==========================================
  console.log('--- Test 11: Routine-Wide Progression Summary ---');
  {
    // Combined history containing 1 progressing exercise (bench press) and 1 plateaued exercise (pull up)
    const combinedHistory: WorkoutSession[] = [
      // Bench: 80 -> 82.5 -> 85 kg (Progressing)
      {
        id: 's_1',
        date: '2026-10-07T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1000,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
          {
            id: 'we_p1',
            exerciseId: 'ex_pullup',
            exercise: pullUpExercise,
            order: 1,
            notes: '',
            sets: [{ id: 'set_p1', setNumber: 1, weight: 0, reps: 8, completed: true }],
          },
        ],
      },
      {
        id: 's_2',
        date: '2026-10-14T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1000,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_2',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_2', setNumber: 1, weight: 82.5, reps: 5, completed: true }],
          },
          {
            id: 'we_p2',
            exerciseId: 'ex_pullup',
            exercise: pullUpExercise,
            order: 1,
            notes: '',
            sets: [{ id: 'set_p2', setNumber: 1, weight: 0, reps: 8, completed: true }],
          },
        ],
      },
      {
        id: 's_3',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 1000,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_3',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_3', setNumber: 1, weight: 85, reps: 5, completed: true }],
          },
          {
            id: 'we_p3',
            exerciseId: 'ex_pullup',
            exercise: pullUpExercise,
            order: 1,
            notes: '',
            sets: [{ id: 'set_p3', setNumber: 1, weight: 0, reps: 8, completed: true }], // Stalled 8 reps
          },
        ],
      },
    ];

    const summary = analyzeRoutineProgression(combinedHistory, [benchPressExercise, pullUpExercise], {
      referenceDate: refDate,
    });

    assertEqual(summary.totalAnalyzedExercises, 2, '2 exercises analyzed');
    assertEqual(summary.progressingCount, 1, '1 exercise progressing (bench)');
    assertEqual(summary.plateauCount, 1, '1 exercise plateaued (pullup)');
    assertEqual(summary.plateauedExercises[0].exerciseId, 'ex_pullup', 'Plateaued exercise is pullup');
    assertEqual(summary.topProgressingExercises[0].exerciseId, 'ex_bench_press', 'Top progressing is bench press');
  }

  // ==========================================
  // Test 12: Determinism
  // ==========================================
  console.log('--- Test 12: Determinism ---');
  {
    const history: WorkoutSession[] = [
      {
        id: 's_1',
        date: '2026-10-21T10:00:00Z',
        dayOfWeek: 'wednesday',
        status: 'completed',
        totalVolume: 800,
        totalSets: 2,
        muscleGroups: ['chest'],
        exercises: [
          {
            id: 'we_1',
            exerciseId: 'ex_bench_press',
            exercise: benchPressExercise,
            order: 0,
            notes: '',
            sets: [{ id: 'set_1', setNumber: 1, weight: 80, reps: 5, completed: true }],
          },
        ],
      },
    ];

    const run1 = analyzeExerciseProgression(history, benchPressExercise, { referenceDate: refDate });
    const run2 = analyzeExerciseProgression(history, benchPressExercise, { referenceDate: refDate });
    assertEqual(JSON.stringify(run1), JSON.stringify(run2), 'Progression analysis is 100% deterministic');
  }

  console.log('\n=== ALL PHASE 7 PROGRESSION & PLATEAU TESTS PASSED SUCCESSFULLY ===\n');
}

runTests().catch((err) => {
  console.error('\nTest failure:', err);
  process.exit(1);
});
