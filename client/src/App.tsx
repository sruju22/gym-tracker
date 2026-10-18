import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useAuthStore } from './store/authStore';
import { useWorkoutStore } from './store/workoutStore';
import { prewarmBackend } from './api/authApi';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  const { currentUser, restoreAuth, isInitializing } = useAuthStore();
  const fetchWeeklyPlan = useWorkoutStore((state) => state.fetchWeeklyPlan);
  const fetchHistory = useWorkoutStore((state) => state.fetchHistory);
  const fetchBackendPRs = useWorkoutStore((state) => state.fetchBackendPRs);
  const fetchProgressStats = useWorkoutStore((state) => state.fetchProgressStats);

  useEffect(() => {
    prewarmBackend();
  }, []);

  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchWeeklyPlan(currentUser.id);
      fetchHistory(currentUser.id);
      fetchBackendPRs(currentUser.id);
      fetchProgressStats(currentUser.id);
    }
  }, [currentUser?.id, fetchWeeklyPlan, fetchHistory, fetchBackendPRs, fetchProgressStats]);

  // If a newly registered user has not completed onboarding, show OnboardingFlow
  const needsOnboarding =
    !isInitializing && currentUser && currentUser.onboardingCompleted === false;

  if (needsOnboarding) {
    return (
      <div className="min-h-[100dvh] w-full bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center p-4">
        <OnboardingFlow />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;
