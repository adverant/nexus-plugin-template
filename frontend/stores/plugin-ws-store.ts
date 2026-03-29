'use client'

import { create } from 'zustand'
import type {
  WSConnectionStatus,
  GenerationProgress,
  GenerationComplete,
  GenerationError,
} from '@/types/plugin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveJob {
  jobId: string
  projectId: string
  chapterNumber?: number
  beatNumber?: number
  jobType?: string
  stage: string
  progress: number
  message: string
  startedAt: number
  completedAt?: number
  result?: GenerationComplete['result']
  error?: string
  steps?: Array<{
    stepId: string
    label: string
    status: 'pending' | 'running' | 'completed' | 'failed'
  }>
  currentStep?: string
  entityName?: string
  projectName?: string
}

interface PluginWSState {
  // Connection
  connectionStatus: WSConnectionStatus
  clientId: string | null

  // Active generation jobs
  activeJobs: Record<string, ActiveJob>

  // Actions - Connection
  setConnectionStatus: (status: WSConnectionStatus) => void
  setClientId: (id: string | null) => void

  // Actions - Jobs
  setJobStarted: (jobId: string, projectId: string, chapterNumber?: number, beatNumber?: number) => void
  setJobProgress: (progress: GenerationProgress) => void
  setJobComplete: (complete: GenerationComplete) => void
  setJobError: (error: GenerationError) => void
  removeJob: (jobId: string) => void
  clearCompletedJobs: () => void

  // WS send function (set by PluginWSProvider)
  wsSend: ((data: unknown) => boolean) | null
  setWsSend: (fn: ((data: unknown) => boolean) | null) => void

  // Computed helpers
  getActiveJobsForProject: (projectId: string) => ActiveJob[]
  getJobById: (jobId: string) => ActiveJob | undefined
  hasActiveJobs: () => boolean
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePluginWSStore = create<PluginWSState>()((set, get) => ({
  // Initial state
  connectionStatus: 'disconnected',
  clientId: null,
  activeJobs: {},
  wsSend: null,
  setWsSend: (fn) => set({ wsSend: fn }),

  // Connection actions
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setClientId: (id) => set({ clientId: id }),

  // Job actions
  setJobStarted: (jobId, projectId, chapterNumber, beatNumber) =>
    set((state) => ({
      activeJobs: {
        ...state.activeJobs,
        [jobId]: {
          jobId,
          projectId,
          chapterNumber,
          beatNumber,
          stage: 'starting',
          progress: 0,
          message: 'Generation started...',
          startedAt: Date.now(),
        },
      },
    })),

  setJobProgress: (progress) =>
    set((state) => {
      const existing = state.activeJobs[progress.jobId]

      const base: ActiveJob = existing || {
        jobId: progress.jobId,
        projectId: progress.projectId || '',
        chapterNumber: progress.chapterNumber,
        beatNumber: progress.beatNumber,
        jobType: progress.jobType,
        stage: 'starting',
        progress: 0,
        message: 'Processing...',
        startedAt: Date.now(),
      }

      return {
        activeJobs: {
          ...state.activeJobs,
          [progress.jobId]: {
            ...base,
            stage: progress.stage,
            progress: progress.progress,
            message: progress.message,
            jobType: base.jobType || progress.jobType,
            steps: progress.steps ?? base.steps,
            currentStep: progress.currentStep ?? base.currentStep,
            entityName: progress.entityName ?? base.entityName,
            projectName: progress.projectName ?? base.projectName,
          },
        },
      }
    }),

  setJobComplete: (complete) =>
    set((state) => {
      const existing = state.activeJobs[complete.jobId]

      const base: ActiveJob = existing || {
        jobId: complete.jobId,
        projectId: complete.projectId || '',
        chapterNumber: complete.chapterNumber,
        beatNumber: complete.beatNumber,
        jobType: complete.jobType,
        stage: 'starting',
        progress: 0,
        message: 'Processing...',
        startedAt: Date.now(),
      }

      return {
        activeJobs: {
          ...state.activeJobs,
          [complete.jobId]: {
            ...base,
            stage: 'complete',
            progress: 100,
            message: 'Generation complete',
            completedAt: Date.now(),
            result: complete.result,
            jobType: base.jobType || complete.jobType,
          },
        },
      }
    }),

  setJobError: (error) =>
    set((state) => {
      const existing = state.activeJobs[error.jobId]

      const base: ActiveJob = existing || {
        jobId: error.jobId,
        projectId: error.projectId || '',
        chapterNumber: error.chapterNumber,
        beatNumber: error.beatNumber,
        jobType: error.jobType,
        stage: 'starting',
        progress: 0,
        message: 'Processing...',
        startedAt: Date.now(),
      }

      return {
        activeJobs: {
          ...state.activeJobs,
          [error.jobId]: {
            ...base,
            stage: 'error',
            progress: 0,
            message: error.error,
            completedAt: Date.now(),
            error: error.error,
            jobType: base.jobType || error.jobType,
          },
        },
      }
    }),

  removeJob: (jobId) =>
    set((state) => {
      const { [jobId]: _, ...rest } = state.activeJobs
      return { activeJobs: rest }
    }),

  clearCompletedJobs: () =>
    set((state) => {
      const active: Record<string, ActiveJob> = {}
      for (const [id, job] of Object.entries(state.activeJobs)) {
        if (!job.completedAt) {
          active[id] = job
        }
      }
      return { activeJobs: active }
    }),

  // Computed helpers
  getActiveJobsForProject: (projectId) => {
    const { activeJobs } = get()
    return Object.values(activeJobs).filter(
      (job) => job.projectId === projectId
    )
  },

  getJobById: (jobId) => get().activeJobs[jobId],

  hasActiveJobs: () => {
    const { activeJobs } = get()
    return Object.values(activeJobs).some((job) => !job.completedAt)
  },
}))
