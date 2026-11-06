import React, { useState, useMemo } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Layers,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  WorkoutSession,
  Exercise,
  WeeklySchedule,
  MuscleReadinessStatus,
  MuscleIntelligenceSummary,
  MuscleIntelligenceGroupReport,
} from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { evaluateMuscleIntelligence } from '../../utils/muscleIntelligenceEngine';

interface MuscleIntelligenceCardProps {
  history: WorkoutSession[];
  exercises: Exercise[];
  weeklyPlan?: WeeklySchedule;
}

export const MuscleIntelligenceCard: React.FC<MuscleIntelligenceCardProps> = ({
  history,
  exercises,
  weeklyPlan,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeWindow, setActiveWindow] = useState<'7d' | '28d'>('7d');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showUncertainSection, setShowUncertainSection] = useState(false);

  const intelligence: MuscleIntelligenceSummary = useMemo(() => {
    return evaluateMuscleIntelligence({
      history,
      exercises,
      weeklyPlan,
      now: new Date(),
    });
  }, [history, exercises, weeklyPlan]);

  const getReadinessBadge = (status: MuscleReadinessStatus, label: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'recovering':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'fatigued':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Flame className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'dormant':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
            <Clock className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
    }
  };

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl space-y-4 shadow-sm transition-all">
      {/* Header with Expand / Collapse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-[var(--text-main)] uppercase tracking-wide">
                Muscle Intelligence & Training Balance
              </h3>
              <Badge variant="info" size="sm" className="font-bold text-[9px] uppercase tracking-wider">
                Phase 9A
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              Biomechanical contribution tiers, 28-day rolling trends & sub-region distribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* 7d vs 28d toggle */}
          <div className="inline-flex rounded-xl p-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveWindow('7d')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeWindow === '7d'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              7-Day View
            </button>
            <button
              type="button"
              onClick={() => setActiveWindow('28d')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeWindow === '28d'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              28-Day Trend
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse Muscle Intelligence' : 'Expand Muscle Intelligence'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* 1. Persistent Underexposure Alerts (Multi-Week Evidence) */}
          {intelligence.persistentUnderexposureAlerts.length > 0 && (
            <div className="space-y-2">
              {intelligence.persistentUnderexposureAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold text-amber-200">
                      Persistent Underexposure: {alert.target}
                    </div>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      {alert.evidence}
                    </p>
                    <p className="text-[10px] text-amber-400/80 font-medium">
                      💡 {alert.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Workload Density Alerts (> 10 direct sets in one session) */}
          {intelligence.workloadDensityAlerts.length > 0 && (
            <div className="space-y-2">
              {intelligence.workloadDensityAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold text-rose-200">
                      High Single-Session Workload: {alert.target}
                    </div>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">
                      {alert.evidence}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Tiered Biomechanical Model Explainer Pill */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[var(--text-main)]">Configured Biomechanical Tiers: </span>
              Prime targets contribute 1.00; major compound synergists contribute 0.70–0.75; moderate synergists contribute 0.40–0.50; stabilizers contribute 0.20–0.25. Replaces arbitrary flat multipliers with movement-specific mechanics.
            </div>
          </div>

          {/* 3.5. Unobtrusive Expandable Section for Uncertain / Heuristic Synergist Mappings */}
          {intelligence.uncertainMappings && intelligence.uncertainMappings.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-200">
                      Heuristic Synergist Estimates ({intelligence.uncertainMappings.length})
                    </span>
                    <span className="text-[11px] text-amber-300/80 block sm:inline sm:ml-2">
                      Secondary synergies utilizing standard 0.50 moderate synergist fallback
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUncertainSection(!showUncertainSection)}
                  className="text-[10.5px] font-bold text-amber-300 hover:text-amber-100 flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded bg-amber-500/20 cursor-pointer"
                >
                  {showUncertainSection ? 'Hide Details' : 'View Estimates'}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showUncertainSection ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showUncertainSection && (
                <div className="space-y-1.5 pt-1.5 border-t border-amber-500/20 animate-fadeIn">
                  {intelligence.uncertainMappings.map((u, i) => {
                    const uScore = activeWindow === '7d' ? u.estimatedStimulus7d : u.estimatedStimulus28d;
                    const uSets = activeWindow === '7d' ? u.setsRecorded7d : u.setsRecorded28d;
                    return (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-[var(--bg-card)]/80 border border-amber-500/20 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[var(--text-main)]">{u.exerciseName}</span>
                            {u.muscleGroup && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 capitalize">
                                {u.muscleGroup} synergist ({u.factor ? u.factor.toFixed(2) : '0.50'})
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{u.reason}</p>
                        </div>
                        {uSets !== undefined && uSets > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-[10.5px] font-black text-amber-300">
                              +{uScore} est.
                            </div>
                            <div className="text-[9px] text-[var(--text-muted)]">
                              {uSets} sets in {activeWindow}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Muscle Intelligence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {intelligence.groups.map((group) => {
              const hasUncertain =
                activeWindow === '7d'
                  ? group.hasUncertainContributions7d
                  : group.hasUncertainContributions28d;
              const confirmedStim =
                activeWindow === '7d'
                  ? group.confirmedStimulus7d
                  : group.confirmedAverageWeeklyStimulus28d;
              const uncertainStim =
                activeWindow === '7d'
                  ? group.uncertainStimulus7d
                  : Math.round((group.uncertainStimulus28d / 4) * 10) / 10;
              const totalStim =
                activeWindow === '7d' ? group.effectiveStimulus7d : group.averageWeeklyStimulus28d;

              const directSets = activeWindow === '7d' ? group.directSets7d : group.directSets28d;
              const supportedSets = activeWindow === '7d' ? group.supportedSets7d : group.supportedSets28d;
              const isSelected = selectedMuscle === group.muscleGroup;

              return (
                <div
                  key={group.muscleGroup}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-surface)] border-[var(--primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)]/60 hover:bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--primary)]/40'
                  }`}
                  onClick={() => setSelectedMuscle(isSelected ? null : group.muscleGroup)}
                >
                  {/* Top Line: Muscle Name, In Split & Readiness */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] capitalize">
                          {group.displayName}
                        </span>
                        {group.isScheduledInSplit && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30">
                            In Split
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                        {group.readiness.hoursSinceLastTrained !== null
                          ? `Trained ${group.readiness.hoursSinceLastTrained}h ago`
                          : 'Not trained recently'}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      {getReadinessBadge(group.readiness.status, group.readiness.label)}
                      <div className="text-xs font-black text-[var(--text-main)]">
                        {hasUncertain && uncertainStim > 0 ? (
                          <>
                            <span>{confirmedStim}</span>
                            <span className="text-[9.5px] font-semibold text-[var(--text-secondary)]">
                              {activeWindow === '7d' ? ' confirmed' : ' conf. / wk'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{totalStim}</span>
                            <span className="text-[9.5px] font-semibold text-[var(--text-secondary)]">
                              {activeWindow === '7d' ? ' stimulus sets' : ' sets / wk'}
                            </span>
                          </>
                        )}
                      </div>
                      {hasUncertain && uncertainStim > 0 && (
                        <div className="text-[9.5px] font-bold text-amber-400">
                          +{uncertainStim} est. ({totalStim} total)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Volume Breakdown Pills */}
                  <div className="flex items-center justify-between gap-1 text-[10px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]/60 mt-2">
                    <span className="font-semibold text-[var(--text-main)]">
                      {directSets} direct · {supportedSets} supported
                    </span>
                    <span className="text-[10px] text-[var(--primary)] font-bold flex items-center gap-0.5">
                      {isSelected ? 'Hide Details' : 'View Sub-Regions'}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                      />
                    </span>
                  </div>

                  {/* Expanded Sub-Region Details */}
                  {isSelected && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)] space-y-2 text-xs animate-fadeIn">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                        Sub-Region Training Distribution ({activeWindow === '7d' ? '7-Day' : '28-Day'})
                      </div>

                      <div className="space-y-1.5">
                        {group.subRegions.map((sub) => {
                          const subDirect =
                            activeWindow === '7d' ? sub.directSets7d : sub.directSets28d;
                          const subSupported =
                            activeWindow === '7d' ? sub.supportedSets7d : sub.supportedSets28d;
                          const subScore =
                            activeWindow === '7d' ? sub.stimulusScore7d : sub.stimulusScore28d;
                          const subConfirmed =
                            activeWindow === '7d'
                              ? (sub.confirmedStimulus7d ?? subScore)
                              : (sub.confirmedStimulus28d ?? subScore);
                          const subUncertain =
                            activeWindow === '7d'
                              ? (sub.uncertainStimulus7d ?? 0)
                              : (sub.uncertainStimulus28d ?? 0);

                          const isDirect = sub.status === 'direct';
                          const isSupported = sub.status === 'supported';

                          return (
                            <div
                              key={sub.area}
                              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[11px] text-[var(--text-main)]">
                                    {sub.displayName}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                                      isDirect
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : isSupported
                                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                        : 'bg-neutral-500/15 text-neutral-400'
                                    }`}
                                  >
                                    {sub.status}
                                  </span>
                                </div>
                                {sub.contributingExercises.length > 0 && (
                                  <div className="text-[9.5px] text-[var(--text-muted)] truncate mt-0.5">
                                    {sub.contributingExercises.join(', ')}
                                  </div>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 justify-end">
                                  <span className="font-black text-xs text-[var(--text-main)]">
                                    {subUncertain > 0 ? subConfirmed : subScore}
                                  </span>
                                  {subUncertain > 0 && (
                                    <span className="text-[9px] font-bold text-amber-400">
                                      +{subUncertain} est.
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-[var(--text-muted)]">
                                  {subDirect} dir + {subSupported} sup
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Readiness Explanation */}
                      <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                        <span className="font-bold text-[var(--text-main)]">Readiness Context: </span>
                        {group.readiness.explanation}
                        <p className="text-[9.5px] text-[var(--text-muted)] mt-1 italic">
                          Readiness indicators are engineering load heuristics based on completed set volume; not biological or medical measurements.
                        </p>
                      </div>

                      {/* Contributing completed exercises list */}
                      {group.contributingExercises.length > 0 && (
                        <div className="text-[10px] text-[var(--text-muted)]">
                          <span className="font-bold text-[var(--text-secondary)]">
                            Contributing Exercises:
                          </span>{' '}
                          {group.contributingExercises.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
