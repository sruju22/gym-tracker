import { WeeklySchedule, WorkoutTemplate } from '../types';
import { DEFAULT_WORKOUT_PLAN } from './workoutPlan';

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // ==========================================
  // A. MUSCLE BUILDING & HYPERTROPHY
  // ==========================================
  {
    id: 'hypertrophy-ppl-6day',
    name: 'Push / Pull / Legs (PPL) — 6-Day',
    category: 'hypertrophy',
    goal: 'Muscle Building & Hypertrophy',
    daysPerWeek: 6,
    experienceLevel: 'Intermediate to Advanced',
    equipment: 'Full Commercial Gym',
    shortDescription: 'High-frequency 6-day split alternating Push, Pull, and Legs sessions with A/B variations for maximum muscular hypertrophy and complete weekly coverage.',
    progressionMethodology: 'Double Progression: Keep weight constant until reaching top of rep range (e.g. 12 reps on all sets), then increase load by 2.5–5 kg.',
    setRepGuidance: 'Compound exercises: 3-4 sets of 8-10 reps. Isolation exercises: 3 sets of 10-15 reps to near failure (RPE 8-9).',
    recoveryNotes: 'Requires dedicated nutrition (slight caloric surplus) and 7.5–9 hours of sleep nightly. Sunday is strict total recovery.',
    weeklySchedule: DEFAULT_WORKOUT_PLAN,
  },
  {
    id: 'hypertrophy-ppl-3day',
    name: 'Push / Pull / Legs (PPL) — 3-Day',
    category: 'hypertrophy',
    goal: 'Muscle Building & Hypertrophy',
    daysPerWeek: 3,
    experienceLevel: 'All Levels',
    equipment: 'Full Commercial Gym / Home Gym',
    shortDescription: 'Classic 3-day Push/Pull/Legs rotation with built-in recovery days between sessions. Ideal for maximum muscle stimulation on a busy schedule.',
    progressionMethodology: 'Standard double progression (8-12 reps). Increase load when target sets hit 12 reps with strict form.',
    setRepGuidance: '3-4 sets of 8-12 reps per movement pattern with 90-120s rest.',
    recoveryNotes: 'Every workout day is followed by a recovery day to optimize muscle protein synthesis and CNS recovery.',
    weeklySchedule: {
      monday: {
        name: 'Push Day',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest', subAreas: ['upper_chest', 'mid_chest'] },
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['front_delts', 'side_delts'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep', 'lateral_head_tricep'] },
        ],
      },
      tuesday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Pull Day',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Back', subAreas: ['lats', 'upper_back', 'mid_back'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep', 'short_head_bicep'] },
          { name: 'shoulders', displayName: 'Rear Delts', subAreas: ['rear_delts'] },
        ],
      },
      thursday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Legs & Core',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'core', displayName: 'Core', subAreas: ['upper_abs', 'lower_abs'] },
        ],
      },
      saturday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'hypertrophy-upper-lower-4day',
    name: 'Upper / Lower Split — 4-Day',
    category: 'hypertrophy',
    goal: 'Muscle Building & Hypertrophy',
    daysPerWeek: 4,
    experienceLevel: 'All Levels',
    equipment: 'Full Commercial Gym / Home Gym',
    shortDescription: 'The gold standard 4-day bodybuilding split hitting every muscle group twice weekly with dedicated Upper and Lower body days.',
    progressionMethodology: 'Upper A/B and Lower A/B periodization. Alternate heavy compound focus (6-8 reps) with volume hypertrophy focus (10-15 reps).',
    setRepGuidance: '3-4 sets per exercise, 6-12 reps with 90-120s rest.',
    recoveryNotes: 'Mid-week Wednesday rest day ensures upper and lower body muscles recover before the second weekly stimulus.',
    weeklySchedule: {
      monday: {
        name: 'Upper Body A',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'back', displayName: 'Back', subAreas: ['lats', 'upper_back'] },
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['side_delts'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['lateral_head_tricep'] },
        ],
      },
      tuesday: {
        name: 'Lower Body A',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'core', displayName: 'Core', subAreas: ['upper_abs'] },
        ],
      },
      wednesday: { name: 'Active Recovery', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Upper Body B',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Back', subAreas: ['mid_back', 'lats', 'lower_back'] },
          { name: 'chest', displayName: 'Chest', subAreas: ['upper_chest', 'lower_chest'] },
          { name: 'shoulders', displayName: 'Rear & Front Delts', subAreas: ['rear_delts', 'front_delts'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['short_head_bicep'] },
        ],
      },
      friday: {
        name: 'Lower Body B',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'forearms', displayName: 'Forearms', subAreas: ['forearm_flexors'] },
        ],
      },
      saturday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'hypertrophy-bro-split-5day',
    name: 'Bro Split — 5-Day (Body Part Focus)',
    category: 'hypertrophy',
    goal: 'Muscle Building & Hypertrophy',
    daysPerWeek: 5,
    experienceLevel: 'Intermediate',
    equipment: 'Full Commercial Gym',
    shortDescription: 'Traditional bodybuilder 5-day split dedicating each workout to a single muscle group with high direct exercise volume and intensity.',
    progressionMethodology: 'High volume overload: 4-5 exercises per muscle group, utilizing drop sets or rest-pause on final sets.',
    setRepGuidance: '3-4 sets of 8-15 reps per exercise with deep mind-muscle connection.',
    recoveryNotes: 'Because each muscle is trained once every 7 days, take each exercise close to failure (RPE 9-10).',
    weeklySchedule: {
      monday: {
        name: 'Chest Day',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest', subAreas: ['upper_chest', 'mid_chest', 'lower_chest'] },
          { name: 'core', displayName: 'Core', subAreas: ['upper_abs', 'lower_abs'] },
        ],
      },
      tuesday: {
        name: 'Back Day',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Back', subAreas: ['lats', 'upper_back', 'mid_back', 'lower_back'] },
          { name: 'forearms', displayName: 'Forearms', subAreas: ['forearm_flexors', 'forearm_extensors'] },
        ],
      },
      wednesday: {
        name: 'Shoulder Day',
        isRest: false,
        muscleGroups: [
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['front_delts', 'side_delts', 'rear_delts'] },
          { name: 'back', displayName: 'Traps', subAreas: ['traps'] },
        ],
      },
      thursday: {
        name: 'Leg Day',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
        ],
      },
      friday: {
        name: 'Arm Day (Biceps & Triceps)',
        isRest: false,
        muscleGroups: [
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep', 'short_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep', 'lateral_head_tricep', 'medial_head_tricep'] },
          { name: 'forearms', displayName: 'Forearms', subAreas: ['forearm_flexors'] },
        ],
      },
      saturday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'hypertrophy-arnold-split-6day',
    name: 'Arnold Split — 6-Day',
    category: 'hypertrophy',
    goal: 'Muscle Building & Hypertrophy',
    daysPerWeek: 6,
    experienceLevel: 'Intermediate to Advanced',
    equipment: 'Full Commercial Gym',
    shortDescription: 'Arnold Schwarzenegger iconic antagonistic split pairing opposing muscle groups (Chest & Back, Shoulders & Arms, Legs) for massive pump and density.',
    progressionMethodology: 'Pyramid sets & superset pairings: 12-10-8-6 reps increasing weight each set.',
    setRepGuidance: '4 sets of 8-12 reps with antagonist pairings and high pump volume.',
    recoveryNotes: 'Demands high muscular stamina. Keep hydration and intra-workout carbohydrates optimal.',
    weeklySchedule: {
      monday: {
        name: 'Chest & Back A',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'back', displayName: 'Back', subAreas: ['lats', 'upper_back'] },
        ],
      },
      tuesday: {
        name: 'Shoulders & Arms A',
        isRest: false,
        muscleGroups: [
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['front_delts', 'side_delts', 'rear_delts'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['lateral_head_tricep'] },
        ],
      },
      wednesday: {
        name: 'Legs & Core A',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'core', displayName: 'Core', subAreas: ['upper_abs'] },
        ],
      },
      thursday: {
        name: 'Chest & Back B',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest', subAreas: ['upper_chest', 'lower_chest'] },
          { name: 'back', displayName: 'Back', subAreas: ['mid_back', 'lats'] },
        ],
      },
      friday: {
        name: 'Shoulders & Arms B',
        isRest: false,
        muscleGroups: [
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['side_delts', 'rear_delts'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['short_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep'] },
          { name: 'forearms', displayName: 'Forearms', subAreas: ['forearm_flexors'] },
        ],
      },
      saturday: {
        name: 'Legs & Core B',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'core', displayName: 'Core', subAreas: ['lower_abs'] },
        ],
      },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'hypertrophy-full-body-3day',
    name: 'Full Body Hypertrophy — 3-Day',
    category: 'hypertrophy',
    goal: 'Muscle Building & Hypertrophy',
    daysPerWeek: 3,
    experienceLevel: 'Beginner to Intermediate',
    equipment: 'Full Commercial Gym / Home Gym',
    shortDescription: '3 full-body sessions per week maximizing systemic protein synthesis frequency by stimulating every major muscle group 3 times weekly.',
    progressionMethodology: 'Wave loading across days: Day A Heavy (6-8 reps), Day B Moderate (8-12 reps), Day C High Rep (12-15 reps).',
    setRepGuidance: '3 sets of 8-12 reps per movement.',
    recoveryNotes: '4 rest days weekly ensures full recovery and steady strength progression.',
    weeklySchedule: {
      monday: {
        name: 'Full Body A (Chest & Quad Focus)',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'back', displayName: 'Back', subAreas: ['lats'] },
          { name: 'legs', displayName: 'Quads', subAreas: ['quads'] },
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['side_delts'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep'] },
        ],
      },
      tuesday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Full Body B (Back & Hinge Focus)',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Back', subAreas: ['upper_back', 'mid_back'] },
          { name: 'chest', displayName: 'Chest', subAreas: ['upper_chest'] },
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep'] },
        ],
      },
      thursday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Full Body C (Shoulder & Leg Focus)',
        isRest: false,
        muscleGroups: [
          { name: 'shoulders', displayName: 'Shoulders', subAreas: ['front_delts', 'side_delts', 'rear_delts'] },
          { name: 'legs', displayName: 'Quads & Hamstrings', subAreas: ['quads', 'hamstrings'] },
          { name: 'chest', displayName: 'Chest', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Back', subAreas: ['lats'] },
          { name: 'core', displayName: 'Core', subAreas: ['upper_abs'] },
        ],
      },
      saturday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
    },
  },

  // ==========================================
  // B. STRENGTH & POWER
  // ==========================================
  {
    id: 'strength-531-inspired-4day',
    name: '5/3/1-Inspired Strength — 4-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 4,
    experienceLevel: 'Intermediate to Advanced',
    equipment: 'Barbell & Full Commercial Gym',
    shortDescription: 'Jim Wendler 5/3/1-inspired periodization focusing on 4 primary barbell lifts (Overhead Press, Deadlift, Bench Press, Squat) with Training Max percentage waves.',
    progressionMethodology: '4-Week Wave Cycles based on 90% Training Max (TM): Week 1 (3x5 at 65%, 75%, 85%+), Week 2 (3x3 at 70%, 80%, 90%+), Week 3 (5/3/1 at 75%, 85%, 95%+), Week 4 (Deload 3x5 at 40%, 50%, 60%). Increase upper TMs by 2.5 kg and lower TMs by 5 kg after each cycle.',
    setRepGuidance: 'Main compound lift: 3 primary wave sets with an AMRAP (As Many Reps As Possible) on set 3. Accessories: 3-5 sets of 8-12 reps.',
    recoveryNotes: 'Never train to complete muscle failure on warm-ups or assistance. Leave 1-2 reps in reserve on AMRAP sets.',
    weeklySchedule: {
      monday: {
        name: 'Overhead Press Wave (5/3/1)',
        isRest: false,
        muscleGroups: [
          { name: 'shoulders', displayName: 'Overhead Press (Main)', subAreas: ['front_delts', 'side_delts'] },
          { name: 'chest', displayName: 'Dips / Incline (Assistance)', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Chins / Rows (Assistance)', subAreas: ['upper_back', 'lats'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep'] },
        ],
      },
      tuesday: {
        name: 'Deadlift Wave (5/3/1)',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Deadlift (Main)', subAreas: ['lower_back', 'traps'] },
          { name: 'legs', displayName: 'Hamstrings & Quads', subAreas: ['hamstrings', 'quads'] },
          { name: 'core', displayName: 'Abdominal Stability', subAreas: ['upper_abs', 'lower_abs'] },
          { name: 'forearms', displayName: 'Grip & Forearms', subAreas: ['forearm_flexors'] },
        ],
      },
      wednesday: { name: 'Active Recovery / Mobility', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Bench Press Wave (5/3/1)',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Bench Press (Main)', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'back', displayName: 'Dumbbell Rows (Assistance)', subAreas: ['lats', 'mid_back'] },
          { name: 'shoulders', displayName: 'Rear Delts', subAreas: ['rear_delts'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['lateral_head_tricep'] },
        ],
      },
      friday: {
        name: 'Squat Wave (5/3/1)',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squat (Main)', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Leg Press / Lunges', subAreas: ['quads', 'hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'core', displayName: 'Hanging Leg Raises', subAreas: ['lower_abs'] },
        ],
      },
      saturday: { name: 'Rest & Conditioning', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'strength-texas-method-3day',
    name: 'Texas Method-Inspired Strength — 3-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 3,
    experienceLevel: 'Intermediate',
    equipment: 'Barbell & Squat Rack',
    shortDescription: 'Mark Rippetoe Texas Method-inspired strength programming: Monday Volume Day (5x5), Wednesday Light Recovery Day, and Friday High-Intensity New 5RM PRs.',
    progressionMethodology: 'Monday 5x5 at ~85-90% of 5RM builds volume overload. Friday 1x5 aims for new 5RM records weekly.',
    setRepGuidance: 'Volume Day: 5x5. Recovery Day: 2-3x5 at 80% of Volume Day. Intensity Day: 1x5 PR or 2-3 triples.',
    recoveryNotes: 'Monday volume creates deep fatigue. Wednesday must remain strictly light to ensure recovery for Friday PRs.',
    weeklySchedule: {
      monday: {
        name: 'Volume Day (5x5 Heavy Base)',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squat (5x5)', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Bench Press (5x5)', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Deadlift (1x5) / Rows', subAreas: ['lower_back', 'lats'] },
          { name: 'core', displayName: 'Core', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: { name: 'Rest & Nutrition', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Recovery Day (Light Active Flush)',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Light Squat (2x5 @ 80%)', subAreas: ['quads'] },
          { name: 'shoulders', displayName: 'Overhead Press (3x5)', subAreas: ['front_delts'] },
          { name: 'back', displayName: 'Chin-Ups & Back Extensions', subAreas: ['lats', 'upper_back'] },
        ],
      },
      thursday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Intensity Day (New 5RM PRs)',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squat (1x5 PR)', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Bench Press (1x5 PR)', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Power Cleans / Heavy Rows', subAreas: ['upper_back', 'lats'] },
        ],
      },
      saturday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'strength-powerlifting-4day',
    name: 'Powerlifting-Focused Split — 4-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 4,
    experienceLevel: 'Intermediate to Advanced',
    equipment: 'Barbell & Full Commercial Gym',
    shortDescription: 'Competitive powerlifting split centered on the "Big Three" (Squat, Bench Press, Deadlift) with competition accessories and paused variations.',
    progressionMethodology: 'Block Periodization: Hypertrophy/Volume Block (6-8 reps), Strength Block (3-5 reps), Peaking Block (1-3 reps).',
    setRepGuidance: 'Primary competition lifts: 4-5 sets of 3-5 reps at RPE 8-9. Secondary accessories: 3-4 sets of 6-10 reps.',
    recoveryNotes: 'Take 3-5 minutes rest between competition sets to ensure full ATP-PC recovery.',
    weeklySchedule: {
      monday: {
        name: 'Heavy Squat & Leg Accessories',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Competition Squat', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Leg Press & Split Squats', subAreas: ['quads', 'hamstrings'] },
          { name: 'glutes', displayName: 'Glute Hip Thrusts', subAreas: ['glutes'] },
          { name: 'core', displayName: 'Heavy Abdominal Bracing', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Heavy Bench & Upper Accessories',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Competition Bench Press', subAreas: ['mid_chest'] },
          { name: 'shoulders', displayName: 'Close-Grip & Overhead Press', subAreas: ['front_delts'] },
          { name: 'back', displayName: 'Chest Supported Rows', subAreas: ['upper_back'] },
          { name: 'triceps', displayName: 'Triceps Pressdowns', subAreas: ['lateral_head_tricep'] },
        ],
      },
      wednesday: { name: 'Active Rest / Mobility', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Heavy Deadlift & Posterior Chain',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Competition Deadlift', subAreas: ['lower_back', 'traps'] },
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['lats'] },
          { name: 'forearms', displayName: 'Heavy Carries', subAreas: ['forearm_flexors'] },
        ],
      },
      friday: {
        name: 'Secondary Bench & Arm Accessories',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Paused / Spoto Bench', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'shoulders', displayName: 'Side Delts & Rear Delts', subAreas: ['side_delts', 'rear_delts'] },
          { name: 'biceps', displayName: 'Bicep Curls (Elbow Health)', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Skull Crushers', subAreas: ['long_head_tricep'] },
        ],
      },
      saturday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'strength-upper-lower-4day',
    name: 'Upper / Lower Strength — 4-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 4,
    experienceLevel: 'All Levels',
    equipment: 'Barbell & Full Gym',
    shortDescription: 'Heavy 4-day compound split alternating heavy pressing and pulling with heavy knee-dominant and hip-dominant compound lifts.',
    progressionMethodology: 'Linear periodization: 5 sets of 5 reps. Progress load when all 5x5 sets are completed with clean bar speed.',
    setRepGuidance: 'Primary lifts: 5x5 with 3-5 minutes rest. Secondary accessories: 3x6-8 reps.',
    recoveryNotes: 'Ideal for building brute functional compound numbers while allowing 3 full rest days per week.',
    weeklySchedule: {
      monday: {
        name: 'Heavy Upper A',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Barbell Bench Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Barbell Bent-Over Row', subAreas: ['lats', 'upper_back'] },
          { name: 'shoulders', displayName: 'Overhead Press', subAreas: ['front_delts'] },
          { name: 'biceps', displayName: 'Barbell Curl', subAreas: ['long_head_bicep'] },
        ],
      },
      tuesday: {
        name: 'Heavy Lower A',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Barbell Back Squat', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Romanian Deadlift', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Bridge / Thrust', subAreas: ['glutes'] },
          { name: 'core', displayName: 'Hanging Knee Raises', subAreas: ['lower_abs'] },
        ],
      },
      wednesday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Heavy Upper B',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Incline Bench Press', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Weighted Pull-Ups', subAreas: ['lats'] },
          { name: 'shoulders', displayName: 'Dumbbell Shoulder Press', subAreas: ['front_delts', 'side_delts'] },
          { name: 'triceps', displayName: 'Weighted Dips / Skullcrushers', subAreas: ['long_head_tricep'] },
        ],
      },
      friday: {
        name: 'Heavy Lower B',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Conventional Deadlift', subAreas: ['lower_back'] },
          { name: 'legs', displayName: 'Front Squat / Leg Press', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Leg Curls', subAreas: ['hamstrings'] },
          { name: 'calves', displayName: 'Standing Calf Raises', subAreas: ['calves'] },
        ],
      },
      saturday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'strength-full-body-3day',
    name: 'Full Body Strength — 3-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 3,
    experienceLevel: 'Beginner to Intermediate',
    equipment: 'Barbell & Squat Rack',
    shortDescription: 'Foundational 3-day full-body compound split emphasizing Squat, Bench, Overhead Press, and Deadlift progression every session.',
    progressionMethodology: 'Linear Progression: Add 2.5 kg to upper body lifts and 2.5–5 kg to squat/deadlift each week.',
    setRepGuidance: '3-5 sets of 5 reps on all primary compound exercises with 2-3 min rest.',
    recoveryNotes: 'Tuesday, Thursday, Saturday, and Sunday are dedicated to nutrition and sleep for steady neurological adaptation.',
    weeklySchedule: {
      monday: {
        name: 'Full Body Strength A',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squat (3x5)', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Bench Press (3x5)', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Barbell Row (3x5)', subAreas: ['lats', 'upper_back'] },
          { name: 'core', displayName: 'Plank / Core Bracing', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Full Body Strength B',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Front Squat / Leg Press', subAreas: ['quads'] },
          { name: 'shoulders', displayName: 'Overhead Press (3x5)', subAreas: ['front_delts'] },
          { name: 'back', displayName: 'Deadlift (1x5 Heavy)', subAreas: ['lower_back'] },
          { name: 'biceps', displayName: 'Barbell Curls', subAreas: ['long_head_bicep'] },
        ],
      },
      thursday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Full Body Strength C',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squat (3x5)', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Incline Bench Press', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Weighted Pull-Ups / Chins', subAreas: ['lats'] },
          { name: 'triceps', displayName: 'Close-Grip Bench / Dips', subAreas: ['long_head_tricep'] },
        ],
      },
      saturday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'strength-5day-powerbuilding',
    name: 'Five-Day Strength Specialization — 5-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 5,
    experienceLevel: 'Intermediate to Advanced',
    equipment: 'Barbell, Squat Rack & Full Gym',
    shortDescription: 'Dedicated 5-day strength program organizing sessions around Squat, Bench Press, Deadlift, Overhead Press, and accessory strength weak points.',
    progressionMethodology: 'Linear Periodization & Top Set + Backoff: Work up to a heavy single/triple at RPE 8-9, followed by 4x4-6 back-off volume at 80% of top load.',
    setRepGuidance: 'Primary compound lifts: 3-5 reps with 3-5 minutes rest. Strength accessories: 6-8 reps with 2 minutes rest.',
    recoveryNotes: 'Dedicated Wednesday and Sunday rest days strategically split the heavy leg and back sessions to allow CNS replenishment.',
    weeklySchedule: {
      monday: {
        name: 'Heavy Squat & Quads',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squat (Primary 3-5 reps)', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Leg Press / Front Squat', subAreas: ['quads'] },
          { name: 'calves', displayName: 'Calf Strength', subAreas: ['calves'] },
          { name: 'core', displayName: 'Heavy Core Bracing', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Heavy Bench Press & Triceps',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Bench Press (Primary 3-5 reps)', subAreas: ['mid_chest'] },
          { name: 'chest', displayName: 'Close-Grip Bench Press', subAreas: ['upper_chest'] },
          { name: 'triceps', displayName: 'Heavy Tricep Extensions', subAreas: ['long_head_tricep'] },
          { name: 'shoulders', displayName: 'Face Pulls / Rear Delts', subAreas: ['rear_delts'] },
        ],
      },
      wednesday: { name: 'CNS Recovery / Rest', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Heavy Deadlift & Posterior Chain',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Deadlift (Primary 1-5 reps)', subAreas: ['lower_back'] },
          { name: 'legs', displayName: 'Romanian Deadlift / Hamstring Curls', subAreas: ['hamstrings'] },
          { name: 'back', displayName: 'Heavy Barbell Rows', subAreas: ['upper_back', 'lats'] },
          { name: 'core', displayName: 'Hanging Leg Raises', subAreas: ['lower_abs'] },
        ],
      },
      friday: {
        name: 'Overhead Press & Upper Power',
        isRest: false,
        muscleGroups: [
          { name: 'shoulders', displayName: 'Standing Overhead Press', subAreas: ['front_delts'] },
          { name: 'back', displayName: 'Weighted Pull-Ups', subAreas: ['lats'] },
          { name: 'chest', displayName: 'Incline Dumbbell Press', subAreas: ['upper_chest'] },
          { name: 'biceps', displayName: 'Heavy Barbell Curls', subAreas: ['long_head_bicep'] },
        ],
      },
      saturday: {
        name: 'Strength Accessory & Weak Points',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Pause Squats / Bulgarian Split Squat', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Dips / Floor Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Chest-Supported Rows / Shrugs', subAreas: ['traps', 'upper_back'] },
          { name: 'forearms', displayName: 'Forearms & Grip', subAreas: ['forearm_flexors', 'forearm_extensors'] },
        ],
      },
      sunday: { name: 'Total Rest & Nutrition', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'strength-6day-high-frequency',
    name: 'High-Frequency Strength & Power — 6-Day',
    category: 'strength',
    goal: 'Strength & Power',
    daysPerWeek: 6,
    experienceLevel: 'Advanced',
    equipment: 'Barbell, Power Rack & Full Gym',
    shortDescription: 'High-frequency 6-day strength regimen using daily undulating intensity to practice core barbell movements frequently without CNS breakdown.',
    progressionMethodology: 'Daily Undulating Periodization (DUP): Rotates Heavy (3-5 reps at RPE 8), Speed/Dynamic Effort (3 reps at 65-70% with explosive intent), and Accessory Volume (6-8 reps). Strictly caps RPE to manage systemic fatigue.',
    setRepGuidance: 'Main compound lifts: 3-5 sets of 3-5 reps (RPE 7.5-8.5). Explosive dynamic sets: 6x2-3 reps. Rest 3-4 minutes on heavy sets.',
    recoveryNotes: 'High-frequency training demands 8+ hours of sleep, adequate sodium/hydration, and strict adherence to leaving 1-2 reps in reserve.',
    weeklySchedule: {
      monday: {
        name: 'Squat Heavy & Push Accessories',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Heavy Back Squat', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Dumbbell Bench Press', subAreas: ['mid_chest'] },
          { name: 'triceps', displayName: 'Tricep Pushdowns', subAreas: ['lateral_head_tricep'] },
          { name: 'core', displayName: 'Abdominal Bracing', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Bench Press Heavy & Pull Accessories',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Heavy Barbell Bench Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Barbell Bent-Over Row', subAreas: ['lats'] },
          { name: 'biceps', displayName: 'Hammer Curls', subAreas: ['long_head_bicep'] },
          { name: 'shoulders', displayName: 'Face Pulls', subAreas: ['rear_delts'] },
        ],
      },
      wednesday: {
        name: 'Deadlift Focus & Legs',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Conventional Deadlift', subAreas: ['lower_back'] },
          { name: 'legs', displayName: 'Front Squats / Bulgarian Split Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstring Curls', subAreas: ['hamstrings'] },
          { name: 'core', displayName: 'Hanging Leg Raises', subAreas: ['lower_abs'] },
        ],
      },
      thursday: {
        name: 'Dynamic Squat & Overhead Press',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Speed Squats (Dynamic Effort)', subAreas: ['quads'] },
          { name: 'shoulders', displayName: 'Overhead Press (Heavy)', subAreas: ['front_delts'] },
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['lats'] },
          { name: 'triceps', displayName: 'Dips / Skullcrushers', subAreas: ['long_head_tricep'] },
        ],
      },
      friday: {
        name: 'Bench Press Volume & Upper Back',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Incline Bench Press', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Weighted Pull-Ups', subAreas: ['lats', 'upper_back'] },
          { name: 'shoulders', displayName: 'Lateral Raises', subAreas: ['side_delts'] },
          { name: 'biceps', displayName: 'Barbell Curls', subAreas: ['short_head_bicep'] },
        ],
      },
      saturday: {
        name: 'Deadlift Speed & Posterior Power',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Speed Deadlifts / Block Pulls', subAreas: ['lower_back'] },
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Barbell Hip Thrusts', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Standing Calf Raises', subAreas: ['calves'] },
        ],
      },
      sunday: { name: 'Full Nervous System Reset', isRest: true, muscleGroups: [] },
    },
  },

  // ==========================================
  // C. FAT LOSS & CONDITIONING
  // ==========================================
  {
    id: 'fatloss-upper-lower-conditioning-4day',
    name: 'Upper / Lower with Conditioning — 4-Day',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 4,
    experienceLevel: 'All Levels',
    equipment: 'Full Gym / Dumbbells',
    shortDescription: 'High-density resistance training preserving lean muscle while elevating metabolic output with active supersets and conditioning intervals.',
    progressionMethodology: 'Density Progression: Maintain weight loads while gradually reducing rest intervals between supersets from 75s down to 45s.',
    setRepGuidance: '3-4 sets of 10-15 reps with antagonistic superset pairings and core finishers.',
    recoveryNotes: 'Stay hydrated with electrolytes and maintain high protein intake (1.8–2.2g/kg) to protect muscle during calorie deficits.',
    conditioningNotes: 'Conclude each session with 8–10 minutes of high-intensity interval conditioning.',
    weeklySchedule: {
      monday: {
        name: 'Upper Body Metabolic Strength',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest (Superset A)', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'back', displayName: 'Back (Superset A)', subAreas: ['lats', 'upper_back'] },
          { name: 'shoulders', displayName: 'Shoulders (Superset B)', subAreas: ['side_delts'] },
          { name: 'core', displayName: 'Core Finisher', subAreas: ['upper_abs', 'obliques'] },
        ],
      },
      tuesday: {
        name: 'Lower Body Metabolic Burn',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Quads (Superset A)', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstrings (Superset A)', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Thrusts', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
          { name: 'core', displayName: 'Core', subAreas: ['lower_abs'] },
        ],
      },
      wednesday: { name: 'Active Recovery (Walk / Stretch)', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Upper Body Density & Arms',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Back Rows (Superset A)', subAreas: ['mid_back', 'lats'] },
          { name: 'chest', displayName: 'Incline Press (Superset A)', subAreas: ['upper_chest'] },
          { name: 'biceps', displayName: 'Biceps (Superset B)', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps (Superset B)', subAreas: ['lateral_head_tricep'] },
          { name: 'core', displayName: 'Rotational Core', subAreas: ['obliques'] },
        ],
      },
      friday: {
        name: 'Lower Body Conditioning & Core',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Leg Press / Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Walking Lunges', subAreas: ['glutes'] },
          { name: 'core', displayName: 'High-Density Core Finisher', subAreas: ['upper_abs', 'lower_abs'] },
        ],
      },
      saturday: { name: 'Cardio / Rest Day', isRest: true, muscleGroups: [] },
      sunday: { name: 'Total Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'fatloss-full-body-resistance-3day',
    name: 'Full Body Resistance Training — 3-Day',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 3,
    experienceLevel: 'Beginner to Intermediate',
    equipment: 'Full Gym / Dumbbells',
    shortDescription: 'Systemic muscle recruitment maintaining lean metabolic mass during a caloric deficit with compound resistance movements.',
    progressionMethodology: 'Load Maintenance: Keep weight as high as possible in the 8-12 rep range to signal muscle retention during fat loss.',
    setRepGuidance: '3 sets of 8-12 reps with 60-90s rest between stations.',
    recoveryNotes: 'Spacing workouts with alternating rest days allows optimal muscle repair despite reduced dietary energy.',
    weeklySchedule: {
      monday: {
        name: 'Full Body Resistance A',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Lat Pulldowns / Rows', subAreas: ['lats'] },
          { name: 'legs', displayName: 'Goblet / Barbell Squats', subAreas: ['quads'] },
          { name: 'core', displayName: 'Core Bracing', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: { name: 'Low-Intensity Cardio / Rest', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Full Body Resistance B',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'shoulders', displayName: 'Dumbbell Shoulder Press', subAreas: ['front_delts', 'side_delts'] },
          { name: 'back', displayName: 'Cable Rows', subAreas: ['mid_back'] },
          { name: 'glutes', displayName: 'Hip Thrusts', subAreas: ['glutes'] },
        ],
      },
      thursday: { name: 'Low-Intensity Cardio / Rest', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Full Body Resistance C',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Leg Press / Lunges', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Incline Dumbbell Press', subAreas: ['upper_chest'] },
          { name: 'biceps', displayName: 'Bicep Curls', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Tricep Pressdowns', subAreas: ['long_head_tricep'] },
          { name: 'core', displayName: 'Plank & Hanging Knee Raises', subAreas: ['lower_abs'] },
        ],
      },
      saturday: { name: 'Active Recovery Walk', isRest: true, muscleGroups: [] },
      sunday: { name: 'Total Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'fatloss-full-body-conditioning-3day',
    name: 'Three-Day Full Body plus Conditioning',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 3,
    experienceLevel: 'All Levels',
    equipment: 'Full Gym / Dumbbells / Cardio',
    shortDescription: 'Hybrid split pairing 3 structured resistance sessions with cardiovascular interval finishers and functional core circuits.',
    progressionMethodology: 'Increase rounds and work capacity on conditioning intervals while progressively loading compound lifts.',
    setRepGuidance: 'Compound lifts: 3x8-10 reps. Metabolic finishers: 4 rounds of interval circuits.',
    recoveryNotes: 'Prioritize post-workout protein and hydration to optimize metabolic recovery.',
    conditioningNotes: '10-minute high-intensity interval circuit at the end of every workout.',
    weeklySchedule: {
      monday: {
        name: 'Full Body Power + Finisher',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squats', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Bench Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Barbell Row', subAreas: ['lats'] },
          { name: 'core', displayName: 'Interval Circuit (Core)', subAreas: ['upper_abs', 'lower_abs'] },
        ],
      },
      tuesday: { name: 'Rest / Active Recovery', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Full Body Pull/Hinge + Core',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'back', displayName: 'Pull-Ups / Lat Pulldown', subAreas: ['lats', 'upper_back'] },
          { name: 'shoulders', displayName: 'Lateral Raises', subAreas: ['side_delts'] },
          { name: 'core', displayName: 'Core Finisher', subAreas: ['obliques'] },
        ],
      },
      thursday: { name: 'Rest / Active Recovery', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Full Body Push/Knee + Intervals',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Lunges / Leg Press', subAreas: ['quads', 'glutes'] },
          { name: 'shoulders', displayName: 'Dumbbell Shoulder Press', subAreas: ['front_delts'] },
          { name: 'chest', displayName: 'Push-Ups / Cable Flyes', subAreas: ['upper_chest'] },
          { name: 'biceps', displayName: 'Arms', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['lateral_head_tricep'] },
        ],
      },
      saturday: { name: 'Cardio / Rest Day', isRest: true, muscleGroups: [] },
      sunday: { name: 'Total Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'fatloss-4day-resistance-conditioning',
    name: 'Four-Day Resistance Training plus Conditioning',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 4,
    experienceLevel: 'Intermediate',
    equipment: 'Full Commercial Gym',
    shortDescription: '4-day Push/Pull foundation paired with targeted high-intensity conditioning finishers to maximize daily caloric expenditure.',
    progressionMethodology: 'Volume & Density progression: Maintain strength intensity while increasing conditioning circuit work capacity.',
    setRepGuidance: '3-4 sets of 10-12 reps followed by 8-10 min high-intensity metabolic finish.',
    recoveryNotes: 'Take Wednesday and weekends for muscle tissue repair and nervous system recovery.',
    conditioningNotes: 'Interval sprints, prowler/sled pushes, or kettlebell swing finishers.',
    weeklySchedule: {
      monday: {
        name: 'Push Resistance + Intervals',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest Press', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'shoulders', displayName: 'Shoulder Press & Raises', subAreas: ['front_delts', 'side_delts'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['lateral_head_tricep'] },
          { name: 'core', displayName: 'Interval Conditioning', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Pull Resistance + Core',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Back Rows & Pulls', subAreas: ['lats', 'upper_back'] },
          { name: 'biceps', displayName: 'Bicep Curls', subAreas: ['long_head_bicep', 'short_head_bicep'] },
          { name: 'shoulders', displayName: 'Rear Delts', subAreas: ['rear_delts'] },
          { name: 'core', displayName: 'Plank Conditioning', subAreas: ['lower_abs'] },
        ],
      },
      wednesday: { name: 'Rest / Active Walk', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Lower Body Resistance & Core',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Quads & Lunges', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstrings', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glutes', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
        ],
      },
      friday: {
        name: 'Upper Conditioning & Arms',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Dips / Push-ups', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Pull-Ups / Cable Rows', subAreas: ['lats'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep'] },
          { name: 'core', displayName: 'High-Intensity Core Burner', subAreas: ['obliques', 'upper_abs'] },
        ],
      },
      saturday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Total Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'fatloss-balanced-strength-cardio-4day',
    name: 'Balanced Strength and Cardio — 4-Day',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 4,
    experienceLevel: 'All Levels',
    equipment: 'Full Gym & Cardio Equipment',
    shortDescription: 'Balanced hybrid program combining heavy compound strength foundations with dedicated cardiovascular conditioning days.',
    progressionMethodology: 'Alternate heavy resistance progression (5-8 reps) with progressive cardio aerobic pacing.',
    setRepGuidance: 'Resistance sessions: 3-4 sets of 6-10 reps. Conditioning: 20-30 min aerobic intervals.',
    recoveryNotes: 'Balances intense anaerobic resistance with low-impact aerobic heart rate training.',
    weeklySchedule: {
      monday: {
        name: 'Upper Body Strength Focus',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Bench Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Barbell / Cable Rows', subAreas: ['lats'] },
          { name: 'shoulders', displayName: 'Overhead Press', subAreas: ['front_delts'] },
          { name: 'biceps', displayName: 'Biceps & Triceps', subAreas: ['long_head_bicep'] },
        ],
      },
      tuesday: {
        name: 'Lower Body Strength & Core',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Thrusts', subAreas: ['glutes'] },
          { name: 'core', displayName: 'Hanging Leg Raises', subAreas: ['lower_abs'] },
        ],
      },
      wednesday: { name: 'Rest & Mobility', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Full Body Compound Circuit',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Leg Press', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Incline Press', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['lats'] },
          { name: 'core', displayName: 'Core Bracing', subAreas: ['upper_abs'] },
        ],
      },
      friday: {
        name: 'Conditioning & Dynamic Core',
        isRest: false,
        muscleGroups: [
          { name: 'core', displayName: 'Dynamic Abdominals', subAreas: ['upper_abs', 'lower_abs', 'obliques'] },
          { name: 'calves', displayName: 'Calf & Ankle Resilience', subAreas: ['calves'] },
          { name: 'forearms', displayName: 'Grip & Carries', subAreas: ['forearm_flexors'] },
        ],
      },
      saturday: { name: 'Active Walk / Rest', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'fatloss-5day-metabolic-split',
    name: 'Balanced Resistance Training & Conditioning — 5-Day',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 5,
    experienceLevel: 'Intermediate',
    equipment: 'Commercial Gym / Dumbbells & Cardio',
    shortDescription: 'Balanced 5-day split blending muscle-preserving resistance training with post-lift metabolic conditioning to maximize calorie expenditure and improve cardiovascular fitness.',
    progressionMethodology: 'Density Progression & Escalating Work Capacity: Complete targeted sets with fixed weight while gradually decreasing rest periods from 60s down to 40s before increasing external load.',
    setRepGuidance: 'Resistance: 3-4 sets of 10-15 reps with 45-60s rest. Conditioning: 15-20 min post-workout intervals (Zone 3-4).',
    recoveryNotes: 'Preserve muscle mass by consuming adequate protein (1.8-2.2g/kg) and prioritizing Wednesday and Sunday for active rest.',
    weeklySchedule: {
      monday: {
        name: 'Upper Push & High-Intensity Intervals',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Dumbbell Bench Press', subAreas: ['mid_chest'] },
          { name: 'shoulders', displayName: 'Overhead Dumbbell Press', subAreas: ['front_delts'] },
          { name: 'triceps', displayName: 'Tricep Dips / Rope Pushdowns', subAreas: ['lateral_head_tricep'] },
          { name: 'core', displayName: 'Plank Intervals', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Lower Quads/Glutes & Core Density',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Goblet / Barbell Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Walking Lunges', subAreas: ['quads'] },
          { name: 'glutes', displayName: 'Hip Thrusts', subAreas: ['glutes'] },
          { name: 'core', displayName: 'Bicycle Crunches', subAreas: ['obliques'] },
        ],
      },
      wednesday: { name: 'Active Recovery & Mobility', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Upper Pull & Row Conditioning',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Seated Cable Rows', subAreas: ['lats'] },
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['upper_back'] },
          { name: 'biceps', displayName: 'Dumbbell Hammer Curls', subAreas: ['long_head_bicep'] },
          { name: 'shoulders', displayName: 'Rear Delt Flyes', subAreas: ['rear_delts'] },
        ],
      },
      friday: {
        name: 'Lower Hamstrings & Calves Finisher',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'legs', displayName: 'Hamstring Curls', subAreas: ['hamstrings'] },
          { name: 'calves', displayName: 'Calf Raises', subAreas: ['calves'] },
          { name: 'core', displayName: 'Hanging Knee Raises', subAreas: ['lower_abs'] },
        ],
      },
      saturday: {
        name: 'Full Body Functional Metabolic Complex',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Dumbbell Thrusters / Leg Press', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Push-Up Density Sets', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Kettlebell / Dumbbell Swings', subAreas: ['lower_back'] },
          { name: 'core', displayName: 'Mountain Climbers & Planks', subAreas: ['upper_abs'] },
        ],
      },
      sunday: { name: 'Total Recovery & Hydration', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'fatloss-6day-athletic-conditioning',
    name: 'Athletic Conditioning & Hypertrophy — 6-Day',
    category: 'fat_loss',
    goal: 'Fat Loss & Conditioning',
    daysPerWeek: 6,
    experienceLevel: 'Advanced',
    equipment: 'Full Commercial Gym & Cardio Equipment',
    shortDescription: 'Sustainable 6-day athletic split alternating push, pull, and leg hypertrophy with energy system development, maintaining lean mass while driving high weekly caloric burn.',
    progressionMethodology: 'Wave Density Overload: Alternate heavier compound days (8-10 reps) with metabolic density days (12-15 reps) and cardio threshold work. Keep rests strictly timed.',
    setRepGuidance: '3-4 sets of 10-15 reps per exercise with 45s rest; supersets used to keep heart rate elevated throughout.',
    recoveryNotes: 'High volume requires strict 8+ hours sleep and electrolyte supplementation to maintain recovery in a caloric deficit.',
    weeklySchedule: {
      monday: {
        name: 'Push Strength & Sprint Intervals',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Barbell Bench Press', subAreas: ['mid_chest'] },
          { name: 'shoulders', displayName: 'Dumbbell Shoulder Press', subAreas: ['front_delts'] },
          { name: 'triceps', displayName: 'Overhead Cable Extensions', subAreas: ['long_head_tricep'] },
          { name: 'core', displayName: 'Ab Rollouts', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Pull Hypertrophy & Core Endurance',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Barbell Rows', subAreas: ['upper_back'] },
          { name: 'back', displayName: 'Neutral-Grip Pulldowns', subAreas: ['lats'] },
          { name: 'biceps', displayName: 'Incline Dumbbell Curls', subAreas: ['long_head_bicep'] },
          { name: 'core', displayName: 'Hanging Leg Raises', subAreas: ['lower_abs'] },
        ],
      },
      wednesday: {
        name: 'Legs Power & Aerobic Threshold',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Barbell Back Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Bridges', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Seated Calf Raises', subAreas: ['calves'] },
        ],
      },
      thursday: {
        name: 'Push Volume & Shoulder Conditioning',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Incline Dumbbell Press', subAreas: ['upper_chest'] },
          { name: 'shoulders', displayName: 'Lateral Raises', subAreas: ['side_delts'] },
          { name: 'triceps', displayName: 'Rope Tricep Pushdowns', subAreas: ['lateral_head_tricep'] },
          { name: 'core', displayName: 'Side Planks', subAreas: ['obliques'] },
        ],
      },
      friday: {
        name: 'Pull Density & Arms',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Chest-Supported Rows', subAreas: ['mid_back'] },
          { name: 'back', displayName: 'Straight-Arm Pulldowns', subAreas: ['lats'] },
          { name: 'biceps', displayName: 'Preacher Curls', subAreas: ['short_head_bicep'] },
          { name: 'shoulders', displayName: 'Reverse Pec Deck', subAreas: ['rear_delts'] },
        ],
      },
      saturday: {
        name: 'Legs & Functional Conditioning Complex',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Leg Press', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Lying Leg Curls', subAreas: ['hamstrings'] },
          { name: 'calves', displayName: 'Standing Calf Raises', subAreas: ['calves'] },
          { name: 'core', displayName: 'Russian Twists', subAreas: ['obliques'] },
        ],
      },
      sunday: { name: 'Total Rest & Nutritional Refueling', isRest: true, muscleGroups: [] },
    },
  },

  // ==========================================
  // D. GENERAL FITNESS & LONGEVITY
  // ==========================================
  {
    id: 'longevity-full-body-3day',
    name: 'Three-Day Full Body Longevity',
    category: 'longevity',
    goal: 'General Fitness & Longevity',
    daysPerWeek: 3,
    experienceLevel: 'All Levels',
    equipment: 'Commercial Gym / Home Gym / Minimal Gear',
    shortDescription: 'Sustainable 3-day functional fitness routine promoting joint health, posture, multi-planar movement, and overall physical longevity.',
    progressionMethodology: 'Quality Over Load: Prioritize full active range of motion and joint control before progressing weights.',
    setRepGuidance: '2-3 sets of 10-12 controlled reps with a 3-second eccentric tempo.',
    recoveryNotes: 'Ample 4 recovery days weekly allow joint cartilage, tendons, and connective tissues to adapt pain-free.',
    weeklySchedule: {
      monday: {
        name: 'Full Body Posture & Push/Pull',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Upper Back & Posture', subAreas: ['upper_back', 'lats'] },
          { name: 'chest', displayName: 'Chest Press', subAreas: ['mid_chest'] },
          { name: 'legs', displayName: 'Squat Movement', subAreas: ['quads'] },
          { name: 'core', displayName: 'Anti-Extension Core', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: { name: 'Active Recovery / Walking', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Full Body Hinge & Core',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Hip Hinge / RDL', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Strength', subAreas: ['glutes'] },
          { name: 'shoulders', displayName: 'Overhead & Scapular Stability', subAreas: ['front_delts', 'side_delts'] },
          { name: 'core', displayName: 'Anti-Rotation (Paloff)', subAreas: ['obliques'] },
        ],
      },
      thursday: { name: 'Rest / Mobility Flow', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Full Body Functional & Mobility',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Lunges & Step-Ups', subAreas: ['quads', 'glutes'] },
          { name: 'back', displayName: 'Rows & Pulldowns', subAreas: ['mid_back'] },
          { name: 'chest', displayName: 'Push-Ups / Incline Press', subAreas: ['upper_chest'] },
          { name: 'core', displayName: 'Core Endurance', subAreas: ['lower_abs'] },
        ],
      },
      saturday: { name: 'Recreational Activity / Rest', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest & Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'longevity-upper-lower-4day',
    name: 'Upper / Lower Longevity — 4-Day',
    category: 'longevity',
    goal: 'General Fitness & Longevity',
    daysPerWeek: 4,
    experienceLevel: 'All Levels',
    equipment: 'Full Gym / Home Gym',
    shortDescription: 'Low-stress 4-day split distributing weekly volume smoothly across Upper and Lower sessions to avoid joint overuse.',
    progressionMethodology: 'Controlled progression maintaining RPE 7-8 to optimize systemic recovery and tissue longevity.',
    setRepGuidance: '3 sets of 10-12 reps with dedicated warm-up and rotator cuff/hip stability work.',
    recoveryNotes: 'Avoid training to muscular exhaustion; prioritize fluid movement mechanics and joint integrity.',
    weeklySchedule: {
      monday: {
        name: 'Upper Body Mobility & Strength',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Chest Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Rows (Scapular Control)', subAreas: ['mid_back', 'lats'] },
          { name: 'shoulders', displayName: 'Rotator Cuff & Delts', subAreas: ['rear_delts', 'side_delts'] },
          { name: 'biceps', displayName: 'Biceps', subAreas: ['long_head_bicep'] },
        ],
      },
      tuesday: {
        name: 'Lower Body Stability & Hips',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Controlled Squats', subAreas: ['quads'] },
          { name: 'glutes', displayName: 'Hip Thrusts / Bridges', subAreas: ['glutes'] },
          { name: 'legs', displayName: 'Hamstring Curls', subAreas: ['hamstrings'] },
          { name: 'core', displayName: 'Pelvic & Core Stability', subAreas: ['lower_abs'] },
        ],
      },
      wednesday: { name: 'Rest & Gentle Walking', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Upper Body Posture & Core',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['lats'] },
          { name: 'chest', displayName: 'Incline Dumbbell Press', subAreas: ['upper_chest'] },
          { name: 'shoulders', displayName: 'Overhead Press', subAreas: ['front_delts'] },
          { name: 'triceps', displayName: 'Triceps', subAreas: ['long_head_tricep'] },
          { name: 'core', displayName: 'Obliques & Core', subAreas: ['obliques'] },
        ],
      },
      friday: {
        name: 'Lower Body Balance & Calves',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'legs', displayName: 'Split Squats / Step-Ups', subAreas: ['quads'] },
          { name: 'calves', displayName: 'Calf & Ankle Mobility', subAreas: ['calves'] },
          { name: 'core', displayName: 'Plank Endurance', subAreas: ['upper_abs'] },
        ],
      },
      saturday: { name: 'Outdoor Activity / Rest', isRest: true, muscleGroups: [] },
      sunday: { name: 'Total Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'longevity-4day-balanced',
    name: 'Four-Day Balanced Training',
    category: 'longevity',
    goal: 'General Fitness & Longevity',
    daysPerWeek: 4,
    experienceLevel: 'All Levels',
    equipment: 'Full Gym / Home Gym',
    shortDescription: 'Comprehensive 4-day athletic schedule covering Push, Pull, Legs, and Core/Mobility for well-rounded lifetime athleticism.',
    progressionMethodology: 'Progressive overload balanced across strength, joint resilience, and rotational core stability.',
    setRepGuidance: '3 sets of 8-12 reps per exercise.',
    recoveryNotes: 'Balanced split keeps individual sessions under 50 minutes to avoid high cortisol spikes.',
    weeklySchedule: {
      monday: {
        name: 'Push Focus & Chest',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Dumbbell / Machine Press', subAreas: ['mid_chest', 'upper_chest'] },
          { name: 'shoulders', displayName: 'Side Delts', subAreas: ['side_delts'] },
          { name: 'triceps', displayName: 'Triceps Pressdowns', subAreas: ['lateral_head_tricep'] },
        ],
      },
      tuesday: {
        name: 'Pull Focus & Back',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Lat Pulldowns & Rows', subAreas: ['lats', 'mid_back'] },
          { name: 'biceps', displayName: 'Bicep Curls', subAreas: ['long_head_bicep', 'short_head_bicep'] },
          { name: 'shoulders', displayName: 'Rear Delts', subAreas: ['rear_delts'] },
        ],
      },
      wednesday: { name: 'Active Recovery / Mobility', isRest: true, muscleGroups: [] },
      thursday: {
        name: 'Leg & Glute Focus',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Leg Press & Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstring Curls / RDLs', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Thrusts', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calves', subAreas: ['calves'] },
        ],
      },
      friday: {
        name: 'Core & Functional Longevity',
        isRest: false,
        muscleGroups: [
          { name: 'core', displayName: 'Core Stability & Rotation', subAreas: ['upper_abs', 'lower_abs', 'obliques'] },
          { name: 'shoulders', displayName: 'Rotator Cuff & Posture', subAreas: ['front_delts', 'side_delts'] },
          { name: 'forearms', displayName: 'Grip & Forearms', subAreas: ['forearm_flexors'] },
        ],
      },
      saturday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
      sunday: { name: 'Rest Day', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'longevity-full-body-mobility-3day',
    name: 'Full Body plus Mobility and Conditioning — 3-Day',
    category: 'longevity',
    goal: 'General Fitness & Longevity',
    daysPerWeek: 3,
    experienceLevel: 'Beginner to Intermediate',
    equipment: 'Full Gym / Dumbbells / Bands',
    shortDescription: '3 weekly sessions combining compound resistance exercises with dynamic hip/shoulder mobility flows and aerobic capacity base.',
    progressionMethodology: 'Improve active joint range of motion and core stability while incrementally loading foundational compounds.',
    setRepGuidance: '2-3 sets of 10-15 reps with mobility transitions.',
    recoveryNotes: 'Focus on breathing, nasal aerobic capacity, and joint decompression on rest days.',
    weeklySchedule: {
      monday: {
        name: 'Full Body Strength & Hip Mobility',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Squats (Hip Mobility)', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Chest Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Rows', subAreas: ['lats'] },
          { name: 'core', displayName: 'Core Bracing', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: { name: 'Rest / Walking', isRest: true, muscleGroups: [] },
      wednesday: {
        name: 'Full Body Hinge & Shoulder Flow',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Hinges / Deadlifts', subAreas: ['hamstrings'] },
          { name: 'shoulders', displayName: 'Overhead / Scapular Work', subAreas: ['side_delts'] },
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['upper_back'] },
          { name: 'core', displayName: 'Obliques & Side Planks', subAreas: ['obliques'] },
        ],
      },
      thursday: { name: 'Rest / Mobility Flow', isRest: true, muscleGroups: [] },
      friday: {
        name: 'Full Body Functional Movement',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Step-Ups & Lunges', subAreas: ['quads', 'glutes'] },
          { name: 'chest', displayName: 'Incline Press / Push-ups', subAreas: ['upper_chest'] },
          { name: 'biceps', displayName: 'Arms', subAreas: ['long_head_bicep'] },
          { name: 'core', displayName: 'Abdominal Endurance', subAreas: ['lower_abs'] },
        ],
      },
      saturday: { name: 'Active Recovery', isRest: true, muscleGroups: [] },
      sunday: { name: 'Total Recovery', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'longevity-5day-balanced',
    name: 'Balanced Strength, Mobility & Conditioning — 5-Day',
    category: 'longevity',
    goal: 'General Fitness & Longevity',
    daysPerWeek: 5,
    experienceLevel: 'All Levels',
    equipment: 'Gym / Free Weights & Cables',
    shortDescription: 'Balanced 5-day longevity plan distributing upper and lower resistance training with dedicated Zone 2 aerobic base work and mobility flows to support healthspan, joint durability, and lifelong fitness.',
    progressionMethodology: 'Healthspan Quality Progression: Prioritize smooth movement cadence (3-second eccentrics, 1-second pause in full stretch) and joint comfort. Add weight only when all sets are performed with zero joint strain at RPE 7-8.',
    setRepGuidance: 'Resistance: 3 sets of 10-12 controlled reps. Cardio: 25-35 minutes continuous Zone 2 (conversational pace).',
    recoveryNotes: 'Includes Saturday and Sunday for family, outdoor recreational walking, and deep sleep recovery.',
    weeklySchedule: {
      monday: {
        name: 'Upper Body Strength & Scapular Control',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Dumbbell Flat Press', subAreas: ['mid_chest'] },
          { name: 'back', displayName: 'Cable Neutral-Grip Rows', subAreas: ['lats', 'upper_back'] },
          { name: 'shoulders', displayName: 'Face Pulls & External Rotation', subAreas: ['rear_delts'] },
          { name: 'core', displayName: 'Anti-Extension Plank', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Lower Body Knee & Hip Stability',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Goblet Squats (Full Depth)', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Romanian Deadlifts (Tempo)', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Bridges / Hip Abduction', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calf & Tibialis Strength', subAreas: ['calves'] },
        ],
      },
      wednesday: {
        name: 'Zone 2 Cardiovascular Base & Core Flow',
        isRest: false,
        muscleGroups: [
          { name: 'core', displayName: 'Paloff Press & Core Bracing', subAreas: ['obliques'] },
          { name: 'core', displayName: 'Deadbugs & Bird Dogs', subAreas: ['lower_abs'] },
          { name: 'back', displayName: 'Thoracic Mobility & Hangs', subAreas: ['lats'] },
        ],
      },
      thursday: {
        name: 'Upper Body Posture & Back Durability',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['lats'] },
          { name: 'chest', displayName: 'Incline Push-Ups / Dumbbell Press', subAreas: ['upper_chest'] },
          { name: 'shoulders', displayName: 'Overhead Dumbbell Press', subAreas: ['front_delts'] },
          { name: 'biceps', displayName: 'Biceps & Triceps Longevity', subAreas: ['long_head_bicep'] },
        ],
      },
      friday: {
        name: 'Lower Body Foot, Ankle & Leg Strength',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Step-Ups / Bulgarian Split Squat', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Hamstring Curls', subAreas: ['hamstrings'] },
          { name: 'calves', displayName: 'Standing Calf Raises', subAreas: ['calves'] },
          { name: 'core', displayName: 'Farmer Carries / Grip', subAreas: ['upper_abs'] },
        ],
      },
      saturday: { name: 'Gentle Walk / Mobility Restoration', isRest: true, muscleGroups: [] },
      sunday: { name: 'Full Recovery & Family Time', isRest: true, muscleGroups: [] },
    },
  },
  {
    id: 'longevity-6day-varied-longevity',
    name: 'Varied Movement, Durability & Longevity — 6-Day',
    category: 'longevity',
    goal: 'General Fitness & Longevity',
    daysPerWeek: 6,
    experienceLevel: 'All Levels',
    equipment: 'Gym / Free Weights / Bodyweight',
    shortDescription: 'High-frequency, low-fatigue 6-day split designed to maintain daily active movement habits, joint mobility, cardiovascular health, and bone mineral density without chronic soreness or burnout.',
    progressionMethodology: 'Daily Movement Waves: Keeps systemic fatigue very low by keeping daily volume moderate (3-4 exercises) and strictly stopping sets 2-3 reps before failure. Focus on daily consistency and movement variety.',
    setRepGuidance: 'Resistance: 2-3 sets of 10-12 reps at RPE 7-8. Cardio/Mobility: 25-35 minutes low-impact steady state (Zone 2).',
    recoveryNotes: 'Because fatigue is distributed lightly across 6 days, soreness is minimal. Sunday is dedicated to total rest and mental decompression.',
    weeklySchedule: {
      monday: {
        name: 'Upper Push & Rotator Cuff Durability',
        isRest: false,
        muscleGroups: [
          { name: 'chest', displayName: 'Dumbbell Chest Press', subAreas: ['mid_chest'] },
          { name: 'shoulders', displayName: 'Dumbbell Lateral Raises', subAreas: ['side_delts'] },
          { name: 'triceps', displayName: 'Rope Tricep Extensions', subAreas: ['lateral_head_tricep'] },
          { name: 'core', displayName: 'Plank Holds', subAreas: ['upper_abs'] },
        ],
      },
      tuesday: {
        name: 'Upper Pull & Spine Health',
        isRest: false,
        muscleGroups: [
          { name: 'back', displayName: 'Chest-Supported Rows', subAreas: ['upper_back'] },
          { name: 'back', displayName: 'Lat Pulldowns', subAreas: ['lats'] },
          { name: 'biceps', displayName: 'Dumbbell Curls', subAreas: ['long_head_bicep'] },
          { name: 'shoulders', displayName: 'Rear Delt Flyes', subAreas: ['rear_delts'] },
        ],
      },
      wednesday: {
        name: 'Lower Body Hip/Knee Longevity',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Full Range Goblet Squats', subAreas: ['quads'] },
          { name: 'legs', displayName: 'Romanian Deadlifts', subAreas: ['hamstrings'] },
          { name: 'glutes', displayName: 'Glute Hip Thrusts', subAreas: ['glutes'] },
          { name: 'calves', displayName: 'Calf Raises', subAreas: ['calves'] },
        ],
      },
      thursday: {
        name: 'Zone 2 Cardiovascular Foundation & Core',
        isRest: false,
        muscleGroups: [
          { name: 'core', displayName: 'Anti-Rotation Core (Paloff)', subAreas: ['obliques'] },
          { name: 'core', displayName: 'Deadbugs & Bird Dogs', subAreas: ['lower_abs'] },
          { name: 'back', displayName: 'Hangs & Postural Stretch', subAreas: ['lats'] },
        ],
      },
      friday: {
        name: 'Functional Full Body Resistance',
        isRest: false,
        muscleGroups: [
          { name: 'legs', displayName: 'Dumbbell Lunges / Split Squats', subAreas: ['quads'] },
          { name: 'chest', displayName: 'Incline Dumbbell Press', subAreas: ['upper_chest'] },
          { name: 'back', displayName: 'Seated Cable Rows', subAreas: ['mid_back'] },
          { name: 'core', displayName: 'Suitcase Carries', subAreas: ['obliques'] },
        ],
      },
      saturday: {
        name: 'Lower Body Balance, Glutes & Durability',
        isRest: false,
        muscleGroups: [
          { name: 'glutes', displayName: 'Glute Kickbacks / Abductions', subAreas: ['glutes'] },
          { name: 'legs', displayName: 'Hamstring Curls', subAreas: ['hamstrings'] },
          { name: 'legs', displayName: 'Leg Press (Moderate Load)', subAreas: ['quads'] },
          { name: 'calves', displayName: 'Standing Calf Raises', subAreas: ['calves'] },
        ],
      },
      sunday: { name: 'Total Rest & Nervous System Reset', isRest: true, muscleGroups: [] },
    },
  },
];

