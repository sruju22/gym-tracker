import React, { useState } from 'react';
import {
  Target,
  Award,
  Calendar,
  Dumbbell,
  Scale,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';

interface OnboardingFlowProps {
  onCompleted?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onCompleted }) => {
  const { currentUser, completeOnboarding, isLoading } = useAuthStore();
  const { updateCurrentWeight, updateUserSettings } = useWorkoutStore();

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
      icon: Target,
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
      sub: 'Less than 1 year of consistent lifting.',
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      sub: '1 to 3 years of structured resistance training.',
    },
    {
      id: 'advanced',
      label: 'Advanced',
      sub: '3+ years with mastery of progressive overload & form.',
    },
  ];

  const daysOptions = [
    { days: 3, label: '3 Days / Wk', split: 'Full Body Split' },
    { days: 4, label: '4 Days / Wk', split: 'Upper / Lower Split' },
    { days: 5, label: '5 Days / Wk', split: 'PPL + Upper / Lower' },
    { days: 6, label: '6 Days / Wk', split: 'Push / Pull / Legs 2x' },
  ];

  const equipmentOptions = [
    {
      id: 'commercial',
      label: 'Full Commercial Gym',
      desc: 'Access to barbells, dumbbells, cables, and machines.',
    },
    {
      id: 'free_weights',
      label: 'Home Gym / Free Weights',
      desc: 'Barbell, weight plates, adjustable dumbbells, and bench.',
    },
    {
      id: 'dumbbells_bands',
      label: 'Dumbbells & Bands',
      desc: 'Compact home setup focused on dumbbell movements.',
    },
    {
      id: 'bodyweight',
      label: 'Calisthenics & Bodyweight',
      desc: 'Bodyweight exercises, pull-up bar, and minimal gear.',
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

  const finishOnboarding = async (skipPhysicalStats = false) => {
    const height = !skipPhysicalStats && heightCm ? parseFloat(heightCm) : null;
    const weight = !skipPhysicalStats && currentWeight ? parseFloat(currentWeight) : null;

    try {
      await completeOnboarding({
        fitnessGoal,
        experienceLevel,
        trainingDaysPerWeek: trainingDays,
        equipmentPreference,
        heightCm: height,
        currentWeight: weight,
        weightUnit,
      });

      // Synchronize weight & unit to local workout store
      if (currentUser?.id && weight) {
        updateCurrentWeight(currentUser.id, weight);
      }
      updateUserSettings({ weightUnit });

      if (onCompleted) {
        onCompleted();
      }
    } catch (err) {
      console.error('[Onboarding] Failed to save onboarding preferences:', err);
    }
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col justify-between overflow-hidden select-none">
      {/* Background Atmosphere: Athlete Photo + Vignette */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-15 dark:opacity-20 transition-opacity duration-500 scale-105"
        style={{ backgroundImage: `url('/images/onboarding-bg.jpg')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[var(--bg-main)]/85 via-[var(--bg-main)]/95 to-[var(--bg-main)] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />

      {/* Pinned Top Bar: Step Indicator & Skip Button */}
      <header className="relative z-10 w-full max-w-md mx-auto pt-[max(0.75rem,env(safe-area-inset-top))] px-4 sm:px-6 pb-2 shrink-0">
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[var(--primary)] text-white flex items-center justify-center font-black text-[10px] shadow-sm shadow-red-500/30">
              G
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--primary)]">
              Step {step} of {totalSteps}
            </span>
          </div>
          <button
            type="button"
            onClick={() => finishOnboarding(true)}
            className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[var(--primary-subtle)] active:scale-95"
          >
            Skip Onboarding
          </button>
        </div>

        {/* Minimal High-Contrast Progress Bar */}
        <div className="w-full h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Middle Scrollable Content (Card Options) */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-2 w-full max-w-md mx-auto flex flex-col justify-center">
        {/* STEP 1: FITNESS GOAL */}
        {step === 1 && (
          <div className="space-y-3.5 my-auto animate-fade-in">
            <div>
              <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">
                Welcome, {currentUser?.name?.toUpperCase() || 'Athlete'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight mt-0.5">
                What is your primary fitness goal?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                We'll tailor your daily workout focus, volume metrics, and progression to this goal.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {goalOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = fitnessGoal === opt.label;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setFitnessGoal(opt.label)}
                    className={`group flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm shadow-red-500/10 ring-1 ring-[var(--primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[var(--primary)] text-white shadow-xs'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] group-hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] truncate">
                          {opt.label}
                        </h3>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 ml-1.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-1">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: EXPERIENCE LEVEL */}
        {step === 2 && (
          <div className="space-y-3.5 my-auto animate-fade-in">
            <div>
              <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">
                Training Background
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight mt-0.5">
                How much lifting experience do you have?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Helps configure appropriate default sets, intensity, and progression curves.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {experienceOptions.map((opt) => {
                const isSelected = experienceLevel.startsWith(opt.label);
                return (
                  <div
                    key={opt.id}
                    onClick={() => setExperienceLevel(`${opt.label} (${opt.sub})`)}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm shadow-red-500/10 ring-1 ring-[var(--primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)]">
                        {opt.label}
                      </h3>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 ml-1.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                      {opt.sub}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: TRAINING FREQUENCY */}
        {step === 3 && (
          <div className="space-y-3.5 my-auto animate-fade-in">
            <div>
              <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">
                Weekly Schedule
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight mt-0.5">
                How many days per week do you plan to train?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Your weekly schedule and rest days will adapt to this frequency target.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {daysOptions.map((opt) => {
                const isSelected = trainingDays === opt.days;
                return (
                  <div
                    key={opt.days}
                    onClick={() => setTrainingDays(opt.days)}
                    className={`p-3 sm:p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer select-none flex flex-col justify-center items-center ${
                      isSelected
                        ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm shadow-red-500/10 ring-1 ring-[var(--primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="text-2xl font-black text-[var(--primary)] tracking-tight">
                      {opt.days}
                    </div>
                    <div className="text-xs font-black text-[var(--text-main)] mt-0.5">
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-tight">
                      {opt.split}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: EQUIPMENT PREFERENCE */}
        {step === 4 && (
          <div className="space-y-3.5 my-auto animate-fade-in">
            <div>
              <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">
                Equipment & Environment
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight mt-0.5">
                Where will you be working out?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                We'll prioritize movements and exercise substitutions compatible with your gear.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {equipmentOptions.map((opt) => {
                const isSelected = equipmentPreference === opt.label;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setEquipmentPreference(opt.label)}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm shadow-red-500/10 ring-1 ring-[var(--primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)]">
                        {opt.label}
                      </h3>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 ml-1.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: OPTIONAL BODY STATS */}
        {step === 5 && (
          <div className="space-y-3.5 my-auto animate-fade-in">
            <div>
              <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">
                Final Step · Optional
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight mt-0.5">
                Body Stats (Optional)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Optional metrics for tracking bodyweight progress and relative strength. You can update these anytime in Settings.
              </p>
            </div>

            <Card className="p-3.5 sm:p-4 space-y-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl">
              {/* Preferred Unit Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Weight Unit
                </span>
                <div className="flex gap-1 bg-[var(--bg-card)] p-0.5 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setWeightUnit('kg')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      weightUnit === 'kg'
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnit('lbs')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      weightUnit === 'lbs'
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    LBS
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
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
            </Card>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => finishOnboarding(true)}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
              >
                Skip physical stats and continue →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Pinned Bottom Navigation: Always above iOS safe area */}
      <footer className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={handleBack}
              className="gap-1.5 px-3.5 h-11 rounded-xl shrink-0 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          )}

          <Button
            variant="primary"
            onClick={handleNext}
            fullWidth
            disabled={isLoading}
            className="h-11 rounded-xl gap-2 font-black text-sm shadow-md shadow-red-500/20 active:scale-[0.98]"
          >
            <span>
              {step === totalSteps
                ? (isLoading ? 'Saving Setup...' : 'Finish & Go to Dashboard')
                : 'Continue'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
};
