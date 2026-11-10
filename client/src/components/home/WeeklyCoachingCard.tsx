import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Trophy,
  Dumbbell,
  Flame,
  ChevronRight,
  ArrowRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { deriveWeeklyCoaching, ActionableCoachingStep } from '../../utils/weeklyCoaching';
import { formatVolume } from '../../utils/formatters';
import { LogCardioModal } from '../cardio/LogCardioModal';

interface WeeklyCoachingCardProps {
  onOpenEditPlan?: () => void;
  onOpenLogCardio?: () => void;
  className?: string;
}

export const WeeklyCoachingCard: React.FC<WeeklyCoachingCardProps> = ({
  onOpenEditPlan,
  onOpenLogCardio,
  className = '',
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';

  const {
    getHistory,
    getWeeklyPlan,
    getCardioSessions,
    getPersonalRecords,
    getUserData,
    getCardioPreferences,
    getExercises,
    settings,
  } = useWorkoutStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLogCardioOpen, setIsLogCardioOpen] = useState(false);

  const history = getHistory(userId);
  const weeklyPlan = getWeeklyPlan(userId);
  const cardioSessions = getCardioSessions(userId);
  const personalRecords = getPersonalRecords(userId);
  const userData = getUserData(userId);
  const cardioGoals = userData.cardioWeeklyGoals;
  const cardioPreferences = userData.cardioPreferences || getCardioPreferences(userId);

  const coaching = useMemo(() => {
    return deriveWeeklyCoaching({
      userId,
      history,
      cardioSessions,
      weeklyPlan,
      cardioGoals,
      cardioPreferences,
      fitnessGoal: currentUser?.fitnessGoal,
      experienceLevel: currentUser?.experienceLevel,
      equipmentPreference: currentUser?.equipmentPreference,
      trainingDaysPerWeek: currentUser?.trainingDaysPerWeek,
      personalRecords,
      exercises: getExercises(userId),
      equipmentIncrements: settings?.equipmentIncrements,
    });
  }, [
    userId,
    history,
    cardioSessions,
    weeklyPlan,
    cardioGoals,
    cardioPreferences,
    currentUser?.fitnessGoal,
    currentUser?.experienceLevel,
    currentUser?.equipmentPreference,
    currentUser?.trainingDaysPerWeek,
    personalRecords,
    getExercises,
    settings?.equipmentIncrements,
  ]);

  const { overview, actionableSteps, recoveryAlerts, muscleCoverage } = coaching;

  const handleActionClick = (step: ActionableCoachingStep) => {
    if (step.actionType === 'view_plan' && onOpenEditPlan) {
      onOpenEditPlan();
      return;
    }
    if (step.actionType === 'log_cardio') {
      if (onOpenLogCardio) {
        onOpenLogCardio();
      } else {
        setIsLogCardioOpen(true);
      }
      return;
    }
    if (step.actionRoute) {
      navigate(step.actionRoute);
    }
  };

  const coverageGaps = muscleCoverage.filter((m) => m.status === 'needs_attention');
  const isFatLoss =
    (currentUser?.fitnessGoal || '').toLowerCase().includes('fat') ||
    (currentUser?.fitnessGoal || '').toLowerCase().includes('loss') ||
    (currentUser?.fitnessGoal || '').toLowerCase().includes('conditioning');

  return (
    <Card
      className={`w-full p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm space-y-4 ${className}`}
    >
      {/* 1. Card Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">
                Weekly Coaching
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {overview.weekLabel}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/progress')}
          className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
        >
          <span>Progress</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Top Weekly Achievement Banner (if exists) */}
      {overview.topAchievement && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-[var(--text-main)] truncate">
                {overview.topAchievement.title}
              </h4>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {overview.topAchievement.badge}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              {overview.topAchievement.description}
            </p>
          </div>
        </div>
      )}

      {/* 3. High-Level Training Balance (3-box metric summary) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Box A: Strength Adherence */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center flex flex-col justify-between">
          <div className="text-[9px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Dumbbell className="w-3 h-3 text-[var(--primary)]" />
            Strength
          </div>
          <div className="text-sm sm:text-base font-black text-[var(--text-main)] my-0.5">
            {overview.completedStrengthDays}/{overview.plannedStrengthDays} <span className="text-[10px] text-[var(--text-secondary)] font-normal">days</span>
          </div>
          <div className="text-[10px] font-semibold text-emerald-400">
            {overview.strengthAdherencePercent}% planned
          </div>
        </div>

        {/* Box B: Strength Volume */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-center flex flex-col justify-between">
          <div className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Volume</div>
          <div className="text-sm sm:text-base font-black text-[var(--text-main)] my-0.5 truncate">
            {formatVolume(overview.totalStrengthVolumeKg)} <span className="text-[10px] text-[var(--text-secondary)] font-normal">kg</span>
          </div>
          <div className="text-[10px] font-semibold text-[var(--text-secondary)] truncate">
            {overview.weekOverWeek.hasBaseline &&
            overview.weekOverWeek.volumeDeltaPercent !== null &&
            (overview.completedStrengthDays >= overview.plannedStrengthDays ||
              overview.weekOverWeek.volumeDeltaPercent >= 0) ? (
              <span
                className={
                  overview.weekOverWeek.volumeDeltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                {overview.weekOverWeek.volumeDeltaPercent >= 0 ? '+' : ''}
                {overview.weekOverWeek.volumeDeltaPercent}% vs last wk
              </span>
            ) : (
              `${overview.totalStrengthSets} sets logged`
            )}
          </div>
        </div>

        {/* Box C: Cardio Conditioning */}
        <div
          className={`border rounded-xl p-2.5 text-center flex flex-col justify-between ${
            isFatLoss
              ? 'bg-orange-500/5 border-orange-500/35 shadow-xs'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
          }`}
        >
          <div className="text-[9px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            Cardio
          </div>
          <div className="text-sm sm:text-base font-black text-[var(--text-main)] my-0.5 truncate">
            {overview.cardioDurationFormatted}
          </div>
          <div className="text-[10px] font-semibold text-orange-400 truncate">
            {overview.cardioSessionsCount} session{overview.cardioSessionsCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* 4. Actionable Next Steps (Max 3 Prioritized Recommendations) */}
      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
          <span>Priority Action Steps</span>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">
            {actionableSteps.length} recommendation{actionableSteps.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-2">
          {actionableSteps.map((step) => {
            const isHigh = step.priority === 'high';
            const isMed = step.priority === 'medium';

            const badgeBg = isHigh
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : isMed
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-blue-500/15 border-blue-500/30 text-blue-300';

            return (
              <div
                key={step.id}
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 flex flex-col justify-between gap-2.5 hover:border-[var(--primary)]/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-main)] leading-snug">
                      {step.title}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${badgeBg}`}
                    >
                      {step.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {step.rationale}
                  </p>
                </div>

                {step.actionLabel && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleActionClick(step)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Expandable Recovery & Muscle Balance Insights */}
      {(recoveryAlerts.length > 0 || coverageGaps.length > 0) && (
        <div className="pt-1 border-t border-[var(--border-subtle)]/60">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recovery & Coverage Guidance</span>
              {(recoveryAlerts.length > 0 || coverageGaps.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isExpanded && (
            <div className="space-y-2 mt-2 pt-2 border-t border-[var(--border-subtle)]/40 text-xs">
              {recoveryAlerts.map((alert, idx) => (
                <div
                  key={`rec_${idx}`}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2.5 flex items-start gap-2 text-[11px]"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[var(--text-main)] block">{alert.title}</span>
                    <span className="text-[var(--text-secondary)] leading-relaxed">
                      {alert.message}
                    </span>
                  </div>
                </div>
              ))}

              {coverageGaps.map((gap) => (
                <div
                  key={`gap_${gap.muscleGroup}`}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2.5 flex items-start gap-2 text-[11px]"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[var(--text-main)] block">
                      {gap.label} Coverage Gap
                    </span>
                    <span className="text-[var(--text-secondary)] leading-relaxed">
                      {gap.daysSinceLastTrained !== null
                        ? `Last trained ${gap.daysSinceLastTrained} days ago.`
                        : 'No recorded session in history.'}{' '}
                      Scheduled in your split; incorporate targeted sets next.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direct Cardio Logging Modal */}
      <LogCardioModal
        isOpen={isLogCardioOpen}
        onClose={() => setIsLogCardioOpen(false)}
      />
    </Card>
  );
};
