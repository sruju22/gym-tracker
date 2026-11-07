import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { RoutineProgressionSummary } from '../../utils/progressionEngine';

interface RoutinePlateauSummaryCardProps {
  summary: RoutineProgressionSummary;
  selectedExerciseId?: string;
  onSelectExercise: (exerciseId: string) => void;
  timeRange?: string;
}

export const RoutinePlateauSummaryCard: React.FC<RoutinePlateauSummaryCardProps> = ({
  summary,
  selectedExerciseId,
  onSelectExercise,
  timeRange,
}) => {
  const { progressingCount, plateauCount, plateauedExercises, topProgressingExercises } =
    summary;

  const rangeLabel =
    timeRange === '7d'
      ? '(Last 7 Days)'
      : timeRange === '30d'
      ? '(Last 30 Days)'
      : timeRange === '90d'
      ? '(Last 90 Days)'
      : timeRange === 'all'
      ? '(All Time)'
      : '';

  if (summary.totalAnalyzedExercises === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4 space-y-3">
      {/* 1. Header with Stats Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
              Your Exercise Progress
            </h4>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">
              Progress tracking across {summary.totalAnalyzedExercises} active exercises {rangeLabel}
            </div>
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{progressingCount} Making Progress</span>
          </span>

          {plateauCount > 0 ? (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{plateauCount} Check In</span>
            </span>
          ) : (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400">
              0 Stalled
            </span>
          )}
        </div>
      </div>

      {/* 2. Plateau Alerts (If any exercises have slowed progress) */}
      {plateauCount > 0 && (
        <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]/60">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Exercises Where Progress May Have Slowed ({plateauCount})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plateauedExercises.map((rep) => {
              const isSelected = rep.exerciseId === selectedExerciseId;
              const topW = rep.latestExposure?.topSet.weight ?? 0;
              const topR = rep.latestExposure?.topSet.reps ?? 0;

              return (
                <div
                  key={rep.exerciseId}
                  onClick={() => onSelectExercise(rep.exerciseId)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-xs'
                      : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-amber-500/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[var(--text-main)] truncate">
                      {rep.exerciseName}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      Same weight & reps across {rep.stallDurationSessions} workouts ({topW > 0 ? `${topW} kg × ` : ''}{topR} reps)
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-[10px] font-bold text-[var(--primary)] hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Top Progressing Highlights (If no plateaus or to celebrate wins) */}
      {plateauCount === 0 && topProgressingExercises.length > 0 && (
        <div className="pt-1 border-t border-[var(--border-subtle)]/60">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Exercises You're Improving In</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topProgressingExercises.slice(0, 4).map((rep) => (
              <button
                key={rep.exerciseId}
                type="button"
                onClick={() => onSelectExercise(rep.exerciseId)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  rep.exerciseId === selectedExerciseId
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-[var(--primary)]/40'
                }`}
              >
                <span>{rep.exerciseName}</span>
                <span className="text-[10px] text-emerald-400 font-extrabold">
                  +{rep.metricDeltas.estimated1RMDeltaPercent ?? 0}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
