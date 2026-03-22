/**
 * Floating Terminal Store -- Context Bridge
 *
 * Triple-strategy context bridge that delivers page context from your plugin
 * to the Terminal Computer (Claude Code).
 *
 * Strategy 1: postMessage  -- fastest (~0ms), works when embedded in dashboard or popup
 * Strategy 2: API POST     -- cross-origin (~200ms), works standalone
 * Strategy 3: localStorage -- same-origin fallback, caches for other same-origin windows
 *
 * CUSTOMIZE: Replace 'your-plugin' with your plugin slug in source fields
 * CUSTOMIZE: Add your plugin domain to ALLOWED_POST_MESSAGE_ORIGINS
 */
import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface PageContext {
  pageRoute?: string;
  pageTitle?: string;
  plugin?: string;
  feature?: string;
  entities?: Array<{ type: string; id: string; displayName: string; [key: string]: unknown }>;
  actions?: Array<{ description: string; [key: string]: unknown }>;
  envVars?: Record<string, string>;
  claudeMdSnippet?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface FloatingTerminalState {
  _hasHydrated: boolean;
  isOpen: boolean;
  fileBrowserMode: 'browser-git';
  currentWorkspace: string | null;
  activeTerminalSessionId: string | null;
  pageContext: PageContext | null;
  contextVersion: number;
  lastDeliveredAt: number;
  setPageContext: (ctx: PageContext) => void;
  updatePageContext: (ctx: PageContext) => void;
  navigateToPath: (path: string) => void;
  openTerminal: () => void;
  closeTerminal: () => void;
}

// CUSTOMIZE: Add your plugin's domain
const ALLOWED_POST_MESSAGE_ORIGINS = [
  'https://dashboard.adverant.ai',
  // 'https://your-plugin-domain.com',
];

function tryPostMessage(ctx: PageContext): boolean {
  if (typeof window === 'undefined') return false;
  const message = {
    type: 'nexus-page-context-update',
    context: ctx,
    source: '{{PLUGIN_SLUG}}', // CUSTOMIZE
    timestamp: Date.now(),
  };
  let sent = false;
  try {
    if (window.parent && window.parent !== window) {
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        for (const origin of ALLOWED_POST_MESSAGE_ORIGINS) {
          if (origin !== window.location.origin) {
            try { window.parent.postMessage(message, origin); } catch { /* */ }
          }
        }
        sent = true;
      }
    }
  } catch { /* */ }
  try {
    if (window.opener && !window.opener.closed) {
      for (const origin of ALLOWED_POST_MESSAGE_ORIGINS) {
        if (origin !== window.location.origin) {
          try { window.opener.postMessage(message, origin); } catch { /* */ }
        }
      }
      sent = true;
    }
  } catch { /* */ }
  return sent;
}

function tryApiPost(ctx: PageContext): void {
  if (typeof window === 'undefined') return;
  import('@/stores/dashboard-store')
    .then((mod) => {
      const token = mod.useAuthStore?.getState()?.token ?? null;
      if (!token) return;
      fetch('https://dashboard.adverant.ai/api/user/page-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ context: ctx, source: '{{PLUGIN_SLUG}}', timestamp: new Date().toISOString() }),
        keepalive: true,
      }).catch(() => { /* best effort */ });
    })
    .catch(() => { /* auth store unavailable */ });
}

const LOCAL_STORAGE_KEY = 'nexus-active-page-context';
const BROADCAST_CHANNEL_NAME = 'nexus-page-context';

function tryLocalStorage(ctx: PageContext): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ context: ctx, updatedAt: new Date().toISOString() }));
  } catch { /* */ }
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({ type: 'nexus-page-context-update', context: ctx, source: '{{PLUGIN_SLUG}}', timestamp: Date.now() });
    channel.close();
  } catch { /* */ }
}

// ============================================================================
// Store
// ============================================================================

export const useFloatingTerminalStore = create<FloatingTerminalState>()((set, get) => ({
  _hasHydrated: true,
  isOpen: false,
  fileBrowserMode: 'browser-git' as const,
  currentWorkspace: null,
  activeTerminalSessionId: null,
  pageContext: null,
  contextVersion: 0,
  lastDeliveredAt: 0,

  setPageContext: (ctx: PageContext) => {
    set({ pageContext: ctx });
  },

  updatePageContext: (ctx: PageContext) => {
    const now = Date.now();
    const last = get().lastDeliveredAt;
    if (now - last < 500) return;
    set((s) => ({ pageContext: ctx, lastDeliveredAt: now, contextVersion: s.contextVersion + 1 }));
    const postMessageSent = tryPostMessage(ctx);
    if (!postMessageSent) tryApiPost(ctx);
    tryLocalStorage(ctx);
  },

  navigateToPath: () => {},
  openTerminal: () => set({ isOpen: true }),
  closeTerminal: () => set({ isOpen: false }),
}));
