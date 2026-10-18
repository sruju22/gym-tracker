import { create } from 'zustand';
import { User } from '../types';
import {
  getStoredToken,
  setStoredToken,
  loginUser,
  registerUser,
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
  logout: () => void;
  restoreAuth: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  completeOnboarding: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
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

    set({ isLoading: true });
    try {
      const data = await getMe(token);
      set({
        currentUser: data.user,
        token,
        isLoading: false,
        isInitializing: false,
        error: null,
      });
    } catch (err: any) {
      // Invalid/expired token -> clear authentication state
      setStoredToken(null);
      set({
        currentUser: null,
        token: null,
        isLoading: false,
        isInitializing: false,
        error: null,
      });
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
      set({
        currentUser: data.user,
        token: data.token,
        isLoading: false,
        error: null,
      });
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
      set({
        currentUser: data.user,
        token: data.token,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to register account',
      });
      throw err;
    }
  },

  logout: () => {
    setStoredToken(null);
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
        set({ currentUser: { ...currentUser, ...data } });
      }
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await updateUserProfile(token, data);
      set({ currentUser: res.user, isLoading: false });
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
        set({ currentUser: { ...currentUser, ...updateData } });
      }
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await updateUserProfile(token, updateData);
      set({ currentUser: res.user, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to complete onboarding' });
      throw err;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
