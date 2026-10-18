import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, BookOpen, History, TrendingUp } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/workout', label: 'Workout', icon: Dumbbell },
    { to: '/exercises', label: 'Exercises', icon: BookOpen },
    { to: '/history', label: 'History', icon: History },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] shadow-lg transition-colors"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Bottom Navigation"
    >
      <div className="w-full max-w-md mx-auto flex items-center justify-around px-1 pt-1.5 pb-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group flex flex-col items-center justify-center flex-1 min-h-[44px] py-0.5 transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`
              }
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-10 h-6 sm:w-11 sm:h-6.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                        : 'bg-transparent text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] transition-transform duration-200 ${
                        isActive ? 'stroke-[2.2px] scale-105' : 'stroke-[1.8px]'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] tracking-tight leading-none mt-1 transition-colors duration-200 ${
                      isActive
                        ? 'font-black text-[var(--primary)]'
                        : 'font-semibold text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
