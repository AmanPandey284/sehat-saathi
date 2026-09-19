import type { WorkflowTimestamps, WorkflowDurations } from './timingTypes';

/**
 * Calculates duration in milliseconds between two ISO timestamp strings.
 * Returns undefined if either timestamp is missing, invalid, or if end < start.
 */
export function calculateDurationMs(
  startTime?: string | null,
  endTime?: string | null
): number | undefined {
  if (!startTime || !endTime) return undefined;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return undefined;
  return end - start;
}

/**
 * Calculates all workflow durations in milliseconds from timestamps.
 * Fully compatible with missing timestamps, partial timestamps,
 * and legacy records without timing data.
 */
export function calculateWorkflowDurations(
  timestamps?: WorkflowTimestamps | null
): WorkflowDurations {
  if (!timestamps) return {};
  return {
    intakeDurationMs: calculateDurationMs(
      timestamps.intakeStartedAt,
      timestamps.intakeCompletedAt
    ),
    documentProcessingDurationMs: calculateDurationMs(
      timestamps.documentProcessingStartedAt,
      timestamps.documentProcessingCompletedAt
    ),
    patientReviewDurationMs: calculateDurationMs(
      timestamps.patientReviewStartedAt,
      timestamps.patientReviewCompletedAt
    ),
    physicianReviewDurationMs: calculateDurationMs(
      timestamps.physicianReviewStartedAt,
      timestamps.physicianReviewCompletedAt
    ),
    whatChangedDurationMs: calculateDurationMs(
      timestamps.whatChangedStartedAt,
      timestamps.whatChangedCompletedAt
    ),
  };
}

/**
 * Safely merges timestamp updates into an existing timestamps record.
 */
export function updateWorkflowTimestamps(
  current: WorkflowTimestamps | undefined,
  patch: Partial<WorkflowTimestamps>
): WorkflowTimestamps {
  return {
    ...(current || {}),
    ...patch,
  };
}
