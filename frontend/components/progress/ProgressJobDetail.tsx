'use client'

/**
 * ProgressJobDetail — slide-out job detail panel.
 *
 * Shown when a user clicks a ProgressJobCard. Fetches full job data from
 * GET /my-plugin/api/operations /* TODO: your API path *//{jobId} and displays:
 *   - Job metadata (title, project, start time, duration, status)
 *   - Step list via ProgressStepList
 *   - Scrollable progress log (job.messages, falling back to fetched logs)
 *   - "View Result" navigation button (routes by job type)
 *   - "Close" button
 *
 * Navigation: window.location.href (standalone mode — no Next.js router).
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { useTheme } from '@/stores/theme-store'
import type { TrackedJob } from '@/stores/progress-command-center-store'
import { useProgressCommandCenterStore } from '@/stores/progress-command-center-store'
import { ProgressStepList } from './ProgressStepList'

// ---------------------------------------------------------------------------
// Route mapping — job type → result page
// ---------------------------------------------------------------------------

const JOB_RESULT_ROUTES: Record<string, string> = {
  beat: '/' // TODO: your route,
  chapter: '/' // TODO: your route,
  blueprint: '/' // TODO: your route,
  research: '/' // TODO: your route,
  analysis: '/' // TODO: your route,
  critique: '/' // TODO: your route,
  room_persona: '/' // TODO: your route,
  constitution: '/' // TODO: your route,
  publication: '/' // TODO: your route,
  story_forge: '/' // TODO: your route,
  character_bible: '/' // TODO: your route,
  character_evolution: '/' // TODO: your route,
  world_element_generate: '/' // TODO: your route,
  trope_suggest: '/' // TODO: your route,
  insight_resolve: '/' // TODO: your route,
  inspector_implement: '/' // TODO: your route,
  document_ingest: '/' // TODO: your route,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai'

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dashboard_token') : null
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(startedAt: number, endedAt?: number): string {
  const ms = Math.max(0, (endedAt ?? Date.now()) - startedAt)
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  if (mins < 60) return `${mins}m ${rem}s`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatLogTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Types for API response
// ---------------------------------------------------------------------------

interface OperationDetail {
  id: string
  job_type: string
  status: string
  stage?: string
  progress?: number
  message?: string
  error_message?: string
  created_at?: string
  completed_at?: string
  logs?: Array<{ timestamp: string; message: string }>
  input_params?: Record<string, unknown>
  result?: unknown
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProgressJobDetailProps {
  job: TrackedJob
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressJobDetail({ job, onClose }: ProgressJobDetailProps) {
  const { isDark } = useTheme()

  const [detail, setDetail] = useState<OperationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)

  // Guard: only fetch once per jobId to prevent re-render loops on 404/error.
  // Stored as a ref so mutations don't trigger re-renders.
  const hasFetchedRef = useRef(false)

  // -------------------------------------------------------------------------
  // Fetch full job details — once per jobId, never retried on error/404
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Reset guard on jobId change so the new job always fetches
    hasFetchedRef.current = false
    setIsNotFound(false)
    setFetchError(null)
    setDetail(null)
    setLoading(true)

    let cancelled = false

    async function load() {
      // Prevent duplicate calls within the same jobId lifecycle
      if (hasFetchedRef.current) return
      hasFetchedRef.current = true

      // Guard: require auth token before making the request
      const token = typeof window !== 'undefined' ? localStorage.getItem('dashboard_token') : null
      if (!token) {
        if (!cancelled) {
          setFetchError(
            'Authentication required to view job details.\n' +
            'Troubleshooting:\n' +
            '  1. Ensure you are logged in to the dashboard.\n' +
            '  2. Check localStorage key "dashboard_token" is set.'
          )
          setLoading(false)
        }
        return
      }

      try {
        const res = await fetch(
          `${API_BASE}/my-plugin/api/operations /* TODO: your API path *//${job.jobId}`,
          { headers: getAuthHeaders() }
        )

        if (res.status === 404) {
          if (!cancelled) {
            setIsNotFound(true)
          }
          return
        }

        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText)
          throw new Error(
            `Operations detail API returned ${res.status}: ${text}\n` +
            `Troubleshooting:\n` +
            `  1. Verify job ID: ${job.jobId}\n` +
            `  2. Check auth token: localStorage.getItem('dashboard_token')\n` +
            `  3. Test: curl -H "Authorization: Bearer TOKEN" ${API_BASE}/my-plugin/api/operations /* TODO: your API path *//${job.jobId}`
          )
        }

        const json = await res.json()
        if (!cancelled) {
          setDetail(json.data ?? json)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[ProgressJobDetail] Failed to fetch detail for job ${job.jobId}:\n${msg}`)
          // Set error state and STOP — do not retry
          setFetchError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [job.jobId])

  // -------------------------------------------------------------------------
  // Compute log lines: prefer job.messages (live), fall back to API logs
  // -------------------------------------------------------------------------
  const logLines: Array<{ time: string; text: string }> = (() => {
    if (job.messages && job.messages.length > 0) {
      return job.messages.map((m, i) => ({ time: String(i), text: m }))
    }
    if (detail?.logs && detail.logs.length > 0) {
      return detail.logs.map((l) => ({ time: formatLogTime(l.timestamp), text: l.message }))
    }
    return []
  })()

  // -------------------------------------------------------------------------
  // "View Result" navigation
  // -------------------------------------------------------------------------
  function handleViewResult() {
    const route = JOB_RESULT_ROUTES[job.jobType]
    if (!route) {
      console.warn(
        `[ProgressJobDetail] No result route configured for job type "${job.jobType}". ` +
        `Add it to JOB_RESULT_ROUTES in ProgressJobDetail.tsx.`
      )
      return
    }

    // For constitution jobs, append projectId if available
    if (job.jobType === 'constitution' && job.projectId) {
      window.location.href = `${route}/${job.projectId}`
    } else {
      window.location.href = route
    }
  }

  const resultRoute = JOB_RESULT_ROUTES[job.jobType]
  const isCompleted = job.stage === 'complete'
  const isFailed = job.stage === 'error'
  const isActive = !job.completedAt && !isFailed

  const fullLabel = job.entityName
    ? `${job.jobLabel} — ${job.entityName}`
    : job.jobLabel

  // -------------------------------------------------------------------------
  // Theme tokens — ProseCreator purple palette
  // -------------------------------------------------------------------------
  const bg = isDark ? 'bg-[#1a1225]' : 'bg-white'
  const border = isDark ? 'border-[#8B6BAE]/30' : 'border-[#c2a8dc]/40'
  const divider = isDark ? 'border-[#8B6BAE]/20' : 'border-[#c2a8dc]/30'
  const headerText = isDark ? 'text-white' : 'text-neutral-900'
  const mutedText = isDark ? 'text-[#c2a8dc]/60' : 'text-[#654b84]/70'
  const labelText = isDark ? 'text-[#c2a8dc]/80' : 'text-[#7a5c9c]/70'
  const valueText = isDark ? 'text-white' : 'text-neutral-800'
  const sectionTitle = isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'
  const logBg = isDark ? 'bg-[#12091c]' : 'bg-[#f7f3fc]'
  const logText = isDark ? 'text-[#c2a8dc]/70' : 'text-[#654b84]/80'
  const logTimestamp = isDark ? 'text-[#8B6BAE]/50' : 'text-[#c2a8dc]/70'
  const closeBtnClass = isDark
    ? 'text-sm px-3 py-1.5 rounded-lg border border-[#8B6BAE]/30 text-[#c2a8dc]/70 hover:text-[#c2a8dc] hover:border-[#8B6BAE]/60 transition-colors'
    : 'text-sm px-3 py-1.5 rounded-lg border border-[#c2a8dc]/40 text-[#7a5c9c]/60 hover:text-[#7a5c9c] hover:border-[#c2a8dc]/70 transition-colors'
  const viewBtnClass = isDark
    ? 'text-sm px-3 py-1.5 rounded-lg bg-[#8B6BAE] hover:bg-[#9b7bc0] text-white font-medium transition-colors'
    : 'text-sm px-3 py-1.5 rounded-lg bg-[#7a5c9c] hover:bg-[#8d6eb5] text-white font-medium transition-colors'
  const viewBtnDisabledClass = isDark
    ? 'text-sm px-3 py-1.5 rounded-lg bg-[#2b1d3d] text-[#8B6BAE]/40 font-medium cursor-not-allowed'
    : 'text-sm px-3 py-1.5 rounded-lg bg-[#ede5f5] text-[#c2a8dc]/60 font-medium cursor-not-allowed'

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${divider} shrink-0`}>
        <button
          type="button"
          aria-label="Back to job list"
          onClick={onClose}
          className={`flex items-center gap-1 text-sm ${mutedText} hover:${isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'} transition-colors`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className={`flex-1 text-sm font-semibold text-center ${headerText}`}>
          Job Detail
        </span>
        {/* spacer to balance the back button */}
        <span className="w-14" aria-hidden />
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-4">

        {/* Title + metadata */}
        <div>
          <h2 className={`text-base font-semibold ${valueText} leading-snug`}>
            {fullLabel}
          </h2>
          {job.projectName && (
            <p className={`text-xs mt-0.5 ${mutedText}`}>Project: {job.projectName}</p>
          )}
        </div>

        {/* Metadata grid */}
        <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border rounded-lg px-3 py-2.5 ${border}`}>
          <span className={labelText}>Started</span>
          <span className={valueText}>{formatDate(job.startedAt)}</span>

          <span className={labelText}>Duration</span>
          <span className={valueText}>{formatDuration(job.startedAt, job.completedAt)}</span>

          <span className={labelText}>Status</span>
          <span className="flex items-center gap-1.5">
            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            {isFailed && <XCircle className="w-3.5 h-3.5 text-red-500" />}
            {isActive && <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'}`} />}
            <span className={
              isCompleted ? 'text-green-500' :
              isFailed ? 'text-red-500' :
              isDark ? 'text-[#c2a8dc]' : 'text-[#7a5c9c]'
            }>
              {isCompleted ? 'Complete' : isFailed ? 'Failed' : `${job.progress}% — ${job.stage}`}
            </span>
          </span>

          {job.error && (
            <>
              <span className={labelText}>Error</span>
              <span className="text-red-400 col-span-1 break-words">{job.error}</span>
            </>
          )}
        </div>

        {/* Loading spinner while fetching API detail */}
        {loading && (
          <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading job details...</span>
          </div>
        )}

        {/* 404 — job cleaned up on server */}
        {isNotFound && !loading && (
          <div className="flex flex-col gap-2 text-xs bg-amber-500/10 rounded px-2.5 py-2.5 leading-relaxed">
            <p className="text-amber-500/90">
              Job not found on server — it may have been cleaned up.
            </p>
            <button
              type="button"
              onClick={() => {
                useProgressCommandCenterStore.getState().removeJob(job.jobId)
                onClose()
              }}
              className="self-start px-2.5 py-1 rounded border border-amber-500/40 text-amber-500/80 hover:text-amber-500 hover:border-amber-500/70 transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {/* Fetch error (non-fatal — still show whatever we have from store) */}
        {fetchError && !loading && (
          <p className="text-xs text-amber-500/80 bg-amber-500/10 rounded px-2.5 py-1.5 leading-relaxed">
            Could not load full detail from server. Showing cached data.
          </p>
        )}

        {/* Step list */}
        {job.steps.length > 0 && (
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sectionTitle}`}>
              Steps
            </p>
            <ProgressStepList steps={job.steps} currentStep={job.currentStep} />
          </div>
        )}

        {/* Progress log */}
        {logLines.length > 0 && (
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sectionTitle}`}>
              Progress Log
            </p>
            <div className={`${logBg} rounded-lg px-3 py-2.5 max-h-40 overflow-y-auto flex flex-col gap-1`}>
              {logLines.map((line, i) => (
                <div key={i} className="flex gap-2 text-xs leading-relaxed">
                  <span className={`shrink-0 font-mono ${logTimestamp}`}>{line.time}</span>
                  <span className={logText}>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback message when no steps and no log */}
        {!loading && job.steps.length === 0 && logLines.length === 0 && (
          <p className={`text-xs ${mutedText} text-center py-4`}>
            No detailed progress data available for this job.
          </p>
        )}
      </div>

      {/* ── Footer actions ──────────────────────────────────────────────── */}
      <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${divider} shrink-0`}>
        <button type="button" className={closeBtnClass} onClick={onClose}>
          Close
        </button>
        {resultRoute ? (
          <button
            type="button"
            className={viewBtnClass}
            onClick={handleViewResult}
          >
            View Result
          </button>
        ) : (
          <button type="button" className={viewBtnDisabledClass} disabled>
            View Result
          </button>
        )}
      </div>
    </div>
  )
}
