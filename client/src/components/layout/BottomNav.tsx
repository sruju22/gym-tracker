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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] pb-safe shadow-xl transition-colors">
      <div className="w-full max-w-md mx-auto flex items-center justify-around h-15 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center flex-1 h-12 rounded-2xl transition-all cursor-pointer select-none ${
                  isActive
                    ? 'text-[var(--primary)] font-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-1 w-5 h-0.5 rounded-full bg-[var(--primary)] shadow-sm shadow-red-500/50" />
                  )}
                  <Icon
                    className={`w-5 h-5 mb-0.5 transition-all ${
                      isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'
                    }`}
                  />
                  <span className={`text-[10px] tracking-tight ${isActive ? 'font-black' : 'font-medium'}`}>
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
