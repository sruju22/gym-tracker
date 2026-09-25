import React from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Gym Tracker',
  subtitle,
  showGreeting = false,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-5 py-3 pt-safe mb-2">
      <div className="w-full sm:max-w-xl mx-auto flex items-center justify-between">
        {showGreeting ? (
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-semibold text-sky-400 uppercase tracking-wider mb-0.5">Welcome back, Srujan</div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight leading-tight truncate">
              Gym Tracker
            </h1>
          </div>
        ) : (
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        )}

        <button
          className="w-9 h-9 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm shadow-sky-500/20 active:scale-95 transition-transform flex-shrink-0 ml-3 border border-sky-400/40"
          aria-label="User Profile"
        >
          S
        </button>
      </div>
    </header>
  );
};
