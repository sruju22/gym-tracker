import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, ThemeMode } from '../../store/themeStore';
import { Sun, Moon, Laptop, LogIn, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCoachStore } from '../../store/coachStore';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { ProfileAvatarButton } from './ProfileAvatarButton';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showGreeting?: boolean;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showGreeting = false,
  action,
}) => {
  const navigate = useNavigate();
  const { currentUser, openAccountModal } = useAuthStore();
  const { openCoach } = useCoachStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  const cycleTheme = () => {
    const next: ThemeMode =
      theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(next);
  };

  const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = (): string => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <header className="w-full transition-colors pb-1">
      {/* Top Mobile Bar: Brand Mark + Quick Controls */}
      <div className="flex items-center justify-between mb-2 md:hidden">
        {/* Brand Mark */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center cursor-pointer select-none active:opacity-80 transition-opacity"
          title="GymTrackie Home"
        >
          <GymTrackieLogo variant="compact" height={28} />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* AI Coach Trigger Button */}
          <button
            type="button"
            onClick={() => openCoach()}
            className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Open AI Coach"
            aria-label="Open AI Personal Training Coach"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-all cursor-pointer"
            title={`Theme: ${theme}`}
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
              onTouchStart={() => {
                const img = new Image();
                img.src = '/images/gymtrackie-signin-bg.jpg';
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-red-500/20 cursor-pointer shrink-0 touch-manipulation"
              aria-label="Sign In"
              title="Sign In to GymTrackie"
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>Sign In</span>
            </button>
          )}

          {/* Global Profile / Account Button */}
          <ProfileAvatarButton />
        </div>
      </div>

      {/* Personalized Greeting or Page Title */}
      {showGreeting ? (
        <div className="min-w-0 pt-1">
          <div className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5">
            {getFormattedDate()}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight leading-tight truncate">
            {getTimeGreeting()},{' '}
            <span className="text-[var(--primary)]">{currentUser?.name || 'Athlete'}</span>
          </h1>
        </div>
      ) : title ? (
        <div className="min-w-0 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 truncate font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex items-center gap-2 shrink-0">
              {action}
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
};
