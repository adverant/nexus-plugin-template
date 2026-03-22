/**
 * Theme Store (Zustand) -- Standalone
 *
 * Manages light/dark theme state with:
 * - App Bridge sync (when embedded in dashboard iframe)
 * - localStorage persistence (when standalone)
 * - System preference detection (fallback)
 *
 * CUSTOMIZE: Replace {{PLUGIN_SLUG}} in NexusAppBridge.init() call
 */

import { create } from 'zustand';
import { NexusAppBridge } from '@/lib/nexus-app-bridge';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isHydrated: boolean;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  hydrate: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

const STORAGE_KEY = 'adverant_dashboard_theme';

function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'light',
  isHydrated: false,

  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* */ }
    }
    applyThemeToDocument(theme);
  },

  toggleTheme: () => {
    const { theme, setTheme } = get();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const isEmbedded = params.get('embedded') === '1';
    if (isEmbedded) {
      let bridgeTheme: Theme = 'light';
      try {
        // CUSTOMIZE: Change plugin slug
        const bridge = NexusAppBridge.init('{{PLUGIN_SLUG}}');
        bridgeTheme = bridge.getTheme().mode as Theme;
      } catch {
        bridgeTheme = (params.get('theme') as Theme) || 'light';
      }
      set({ theme: bridgeTheme, isHydrated: true });
      applyThemeToDocument(bridgeTheme);
      return;
    }

    const bridgeTheme = params.get('theme') as Theme | null;
    if (bridgeTheme === 'light' || bridgeTheme === 'dark') {
      set({ theme: bridgeTheme, isHydrated: true });
      applyThemeToDocument(bridgeTheme);
      return;
    }

    let savedTheme: Theme = 'light';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') savedTheme = stored;
    } catch { /* */ }
    set({ theme: savedTheme, isHydrated: true });
    applyThemeToDocument(savedTheme);
  },
}));

export const useTheme = () => {
  const theme = useThemeStore((s) => s.theme);
  const isHydrated = useThemeStore((s) => s.isHydrated);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return { theme, isHydrated, toggleTheme, setTheme, isDark: theme === 'dark' };
};
