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

export const DesktopNav: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
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

  const initialLetter = currentUser ? currentUser.name.charAt(0).toUpperCase() : 'A';

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-black shadow-sm shadow-red-500/25 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-lg font-black tracking-wider text-[var(--text-main)]">
            GYM<span className="text-[var(--primary)]">TRACKIE</span>
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
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

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-black shadow-xs">
              {initialLetter}
            </div>
            <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors max-w-[120px] truncate">
              {currentUser?.name || 'Athlete'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
