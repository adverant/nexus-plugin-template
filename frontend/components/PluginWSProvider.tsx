'use client'

/**
 * PluginWSProvider
 *
 * Wraps the useWebSocket hook with plugin-specific message routing.
 * Routes incoming WebSocket messages to the plugin-ws-store by type.
 *
 * TODO: Mount this in your plugin layout to enable real-time job progress.
 */

import { useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { usePluginWSStore } from '@/stores/plugin-ws-store'
import { useAuthToken } from '@/stores/dashboard-store'
import { useProgressCommandCenterStore, getJobLabel } from '@/stores/progress-command-center-store'
import type { WSIncomingMessage } from '@/types/plugin'

function getWSUrl(): string | null {
  if (typeof window === 'undefined') return null

  // TODO: Change to your plugin's API URL environment variable
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return null

  try {
    const url = new URL(apiUrl)
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    // TODO: Change '/my-plugin/ws' to your plugin's WebSocket path
    return `${wsProtocol}//${url.host}/my-plugin/ws`
  } catch {
    return null
  }
}

export function PluginWSProvider({ children }: { children: React.ReactNode }) {
  const wsUrl = getWSUrl()
  const token = useAuthToken()
  const hasAuthenticatedRef = useRef(false)

  const setConnectionStatus = usePluginWSStore((s) => s.setConnectionStatus)
  const setClientId = usePluginWSStore((s) => s.setClientId)
  const setJobStarted = usePluginWSStore((s) => s.setJobStarted)
  const setJobProgress = usePluginWSStore((s) => s.setJobProgress)
  const setJobComplete = usePluginWSStore((s) => s.setJobComplete)
  const setJobError = usePluginWSStore((s) => s.setJobError)
  const setWsSend = usePluginWSStore((s) => s.setWsSend)

  const handleMessage = useCallback((data: unknown) => {
    const message = data as WSIncomingMessage
    if (!message?.type) return

    switch (message.type) {
      case 'connection_established':
        setClientId(message.payload?.client_id || null)
        break

      case 'generation_started':
        setJobStarted(
          message.payload.job_id || `ws_${Date.now()}`,
          message.payload.project_id,
          message.payload.chapter_number,
          message.payload.beat_number,
        )
        break

      case 'generation_progress': {
        const progressJobId = message.payload.job_id || message.payload.project_id
        const rawProgress = message.payload.progress?.progress ?? message.payload.progress ?? 0
        const normalizedProgress = typeof rawProgress === 'number' && rawProgress <= 1 && rawProgress > 0
          ? Math.round(rawProgress * 100)
          : rawProgress
        const progressStage = message.payload.progress?.stage || message.payload.stage || 'processing'
        const progressMsg = message.payload.progress?.message || message.payload.message || 'Processing...'

        setJobProgress({
          jobId: progressJobId,
          projectId: message.payload.project_id,
          chapterNumber: message.payload.chapter_number,
          beatNumber: message.payload.beat_number,
          jobType: message.payload.job_type,
          stage: progressStage,
          progress: normalizedProgress,
          message: progressMsg,
          steps: message.payload.steps,
          currentStep: message.payload.currentStep ?? message.payload.current_step,
          entityName: message.payload.entityName ?? message.payload.entity_name,
          projectName: message.payload.projectName ?? message.payload.project_name,
        })
        // Direct PCC update — bypass cross-store subscription
        useProgressCommandCenterStore.getState().upsertJob({
          jobId: progressJobId,
          projectId: message.payload.project_id,
          jobType: message.payload.job_type,
          jobLabel: message.payload.job_type ? getJobLabel(message.payload.job_type) : undefined,
          stage: progressStage,
          progress: typeof normalizedProgress === 'number' ? normalizedProgress : 0,
          message: typeof progressMsg === 'string' ? progressMsg.slice(0, 500) : 'Processing...',
          entityName: message.payload.entityName ?? message.payload.entity_name,
          projectName: message.payload.projectName ?? message.payload.project_name,
        })
        break
      }

      case 'generation_complete': {
        const completeJobId = message.payload.job_id || message.payload.project_id
        setJobComplete({
          jobId: completeJobId,
          projectId: message.payload.project_id,
          chapterNumber: message.payload.chapter_number,
          beatNumber: message.payload.beat_number,
          jobType: message.payload.job_type,
          result: message.payload.result || {
            content: '',
            word_count: 0,
          },
        })
        // Direct PCC update — guaranteed to work regardless of subscription state
        useProgressCommandCenterStore.getState().completeJob(completeJobId)
        break
      }

      case 'generation_error': {
        const errorJobId = message.payload.job_id || message.payload.project_id
        setJobError({
          jobId: errorJobId,
          projectId: message.payload.project_id,
          chapterNumber: message.payload.chapter_number,
          beatNumber: message.payload.beat_number,
          jobType: message.payload.job_type,
          error: message.payload.error || 'Unknown generation error',
        })
        // Direct PCC update — guaranteed to work regardless of subscription state
        useProgressCommandCenterStore.getState().failJob(errorJobId, message.payload.error || 'Unknown generation error')
        break
      }

      case 'error':
        console.error('[PluginWS] Server error:', message.payload?.message)
        break

      default:
        break
    }
  }, [setClientId, setJobStarted, setJobProgress, setJobComplete, setJobError])

  const handleOpen = useCallback(() => {
    setConnectionStatus('connected')
    hasAuthenticatedRef.current = false
  }, [setConnectionStatus])

  const handleClose = useCallback(() => {
    setConnectionStatus('disconnected')
    setClientId(null)
    hasAuthenticatedRef.current = false
  }, [setConnectionStatus, setClientId])

  const handleError = useCallback(() => {
    setConnectionStatus('disconnected')
  }, [setConnectionStatus])

  const { sendMessage, isConnected } = useWebSocket(wsUrl, {
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
    onMessage: handleMessage,
    reconnectAttempts: 10,
    reconnectInterval: 5000,
  })

  // Expose sendMessage to Zustand store
  useEffect(() => {
    if (isConnected) {
      setWsSend(sendMessage)
    } else {
      setWsSend(null)
    }
    return () => setWsSend(null)
  }, [isConnected, sendMessage, setWsSend])

  // Send auth token after connection
  useEffect(() => {
    if (isConnected && token && !hasAuthenticatedRef.current) {
      sendMessage({ type: 'auth', payload: { token } })
      hasAuthenticatedRef.current = true
    }
  }, [isConnected, token, sendMessage])

  // Update connecting status
  useEffect(() => {
    if (wsUrl) {
      setConnectionStatus('connecting')
    }
  }, [wsUrl, setConnectionStatus])

  return <>{children}</>
}
