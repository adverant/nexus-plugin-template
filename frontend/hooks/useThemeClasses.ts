/**
 * Theme Classes Hook -- Standalone
 *
 * Provides consistent theme-aware CSS class strings.
 * Matches nexus-dashboard's Coinest dark theme + light theme counterparts.
 *
 * NO CUSTOMIZATION NEEDED -- these match the dashboard exactly
 */

import { useMemo } from 'react';
import { useTheme } from '@/stores/theme-store';

export function useThemeClasses() {
  const { isDark } = useTheme();

  return useMemo(() => ({
    bgPrimary: isDark ? 'bg-coinest-bg-primary' : 'bg-neutral-50',
    bgSecondary: isDark ? 'bg-coinest-bg-secondary' : 'bg-white',
    bgTertiary: isDark ? 'bg-coinest-bg-tertiary' : 'bg-neutral-100',

    textPrimary: isDark ? 'text-white' : 'text-neutral-900',
    textSecondary: isDark ? 'text-coinest-text-secondary' : 'text-neutral-700',
    textMuted: isDark ? 'text-coinest-text-muted' : 'text-neutral-700',

    border: isDark ? 'border-coinest-border' : 'border-neutral-200',

    accentCyan: isDark ? 'text-coinest-accent-cyan' : 'text-brand-400',
    accentBrown: isDark ? 'text-coinest-accent-brown' : 'text-neutral-600',

    card: isDark
      ? 'bg-coinest-bg-secondary border-coinest-border'
      : 'bg-white border-neutral-200',

    cardHover: isDark
      ? 'hover:border-coinest-border/80'
      : 'hover:border-neutral-300',

    input: isDark
      ? 'bg-coinest-bg-tertiary border-coinest-border text-white placeholder:text-coinest-text-muted focus:border-coinest-accent-cyan'
      : 'bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:border-brand-400',

    buttonPrimary: isDark
      ? 'bg-coinest-accent-cyan text-white hover:bg-coinest-accent-cyan/90'
      : 'bg-brand-400 text-white hover:bg-brand-500',

    buttonSecondary: isDark
      ? 'bg-coinest-bg-tertiary text-white hover:bg-coinest-bg-tertiary/80 border border-coinest-border'
      : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-300',

    buttonGhost: isDark
      ? 'text-coinest-text-muted hover:text-white hover:bg-coinest-bg-tertiary'
      : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100',

    buttonDanger: isDark
      ? 'text-red-400 hover:bg-red-900/30 border border-red-800'
      : 'text-red-600 hover:bg-red-50 border border-red-200',

    badgeSuccess: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    badgeWarning: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    badgeError: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
    badgeInfo: isDark ? 'bg-[#8B6BAE]/20 text-[#c2a8dc]' : 'bg-[#ede5f5] text-[#654b84]',
    badgeNeutral: isDark ? 'bg-coinest-bg-tertiary text-coinest-text-muted' : 'bg-neutral-100 text-neutral-700',

    tableHeader: isDark ? 'bg-coinest-bg-tertiary' : 'bg-neutral-50',
    tableRow: isDark ? 'hover:bg-coinest-bg-tertiary' : 'hover:bg-neutral-50',
    tableDivider: isDark ? 'divide-coinest-border' : 'divide-neutral-200',

    infoBanner: isDark
      ? 'bg-coinest-accent-cyan/10 border-coinest-accent-cyan/30'
      : 'bg-brand-50 border-brand-200',

    pageWrapper: isDark ? 'bg-coinest-bg-primary' : 'bg-neutral-50',
    sectionTitle: isDark ? 'text-white' : 'text-neutral-900',
    sectionSubtitle: isDark ? 'text-coinest-text-secondary' : 'text-neutral-600',
  }), [isDark]);
}

export type ThemeClassKey = keyof ReturnType<typeof useThemeClasses>;
