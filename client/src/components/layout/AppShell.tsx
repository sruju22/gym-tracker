import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';
import { UserModal } from '../auth/UserModal';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] w-full max-w-full min-w-0 bg-[var(--bg-main)] text-[var(--text-main)] font-sans flex flex-col transition-colors">
      <DesktopNav />

      <main className="flex-1 flex flex-col min-h-0 w-full max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-5 md:px-6 py-4 md:py-6 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-12 animate-fade-in">
        {children || <Outlet />}
      </main>

      <BottomNav />
      <UserModal />
    </div>
  );
};