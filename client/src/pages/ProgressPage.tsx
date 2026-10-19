import React from 'react';
import { Lock, LogIn } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { formatVolume } from '../utils/formatters';
import { GoalsList } from '../components/goals/GoalsList';
import { ProgressionChart } from '../components/progress/ProgressionChart';
import { PersonalRecordsWall } from '../components/progress/PersonalRecordsWall';

export const ProgressPage: React.FC = () => {
  const { currentUser, openAccountModal } = useAuthStore();

  const { getUserData, getHistory, getPersonalRecords, getExercises } = useWorkoutStore();

  if (!currentUser) {
    return (
      <div className="w-full max-w-full min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5 pb-16">
        <Header title="Progress & Stats" subtitle="Personal Records, Analytics & Goals" />
        <div className="text-center py-12 px-5 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)]">Sign in to Track Progress & Records</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            Personal records, strength progression charts, volume trends, and fitness goals are securely linked to your personal account.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => openAccountModal()}
              className="gap-2 mx-auto font-bold px-6"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In or Register</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userId = currentUser.id;
  const userData = getUserData(userId);
  const history = getHistory(userId);
  const personalRecords = getPersonalRecords(userId);
  const exercises = getExercises(userId);

  const totalWorkouts = userData.progressSummary?.totalWorkouts ?? 0;
  const totalVolume = userData.progressSummary?.totalVolume ?? 0;
  const totalSets = userData.progressSummary?.totalSets ?? 0;

  return (
    <div className="w-full max-w-full min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5 pb-16">
      <Header title="Progress & Stats" subtitle="Personal Records, Analytics & Goals" />

      {/* Main Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 sm:p-4 text-center">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
            Workouts
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">{totalWorkouts}</div>
          <div className="text-[10px] sm:text-[11px] text-[var(--primary)] font-semibold mt-0.5">{totalSets} sets</div>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 sm:p-4 text-center">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
            Volume
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--primary)]">
            {formatVolume(totalVolume)} <span className="text-xs font-normal text-[var(--text-secondary)]">kg</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">Total volume</div>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] p-3 sm:p-4 text-center">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
            PRs Hit
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">{personalRecords.length}</div>
          <div className="text-[10px] sm:text-[11px] text-amber-400 font-semibold mt-0.5">Records</div>
        </Card>
      </div>

      {/* Fitness Goals Section */}
      <GoalsList />

      {/* Progression Graphs & Analytics */}
      <ProgressionChart history={history} exercises={exercises} />

      {/* Personal Records (PR) Wall Grouped by Muscle Group */}
      <PersonalRecordsWall
        personalRecords={personalRecords}
        exercises={exercises}
        history={history}
      />
    </div>
  );
};
