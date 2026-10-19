import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { User } from 'lucide-react';

interface ProfileAvatarButtonProps {
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ProfileAvatarButton: React.FC<ProfileAvatarButtonProps> = ({
  size = 'md',
  showName = false,
  className = '',
  onClick,
}) => {
  const { currentUser, openAccountModal } = useAuthStore();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openAccountModal();
    }
  };

  const initialLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : null;

  const sizeClasses =
    size === 'sm'
      ? 'w-7 h-7 text-[11px]'
      : 'w-8 h-8 sm:w-8.5 sm:h-8.5 text-xs';

  if (!currentUser) {
    // Guest Mode: Neutral profile outline icon
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-2 rounded-full cursor-pointer select-none active:scale-95 transition-all group ${
          showName
            ? 'pl-1.5 pr-3 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)]'
            : ''
        } ${className}`}
        aria-label="User Account & Sign In"
        title="Guest Mode — Tap to Sign In or Create Account"
      >
        <div
          className={`${sizeClasses} rounded-full flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-secondary)] group-hover:text-[var(--text-main)] border border-[var(--border-subtle)] shadow-xs transition-colors shrink-0`}
        >
          <User className="w-3.5 h-3.5 stroke-[2.2]" />
        </div>
        {showName && (
          <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors">
            Sign In
          </span>
        )}
      </button>
    );
  }

  // Authenticated User: Profile Picture (if available) or Initials Fallback
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2.5 rounded-full cursor-pointer select-none active:scale-95 transition-all group ${
        showName
          ? 'pl-1.5 pr-3.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
          : ''
      } ${className}`}
      aria-label={`User Profile: ${currentUser.name}`}
      title={`${currentUser.name} (Signed In)`}
    >
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-black shadow-sm shrink-0 overflow-hidden border ${
          currentUser.avatarUrl
            ? 'border-[var(--border-subtle)]'
            : 'bg-[var(--primary)] text-white shadow-red-500/25 border-red-400'
        }`}
      >
        {currentUser.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initialLetter || 'A'}</span>
        )}
      </div>

      {showName && (
        <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors max-w-[130px] truncate">
          {currentUser.name}
        </span>
      )}
    </button>
  );
};
