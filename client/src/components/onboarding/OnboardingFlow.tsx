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
  const [fitnessGoal, setFitnessGoal] = useState<string>('Muscle Building / Hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<string>('Intermediate (1-3 yrs)');
  const [trainingDays, setTrainingDays] = useState<number>(4);
  const [equipmentPreference, setEquipmentPreference] = useState<string>('Full Commercial Gym');
  const [heightCm, setHeightCm] = useState<string>('');
  const [currentWeight, setCurrentWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  const goalOptions = [
    {
      id: 'hypertrophy',
      label: 'Muscle Building & Hypertrophy',
      desc: 'Build lean mass, maximize muscle volume, and sculpt your physique.',
      icon: Dumbbell,
    },
    {
      id: 'strength',
      label: 'Strength & Power',
      desc: 'Increase 1RM on compound lifts and build raw athletic power.',
      icon: Award,
    },
    {
      id: 'fat_loss',
      label: 'Fat Loss & Conditioning',
      desc: 'Burn calories, lean down, and increase overall endurance.',
      icon: Target,
    },
    {
      id: 'general',
      label: 'General Fitness & Longevity',
      desc: 'Maintain daily energy, mobility, and consistent lifelong training.',
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
      sub: '1 to 3 years of structured gym training.',
    },
    {
      id: 'advanced',
      label: 'Advanced',
      sub: '3+ years with solid knowledge of technique and overload.',
    },
  ];

  const daysOptions = [
    { days: 3, label: '3 Days / Week', split: 'Full Body or Minimalist' },
    { days: 4, label: '4 Days / Week', split: 'Upper / Lower Split' },
    { days: 5, label: '5 Days / Week', split: 'Push / Pull / Legs + Upper / Lower' },
    { days: 6, label: '6 Days / Week', split: 'Push / Pull / Legs 2x' },
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
      desc: 'Compact home setup focused on dumbbell and resistance movements.',
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

      // Synchronize weight to local workoutStore if provided
      if (currentUser?.id && weight) {
        updateCurrentWeight(currentUser.id, weight);
      }
      updateUserSettings({ weightUnit });

      if (onCompleted) {
        onCompleted();
      }
    } catch (err) {
      console.error('Failed to save onboarding preferences:', err);
    }
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="w-full max-w-lg mx-auto py-6 sm:py-10 animate-fade-in">
      {/* Top Header & Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] mb-2">
          <span>STEP {step} OF {totalSteps}</span>
          <button
            onClick={() => finishOnboarding(true)}
            className="text-[var(--primary)] hover:underline cursor-pointer"
          >
            Skip Onboarding
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* STEP 1: FITNESS GOAL */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
              WELCOME, {currentUser?.name?.toUpperCase() || 'ATHLETE'}
            </span>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight mt-1">
              What is your primary fitness goal?
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              We'll tailor your daily workout focus, volume metrics, and analytics to this goal.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {goalOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = fitnessGoal === opt.label;
              return (
                <div
                  key={opt.id}
                  onClick={() => setFitnessGoal(opt.label)}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[var(--text-main)]">
                        {opt.label}
                      </h3>
                      {isSelected && <Check className="w-4 h-4 text-[var(--primary)] stroke-[3]" />}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
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
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
              TRAINING BACKGROUND
            </span>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight mt-1">
              How much lifting experience do you have?
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Helps us set appropriate default sets, intensity, and progression curves.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {experienceOptions.map((opt) => {
              const isSelected = experienceLevel.startsWith(opt.label);
              return (
                <div
                  key={opt.id}
                  onClick={() => setExperienceLevel(`${opt.label} (${opt.sub})`)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[var(--text-main)]">
                      {opt.label}
                    </h3>
                    {isSelected && <Check className="w-4 h-4 text-[var(--primary)] stroke-[3]" />}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
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
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
              WEEKLY SCHEDULE
            </span>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight mt-1">
              How many days per week do you plan to train?
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Your weekly schedule and rest days will adapt to this target.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {daysOptions.map((opt) => {
              const isSelected = trainingDays === opt.days;
              return (
                <div
                  key={opt.days}
                  onClick={() => setTrainingDays(opt.days)}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="text-2xl font-black text-[var(--primary)] mb-1">
                    {opt.days}
                  </div>
                  <div className="text-xs font-black text-[var(--text-main)]">
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
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
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
              EQUIPMENT & ENVIRONMENT
            </span>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight mt-1">
              Where will you be working out?
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              We'll prioritize exercises and variations compatible with your gear.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {equipmentOptions.map((opt) => {
              const isSelected = equipmentPreference === opt.label;
              return (
                <div
                  key={opt.id}
                  onClick={() => setEquipmentPreference(opt.label)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[var(--text-main)]">
                      {opt.label}
                    </h3>
                    {isSelected && <Check className="w-4 h-4 text-[var(--primary)] stroke-[3]" />}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
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
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">
              FINAL STEP · OPTIONAL
            </span>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight mt-1">
              Body Stats (Optional)
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Optional metrics for tracking bodyweight progress and relative strength. You can skip this or update it anytime.
            </p>
          </div>

          <Card className="p-4 sm:p-5 space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {/* Preferred Unit Toggle */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">WEIGHT UNIT</span>
              <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-subtle)]">
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

            <div className="grid grid-cols-2 gap-3">
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
              onClick={() => finishOnboarding(true)}
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              Skip physical stats and continue →
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3 pt-6 mt-6 border-t border-[var(--border-subtle)]">
        {step > 1 && (
          <Button
            variant="secondary"
            onClick={handleBack}
            className="gap-2"
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
          className="gap-2"
        >
          <span>{step === totalSteps ? (isLoading ? 'Saving...' : 'Finish & Go to Dashboard') : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
