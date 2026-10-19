import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Check,
  Edit2,
  Sparkles,
  Sliders,
  Dumbbell,
  Zap,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, ThemeMode } from '../store/themeStore';
import { useWorkoutStore } from '../store/workoutStore';
import { WorkoutTemplatesModal } from '../components/plan/WorkoutTemplatesModal';
import { getRecommendedTemplate } from '../data/workoutTemplates';
import { WorkoutTemplate } from '../types';

export const SettingsPage: React.FC = () => {
  const { currentUser, updateProfile, logout, openAccountModal } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const {
    settings,
    updateUserSettings,
    updateCurrentWeight,
    fetchWeightLogs,
    fetchGoals,
    getActiveTemplate,
    getUserData,
    applyWorkoutTemplate,
  } = useWorkoutStore();

  const userId = currentUser?.id || 'guest';
  const userData = getUserData(userId);
  const activeTemplate = getActiveTemplate(userId);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [pendingRecommendation, setPendingRecommendation] = useState<WorkoutTemplate | null>(null);
  const [isApplyingRecommendation, setIsApplyingRecommendation] = useState(false);

  // Edit Profile Form
  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [weightInput, setWeightInput] = useState(
    currentUser?.currentWeight ? String(currentUser.currentWeight) : ''
  );
  const [heightInput, setHeightInput] = useState(
    currentUser?.heightCm ? String(currentUser.heightCm) : ''
  );
  const [goalInput, setGoalInput] = useState(
    currentUser?.fitnessGoal || 'Muscle Building & Hypertrophy'
  );
  const [daysInput, setDaysInput] = useState(currentUser?.trainingDaysPerWeek || 4);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleOpenEditProfile = () => {
    setNameInput(currentUser?.name || '');
    setWeightInput(currentUser?.currentWeight ? String(currentUser.currentWeight) : '');
    setHeightInput(currentUser?.heightCm ? String(currentUser.heightCm) : '');
    setGoalInput(currentUser?.fitnessGoal || 'Muscle Building & Hypertrophy');
    setDaysInput(currentUser?.trainingDaysPerWeek || 4);
    setSaveSuccess(false);
    setProfileError(null);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    let weight: number | null = null;
    if (weightInput.trim()) {
      weight = parseFloat(weightInput);
      if (isNaN(weight) || weight < 20 || weight > 500) {
        setProfileError('Please enter a realistic weight between 20 and 500 kg.');
        return;
      }
      weight = Math.round(weight * 10) / 10;
    }

    let height: number | null = null;
    if (heightInput.trim()) {
      height = parseFloat(heightInput);
      if (isNaN(height) || height < 50 || height > 280) {
        setProfileError('Please enter a realistic height between 50 and 280 cm.');
        return;
      }
      height = Math.round(height);
    }

    const previousGoal = currentUser?.fitnessGoal || 'Muscle Building & Hypertrophy';
    const previousDays = currentUser?.trainingDaysPerWeek || 4;
    const goalChanged = previousGoal !== goalInput;
    const daysChanged = previousDays !== Number(daysInput);

    setIsSaving(true);
    try {
      await updateProfile({
        name: nameInput.trim() || currentUser?.name,
        currentWeight: weight,
        heightCm: height,
        fitnessGoal: goalInput,
        trainingDaysPerWeek: Number(daysInput),
      });

      if (currentUser?.id && weight) {
        updateCurrentWeight(currentUser.id, weight);
        fetchWeightLogs(currentUser.id);
        fetchGoals(currentUser.id);
      }

      setSaveSuccess(true);

      // If goal or frequency changed, prompt user with the new recommended split
      if (goalChanged || daysChanged) {
        const newRec = getRecommendedTemplate(goalInput, Number(daysInput));
        setTimeout(() => {
          setIsEditProfileOpen(false);
          setSaveSuccess(false);
          setPendingRecommendation(newRec);
        }, 500);
      } else {
        setTimeout(() => {
          setIsEditProfileOpen(false);
          setSaveSuccess(false);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileError(err?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnitToggle = (unit: 'kg' | 'lbs') => {
    updateUserSettings({ weightUnit: unit });
    if (currentUser) {
      updateProfile({ weightUnit: unit }).catch(() => {});
    }
  };

  const themeOptions: { id: ThemeMode; label: string; desc: string; icon: any }[] = [
    {
      id: 'dark',
      label: 'Dark mode',
      desc: 'Near-black charcoal with energetic red accents',
      icon: Moon,
    },
    {
      id: 'light',
      label: 'Light mode',
      desc: 'Crisp clean theme with energetic red accents',
      icon: Sun,
    },
    {
      id: 'system',
      label: 'System default',
      desc: 'Automatically matches your device preference',
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-full">
      <Header title="Settings & Profile" subtitle="Preferences, Appearance & Account" />

      {/* 1. Profile Overview Card */}
      <Card className="p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-2xl font-black shadow-md shadow-red-500/25 shrink-0 border border-red-400">
              {currentUser ? currentUser.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)] truncate">
                  {currentUser?.name || 'Guest Athlete'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]">
                  {currentUser ? 'Member' : 'Guest'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                {currentUser?.email || 'Local session · Cloud sync disabled'}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
                <span>
                  {currentUser
                    ? 'Authenticated via MongoDB Atlas'
                    : 'Sign in to sync your workouts to the cloud'}
                </span>
              </div>
            </div>
          </div>

          {currentUser ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenEditProfile}
              className="gap-1.5 shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit Profile</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openAccountModal()}
              className="gap-1.5 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Button>
          )}
        </div>

        {/* Quick Profile Metric Pills */}
        {currentUser && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
            <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">GOAL</div>
              <div className="font-extrabold text-[var(--text-main)] truncate mt-0.5">
                {currentUser.fitnessGoal || 'General Fitness'}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">SCHEDULE</div>
              <div className="font-extrabold text-[var(--text-main)] mt-0.5">
                {currentUser.trainingDaysPerWeek || 4} Days / Week
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">WEIGHT</div>
              <div className="font-extrabold text-[var(--primary)] mt-0.5">
                {currentUser.currentWeight ? `${currentUser.currentWeight} ${currentUser.weightUnit || 'kg'}` : '—'}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">HEIGHT</div>
              <div className="font-extrabold text-[var(--text-main)] mt-0.5">
                {currentUser.heightCm ? `${currentUser.heightCm} cm` : '—'}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Theme & Appearance Settings */}
      <Card className="p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] tracking-tight">
            Appearance
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Choose how GymTrackie looks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer select-none relative focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                  isSelected
                    ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-sm font-extrabold text-[var(--text-main)]">{opt.label}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2.5 Active Workout Split Card */}
      <Card className="p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
              CURRENT PROGRAMMING
            </div>
            <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] tracking-tight mt-0.5">
              Active Workout Split & Schedule
            </h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="gap-1.5 self-start sm:self-auto"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Browse All 26 Splits</span>
          </Button>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-extrabold text-[var(--text-main)]">
                  {activeTemplate?.name || userData.templateName || 'Push / Pull / Legs (PPL) — 6-Day'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]">
                  {activeTemplate?.daysPerWeek || currentUser?.trainingDaysPerWeek || 4} Days / Week
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {activeTemplate?.shortDescription || 'Tailored weekly training schedule.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Sparkles className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <span>Goal: <strong className="text-[var(--text-main)]">{currentUser?.fitnessGoal || activeTemplate?.goal || 'Muscle Building & Hypertrophy'}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Progression: <strong className="text-[var(--text-main)] truncate">{activeTemplate?.progressionMethodology || userData.progressionRule || 'Double Progression'}</strong></span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Units & Training Preferences */}
      <Card className="p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl space-y-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
            TRAINING PREFERENCES
          </div>
          <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] tracking-tight mt-0.5">
            Units & Defaults
          </h3>
        </div>

        <div className="space-y-3 pt-1">
          {/* Weight Unit */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">Weight Unit</div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Used for set logs, plates, and volume charts
              </div>
            </div>

            <div className="flex gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => handleUnitToggle('kg')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  settings.weightUnit === 'kg'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                KG
              </button>
              <button
                type="button"
                onClick={() => handleUnitToggle('lbs')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  settings.weightUnit === 'lbs'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`}
              >
                LBS
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Account Actions */}
      <Card className="p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl space-y-3">
        <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
          Account Actions
        </h3>

        <div className="space-y-2">
          {currentUser ? (
            <>
              <Button
                variant="outline"
                fullWidth
                onClick={() => openAccountModal()}
                className="justify-start gap-3"
              >
                <LogIn className="w-4 h-4 text-[var(--primary)]" />
                <span>Switch Account</span>
              </Button>

              <Button
                variant="danger"
                fullWidth
                onClick={logout}
                className="justify-start gap-3"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Account</span>
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => openAccountModal()}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => openAccountModal()}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Profile & Preferences"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {saveSuccess && (
            <div className="p-2.5 rounded-xl bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success-border)] text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Preferences saved successfully!</span>
            </div>
          )}

          {profileError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold">
              {profileError}
            </div>
          )}

          <Input
            label="Full Name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Current Weight (${settings.weightUnit})`}
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="e.g. 75"
              unit={settings.weightUnit}
            />

            <Input
              label="Height (cm)"
              type="number"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              placeholder="e.g. 178"
              unit="cm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
              Primary Fitness Goal
            </label>
            <select
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] min-h-[44px]"
            >
              <option value="Muscle Building & Hypertrophy">Muscle Building & Hypertrophy</option>
              <option value="Strength & Power">Strength & Power</option>
              <option value="Fat Loss & Conditioning">Fat Loss & Conditioning</option>
              <option value="General Fitness & Longevity">General Fitness & Longevity</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5">
              Preferred Days / Week
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDaysInput(num)}
                  className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    daysInput === num
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {num} Days
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditProfileOpen(false)}
              fullWidth
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Workout Split Templates Browser */}
      <WorkoutTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        initialGoal={currentUser?.fitnessGoal || 'Muscle Building & Hypertrophy'}
        initialDays={currentUser?.trainingDaysPerWeek || 4}
      />

      {/* Split Recommendation Confirmation Modal */}
      {pendingRecommendation && (
        <Modal
          isOpen={!!pendingRecommendation}
          onClose={() => setPendingRecommendation(null)}
          title="Update Weekly Workout Split?"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-extrabold text-[var(--text-main)] text-sm">
                  Recommended: {pendingRecommendation.name}
                </div>
                <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Based on your updated goal (<span className="text-[var(--primary)] font-bold">{goalInput}</span>) and schedule (<span className="text-[var(--primary)] font-bold">{daysInput} Days / Week</span>).
                </p>
                <p className="text-[var(--text-secondary)] mt-1.5 leading-relaxed text-[11px]">
                  {pendingRecommendation.shortDescription}
                </p>
                <div className="mt-2 text-[10px] text-amber-400 font-mono bg-black/30 p-2 rounded-xl border border-white/5">
                  Progression: {pendingRecommendation.progressionMethodology}
                </div>
              </div>
            </div>

            {/* Data Safety Assurance */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>100% Data Safe</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Applying this new split only updates your weekly routine. Completed workout logs, PRs, and bodyweight stats will never be deleted.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setPendingRecommendation(null)}
                disabled={isApplyingRecommendation}
              >
                Keep Current Schedule
              </Button>
              <Button
                variant="primary"
                fullWidth
                disabled={isApplyingRecommendation}
                onClick={async () => {
                  setIsApplyingRecommendation(true);
                  try {
                    const activeUserId = currentUser?.id || 'guest';
                    await applyWorkoutTemplate(activeUserId, pendingRecommendation.id);
                  } finally {
                    setIsApplyingRecommendation(false);
                    setPendingRecommendation(null);
                  }
                }}
              >
                {isApplyingRecommendation ? 'Applying...' : 'Apply Recommended Split'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
