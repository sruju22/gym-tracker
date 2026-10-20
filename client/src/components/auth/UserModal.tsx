import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  User as UserIcon,
  LogOut,
  ShieldCheck,
  LogIn,
  Settings,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { GoogleSignInButton } from './GoogleSignInButton';

interface UserModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const isAccountModalOpen = useAuthStore((state) => state.isAccountModalOpen);
  const closeAccountModal = useAuthStore((state) => state.closeAccountModal);

  const isQueryOpen = searchParams.get('account') === 'open';
  const isOpen = propIsOpen !== undefined ? propIsOpen : (isAccountModalOpen || isQueryOpen);

  React.useEffect(() => {
    if (isOpen) {
      const img = new Image();
      img.src = '/images/gymtrackie-signin-bg.jpg';
    }
  }, [isOpen]);
  const onClose = propOnClose !== undefined ? propOnClose : () => {
    closeAccountModal();
    if (isQueryOpen) {
      searchParams.delete('account');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNavigateToAuth = (mode?: 'signup' | 'signin') => {
    closeAccountModal();
    const target = mode === 'signup' ? '/login?mode=signup' : '/login';
    navigate(target);
  };

  const goToSettings = () => {
    closeAccountModal();
    navigate('/settings');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
      title={currentUser ? 'My Account' : 'User Account'}
    >
      <div className="flex justify-center pb-2">
        <GymTrackieLogo variant="compact" height={26} />
      </div>

      <div className="space-y-3">
        {currentUser ? (
          /* ================= AUTHENTICATED ACCOUNT PANEL ================= */
          <>
            {/* User Identity Card */}
            <div className="flex items-center gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border border-[var(--border-subtle)] shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-lg font-black shadow-sm shrink-0 border border-red-400">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-[var(--text-main)] truncate">
                    {currentUser.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Signed In
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {currentUser.email}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-muted)]">
                  <ShieldCheck className="w-3 h-3 text-[var(--success)]" />
                  <span>MongoDB Atlas Cloud Sync Active</span>
                </div>
              </div>
            </div>

            {/* Linked Accounts Status */}
            {currentUser.googleLinked ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Google Account Connected</span>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/15 px-1.5 py-0.5 rounded">
                  1-Tap Ready
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <div>
                  <div className="text-xs font-bold text-[var(--text-main)]">Link Google Account</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    Connect Google for 1-tap sign-in next time
                  </div>
                </div>
                <div className="pt-0.5">
                  <GoogleSignInButton
                    mode="link"
                    text="continue_with"
                    onSuccess={() => {}}
                  />
                </div>
              </div>
            )}

            {/* Preferences, Goals & Themes Row */}
            <button
              type="button"
              onClick={goToSettings}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] transition-all cursor-pointer group text-left min-h-[44px]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--primary-subtle)] flex items-center justify-center shrink-0 text-[var(--primary)]">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--text-main)] truncate">
                  Preferences, Goals & Themes
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Prominent Sign Out Button */}
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                logout();
                handleClose();
              }}
              className="justify-center gap-2 h-11 min-h-[44px] text-xs font-bold mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </Button>
          </>
        ) : (
          /* ================= GUEST ACCOUNT CHOOSER PANEL ================= */
          <>
            {/* Compact Guest Mode Status */}
            <div className="bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border-subtle)] space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-muted)] shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold text-[var(--text-main)]">
                      Guest Mode
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                      Local Storage
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                    Not connected to cloud
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Workouts and personal records are currently stored locally on this device. Sign in to synchronize your history and goals across all devices securely.
              </p>
            </div>

            {/* Clear Primary CTA: Dedicated Sign In or Create Account */}
            <div className="pt-1 space-y-2">
              <Button
                variant="primary"
                onClick={() => handleNavigateToAuth('signin')}
                onMouseEnter={() => {
                  const img = new Image();
                  img.src = '/images/gymtrackie-signin-bg.jpg';
                }}
                onTouchStart={() => {
                  const img = new Image();
                  img.src = '/images/gymtrackie-signin-bg.jpg';
                }}
                fullWidth
                className="gap-2 text-xs sm:text-sm h-12 min-h-[48px] rounded-xl font-extrabold shadow-md shadow-red-600/20 justify-center touch-manipulation"
              >
                <LogIn className="w-4 h-4 stroke-[2.4]" />
                <span>Sign In or Create Account</span>
              </Button>
            </div>

            {/* Preferences, Goals & Themes Row */}
            <button
              type="button"
              onClick={goToSettings}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)]/70 hover:bg-[var(--bg-card)] active:bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] transition-all cursor-pointer group text-left min-h-[44px]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors truncate">
                  Preferences, Goals & Themes
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors shrink-0" />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
