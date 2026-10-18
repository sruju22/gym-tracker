import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { WeekCalendarStrip } from '../components/home/WeekCalendarStrip';
import { TodayCard } from '../components/home/TodayCard';
import { WeeklyProgressCard } from '../components/home/WeeklyProgressCard';
import { EditPlanModal } from '../components/plan/EditPlanModal';
import { useWorkoutStore } from '../store/workoutStore';
import { useAuthStore } from '../store/authStore';
import { getTodayDayOfWeek } from '../utils/formatters';
import { DayOfWeek } from '../types';

export const HomePage: React.FC = () => {
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const today = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const { currentUser } = useAuthStore();
  const userId = currentUser?.id || 'guest';
  const { getWeeklyPlan, getHistory } = useWorkoutStore();

  const weeklyPlan = getWeeklyPlan(userId);
  const history = getHistory(userId);

  const handleSelectDay = (day: DayOfWeek, date: Date) => {
    setSelectedDay(day);
    setSelectedDate(date);
  };

  const handleJumpToToday = () => {
    setSelectedDay(today);
    setSelectedDate(new Date());
  };

  return (
    <div className="w-full max-w-full min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-4.5 animate-fade-in">
      {/* 1. Header with brand mark, profile avatar, theme switcher, and personalized greeting */}
      <Header showGreeting />

      {/* 2. Responsive Layout: Mobile stacked; Desktop 2-column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start w-full">
        {/* Main Column (Hero Focus): Weekly Calendar Strip + Prominent Today's Workout Card */}
        <div className="md:col-span-7 lg:col-span-6 xl:col-span-7 flex flex-col space-y-4">
          {/* Horizontal, swipe-friendly weekly date selector with exact date-tracking */}
          <WeekCalendarStrip
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            onSelectDay={handleSelectDay}
            weeklyPlan={weeklyPlan}
            history={history}
          />

          {/* Prominent Hero Workout Card (Date-Aware: Past, Today, Future) */}
          <TodayCard
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            onJumpToToday={handleJumpToToday}
            onOpenEditPlan={() => setIsEditPlanOpen(true)}
          />
        </div>

        {/* Secondary Column: Expanded Weekly Progress with Prominent Streak & 7-Day Schedule */}
        <div className="md:col-span-5 lg:col-span-6 xl:col-span-5 flex flex-col space-y-4">
          <WeeklyProgressCard onOpenEditPlan={() => setIsEditPlanOpen(true)} />
        </div>
      </div>

      {/* Weekly Plan Customization Modal */}
      <EditPlanModal isOpen={isEditPlanOpen} onClose={() => setIsEditPlanOpen(false)} />
    </div>
  );
};