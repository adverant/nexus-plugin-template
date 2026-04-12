'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { NexusChatProvider } from '@adverant/nexus-chat-ui';
// Dynamic import to avoid SSR issues with socket.io-client
import dynamic from 'next/dynamic';

const UnifiedChatPanel = dynamic(
  () => import('@adverant/nexus-chat-ui').then(mod => {
    const Panel = mod.UnifiedChatPanel;
    return { default: Panel };
  }),
  { ssr: false }
);

const ChatBubble = dynamic(
  () => import('@adverant/nexus-chat-ui').then(mod => {
    const Bubble = mod.ChatBubble;
    return { default: Bubble };
  }),
  { ssr: false }
);

/**
 * ChatProvider — wraps the app with the universal chat panel.
 *
 * Zero customization needed: pluginId drives everything (theme, persona, tools)
 * via the TSE database. The BFF route at /api/chat-config fetches the config.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read dark mode from HTML class (set by ThemeInitializer)
    const check = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    check();

    // Watch for theme changes
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const pluginId = process.env.NEXT_PUBLIC_PLUGIN_ID || 'your-plugin-id';
  const gatewayWsUrl = process.env.NEXT_PUBLIC_GATEWAY_WS_URL || 'wss://gateway.adverant.ai';

  return (
    <NexusChatProvider config={{
      pluginId,
      gatewayWsUrl,
      theme: { isDark },
      chatConfigEndpoint: '/api/chat-config',
      features: {
        enablePopout: false,
        enableTerminal: false,
        dockModes: ['float', 'right', 'minimized'],
      },
    }}>
      {children}
      {mounted && (
        <>
          <UnifiedChatPanel />
          <ChatBubble />
        </>
      )}
    </NexusChatProvider>
  );
}
