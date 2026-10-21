import type { AttendanceStatus } from './attendance.js';

export interface AttendanceTransitionResult {
  allowed: boolean;
  code?: 'INVALID_TRANSITION' | 'HARD_DELETE_PROHIBITED' | 'REASON_REQUIRED' | 'ALREADY_TERMINAL';
  message?: string;
  from: AttendanceStatus;
  to: AttendanceStatus;
}

const VALID_ATTENDANCE_TRANSITIONS: Record<AttendanceStatus, AttendanceStatus[]> = {
  EXPECTED: ['BOARDED', 'LATE_BOARDED', 'ON_LEAVE', 'ABSENT'],
  ON_LEAVE: ['EXPECTED'],
  ABSENT: ['LATE_BOARDED'], // If a student arrives late after cutoff, manual coordinator check-in
  BOARDED: [],              // Terminal unless corrected by authorized admin with audit log
  LATE_BOARDED: [],         // Terminal unless corrected by authorized admin with audit log
};

/**
 * Validates state transition for attendance records.
 * Specification 18.4:
 * Records are NEVER deleted.
 * Normal transitions:
 * - EXPECTED -> BOARDED (normal boarding)
 * - EXPECTED -> LATE_BOARDED (late boarding with mandatory reason)
 * - EXPECTED -> ON_LEAVE (leave marked before cutoff)
 * - EXPECTED -> ABSENT (cutoff job)
 * - ON_LEAVE -> EXPECTED (leave cancelled before cutoff)
 * - ABSENT -> LATE_BOARDED (late arrival with coordinator check-in)
 */
export function validateAttendanceTransition(
  currentStatus: AttendanceStatus,
  targetStatus: AttendanceStatus,
  reason?: string | null,
): AttendanceTransitionResult {
  if (currentStatus === targetStatus) {
    return {
      allowed: true,
      from: currentStatus,
      to: targetStatus,
    };
  }

  const allowedTargets = VALID_ATTENDANCE_TRANSITIONS[currentStatus] ?? [];

  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      code: 'INVALID_TRANSITION',
      message: `Invalid attendance transition from ${currentStatus} to ${targetStatus}.`,
      from: currentStatus,
      to: targetStatus,
    };
  }

  // Late boarding transitions strictly require an explanatory reason
  if (targetStatus === 'LATE_BOARDED') {
    if (!reason || reason.trim().length === 0) {
      return {
        allowed: false,
        code: 'REASON_REQUIRED',
        message: 'A non-empty reason is mandatory for LATE_BOARDED attendance records.',
        from: currentStatus,
        to: targetStatus,
      };
    }
  }

  return {
    allowed: true,
    from: currentStatus,
    to: targetStatus,
  };
}

/**
 * Enforces the master plan hard-delete prohibition rule on attendance records.
 * AG-MASTER-1.0-v2 Part C P5-T4: "Records are never deleted."
 */
export function enforceNoAttendanceDeletion(): { allowed: false; code: 'HARD_DELETE_PROHIBITED'; message: string } {
  return {
    allowed: false,
    code: 'HARD_DELETE_PROHIBITED',
    message: 'Attendance records are permanent audit artifacts and cannot be deleted.',
  };
}
