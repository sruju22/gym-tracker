import React, { useState, useMemo } from 'react';
import {
  Award,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Flame,
  Building2,
  Home,
  Activity,
  Zap,
  Sliders,
  RotateCcw,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '../ui/Input';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { getRecommendedTemplate } from '../../data/workoutTemplates';
import { WorkoutTemplatesModal } from '../plan/WorkoutTemplatesModal';
import { WorkoutTemplate, DayOfWeek } from '../../types';

interface OnboardingFlowProps {
  onCompleted?: () => void;
}

const DAYS_ORDER: { id: DayOfWeek; short: string }[] = [
  { id: 'monday', short: 'Mon' },
  { id: 'tuesday', short: 'Tue' },
  { id: 'wednesday', short: 'Wed' },
  { id: 'thursday', short: 'Thu' },
  { id: 'friday', short: 'Fri' },
  { id: 'saturday', short: 'Sat' },
  { id: 'sunday', short: 'Sun' },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onCompleted }) => {
  const { currentUser, completeOnboarding, isLoading } = useAuthStore();
  const { getUserData, updateCurrentWeight, updateUserSettings, applyWorkoutTemplate } = useWorkoutStore();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form State
  const [fitnessGoal, setFitnessGoal] = useState<string>('Muscle Building & Hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<string>('Intermediate (1 to 3 years)');
  const [trainingDays, setTrainingDays] = useState<number>(4);
  const [equipmentPreference, setEquipmentPreference] = useState<string>('Full Commercial Gym');
  const [heightCm, setHeightCm] = useState<string>('');
  const [currentWeight, setCurrentWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // Workout Split Selection State
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<WorkoutTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const goalOptions = [
    {
      id: 'hypertrophy',
      label: 'Muscle Building & Hypertrophy',
      desc: 'Build lean muscle mass, maximize hypertrophy, and sculpt your physique.',
      icon: Dumbbell,
    },
    {
      id: 'strength',
      label: 'Strength & Power',
      desc: 'Boost compound lift numbers and build raw, functional power.',
      icon: Award,
    },
    {
      id: 'fat_loss',
      label: 'Fat Loss & Conditioning',
      desc: 'Burn calories, lean down, and optimize endurance & conditioning.',
      icon: Flame,
    },
    {
      id: 'general',
      label: 'General Fitness & Longevity',
      desc: 'Support daily athletic energy, joint mobility, and lifelong health.',
      icon: Sparkles,
    },
  ];

  const experienceOptions = [
    {
      id: 'beginner',
      label: 'Beginner',
      badge: '< 1 Year',
      sub: 'Less than 1 year of consistent lifting.',
      desc: 'Master foundational movement patterns, barbell mechanics, and establish consistent lifting habits.',
      icon: Sparkles,
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      badge: '1–3 Years',
      sub: '1 to 3 years of structured resistance training.',
      desc: 'Targeted progressive overload, periodized training cycles, and muscle group split specialization.',
      icon: Flame,
    },
    {
      id: 'advanced',
      label: 'Advanced',
      badge: '3+ Years',
      sub: '3+ years with mastery of progressive overload & form.',
      desc: 'High-intensity microcycles, weak-point specialization, and fine-tuned fatigue management.',
      icon: Award,
    },
  ];

  const daysOptions = useMemo(() => {
    return [3, 4, 5, 6].map((days) => {
      const rec = getRecommendedTemplate(fitnessGoal, days);
      return {
        days,
        label: `${days} Days / Week`,
        split: rec.name,
        desc: rec.shortDescription,
      };
    });
  }, [fitnessGoal]);

  const equipmentOptions = [
    {
      id: 'commercial',
      label: 'Full Commercial Gym',
      desc: 'Access to barbells, dumbbells, cables, Smith machines, and isolation equipment.',
      icon: Building2,
    },
    {
      id: 'free_weights',
      label: 'Home Gym / Free Weights',
      desc: 'Barbell, weight plates, adjustable dumbbells, and workout bench.',
      icon: Home,
    },
    {
      id: 'dumbbells_bands',
      label: 'Dumbbells & Bands',
      desc: 'Compact versatile setup focused on free-weight movements.',
      icon: Activity,
    },
    {
      id: 'bodyweight',
      label: 'Calisthenics & Bodyweight',
      desc: 'Bodyweight progressions, pull-up bar, and minimal gear.',
      icon: Zap,
    },
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const matchedTemplate = useMemo(() => {
    if (selectedCustomTemplate) {
      return selectedCustomTemplate;
    }
    return getRecommendedTemplate(fitnessGoal, trainingDays);
  }, [fitnessGoal, trainingDays, selectedCustomTemplate]);

  const handleSelectGoal = (goalLabel: string) => {
    setFitnessGoal(goalLabel);
    setSelectedCustomTemplate(null);
  };

  const handleSelectDays = (days: number) => {
    setTrainingDays(days);
    setSelectedCustomTemplate(null);
  };

  const handleSkipEntireOnboarding = async () => {
    const activeUserId = currentUser?.id || 'guest';
    const userData = getUserData(activeUserId);
    const hasCustomExistingPlan = Boolean(
      userData.workoutPlanDocId ||
      currentUser?.selectedTemplateId ||
      (userData.activeTemplateId && userData.activeTemplateId !== 'hypertrophy-ppl-6day')
    );

    try {
      await completeOnboarding({
        fitnessGoal: currentUser?.fitnessGoal || fitnessGoal,
        experienceLevel: currentUser?.experienceLevel || experienceLevel,
        trainingDaysPerWeek: currentUser?.trainingDaysPerWeek || trainingDays,
        equipmentPreference: currentUser?.equipmentPreference || equipmentPreference,
        selectedTemplateId: hasCustomExistingPlan
          ? (userData.activeTemplateId || currentUser?.selectedTemplateId || matchedTemplate.id)
          : matchedTemplate.id,
      });

      // Existing users retain their custom plans unless explicitly replaced.
      // Skipping onboarding must not silently overwrite an existing plan.
      if (!hasCustomExistingPlan) {
        await applyWorkoutTemplate(activeUserId, matchedTemplate.id);
      }

      if (onCompleted) {
        onCompleted();
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('[Onboarding] Skip failed:', err);
      if (onCompleted) onCompleted();
      else window.location.href = '/';
    }
  };

  const finishOnboarding = async (skipPhysicalStats = false) => {
    const height = !skipPhysicalStats && heightCm ? parseFloat(heightCm) : null;
    const weight = !skipPhysicalStats && currentWeight ? parseFloat(currentWeight) : null;
    const activeUserId = currentUser?.id || 'guest';
    const finalTemplate = matchedTemplate;

    try {
      await completeOnboarding({
        fitnessGoal,
        experienceLevel,
        trainingDaysPerWeek: trainingDays,
        equipmentPreference,
        heightCm: height,
        currentWeight: weight,
        weightUnit,
        selectedTemplateId: finalTemplate.id,
      });

      // Automatically apply the tailored template to the user's weekly schedule
      await applyWorkoutTemplate(activeUserId, finalTemplate.id);

      // Synchronize weight & unit to local workout store
      if (currentUser?.id && weight) {
        updateCurrentWeight(currentUser.id, weight);
      }
      updateUserSettings({ weightUnit });

      if (onCompleted) {
        onCompleted();
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('[Onboarding] Failed to save onboarding preferences:', err);
      await applyWorkoutTemplate(activeUserId, finalTemplate.id);
      if (onCompleted) {
        onCompleted();
      } else {
        window.location.href = '/';
      }
    }
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="relative min-h-[100dvh] h-[100dvh] max-h-[100dvh] w-full max-w-full bg-[#050608] text-white flex flex-col justify-between overflow-x-hidden overflow-y-hidden select-none">
      {/* 1. Cinematic Background Layer: Muscular Athlete Image + Layered Black-to-Crimson Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* High-res Hero Image with cover positioning and tuned visibility */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: `url('/images/gym-onboarding-hero.jpg')`,
            backgroundPosition: 'center 14%',
            opacity: 0.38,
          }}
        />

        {/* Base Layered Vignette: Near-black at top & bottom for pristine contrast, deep charcoal in center */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/92 via-[#080910]/70 to-[#040507]/96" />

        {/* Deep atmospheric red glow positioned behind the central bodybuilder */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[520px] h-[340px] bg-[#991b1b]/18 rounded-full blur-[120px] pointer-events-none" />

        {/* Lower selection area subtle crimson glow */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[580px] h-[280px] bg-[#dc2626]/12 rounded-full blur-[110px] pointer-events-none" />

        {/* Ambient red edge highlights mirroring the gym photo's rim lighting */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[360px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-28 w-[360px] h-[360px] bg-red-600/12 rounded-full blur-[95px] pointer-events-none" />

        {/* Edge Vignette darkening the corners and outer boundary */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_#040507_95%)] pointer-events-none" />
      </div>

      {/* 2. Pinned Top Bar: Brand Logo, Step Indicator, Skip Button & Progress Bar */}
      <header className="relative z-10 w-full max-w-xl mx-auto pt-[max(0.75rem,env(safe-area-inset-top))] px-4 sm:px-6 pb-2 shrink-0">
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5">
            <GymTrackieLogo variant="compact" height={22} mode="dark" />
            <div className="h-3.5 w-px bg-white/15" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] px-2 py-0.5 rounded-md bg-[var(--primary-subtle)] border border-[var(--primary-border)]">
              Step {step} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkipEntireOnboarding}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/5 active:scale-95"
            title="Skip to Dashboard"
          >
            Skip onboarding
          </button>
        </div>

        {/* Thin Sleek Progress Bar with Red Glow */}
        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* 3. Middle Scrollable Content: Viewport Filling with 3D Depth */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-2 sm:py-3 w-full max-w-xl mx-auto flex flex-col">
        {/* STEP 1: FITNESS GOAL */}
        {step === 1 && (
          <div className="flex-1 min-h-full flex flex-col justify-between animate-fade-in py-1 pb-2">
            <div className="mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
                Welcome, {currentUser?.name?.toUpperCase() || 'Athlete'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight">
                What is your primary fitness goal?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 sm:mt-1.5 leading-relaxed">
                We'll tailor your daily workout focus, volume targets, and progression curve.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-3.5 my-auto py-1">
              {goalOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = fitnessGoal === opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectGoal(opt.label)}
                    className={`group relative w-full text-left flex items-center gap-3.5 sm:gap-4.5 p-4 sm:p-5 min-h-[105px] sm:min-h-[114px] rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#231016]/95 via-[#1a0c12]/92 to-[#130910]/90 border-2 border-red-500/85 shadow-[0_10px_32px_rgba(220,38,38,0.24),0_2px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]'
                        : 'bg-gradient-to-br from-[#13151f]/85 via-[#10121a]/80 to-[#170e14]/75 hover:from-[#171a26]/90 hover:via-[#141620]/85 hover:to-[#1c1119]/80 border border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]'
                    }`}
                  >
                    {/* Icon Container */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-[0_4px_18px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
                          : 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-zinc-400 group-hover:text-zinc-200 border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug">
                        {opt.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-300 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_0_14px_rgba(239,68,68,0.7)]'
                          : 'border-2 border-white/20 group-hover:border-white/35 bg-black/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: EXPERIENCE LEVEL */}
        {step === 2 && (
          <div className="flex-1 min-h-full flex flex-col justify-between animate-fade-in py-1 pb-2">
            <div className="mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
                Training Background
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight">
                How much lifting experience do you have?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 sm:mt-1.5 leading-relaxed">
                Calibrates baseline volume, exercise selection, and progression curves.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3.5 sm:gap-4 my-auto py-1">
              {experienceOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = experienceLevel.startsWith(opt.label);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExperienceLevel(`${opt.label} (${opt.sub})`)}
                    className={`group relative w-full text-left flex items-center gap-3.5 sm:gap-4.5 p-4 sm:p-5 min-h-[105px] sm:min-h-[118px] rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#231016]/95 via-[#1a0c12]/92 to-[#130910]/90 border-2 border-red-500/85 shadow-[0_10px_32px_rgba(220,38,38,0.24),0_2px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]'
                        : 'bg-gradient-to-br from-[#13151f]/85 via-[#10121a]/80 to-[#170e14]/75 hover:from-[#171a26]/90 hover:via-[#141620]/85 hover:to-[#1c1119]/80 border border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-[0_4px_18px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
                          : 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-zinc-400 group-hover:text-zinc-200 border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
                          {opt.label}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-subtle)] px-2 py-0.5 rounded border border-[var(--primary-border)] shrink-0">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-300 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_0_14px_rgba(239,68,68,0.7)]'
                          : 'border-2 border-white/20 group-hover:border-white/35 bg-black/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: TRAINING FREQUENCY */}
        {step === 3 && (
          <div className="flex-1 min-h-full flex flex-col justify-between animate-fade-in py-1 pb-2">
            <div className="mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
                Weekly Schedule
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight">
                How many days per week do you plan to train?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 sm:mt-1.5 leading-relaxed">
                Your weekly split and rest days will adapt to this frequency target.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center py-1 my-auto">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {daysOptions.map((opt) => {
                  const isSelected = trainingDays === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => handleSelectDays(opt.days)}
                      className={`group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between min-h-[125px] sm:min-h-[148px] active:scale-[0.99] ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#231016]/95 via-[#1a0c12]/92 to-[#130910]/90 border-2 border-red-500/85 shadow-[0_10px_32px_rgba(220,38,38,0.24),0_2px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]'
                          : 'bg-gradient-to-br from-[#13151f]/85 via-[#10121a]/80 to-[#170e14]/75 hover:from-[#171a26]/90 hover:via-[#141620]/85 hover:to-[#1c1119]/80 border border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-3xl sm:text-4xl font-black tracking-tight transition-colors ${
                            isSelected
                              ? 'text-[var(--primary)] drop-shadow-[0_0_14px_rgba(239,68,68,0.6)]'
                              : 'text-white'
                          }`}
                        >
                          {opt.days}
                        </span>
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                              : 'border-2 border-white/20 group-hover:border-white/35 bg-black/20'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                          {opt.label}
                        </div>
                        <div className="text-[11px] sm:text-xs font-semibold text-[var(--primary)] mt-0.5 truncate">
                          {opt.split}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug line-clamp-2">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: EQUIPMENT PREFERENCE */}
        {step === 4 && (
          <div className="flex-1 min-h-full flex flex-col justify-between animate-fade-in py-1 pb-2">
            <div className="mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
                Equipment & Environment
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight">
                Where will you be working out?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 sm:mt-1.5 leading-relaxed">
                We'll prioritize movements and exercise substitutions compatible with your gear.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-3.5 my-auto py-1">
              {equipmentOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = equipmentPreference === opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEquipmentPreference(opt.label)}
                    className={`group relative w-full text-left flex items-center gap-3.5 sm:gap-4.5 p-4 sm:p-5 min-h-[105px] sm:min-h-[114px] rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#231016]/95 via-[#1a0c12]/92 to-[#130910]/90 border-2 border-red-500/85 shadow-[0_10px_32px_rgba(220,38,38,0.24),0_2px_10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]'
                        : 'bg-gradient-to-br from-[#13151f]/85 via-[#10121a]/80 to-[#170e14]/75 hover:from-[#171a26]/90 hover:via-[#141620]/85 hover:to-[#1c1119]/80 border border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-[0_4px_18px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
                          : 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-zinc-400 group-hover:text-zinc-200 border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug">
                        {opt.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 group-hover:text-zinc-300 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_0_14px_rgba(239,68,68,0.7)]'
                          : 'border-2 border-white/20 group-hover:border-white/35 bg-black/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: OPTIONAL BODY STATS */}
        {step === 5 && (
          <div className="flex-1 flex flex-col justify-between my-auto animate-fade-in py-1">
            <div className="mb-2">
              <span className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
                Final Step · Optional
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mt-0.5 leading-tight">
                Body Stats (Optional)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                Optional metrics for tracking bodyweight progress and relative strength. You can update or hide these anytime in Settings.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center py-2 space-y-3 sm:space-y-4">
              {/* Tailored Workout Plan Preview Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-[var(--primary)]/35 bg-[#12141c]/90 backdrop-blur-md shadow-[0_10px_35px_rgba(220,38,38,0.18)] space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[var(--primary)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{selectedCustomTemplate ? 'Custom Selected Split' : 'Tailored Split Recommendation'}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] shrink-0">
                    {matchedTemplate.daysPerWeek} Days / Week
                  </span>
                </div>

                <div>
                  <div className="text-base sm:text-lg font-black text-white tracking-tight flex items-center justify-between gap-2">
                    <span>{matchedTemplate.name}</span>
                    {selectedCustomTemplate && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full shrink-0">
                        Custom Pick
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <span>Target:</span>
                    <span className="text-zinc-200">{fitnessGoal}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {matchedTemplate.shortDescription}
                  </p>
                </div>

                {/* 7-Day Mini Schedule Strip */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Weekly Schedule Breakdown</span>
                    <span className="text-emerald-400 font-bold">{matchedTemplate.daysPerWeek} Active Days</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_ORDER.map(({ id, short }) => {
                      const dayConfig = matchedTemplate.weeklySchedule[id];
                      const isRest = dayConfig?.isRest;
                      return (
                        <div
                          key={id}
                          className={`p-1.5 rounded-xl text-center border transition-all flex flex-col justify-between min-h-[58px] ${
                            isRest
                              ? 'bg-black/30 border-white/[0.05] text-zinc-500'
                              : 'bg-gradient-to-b from-red-500/20 to-red-600/10 border-red-500/40 text-white shadow-[0_2px_10px_rgba(220,38,38,0.15)]'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase opacity-75">{short}</div>
                          <div
                            className={`text-[9px] font-extrabold leading-tight mt-0.5 truncate ${
                              isRest ? 'text-zinc-500' : 'text-red-300'
                            }`}
                            title={isRest ? 'Rest' : dayConfig?.name}
                          >
                            {isRest ? 'Rest' : (dayConfig?.name?.replace(/Day|Workout/gi, '').trim() || 'Train')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progression Rule Box */}
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 text-[11px] text-zinc-300 leading-snug">
                    <span className="font-bold text-amber-300">Progression Strategy: </span>
                    {matchedTemplate.progressionMethodology}
                  </div>
                </div>

                {/* Actions: Browse Alternatives or Reset to Default */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-200 hover:text-white border border-white/[0.1] transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Browse Alternative Splits ({matchedTemplate.daysPerWeek}-Day & More)</span>
                  </button>
                  {selectedCustomTemplate && (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomTemplate(null)}
                      className="px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-400 hover:text-white border border-white/[0.06] transition-all cursor-pointer active:scale-95"
                      title="Reset to recommended split"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#12141c]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
                {/* Preferred Unit Segmented Selector */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div>
                    <div className="text-xs font-extrabold text-white">Preferred Weight Unit</div>
                    <div className="text-[11px] text-zinc-400">Used for bodyweight and exercise load logs</div>
                  </div>
                  <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        weightUnit === 'kg'
                          ? 'bg-[var(--primary)] text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      KG
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        weightUnit === 'lbs'
                          ? 'bg-[var(--primary)] text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      LBS
                    </button>
                  </div>
                </div>

                {/* Metric Inputs */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Input
                    label={`Current Weight (${weightUnit})`}
                    type="number"
                    placeholder={weightUnit === 'kg' ? 'e.g. 75.5' : 'e.g. 165'}
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    unit={weightUnit}
                  />

                  <Input
                    label="Height (cm)"
                    type="number"
                    placeholder="e.g. 178"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    unit="cm"
                  />
                </div>
              </div>

              {/* Cloud Sync Assurance Note */}
              <div className="p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3 text-xs text-zinc-400">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-zinc-200">100% Private & Synchronized</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Your stats are securely stored in your personal profile and can be modified anytime.</p>
                </div>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => finishOnboarding(true)}
                  className="text-xs font-bold text-zinc-400 hover:text-[var(--primary)] transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white/5 active:scale-95"
                >
                  Skip physical stats and continue to dashboard →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Pinned Bottom Action Navigation: Always above iOS safe area */}
      <footer className="relative z-10 w-full max-w-xl mx-auto px-4 sm:px-6 py-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shrink-0 border-t border-white/[0.08] bg-[#08090e]/92 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center gap-2 px-4 h-12 sm:h-13 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-zinc-300 hover:text-white border border-white/[0.08] font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-13 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm sm:text-base tracking-wide shadow-[0_4px_24px_rgba(239,68,68,0.4)] transition-all cursor-pointer"
          >
            <span>
              {step === totalSteps
                ? (isLoading ? 'Saving Setup...' : 'Finish & Go to Dashboard')
                : 'Continue'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </footer>

      {/* Workout Split Templates Modal */}
      <WorkoutTemplatesModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        initialGoal={fitnessGoal}
        initialDays={trainingDays}
        onTemplateApplied={(template) => {
          setSelectedCustomTemplate(template);
          setTrainingDays(template.daysPerWeek);
          setIsTemplateModalOpen(false);
        }}
      />
    </div>
  );
};
