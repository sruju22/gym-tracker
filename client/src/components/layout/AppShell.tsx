import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, ArrowRight } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';
import { UserModal } from '../auth/UserModal';
import { AICoachDrawer } from '../coach/AICoachDrawer';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.id || 'guest';
  const activeSession = useWorkoutStore((state) => state.getActiveSession(userId));

  React.useEffect(() => {
    // Warm up the sign in background image in the browser cache ahead of user interaction
    const img = new Image();
    img.src = '/images/gymtrackie-signin-bg.jpg';
  }, []);

  const hasActiveWorkout = Boolean(
    activeSession &&
    activeSession.status === 'in_progress' &&
    activeSession.exercises &&
    activeSession.exercises.length > 0
  );
  const isWorkoutPage = location.pathname === '/workout';

  return (
    <div className="min-h-[100dvh] w-full max-w-full min-w-0 bg-[var(--bg-main)] text-[var(--text-main)] font-sans flex flex-col transition-colors">
      <DesktopNav />

      {/* Floating Active Workout Banner when navigating outside workout page */}
      {hasActiveWorkout && !isWorkoutPage && (
        <aside
          role="status"
          aria-label="Active workout in progress"
          onClick={() => navigate('/workout')}
          className="sticky top-0 md:top-16 z-30 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white px-4 py-2 cursor-pointer shadow-md hover:opacity-95 transition-all select-none"
        >
          <div className="max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <Dumbbell className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Workout in progress: <span className="font-black underline">{activeSession?.workoutName || 'Active Session'}</span> ({activeSession?.exercises.length} exercise{activeSession?.exercises.length === 1 ? '' : 's'})
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 bg-black/20 hover:bg-black/30 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-tight">
              <span>Resume</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-h-0 w-full max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-5 md:px-6 py-4 md:py-6 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-12 animate-fade-in">
        {children || <Outlet />}
      </main>

      <BottomNav />
      <UserModal />
      <AICoachDrawer />
    </div>
  );
};
