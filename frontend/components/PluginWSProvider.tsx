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
        const rawProgress = message.payload.progress?.progress ?? message.payload.progress ?? 0
        const normalizedProgress = typeof rawProgress === 'number' && rawProgress <= 1 && rawProgress > 0
          ? Math.round(rawProgress * 100)
          : rawProgress

        setJobProgress({
          jobId: message.payload.job_id || message.payload.project_id,
          projectId: message.payload.project_id,
          chapterNumber: message.payload.chapter_number,
          beatNumber: message.payload.beat_number,
          jobType: message.payload.job_type,
          stage: message.payload.progress?.stage || message.payload.stage || 'processing',
          progress: normalizedProgress,
          message: message.payload.progress?.message || message.payload.message || 'Processing...',
          steps: message.payload.steps,
          currentStep: message.payload.currentStep ?? message.payload.current_step,
          entityName: message.payload.entityName ?? message.payload.entity_name,
          projectName: message.payload.projectName ?? message.payload.project_name,
        })
        break
      }

      case 'generation_complete':
        setJobComplete({
          jobId: message.payload.job_id || message.payload.project_id,
          projectId: message.payload.project_id,
          chapterNumber: message.payload.chapter_number,
          beatNumber: message.payload.beat_number,
          jobType: message.payload.job_type,
          result: message.payload.result || {
            content: '',
            word_count: 0,
          },
        })
        break

      case 'generation_error':
        setJobError({
          jobId: message.payload.job_id || message.payload.project_id,
          projectId: message.payload.project_id,
          chapterNumber: message.payload.chapter_number,
          beatNumber: message.payload.beat_number,
          jobType: message.payload.job_type,
          error: message.payload.error || 'Unknown generation error',
        })
        break

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
