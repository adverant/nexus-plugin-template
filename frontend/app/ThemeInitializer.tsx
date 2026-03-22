'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

/**
 * Client component that hydrates the theme from localStorage on mount.
 * Must be a separate component because root layout is a Server Component.
 *
 * NO CUSTOMIZATION NEEDED
 */
export function ThemeInitializer() {
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
