/**
 * Branding Store -- White-Label Configuration
 *
 * Holds branding config fetched from the public domain config API.
 * Applied as CSS custom properties for runtime theming on custom domains.
 *
 * CUSTOMIZE: Change DEFAULT_BRANDING values to your plugin defaults
 */

import { create } from 'zustand';

export interface BrandingConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportEmail: string;
  poweredByHidden: boolean;
  whiteLabelEnabled: boolean;
  googleAuthEnabled: boolean;
  githubAuthEnabled: boolean;
  terminalComputerEnabled: boolean;
}

interface BrandingState {
  branding: BrandingConfig;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  setBranding: (config: Partial<BrandingConfig>) => void;
  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// CUSTOMIZE: Set your plugin's default branding
const DEFAULT_BRANDING: BrandingConfig = {
  appName: '{{PLUGIN_DISPLAY_NAME}}',
  tagline: '{{PLUGIN_TAGLINE}}',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#8B6BAE',
  secondaryColor: '#8B7355',
  accentColor: '#22c55e',
  supportEmail: '',
  poweredByHidden: false,
  whiteLabelEnabled: false,
  googleAuthEnabled: true,
  githubAuthEnabled: true,
  terminalComputerEnabled: false,
};

export const useBrandingStore = create<BrandingState>((set) => ({
  branding: { ...DEFAULT_BRANDING },
  isLoaded: false,
  isLoading: false,
  error: null,
  setBranding: (config) => set((state) => ({ branding: { ...state.branding, ...config } })),
  setLoaded: (isLoaded) => set({ isLoaded }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const useBranding = () => {
  const branding = useBrandingStore((s) => s.branding);
  const isLoaded = useBrandingStore((s) => s.isLoaded);
  const isLoading = useBrandingStore((s) => s.isLoading);
  return { branding, isLoaded, isLoading };
};
