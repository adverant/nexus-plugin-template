/**
 * i18n Stub -- Lightweight replacement for next-intl
 *
 * Provides a simple t('key') translation function using plain objects.
 * Replace with next-intl or react-intl when you need full i18n support.
 *
 * CUSTOMIZE: Add your plugin's translations to the TRANSLATIONS object
 */

import { useMemo } from 'react';

// CUSTOMIZE: Add your plugin's translation keys
const TRANSLATIONS: Record<string, Record<string, string>> = {
  themeToggle: {
    'switchToLight': 'Switch to light mode',
    'switchToDark': 'Switch to dark mode',
  },
  plugin: {
    // CUSTOMIZE: Add your plugin-specific translations
    'layout.title': '{{PLUGIN_DISPLAY_NAME}}',
    'layout.subtitle': '{{PLUGIN_TAGLINE}}',
    'layout.tabs.overview': 'Overview',
    'layout.tabs.settings': 'Settings',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search...',
    'common.noResults': 'No results found',
  },
};

/**
 * Returns a t() function for the given namespace.
 * Usage: const t = useTranslations('plugin');
 *        t('layout.title') // => '{{PLUGIN_DISPLAY_NAME}}'
 */
export function useTranslations(namespace: string) {
  return useMemo(() => {
    const ns = TRANSLATIONS[namespace] || {};
    return (key: string, params?: Record<string, string | number>): string => {
      let value = ns[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    };
  }, [namespace]);
}
