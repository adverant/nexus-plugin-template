'use client'

/**
 * useJobWatcher — Replaces setInterval polling loops for job status tracking.
 *
 * Watches the Progress Command Center store (fed by WebSocket) for a specific
 * job's lifecycle. Calls onComplete/onError when the job finishes. Returns
 * reactive status so pages can disable buttons and show loading state.
 *
 * Usage:
 *   const [jobId, setJobId] = useState<string | null>(null)
 *   const { isActive, progress, message } = useJobWatcher(jobId, {
 *     onComplete: () => { refreshData(); setJobId(null) },
 *     onError: (_, err) => { setError(err); setJobId(null) },
 *   })
 *
 * The isActive flag stays true from the moment jobId is set until the
 * Progress Command Center reports completion or error (via WebSocket).
 */

import { useEffect, useRef, useMemo } from 'react'
import { useProgressCommandCenterStore } from '@/stores/progress-command-center-store'

interface JobWatcherCallbacks {
  onComplete?: (jobId: string) => void
  onError?: (jobId: string, error: string) => void
}

export function useJobWatcher(
  jobId: string | null,
  callbacks?: JobWatcherCallbacks
) {
  const onCompleteRef = useRef(callbacks?.onComplete)
  const onErrorRef = useRef(callbacks?.onError)
  onCompleteRef.current = callbacks?.onComplete
  onErrorRef.current = callbacks?.onError

  const firedRef = useRef<string | null>(null)

  const job = useProgressCommandCenterStore((state) =>
    jobId ? state.jobs[jobId] ?? null : null
  )

  // Reset fired flag when jobId changes
  useEffect(() => {
    firedRef.current = null
  }, [jobId])

  // Fire callbacks on completion/error
  useEffect(() => {
    if (!jobId || firedRef.current === jobId || !job) return

    if (job.completedAt && !job.error) {
      firedRef.current = jobId
      onCompleteRef.current?.(jobId)
    } else if (job.error) {
      firedRef.current = jobId
      onErrorRef.current?.(jobId, job.error)
    }
  }, [jobId, job?.completedAt, job?.error])

  return {
    /** True if jobId is set and the job hasn't completed or errored yet */
    isActive: !!jobId && (!job || (!job.completedAt && !job.error)),
    /** 0-100 progress from the Command Center */
    progress: job?.progress ?? 0,
    /** Latest status message */
    message: job?.message ?? '',
    /** Current stage string */
    stage: job?.stage ?? '',
    /** The full tracked job object, or null */
    job,
  }
}

/**
 * useMultiJobWatcher — Watches multiple concurrent jobs for a project.
 *
 * Returns all active + recently completed jobs for a given projectId,
 * and fires onJobComplete when any tracked job finishes.
 *
 * Usage:
 *   const { activeJobs, hasActive } = useMultiJobWatcher(projectId, {
 *     onJobComplete: (jobId, jobType) => refreshDataForType(jobType),
 *   })
 */
export function useMultiJobWatcher(
  projectId: string | null,
  callbacks?: {
    onJobComplete?: (jobId: string, jobType: string) => void
    onJobError?: (jobId: string, jobType: string, error: string) => void
  }
) {
  const onCompleteRef = useRef(callbacks?.onJobComplete)
  const onErrorRef = useRef(callbacks?.onJobError)
  onCompleteRef.current = callbacks?.onJobComplete
  onErrorRef.current = callbacks?.onJobError

  const seenRef = useRef<Set<string>>(new Set())

  // CRITICAL: Use a STABLE selector that returns a primitive (string).
  // Returning arrays from Zustand selectors causes React #185 (infinite re-render)
  // because Object.values().filter() always creates a new array reference,
  // which Zustand interprets as a state change → re-render → new array → re-render...
  const jobSignature = useProgressCommandCenterStore((state) => {
    if (!projectId) return ''
    // Build a stable string key: "jobId:stage:completedAt|jobId:stage:completedAt|..."
    return Object.values(state.jobs)
      .filter((j) => j.projectId === projectId)
      .map((j) => `${j.jobId}:${j.stage}:${j.completedAt ?? ''}:${j.error ?? ''}`)
      .sort()
      .join('|')
  })

  // Derive actual job objects from the store only when signature changes
  const projectJobs = useMemo(() => {
    if (!projectId || !jobSignature) return []
    return useProgressCommandCenterStore.getState().getJobsForProject(projectId)
  }, [projectId, jobSignature])

  useEffect(() => {
    for (const job of projectJobs) {
      if (seenRef.current.has(job.jobId)) continue

      if (job.completedAt && !job.error) {
        seenRef.current.add(job.jobId)
        onCompleteRef.current?.(job.jobId, job.jobType)
      } else if (job.error) {
        seenRef.current.add(job.jobId)
        onErrorRef.current?.(job.jobId, job.jobType, job.error)
      }
    }
  }, [projectJobs])

  // Clean up seen set when projectId changes
  useEffect(() => {
    seenRef.current = new Set()
  }, [projectId])

  const hasActive = useMemo(
    () => projectJobs.some((j) => !j.completedAt && !j.error),
    [projectJobs]
  )

  return {
    /** Whether any jobs are currently active */
    hasActive,
    /** All jobs for this project (including completed/errored) */
    allJobs: projectJobs,
  }
}
