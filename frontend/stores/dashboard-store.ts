/**
 * Auth Store -- Plugin Authentication
 *
 * Reads JWT auth token from multiple sources (priority order):
 * 1. Nexus App Bridge (when embedded in dashboard iframe)
 * 2. ?auth_token= URL parameter (from plugin proxy / standalone access)
 * 3. localStorage 'dashboard_token' (for development / direct access)
 *
 * On white-label/standalone mode, also captures refresh_token for direct
 * token refresh via POST /auth/refresh when the access token expires.
 *
 * Security: The token is stripped from the URL after reading to prevent
 * leaking in bookmarks, browser history, or referrer headers.
 *
 * CUSTOMIZE: Replace {{PLUGIN_SLUG}} in NexusAppBridge.init() call
 */

import { create } from 'zustand';
import { NexusAppBridge } from '@/lib/nexus-app-bridge';

// ============================================================================
// Constants
// ============================================================================

// CUSTOMIZE: Set your auth API URL
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://api.adverant.ai/auth';

// ============================================================================
// Zustand Auth Store
// ============================================================================

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isEmbedded: boolean;
  sessionExpired: boolean;
  setToken: (token: string | null) => void;
  setTokens: (token: string | null, refreshToken: string | null) => void;
  setEmbedded: (embedded: boolean) => void;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  isEmbedded: false,
  sessionExpired: false,
  setToken: (token) => set({ token, sessionExpired: false }),
  setTokens: (token, refreshToken) => set({ token, refreshToken, sessionExpired: false }),
  setEmbedded: (isEmbedded) => set({ isEmbedded }),
  markSessionExpired: () => set({ sessionExpired: true }),
  clearSessionExpired: () => set({ sessionExpired: false }),
}));

// ============================================================================
// Token Refresh (standalone / white-label mode)
// ============================================================================

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessTokenDirect(): Promise<string | null> {
  let { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    try {
      refreshToken = localStorage.getItem('dashboard_refresh_token');
      if (refreshToken) {
        useAuthStore.getState().setTokens(useAuthStore.getState().token, refreshToken);
      }
    } catch { /* localStorage unavailable */ }
  }

  if (!refreshToken) return null;

  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.access_token) return null;

      const newRefreshToken = data.refresh_token || refreshToken;
      useAuthStore.getState().setTokens(data.access_token, newRefreshToken);
      try {
        localStorage.setItem('dashboard_token', data.access_token);
        localStorage.setItem('dashboard_refresh_token', newRefreshToken);
      } catch { /* localStorage unavailable */ }

      return data.access_token as string;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================================================
// Initialize on module load
// ============================================================================

function initializeAuth() {
  if (typeof window === 'undefined') return;

  // CUSTOMIZE: Change plugin slug
  const bridge = NexusAppBridge.init('{{PLUGIN_SLUG}}');

  if (bridge.isEmbedded()) {
    useAuthStore.getState().setEmbedded(true);
    const bridgeToken = bridge.getToken();
    if (bridgeToken) {
      const params = new URLSearchParams(window.location.search);
      const urlRefreshToken = params.get('refresh_token');
      if (urlRefreshToken) {
        useAuthStore.getState().setTokens(bridgeToken, urlRefreshToken);
        try { localStorage.setItem('dashboard_refresh_token', urlRefreshToken); } catch { /* */ }
      } else {
        try {
          const storedRefresh = localStorage.getItem('dashboard_refresh_token');
          useAuthStore.getState().setTokens(bridgeToken, storedRefresh);
        } catch {
          useAuthStore.getState().setToken(bridgeToken);
        }
      }
    }
    bridge.onTokenRefresh((newToken) => {
      useAuthStore.getState().setToken(newToken);
      try { localStorage.setItem('dashboard_token', newToken); } catch { /* */ }
    });
    return;
  }

  // Not embedded -- use URL param or localStorage
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('auth_token');
  const urlRefreshToken = params.get('refresh_token');

  if (urlToken) {
    useAuthStore.getState().setTokens(urlToken, urlRefreshToken);
    try {
      localStorage.setItem('dashboard_token', urlToken);
      if (urlRefreshToken) localStorage.setItem('dashboard_refresh_token', urlRefreshToken);
    } catch { /* */ }
    params.delete('auth_token');
    params.delete('refresh_token');
    const remaining = params.toString();
    const newUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    return;
  }

  // Bridge may have captured token from URL during init
  const bridgeToken = bridge.getToken();
  if (bridgeToken) {
    useAuthStore.getState().setToken(bridgeToken);
    try { localStorage.setItem('dashboard_token', bridgeToken); } catch { /* */ }
    return;
  }

  // localStorage fallback
  try {
    const stored = localStorage.getItem('dashboard_token');
    const storedRefresh = localStorage.getItem('dashboard_refresh_token');
    if (stored) useAuthStore.getState().setTokens(stored, storedRefresh);
  } catch { /* */ }
}

initializeAuth();

// ============================================================================
// Public API
// ============================================================================

export function useAuthToken(): string | null {
  return useAuthStore((s) => s.token);
}

export function useIsEmbedded(): boolean {
  return useAuthStore((s) => s.isEmbedded);
}

export async function getAuthenticatedToken(): Promise<string | null> {
  return useAuthStore.getState().token;
}

export const useDashboardStore = {
  getState: () => ({ user: null, setAuth: () => {} }),
};
