/**
 * Auth-Aware Fetch Wrapper
 *
 * Reads JWT token from the Zustand auth store.
 * On 401, refreshes the token and retries once:
 * - Embedded mode: requests fresh token from parent dashboard via NexusAppBridge
 * - Standalone mode: directly refreshes via POST /auth/refresh
 *
 * NO CUSTOMIZATION NEEDED
 */

import { useAuthStore, refreshAccessTokenDirect } from '@/stores/dashboard-store';
import { NexusAppBridge } from '@/lib/nexus-app-bridge';

export interface AuthFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

export interface AuthFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

function getToken(): string | null {
  return useAuthStore.getState().token;
}

async function getFreshToken(): Promise<string | null> {
  const { isEmbedded } = useAuthStore.getState();
  if (!isEmbedded) return refreshAccessTokenDirect();

  try {
    const bridge = NexusAppBridge.getInstance();
    if (!bridge.isEmbedded()) return refreshAccessTokenDirect();

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        unsub();
        const directToken = await refreshAccessTokenDirect();
        resolve(directToken);
      }, 3000);

      const unsub = bridge.onTokenRefresh((newToken) => {
        clearTimeout(timer);
        unsub();
        resolve(newToken);
      });

      bridge.requestAuth();
    });
  } catch {
    return refreshAccessTokenDirect();
  }
}

export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, _isRetry = false, headers = {}, ...fetchOptions } = options;
  const requestHeaders: Record<string, string> = { ...headers };

  if (!skipAuth) {
    const token = getToken();
    if (token) requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...fetchOptions, headers: requestHeaders, credentials: 'include' });

  if (response.status === 401 && !skipAuth && !_isRetry) {
    const freshToken = await getFreshToken();
    if (freshToken) return authFetch(url, { ...options, _isRetry: true });
  }

  return response;
}

export async function authFetchJson<T = unknown>(
  url: string,
  options: AuthFetchOptions = {}
): Promise<AuthFetchResult<T>> {
  try {
    const headers: Record<string, string> = { ...options.headers };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const response = await authFetch(url, { ...options, headers });
    let data: T | undefined;
    let error: string | undefined;

    try {
      const json = await response.json();
      if (response.ok) { data = json as T; }
      else { error = json.error || json.message || `HTTP ${response.status}`; }
    } catch {
      if (!response.ok) error = `HTTP ${response.status}: ${response.statusText}`;
    }

    return { ok: response.ok, status: response.status, data, error };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function createAuthHeaders(
  token?: string | null,
  contentType: string = 'application/json'
): Promise<Record<string, string>> {
  const authToken = token ?? getToken();
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}
