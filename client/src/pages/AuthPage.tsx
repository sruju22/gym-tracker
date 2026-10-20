import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Link2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { GymTrackieLogo } from '../components/ui/GymTrackieLogo';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentUser,
    login,
    signup,
    linkGoogle,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  // Determine initial mode from URL (e.g. /login?mode=signup or pathname /signup or /register)
  const isInitialSignup =
    searchParams.get('mode') === 'signup' ||
    location.pathname === '/signup' ||
    location.pathname === '/register';

  const [mode, setMode] = useState<'signin' | 'signup'>(isInitialSignup ? 'signup' : 'signin');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);

  // Redirect if user is already signed in
  useEffect(() => {
    if (currentUser) {
      const redirectPath = (location.state as any)?.from?.pathname || '/';
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, navigate, location]);

  // Synchronize URL query param when mode switches while preserving email & password inputs
  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setFormError('');
    clearError();
    setSearchParams(newMode === 'signup' ? { mode: 'signup' } : {});
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleGoogleSuccess = () => {
    setFormError('');
    setPendingGoogleCredential(null);
    clearError();
    const redirectPath = (location.state as any)?.from?.pathname || '/';
    navigate(redirectPath, { replace: true });
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
      setMode('signin');
      setFormError(
        'An account with this email already exists using email and password. Enter your password to sign in and link your Google account for 1-tap sign-in.'
      );
    } else {
      setFormError(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!passwordInput) {
      setFormError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      const trimmedName = nameInput.trim();
      if (!trimmedName) {
        setFormError('Please enter your full name.');
        return;
      }
      if (passwordInput.length < 6) {
        setFormError('Password must be at least 6 characters long.');
        return;
      }

      try {
        await signup(trimmedName, trimmedEmail, passwordInput);
        const redirectPath = (location.state as any)?.from?.pathname || '/';
        navigate(redirectPath, { replace: true });
      } catch (err: any) {
        setFormError(err.message || 'Registration failed. Please try again.');
      }
    } else {
      // Sign In
      try {
        await login(trimmedEmail, passwordInput);

        // If arriving from a Google collision, auto-link Google now
        if (pendingGoogleCredential) {
          try {
            await linkGoogle(pendingGoogleCredential);
            setPendingGoogleCredential(null);
          } catch (linkErr) {
            console.warn('[AccountLinking] Linking after password login warning:', linkErr);
          }
        }

        const redirectPath = (location.state as any)?.from?.pathname || '/';
        navigate(redirectPath, { replace: true });
      } catch (err: any) {
        setFormError(err.message || 'Invalid email or password.');
      }
    }
  };

  const displayError = formError || error;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#07090d] text-white flex flex-col justify-between overflow-x-hidden selection:bg-red-500/30 selection:text-white">
      {/* 1. Cinematic Background Layer: Upper Gym Hero Image + Refined Smooth Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* Visible Gym Atmosphere Image */}
        <div
          className="absolute top-0 left-0 right-0 h-[46vh] sm:h-[54vh] bg-cover bg-no-repeat transition-opacity duration-700"
          style={{
            backgroundImage: `url('/images/gym-onboarding-hero.png')`,
            backgroundPosition: 'center 10%',
            opacity: 0.65,
          }}
        />

        {/* Multi-stage Vertical Gradient for seamless transition into charcoal form background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(7,9,13,0.40) 0%, rgba(7,9,13,0.18) 18%, rgba(7,9,13,0.68) 44%, #07090d 68%, #07090d 100%)',
          }}
        />

        {/* Ambient burgundy and crimson rim glow */}
        <div className="absolute top-1/4 -left-20 w-[260px] h-[260px] bg-[#6e1219]/25 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[280px] h-[280px] bg-[#581014]/22 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* 2. Top Navigation Bar: Back Button only, no unnecessary clutter */}
      <header className="relative z-10 w-full max-w-md mx-auto pt-[max(0.75rem,env(safe-area-inset-top))] px-4 sm:px-6 pb-1 shrink-0 flex items-center justify-start">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-300 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all cursor-pointer min-h-[44px]"
          aria-label="Go back to previous screen"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </header>

      {/* 3. Main Form Area */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 py-2 flex-1 flex flex-col justify-center">
        {/* Brand Area */}
        <div className="text-center space-y-1.5 mb-3 sm:mb-4">
          <div className="flex justify-center mb-2">
            <GymTrackieLogo variant="compact" height={30} mode="dark" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            {mode === 'signin' ? 'Welcome back.' : 'Join GymTrackie.'}
          </h1>

          <p className="text-xs sm:text-sm font-medium text-zinc-400 max-w-xs mx-auto">
            {mode === 'signin'
              ? 'Your next level starts here.'
              : 'Track workouts, crush PRs, and level up.'}
          </p>
        </div>

        {/* Error Notification Banner */}
        {displayError && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-semibold flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <span>{displayError}</span>
            </div>
          </div>
        )}

        {/* Google Collision / Linking Notice */}
        {pendingGoogleCredential && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2 animate-fade-in">
            <Link2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Link Your Google Account</div>
              <div className="text-[11px] text-amber-200/80 mt-0.5 leading-snug">
                Enter your password once to confirm your identity. We will link your Google account so you can use 1-tap sign-in next time!
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-[#101319]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5">
          {/* Official Google Sign-In Button */}
          {!pendingGoogleCredential && (
            <>
              <div className="w-full flex justify-center">
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text={mode === 'signup' ? 'signup_with' : 'signin_with'}
                />
              </div>

              {/* Subtle Divider */}
              <div className="relative flex items-center justify-center my-0.5">
                <div className="w-full border-t border-zinc-800" />
                <span className="absolute bg-[#101319] px-3 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest select-none">
                  OR CONTINUE WITH EMAIL
                </span>
              </div>
            </>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                placeholder="e.g. Srujan Kumar"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (formError) setFormError('');
                }}
                disabled={isLoading}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (formError) setFormError('');
              }}
              disabled={isLoading}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (formError) setFormError('');
              }}
              disabled={isLoading}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Full-width Red Primary Action Button */}
            <div className="pt-0.5">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
                className="h-11 sm:h-12 min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-red-600/20 gap-2 justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <span>
                    {mode === 'signup'
                      ? 'Create Account'
                      : pendingGoogleCredential
                      ? 'Sign In & Link Google'
                      : 'Sign In'}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Bottom Switch Mode Prompt */}
        <div className="text-center mt-3 sm:mt-4">
          {mode === 'signin' ? (
            <p className="text-xs text-zinc-400">
              New to GymTrackie?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="text-[var(--primary)] hover:underline font-bold transition-colors cursor-pointer py-1 px-1.5 rounded"
              >
                Create account
              </button>
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="text-[var(--primary)] hover:underline font-bold transition-colors cursor-pointer py-1 px-1.5 rounded"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </main>

      {/* 4. Footer Safe Area */}
      <footer className="relative z-10 w-full max-w-md mx-auto text-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
        <p className="text-[9px] text-zinc-500/80">
          Workouts and personal records synchronize securely to your account.
        </p>
      </footer>
    </div>
  );
};
