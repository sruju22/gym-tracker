import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useAuthStore } from './store/authStore';
import { useWorkoutStore } from './store/workoutStore';
import { prewarmBackend } from './api/authApi';

const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: <OnboardingFlow />,
  },
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    path: '/signin',
    element: <AuthPage />,
  },
  {
    path: '/signup',
    element: <AuthPage />,
  },
  {
    path: '/register',
    element: <AuthPage />,
  },
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
  const currentUser = useAuthStore((state) => state.currentUser);
  const restoreAuth = useAuthStore((state) => state.restoreAuth);
  const fetchWeeklyPlan = useWorkoutStore((state) => state.fetchWeeklyPlan);
  const fetchHistory = useWorkoutStore((state) => state.fetchHistory);
  const fetchBackendPRs = useWorkoutStore((state) => state.fetchBackendPRs);
  const fetchProgressStats = useWorkoutStore((state) => state.fetchProgressStats);
  const fetchSavedCombinations = useWorkoutStore((state) => state.fetchSavedCombinations);
  const syncPendingWorkouts = useWorkoutStore((state) => state.syncPendingWorkouts);
  const fetchCardioSessions = useWorkoutStore((state) => state.fetchCardioSessions);
  const syncPendingCardioSessions = useWorkoutStore((state) => state.syncPendingCardioSessions);

  useEffect(() => {
    prewarmBackend();
  }, []);

  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  useEffect(() => {
    const handleOnline = () => {
      if (currentUser?.id) {
        syncPendingWorkouts(currentUser.id);
        fetchHistory(currentUser.id);
        syncPendingCardioSessions(currentUser.id);
        fetchCardioSessions(currentUser.id);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentUser?.id, syncPendingWorkouts, fetchHistory, syncPendingCardioSessions, fetchCardioSessions]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchWeeklyPlan(currentUser.id);
      fetchHistory(currentUser.id);
      fetchBackendPRs(currentUser.id);
      fetchProgressStats(currentUser.id);
      fetchSavedCombinations(currentUser.id);
      fetchCardioSessions(currentUser.id);
    }
  }, [
    currentUser?.id,
    fetchWeeklyPlan,
    fetchHistory,
    fetchBackendPRs,
    fetchProgressStats,
    fetchSavedCombinations,
    fetchCardioSessions,
  ]);

  // Show onboarding ONLY when an authenticated user has explicitly not completed onboarding
  const needsOnboarding = currentUser !== null && currentUser.onboardingCompleted === false;

  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  return <RouterProvider router={router} />;
}

export default App;
