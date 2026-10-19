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
  ChevronDown,
  ChevronUp,
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
  const [showProgression, setShowProgression] = useState(false);

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

  const handleUnitChange = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === weightUnit) return;
    if (currentWeight && !isNaN(Number(currentWeight))) {
      const val = parseFloat(currentWeight);
      if (newUnit === 'lbs') {
        setCurrentWeight((val * 2.20462).toFixed(1));
      } else {
        setCurrentWeight((val / 2.20462).toFixed(1));
      }
    }
    setWeightUnit(newUnit);
  };

  const finishOnboarding = async (skipPhysicalStats = false) => {
    let height: number | null = null;
    let weight: number | null = null;

    if (!skipPhysicalStats) {
      if (heightCm && !isNaN(Number(heightCm))) {
        const parsedHeight = parseFloat(heightCm);
        if (parsedHeight >= 40 && parsedHeight <= 300) {
          height = Math.round(parsedHeight);
        }
      }
      if (currentWeight && !isNaN(Number(currentWeight))) {
        const parsedWeight = parseFloat(currentWeight);
        if (parsedWeight >= 10 && parsedWeight <= 600) {
          weight = Math.round(parsedWeight * 10) / 10;
        }
      }
    }

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
      {/* 1. Cinematic Background Layer: Muscular Athlete Image + Refined Single Gradient Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* High-res Hero Image with cover positioning and high opacity */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: `url('/images/gym-onboarding-hero.png')`,
            backgroundPosition: 'center 6%',
            opacity: 0.92,
          }}
        />

        {/* Refined Single Gradient Overlay: Darker behind header & text, clear around athlete center & sides */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,6,8,0.82) 0%, rgba(5,6,8,0.55) 15%, rgba(5,6,8,0.22) 32%, rgba(5,6,8,0.28) 55%, rgba(5,6,8,0.68) 80%, rgba(5,6,8,0.92) 100%)',
          }}
        />

        {/* Subtle deep burgundy ambient glow near lower left side */}
        <div className="absolute -bottom-10 -left-16 w-[300px] h-[300px] bg-[#581014]/28 rounded-full blur-[90px] pointer-events-none" />

        {/* Subtle deep crimson/burgundy ambient glow near lower right side matching gym rim lighting */}
        <div className="absolute bottom-6 -right-16 w-[320px] h-[320px] bg-[#6e1219]/25 rounded-full blur-[95px] pointer-events-none" />
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
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Welcome, {currentUser?.name?.toUpperCase() || 'Athlete'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                What is your primary fitness goal?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-1.5 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
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
                        ? 'bg-gradient-to-br from-[#280c12]/85 via-[#1a0a0f]/80 to-[#12080c]/75 backdrop-blur-md border-2 border-red-500/90 shadow-[0_10px_32px_rgba(220,38,38,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]'
                        : 'bg-[#0c0e17]/60 backdrop-blur-md hover:bg-[#121522]/70 border border-white/[0.1] hover:border-white/[0.22] shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {/* Icon Container */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-[0_4px_18px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
                          : 'bg-white/[0.06] text-zinc-300 group-hover:text-white border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug">
                        {opt.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 group-hover:text-zinc-200 mt-1 leading-relaxed">
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
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Training Background
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                How much lifting experience do you have?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-1.5 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
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
                        ? 'bg-gradient-to-br from-[#280c12]/85 via-[#1a0a0f]/80 to-[#12080c]/75 backdrop-blur-md border-2 border-red-500/90 shadow-[0_10px_32px_rgba(220,38,38,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]'
                        : 'bg-[#0c0e17]/60 backdrop-blur-md hover:bg-[#121522]/70 border border-white/[0.1] hover:border-white/[0.22] shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-[0_4px_18px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
                          : 'bg-white/[0.06] text-zinc-300 group-hover:text-white border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
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
                      <p className="text-xs sm:text-sm text-zinc-300 group-hover:text-zinc-200 mt-1 leading-relaxed">
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
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Weekly Schedule
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                How many days per week do you plan to train?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-1.5 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
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
                          ? 'bg-gradient-to-br from-[#280c12]/85 via-[#1a0a0f]/80 to-[#12080c]/75 backdrop-blur-md border-2 border-red-500/90 shadow-[0_10px_32px_rgba(220,38,38,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'bg-[#0c0e17]/60 backdrop-blur-md hover:bg-[#121522]/70 border border-white/[0.1] hover:border-white/[0.22] shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]'
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
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Equipment & Environment
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                Where will you be working out?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-1.5 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
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
                        ? 'bg-gradient-to-br from-[#280c12]/85 via-[#1a0a0f]/80 to-[#12080c]/75 backdrop-blur-md border-2 border-red-500/90 shadow-[0_10px_32px_rgba(220,38,38,0.28),inset_0_1px_0_rgba(255,255,255,0.25)]'
                        : 'bg-[#0c0e17]/60 backdrop-blur-md hover:bg-[#121522]/70 border border-white/[0.1] hover:border-white/[0.22] shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-500 to-rose-600 text-white shadow-[0_4px_18px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] border border-red-400/50'
                          : 'bg-white/[0.06] text-zinc-300 group-hover:text-white border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug">
                        {opt.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 group-hover:text-zinc-200 mt-1 leading-relaxed">
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

        {/* STEP 5: PERSONALIZED WORKOUT SPLIT & OPTIONAL BODY STATS */}
        {step === 5 && (
          <div className="flex-1 min-h-full flex flex-col justify-between animate-fade-in py-1 pb-2">
            <div className="mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-[var(--primary)] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Step 5 of 5 · Final Step
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                Your Recommended Split
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 sm:mt-1.5 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Programmed for <span className="text-white font-bold">{fitnessGoal}</span> at <span className="text-white font-bold">{matchedTemplate.daysPerWeek} days/week</span>.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-3.5 my-auto py-1">
              {/* PRIMARY SECTION: Tailored Workout Plan Recommendation */}
              <div className="rounded-2xl border border-[var(--primary)]/35 bg-[#0c0e17]/70 backdrop-blur-md shadow-[0_10px_35px_rgba(220,38,38,0.2)] p-4 sm:p-5 space-y-3">
                {/* Header / Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[var(--primary)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{selectedCustomTemplate ? 'Custom Selected Split' : 'Tailored Split Recommendation'}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] shrink-0">
                    {matchedTemplate.daysPerWeek} Days / Week
                  </span>
                </div>

                {/* Split Name and Short Description */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      {matchedTemplate.name}
                    </h3>
                    {selectedCustomTemplate && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full shrink-0">
                        Custom Pick
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {matchedTemplate.shortDescription}
                  </p>
                </div>

                {/* Compact Weekly Schedule Chips */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Weekly Routine</span>
                    <span className="text-emerald-400 font-bold">{matchedTemplate.daysPerWeek} Active Days</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_ORDER.map(({ id, short }) => {
                      const dayConfig = matchedTemplate.weeklySchedule[id];
                      const isRest = dayConfig?.isRest;
                      return (
                        <div
                          key={id}
                          className={`p-1.5 rounded-xl text-center border transition-all flex flex-col justify-between min-h-[52px] ${
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

                {/* Small Expandable Progression Strategy Section */}
                <div className="border-t border-white/[0.08] pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProgression(!showProgression)}
                    className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer py-0.5"
                  >
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-[11px] uppercase tracking-wider">Progression Strategy</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <span>{showProgression ? 'Hide' : 'View'}</span>
                      {showProgression ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  {showProgression && (
                    <div className="mt-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 leading-relaxed font-mono animate-fade-in">
                      {matchedTemplate.progressionMethodology}
                    </div>
                  )}
                </div>
              </div>

              {/* BROWSE ALTERNATIVE SPLITS ACTION */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99] border border-white/[0.1] text-xs font-bold text-zinc-200 hover:text-white transition-all cursor-pointer shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Browse Alternative Splits ({matchedTemplate.daysPerWeek}-Day & More)</span>
                </button>
                {selectedCustomTemplate && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomTemplate(null)}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                    title="Reset to recommended split"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>

              {/* SIMPLIFIED OPTIONAL BODY STATISTICS */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] bg-[#0c0e17]/55 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span>Body Stats</span>
                      <span className="text-[10px] font-normal text-zinc-400 uppercase tracking-wider">(Optional)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Used for relative strength & bodyweight tracking</p>
                  </div>

                  {/* Compact KG/LBS Segmented Control */}
                  <div className="flex gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => handleUnitChange('kg')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                        weightUnit === 'kg'
                          ? 'bg-[var(--primary)] text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      KG
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange('lbs')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                        weightUnit === 'lbs'
                          ? 'bg-[var(--primary)] text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      LBS
                    </button>
                  </div>
                </div>

                {/* Two compact inputs side-by-side */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Current Weight
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={weightUnit === 'kg' ? 'e.g. 75.5' : 'e.g. 165'}
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--primary)] transition-colors pr-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 uppercase pointer-events-none">
                        {weightUnit}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Height
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        placeholder="e.g. 178"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--primary)] transition-colors pr-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 uppercase pointer-events-none">
                        cm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skip for now / assurance footer */}
                <div className="flex items-center justify-between pt-0.5 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Modifiable anytime in Settings</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => finishOnboarding(true)}
                    className="text-zinc-400 hover:text-white font-semibold transition-colors cursor-pointer"
                  >
                    Skip stats for now
                  </button>
                </div>
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
        currentTemplateId={matchedTemplate.id}
        mode="select"
        onTemplateApplied={(template) => {
          setSelectedCustomTemplate(template);
          setTrainingDays(template.daysPerWeek);
          setIsTemplateModalOpen(false);
        }}
      />
    </div>
  );
};
