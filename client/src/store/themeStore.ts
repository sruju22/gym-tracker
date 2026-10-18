import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'gymtrackie-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed === 'dark' || parsed === 'light' || parsed === 'system') {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return 'dark';
}

const initialTheme = getInitialTheme();
const initialResolved = resolveTheme(initialTheme);
applyThemeToDocument(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listen for system appearance changes if in system mode
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (get().theme === 'system') {
        const newResolved = getSystemTheme();
        applyThemeToDocument(newResolved);
        set({ resolvedTheme: newResolved });
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,

    setTheme: (newTheme: ThemeMode) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTheme));
      } catch (e) {
        // Ignore storage error
      }
      const resolved = resolveTheme(newTheme);
      applyThemeToDocument(resolved);
      set({ theme: newTheme, resolvedTheme: resolved });
    },

    toggleTheme: () => {
      const currentResolved = get().resolvedTheme;
      const nextTheme: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
      get().setTheme(nextTheme);
    },
  };
});
