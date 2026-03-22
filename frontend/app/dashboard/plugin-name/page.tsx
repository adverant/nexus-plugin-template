'use client';

import { useThemeClasses } from '@/hooks/useThemeClasses';

/**
 * Plugin Overview Page -- Template
 *
 * CUSTOMIZE: Replace with your plugin's overview content
 */
export default function PluginOverviewPage() {
  const tc = useThemeClasses();

  return (
    <div className={`p-6 ${tc.pageWrapper} min-h-full`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${tc.sectionTitle}`}>
            {'{{PLUGIN_DISPLAY_NAME}}'}
          </h1>
          <p className={`mt-1 ${tc.sectionSubtitle}`}>
            {'{{PLUGIN_TAGLINE}}'}
          </p>
        </div>

        <div className={`rounded-xl border p-6 ${tc.card}`}>
          <h2 className={`text-lg font-semibold mb-4 ${tc.textPrimary}`}>
            Getting Started
          </h2>
          <p className={tc.textSecondary}>
            This is your plugin overview page. Replace this content with your
            plugin&apos;s dashboard, stats, or quick actions.
          </p>
        </div>
      </div>
    </div>
  );
}
