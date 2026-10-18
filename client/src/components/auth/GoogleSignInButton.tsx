import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
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
  const { loginWithGoogle, linkGoogle } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const buttonRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

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

        // Determine if light theme is explicitly requested on document
        const isLightMode =
          typeof document !== 'undefined' &&
          (document.documentElement.getAttribute('data-theme') === 'light' ||
            document.documentElement.classList.contains('light'));

        // Clear existing children before re-rendering (e.g. on theme or width change)
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
        }

        // Compute responsive width that comfortably fits mobile modal without overflow
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
        const buttonWidth = Math.max(220, Math.min(290, viewportWidth - 64));

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: isLightMode ? 'outline' : 'filled_black',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: buttonWidth,
        });
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

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [clientId, resolvedTheme, text, mode, disabled, loginWithGoogle, linkGoogle, onSuccess, onError]);

  if (configError) {
    return (
      <div className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="truncate">{configError}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center my-0.5">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-xs rounded-full">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting with Google...</span>
          </div>
        </div>
      )}

      {/* Official Google Identity Services Render Container */}
      <div
        ref={buttonRef}
        className={`w-full flex justify-center items-center overflow-visible transition-opacity duration-200 ${
          disabled || isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
        style={{ minHeight: '44px' }}
      />
    </div>
  );
};
