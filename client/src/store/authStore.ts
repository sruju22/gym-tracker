import { create } from 'zustand';
import { User } from '../types';
import {
  getStoredToken,
  setStoredToken,
  loginUser,
  registerUser,
  loginWithGoogle,
  linkGoogleAccount,
  getMe,
  updateUserProfile,
} from '../api/authApi';
import { useWorkoutStore } from './workoutStore';

interface AuthState {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  linkGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  restoreAuth: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  completeOnboarding: (data: Partial<User>) => Promise<void>;
}

const getCachedProfile = (): User | null => {
  if (typeof localStorage === 'undefined') return null;
  const activeUserId = localStorage.getItem('gymtracker_active_user_id');
  if (!activeUserId) return null;
  const raw = localStorage.getItem(`gymtracker_user_profile_${activeUserId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setCachedProfile = (user: User | null): void => {
  if (typeof localStorage === 'undefined') return;
  if (user && user.id) {
    localStorage.setItem('gymtracker_active_user_id', user.id);
    localStorage.setItem(`gymtracker_user_profile_${user.id}`, JSON.stringify(user));
  } else {
    localStorage.removeItem('gymtracker_active_user_id');
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: getCachedProfile(),
  token: getStoredToken(),
  isLoading: false,
  isInitializing: true,
  error: null,

  restoreAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ currentUser: null, token: null, isInitializing: false });
      return;
    }

    set({ isLoading: true, isInitializing: true });
    try {
      const data = await getMe(token);
      setCachedProfile(data.user);
      set({
        currentUser: data.user,
        token,
        isLoading: false,
        isInitializing: false,
        error: null,
      });

      // Synchronize canonical weight and unit into workoutStore
      if (data.user.currentWeight) {
        useWorkoutStore.getState().updateCurrentWeight(data.user.id, data.user.currentWeight);
      }
      if (data.user.weightUnit) {
        useWorkoutStore.getState().updateUserSettings({ weightUnit: data.user.weightUnit });
      }
    } catch (err: any) {
      const isAuthError =
        err.message?.includes('401') ||
        err.message?.includes('Not authorized') ||
        err.message?.includes('Token expired') ||
        err.message?.includes('Invalid token') ||
        err.message?.includes('user not found');

      if (isAuthError) {
        // Invalid or expired token -> clear authentication state
        setStoredToken(null);
        setCachedProfile(null);
        set({
          currentUser: null,
          token: null,
          isLoading: false,
          isInitializing: false,
          error: null,
        });
      } else {
        // Network failure / temporary server wake-up:
        // Do NOT wipe credentials or treat user as a brand-new user!
        const fallbackUser = getCachedProfile();
        console.warn('[Auth] Network error restoring profile; preserving cached session:', err.message);
        set({
          currentUser: fallbackUser || get().currentUser,
          token,
          isLoading: false,
          isInitializing: false,
          error: err.message || 'Unable to connect to server',
        });
      }
    }
  },

  login: async (email: string, password: string) => {
    const startTime = performance.now();
    console.log(`[Auth Performance] 🚀 Sign In started at ${new Date().toISOString()}`);
    set({ isLoading: true, error: null });
    try {
      const data = await loginUser(email, password);
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`[Auth Performance] ✅ Sign In completed in ${duration}ms`);
      setStoredToken(data.token);
      setCachedProfile(data.user);
      set({
        currentUser: data.user,
        token: data.token,
        isLoading: false,
        error: null,
      });

      // Synchronize canonical weight and unit into workoutStore
      if (data.user.currentWeight) {
        useWorkoutStore.getState().updateCurrentWeight(data.user.id, data.user.currentWeight);
      }
      if (data.user.weightUnit) {
        useWorkoutStore.getState().updateUserSettings({ weightUnit: data.user.weightUnit });
      }
    } catch (err: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.warn(`[Auth Performance] ❌ Sign In failed after ${duration}ms:`, err.message);
      set({
        isLoading: false,
        error: err.message || 'Failed to log in',
      });
      throw err;
    }
  },

  signup: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await registerUser(name, email, password);
      setStoredToken(data.token);
      setCachedProfile(data.user);
      set({
        currentUser: data.user,
        token: data.token,
        isLoading: false,
        error: null,
      });

      // Synchronize canonical weight and unit into workoutStore
      if (data.user.currentWeight) {
        useWorkoutStore.getState().updateCurrentWeight(data.user.id, data.user.currentWeight);
      }
      if (data.user.weightUnit) {
        useWorkoutStore.getState().updateUserSettings({ weightUnit: data.user.weightUnit });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to register account',
      });
      throw err;
    }
  },

  loginWithGoogle: async (credential: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loginWithGoogle(credential);
      setStoredToken(data.token);
      setCachedProfile(data.user);
      set({
        currentUser: data.user,
        token: data.token,
        isLoading: false,
        error: null,
      });

      // Synchronize canonical weight and unit into workoutStore
      if (data.user.currentWeight) {
        useWorkoutStore.getState().updateCurrentWeight(data.user.id, data.user.currentWeight);
      }
      if (data.user.weightUnit) {
        useWorkoutStore.getState().updateUserSettings({ weightUnit: data.user.weightUnit });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Google sign in failed',
      });
      throw err;
    }
  },

  linkGoogle: async (credential: string) => {
    const { token, currentUser } = get();
    if (!token || !currentUser) {
      throw new Error('Not authenticated');
    }
    set({ isLoading: true, error: null });
    try {
      const res = await linkGoogleAccount(token, credential);
      setCachedProfile(res.user);
      set({
        currentUser: res.user,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to link Google account',
      });
      throw err;
    }
  },

  logout: () => {
    setStoredToken(null);
    setCachedProfile(null);
    set({
      currentUser: null,
      token: null,
      isLoading: false,
      error: null,
    });
    // Invalidate/reset in-memory session states so no private active session leaks
    useWorkoutStore.getState().handleUserLogout();
  },

  updateProfile: async (data: Partial<User>) => {
    const { token, currentUser } = get();
    if (!token || !currentUser) {
      // Local fallback for guest or offline mode
      if (currentUser) {
        const updated = { ...currentUser, ...data };
        setCachedProfile(updated);
        set({ currentUser: updated });
        if (data.currentWeight) {
          useWorkoutStore.getState().updateCurrentWeight(currentUser.id, data.currentWeight);
        }
        if (data.weightUnit) {
          useWorkoutStore.getState().updateUserSettings({ weightUnit: data.weightUnit });
        }
      }
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await updateUserProfile(token, data);
      setCachedProfile(res.user);
      set({ currentUser: res.user, isLoading: false });

      // Synchronize canonical weight and unit into workoutStore
      if (res.user.currentWeight) {
        useWorkoutStore.getState().updateCurrentWeight(res.user.id, res.user.currentWeight);
      }
      if (res.user.weightUnit) {
        useWorkoutStore.getState().updateUserSettings({ weightUnit: res.user.weightUnit });
      }
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to update profile' });
      throw err;
    }
  },

  completeOnboarding: async (data: Partial<User>) => {
    const { token, currentUser } = get();
    const updateData = { ...data, onboardingCompleted: true };
    if (!token || !currentUser) {
      if (currentUser) {
        const updated = { ...currentUser, ...updateData };
        setCachedProfile(updated);
        set({ currentUser: updated });
        if (data.currentWeight) {
          useWorkoutStore.getState().updateCurrentWeight(currentUser.id, data.currentWeight);
        }
        if (data.weightUnit) {
          useWorkoutStore.getState().updateUserSettings({ weightUnit: data.weightUnit });
        }
      }
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await updateUserProfile(token, updateData);
      setCachedProfile(res.user);
      set({ currentUser: res.user, isLoading: false });

      // Synchronize canonical weight and unit into workoutStore
      if (res.user.currentWeight) {
        useWorkoutStore.getState().updateCurrentWeight(res.user.id, res.user.currentWeight);
      }
      if (res.user.weightUnit) {
        useWorkoutStore.getState().updateUserSettings({ weightUnit: res.user.weightUnit });
      }
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to complete onboarding' });
      throw err;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