/**
 * Recommends an optimal training template based on user goals, training frequency,
 * experience level, and equipment preference.
 */
export function getRecommendedTemplate(
  goal?: string,
  daysPerWeek?: number,
  _experienceLevel?: string,
  _equipmentPreference?: string
): WorkoutTemplate {
  const normalizedGoal = (goal || '').toLowerCase();
  const days = daysPerWeek || 4;

  if (normalizedGoal.includes('hypertrophy') || normalizedGoal.includes('muscle')) {
    if (days >= 6) return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-ppl-6day')!;
    if (days === 5) return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-bro-split-5day')!;
    if (days === 4) return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-upper-lower-4day')!;
    return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-full-body-3day') || WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-ppl-3day')!;
  }

  if (normalizedGoal.includes('strength') || normalizedGoal.includes('power')) {
    if (days >= 6) return WORKOUT_TEMPLATES.find((t) => t.id === 'strength-6day-high-frequency')!;
    if (days === 5) return WORKOUT_TEMPLATES.find((t) => t.id === 'strength-5day-powerbuilding')!;
    if (days === 4) return WORKOUT_TEMPLATES.find((t) => t.id === 'strength-531-inspired-4day')!;
    return WORKOUT_TEMPLATES.find((t) => t.id === 'strength-texas-method-3day') || WORKOUT_TEMPLATES.find((t) => t.id === 'strength-full-body-3day')!;
  }

  if (normalizedGoal.includes('fat') || normalizedGoal.includes('conditioning') || normalizedGoal.includes('loss')) {
    if (days >= 6) return WORKOUT_TEMPLATES.find((t) => t.id === 'fatloss-6day-athletic-conditioning')!;
    if (days === 5) return WORKOUT_TEMPLATES.find((t) => t.id === 'fatloss-5day-metabolic-split')!;
    if (days === 4) return WORKOUT_TEMPLATES.find((t) => t.id === 'fatloss-upper-lower-conditioning-4day')!;
    return WORKOUT_TEMPLATES.find((t) => t.id === 'fatloss-full-body-resistance-3day') || WORKOUT_TEMPLATES.find((t) => t.id === 'fatloss-full-body-conditioning-3day')!;
  }

  if (normalizedGoal.includes('longevity') || normalizedGoal.includes('general') || normalizedGoal.includes('health')) {
    if (days >= 6) return WORKOUT_TEMPLATES.find((t) => t.id === 'longevity-6day-varied-longevity')!;
    if (days === 5) return WORKOUT_TEMPLATES.find((t) => t.id === 'longevity-5day-balanced')!;
    if (days === 4) return WORKOUT_TEMPLATES.find((t) => t.id === 'longevity-upper-lower-4day') || WORKOUT_TEMPLATES.find((t) => t.id === 'longevity-4day-balanced')!;
    return WORKOUT_TEMPLATES.find((t) => t.id === 'longevity-full-body-3day')!;
  }

  // Default fallback matching days
  if (days >= 6) return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-ppl-6day')!;
  if (days === 5) return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-bro-split-5day')!;
  if (days === 4) return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-upper-lower-4day')!;
  return WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-full-body-3day') || WORKOUT_TEMPLATES.find((t) => t.id === 'hypertrophy-ppl-3day')!;
}

export function getTemplateById(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByGoal(goal: string): WorkoutTemplate[] {
  const norm = goal.toLowerCase();
  return WORKOUT_TEMPLATES.filter((t) => t.goal.toLowerCase().includes(norm));
}

export function getTemplatesByDays(days: number): WorkoutTemplate[] {
  return WORKOUT_TEMPLATES.filter((t) => t.daysPerWeek === days);
}

export function goalToCategory(goal?: string): 'hypertrophy' | 'strength' | 'fat_loss' | 'longevity' {
  if (!goal) return 'hypertrophy';
  const g = goal.toLowerCase();
  if (g.includes('strength') || g.includes('power')) return 'strength';
  if (g.includes('fat') || g.includes('conditioning') || g.includes('loss')) return 'fat_loss';
  if (g.includes('longevity') || g.includes('health') || g.includes('general')) return 'longevity';
  return 'hypertrophy';
}
