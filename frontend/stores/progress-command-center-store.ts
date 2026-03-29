'use client'

/**
 * Progress Command Center Store — Plugin Template
 *
 * Persistent global store tracking ALL active generation jobs across all projects.
 * Uses Zustand persist middleware with localStorage for optimistic recovery on refresh.
 *
 * This is the standalone version for your plugin. The nexus-dashboard version
 * lives at nexus-dashboard/src/stores/progress-command-center-store.ts and is
 * the primary implementation.
 *
 * Architecture:
 * - Server DB (prose.generation_jobs) is the source of truth
 * - WebSocket delivers live updates via plugin-ws-store (subscription model)
 * - localStorage provides instant recovery on refresh (stale-while-revalidate)
 * - API hydration corrects stale data after mount
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usePluginWSStore } from './plugin-ws-store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  stepId: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: number
  completedAt?: number
  detail?: string
}

export interface TrackedJob {
  jobId: string
  projectId: string | null
  projectName?: string
  jobType: string
  jobLabel: string
  stage: string
  progress: number
  message: string
  steps: WorkflowStep[]
  currentStep?: string
  startedAt: number
  completedAt?: number
  error?: string
  originPage?: string
  entityName?: string
  plugin: string
  messages: string[]
}

// ---------------------------------------------------------------------------
// Job type label mapping
// ---------------------------------------------------------------------------

const JOB_TYPE_LABELS: Record<string, string> = {
  beat: 'Beat Generation',
  chapter: 'Chapter Generation',
  blueprint: 'Blueprint Generation',
  research: 'Research',
  research_refine: 'Research Refinement',
  analysis: 'Analysis',
  critique: 'Critique',
  room_persona: 'Writers Room',
  room_feedback_implement: 'Room Feedback',
  document_ingest: 'Document Ingestion',
  novel_import: 'Novel Import',
  character_bible: 'Character Bible',
  document_to_research: 'Document to Research',
  full_ingest_orchestrator: 'Full Ingestion',
  character_evolution: 'Character Evolution',
  constitution: 'Constitution Generation',
  publication: 'Publication',
  tts_voice: 'TTS Voice',
  index: 'Index Generation',
  insight_resolve: 'Insight Resolution',
  world_element_generate: 'World Building',
  world_element_expand: 'World Expansion',
  codex_generate: 'Codex Generation',
  consistency_check: 'Consistency Check',
  story_forge: 'Story Forge',
  substack_import: 'Substack Import',
  comic_generate_panels: 'Comic Panel Generation',
  inspector_implement: 'Inspector Implement',
  github_repo_scaffold: 'GitHub Scaffold',
  batch_ingest_monitor: 'Batch Ingestion',
  claim_validation: 'Claim Validation',
}

function getJobLabel(jobType: string | undefined | null): string {
  if (!jobType) return 'Processing'
  return JOB_TYPE_LABELS[jobType] || jobType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function deriveEntityName(chapterNumber?: number, beatNumber?: number): string | undefined {
  if (chapterNumber && beatNumber) return `Chapter ${chapterNumber}, Beat ${beatNumber}`
  if (chapterNumber) return `Chapter ${chapterNumber}`
  if (beatNumber) return `Beat ${beatNumber}`
  return undefined
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
const MAX_JOBS = 50

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

export type ProgressDisplayMode = 'floating' | 'docked'

interface ProgressCommandCenterState {
  jobs: Record<string, TrackedJob>
  isExpanded: boolean
  isMinimized: boolean
  displayMode: ProgressDisplayMode
  isDockExpanded: boolean

  upsertJob: (job: Partial<TrackedJob> & { jobId: string }) => void
  updateStep: (jobId: string, step: WorkflowStep) => void
  completeJob: (jobId: string) => void
  failJob: (jobId: string, error: string) => void
  removeJob: (jobId: string) => void
  clearCompleted: () => void
  setExpanded: (v: boolean) => void
  setMinimized: (v: boolean) => void
  setDisplayMode: (mode: ProgressDisplayMode) => void
  setDockExpanded: (v: boolean) => void
  hydrateFromAPI: (apiUrl: string, token: string) => Promise<void>

  getActiveJobs: () => TrackedJob[]
  getActiveCount: () => number
  getJobsForProject: (projectId: string) => TrackedJob[]
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProgressCommandCenterStore = create<ProgressCommandCenterState>()(
  persist(
    (set, get) => ({
      jobs: {},
      isExpanded: false,
      isMinimized: true,
      displayMode: 'floating' as ProgressDisplayMode,
      isDockExpanded: false,

      upsertJob: (partial) => set((state) => {
        const existing = state.jobs[partial.jobId]
        const now = Date.now()

        const merged: TrackedJob = {
          jobId: partial.jobId,
          projectId: partial.projectId ?? existing?.projectId ?? null,
          projectName: partial.projectName ?? existing?.projectName,
          jobType: partial.jobType ?? existing?.jobType ?? 'unknown',
          jobLabel: partial.jobLabel ?? existing?.jobLabel ?? getJobLabel(partial.jobType ?? existing?.jobType ?? 'unknown'),
          stage: partial.stage ?? existing?.stage ?? 'queued',
          progress: Math.min(partial.progress ?? existing?.progress ?? 0, 95),
          message: partial.message ?? existing?.message ?? 'Processing...',
          steps: partial.steps ?? existing?.steps ?? [],
          currentStep: partial.currentStep ?? existing?.currentStep,
          startedAt: existing?.startedAt ?? now,
          completedAt: partial.completedAt ?? existing?.completedAt,
          error: partial.error ?? existing?.error,
          originPage: partial.originPage ?? existing?.originPage,
          entityName: partial.entityName ?? existing?.entityName,
          plugin: partial.plugin ?? existing?.plugin ?? 'my-plugin' // TODO: Change to your plugin slug,
          messages: partial.message && partial.message !== existing?.message
            ? [...(existing?.messages || []).slice(-19), partial.message]
            : existing?.messages || [],
        }

        const jobs = { ...state.jobs, [partial.jobId]: merged }
        return { jobs: capJobs(jobs) }
      }),

      updateStep: (jobId, step) => set((state) => {
        const job = state.jobs[jobId]
        if (!job) return state

        const steps = job.steps.map((s) =>
          s.stepId === step.stepId ? { ...s, ...step } : s
        )
        if (!steps.find((s) => s.stepId === step.stepId)) {
          steps.push(step)
        }

        return {
          jobs: {
            ...state.jobs,
            [jobId]: { ...job, steps, currentStep: step.status === 'running' ? step.stepId : job.currentStep },
          },
        }
      }),

      completeJob: (jobId) => set((state) => {
        const job = state.jobs[jobId]
        if (!job) return state

        return {
          jobs: {
            ...state.jobs,
            [jobId]: {
              ...job,
              stage: 'complete',
              progress: 100,
              message: 'Complete',
              completedAt: Date.now(),
            },
          },
        }
      }),

      failJob: (jobId, error) => set((state) => {
        const job = state.jobs[jobId]
        if (!job) return state

        return {
          jobs: {
            ...state.jobs,
            [jobId]: {
              ...job,
              stage: 'error',
              progress: 0,
              message: error,
              error,
              completedAt: Date.now(),
            },
          },
        }
      }),

      removeJob: (jobId) => set((state) => {
        const { [jobId]: _, ...rest } = state.jobs
        return { jobs: rest }
      }),

      clearCompleted: () => set((state) => {
        const active: Record<string, TrackedJob> = {}
        for (const [id, job] of Object.entries(state.jobs)) {
          if (!job.completedAt) {
            active[id] = job
          }
        }
        return { jobs: active }
      }),

      setExpanded: (v) => set({ isExpanded: v }),
      setMinimized: (v) => set({ isMinimized: v }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setDockExpanded: (v) => set({ isDockExpanded: v }),

      hydrateFromAPI: async (apiUrl, token) => {
        try {
          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }

          const [runningRes, queuedRes] = await Promise.all([
            fetch(`${apiUrl}/my-plugin/api/operations /* TODO: Change to your plugin API path */?status=processing`, { headers }),
            fetch(`${apiUrl}/my-plugin/api/operations /* TODO: Change to your plugin API path */?status=queued`, { headers }),
          ])

          const parseOps = async (res: Response) => {
            if (!res.ok) {
              console.warn(`[ProgressCommandCenter] Operations API returned ${res.status} ${res.statusText} for ${res.url}`)
              return []
            }
            const json = await res.json()
            return (json.data || []) as Array<{
              id: string
              project_id: string
              job_type: string
              status: string
              progress?: number
              stage?: string
              message?: string
              chapter_number?: number
              beat_number?: number
              created_at?: string
            }>
          }

          const [running, queued] = await Promise.all([
            parseOps(runningRes),
            parseOps(queuedRes),
          ])

          const serverJobs: Record<string, TrackedJob> = {}
          for (const op of [...running, ...queued]) {
            serverJobs[op.id] = {
              jobId: op.id,
              projectId: op.project_id || null,
              jobType: op.job_type,
              jobLabel: getJobLabel(op.job_type),
              stage: op.stage || op.status || 'processing',
              progress: Math.min(op.progress ?? 0, 95),
              message: op.message || 'Processing...',
              steps: [],
              startedAt: op.created_at ? new Date(op.created_at).getTime() : Date.now(),
              entityName: deriveEntityName(op.chapter_number, op.beat_number),
              plugin: 'my-plugin' // TODO: Change to your plugin slug,
              messages: [],
            }
          }

          // For any locally-stored active jobs NOT in the server's processing/queued
          // list, check their actual status — they may have completed while WS was down.
          const localActiveNotOnServer: string[] = []
          const currentJobs = get().jobs
          for (const [id, job] of Object.entries(currentJobs)) {
            if (!job.completedAt && !serverJobs[id]) {
              localActiveNotOnServer.push(id)
            }
          }

          // Check each orphaned job's actual status
          for (const jobId of localActiveNotOnServer) {
            try {
              const statusRes = await fetch(`${apiUrl}/my-plugin/api/generation/status /* TODO *//${jobId}`, { headers })
              if (statusRes.ok) {
                const statusData = await statusRes.json()
                const s = statusData.data ?? statusData
                if (s.status === 'completed') {
                  serverJobs[jobId] = {
                    ...currentJobs[jobId],
                    jobId,
                    stage: 'complete',
                    progress: 100,
                    message: 'Complete',
                    completedAt: Date.now(),
                    plugin: 'my-plugin' // TODO: Change to your plugin slug,
                    steps: [],
                  } as TrackedJob
                } else if (s.status === 'failed' || s.status === 'cancelled') {
                  serverJobs[jobId] = {
                    ...currentJobs[jobId],
                    jobId,
                    stage: 'error',
                    progress: 0,
                    message: s.error_message || s.error || 'Job failed',
                    error: s.error_message || s.error || 'Job failed',
                    completedAt: Date.now(),
                    plugin: 'my-plugin' // TODO: Change to your plugin slug,
                    steps: [],
                  } as TrackedJob
                }
              } else if (statusRes.status === 404) {
                // Job doesn't exist on server — mark for removal
                serverJobs[jobId] = {
                  ...currentJobs[jobId],
                  jobId,
                  stage: 'error',
                  progress: 0,
                  message: 'Job not found on server',
                  error: 'Job not found on server',
                  completedAt: Date.now(),
                  plugin: 'my-plugin' // TODO: Change to your plugin slug,
                  steps: [],
                } as TrackedJob
              }
            } catch { /* individual status check failure is non-critical */ }
          }

          set((state) => {
            const merged = { ...state.jobs }

            for (const [id, job] of Object.entries(serverJobs)) {
              merged[id] = { ...merged[id], ...job }
            }

            // Remove any remaining orphaned jobs older than 5 minutes
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
            for (const [id, job] of Object.entries(merged)) {
              if (!serverJobs[id] && !job.completedAt && job.startedAt < fiveMinutesAgo) {
                delete merged[id]
              }
            }

            return { jobs: capJobs(merged) }
          })
        } catch (err) {
          console.error(
            '[ProgressCommandCenter] API hydration FAILED — job state may be stale.\n' +
            'What failed: Fetching /my-plugin/api/operations /* TODO: Change to your plugin API path */?status=processing|queued\n' +
            `Why: ${err instanceof Error ? err.message : String(err)}\n` +
            'How to fix:\n' +
            '  1. Check auth token: localStorage.getItem("dashboard_token")\n' +
            '  2. Test manually: curl -H "Authorization: Bearer TOKEN" https://api.adverant.ai/my-plugin/api/operations /* TODO: Change to your plugin API path */?status=processing\n' +
            '  3. Check CORS: api.adverant.ai must allow your plugin origin'
          )
        }
      },

      getActiveJobs: () => {
        const { jobs } = get()
        return Object.values(jobs)
          .filter((j) => !j.completedAt)
          .sort((a, b) => b.startedAt - a.startedAt)
      },

      getActiveCount: () => {
        const { jobs } = get()
        return Object.values(jobs).filter((j) => !j.completedAt).length
      },

      getJobsForProject: (projectId) => {
        const { jobs } = get()
        return Object.values(jobs)
          .filter((j) => j.projectId === projectId)
          .sort((a, b) => b.startedAt - a.startedAt)
      },
    }),
    {
      name: 'nexus-progress-jobs',
      version: 1,
      partialize: (state) => ({
        jobs: Object.fromEntries(
          Object.entries(state.jobs).map(([id, job]) => [
            id,
            {
              jobId: job.jobId,
              projectId: job.projectId,
              projectName: job.projectName,
              jobType: job.jobType,
              jobLabel: job.jobLabel,
              stage: job.stage,
              progress: job.progress,
              message: job.message,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
              error: job.error,
              originPage: job.originPage,
              entityName: job.entityName,
              plugin: job.plugin,
              steps: [],
              messages: job.messages ?? [],
            } satisfies TrackedJob,
          ])
        ),
        isMinimized: state.isMinimized,
        displayMode: state.displayMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return

        const now = Date.now()
        const cleaned: Record<string, TrackedJob> = {}
        for (const [id, job] of Object.entries(state.jobs)) {
          if (now - job.startedAt < TWENTY_FOUR_HOURS) {
            cleaned[id] = job
          }
        }
        state.jobs = capJobs(cleaned)
      },
    }
  )
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset subscription flag for testing */
export function __resetProgressSubscriptionForTesting(): void {
  _subscriptionInitialized = false
}

function capJobs(jobs: Record<string, TrackedJob>): Record<string, TrackedJob> {
  const entries = Object.entries(jobs)
  if (entries.length <= MAX_JOBS) return jobs

  const sorted = entries.sort(([, a], [, b]) => b.startedAt - a.startedAt)
  return Object.fromEntries(sorted.slice(0, MAX_JOBS))
}

// ---------------------------------------------------------------------------
// dispatchJob — call at job dispatch time so the Progress Center shows it
// immediately (before the first WebSocket message arrives).
// ---------------------------------------------------------------------------

export function dispatchJob(opts: {
  jobId: string
  projectId?: string | null
  jobType: string
  jobLabel?: string
  entityName?: string
  originPage?: string
}) {
  useProgressCommandCenterStore.getState().upsertJob({
    jobId: opts.jobId,
    projectId: opts.projectId ?? null,
    jobType: opts.jobType,
    jobLabel: opts.jobLabel,
    entityName: opts.entityName,
    originPage: opts.originPage,
    stage: 'queued',
    progress: 0,
    message: 'Starting...',
    plugin: 'my-plugin' // TODO: Change to your plugin slug,
  })
}

// ---------------------------------------------------------------------------
// WS Store Subscription — reactive bridge
// ---------------------------------------------------------------------------

let _subscriptionInitialized = false

export function initProgressSubscription(): () => void {
  if (_subscriptionInitialized) return () => {}
  _subscriptionInitialized = true

  const unsubscribe = usePluginWSStore.subscribe(
    (state, prevState) => {
      const currentJobs = state.activeJobs
      const prevJobs = prevState.activeJobs

      if (currentJobs === prevJobs) return

      const store = useProgressCommandCenterStore.getState()

      for (const [jobId, wsJob] of Object.entries(currentJobs)) {
        const prevWsJob = prevJobs[jobId]

        if (prevWsJob && prevWsJob.stage === wsJob.stage && prevWsJob.progress === wsJob.progress) {
          continue
        }

        // Validate progress is a finite number (guard against NaN from malformed WS messages)
        const progress = Number.isFinite(wsJob.progress) ? wsJob.progress : 0

        if (wsJob.completedAt && wsJob.stage === 'complete') {
          store.completeJob(jobId)
        } else if (wsJob.completedAt && wsJob.stage === 'error') {
          store.failJob(jobId, wsJob.error || 'Unknown error')
        } else {
          store.upsertJob({
            jobId,
            projectId: wsJob.projectId,
            jobType: wsJob.jobType,
            jobLabel: wsJob.jobType ? getJobLabel(wsJob.jobType) : undefined,
            stage: wsJob.stage,
            progress,
            message: typeof wsJob.message === 'string' ? wsJob.message.slice(0, 500) : 'Processing...',
            entityName: wsJob.entityName || deriveEntityName(wsJob.chapterNumber, wsJob.beatNumber),
            projectName: wsJob.projectName,
            // Sprint 3: Forward step-level data
            ...(wsJob.steps ? {
              steps: wsJob.steps.map(s => ({
                stepId: s.stepId,
                label: s.label,
                status: s.status,
              })),
            } : {}),
            ...(wsJob.currentStep ? { currentStep: wsJob.currentStep } : {}),
          })
        }
      }
    }
  )

  return () => {
    unsubscribe()
    _subscriptionInitialized = false
  }
}
