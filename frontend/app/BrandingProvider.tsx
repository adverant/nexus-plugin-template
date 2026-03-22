'use client';

import { useEffect } from 'react';
import { isCustomDomain, isProductDomain, getAuthApiBase } from '@/lib/api-config';
import { useBrandingStore } from '@/stores/branding-store';

/**
 * CUSTOMIZE: Add your product domain branding here.
 * First-party product domains get hardcoded branding (no API call needed).
 */
const PRODUCT_DOMAIN_BRANDING: Record<string, Record<string, unknown>> = {
  // 'your-plugin-domain.com': {
  //   app_name: '{{PLUGIN_DISPLAY_NAME}}',
  //   tagline: '{{PLUGIN_TAGLINE}}',
  //   logo_url: '/your-logo.webp',
  //   favicon_url: '/favicon-32x32.png',
  //   primary_color: '#8B6BAE',
  //   secondary_color: '#C97B6B',
  //   accent_color: '#8B6BAE',
  //   powered_by_hidden: true,
  //   white_label_enabled: true,
  //   google_auth_enabled: true,
  //   terminal_computer_enabled: true,
  // },
};

function mapAndApplyBranding(
  b: Record<string, unknown>,
  setBranding: (config: Record<string, unknown>) => void,
  setLoaded: (v: boolean) => void,
  setLoading: (v: boolean) => void,
) {
  const config = {
    appName: (b.app_name as string) || '{{PLUGIN_DISPLAY_NAME}}',
    tagline: (b.tagline as string) || '',
    logoUrl: (b.logo_url as string) || '',
    faviconUrl: (b.favicon_url as string) || '',
    primaryColor: (b.primary_color as string) || '#8B6BAE',
    secondaryColor: (b.secondary_color as string) || '#8B7355',
    accentColor: (b.accent_color as string) || '#22c55e',
    supportEmail: (b.support_email as string) || '',
    poweredByHidden: b.powered_by_hidden === true,
    whiteLabelEnabled: b.white_label_enabled === true,
    googleAuthEnabled: b.google_auth_enabled !== false,
    githubAuthEnabled: b.github_auth_enabled !== false,
    terminalComputerEnabled: b.terminal_computer_enabled === true,
  };

  setBranding(config);

  const root = document.documentElement;
  root.style.setProperty('--brand-primary', config.primaryColor);
  root.style.setProperty('--brand-secondary', config.secondaryColor);
  root.style.setProperty('--brand-accent', config.accentColor);

  if (config.appName) {
    document.title = config.tagline ? `${config.appName} - ${config.tagline}` : config.appName;
  }

  if (config.faviconUrl) {
    const href = config.faviconUrl.startsWith('data:')
      ? config.faviconUrl
      : config.faviconUrl + (config.faviconUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const existingLinks = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    if (existingLinks.length > 0) {
      existingLinks.forEach(link => { link.href = href; });
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  setLoaded(true);
  setLoading(false);
}

export function BrandingProvider() {
  const setBranding = useBrandingStore((s) => s.setBranding);
  const setLoaded = useBrandingStore((s) => s.setLoaded);
  const setLoading = useBrandingStore((s) => s.setLoading);
  const setError = useBrandingStore((s) => s.setError);

  useEffect(() => {
    if (!isCustomDomain() && !isProductDomain()) {
      setLoaded(true);
      return;
    }

    const hostname = window.location.hostname;
    const productBranding = PRODUCT_DOMAIN_BRANDING[hostname];
    if (productBranding) {
      mapAndApplyBranding(productBranding, setBranding, setLoaded, setLoading);
      return;
    }

    const apiBase = getAuthApiBase();
    setLoading(true);

    fetch(`${apiBase}/api/v1/public/domains/${hostname}/config`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        mapAndApplyBranding(data.branding || {}, setBranding, setLoaded, setLoading);
      })
      .catch((err) => {
        console.warn('Failed to load branding config:', err);
        setError(err.message);
        setLoaded(true);
        setLoading(false);
      });
  }, [setBranding, setLoaded, setLoading, setError]);

  return null;
}
