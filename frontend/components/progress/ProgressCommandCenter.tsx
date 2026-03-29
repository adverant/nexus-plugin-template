'use client'

/**
 * ProgressCommandCenter
 *
 * Floating, draggable panel that tracks all active generation jobs.
 * Toggles between a compact pill (ProgressPill) and an expanded card list.
 *
 * Key patterns:
 * - Individual Zustand selectors (NOT whole-store destructure) to prevent React #185
 * - Drag via mousedown/mousemove/mouseup on the header — position persisted in store
 * - ProseCreator purple color palette (#7a5c9c light, #c2a8dc/#8B6BAE dark)
 *
 * Mount point: plugin layout (inside PluginWSProvider)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ChevronUp, GripHorizontal, Wifi, WifiOff, X } from 'lucide-react'

import {
  initProgressSubscription,
  useProgressCommandCenterStore,
  type TrackedJob,
} from '@/stores/progress-command-center-store'
import { usePluginWSStore } from '@/stores/plugin-ws-store'
import { useAuthToken } from '@/stores/dashboard-store'
import { useTheme } from '@/stores/theme-store'
import { ProgressPill } from './ProgressPill'
import { ProgressJobCard } from './ProgressJobCard'
import { ProgressJobDetail } from './ProgressJobDetail'

// ---------------------------------------------------------------------------
// Stable selectors — prevents React #185 (infinite re-render) by avoiding
// whole-store subscriptions that return new references on every state change.
// ---------------------------------------------------------------------------

const selectJobs = (s: { jobs: Record<string, TrackedJob> }) => s.jobs
const selectIsExpanded = (s: { isExpanded: boolean }) => s.isExpanded
const selectIsMinimized = (s: { isMinimized: boolean }) => s.isMinimized

// ---------------------------------------------------------------------------
// Drag state type
// ---------------------------------------------------------------------------
interface DragPosition {
  x: number
  y: number
}

// Panel dimensions
const PANEL_WIDTH = 420

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressCommandCenter() {
  // Individual selectors — each returns a primitive or stable reference
  const jobs = useProgressCommandCenterStore(selectJobs)
  const isExpanded = useProgressCommandCenterStore(selectIsExpanded)
  const isMinimized = useProgressCommandCenterStore(selectIsMinimized)

  // Actions are stable function references — safe to select once
  const setExpanded = useProgressCommandCenterStore((s) => s.setExpanded)
  const setMinimized = useProgressCommandCenterStore((s) => s.setMinimized)
  const setDisplayMode = useProgressCommandCenterStore((s) => s.setDisplayMode)
  const clearCompleted = useProgressCommandCenterStore((s) => s.clearCompleted)
  const hydrateFromAPI = useProgressCommandCenterStore((s) => s.hydrateFromAPI)

  const connectionStatus = usePluginWSStore((s) => s.connectionStatus)
  const token = useAuthToken()
  const { isDark } = useTheme()

  // Track which job cards have their step list expanded
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  // Detail panel — which job is currently shown in the slide-out
  const [detailJobId, setDetailJobId] = useState<string | null>(null)

  // Drag state
  const [position, setPosition] = useState<DragPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startMouseX: 0, startMouseY: 0, startPosX: 0, startPosY: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // Initialize WS → progress-store subscription (once on mount)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsub = initProgressSubscription()
    return unsub
  }, [])

  // ---------------------------------------------------------------------------
  // Hydrate from API on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai'
    hydrateFromAPI(apiUrl, token)
  }, [token, hydrateFromAPI])

  // ---------------------------------------------------------------------------
  // Re-hydrate on WS reconnect
  // ---------------------------------------------------------------------------
  const prevStatusRef = useRef(connectionStatus)
  useEffect(() => {
    if (
      connectionStatus === 'connected' &&
      prevStatusRef.current !== 'connected' &&
      token
    ) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai'
      hydrateFromAPI(apiUrl, token)
    }
    prevStatusRef.current = connectionStatus
  }, [connectionStatus, token, hydrateFromAPI])

  // ---------------------------------------------------------------------------
  // WS disconnection warning — log verbose diagnostic when WS drops with active jobs
  // Only fires on actual disconnection (was connected, then dropped) — NOT on initial mount.
  // NO POLLING FALLBACK — WS is the sole real-time channel. Fix WS, not workarounds.
  // ---------------------------------------------------------------------------
  const wasEverConnectedRef = useRef(false)
  useEffect(() => {
    if (connectionStatus === 'connected') {
      wasEverConnectedRef.current = true
    }
    if (connectionStatus === 'disconnected' && wasEverConnectedRef.current) {
      const activeCount = Object.values(useProgressCommandCenterStore.getState().jobs).filter(j => !j.completedAt).length
      if (activeCount > 0) {
        console.error(
          '[ProgressCommandCenter] WebSocket CONNECTION LOST with ' + activeCount + ' active jobs.\n' +
          'Progress updates are OFFLINE until WS reconnects.\n' +
          'Troubleshooting:\n' +
          '  1. Check WS URL: wss://api.adverant.ai/prosecreator/ws\n' +
          '  2. Verify Istio DestinationRule: kubectl get destinationrule prosecreator-ws -n nexus\n' +
          '  3. Check auth token: localStorage.getItem("dashboard_token")\n' +
          '  4. Test manually: new WebSocket("wss://api.adverant.ai/prosecreator/ws")'
        )
      }
    }
  }, [connectionStatus])

  // Compute activeJobCount outside of the effect so it's available for WS diagnostic
  const activeJobCount = useMemo(
    () => Object.values(jobs).filter((j) => !j.completedAt).length,
    [jobs]
  )

  // ---------------------------------------------------------------------------
  // Sorted jobs: active first (newest first), then completed
  // ---------------------------------------------------------------------------
  const sortedJobs = useMemo(() => {
    return Object.values(jobs).sort((a, b) => {
      if (!a.completedAt && b.completedAt) return -1
      if (a.completedAt && !b.completedAt) return 1
      return b.startedAt - a.startedAt
    })
  }, [jobs])

  const activeCount = activeJobCount
  const hasCompleted = sortedJobs.some((j) => j.completedAt != null)

  // ---------------------------------------------------------------------------
  // Auto-expand when the first job arrives (guarded to prevent re-render loop)
  // ---------------------------------------------------------------------------
  const prevActiveCount = useRef(0)
  useEffect(() => {
    if (activeCount > 0 && prevActiveCount.current === 0) {
      setMinimized(false)
      setExpanded(true)
    }
    prevActiveCount.current = activeCount
  }, [activeCount, setMinimized, setExpanded])

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag on left click, ignore buttons inside header
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return

    e.preventDefault()
    setIsDragging(true)

    const rect = panelRef.current?.getBoundingClientRect()
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: rect?.left ?? 0,
      startPosY: rect?.top ?? 0,
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startMouseX
      const dy = e.clientY - dragRef.current.startMouseY
      const newX = Math.max(0, Math.min(window.innerWidth - PANEL_WIDTH, dragRef.current.startPosX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.startPosY + dy))
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // ---------------------------------------------------------------------------
  // Step expand/collapse helpers
  // ---------------------------------------------------------------------------
  function toggleSteps(jobId: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }

  // Reset position to default
  const resetPosition = useCallback(() => setPosition(null), [])

  // ---------------------------------------------------------------------------
  // Nothing to show
  // ---------------------------------------------------------------------------
  if (sortedJobs.length === 0) return null

  // ---------------------------------------------------------------------------
  // Minimized / collapsed → show pill only
  // ---------------------------------------------------------------------------
  if (isMinimized || !isExpanded) {
    return (
      <ProgressPill
        position={position}
        onPositionChange={setPosition}
        onExpand={() => {
          setMinimized(false)
          setExpanded(true)
        }}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Position style — custom position or default top-right
  // ---------------------------------------------------------------------------
  const posStyle: React.CSSProperties = position
    ? { top: position.y, left: position.x, right: 'auto' }
    : { top: '4rem', right: '1rem' }

  // ---------------------------------------------------------------------------
  // ProseCreator theme tokens (purple palette)
  // ---------------------------------------------------------------------------
  const panelBg = isDark
    ? 'bg-[#1a1225]/95 border-[#8B6BAE]/30'
    : 'bg-white/95 border-[#c2a8dc]/40'

  const headerText = isDark ? 'text-white' : 'text-neutral-900'
  const dividerColor = isDark ? 'border-[#8B6BAE]/20' : 'border-[#c2a8dc]/30'
  const iconHover = isDark
    ? 'hover:bg-[#2b1d3d] text-[#c2a8dc]/60 hover:text-[#c2a8dc]'
    : 'hover:bg-[#ede5f5] text-[#7a5c9c]/50 hover:text-[#7a5c9c]'

  const clearBtnClass = isDark
    ? 'text-xs text-[#c2a8dc]/60 hover:text-[#c2a8dc] transition-colors'
    : 'text-xs text-[#7a5c9c]/50 hover:text-[#7a5c9c] transition-colors'

  const badgeClass = isDark
    ? 'bg-[#2b1d3d] text-[#c2a8dc]'
    : 'bg-[#ede5f5] text-[#7a5c9c]'

  // ---------------------------------------------------------------------------
  // Expanded panel
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={panelRef}
      style={{ width: PANEL_WIDTH, ...posStyle }}
      className={`fixed z-50 max-h-[calc(100vh-8rem)] flex flex-col rounded-xl border shadow-2xl backdrop-blur-sm transition-shadow duration-300 ${panelBg} ${isDragging ? 'shadow-[0_0_30px_rgba(139,107,174,0.3)]' : ''}`}
    >
      {/* ── Header (drag handle) ────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${dividerColor} shrink-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={resetPosition}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#8B6BAE]/40' : 'text-[#c2a8dc]/60'}`} />
          <span className={`text-sm font-semibold ${headerText}`}>
            Progress Center
          </span>
          {activeCount > 0 && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${badgeClass}`}>
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* WS connection status indicator */}
          <span title={connectionStatus === 'connected' ? 'WebSocket connected — real-time updates active' : `WebSocket ${connectionStatus} — check console for diagnostics`}>
            {connectionStatus === 'connected' ? (
              <Wifi className={`w-3.5 h-3.5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
            ) : (
              <WifiOff className={`w-3.5 h-3.5 ${isDark ? 'text-red-400' : 'text-red-500'} animate-pulse`} />
            )}
          </span>

          <button
            type="button"
            aria-label="Dock to top"
            className={`p-1 rounded transition-colors ${iconHover}`}
            onClick={() => setDisplayMode('docked')}
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Minimize to pill"
            className={`p-1 rounded transition-colors ${iconHover}`}
            onClick={() => setMinimized(true)}
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Hide progress center"
            className={`p-1 rounded transition-colors ${iconHover}`}
            onClick={() => {
              setExpanded(false)
              setMinimized(true)
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Detail view OR scrollable job list ─────────────────────────── */}
      {detailJobId != null ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProgressJobDetail
            job={jobs[detailJobId] ?? sortedJobs.find((j) => j.jobId === detailJobId) ?? sortedJobs[0]}
            onClose={() => setDetailJobId(null)}
          />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 flex flex-col gap-2">
            {sortedJobs.map((job) => (
              <ProgressJobCard
                key={job.jobId}
                job={job}
                isStepsExpanded={expandedSteps.has(job.jobId)}
                onToggleSteps={() => toggleSteps(job.jobId)}
                onClick={() => setDetailJobId(job.jobId)}
              />
            ))}
          </div>

          {/* ── Footer: Clear Completed ──────────────────────────────────── */}
          {hasCompleted && (
            <div className={`flex justify-end px-4 py-2 border-t ${dividerColor} shrink-0`}>
              <button type="button" className={clearBtnClass} onClick={clearCompleted}>
                Clear Completed
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
