/**
 * PageContextBridge -- Cross-origin page context sync for white-label plugins
 *
 * Posts page context to dashboard.adverant.ai/api/user/page-context
 * so the Terminal Computer's Claude Code knows what page the user is on.
 * Works cross-origin (CORS is configured for *.adverant.ai).
 *
 * Drop this component into any plugin layout to enable context awareness.
 *
 * CUSTOMIZE: No changes needed -- uses floating-terminal-store automatically
 */

'use client'

import { useEffect, useRef } from 'react'
import { useFloatingTerminalStore } from '@/stores/floating-terminal-store'
import { useAuthToken } from '@/stores/dashboard-store'

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.adverant.ai'
const DEBOUNCE_MS = 1500

export function PageContextBridge() {
  const token = useAuthToken()
  const pageContext = useFloatingTerminalStore((s) => s.pageContext)
  const contextVersion = useFloatingTerminalStore((s) => s.contextVersion)
  const lastVersionRef = useRef(0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!pageContext || !token) return
    if (contextVersion === lastVersionRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`${DASHBOARD_URL}/api/user/page-context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            context: pageContext,
            source: '{{PLUGIN_SLUG}}-bridge', // CUSTOMIZE
          }),
        })
        lastVersionRef.current = contextVersion
      } catch {
        // Best effort -- don't block UI
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [pageContext, contextVersion, token])

  return null // Invisible component
}
