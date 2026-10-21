import type { AttendanceRecordCore } from './attendance.js';
import { evaluateBoardingWindow } from './boarding-window.js';

export interface BoardingCutoffTripContext {
  trip_id: string;
  scheduled_departure_utc: string;
  actual_departure_utc?: string | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface BoardingCutoffResult {
  trip_id: string;
  windowClosed: boolean;
  totalEvaluated: number;
  markedAbsentCount: number;
  unchangedCount: number;
  updatedRecords: AttendanceRecordCore[];
}

/**
 * Evaluates passenger records for a trip after the boarding window closes.
 * Specification 18.5 & Section 25 (boarding-cutoff job):
 * Sets ABSENT for remaining EXPECTED records after the cutoff. Idempotent.
 */
export function evaluateBoardingCutoff(
  trip: BoardingCutoffTripContext,
  attendanceRecords: AttendanceRecordCore[],
  nowUtc: string,
): BoardingCutoffResult {
  const windowStatus = evaluateBoardingWindow(
    trip.scheduled_departure_utc,
    nowUtc,
    trip.actual_departure_utc,
  );

  // If boarding window is still open or hasn't opened yet, do not mark absent
  if (windowStatus.isOpen || windowStatus.code === 'BEFORE_WINDOW') {
    return {
      trip_id: trip.trip_id,
      windowClosed: false,
      totalEvaluated: attendanceRecords.length,
      markedAbsentCount: 0,
      unchangedCount: attendanceRecords.length,
      updatedRecords: [],
    };
  }

  // Boarding window is officially closed (AFTER_WINDOW)
  const updatedRecords: AttendanceRecordCore[] = [];
  let markedAbsentCount = 0;
  let unchangedCount = 0;

  for (const record of attendanceRecords) {
    if (record.status === 'EXPECTED') {
      // Transition EXPECTED -> ABSENT
      updatedRecords.push({
        ...record,
        status: 'ABSENT',
      });
      markedAbsentCount++;
    } else {
      // BOARDED, LATE_BOARDED, ON_LEAVE, or already ABSENT are unchanged (idempotent)
      unchangedCount++;
    }
  }

  return {
    trip_id: trip.trip_id,
    windowClosed: true,
    totalEvaluated: attendanceRecords.length,
    markedAbsentCount,
    unchangedCount,
    updatedRecords,
  };
}
