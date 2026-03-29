// ============================================================================
// WebSocket Types — shared across plugin progress tracking
// ============================================================================

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface GenerationProgress {
  jobId: string
  projectId: string
  chapterNumber?: number
  beatNumber?: number
  jobType?: string
  stage: string
  progress: number
  message: string
  steps?: Array<{
    stepId: string
    label: string
    status: 'pending' | 'running' | 'completed' | 'failed'
  }>
  currentStep?: string
  entityName?: string
  projectName?: string
}

export interface GenerationComplete {
  jobId: string
  projectId: string
  chapterNumber?: number
  beatNumber?: number
  jobType?: string
  result: {
    content: string
    word_count: number
    metadata?: Record<string, unknown>
  }
}

export interface GenerationError {
  jobId: string
  projectId: string
  chapterNumber?: number
  beatNumber?: number
  jobType?: string
  error: string
}

export interface WSIncomingMessage {
  type: 'connection_established' | 'generation_started' | 'generation_progress' |
        'generation_complete' | 'generation_error' | 'error'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
}

export interface RoomMessage {
  id: string
  room_id: string
  sender_type: string
  sender_name: string
  persona_id?: string
  content: string
  message_type: string
  metadata?: Record<string, unknown>
  created_at: string
}
