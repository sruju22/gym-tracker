import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { AlertCircle, Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (
    error: string,
    isExistingPasswordAccount?: boolean,
    email?: string,
    credential?: string
  ) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
  mode?: 'auth' | 'link';
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

// Official production Google OAuth Web Client ID for GymTrackie
const DEFAULT_GOOGLE_CLIENT_ID =
  '500048065533-fn8bfmvb8kds0440ntca7f1mjit3r42q.apps.googleusercontent.com';

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = 'continue_with',
  mode = 'auth',
  disabled = false,
}) => {
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const linkGoogle = useAuthStore((state) => state.linkGoogle);
  const buttonRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isGoogleRendered, setIsGoogleRendered] = useState(false);

  const clientId =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_GOOGLE_CLIENT_ID &&
      import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()) ||
    DEFAULT_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setConfigError('Google Client ID is missing (VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    let intervalId: any;
    let isCancelled = false;
    let attempts = 0;

    const setupGoogleButton = () => {
      if (isCancelled || !buttonRef.current) return;
      if (!window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId.trim(),
          callback: async (response: { credential?: string }) => {
            if (!response.credential || isSubmittingRef.current || disabled) return;

            isSubmittingRef.current = true;
            setIsLoading(true);

            try {
              if (mode === 'link') {
                await linkGoogle(response.credential);
              } else {
                await loginWithGoogle(response.credential);
              }
              onSuccess?.();
            } catch (err: any) {
              const errMsg = err.message || 'Google authentication failed';
              const isPasswordAccount =
                err.code === 'ACCOUNT_EXISTS_WITH_PASSWORD' ||
                errMsg.includes('ACCOUNT_EXISTS_WITH_PASSWORD') ||
                errMsg.toLowerCase().includes('already exists using email and password');
              onError?.(errMsg, isPasswordAccount, err.email, response.credential);
            } finally {
              setIsLoading(false);
              isSubmittingRef.current = false;
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Clear existing children before re-rendering
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          buttonRef.current.style.colorScheme = 'light';
        }

        // Dynamically compute responsive button width matching container without overflow
        // Google GIS allows width between 200px and 400px
        const parentWidth =
          buttonRef.current?.parentElement?.clientWidth ||
          (typeof window !== 'undefined' ? window.innerWidth - 48 : 280);
        const buttonWidth = Math.min(360, Math.max(220, Math.floor(parentWidth)));

        // Always use 'filled_black' to match GymTrackie's dark charcoal aesthetics (#131314)
        // and 'pill' shape for smooth rounded capsule alignment
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: buttonWidth,
        });
        setIsGoogleRendered(true);
      } catch (err) {
        console.warn('[GoogleAuth] Failed to initialize Google button:', err);
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogleButton();
    } else {
      intervalId = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(intervalId);
          setupGoogleButton();
        } else if (attempts > 30) {
          clearInterval(intervalId);
          console.warn('[GoogleAuth] Google Identity Services script load timed out.');
        }
      }, 100);
    }

    // Re-render button on window resize to ensure fluid responsive fit
    const handleResize = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        setupGoogleButton();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
    };
  }, [clientId, text, mode, disabled, loginWithGoogle, linkGoogle, onSuccess, onError]);

  if (configError) {
    return (
      <div className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="truncate">{configError}</span>
      </div>
    );
  }

  const buttonLabel =
    text === 'signup_with'
      ? 'Sign up with Google'
      : text === 'continue_with'
      ? 'Continue with Google'
      : 'Sign in with Google';

  return (
    <div
      data-gsi-container
      className="relative w-full flex justify-center items-center py-0.5"
      style={{ colorScheme: 'light' }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-xs rounded-full">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting with Google...</span>
          </div>
        </div>
      )}

      {/* Immediate visual shell rendered on frame 0 to prevent blank gap during Google SDK setup */}
      {!isGoogleRendered && (
        <div
          aria-hidden="true"
          className="w-full max-w-[360px] h-[40px] rounded-full bg-[#131314] border border-zinc-700/70 flex items-center justify-center gap-3 px-4 shadow-sm select-none pointer-events-none"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-[13px] font-medium text-white/90 tracking-normal font-sans">
            {buttonLabel}
          </span>
        </div>
      )}

      {/* Official Google Identity Services Render Container */}
      <div
        ref={buttonRef}
        data-gsi-target
        className={`w-full flex justify-center items-center overflow-visible transition-opacity duration-150 ${
          !isGoogleRendered ? 'absolute inset-0 opacity-0' : 'relative opacity-100'
        } ${disabled || isLoading ? 'pointer-events-none opacity-50' : ''}`}
        style={{ minHeight: '40px', colorScheme: 'light' }}
      />
    </div>
  );
};
