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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D0F]/95 backdrop-blur-md border-t border-[#272B30] pb-safe">
      <div className="w-full sm:max-w-xl mx-auto flex items-center justify-around h-13 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-10 rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? 'text-[#E11D48] font-bold bg-[#E11D48]/10'
                    : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'stroke-[2.5px] text-[#E11D48]' : 'stroke-2'}`} />
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
