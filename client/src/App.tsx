import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProgressPage } from './pages/ProgressPage';
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
    ],
  },
]);

export function App() {
  const { currentUser, restoreAuth } = useAuthStore();
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
    const id = currentUser?.id || 'user_srujan';
    fetchWeeklyPlan(id);
    fetchHistory(id);
    fetchBackendPRs(id);
    fetchProgressStats(id);
  }, [currentUser?.id, fetchWeeklyPlan, fetchHistory, fetchBackendPRs, fetchProgressStats]);

  return <RouterProvider router={router} />;
}

export default App;
