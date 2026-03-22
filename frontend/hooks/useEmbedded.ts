/**
 * Embedded Mode Hook
 *
 * Detects whether the plugin frontend is running inside the dashboard iframe.
 * Detection: `embedded=1` query param set by PluginFrame on iframe src.
 *
 * NOTE: We intentionally do NOT use `window.self !== window.top` because
 * useSyncExternalStore's server snapshot returns false while the client
 * returns true, causing hydration mismatch in Next.js static export.
 *
 * NO CUSTOMIZATION NEEDED
 */

import { useSyncExternalStore } from 'react';

const SESSION_KEY = 'plugin_embedded';
let cachedEmbedded: boolean | null = null;

function getEmbedded(): boolean {
  if (cachedEmbedded !== null) return cachedEmbedded;
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('embedded') === '1') {
    cachedEmbedded = true;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* */ }
    return true;
  }

  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      cachedEmbedded = true;
      return true;
    }
  } catch { /* */ }

  cachedEmbedded = false;
  return false;
}

function subscribe(_onStoreChange: () => void): () => void {
  return () => {};
}

export function useEmbedded(): boolean {
  return useSyncExternalStore(subscribe, getEmbedded, () => false);
}
