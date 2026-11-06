import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Dumbbell,
  BookOpen,
  History,
  TrendingUp,
  Settings,
  Sun,
  Moon,
  Laptop,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { useCoachStore } from '../../store/coachStore';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { ProfileAvatarButton } from './ProfileAvatarButton';

export const DesktopNav: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, openAccountModal } = useAuthStore();
  const { openCoach } = useCoachStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const userId = currentUser?.id || 'guest';
  const activeSession = useWorkoutStore((state) => state.getActiveSession(userId));
  const hasActiveWorkout = Boolean(
    activeSession &&
    activeSession.status === 'in_progress' &&
    activeSession.exercises &&
    activeSession.exercises.length > 0
  );

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/workout', label: 'Workout', icon: Dumbbell, hasPulsingBadge: hasActiveWorkout },
    { to: '/exercises', label: 'Exercises', icon: BookOpen },
    { to: '/history', label: 'History', icon: History },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const cycleTheme = () => {
    const next: ThemeMode =
      theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(next);
  };

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center cursor-pointer select-none group hover:opacity-90 transition-opacity"
          title="GymTrackie Home"
        >
          <GymTrackieLogo variant="compact" height={32} />
        </div>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[var(--primary-subtle)] text-[var(--primary)] font-extrabold border border-[var(--primary-border)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 stroke-[2]" />
                <span>{item.label}</span>
                {item.hasPulsingBadge && (
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Controls: AI Coach, Theme Toggle & Profile Button */}
        <div className="flex items-center gap-2.5">
          {/* AI Coach Trigger Button */}
          <button
            type="button"
            onClick={() => openCoach()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer shadow-xs shadow-red-500/10"
            title="Open AI Personal Training Coach"
            aria-label="Open AI Personal Training Coach"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Coach</span>
          </button>

          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
            title={`Current: ${theme} (Click to cycle)`}
            aria-label="Toggle theme appearance"
          >
            {theme === 'system' ? (
              <Laptop className="w-4 h-4" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          {/* Visible Sign In CTA for Guest Users */}
          {!currentUser && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              onMouseEnter={() => {
                const img = new Image();
                img.src = '/images/gymtrackie-signin-bg.jpg';
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-red-500/20 cursor-pointer shrink-0 touch-manipulation"
              aria-label="Sign in to GymTrackie"
              title="Sign In / Register"
            >
              <LogIn className="w-4 h-4 stroke-[2.4]" />
              <span>Sign In</span>
            </button>
          )}

          {/* Global Profile / Account Button */}
          <ProfileAvatarButton showName size="sm" />
        </div>
      </div>
    </header>
  );
};
