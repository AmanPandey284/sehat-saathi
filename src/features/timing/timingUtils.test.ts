import { describe, it, expect } from 'vitest';
import {
  calculateDurationMs,
  calculateWorkflowDurations,
  updateWorkflowTimestamps,
} from './timingUtils';
import type { WorkflowTimestamps } from './timingTypes';
import type { StoredPatientRecord } from '../doctor/patientRecords';

describe('timingUtils', () => {
  describe('calculateDurationMs', () => {
    it('calculates duration correctly for valid timestamps', () => {
      const start = '2026-09-20T10:00:00.000Z';
      const end = '2026-09-20T10:05:30.500Z';
      // 5 minutes and 30.5 seconds = 330,500 ms
      expect(calculateDurationMs(start, end)).toBe(330500);
    });

    it('returns 0 when start and end are identical', () => {
      const timestamp = '2026-09-20T10:00:00.000Z';
      expect(calculateDurationMs(timestamp, timestamp)).toBe(0);
    });

    it('returns undefined when startTime is missing or undefined', () => {
      expect(calculateDurationMs(undefined, '2026-09-20T10:05:00.000Z')).toBeUndefined();
      expect(calculateDurationMs(null, '2026-09-20T10:05:00.000Z')).toBeUndefined();
      expect(calculateDurationMs('', '2026-09-20T10:05:00.000Z')).toBeUndefined();
    });

    it('returns undefined when endTime is missing or undefined', () => {
      expect(calculateDurationMs('2026-09-20T10:00:00.000Z', undefined)).toBeUndefined();
      expect(calculateDurationMs('2026-09-20T10:00:00.000Z', null)).toBeUndefined();
      expect(calculateDurationMs('2026-09-20T10:00:00.000Z', '')).toBeUndefined();
    });

    it('returns undefined when both timestamps are missing', () => {
      expect(calculateDurationMs(undefined, undefined)).toBeUndefined();
      expect(calculateDurationMs(null, null)).toBeUndefined();
    });

    it('returns undefined when timestamps are invalid date strings', () => {
      expect(calculateDurationMs('invalid-date', '2026-09-20T10:00:00.000Z')).toBeUndefined();
      expect(calculateDurationMs('2026-09-20T10:00:00.000Z', 'not-a-date')).toBeUndefined();
      expect(calculateDurationMs('foo', 'bar')).toBeUndefined();
    });

    it('returns undefined when end time is earlier than start time (negative duration)', () => {
      const start = '2026-09-20T10:10:00.000Z';
      const end = '2026-09-20T10:05:00.000Z';
      expect(calculateDurationMs(start, end)).toBeUndefined();
    });
  });

  describe('calculateWorkflowDurations', () => {
    it('calculates all 5 touchpoint durations when all timestamps are present', () => {
      const timestamps: WorkflowTimestamps = {
        intakeStartedAt: '2026-09-20T08:00:00.000Z',
        intakeCompletedAt: '2026-09-20T08:06:00.000Z', // 6m = 360,000 ms

        documentProcessingStartedAt: '2026-09-20T08:02:00.000Z',
        documentProcessingCompletedAt: '2026-09-20T08:02:15.000Z', // 15s = 15,000 ms

        patientReviewStartedAt: '2026-09-20T08:04:00.000Z',
        patientReviewCompletedAt: '2026-09-20T08:05:30.000Z', // 1m30s = 90,000 ms

        physicianReviewStartedAt: '2026-09-20T08:30:00.000Z',
        physicianReviewCompletedAt: '2026-09-20T08:33:00.000Z', // 3m = 180,000 ms

        whatChangedStartedAt: '2026-09-20T08:01:00.000Z',
        whatChangedCompletedAt: '2026-09-20T08:02:30.000Z', // 1m30s = 90,000 ms
      };

      const durations = calculateWorkflowDurations(timestamps);

      expect(durations).toEqual({
        intakeDurationMs: 360000,
        documentProcessingDurationMs: 15000,
        patientReviewDurationMs: 90000,
        physicianReviewDurationMs: 180000,
        whatChangedDurationMs: 90000,
      });
    });

    it('handles partially completed workflows gracefully', () => {
      const timestamps: WorkflowTimestamps = {
        intakeStartedAt: '2026-09-20T08:00:00.000Z',
        // intake not completed yet
        patientReviewStartedAt: '2026-09-20T08:04:00.000Z',
        patientReviewCompletedAt: '2026-09-20T08:05:00.000Z',
      };

      const durations = calculateWorkflowDurations(timestamps);

      expect(durations.intakeDurationMs).toBeUndefined();
      expect(durations.documentProcessingDurationMs).toBeUndefined();
      expect(durations.patientReviewDurationMs).toBe(60000);
      expect(durations.physicianReviewDurationMs).toBeUndefined();
      expect(durations.whatChangedDurationMs).toBeUndefined();
    });

    it('returns empty object when timestamps is null or undefined', () => {
      expect(calculateWorkflowDurations(null)).toEqual({});
      expect(calculateWorkflowDurations(undefined)).toEqual({});
    });

    it('returns empty durations when timestamps is empty object', () => {
      const durations = calculateWorkflowDurations({});
      expect(durations).toEqual({
        intakeDurationMs: undefined,
        documentProcessingDurationMs: undefined,
        patientReviewDurationMs: undefined,
        physicianReviewDurationMs: undefined,
        whatChangedDurationMs: undefined,
      });
    });

    it('handles legacy patient records without timing data safely', () => {
      const legacyRecord: Partial<StoredPatientRecord> = {
        id: 'DEMO-LEGACY-001',
        submittedAt: '2026-09-15T12:00:00.000Z',
        reviewStatus: 'pending',
        // Note: no timestamps or durations field exists in legacy records
      };

      // Ensure calling calculateWorkflowDurations on legacy record timestamps does not throw
      const durations = calculateWorkflowDurations(legacyRecord.timestamps);
      expect(durations).toEqual({});
      expect(durations.intakeDurationMs).toBeUndefined();
      expect(durations.physicianReviewDurationMs).toBeUndefined();
    });

    it('handles legacy patient record with empty timestamps field', () => {
      const legacyRecord: Partial<StoredPatientRecord> = {
        id: 'DEMO-LEGACY-002',
        submittedAt: '2026-09-15T12:00:00.000Z',
        timestamps: {},
      };

      const durations = calculateWorkflowDurations(legacyRecord.timestamps);
      expect(durations.intakeDurationMs).toBeUndefined();
      expect(durations.documentProcessingDurationMs).toBeUndefined();
    });
  });

  describe('updateWorkflowTimestamps', () => {
    it('creates new object when current is undefined', () => {
      const patch = { intakeStartedAt: '2026-09-20T10:00:00.000Z' };
      const result = updateWorkflowTimestamps(undefined, patch);
      expect(result).toEqual({ intakeStartedAt: '2026-09-20T10:00:00.000Z' });
    });

    it('merges new timestamp patch into existing timestamps', () => {
      const current: WorkflowTimestamps = {
        intakeStartedAt: '2026-09-20T10:00:00.000Z',
      };
      const patch = {
        intakeCompletedAt: '2026-09-20T10:05:00.000Z',
        patientReviewStartedAt: '2026-09-20T10:04:00.000Z',
      };
      const result = updateWorkflowTimestamps(current, patch);
      expect(result).toEqual({
        intakeStartedAt: '2026-09-20T10:00:00.000Z',
        intakeCompletedAt: '2026-09-20T10:05:00.000Z',
        patientReviewStartedAt: '2026-09-20T10:04:00.000Z',
      });
    });
  });
});
