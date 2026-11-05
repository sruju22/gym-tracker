import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Clock,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { ExerciseProgressionReport } from '../../utils/progressionEngine';
import { Badge } from '../ui/Badge';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface ExerciseProgressionInsightCardProps {
  report: ExerciseProgressionReport;
  onNavigateToWorkout?: () => void;
}

export const ExerciseProgressionInsightCard: React.FC<ExerciseProgressionInsightCardProps> = ({
  report,
  onNavigateToWorkout,
}) => {
  const navigate = useNavigate();
  const [show1RMExplainer, setShow1RMExplainer] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id || 'guest';
  const appliedTarget = useWorkoutStore((s) => s.getAppliedProgressionTarget(userId, report.exerciseId));
  const applyProgressionTarget = useWorkoutStore((s) => s.applyProgressionTarget);

  const { status, recommendation, evidence, metricDeltas, latestExposure, decision } = report;

  const isStaged = Boolean(appliedTarget) || justApplied || decision?.isApplied;

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    let targetWeight: number | null = null;
    let targetReps = 10;

    if (decision) {
      if (decision.action === 'increase_weight') {
        targetWeight = decision.recommendedWeight;
      } else if (decision.action === 'reduce_load') {
        targetWeight = decision.recommendedWeight;
      } else if (decision.action === 'insufficient_data') {
        targetWeight = null;
      } else {
        // increase_reps or maintain_load
        targetWeight = decision.currentWorkingWeight > 0 ? decision.currentWorkingWeight : null;
      }
      targetReps = decision.recommendedReps;
    } else {
      targetWeight = recommendation.suggestedLoadChangeKg
        ? ((latestExposure?.topSet.weight || 0) + recommendation.suggestedLoadChangeKg)
        : (latestExposure?.topSet.weight ?? null);
      targetReps = recommendation.suggestedRepTarget || latestExposure?.topSet.reps || 10;
    }

    applyProgressionTarget(userId, report.exerciseId, targetWeight, targetReps);
    setJustApplied(true);
  };

  const handleActionClick = () => {
    if (onNavigateToWorkout) {
      onNavigateToWorkout();
    } else {
      navigate('/workout');
    }
  };

  // Status visual configurations
  const getStatusVisuals = () => {
    switch (status) {
      case 'progressing':
        return {
          icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
          badgeVariant: 'success' as const,
          badgeText: `↑ ${report.statusLabel}`,
          borderClass: 'border-emerald-500/30',
          bgClass: 'bg-emerald-500/5',
        };
      case 'potential_plateau':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          badgeVariant: 'warning' as const,
          badgeText: `⚠️ Progress May Have Slowed (${report.stallDurationSessions} workouts)`,
          borderClass: 'border-amber-500/35',
          bgClass: 'bg-amber-500/10',
        };
      case 'deload_or_regressing':
        return {
          icon: <RotateCw className="w-4 h-4 text-orange-400" />,
          badgeVariant: 'warning' as const,
          badgeText: '↓ Lighter Workout',
          borderClass: 'border-orange-500/30',
          bgClass: 'bg-orange-500/5',
        };
      case 'dormant':
        return {
          icon: <Clock className="w-4 h-4 text-neutral-400" />,
          badgeVariant: 'secondary' as const,
          badgeText: 'Not Trained Recently',
          borderClass: 'border-[var(--border-subtle)]',
          bgClass: 'bg-[var(--bg-surface)]',
        };
      case 'insufficient_data':
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-sky-400" />,
          badgeVariant: 'info' as const,
          badgeText: `${report.totalExposures}/3 Workouts Logged`,
          borderClass: 'border-[var(--border-subtle)]',
          bgClass: 'bg-[var(--bg-surface)]',
        };
    }
  };

  const visuals = getStatusVisuals();

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border ${visuals.borderClass} ${visuals.bgClass} space-y-3 transition-colors`}>
      {/* 1. Header with Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] shrink-0">
            {visuals.icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-[var(--text-main)] truncate">
              Exercise Progress & Strength Tracking
            </h4>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">
              {report.isBodyweight ? 'Bodyweight repetition-based tracking' : `Loaded exercise (${report.equipment})`}
            </div>
          </div>
        </div>

        <Badge variant={visuals.badgeVariant} size="sm" className="font-extrabold uppercase shrink-0">
          {visuals.badgeText}
        </Badge>
      </div>

      {/* 2. Top-Line Metrics Grid (3 Boxes) */}
      {latestExposure && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {/* Box A: Latest Top Working Set */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Top Set</div>
              <div className="text-xs sm:text-sm font-black text-[var(--text-main)] my-0.5 truncate">
                {latestExposure.topSet.weight > 0 ? `${latestExposure.topSet.weight} kg × ` : ''}
                {latestExposure.topSet.reps} reps
              </div>
              <div className="text-[9px] text-[var(--text-secondary)] font-medium">
                {latestExposure.completedSetsCount} sets total
              </div>
            </div>

            {/* Box B: Estimated Max Strength Indicator */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between relative group">
              <div className="flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-[var(--text-muted)]">
                <span>{report.isBodyweight ? 'Best Reps' : 'Est. Max Strength'}</span>
                {!report.isBodyweight && (
                  <button
                    type="button"
                    onClick={() => setShow1RMExplainer(!show1RMExplainer)}
                    className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors focus:outline-none cursor-pointer"
                    title="This is an estimate of the maximum weight you could lift for one rep, calculated from your recorded sets. It isn't a tested maximum."
                    aria-label="Explain Estimated Max Strength"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-xs sm:text-sm font-black text-[var(--text-main)] my-0.5 truncate">
                {report.isBodyweight ? `${latestExposure.topSet.reps} reps` : `${latestExposure.topSet.estimated1RM} kg`}
              </div>
              <div className="text-[9px] font-semibold truncate">
                {metricDeltas.estimated1RMDeltaPercent !== null ? (
                  <span className={metricDeltas.estimated1RMDeltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {metricDeltas.estimated1RMDeltaPercent >= 0 ? '+' : ''}
                    {metricDeltas.estimated1RMDeltaPercent}% baseline
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">First workout</span>
                )}
              </div>
            </div>

            {/* Box C: Workouts Logged */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Workouts Logged</div>
              <div className="text-xs sm:text-sm font-black text-[var(--text-main)] my-0.5">
                {report.totalExposures} <span className="text-[10px] text-[var(--text-secondary)] font-normal">workout{report.totalExposures === 1 ? '' : 's'}</span>
              </div>
              <div className="text-[9px] text-[var(--text-secondary)] font-medium">
                {report.daysSinceLastPerformed !== null
                  ? report.daysSinceLastPerformed === 0
                    ? 'Trained today'
                    : `${report.daysSinceLastPerformed}d ago`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Explanatory note for Estimated Max Strength (toggled by user or shown on click) */}
          {show1RMExplainer && (
            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--primary)]/30 text-[11px] text-[var(--text-secondary)] leading-relaxed flex items-start gap-2 animate-fadeIn">
              <Info className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-[var(--text-main)]">Estimated Max Strength: </span>
                This is an estimate of the maximum weight you could lift for one rep, calculated from your recorded sets. It isn't a tested maximum.
              </div>
              <button
                type="button"
                onClick={() => setShow1RMExplainer(false)}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] px-1 cursor-pointer"
                aria-label="Dismiss note"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Evidence-Based Diagnostic Explanation */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
        <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
          <span>{evidence.headline}</span>
        </div>
        {evidence.details.map((detail, idx) => (
          <p key={idx} className="text-[11px] text-[var(--text-secondary)] pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-[var(--text-muted)]">
            {detail}
          </p>
        ))}
      </div>

      {/* 4. Actionable Progression Recommendation */}
      <div className="bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent border border-[var(--primary)]/25 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
              {decision?.title || recommendation.title}
            </span>
            {decision?.action === 'increase_weight' && decision.loadChangeKg !== null && decision.loadChangeKg > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono">
                +{decision.loadChangeKg} kg step ({decision.equipmentConvention === 'per_dumbbell' && decision.equipment === 'dumbbell' ? 'each DB' : 'total'})
              </span>
            )}
            {decision?.action === 'increase_reps' && (
              <>
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono">
                  Maintain {decision.currentWorkingWeight > 0 ? `${decision.currentWorkingWeight} kg` : 'weight'} ({decision.equipmentConvention === 'per_dumbbell' && decision.equipment === 'dumbbell' ? 'each DB' : 'total'})
                </span>
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono">
                  Target: {decision.recommendedReps} reps
                </span>
              </>
            )}
            {decision?.action === 'maintain_load' && (
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-mono">
                Hold at {decision.currentWorkingWeight > 0 ? `${decision.currentWorkingWeight} kg` : 'current load'}
              </span>
            )}
            {decision?.isJumpTooLarge && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold">
                Large Jump Guardrail Active
              </span>
            )}
          </div>
          <div className="text-xs font-bold text-[var(--text-main)]">
            {decision?.actionHeadline || recommendation.actionText}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {decision?.reason || recommendation.rationale}
          </p>
        </div>

        {isStaged ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Staged for Next Session</span>
            </span>
            <button
              type="button"
              onClick={handleActionClick}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Workout</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleApplyClick}
            className="px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
          >
            <span>Apply in Workout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
