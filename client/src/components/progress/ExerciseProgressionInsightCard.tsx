import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Clock,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react';
import { ExerciseProgressionReport } from '../../utils/progressionEngine';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatVolume } from '../../utils/formatters';

interface ExerciseProgressionInsightCardProps {
  report: ExerciseProgressionReport;
  onNavigateToWorkout?: () => void;
}

export const ExerciseProgressionInsightCard: React.FC<ExerciseProgressionInsightCardProps> = ({
  report,
  onNavigateToWorkout,
}) => {
  const navigate = useNavigate();
  const { status, plateauSeverity, recommendation, evidence, metricDeltas, latestExposure, baselineExposure } = report;

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
          badgeText:
            plateauSeverity === 'confirmed'
              ? `⚠️ Confirmed Plateau (${report.stallDurationSessions} sessions)`
              : `⚠️ Potential Plateau (Watch)`,
          borderClass: 'border-amber-500/35',
          bgClass: 'bg-amber-500/10',
        };
      case 'deload_or_regressing':
        return {
          icon: <RotateCw className="w-4 h-4 text-orange-400" />,
          badgeVariant: 'warning' as const,
          badgeText: '↓ Load Adjusted',
          borderClass: 'border-orange-500/30',
          bgClass: 'bg-orange-500/5',
        };
      case 'dormant':
        return {
          icon: <Clock className="w-4 h-4 text-neutral-400" />,
          badgeVariant: 'secondary' as const,
          badgeText: 'Out of Rotation',
          borderClass: 'border-[var(--border-subtle)]',
          bgClass: 'bg-[var(--bg-surface)]',
        };
      case 'insufficient_data':
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-sky-400" />,
          badgeVariant: 'info' as const,
          badgeText: `${report.totalExposures}/3 Sessions Logged`,
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
              Smart Progression & Plateau Status
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

          {/* Box B: Estimated 1RM / Strength Indicator */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between">
            <div className="text-[9px] uppercase font-bold text-[var(--text-muted)]">
              {report.isBodyweight ? 'Best Reps' : 'Est. 1RM'}
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
                <span className="text-[var(--text-muted)]">Initial exposure</span>
              )}
            </div>
          </div>

          {/* Box C: Exposure Frequency & History */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-between">
            <div className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Exposures</div>
            <div className="text-xs sm:text-sm font-black text-[var(--text-main)] my-0.5">
              {report.totalExposures} <span className="text-[10px] text-[var(--text-secondary)] font-normal">session{report.totalExposures === 1 ? '' : 's'}</span>
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
      <div className="bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent border border-[var(--primary)]/25 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
            {recommendation.title}
          </div>
          <div className="text-xs font-bold text-[var(--text-main)]">
            {recommendation.actionText}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
            {recommendation.rationale}
          </p>
        </div>

        <button
          type="button"
          onClick={handleActionClick}
          className="px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shrink-0 cursor-pointer shadow-xs"
        >
          <span>Apply in Workout</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
