import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProgressPage } from './pages/ProgressPage';
import { useAuthStore } from './store/authStore';
import { useWorkoutStore } from './store/workoutStore';

export function App() {
  const { currentUser, restoreAuth } = useAuthStore();
  const fetchWeeklyPlan = useWorkoutStore((state) => state.fetchWeeklyPlan);
  const fetchHistory = useWorkoutStore((state) => state.fetchHistory);
  const fetchBackendPRs = useWorkoutStore((state) => state.fetchBackendPRs);
  const fetchProgressStats = useWorkoutStore((state) => state.fetchProgressStats);

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

  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

export default App;
