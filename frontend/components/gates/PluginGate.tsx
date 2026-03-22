'use client';

import React, { useEffect, useState } from 'react';
import { useAuthToken, useAuthStore } from '@/stores/dashboard-store';
import { useTheme } from '@/stores/theme-store';
import { isCustomDomain } from '@/lib/api-config';
import { useBranding } from '@/stores/branding-store';

/**
 * PluginGate -- Authentication wall
 *
 * Blocks ALL UI rendering when the user is not authenticated.
 * On custom domains with white-label enabled, you can add a branded login form.
 *
 * CUSTOMIZE: Replace dashboard redirect URL and plugin name
 */
export function PluginGate({ children }: { children: React.ReactNode }) {
  const token = useAuthToken();
  const sessionExpired = useAuthStore(s => s.sessionExpired);
  const clearSessionExpired = useAuthStore(s => s.clearSessionExpired);
  const { isDark } = useTheme();
  const { branding, isLoaded: brandingLoaded } = useBranding();
  const [mounted, setMounted] = useState(false);

  const customDomain = typeof window !== 'undefined' && isCustomDomain();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Loading spinner
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading{branding.appName ? ` ${branding.appName}` : ''}...</span>
        </div>
      </div>
    );
  }

  if (customDomain && !brandingLoaded) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // No token = show login redirect
  if (!token) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
        <div className={`max-w-md w-full mx-auto p-8 rounded-2xl border text-center ${
          isDark ? 'bg-coinest-bg-secondary border-coinest-border' : 'bg-white border-neutral-200 shadow-lg'
        }`}>
          <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
            <svg className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Authentication Required
          </h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-coinest-text-muted' : 'text-neutral-500'}`}>
            {/* CUSTOMIZE: Plugin name */}
            {{PLUGIN_DISPLAY_NAME}} requires authentication. Please sign in through the Adverant Dashboard.
          </p>
          {/* CUSTOMIZE: Dashboard redirect URL */}
          <a
            href="https://dashboard.adverant.ai/dashboard/{{PLUGIN_SLUG}}"
            className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isDark ? 'bg-coinest-accent-cyan text-white hover:bg-coinest-accent-cyan/80' : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            Go to Dashboard
          </a>
          <p className={`text-xs mt-4 ${isDark ? 'text-neutral-600' : 'text-neutral-400'}`}>
            Requires an active Adverant Nexus subscription
          </p>
        </div>
      </div>
    );
  }

  // Session expired
  if (sessionExpired) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
        <div className={`max-w-md w-full mx-auto p-8 rounded-2xl border text-center ${
          isDark ? 'bg-coinest-bg-secondary border-coinest-border' : 'bg-white border-neutral-200 shadow-lg'
        }`}>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>Session Expired</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-coinest-text-muted' : 'text-neutral-500'}`}>
            Your session has expired. Please refresh the page.
          </p>
          <button
            onClick={() => { clearSessionExpired(); window.location.reload(); }}
            className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isDark ? 'bg-coinest-accent-cyan text-white hover:bg-coinest-accent-cyan/80' : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default PluginGate;
