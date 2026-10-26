import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
} from 'lucide-react';
import {
  AdaptiveWorkoutPlan,
  AdaptiveExerciseItem,
  acceptSuggestion,
  rejectSuggestion,
  acceptAllSuggestions,
  rejectAllSuggestions,
} from '../../utils/adaptivePlanner';
import { Button } from '../ui/Button';

interface AdaptivePlanBannerProps {
  plan: AdaptiveWorkoutPlan;
  onPlanChange: (updatedPlan: AdaptiveWorkoutPlan) => void;
  onApplyPlan: (plan: AdaptiveWorkoutPlan) => void;
  onDismiss?: () => void;
  isApplied?: boolean;
}

export const AdaptivePlanBanner: React.FC<AdaptivePlanBannerProps> = ({
  plan,
  onPlanChange,
  onApplyPlan,
  onDismiss,
  isApplied = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (plan.items.length === 0) return null;

  const acceptedCount = plan.items.filter((i) => i.status === 'accepted' || (i.status === 'suggested' && i.isBaseline)).length;
  const modificationsCount = plan.items.filter((i) => i.modificationType !== 'retained').length;

  const handleAcceptItem = (itemId: string) => {
    const updated = acceptSuggestion(plan, itemId);
    onPlanChange(updated);
  };

  const handleRejectItem = (itemId: string) => {
    const updated = rejectSuggestion(plan, itemId);
    onPlanChange(updated);
  };

  const handleAcceptAll = () => {
    const updated = acceptAllSuggestions(plan);
    onPlanChange(updated);
  };

  const handleRejectAll = () => {
    const updated = rejectAllSuggestions(plan);
    onPlanChange(updated);
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--primary-border)]/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-[var(--primary)] uppercase">
                ADAPTIVE WORKOUT PLAN
              </span>
              {modificationsCount > 0 ? (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                  {modificationsCount} {modificationsCount === 1 ? 'Adaptation' : 'Adaptations'} Proposed
                </span>
              ) : (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success-border)] shrink-0">
                  Baseline Optimized
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black text-[var(--text-main)] uppercase tracking-tight truncate">
              {plan.workoutName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse plan' : 'Expand plan'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Notes */}
      {plan.summaryNotes.length > 0 && isExpanded && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-[var(--text-secondary)] space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Info className="w-3 h-3 text-[var(--primary)]" />
            Adaptive Rationale:
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-0.5 text-[11px] leading-relaxed">
            {plan.summaryNotes.map((note, idx) => (
              <li key={idx}>
                <span className="text-[var(--text-main)] font-medium">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Plan Items List */}
      {isExpanded && (
        <div className="space-y-2.5">
          {plan.items.map((item: AdaptiveExerciseItem, idx) => {
            const isAccepted = item.status === 'accepted';
            const isRejected = item.status === 'rejected';
            const isAlternative = item.modificationType === 'alternative';

            return (
              <div
                key={item.id || idx}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isRejected
                    ? 'bg-[var(--bg-main)]/60 border-[var(--border-subtle)] opacity-60'
                    : isAlternative
                    ? 'bg-[var(--bg-card)] border-amber-500/30 shadow-xs'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 pr-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="font-extrabold text-[var(--text-main)] text-sm">
                        {item.exercise.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] capitalize font-semibold">
                        {item.exercise.primaryMuscle} • {item.exercise.equipment}
                      </span>
                      {item.exercise.isCustom && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase">
                          Custom
                        </span>
                      )}
                    </div>

                    {/* Prescribed Sets & Reps */}
                    <div className="text-[11px] font-bold text-[var(--primary)] mb-1">
                      Prescribed: {item.defaultSets} sets × {item.defaultReps} reps {item.targetRpe ? `(RPE ${item.targetRpe})` : ''}
                    </div>

                    {/* Alternative Note if replaced original baseline */}
                    {isAlternative && item.originalExercise && (
                      <div className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mb-1">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span>Proposed replacement for original: <strong className="underline">{item.originalExercise.name}</strong></span>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {item.badges.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
                        >
                          {b}
                        </span>
                      ))}
                    </div>

                    {/* Reason */}
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)]/70">
                      "{item.reason}"
                    </p>
                  </div>

                  {/* Individual Item Controls */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                    {isAlternative ? (
                      <div className="flex items-center gap-1">
                        {isAccepted ? (
                          <button
                            onClick={() => handleRejectItem(item.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-amber-500 transition-colors cursor-pointer"
                            title="Revert back to original scheduled baseline"
                          >
                            Keep Original
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAcceptItem(item.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--primary)] text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Accept</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => (isAccepted ? handleRejectItem(item.id) : handleAcceptItem(item.id))}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                          isAccepted
                            ? 'bg-[var(--success-subtle)] border-[var(--success-border)] text-[var(--success)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{isAccepted ? 'Included' : 'Exclude'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Global Toggles */}
          <div className="flex items-center justify-between text-[11px] pt-1 text-[var(--text-secondary)]">
            <button
              onClick={handleRejectAll}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Baseline Plan</span>
            </button>

            {modificationsCount > 0 && (
              <button
                onClick={handleAcceptAll}
                className="text-[var(--primary)] hover:underline font-bold cursor-pointer"
              >
                Accept All Modifications
              </button>
            )}
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      {!isApplied && (
        <div className="pt-1">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => onApplyPlan(plan)}
            className="font-extrabold flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>APPLY ADAPTIVE PLAN TO WORKOUT ({acceptedCount} EXERCISES)</span>
          </Button>
        </div>
      )}
    </div>
  );
};
