/**
 * GymTrackie — Phase 6: Adaptive Weekly Coaching & Insights Engine
 *
 * Deterministic utility that derives personalized weekly coaching from:
 * 1. User's active training split and planned days (WeeklySchedule)
 * 2. Real verified completed strength sessions (status === 'completed')
 * 3. Cardio sessions and weekly cardio goals
 * 4. Anatomical muscle group coverage and recency
 * 5. Week-over-week trends without misleading percentages or division by zero
 * 6. Recovery awareness without medical/biological diagnostic overclaims
 *
 * All recommendations are deterministic, evidence-backed, and capped at 3 prioritized steps.
 */

import {
  WorkoutSession,
  WeeklySchedule,
  DayOfWeek,
  MuscleGroup,
  PersonalRecord,
  CardioSession,
  CardioWeeklyGoalSettings,
} from '../types';
import {
  getMondayOfWeek,
  getSundayOfWeek,
  STANDARD_MUSCLE_GROUPS,
} from './analyticsEngine';
import { calculateCardioWeeklyProgress, DEFAULT_CARDIO_GOALS } from './cardioGoals';
import { parseLocalDate, formatDayName } from './formatters';

export type CoachingPriority = 'high' | 'medium' | 'low';

export type CoachingCategory =
  | 'schedule_adherence'
  | 'muscle_balance'
  | 'recovery'
  | 'cardio_goal'
  | 'progressive_overload'
  | 'milestone';

export interface ActionableCoachingStep {
  id: string;
  category: CoachingCategory;
  priority: CoachingPriority;
  title: string;
  rationale: string;
  actionLabel?: string;
  actionRoute?: string;
  actionType?: 'start_workout' | 'view_plan' | 'view_progress' | 'log_cardio';
}

export type DayScheduleStatus = 'completed' | 'today' | 'upcoming' | 'missed' | 'rest';

export interface DayScheduleAudit {
  day: DayOfWeek;
  dayName: string;
  dayDate: Date;
  isRest: boolean;
  scheduledWorkoutName?: string;
  scheduledMuscleGroups: MuscleGroup[];
  status: DayScheduleStatus;
  completedSessionId?: string;
}

export interface WeeklyTrainingOverview {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  plannedStrengthDays: number;
  completedStrengthDays: number;
  completedStrengthWorkouts: number;
  totalStrengthVolumeKg: number;
  totalStrengthSets: number;
  strengthAdherencePercent: number;

  cardioSessionsCount: number;
  cardioDurationMinutes: number;
  cardioDurationFormatted: string;
  cardioDistanceKm: number;
  cardioGoalsSummary?: {
    activeGoalsCount: number;
    completedGoalsCount: number;
    durationProgressPercent: number;
    durationRemainingMinutes: number;
    sessionsProgressPercent: number;
    sessionsRemainingCount: number;
  };

  weekOverWeek: {
    hasBaseline: boolean;
    volumeDeltaPercent: number | null;
    volumeDeltaKg: number;
    strengthWorkoutsDelta: number;
    cardioDurationDeltaMinutes: number;
    cardioDurationDeltaPercent: number | null;
  };

  topAchievement?: {
    title: string;
    description: string;
    badge: string;
  };
}

export interface MuscleCoverageStatus {
  muscleGroup: MuscleGroup;
  label: string;
  isScheduledInSplit: boolean;
  lastTrainedDate: string | null;
  daysSinceLastTrained: number | null;
  status:
    | 'recently_trained'
    | 'in_recovery'
    | 'upcoming_scheduled'
    | 'needs_attention'
    | 'not_in_split';
  nextScheduledDay?: DayOfWeek;
}

export interface RecoveryAlert {
  type: 'rest_day' | 'high_frequency' | 'active_recovery';
  title: string;
  message: string;
}

export interface WeeklyCoachingReport {
  generatedAt: string;
  fitnessGoal: string;
  overview: WeeklyTrainingOverview;
  scheduleAudit: DayScheduleAudit[];
  muscleCoverage: MuscleCoverageStatus[];
  recoveryAlerts: RecoveryAlert[];
  actionableSteps: ActionableCoachingStep[];
  hasSufficientData: boolean;
}

export interface WeeklyCoachingContext {
  userId?: string;
  history: WorkoutSession[];
  cardioSessions?: CardioSession[];
  weeklyPlan: WeeklySchedule;
  cardioGoals?: CardioWeeklyGoalSettings;
  fitnessGoal?: string;
  experienceLevel?: string;
  equipmentPreference?: string;
  trainingDaysPerWeek?: number;
  personalRecords?: PersonalRecord[];
  referenceDate?: Date;
}

