/**
 * Plugin Page Context Hook -- Template
 *
 * Generates PageContext for your plugin pages, enabling the
 * Floating Terminal Computer to be context-aware of:
 * - Current page route, entities, available actions
 * - Environment variables for the terminal
 * - CLAUDE.md snippet with API instructions for Claude Code
 *
 * CUSTOMIZE: Replace the example entities, actions, and envVars
 * with your plugin's actual data model.
 *
 * Uses stable reference tracking to prevent infinite re-render loops.
 */

import { useMemo, useRef } from 'react'
import type { PageContext } from '@/stores/floating-terminal-store'

// ============================================================================
// Example: Main Page Context
// ============================================================================

/**
 * CUSTOMIZE: Replace these params with your plugin's data types
 */
export function usePluginPageContext(
  entityId: string,
  entityName: string | null,
  entityStatus: string | null,
): PageContext | null {
  const contextRef = useRef<PageContext | null>(null)
  const prevDataHashRef = useRef<string>('')

  return useMemo(() => {
    if (!entityId || !entityName) return null

    const dataHash = JSON.stringify({ id: entityId, name: entityName, status: entityStatus })

    if (dataHash === prevDataHashRef.current && contextRef.current) {
      return contextRef.current
    }
    prevDataHashRef.current = dataHash

    // CUSTOMIZE: Define your plugin's entities
    const entities: PageContext['entities'] = [
      {
        type: '{{PLUGIN_SLUG}}-entity', // e.g., 'crm-contact', 'design-project'
        id: entityId,
        displayName: entityName,
        metadata: { status: entityStatus },
      },
    ]

    // CUSTOMIZE: Define actions available on this page
    const actions: PageContext['actions'] = [
      {
        id: 'example-action',
        label: 'Example Action',
        description: 'Describe what this action does',
        apiEndpoint: '/{{PLUGIN_SLUG}}/api/example',
        requiredParams: ['entity_id'],
      },
    ]

    // CUSTOMIZE: Set environment variables for the terminal
    const envVars: Record<string, string> = {
      NEXUS_PAGE: `/dashboard/{{PLUGIN_SLUG}}/entities/${entityId}`,
      NEXUS_PLUGIN: '{{PLUGIN_SLUG}}',
      NEXUS_FEATURE: 'entity-detail',
      NEXUS_ENTITY_ID: entityId,
      NEXUS_ENTITY_NAME: entityName,
      [`NEXUS_${('{{PLUGIN_NAME_UPPER}}')}_API`]: 'https://api.adverant.ai/{{PLUGIN_SLUG}}/api',
    }

    // CUSTOMIZE: Write Claude Code context snippet
    const claudeMdSnippet = [
      `## {{PLUGIN_DISPLAY_NAME}} Assistant`,
      '',
      `You are assisting with "${entityName}" (status: ${entityStatus}).`,
      '',
      '### Available Commands',
      'Use curl with `$NEXUS_AUTH_TOKEN` to call APIs:',
      '',
      '```bash',
      '# Example API call',
      `curl -X GET -H "Authorization: Bearer $NEXUS_AUTH_TOKEN" \\`,
      `  "$NEXUS_${('{{PLUGIN_NAME_UPPER}}')}_API/entities/$NEXUS_ENTITY_ID"`,
      '```',
    ].join('\n')

    const context: PageContext = {
      pageRoute: `/dashboard/{{PLUGIN_SLUG}}/entities/${entityId}`,
      pageTitle: `{{PLUGIN_DISPLAY_NAME}}: ${entityName}`,
      plugin: '{{PLUGIN_SLUG}}',
      feature: 'entity-detail',
      entities,
      actions,
      envVars,
      claudeMdSnippet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    contextRef.current = context
    return context
  }, [entityId, entityName, entityStatus])
}
