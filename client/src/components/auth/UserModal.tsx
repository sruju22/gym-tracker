import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, UserPlus, LogOut, ShieldCheck, LogIn, Settings, CheckCircle2 } from 'lucide-react';
import { GymTrackieLogo } from '../ui/GymTrackieLogo';
import { GoogleSignInButton } from './GoogleSignInButton';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, login, signup, logout, isLoading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'view' | 'login' | 'signup'>('view');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [formError, setFormError] = useState('');

  const handleOpenLogin = () => {
    setEmailInput('');
    setPasswordInput('');
    setFormError('');
    clearError();
    setMode('login');
  };

  const handleOpenSignup = () => {
    setNameInput('');
    setEmailInput('');
    setPasswordInput('');
    setFormError('');
    clearError();
    setMode('signup');
  };

  const handleGoogleSuccess = () => {
    setFormError('');
    clearError();
    setMode('view');
    onClose();
  };

  const handleGoogleError = (err: string, isExistingPasswordAccount?: boolean) => {
    if (isExistingPasswordAccount) {
      setMode('login');
      setFormError(
        'An account with this email already exists using email and password. Please enter your password to sign in.'
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
      <div className="flex justify-center pt-0.5 pb-3">
        <GymTrackieLogo variant="compact" height={30} />
      </div>

      {mode === 'view' && (
        <div className="space-y-5">
          {currentUser ? (
            <>
              <div className="flex items-center gap-4 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-black shadow-md shadow-red-500/25 flex-shrink-0 border border-red-400">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[var(--text-main)] truncate">{currentUser.name}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{currentUser.email}</p>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--text-muted)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span>Authenticated via MongoDB Atlas</span>
                  </div>
                </div>
              </div>

              {currentUser.googleLinked ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Google Account Linked</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/15 px-2 py-0.5 rounded">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <div className="text-xs font-bold text-[var(--text-main)]">Link Google Account</div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Connect your Google account for quick, passwordless sign-in.
                  </p>
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
            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-subtle)] text-center space-y-2">
              <User className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
              <div className="text-sm font-bold text-[var(--text-main)]">Guest Mode</div>
              <p className="text-xs text-[var(--text-secondary)]">
                Sign in or create an account to sync your workout history, plans, and personal records securely to MongoDB.
              </p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button
              variant="secondary"
              fullWidth
              onClick={goToSettings}
              className="justify-start gap-3"
            >
              <Settings className="w-4 h-4 text-[var(--primary)]" />
              <span>Preferences, Goals & Themes</span>
            </Button>

            {currentUser ? (
              <>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleOpenLogin}
                  className="justify-start gap-3 border-dashed"
                >
                  <LogIn className="w-4 h-4 text-[var(--primary)]" />
                  <span>Switch Account / Sign In</span>
                </Button>

                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleOpenSignup}
                  className="justify-start gap-3 border-dashed"
                >
                  <UserPlus className="w-4 h-4 text-[var(--primary)]" />
                  <span>Register New Account</span>
                </Button>

                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => {
                    logout();
                    setMode('view');
                  }}
                  className="justify-start gap-3 mt-4"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            ) : (
              <div className="space-y-3 pt-1">
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="continue_with"
                />

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-[var(--border-subtle)] w-full" />
                  <span className="bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider absolute">
                    or with password
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleOpenLogin} fullWidth className="gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                  <Button variant="primary" onClick={handleOpenSignup} fullWidth className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'login' && (
        <div className="space-y-4">
          {displayError && (
            <div className="text-xs text-[var(--danger)] bg-[var(--danger-subtle)] p-2.5 rounded-xl border border-[var(--danger-border)]">
              {displayError}
            </div>
          )}

          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
          />

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[var(--border-subtle)] w-full" />
            <span className="bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider absolute">
              or with password
            </span>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode('view')}
                fullWidth
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>

            <div className="text-center pt-2">
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
        <div className="space-y-4">
          {displayError && (
            <div className="text-xs text-[var(--danger)] bg-[var(--danger-subtle)] p-2.5 rounded-xl border border-[var(--danger-border)]">
              {displayError}
            </div>
          )}

          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signup_with"
          />

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[var(--border-subtle)] w-full" />
            <span className="bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider absolute">
              or with email
            </span>
          </div>

          <form onSubmit={handleSignupSubmit} className="space-y-4">
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

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode('view')}
                fullWidth
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>

            <div className="text-center pt-2">
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
