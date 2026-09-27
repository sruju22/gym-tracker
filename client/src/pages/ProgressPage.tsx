import React from 'react';
import { Award } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { formatDateShort, formatVolume } from '../utils/formatters';
import { GoalsList } from '../components/goals/GoalsList';
import { ProgressionChart } from '../components/progress/ProgressionChart';

export const ProgressPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'user_srujan';

  const { getUserData, getHistory, getPersonalRecords, getExercises } = useWorkoutStore();
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
        <Card className="bg-[#14171A] border-[#272B30] p-3 sm:p-4 text-center">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">
            Workouts
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#F5F5F5]">{totalWorkouts}</div>
          <div className="text-[10px] sm:text-[11px] text-[#E11D48] font-semibold mt-0.5">{totalSets} sets</div>
        </Card>

        <Card className="bg-[#14171A] border-[#272B30] p-3 sm:p-4 text-center">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">
            Volume
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#E11D48]">
            {formatVolume(totalVolume)} <span className="text-xs font-normal text-[#9CA3AF]">kg</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#9CA3AF] font-medium mt-0.5">Total volume</div>
        </Card>

        <Card className="bg-[#14171A] border-[#272B30] p-3 sm:p-4 text-center">
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">
            PRs Hit
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#F5F5F5]">{personalRecords.length}</div>
          <div className="text-[10px] sm:text-[11px] text-amber-400 font-semibold mt-0.5">Records</div>
        </Card>
      </div>

      {/* Fitness Goals Section */}
      <GoalsList />

      {/* Progression Graphs & Analytics */}
      <ProgressionChart history={history} exercises={exercises} />

      {/* Personal Records (PR) Wall */}
      <Card className="flex-1 flex flex-col justify-between bg-[#14171A] border-[#272B30] p-4 sm:p-5 rounded-2xl min-h-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] uppercase tracking-wide">
                Personal Records ({personalRecords.length})
              </h3>
            </div>
            <Badge variant="warning">Best Lifts</Badge>
          </div>

          <div className="space-y-2">
            {personalRecords.map((pr) => (
              <div
                key={pr.id}
                className="bg-[#1B1F23] border border-[#272B30] rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-black text-[#F5F5F5]">{pr.exerciseName}</div>
                  <div className="text-[11px] text-amber-400 font-semibold">
                    {pr.weight} kg × {pr.reps} reps <span className="text-[#9CA3AF] font-normal">(Est. 1RM {pr.estimated1RM} kg)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-[#E11D48]">{pr.weight} kg</div>
                  <div className="text-[10px] text-[#6B7280]">{formatDateShort(pr.date)}</div>
                </div>
              </div>
            ))}

            {personalRecords.length === 0 && (
              <div className="text-center py-6 text-xs text-[#9CA3AF] italic">
                No Personal Records recorded yet. Complete a workout to log PRs!
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
