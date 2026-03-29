'use client'

/**
 * ProgressModeSwitch
 *
 * Thin router that reads `displayMode` from the progress store and renders
 * either the floating ProgressCommandCenter or the docked ProgressDockBar.
 *
 * This component is dynamically imported (ssr: false) from the layout so that
 * the Zustand persist store subscription never runs on the server — preventing
 * React #185 "Maximum update depth exceeded" errors during hydration.
 */

import { useProgressCommandCenterStore } from '@/stores/progress-command-center-store'
import { ProgressCommandCenter } from './ProgressCommandCenter'
import { ProgressDockBar } from './ProgressDockBar'

export function ProgressModeSwitch() {
  const displayMode = useProgressCommandCenterStore((s) => s.displayMode)
  const setDisplayMode = useProgressCommandCenterStore((s) => s.setDisplayMode)

  if (displayMode === 'docked') {
    return <ProgressDockBar onPopOut={() => setDisplayMode('floating')} />
  }

  return <ProgressCommandCenter />
}
