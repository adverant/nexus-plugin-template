'use client'

/**
 * ProgressDockBar
 *
 * A docked top stripe that flows in the document (position: relative).
 * Collapsed: 36px progress bar showing the most active job.
 * Expanded: drawer (max-height: 50vh) with all job cards and footer actions.
 *
 * Key patterns:
 * - Individual Zustand selectors (NOT whole-store destructure) to prevent React #185
 * - Smooth drawer animation via max-height + overflow-hidden transition
 * - ProseCreator purple color palette (#7a5c9c light, #c2a8dc/#8B6BAE dark)
 */

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'

import {
  useProgressCommandCenterStore,
  type TrackedJob,
} from '@/stores/progress-command-center-store'
import { useTheme } from '@/stores/theme-store'
import { ProgressJobCard } from './ProgressJobCard'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProgressDockBarProps {
  onPopOut: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressDockBar({ onPopOut }: ProgressDockBarProps) {
  const { isDark } = useTheme()

  // Individual selectors — each returns a primitive or stable reference
  const jobs = useProgressCommandCenterStore((s) => s.jobs)
  const isDockExpanded = useProgressCommandCenterStore((s) => s.isDockExpanded)
  const setDockExpanded = useProgressCommandCenterStore((s) => s.setDockExpanded)
  const clearCompleted = useProgressCommandCenterStore((s) => s.clearCompleted)

  // Track which job cards have their step list expanded
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const sortedJobs = useMemo(() => {
    return Object.values(jobs).sort((a: TrackedJob, b: TrackedJob) => {
      if (!a.completedAt && b.completedAt) return -1
      if (a.completedAt && !b.completedAt) return 1
      return b.startedAt - a.startedAt
    })
  }, [jobs])

  const activeJobs = useMemo(
    () => sortedJobs.filter((j) => !j.completedAt),
    [sortedJobs]
  )

  const primaryJob = activeJobs[0] ?? sortedJobs[0]
  const activeCount = activeJobs.length
  const hasCompleted = sortedJobs.some((j) => j.completedAt != null)

  // ---------------------------------------------------------------------------
  // Step expand/collapse helper
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

  // ---------------------------------------------------------------------------
  // Nothing to show
  // ---------------------------------------------------------------------------

  if (sortedJobs.length === 0) return null

  // ---------------------------------------------------------------------------
  // Theme tokens (ProseCreator purple palette)
  // ---------------------------------------------------------------------------

  const trackBg = isDark ? 'bg-[#2b1d3d]' : 'bg-[#ede5f5]'

  const progressGradient = isDark
    ? 'linear-gradient(to right, #8B6BAE, #c2a8dc)'
    : 'linear-gradient(to right, #7a5c9c, #9b7bc0)'

  const stripeBg = isDark ? 'bg-[#1a1225]' : 'bg-white'
  const stripeBorder = isDark ? 'border-[#8B6BAE]/30' : 'border-[#c2a8dc]/40'

  const labelText = isDark ? 'text-white' : 'text-neutral-900'
  const accentText = isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'

  const badgeClass = isDark
    ? 'bg-[#2b1d3d] text-[#c2a8dc] border border-[#8B6BAE]/30'
    : 'bg-[#ede5f5] text-[#7a5c9c] border border-[#c2a8dc]/40'

  const iconBtnClass = isDark
    ? 'p-0.5 rounded transition-colors text-[#c2a8dc]/60 hover:text-[#c2a8dc] hover:bg-[#2b1d3d]'
    : 'p-0.5 rounded transition-colors text-[#7a5c9c]/50 hover:text-[#7a5c9c] hover:bg-[#ede5f5]'

  const drawerBg = isDark ? 'bg-[#1a1225]' : 'bg-white'
  const dividerColor = isDark ? 'border-[#8B6BAE]/20' : 'border-[#c2a8dc]/30'

  const footerBtnClass = isDark
    ? 'flex items-center gap-1.5 text-xs text-[#c2a8dc]/70 hover:text-[#c2a8dc] transition-colors'
    : 'flex items-center gap-1.5 text-xs text-[#7a5c9c]/60 hover:text-[#7a5c9c] transition-colors'

  const clearBtnClass = isDark
    ? 'text-xs text-[#c2a8dc]/60 hover:text-[#c2a8dc] transition-colors'
    : 'text-xs text-[#7a5c9c]/50 hover:text-[#7a5c9c] transition-colors'

  const jobLabel = primaryJob
    ? primaryJob.entityName
      ? `${primaryJob.jobLabel} · ${primaryJob.entityName}`
      : primaryJob.jobLabel
    : ''

  const primaryProgress = primaryJob?.progress ?? 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`w-full border-b ${stripeBorder}`}>
      {/* ── Collapsed stripe ──────────────────────────────────────────────── */}
      <div
        role="button"
        aria-label={isDockExpanded ? 'Collapse progress bar' : 'Expand progress center'}
        aria-expanded={isDockExpanded}
        tabIndex={0}
        className={`relative flex items-center h-9 w-full overflow-hidden cursor-pointer select-none ${stripeBg}`}
        onClick={() => setDockExpanded(!isDockExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setDockExpanded(!isDockExpanded)
          }
        }}
      >
        {/* Progress fill behind all content */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none ${trackBg}`}
          style={{ width: '100%' }}
        />
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none"
          style={{ width: `${primaryProgress}%`, background: progressGradient, opacity: 0.25 }}
        />

        {/* Content row */}
        <div className="relative flex items-center gap-2 px-3 w-full min-w-0">
          {/* Job label */}
          <span className={`text-xs font-medium truncate flex-1 min-w-0 ${labelText}`}>
            {jobLabel}
          </span>

          {/* Progress percent */}
          <span className={`text-xs font-semibold tabular-nums shrink-0 ${accentText}`}>
            {primaryProgress}%
          </span>

          {/* Active count badge (only when >1 active) */}
          {activeCount > 1 && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
              +{activeCount - 1}
            </span>
          )}

          {/* Chevron toggle — stop propagation so button click doesn't double-fire */}
          <button
            type="button"
            aria-label={isDockExpanded ? 'Collapse drawer' : 'Expand drawer'}
            className={`shrink-0 ${iconBtnClass}`}
            onClick={(e) => {
              e.stopPropagation()
              setDockExpanded(!isDockExpanded)
            }}
          >
            {isDockExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Expandable drawer ─────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden transition-all duration-300 ease-out ${drawerBg}`}
        style={{ maxHeight: isDockExpanded ? '50vh' : '0px', zIndex: 1 }}
        aria-hidden={!isDockExpanded}
      >
        {/* Scrollable job card list */}
        <div className="overflow-y-auto px-3 py-2 flex flex-col gap-2" style={{ maxHeight: 'calc(50vh - 48px)' }}>
          {sortedJobs.map((job) => (
            <ProgressJobCard
              key={job.jobId}
              job={job}
              isStepsExpanded={expandedSteps.has(job.jobId)}
              onToggleSteps={() => toggleSteps(job.jobId)}
            />
          ))}
        </div>

        {/* Drawer footer */}
        <div className={`flex items-center justify-between px-4 py-2 border-t ${dividerColor} shrink-0`}>
          {/* Pop out to floating */}
          <button
            type="button"
            className={footerBtnClass}
            onClick={(e) => {
              e.stopPropagation()
              onPopOut()
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Pop out to floating</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Clear completed */}
            {hasCompleted && (
              <button
                type="button"
                className={clearBtnClass}
                onClick={(e) => {
                  e.stopPropagation()
                  clearCompleted()
                }}
              >
                Clear completed
              </button>
            )}

            {/* Collapse button */}
            <button
              type="button"
              aria-label="Collapse progress drawer"
              className={iconBtnClass}
              onClick={(e) => {
                e.stopPropagation()
                setDockExpanded(false)
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
