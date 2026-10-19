import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { WORKOUT_TEMPLATES, getRecommendedTemplate } from '../../data/workoutTemplates';
import { WorkoutTemplate, DayOfWeek } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import {
  Sparkles,
  Award,
  Flame,
  Dumbbell,
  Clock,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
  Activity,
  Heart,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface WorkoutTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateApplied?: (template: WorkoutTemplate) => void;
}

const DAYS_ORDER: { id: DayOfWeek; label: string }[] = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

export const WorkoutTemplatesModal: React.FC<WorkoutTemplatesModalProps> = ({
  isOpen,
  onClose,
  onTemplateApplied,
}) => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { getUserData, applyWorkoutTemplate } = useWorkoutStore();

  const userData = getUserData(userId);
  const activeTemplateId = userData.activeTemplateId || currentUser?.selectedTemplateId;

  // Active filters
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<WorkoutTemplate | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  // Compute recommended template based on user onboarding goals
  const recommendedTemplate = useMemo(() => {
    const goal = currentUser?.fitnessGoal || userData.fitnessGoal || 'Muscle Building & Hypertrophy';
    const days = currentUser?.trainingDaysPerWeek || 4;
    return getRecommendedTemplate(goal, days);
  }, [currentUser, userData]);

  const goalFilterOptions = [
    { id: 'all', label: 'All Goals', icon: Layers },
    { id: 'hypertrophy', label: 'Hypertrophy', icon: Dumbbell },
    { id: 'strength', label: 'Strength & Power', icon: Award },
    { id: 'fat_loss', label: 'Fat Loss & Conditioning', icon: Flame },
    { id: 'longevity', label: 'Longevity & Health', icon: Heart },
  ];

  const daysFilterOptions: Array<{ id: number | 'all'; label: string }> = [
    { id: 'all', label: 'All Days' },
    { id: 3, label: '3 Days' },
    { id: 4, label: '4 Days' },
    { id: 5, label: '5 Days' },
    { id: 6, label: '6 Days' },
  ];

  const filteredTemplates = useMemo(() => {
    return WORKOUT_TEMPLATES.filter((tpl) => {
      // Goal Filter
      if (selectedGoal !== 'all' && tpl.category !== selectedGoal) {
        return false;
      }
      // Days Filter
      if (selectedDays !== 'all' && tpl.daysPerWeek !== selectedDays) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = tpl.name.toLowerCase().includes(query);
        const matchesDesc = tpl.shortDescription.toLowerCase().includes(query);
        const matchesProg = tpl.progressionMethodology.toLowerCase().includes(query);
        const matchesGoal = tpl.goal.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesProg && !matchesGoal) {
          return false;
        }
      }
      return true;
    });
  }, [selectedGoal, selectedDays, searchQuery]);

  const handleApplyClick = (template: WorkoutTemplate) => {
    setConfirmTemplate(template);
  };

  const handleConfirmApply = async () => {
    if (!confirmTemplate) return;
    setIsApplying(true);
    try {
      await applyWorkoutTemplate(userId, confirmTemplate.id);
      setAppliedToast(`Applied: ${confirmTemplate.name}`);
      setConfirmTemplate(null);
      if (onTemplateApplied) {
        onTemplateApplied(confirmTemplate);
      }
      setTimeout(() => {
        setAppliedToast(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to apply template:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const toggleExpand = (templateId: string) => {
    setExpandedTemplateId((prev) => (prev === templateId ? null : templateId));
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Training Split Templates" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Toast Notification */}
        {appliedToast && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-400 text-xs font-bold animate-fade-in shadow-lg">
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{appliedToast}. Your weekly schedule has been updated!</span>
          </div>
        )}

        {/* Header / Intro banner */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-bold text-white text-sm">Established Workout Programs & Splits</div>
            <p className="text-zinc-400 mt-1 leading-relaxed">
              Choose from recognizable splits tailored to hypertrophy, raw strength, conditioning, and longevity.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>100% Data Safe: Completed workouts, PRs, and history will NEVER be lost.</span>
            </div>
          </div>
        </div>

        {/* Goal Category Pills */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Fitness Goal</div>
          <div className="flex flex-wrap gap-1.5">
            {goalFilterOptions.map((g) => {
              const Icon = g.icon;
              const isSelected = selectedGoal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGoal(g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                      : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Days & Search Filter Row */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
          {/* Days Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {daysFilterOptions.map((d) => {
              const isSelected = selectedDays === d.id;
              return (
                <button
                  key={String(d.id)}
                  type="button"
                  onClick={() => setSelectedDays(d.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                    isSelected
                      ? 'bg-white/20 text-white border-white/40'
                      : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search splits (e.g. 5/3/1, PPL, Texas)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Template List */}
        <div className="space-y-3.5 pt-1">
          {filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto mb-2 opacity-60" />
              No workout split templates match your selected filters.
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const isRecommended = recommendedTemplate?.id === template.id;
              const isActive = activeTemplateId === template.id;
              const isExpanded = expandedTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isActive
                      ? 'bg-emerald-500/[0.04] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                      : isRecommended
                      ? 'bg-[var(--primary)]/[0.03] border-[var(--primary)]/35 shadow-[0_0_20px_rgba(239,68,68,0.08)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  {/* Top card banner & meta */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Recommended Badge */}
                        {isRecommended && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--primary)] text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Recommended for You</span>
                          </span>
                        )}

                        {/* Active Plan Badge */}
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Current Plan</span>
                          </span>
                        )}

                        {/* Frequency Badge */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                          {template.daysPerWeek} Days / Week
                        </span>

                        {/* Experience Badge */}
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                          {template.experienceLevel}
                        </span>
                      </div>

                      {/* Equipment tag */}
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {template.equipment}
                      </span>
                    </div>

                    {/* Title & Goal */}
                    <div>
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        {template.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {template.shortDescription}
                      </p>
                    </div>

                    {/* Progression Methodology Box */}
                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06] text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-300 font-bold mb-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] uppercase tracking-wider text-amber-400">
                          Progression Methodology
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-mono">
                        {template.progressionMethodology}
                      </p>
                    </div>

                    {/* 7-Day Mini Schedule Strip */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Weekly Routine Structure</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS_ORDER.map(({ id, label }) => {
                          const dayCfg = template.weeklySchedule[id];
                          const isRest = dayCfg?.isRest;
                          return (
                            <div
                              key={id}
                              className={`rounded-xl py-1.5 px-1 text-center border transition-all ${
                                isRest
                                  ? 'bg-white/[0.02] border-white/[0.04] text-zinc-500'
                                  : 'bg-white/[0.06] border-white/[0.12] text-zinc-200 shadow-xs'
                              }`}
                            >
                              <div className="text-[9px] font-black uppercase text-zinc-400">
                                {label}
                              </div>
                              <div className="text-[10px] font-extrabold truncate mt-0.5">
                                {isRest ? 'Rest' : dayCfg?.name.split(' ')[0]}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expandable Detailed Daily Plan */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-white/[0.08] space-y-3 animate-fade-in text-xs">
                        {/* Set/Rep Guidance */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                            Set & Rep Targets
                          </div>
                          <p className="text-zinc-400 text-[11px]">{template.setRepGuidance}</p>
                        </div>

                        {/* Recovery & Conditioning */}
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                            Recovery & Fatigue Protocol
                          </div>
                          <p className="text-zinc-400 text-[11px]">{template.recoveryNotes}</p>
                          {template.conditioningNotes && (
                            <p className="text-amber-400/90 text-[11px] mt-1.5">
                              Conditioning: {template.conditioningNotes}
                            </p>
                          )}
                        </div>

                        {/* Day-by-Day Breakdown */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                            Daily Breakdown
                          </div>
                          <div className="space-y-1.5">
                            {DAYS_ORDER.map(({ id, label }) => {
                              const dayCfg = template.weeklySchedule[id];
                              if (!dayCfg || dayCfg.isRest) {
                                return (
                                  <div
                                    key={id}
                                    className="p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.04] flex items-center justify-between text-zinc-500"
                                  >
                                    <span className="font-bold">{label}</span>
                                    <span>Recovery / Rest Day</span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={id}
                                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-zinc-300"
                                >
                                  <div>
                                    <span className="font-bold text-white mr-2">{label}:</span>
                                    <span className="font-extrabold text-[var(--primary)]">
                                      {dayCfg.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {dayCfg.muscleGroups.map((mg, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] font-semibold text-zinc-300 capitalize"
                                      >
                                        {mg.displayName || mg.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(template.id)}
                        className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Routine Details' : 'View Routine Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Active Split</span>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApplyClick(template)}
                          className="gap-1.5 text-xs font-black px-4 shadow-[0_2px_12px_rgba(239,68,68,0.3)]"
                        >
                          <span>Select This Template</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#12141c] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] flex items-center justify-center mx-auto">
                <Dumbbell className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-white">Switch to {confirmTemplate.name}?</h3>
                <p className="text-xs text-zinc-400">
                  {confirmTemplate.daysPerWeek} Days / Week • {confirmTemplate.goal}
                </p>
              </div>

              {/* Data Safety Assurance */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Workout History is 100% Safe</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Switching templates changes your upcoming weekly schedule. Your previous workouts, personal records, and bodyweight tracking will remain saved.
                </p>
              </div>

              {/* Confirmation Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setConfirmTemplate(null)}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleConfirmApply}
                  disabled={isApplying}
                  className="font-black"
                >
                  {isApplying ? 'Applying...' : 'Apply Split'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
