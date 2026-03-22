'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NexusAppBridge } from '@/lib/nexus-app-bridge';
import { useThemeStore } from '@/stores/theme-store';

// CUSTOMIZE: Set your plugin's route prefix
const ROUTE_PREFIX = '/dashboard/{{PLUGIN_SLUG}}';

function toInternalPath(bridgeRoute: string): string {
  if (!bridgeRoute || bridgeRoute === '/') return ROUTE_PREFIX;
  return `${ROUTE_PREFIX}${bridgeRoute}`;
}

function toBridgeRoute(pathname: string): string {
  // CUSTOMIZE: Set your basePath
  const basePath = '/{{PLUGIN_SLUG}}/ui';
  let route = pathname;
  if (route.startsWith(basePath)) route = route.slice(basePath.length) || '/';
  if (route.startsWith(ROUTE_PREFIX)) route = route.slice(ROUTE_PREFIX.length) || '/';
  return route;
}

/**
 * AppBridgeProvider -- Wires the Nexus App Bridge into the React lifecycle.
 *
 * When embedded in the dashboard iframe:
 * - Handles initial route from parent
 * - Listens for parent-initiated navigation
 * - Reports plugin-initiated navigation back to parent
 * - Syncs theme changes from parent
 * - Auto-resizes iframe height
 *
 * CUSTOMIZE: Replace {{PLUGIN_SLUG}} with your plugin slug
 */
export function AppBridgeProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const setTheme = useThemeStore((s) => s.setTheme);
  const routerRef = useRef(router);
  routerRef.current = router;
  const suppressReportRef = useRef(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingNav) return;
    suppressReportRef.current = true;
    routerRef.current.push(pendingNav);
    setPendingNav(null);
  }, [pendingNav]);

  useEffect(() => {
    // CUSTOMIZE: Change plugin slug
    const bridge = NexusAppBridge.init('{{PLUGIN_SLUG}}');
    if (!bridge.isEmbedded()) return;

    const unsubTheme = bridge.onThemeChange((themeConfig) => {
      setTheme(themeConfig.mode);
    });

    const initialRoute = bridge.getRoute();
    if (initialRoute && initialRoute !== '/') {
      suppressReportRef.current = true;
      const currentSearch = window.location.search;
      const params = new URLSearchParams(currentSearch);
      params.delete('auth_token');
      params.delete('theme');
      params.delete('route');
      const remaining = params.toString();
      const target = toInternalPath(initialRoute);
      routerRef.current.replace(remaining ? `${target}?${remaining}` : target);
    }

    const unsubNav = bridge.onNavigate((path) => {
      setPendingNav(toInternalPath(path));
    });

    return () => {
      unsubTheme();
      unsubNav();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTheme]);

  useEffect(() => {
    const bridge = NexusAppBridge.init('{{PLUGIN_SLUG}}');
    if (!bridge.isEmbedded()) return;
    if (suppressReportRef.current) {
      suppressReportRef.current = false;
      return;
    }
    bridge.navigate(toBridgeRoute(pathname));
  }, [pathname]);

  return null;
}