const formatMuscleName = (m: MuscleGroup): string => {
  return m.charAt(0).toUpperCase() + m.slice(1);
};

const ORDERED_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Returns Monday-Sunday week boundaries and human-readable label.
 */
export function getCalendarWeekRange(refDate: Date = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  const start = getMondayOfWeek(refDate);
  const end = getSundayOfWeek(start);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();

  const label =
    startMonth === endMonth
      ? `${startMonth} ${startDay} – ${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  return { start, end, label };
}

/**
 * Formats duration in minutes to e.g. "1h 30m" or "45m".
 */
function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
}

/**
 * Derives comprehensive weekly coaching insights.
 */
export function deriveWeeklyCoaching(context: WeeklyCoachingContext): WeeklyCoachingReport {
  const refDate = context.referenceDate ? new Date(context.referenceDate) : new Date();
  const fitnessGoal = (context.fitnessGoal || 'hypertrophy').toLowerCase();

  // 1. Calendar week boundaries (Current week vs Previous week)
  const currentWeek = getCalendarWeekRange(refDate);
  const prevWeekRef = new Date(currentWeek.start);
  prevWeekRef.setDate(prevWeekRef.getDate() - 3); // Lands in previous week
  const previousWeek = getCalendarWeekRange(prevWeekRef);

  const curStartMs = currentWeek.start.getTime();
  const curEndMs = currentWeek.end.getTime();
  const prevStartMs = previousWeek.start.getTime();
  const prevEndMs = previousWeek.end.getTime();

  // 2. Filter completed strength sessions strictly
  const rawHistory = Array.isArray(context.history) ? context.history : [];
  const completedStrength = rawHistory.filter((h) => h && h.status === 'completed');

  const curStrengthSessions = completedStrength.filter((s) => {
    const d = parseLocalDate(s.completedAt || s.date);
    const ms = d.getTime();
    return !isNaN(ms) && ms >= curStartMs && ms <= curEndMs;
  });

  const prevStrengthSessions = completedStrength.filter((s) => {
    const d = parseLocalDate(s.completedAt || s.date);
    const ms = d.getTime();
    return !isNaN(ms) && ms >= prevStartMs && ms <= prevEndMs;
  });

  // Calculate distinct strength training days in current week
  const curStrengthDayKeys = new Set<string>();
  let curStrengthVolume = 0;
  let curStrengthSets = 0;

  for (const s of curStrengthSessions) {
    const d = parseLocalDate(s.completedAt || s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    curStrengthDayKeys.add(key);
    curStrengthVolume += Number(s.totalVolume) || 0;
    curStrengthSets += Number(s.totalSets) || 0;
  }

  // Previous week volume & sets
  let prevStrengthVolume = 0;
  let prevStrengthDaysCount = 0;
  const prevStrengthDayKeys = new Set<string>();
  for (const s of prevStrengthSessions) {
    const d = parseLocalDate(s.completedAt || s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    prevStrengthDayKeys.add(key);
    prevStrengthVolume += Number(s.totalVolume) || 0;
  }
  prevStrengthDaysCount = prevStrengthDayKeys.size;

  // 3. Weekly Schedule Audit (Distinguish rest, completed, today, upcoming, missed)
  const weeklyPlan = context.weeklyPlan || ({} as WeeklySchedule);
  const scheduleAudit: DayScheduleAudit[] = [];

  // Determine today's day index (0 = Monday ... 6 = Sunday)
  const refDayIndex = (refDate.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  let plannedStrengthDays = 0;

  for (let i = 0; i < ORDERED_DAYS.length; i++) {
    const day = ORDERED_DAYS[i];
    const cfg = weeklyPlan[day];
    const isRest = !cfg || Boolean(cfg.isRest);

    if (!isRest) {
      plannedStrengthDays++;
    }

    // Exact calendar date for this day in the current week
    const dayDate = new Date(currentWeek.start);
    dayDate.setDate(currentWeek.start.getDate() + i);

    const dayStartMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
    const dayEndMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).getTime();

    // Check if user completed a session on this calendar day
    const matchingSession = curStrengthSessions.find((s) => {
      const sDate = parseLocalDate(s.completedAt || s.date);
      const sMs = sDate.getTime();
      return sMs >= dayStartMs && sMs <= dayEndMs;
    });

    let status: DayScheduleStatus = 'upcoming';

    if (isRest) {
      status = 'rest';
    } else if (matchingSession) {
      status = 'completed';
    } else if (i < refDayIndex) {
      // Past day in the current week without a completed workout = genuinely missed
      status = 'missed';
    } else if (i === refDayIndex) {
      status = 'today';
    } else {
      status = 'upcoming';
    }

    const scheduledMuscles: MuscleGroup[] = [];
    if (cfg && Array.isArray(cfg.muscleGroups)) {
      for (const mg of cfg.muscleGroups) {
        if (mg && mg.name) {
          scheduledMuscles.push(mg.name.toLowerCase() as MuscleGroup);
        }
      }
    }

    scheduleAudit.push({
      day,
      dayName: formatDayName(day),
      dayDate,
      isRest,
      scheduledWorkoutName: cfg?.name,
      scheduledMuscleGroups: scheduledMuscles,
      status,
      completedSessionId: matchingSession?.id,
    });
  }

  // Fallback if plannedStrengthDays is 0
  const effectivePlannedDays = plannedStrengthDays > 0 ? plannedStrengthDays : 4;
  const completedStrengthDays = curStrengthDayKeys.size;
  const strengthAdherencePercent = Math.min(
    100,
    Math.round((completedStrengthDays / effectivePlannedDays) * 100)
  );

  // 4. Cardio Progress (Current week vs Previous week)
  const rawCardio = Array.isArray(context.cardioSessions) ? context.cardioSessions : [];
  const cardioGoals = context.cardioGoals || DEFAULT_CARDIO_GOALS;

  const curCardioProgress = calculateCardioWeeklyProgress(rawCardio, cardioGoals, refDate);
  const prevCardioProgress = calculateCardioWeeklyProgress(rawCardio, cardioGoals, prevWeekRef);

  // 5. Week-over-Week Deltas (Guard against division by zero and misleading percentages)
  const hasStrengthBaseline = prevStrengthVolume > 0 || prevStrengthDaysCount > 0;
  let volumeDeltaPercent: number | null = null;
  const volumeDeltaKg = Math.round(curStrengthVolume - prevStrengthVolume);

  if (prevStrengthVolume > 0) {
    volumeDeltaPercent = Math.round(((curStrengthVolume - prevStrengthVolume) / prevStrengthVolume) * 100);
  }

  const strengthWorkoutsDelta = curStrengthSessions.length - prevStrengthSessions.length;

  const curCardioDur = curCardioProgress.totalWeeklyDurationMinutes;
  const prevCardioDur = prevCardioProgress.totalWeeklyDurationMinutes;
  const cardioDurationDeltaMinutes = Math.round(curCardioDur - prevCardioDur);
  let cardioDurationDeltaPercent: number | null = null;
  if (prevCardioDur > 0) {
    cardioDurationDeltaPercent = Math.round(((curCardioDur - prevCardioDur) / prevCardioDur) * 100);
  }

  // 6. Top Achievement Identification
  let topAchievement: WeeklyTrainingOverview['topAchievement'] | undefined;

  // Check recent PR in the current week
  const prs = Array.isArray(context.personalRecords) ? context.personalRecords : [];
  const curWeekPR = prs.find((p) => {
    if (!p || !p.date) return false;
    const pDate = new Date(p.date).getTime();
    return !isNaN(pDate) && pDate >= curStartMs && pDate <= curEndMs;
  });

  if (curWeekPR) {
    topAchievement = {
      title: `Personal Record: ${curWeekPR.exerciseName}`,
      description: `Surpassed previous working load with ${curWeekPR.weight} kg on ${curWeekPR.exerciseName}.`,
      badge: 'PR Achievement',
    };
  } else if (strengthAdherencePercent === 100 && completedStrengthDays >= effectivePlannedDays) {
    topAchievement = {
      title: 'Flawless Split Adherence',
      description: `Completed 100% of planned strength sessions (${completedStrengthDays}/${effectivePlannedDays} days) this week.`,
      badge: 'Split Champion',
    };
  } else if (curCardioProgress.allCompleted && curCardioProgress.activeCount > 0) {
    topAchievement = {
      title: 'Cardio Goals Reached',
      description: `Achieved all active cardio targets with ${formatMinutes(curCardioDur)} logged.`,
      badge: 'Conditioning Milestone',
    };
  } else if (volumeDeltaPercent !== null && volumeDeltaPercent > 10) {
    topAchievement = {
      title: 'Volume Progression',
      description: `Weekly volume increased by +${volumeDeltaPercent}% (+${volumeDeltaKg.toLocaleString()} kg) compared to last week.`,
      badge: 'Overload Momentum',
    };
  } else if (completedStrengthDays > 0) {
    topAchievement = {
      title: 'Consistent Training',
      description: `Logged ${completedStrengthDays} strength workout day${completedStrengthDays > 1 ? 's' : ''} on schedule this week.`,
      badge: 'Active Routine',
    };
  }

  // 7. Muscle Coverage and Training Balance
  // Map scheduled muscles across split
  const scheduledMusclesSet = new Set<string>();
  const nextScheduledMap = new Map<string, DayOfWeek>();

  // Scan future days first to map when muscles are next scheduled
  for (let offset = 0; offset < 7; offset++) {
    const dayIdx = (refDayIndex + offset) % 7;
    const dayName = ORDERED_DAYS[dayIdx];
    const cfg = weeklyPlan[dayName];
    if (cfg && !cfg.isRest && Array.isArray(cfg.muscleGroups)) {
      for (const mg of cfg.muscleGroups) {
        if (mg && mg.name) {
          const lower = mg.name.toLowerCase();
          scheduledMusclesSet.add(lower);
          if (!nextScheduledMap.has(lower)) {
            nextScheduledMap.set(lower, dayName);
          }
        }
      }
    }
  }

  // Check last trained date per standard muscle group
  const muscleCoverage: MuscleCoverageStatus[] = [];

  for (const std of STANDARD_MUSCLE_GROUPS) {
    const isScheduled = scheduledMusclesSet.has(std.key);

    // Find the latest completed session in history containing this muscle
    let latestTrainedDate: Date | null = null;
    for (const s of completedStrength) {
      if (!Array.isArray(s.exercises)) continue;
      const sessionDate = parseLocalDate(s.completedAt || s.date);
      if (isNaN(sessionDate.getTime())) continue;

      let trainedInSession = false;
      // Direct session muscle group or exercise primary muscle
      if (Array.isArray(s.muscleGroups) && s.muscleGroups.map((m) => m.toLowerCase()).includes(std.key)) {
        trainedInSession = true;
      } else {
        for (const exItem of s.exercises) {
          const exDef = exItem.exercise;
          const p = (exDef?.primaryMuscle || (exItem as any).primaryMuscle || '').toLowerCase();
          if (p === std.key || (std.key === 'legs' && (p === 'quads' || p === 'hamstrings'))) {
            trainedInSession = true;
            break;
          }
        }
      }

      if (trainedInSession) {
        if (!latestTrainedDate || sessionDate.getTime() > latestTrainedDate.getTime()) {
          latestTrainedDate = sessionDate;
        }
      }
    }

    let daysSinceLastTrained: number | null = null;
    if (latestTrainedDate) {
      const diffMs = refDate.getTime() - latestTrainedDate.getTime();
      daysSinceLastTrained = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    let status: MuscleCoverageStatus['status'] = 'not_in_split';
    const nextDay = nextScheduledMap.get(std.key);

    if (!isScheduled) {
      status = 'not_in_split';
    } else if (daysSinceLastTrained !== null && daysSinceLastTrained <= 1) {
      // Trained today or yesterday -> in recovery window
      status = 'in_recovery';
    } else if (daysSinceLastTrained !== null && daysSinceLastTrained <= 3) {
      status = 'recently_trained';
    } else if (nextDay && nextDay !== ORDERED_DAYS[refDayIndex]) {
      // Scheduled on an upcoming day this week -> NOT a gap
      status = 'upcoming_scheduled';
    } else if (daysSinceLastTrained === null || daysSinceLastTrained >= 7) {
      // In split, but > 7 days or never trained
      status = 'needs_attention';
    } else {
      status = 'upcoming_scheduled';
    }

    muscleCoverage.push({
      muscleGroup: std.key,
      label: std.name,
      isScheduledInSplit: isScheduled,
      lastTrainedDate: latestTrainedDate ? latestTrainedDate.toISOString() : null,
      daysSinceLastTrained,
      status,
      nextScheduledDay: nextDay,
    });
  }

  // 8. Recovery-Aware Guidance
  const recoveryAlerts: RecoveryAlert[] = [];
  const todayAudit = scheduleAudit[refDayIndex];

  if (todayAudit && todayAudit.isRest) {
    recoveryAlerts.push({
      type: 'rest_day',
      title: 'Scheduled Recovery Day',
      message:
        'Today is designated as a rest day in your training schedule. Prioritize nutrition, hydration, and active recovery.',
    });
  }

  // Check if multiple heavy sessions were logged on consecutive days
  const trainedYesterday = curStrengthSessions.some((s) => {
    const sDate = parseLocalDate(s.completedAt || s.date);
    const diff = Math.floor((refDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff === 1;
  });

  const trainedToday = curStrengthSessions.some((s) => {
    const sDate = parseLocalDate(s.completedAt || s.date);
    const diff = Math.floor((refDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff === 0;
  });

  if (trainedYesterday && trainedToday) {
    recoveryAlerts.push({
      type: 'high_frequency',
      title: 'Consecutive Days Trained',
      message:
        'You have logged workouts two days in a row. Maintain proper spacing between identical muscle groups to facilitate recovery.',
    });
  }

  // 9. Actionable Next Steps (Max 3 Prioritized Recommendations)
  const candidateSteps: ActionableCoachingStep[] = [];

  // Check 1: Missed Workout in Current Week
  const missedDays = scheduleAudit.filter((d) => d.status === 'missed');
  if (missedDays.length > 0) {
    const firstMissed = missedDays[0];
    const musclesStr = firstMissed.scheduledMuscleGroups.map(formatMuscleName).join(', ');
    candidateSteps.push({
      id: `step_missed_${firstMissed.day}`,
      category: 'schedule_adherence',
      priority: 'high',
      title: `Catch Up: Missed ${firstMissed.scheduledWorkoutName || firstMissed.dayName}`,
      rationale: `${firstMissed.dayName}'s scheduled workout (${musclesStr || 'strength session'}) was missed. Prioritize completing this session or incorporating key compound exercises next.`,
      actionLabel: 'Start Workout',
      actionRoute: '/workout',
      actionType: 'start_workout',
    });
  }

  // Check 2: Today's Scheduled Session (if not done yet)
  if (todayAudit && !todayAudit.isRest && todayAudit.status === 'today') {
    const musclesStr = todayAudit.scheduledMuscleGroups.map(formatMuscleName).join(', ');
    candidateSteps.push({
      id: `step_today_${todayAudit.day}`,
      category: 'schedule_adherence',
      priority: 'high',
      title: `Today's Workout: ${todayAudit.scheduledWorkoutName || 'Scheduled Session'}`,
      rationale: `Targeting ${musclesStr || 'prescribed muscle groups'} according to your active split. Start your session to stay on track.`,
      actionLabel: 'Begin Session',
      actionRoute: '/workout',
      actionType: 'start_workout',
    });
  }

  // Check 3: Active Cardio Goal Progress
  const cardioDurItem = curCardioProgress.items.find((i) => i.type === 'duration');
  if (cardioDurItem && cardioDurItem.enabled && !cardioDurItem.isCompleted) {
    const remaining = cardioDurItem.remaining;
    candidateSteps.push({
      id: 'step_cardio_duration_goal',
      category: 'cardio_goal',
      priority: 'medium',
      title: `Cardio Goal: ${formatMinutes(remaining)} Remaining`,
      rationale: `You have completed ${formatMinutes(cardioDurItem.current)} of your ${formatMinutes(cardioDurItem.target)} weekly aerobic target (${cardioDurItem.percentage}% complete).`,
      actionLabel: 'Log Cardio',
      actionRoute: '/history',
      actionType: 'log_cardio',
    });
  } else if (cardioDurItem && cardioDurItem.enabled && cardioDurItem.isCompleted) {
    candidateSteps.push({
      id: 'step_cardio_goal_achieved',
      category: 'milestone',
      priority: 'low',
      title: 'Weekly Cardio Target Achieved',
      rationale: `You hit your weekly aerobic target with ${formatMinutes(cardioDurItem.current)} logged across ${curCardioProgress.totalWeeklySessions} session(s). Great consistency!`,
      actionLabel: 'View Analytics',
      actionRoute: '/progress',
      actionType: 'view_progress',
    });
  }

  // Check 4: Underrepresented Muscle Coverage Gap
  const underrepresented = muscleCoverage.find((m) => m.status === 'needs_attention');
  if (underrepresented) {
    const daysText = underrepresented.daysSinceLastTrained !== null
      ? `${underrepresented.daysSinceLastTrained} days`
      : 'an extended period';
    candidateSteps.push({
      id: `step_coverage_${underrepresented.muscleGroup}`,
      category: 'muscle_balance',
      priority: 'medium',
      title: `Muscle Balance: ${underrepresented.label} Coverage Gap`,
      rationale: `${underrepresented.label} has not been trained for ${daysText}. Ensure your upcoming training addresses this movement pattern to prevent imbalances.`,
      actionLabel: 'Review Split',
      actionRoute: '/workout',
      actionType: 'view_plan',
    });
  }

  // Check 5: Progressive Overload on PR
  if (curWeekPR) {
    candidateSteps.push({
      id: `step_pr_momentum_${curWeekPR.exerciseId}`,
      category: 'progressive_overload',
      priority: 'medium',
      title: `Maintain Overload on ${curWeekPR.exerciseName}`,
      rationale: `You reached a new peak of ${curWeekPR.weight} kg this week. Maintain this working weight or aim for 1 additional clean repetition in your next rotation.`,
      actionLabel: 'View Records',
      actionRoute: '/progress',
      actionType: 'view_progress',
    });
  }

  // Fallback for New or Inactive User (Empty / insufficient data)
  if (candidateSteps.length === 0) {
    if (completedStrength.length === 0 && rawCardio.length === 0) {
      candidateSteps.push({
        id: 'step_empty_user',
        category: 'schedule_adherence',
        priority: 'high',
        title: 'Complete Your First Training Session',
        rationale:
          'No completed training sessions have been recorded yet. Start your first scheduled workout to establish your baseline volume and personal records.',
        actionLabel: 'Start First Workout',
        actionRoute: '/workout',
        actionType: 'start_workout',
      });
    } else {
      candidateSteps.push({
        id: 'step_maintain_routine',
        category: 'schedule_adherence',
        priority: 'medium',
        title: 'Maintain Routine Consistency',
        rationale:
          'All scheduled sessions for the current week are up to date. Keep adhering to your planned rest and recovery intervals.',
        actionLabel: 'View Progress',
        actionRoute: '/progress',
        actionType: 'view_progress',
      });
    }
  }

  // Sort candidate steps by priority (high > medium > low) and strictly cap at 3
  const priorityScore: Record<CoachingPriority, number> = { high: 3, medium: 2, low: 1 };
  const sortedSteps = candidateSteps.sort((a, b) => priorityScore[b.priority] - priorityScore[a.priority]);
  const actionableSteps = sortedSteps.slice(0, 3);

  // 10. Assemble Overview
  const hasSufficientData = completedStrength.length > 0 || rawCardio.length > 0;

  const overview: WeeklyTrainingOverview = {
    weekLabel: currentWeek.label,
    weekStart: currentWeek.start,
    weekEnd: currentWeek.end,
    plannedStrengthDays: effectivePlannedDays,
    completedStrengthDays,
    completedStrengthWorkouts: curStrengthSessions.length,
    totalStrengthVolumeKg: Math.round(curStrengthVolume),
    totalStrengthSets: curStrengthSets,
    strengthAdherencePercent,

    cardioSessionsCount: curCardioProgress.totalWeeklySessions,
    cardioDurationMinutes: curCardioProgress.totalWeeklyDurationMinutes,
    cardioDurationFormatted: formatMinutes(curCardioProgress.totalWeeklyDurationMinutes),
    cardioDistanceKm: Math.round(curCardioProgress.totalWeeklyDistanceKm * 100) / 100,

    cardioGoalsSummary: {
      activeGoalsCount: curCardioProgress.activeCount,
      completedGoalsCount: curCardioProgress.completedCount,
      durationProgressPercent: cardioDurItem?.percentage || 0,
      durationRemainingMinutes: cardioDurItem?.remaining || 0,
      sessionsProgressPercent:
        curCardioProgress.items.find((i) => i.type === 'sessions')?.percentage || 0,
      sessionsRemainingCount:
        curCardioProgress.items.find((i) => i.type === 'sessions')?.remaining || 0,
    },

    weekOverWeek: {
      hasBaseline: hasStrengthBaseline,
      volumeDeltaPercent,
      volumeDeltaKg,
      strengthWorkoutsDelta,
      cardioDurationDeltaMinutes,
      cardioDurationDeltaPercent,
    },

    topAchievement,
  };

  return {
    generatedAt: refDate.toISOString(),
    fitnessGoal,
    overview,
    scheduleAudit,
    muscleCoverage,
    recoveryAlerts,
    actionableSteps,
    hasSufficientData,
  };
}
