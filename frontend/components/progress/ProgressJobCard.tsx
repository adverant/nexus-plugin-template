'use client'

/**
 * ProgressJobCard — single job card for the Progress Command Center.
 *
 * Displays job status, progress bar, elapsed time, latest message, and
 * an expandable step list.  Handles three visual states:
 *   - active   (no completedAt, stage ≠ 'error')
 *   - completed (stage === 'complete')
 *   - failed   (stage === 'error')
 */

import { useEffect, useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  Square,
} from 'lucide-react'

import { useTheme } from '@/stores/theme-store'
import {
  useProgressCommandCenterStore,
  dispatchJob,
  type TrackedJob,
} from '@/stores/progress-command-center-store'
import { ProgressStepList } from './ProgressStepList'

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai'

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dashboard_token') : null
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(startedAt: number): string {
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  if (elapsed < 60) return `${elapsed}s`
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  if (mins < 60) return `${mins}m ${secs}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatFinalElapsed(startedAt: number, endedAt: number): string {
  const elapsed = Math.max(0, Math.floor((endedAt - startedAt) / 1000))
  if (elapsed < 60) return `${elapsed}s`
  const mins = Math.floor(elapsed / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProgressJobCardProps {
  job: TrackedJob
  isStepsExpanded: boolean
  onToggleSteps: () => void
  onClick?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressJobCard({
  job,
  isStepsExpanded,
  onToggleSteps,
  onClick,
}: ProgressJobCardProps) {
  const { isDark } = useTheme()

  // Ticking elapsed time — only tick for active jobs
  const isActive = !job.completedAt && job.stage !== 'error'
  const isCompleted = job.stage === 'complete'
  const isFailed = job.stage === 'error'

  const [elapsed, setElapsed] = useState<string>(() => formatElapsed(job.startedAt))

  // In-flight states for cancel and retry
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleCancel() {
    setIsCancelling(true)
    setActionError(null)
    try {
      const res = await fetch(
        `${API_BASE}/my-plugin/api/operations /* TODO: your API path *//${job.jobId}/cancel`,
        { method: 'POST', headers: getAuthHeaders() }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message || `HTTP ${res.status}`)
      }
      useProgressCommandCenterStore.getState().failJob(job.jobId, 'Cancelled by user')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setIsCancelling(false)
    }
  }

  async function handleRetry() {
    setIsRetrying(true)
    setActionError(null)
    try {
      const res = await fetch(
        `${API_BASE}/my-plugin/api/operations /* TODO: your API path *//${job.jobId}/retry`,
        { method: 'POST', headers: getAuthHeaders() }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message || `HTTP ${res.status}`)
      }
      const newJob = await res.json() as { id: string; job_type?: string; [key: string]: unknown }
      dispatchJob({
        jobId: newJob.id,
        projectId: job.projectId,
        jobType: newJob.job_type ?? job.jobType,
        jobLabel: job.jobLabel,
        entityName: job.entityName,
        originPage: job.originPage,
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    if (!isActive) return

    // Update immediately, then every second
    setElapsed(formatElapsed(job.startedAt))
    const id = setInterval(() => {
      setElapsed(formatElapsed(job.startedAt))
    }, 1000)

    return () => clearInterval(id)
  }, [isActive, job.startedAt])

  // Visual progress — cap at 95% for active jobs
  const displayProgress = isCompleted
    ? 100
    : isFailed
    ? 0
    : Math.min(job.progress, 95)

  // ---------------------------------------------------------------------------
  // Theme tokens
  // ---------------------------------------------------------------------------
  const cardBg = isDark ? 'bg-[#1a1225]' : 'bg-white'
  const borderColor = isDark ? 'border-[#8B6BAE]/20' : 'border-[#c2a8dc]/30'
  const titleColor = isDark ? 'text-white' : 'text-neutral-900'
  const mutedColor = isDark ? 'text-[#c2a8dc]/60' : 'text-[#654b84]/70'
  const trackColor = isDark ? 'bg-[#2b1d3d]' : 'bg-[#ede5f5]'

  // Progress bar gradient — ProseCreator purple
  const progressGradient = isDark
    ? 'bg-gradient-to-r from-[#8B6BAE] to-[#c2a8dc]'
    : 'bg-gradient-to-r from-[#7a5c9c] to-[#9b7bc0]'

  // Label text for completed/failed elapsed
  const finalElapsed =
    job.completedAt != null
      ? formatFinalElapsed(job.startedAt, job.completedAt)
      : null

  // Full job label including entity name
  const fullLabel = job.entityName
    ? `${job.jobLabel} — ${job.entityName}`
    : job.jobLabel

  const hasSteps = job.steps.length > 0

  // ---------------------------------------------------------------------------
  // Render: Completed
  // ---------------------------------------------------------------------------
  if (isCompleted) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
        className={`${cardBg} rounded-lg border ${borderColor} px-3 py-2.5 flex items-center gap-2.5 ${onClick ? 'cursor-pointer hover:border-[#8B6BAE]/40 transition-colors' : ''}`}
      >
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${mutedColor} truncate block`}>
            {fullLabel}
          </span>
          <span className={`text-xs ${mutedColor}`}>
            Completed&nbsp;·&nbsp;Click to view details
          </span>
        </div>
        {finalElapsed != null && (
          <span className={`text-xs ${mutedColor} shrink-0 ml-1`}>
            Done&nbsp;·&nbsp;{finalElapsed}
          </span>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Failed
  // ---------------------------------------------------------------------------
  if (isFailed) {
    return (
      <div
        className={`${cardBg} rounded-lg border border-red-500/40 px-3 py-2.5`}
      >
        <div className="flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className={`flex-1 text-sm font-medium ${titleColor} truncate`}>
            {fullLabel}
          </span>
          {finalElapsed != null && (
            <span className="text-xs text-red-400 shrink-0">
              Failed&nbsp;·&nbsp;{finalElapsed}
            </span>
          )}
        </div>
        {job.error && (
          <p className="mt-1.5 text-xs text-red-400 truncate pl-[1.625rem] leading-snug">
            Error:&nbsp;{job.error}
          </p>
        )}
        {actionError && (
          <p className="mt-1 text-xs text-red-400 truncate pl-[1.625rem] leading-snug">
            {actionError}
          </p>
        )}
        <div className="mt-2 pl-[1.625rem]">
          <button
            type="button"
            disabled={isRetrying}
            className="text-xs text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-400 rounded px-2 py-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRetry}
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Active
  // ---------------------------------------------------------------------------
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={`${cardBg} rounded-lg border ${borderColor} px-3 py-2.5 ${onClick ? 'cursor-pointer hover:border-[#8B6BAE]/40 transition-colors' : ''}`}
    >
      {/* Row 1 — icon + label + elapsed */}
      <div className="flex items-center gap-2">
        <Loader2 className={`w-4 h-4 shrink-0 animate-spin ${isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'}`} />

        <span className={`flex-1 text-sm font-medium ${titleColor} truncate`}>
          {fullLabel}
        </span>

        <span className={`text-xs ${mutedColor} shrink-0`}>{elapsed}</span>

        {/* Cancel button — stops the running job */}
        <button
          type="button"
          aria-label="Cancel job"
          disabled={isCancelling}
          onClick={handleCancel}
          className={`shrink-0 rounded p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? 'text-[#c2a8dc]/50 hover:text-red-400 hover:bg-red-500/10'
              : 'text-[#7a5c9c]/40 hover:text-red-500 hover:bg-red-500/10'
          }`}
        >
          <Square className="w-3 h-3" />
        </button>

        {/* Steps toggle — only when steps are available */}
        {hasSteps && (
          <button
            type="button"
            aria-label={isStepsExpanded ? 'Collapse steps' : 'Expand steps'}
            onClick={onToggleSteps}
            className={`ml-1 shrink-0 ${mutedColor} ${isDark ? 'hover:text-[#c2a8dc]' : 'hover:text-[#7a5c9c]'} transition-colors`}
          >
            {isStepsExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Row 2 — progress bar */}
      <div className={`mt-2 h-1.5 ${trackColor} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${progressGradient} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Row 3 — percentage + latest message */}
      <div className="flex items-center justify-between mt-1">
        <p className={`text-xs ${mutedColor} truncate flex-1 min-w-0 pr-2 leading-snug`}>
          {job.message}
        </p>
        <span className={`text-xs ${mutedColor} shrink-0 tabular-nums`}>
          {displayProgress}%
        </span>
      </div>

      {/* Cancel error — shown inline below progress row */}
      {actionError && (
        <p className="mt-1 text-xs text-red-400 truncate leading-snug">
          {actionError}
        </p>
      )}

      {/* Step list — conditionally rendered */}
      {hasSteps && isStepsExpanded && (
        <div className={`mt-2 border-t ${isDark ? 'border-[#8B6BAE]/20' : 'border-[#c2a8dc]/30'} pt-2`}>
          <ProgressStepList steps={job.steps} currentStep={job.currentStep} />
        </div>
      )}
    </div>
  )
}
