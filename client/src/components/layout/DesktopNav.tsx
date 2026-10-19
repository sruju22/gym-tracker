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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { ProfileAvatarButton } from './ProfileAvatarButton';

export const DesktopNav: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/workout', label: 'Workout', icon: Dumbbell },
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
              </NavLink>
            );
          })}
        </nav>

        {/* Right Controls: Theme Toggle & Profile Button */}
        <div className="flex items-center gap-3">
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

          {/* Global Profile / Account Button */}
          <ProfileAvatarButton showName size="sm" />
        </div>
      </div>
    </header>
  );
};
