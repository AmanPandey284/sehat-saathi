export interface WorkflowTimestamps {
  /** 1. Patient intake start and completion */
  intakeStartedAt?: string;
  intakeCompletedAt?: string;

  /** 2. Document processing start and completion */
  documentProcessingStartedAt?: string;
  documentProcessingCompletedAt?: string;

  /** 3. Patient review start and completion */
  patientReviewStartedAt?: string;
  patientReviewCompletedAt?: string;

  /** 4. Physician review start and completion */
  physicianReviewStartedAt?: string;
  physicianReviewCompletedAt?: string;

  /** 5. Returning-patient "What Changed?" start and completion */
  whatChangedStartedAt?: string;
  whatChangedCompletedAt?: string;
}

export interface WorkflowDurations {
  intakeDurationMs?: number;
  documentProcessingDurationMs?: number;
  patientReviewDurationMs?: number;
  physicianReviewDurationMs?: number;
  whatChangedDurationMs?: number;
}
