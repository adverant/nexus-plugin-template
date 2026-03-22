/**
 * Plugin Layout
 *
 * Layout with vertical sidebar navigation and auth gate.
 *
 * CRITICAL: This layout does NOT subscribe to Zustand persist stores directly.
 * Store-connected components are dynamically imported with ssr:false to prevent
 * React #185 "Maximum update depth exceeded" errors during hydration.
 *
 * CUSTOMIZE:
 * - Replace PluginGate import with your gate component
 * - Add your sidebar component
 * - Add your WebSocket provider if needed
 * - Replace all {{PLUGIN_SLUG}} references
 */

'use client';

import dynamic from 'next/dynamic';
import { PluginGate } from '@/components/gates/PluginGate';
import { useEmbedded } from '@/hooks/useEmbedded';

// Dynamic imports with ssr:false for components that use Zustand persist stores
// This prevents React #185 "Maximum update depth exceeded" during hydration

// CUSTOMIZE: Import your sidebar component
// const PluginSidebar = dynamic(
//   () => import('./PluginSidebar').then(m => ({ default: m.PluginSidebar })),
//   { ssr: false }
// );

// Page context bridge -- syncs current page to dashboard for Terminal Computer
const PageContextBridge = dynamic(
  () => import('@/components/PageContextBridge').then(m => ({ default: m.PageContextBridge })),
  { ssr: false }
);

export default function PluginLayout({ children }: { children: React.ReactNode }) {
  const isEmbedded = useEmbedded();

  // When embedded in dashboard iframe, skip plugin chrome (header, sidebar)
  if (isEmbedded) {
    return (
      <PluginGate>
        <div className="h-dvh md:h-full overflow-y-auto">{children}</div>
      </PluginGate>
    );
  }

  return (
    <PluginGate>
      <div className="flex flex-col h-full">
        <div className="flex flex-1 min-h-0 gap-0">
          {/* CUSTOMIZE: Add your sidebar here */}
          {/* <PluginSidebar /> */}
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Syncs page context to dashboard for Terminal Computer */}
        <PageContextBridge />
      </div>
    </PluginGate>
  );
}
