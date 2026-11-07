import React from 'react';
import { useCoachStore } from '../../store/coachStore';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { Sparkles } from 'lucide-react';

export const AICoachFAB: React.FC = () => {
  const { isOpen, openCoach } = useCoachStore();

  // Hide the floating button while the drawer is open to prevent overlapping
  if (isOpen) {
    return null;
  }

  return (
    <aside
      aria-label="AI Coach Quick Access"
      className="fixed z-40 right-4 md:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 animate-fade-in select-none"
    >
      <button
        onClick={() => openCoach()}
        type="button"
        aria-label="Open AI Personal Training Coach"
        className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#18181B]/95 dark:bg-[#121212]/95 backdrop-blur-md border-2 border-red-500/50 hover:border-red-500 shadow-xl shadow-red-950/50 hover:shadow-2xl hover:shadow-red-600/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        {/* Subtle background glow effect */}
        <span className="absolute inset-0 rounded-full bg-red-500/10 group-hover:bg-red-500/20 transition-colors pointer-events-none" />

        {/* GymTrackie Red & Silver Logo */}
        <div className="relative z-10 flex items-center justify-center pointer-events-none">
          <GymTrackieLogo
            variant="icon"
            height={28}
            width={28}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-110"
          />
        </div>

        {/* Mini AI Badge */}
        <span className="absolute -top-1 -right-1 z-20 flex items-center gap-0.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black/40 shadow-md uppercase tracking-wider">
          <Sparkles className="w-2.5 h-2.5" />
          AI
        </span>
      </button>
    </aside>
  );
};
