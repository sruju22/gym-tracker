import React from 'react';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] w-full max-w-full min-w-0 bg-[#090d16] text-slate-100 font-sans flex flex-col">
      <main className="flex-1 flex flex-col min-h-0 w-full max-w-full sm:max-w-xl mx-auto px-4 sm:px-5 py-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] animate-fade-in">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};