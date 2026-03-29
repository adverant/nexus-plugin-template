'use client'

/**
 * ProgressStepList
 *
 * Step-by-step workflow visualization for a single tracked job.
 * Renders nothing when the steps array is empty (Sprint 3 populates steps).
 *
 * ✓ Gathering project context
 * ✓ Analyzing characters
 * ● Building narrative structure    ← running
 *   "Analyzing Elena's character arc..."
 * ○ Applying writing style
 * ○ Finalizing blueprint
 */

import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import type { WorkflowStep } from '@/stores/progress-command-center-store'
import { useTheme } from '@/stores/theme-store'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProgressStepListProps {
  /** The ordered list of workflow steps for this job */
  steps: WorkflowStep[]
  /** The stepId of the currently running step, if any */
  currentStep?: string
}

// ---------------------------------------------------------------------------
// Sub-component: a single step row
// ---------------------------------------------------------------------------

interface StepRowProps {
  step: WorkflowStep
  isLast: boolean
  isDark: boolean
}

function StepRow({ step, isLast, isDark }: StepRowProps) {
  const isRunning = step.status === 'running'
  const isCompleted = step.status === 'completed'
  const isFailed = step.status === 'failed'
  // isPending is the implicit else branch (status === 'pending') — no variable needed

  // ---------------------------------------------------------------------------
  // Icon selection
  // ---------------------------------------------------------------------------

  const icon = (() => {
    if (isCompleted) {
      return (
        <CheckCircle2
          className={`w-4 h-4 shrink-0 ${isDark ? 'text-green-400' : 'text-green-500'}`}
        />
      )
    }
    if (isFailed) {
      return (
        <XCircle
          className={`w-4 h-4 shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`}
        />
      )
    }
    if (isRunning) {
      // Animated dot for running state
      return (
        <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-60 ${
              isDark ? 'bg-[#c2a8dc]' : 'bg-[#7a5c9c]'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isDark ? 'bg-[#c2a8dc]' : 'bg-[#7a5c9c]'
            }`}
          />
        </span>
      )
    }
    // Pending
    return (
      <Circle
        className={`w-4 h-4 shrink-0 ${
          isDark ? 'text-[#c2a8dc]/40' : 'text-[#c2a8dc]'
        }`}
      />
    )
  })()

  // ---------------------------------------------------------------------------
  // Label color
  // ---------------------------------------------------------------------------

  const labelClass = (() => {
    if (isCompleted) return isDark ? 'text-[#c2a8dc]/60' : 'text-[#654b84]'
    if (isFailed)   return isDark ? 'text-red-400' : 'text-red-600'
    if (isRunning)  return isDark ? 'text-white font-medium' : 'text-neutral-900 font-medium'
    // Pending
    return isDark ? 'text-[#c2a8dc]/40' : 'text-[#c2a8dc]'
  })()

  return (
    <div className="flex gap-2">
      {/* Left column: icon + optional connector line */}
      <div className="flex flex-col items-center">
        {/* Icon */}
        <div className="flex items-center justify-center h-6 w-4">
          {icon}
        </div>
        {/* Connector line — shown for all steps except the last */}
        {!isLast && (
          <div
            className={`w-px flex-1 mt-0.5 min-h-[8px] ${
              isCompleted
                ? isDark ? 'bg-green-500/40' : 'bg-green-300/60'
                : isDark
                ? 'bg-[#8B6BAE]/20'
                : 'bg-[#c2a8dc]/30'
            }`}
          />
        )}
      </div>

      {/* Right column: label + optional detail */}
      <div className={`${isLast ? 'pb-0' : 'pb-1.5'} min-w-0`}>
        {/* Step label */}
        <p className={`text-xs leading-6 truncate ${labelClass}`}>
          {step.label}
        </p>

        {/* Detail text — only shown for the running step when detail is present */}
        {isRunning && step.detail && (
          <p
            className={`text-[11px] leading-4 mt-0.5 mb-1 ${
              isDark ? 'text-[#c2a8dc]/50' : 'text-neutral-400'
            }`}
          >
            {step.detail}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProgressStepList({ steps, currentStep: _currentStep }: ProgressStepListProps) {
  const { isDark } = useTheme()

  // Sprint 3 will populate steps; until then render nothing
  if (steps.length === 0) return null

  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => (
        <StepRow
          key={step.stepId}
          step={step}
          isLast={idx === steps.length - 1}
          isDark={isDark}
        />
      ))}
    </div>
  )
}
