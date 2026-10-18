import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  User,
  UserPlus,
  LogOut,
  ShieldCheck,
  LogIn,
  Settings,
  CheckCircle2,
  AlertCircle,
  Link2,
  ChevronRight,
} from 'lucide-react';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { GoogleSignInButton } from './GoogleSignInButton';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, login, signup, logout, linkGoogle, isLoading, error, clearError } =
    useAuthStore();

  const [mode, setMode] = useState<'view' | 'login' | 'signup'>('view');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);

  const handleOpenLogin = () => {
    setEmailInput('');
    setPasswordInput('');
    setFormError('');
    setPendingGoogleCredential(null);
    clearError();
    setMode('login');
  };

  const handleOpenSignup = () => {
    setNameInput('');
    setEmailInput('');
    setPasswordInput('');
    setFormError('');
    setPendingGoogleCredential(null);
    clearError();
    setMode('signup');
  };

  const handleGoogleSuccess = () => {
    setFormError('');
    setPendingGoogleCredential(null);
    clearError();
    setMode('view');
    onClose();
  };

  const handleGoogleError = (
    err: string,
    isExistingPasswordAccount?: boolean,
    email?: string,
    credential?: string
  ) => {
    if (isExistingPasswordAccount) {
      if (email) setEmailInput(email);
      if (credential) setPendingGoogleCredential(credential);
      setMode('login');
      setFormError(
        'An account with this email already exists using email and password. Enter your password to sign in and link your Google account for 1-tap sign-in.'
      );
    } else {
      setFormError(err);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!emailInput.trim() || !passwordInput) {
      setFormError('Please fill in email and password');
      return;
    }
    try {
      await login(emailInput.trim(), passwordInput);

      // If the user arrived here from a Google login collision, seamlessly link Google now
      if (pendingGoogleCredential) {
        try {
          await linkGoogle(pendingGoogleCredential);
          setPendingGoogleCredential(null);
        } catch (linkErr: any) {
          console.warn('[AccountLinking] Automatic linking after password login warning:', linkErr);
        }
      }

      setMode('view');
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Login failed');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
      setFormError('Please fill in all fields');
      return;
    }
    if (passwordInput.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }
    try {
      await signup(nameInput.trim(), emailInput.trim(), passwordInput);
      setMode('view');
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Registration failed');
    }
  };

  const goToSettings = () => {
    onClose();
    navigate('/settings');
  };

  if (!isOpen) return null;

  const displayError = formError || error;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'signup'
          ? 'Create Account'
          : mode === 'login'
          ? 'Sign In to Account'
          : 'User Account'
      }
    >
      <div className="flex justify-center pb-2">
        <GymTrackieLogo variant="compact" height={26} />
      </div>

      {mode === 'view' && (
        <div className="space-y-2.5">
          {displayError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <span>{displayError}</span>
              </div>
            </div>
          )}

          {currentUser ? (
            <>
              {/* Authenticated User Overview */}
              <div className="flex items-center gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-11 h-11 rounded-full object-cover border border-[var(--border-subtle)] shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-base font-black shadow-sm shrink-0 border border-red-400">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-[var(--text-main)] truncate">
                      {currentUser.name}
                    </h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {currentUser.email}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--text-muted)]">
                    <ShieldCheck className="w-3 h-3 text-[var(--success)]" />
                    <span>MongoDB Atlas Sync Active</span>
                  </div>
                </div>
              </div>

              {currentUser.googleLinked ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Google Account Linked</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[var(--text-main)]">Link Google Account</div>
                    <span className="text-[10px] text-[var(--text-muted)]">1-tap sign-in</span>
                  </div>
                  <GoogleSignInButton
                    mode="link"
                    text="continue_with"
                    onSuccess={() => {
                      setFormError('');
                      clearError();
                    }}
                    onError={handleGoogleError}
                  />
                </div>
              )}
            </>
          ) : (
            /* Compact Guest Mode Card */
            <div className="bg-[var(--bg-card)] px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-muted)]">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--text-main)]">Guest Mode</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                    Local only
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                  Sign in to save workouts & PRs to MongoDB Atlas
                </p>
              </div>
            </div>
          )}

          {/* Preferences, Goals & Themes — Compact Row with Chevron */}
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

          {currentUser ? (
            <div className="space-y-2 pt-0.5">
              <Button
                variant="outline"
                fullWidth
                onClick={handleOpenLogin}
                className="justify-start gap-2.5 border-dashed h-10 min-h-[40px] text-xs font-bold"
              >
                <LogIn className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Switch Account / Sign In</span>
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={handleOpenSignup}
                className="justify-start gap-2.5 border-dashed h-10 min-h-[40px] text-xs font-bold"
              >
                <UserPlus className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Register New Account</span>
              </Button>

              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  logout();
                  setMode('view');
                }}
                className="justify-start gap-2.5 h-10 min-h-[40px] text-xs font-bold mt-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2 pt-0.5">
              {/* Official Google Identity Services Button */}
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="continue_with"
              />

              {/* Subtle Refined Divider */}
              <div className="relative flex items-center justify-center my-1.5">
                <div className="w-full border-t border-[var(--border-subtle)]" />
                <span className="absolute bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest select-none">
                  or with password
                </span>
              </div>

              {/* Balanced, Equal-Height Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={handleOpenLogin}
                  fullWidth
                  className="gap-1.5 text-xs sm:text-sm h-11 min-h-[44px] rounded-xl font-bold"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="truncate">Sign In</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={handleOpenSignup}
                  fullWidth
                  className="gap-1.5 text-xs sm:text-sm h-11 min-h-[44px] rounded-xl font-bold"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">Create Account</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'login' && (
        <div className="space-y-3">
          {displayError && (
            <div className="text-xs text-[var(--danger)] bg-[var(--danger-subtle)] p-2.5 rounded-xl border border-[var(--danger-border)] leading-snug">
              {displayError}
            </div>
          )}

          {pendingGoogleCredential && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs flex items-start gap-2">
              <Link2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-bold">Link Your Google Account</div>
                <div className="text-[11px] text-amber-300/80 mt-0.5 leading-snug">
                  Enter your password once to confirm identity. We will link your Google account so you can use 1-tap sign-in next time!
                </div>
              </div>
            </div>
          )}

          {!pendingGoogleCredential && (
            <>
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signin_with"
              />

              <div className="relative flex items-center justify-center my-1.5">
                <div className="w-full border-t border-[var(--border-subtle)]" />
                <span className="absolute bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest select-none">
                  or with password
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. srujan@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              autoFocus={!!pendingGoogleCredential}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingGoogleCredential(null);
                  setMode('view');
                }}
                fullWidth
                disabled={isLoading}
                className="h-11 min-h-[44px] text-xs sm:text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
                className="h-11 min-h-[44px] text-xs sm:text-sm font-bold"
              >
                {isLoading
                  ? 'Signing In...'
                  : pendingGoogleCredential
                  ? 'Sign In & Link'
                  : 'Sign In'}
              </Button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleOpenSignup}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
              >
                Don't have an account? Register here
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === 'signup' && (
        <div className="space-y-3">
          {displayError && (
            <div className="text-xs text-[var(--danger)] bg-[var(--danger-subtle)] p-2.5 rounded-xl border border-[var(--danger-border)] leading-snug">
              {displayError}
            </div>
          )}

          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signup_with"
          />

          <div className="relative flex items-center justify-center my-1.5">
            <div className="w-full border-t border-[var(--border-subtle)]" />
            <span className="absolute bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest select-none">
              or with email
            </span>
          </div>

          <form onSubmit={handleSignupSubmit} className="space-y-3">
            <Input
              label="Full Name"
              placeholder="e.g. Srujan Kumar"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. srujan@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode('view')}
                fullWidth
                disabled={isLoading}
                className="h-11 min-h-[44px] text-xs sm:text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
                className="h-11 min-h-[44px] text-xs sm:text-sm font-bold"
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleOpenLogin}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
              >
                Already have an account? Sign In here
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};
