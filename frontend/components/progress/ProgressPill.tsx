'use client'

/**
 * ProgressPill — compact fixed-position pill showing active jobs.
 * Draggable — shares position with ProgressCommandCenter.
 * Uses a STABLE string-signature selector to prevent React #185.
 * ProseCreator purple palette.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ChevronDown } from 'lucide-react'
import { useProgressCommandCenterStore } from '@/stores/progress-command-center-store'
import { useTheme } from '@/stores/theme-store'

interface ProgressPillProps {
  onExpand: () => void
  position?: { x: number; y: number } | null
  onPositionChange?: (pos: { x: number; y: number }) => void
}

export function ProgressPill({ onExpand, position, onPositionChange }: ProgressPillProps) {
  const { isDark } = useTheme()

  // Stable string-signature selector — prevents React #185
  const activeSignature = useProgressCommandCenterStore((s) =>
    Object.values(s.jobs)
      .filter((j) => !j.completedAt)
      .map((j) => `${j.jobId}:${j.progress}:${j.jobLabel}:${j.entityName ?? ''}`)
      .sort()
      .join('|')
  )

  const activeJobs = useMemo(() => {
    if (!activeSignature) return []
    return Object.values(useProgressCommandCenterStore.getState().jobs)
      .filter((j) => !j.completedAt)
      .sort((a, b) => b.startedAt - a.startedAt)
  }, [activeSignature])

  const activeCount = activeJobs.length
  if (activeCount === 0) return null

  const isSingle = activeCount === 1
  const primaryJob = activeJobs[0]!

  // Position style
  const posStyle: React.CSSProperties = position
    ? { top: position.y, left: position.x, right: 'auto' }
    : { top: '4rem', right: '1rem' }

  // ProseCreator purple palette
  const pillTheme = isDark
    ? 'bg-[#1a1225]/90 border-[#8B6BAE]/30 text-white hover:border-[#8B6BAE]/50'
    : 'bg-white/90 border-[#c2a8dc]/40 text-neutral-900 hover:border-[#7a5c9c]/50'

  const progressGradient = isDark
    ? 'linear-gradient(to right, #8B6BAE, #c2a8dc)'
    : 'linear-gradient(to right, #7a5c9c, #9b7bc0)'

  return (
    <DraggablePill
      posStyle={posStyle}
      pillTheme={pillTheme}
      onExpand={onExpand}
      onPositionChange={onPositionChange}
      activeCount={activeCount}
      isDark={isDark}
    >
      {/* Pulsing activity dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDark ? 'bg-[#c2a8dc]' : 'bg-[#7a5c9c]'}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isDark ? 'bg-[#c2a8dc]' : 'bg-[#7a5c9c]'}`} />
      </span>

      {isSingle ? (
        <>
          <span className={`text-xs font-medium truncate max-w-[130px] ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {primaryJob.entityName
              ? `${primaryJob.jobLabel} · ${primaryJob.entityName}`
              : primaryJob.jobLabel}
          </span>

          <div className={`flex-1 min-w-[60px] max-w-[80px] h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#2b1d3d]' : 'bg-[#ede5f5]'}`}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${primaryJob.progress}%`, background: progressGradient }}
            />
          </div>

          <span className={`text-xs font-semibold tabular-nums shrink-0 ${isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'}`}>
            {primaryJob.progress}%
          </span>
        </>
      ) : (
        <>
          <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {activeCount} active
          </span>

          <span className={`text-xs shrink-0 ${isDark ? 'text-[#8B6BAE]/40' : 'text-[#c2a8dc]'}`}>|</span>

          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {activeJobs.slice(0, 2).map((job, idx) => (
              <span key={job.jobId} className="flex items-center gap-1 min-w-0">
                {idx > 0 && (
                  <span className={`text-xs shrink-0 ${isDark ? 'text-[#8B6BAE]/40' : 'text-[#c2a8dc]'}`}>·</span>
                )}
                <span className={`text-xs truncate max-w-[80px] ${isDark ? 'text-[#c2a8dc]/70' : 'text-[#654b84]'}`}>
                  {job.jobLabel}
                </span>
                <span className={`text-xs font-semibold tabular-nums shrink-0 ${isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'}`}>
                  {job.progress}%
                </span>
              </span>
            ))}
          </div>
        </>
      )}

      <Activity className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#8B6BAE]/40' : 'text-[#c2a8dc]'}`} />
      <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#8B6BAE]/40' : 'text-[#c2a8dc]'}`} />
    </DraggablePill>
  )
}

// ---------------------------------------------------------------------------
// DraggablePill — wrapper that handles drag + click disambiguation
// ---------------------------------------------------------------------------

function DraggablePill({
  posStyle,
  pillTheme,
  onExpand,
  onPositionChange,
  activeCount,
  isDark,
  children,
}: {
  posStyle: React.CSSProperties
  pillTheme: string
  onExpand: () => void
  onPositionChange?: (pos: { x: number; y: number }) => void
  activeCount: number
  isDark: boolean
  children: React.ReactNode
}) {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, didDrag: false })
  const pillRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()

    const rect = pillRef.current?.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect?.left ?? 0,
      originY: rect?.top ?? 0,
      didDrag: false,
    }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY

      // Only count as drag if moved >4px (prevents accidental drag on click)
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragRef.current.didDrag = true
      }

      if (dragRef.current.didDrag && pillRef.current) {
        const newX = Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.originX + dx))
        const newY = Math.max(0, Math.min(window.innerHeight - 50, dragRef.current.originY + dy))
        pillRef.current.style.left = `${newX}px`
        pillRef.current.style.top = `${newY}px`
        pillRef.current.style.right = 'auto'
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)

      if (dragRef.current.didDrag) {
        // Commit final position
        const rect = pillRef.current?.getBoundingClientRect()
        if (rect && onPositionChange) {
          onPositionChange({ x: rect.left, y: rect.top })
        }
      } else {
        // No drag happened — treat as click → expand
        onExpand()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onExpand, onPositionChange])

  return (
    <div
      ref={pillRef}
      role="button"
      aria-label={`${activeCount} active job${activeCount !== 1 ? 's' : ''} — drag to move, click to expand`}
      tabIndex={0}
      style={posStyle}
      className={`fixed z-50 flex items-center gap-2 h-10 px-3 rounded-full border backdrop-blur-sm select-none transition-shadow duration-200 max-w-[400px] overflow-hidden shadow-sm hover:shadow-md ${pillTheme} ${isDragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onExpand()
        }
      }}
    >
      {children}
    </div>
  )
}
