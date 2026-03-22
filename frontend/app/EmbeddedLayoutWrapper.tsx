'use client';

import { useEmbedded } from '@/hooks/useEmbedded';

/**
 * Wrapper that adjusts layout padding based on embedded mode.
 * NO CUSTOMIZATION NEEDED
 */
export function EmbeddedLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isEmbedded = useEmbedded();

  return (
    <main className={isEmbedded ? 'h-full' : 'h-full overflow-y-auto'}>
      {children}
    </main>
  );
}
