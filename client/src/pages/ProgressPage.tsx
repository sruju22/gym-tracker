import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  TrendingUp,
  Award,
  Target,
  Info,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { formatVolume } from '../utils/formatters';
import { GoalsList } from '../components/goals/GoalsList';
import { BodyWeightCard } from '../components/weight/BodyWeightCard';
import { PersonalRecordsWall } from '../components/progress/PersonalRecordsWall';
import { TrainingAnalyticsView } from '../components/progress/TrainingAnalyticsView';
import { getVolumeAnalytics, derivePersonalRecords } from '../utils/analyticsEngine';
import { PersonalRecord } from '../types';

type ProgressTab = 'analytics' | 'prs' | 'goals';

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ProgressTab>('analytics');

  const { getUserData, getHistory, getPersonalRecords, getExercises } = useWorkoutStore();

  const userId = currentUser?.id || 'guest';
  const userData = getUserData(userId);
  const history = getHistory(userId);
  const storedPRs = getPersonalRecords(userId);
  const exercises = getExercises(userId);

  // Derive real client-side analytics directly from verified history
  const volumeAnalytics = useMemo(() => {
    return getVolumeAnalytics(history, 'all');
  }, [history]);

  const completedSessionsCount = useMemo(() => {
    return history.filter((h) => h.status === 'completed').length;
  }, [history]);

  const totalWorkouts = completedSessionsCount;
  const totalVolume = volumeAnalytics.totalLoadVolume;
  const totalSets = volumeAnalytics.totalCompletedSets;

  // Derive PRs from history if storedPRs is empty or to ensure complete history coverage
  const effectivePRs: PersonalRecord[] = useMemo(() => {
    if (storedPRs.length > 0) return storedPRs;
    const derived = derivePersonalRecords(history, exercises);
    return derived.map((d) => ({
      id: `pr_${d.exerciseId}`,
      exerciseId: d.exerciseId,
      exerciseName: d.exerciseName,
      type: 'max_weight',
      prCategory: 'max_weight',
      value: d.maxWeight.value,
      weight: d.maxWeight.value,
      reps: d.maxWeight.reps,
      estimated1RM: d.max1RM.estimated1RM,
      date: d.maxWeight.date,
      details: `${d.maxWeight.value} kg × ${d.maxWeight.reps} reps (Est. 1RM ${d.max1RM.estimated1RM} kg)`,
    }));
  }, [storedPRs, history, exercises]);

  return (
    <div className="w-full max-w-full min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5 pb-16">
      <Header title="Progress & Stats" subtitle="Training Analytics, Records & Goals" />

      {/* Guest Mode Notice */}
      {!currentUser && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[var(--text-main)]">Guest Mode Active</div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Training data and analytics are saved locally on this device.
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
            className="gap-1.5 text-xs font-bold shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </Button>
        </div>
      )}

      {/* Main Stats Summary Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-2.5 sm:p-3.5 text-center">
          <div className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
            Workouts
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--text-main)]">{totalWorkouts}</div>
          <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">Completed</div>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-2.5 sm:p-3.5 text-center">
          <div className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
            Volume
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--primary)]">
            {formatVolume(totalVolume)} <span className="text-[10px] font-normal text-[var(--text-secondary)]">kg</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">Load lifted</div>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-2.5 sm:p-3.5 text-center">
          <div className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
            Sets
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{totalSets}</div>
          <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">Working sets</div>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-2.5 sm:p-3.5 text-center">
          <div className="text-[9px] sm:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
            PRs Hit
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">{effectivePRs.length}</div>
          <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">Records</div>
        </Card>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center bg-[var(--bg-input)] p-1 rounded-2xl border border-[var(--border-subtle)]">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none ${
            activeTab === 'analytics'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>Analytics & Progress</span>
        </button>

        <button
          onClick={() => setActiveTab('prs')}
          className={`flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none ${
            activeTab === 'prs'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0" />
          <span>Personal Records ({effectivePRs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className={`flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none ${
            activeTab === 'goals'
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
          }`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span>Goals & Weight</span>
        </button>
      </div>

      {/* TAB 1: Analytics & Progression View */}
      {activeTab === 'analytics' && (
        <TrainingAnalyticsView
          history={history}
          exercises={exercises}
          weeklyPlan={userData.weeklyPlan}
          targetDaysPerWeek={currentUser?.trainingDaysPerWeek || 4}
        />
      )}

      {/* TAB 2: Personal Records Wall */}
      {activeTab === 'prs' && (
        <PersonalRecordsWall
          personalRecords={effectivePRs}
          exercises={exercises}
          history={history}
        />
      )}

      {/* TAB 3: Goals & Body Weight */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <BodyWeightCard />
          <GoalsList />
        </div>
      )}
    </div>
  );
};
