import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { UserModal } from '../auth/UserModal';
import { User } from 'lucide-react';

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
  const { currentUser } = useAuthStore();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const initialLetter = currentUser ? currentUser.name.charAt(0).toUpperCase() : null;

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#0B0D0F]/95 backdrop-blur-md border-b border-[#272B30] px-4 sm:px-5 py-3 pt-safe mb-2">
        <div className="w-full sm:max-w-xl mx-auto flex items-center justify-between">
          {showGreeting ? (
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-0.5">
                {currentUser ? 'Welcome back' : 'Welcome to GymTracker'}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#E11D48] tracking-tight leading-tight truncate">
                {currentUser?.name || 'Guest Athlete'}
              </h1>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-[#F5F5F5] tracking-tight leading-tight truncate">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{subtitle}</p>}
            </div>
          )}

          <button
            onClick={() => setIsUserModalOpen(true)}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-sm active:scale-95 transition-transform flex-shrink-0 ml-3 border cursor-pointer ${
              currentUser
                ? 'bg-[#E11D48] text-[#FFFFFF] shadow-[#E11D48]/20 border-[#F43F5E]'
                : 'bg-[#1F2429] text-[#9CA3AF] hover:text-[#F5F5F5] border-[#272B30]'
            }`}
            aria-label="User Profile"
            title={currentUser ? `${currentUser.name} (Signed In)` : 'Not Signed In — Click to Sign In'}
          >
            {currentUser ? initialLetter : <User className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
    </>
  );
};
