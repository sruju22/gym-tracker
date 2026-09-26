import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { TodayCard } from '../components/home/TodayCard';
import { WeeklyOverview } from '../components/home/WeeklyOverview';
import { RecentWorkout } from '../components/home/RecentWorkout';
import { EditPlanModal } from '../components/plan/EditPlanModal';

export const HomePage: React.FC = () => {
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);

  return (
    <div className="w-full max-w-full min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5">
      {/* 1. Header */}
      <Header showGreeting />

      {/* 2. Today's Workout Focus Card */}
      <TodayCard />

      {/* 3. Weekly Schedule Overview */}
      <WeeklyOverview onOpenEditPlan={() => setIsEditPlanOpen(true)} />

      {/* 4. Recent Workout */}
      <RecentWorkout />

      {/* Workout Plan Customization Modal */}
      <EditPlanModal isOpen={isEditPlanOpen} onClose={() => setIsEditPlanOpen(false)} />
    </div>
  );
};