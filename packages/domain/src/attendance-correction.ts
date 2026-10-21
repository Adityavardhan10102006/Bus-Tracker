import type { AttendanceStatus, AttendanceRecordCore, FlaggedGuestRecord } from './attendance.js';

export interface AuditRecordPayload {
  entity_type: 'ATTENDANCE' | 'GUEST_PASSENGER';
  entity_id: string;
  action: 'MANUAL_CHECKIN' | 'GUEST_RECORDED' | 'ATTENDANCE_CORRECTED';
  actor_id: string;
  actor_role: string;
  reason: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  recorded_at: string;
}

export interface ManualCheckInInput {
  student_id: string;
  trip_id: string;
  bus_id: string;
  route_id: string;
  service_date: string;
  trip_type: 'MORNING' | 'AFTERNOON';
  current_status: AttendanceStatus;
  reason: string;
  boarded_at_utc: string;
  recorded_by_user_id: string;
  recorded_by_role: string;
  boarding_stop_id: string | null;
  boarding_stop_name: string | null;
}

export interface ManualCheckInResult {
  success: boolean;
  code?: 'PERMISSION_DENIED' | 'REASON_REQUIRED' | 'INVALID_STATUS';
  message?: string;
  record?: AttendanceRecordCore;
  audit?: AuditRecordPayload;
}

/**
 * Validates and records a manual late boarding check-in.
 * Specification 18.3:
 * LATE_BOARDED after the window with an explicit required reason.
 * Authorized for Transport Coordinator (COR), Super Admin (SAD), or Primary Faculty (FAC).
 */
export function executeManualLateBoarding(input: ManualCheckInInput): ManualCheckInResult {
  const allowedRoles = ['COR', 'SAD', 'FAC'];
  if (!allowedRoles.includes(input.recorded_by_role)) {
    return {
      success: false,
      code: 'PERMISSION_DENIED',
      message: `Role ${input.recorded_by_role} is not authorized to perform manual late check-ins.`,
    };
  }

  if (!input.reason || input.reason.trim().length === 0) {
    return {
      success: false,
      code: 'REASON_REQUIRED',
      message: 'A detailed reason is required for manual late check-in.',
    };
  }

  const updatedRecord: AttendanceRecordCore = {
    id: `att-${input.student_id}-${input.trip_id}`,
    student_id: input.student_id,
    trip_id: input.trip_id,
    bus_id: input.bus_id,
    route_id: input.route_id,
    service_date: input.service_date,
    trip_type: input.trip_type,
    status: 'LATE_BOARDED',
    method: 'MANUAL',
    boarded_at: input.boarded_at_utc,
    boarding_stop_id: input.boarding_stop_id,
    boarding_stop_name: input.boarding_stop_name,
  };

  const audit: AuditRecordPayload = {
    entity_type: 'ATTENDANCE',
    entity_id: updatedRecord.id,
    action: 'MANUAL_CHECKIN',
    actor_id: input.recorded_by_user_id,
    actor_role: input.recorded_by_role,
    reason: input.reason.trim(),
    old_value: { status: input.current_status },
    new_value: {
      status: 'LATE_BOARDED',
      method: 'MANUAL',
      boarded_at: input.boarded_at_utc,
    },
    recorded_at: input.boarded_at_utc,
  };

  return {
    success: true,
    record: updatedRecord,
    audit,
  };
}

export interface FlaggedGuestInput {
  trip_id: string;
  bus_id: string;
  service_date: string;
  guest_name: string;
  guest_phone: string;
  reason: string;
  recorded_by_user_id: string;
  recorded_by_role: string;
  recorded_at_utc: string;
}

export interface FlaggedGuestResult {
  success: boolean;
  code?: 'PERMISSION_DENIED' | 'REASON_REQUIRED' | 'INVALID_GUEST_DATA';
  message?: string;
  guestRecord?: FlaggedGuestRecord;
  audit?: AuditRecordPayload;
}

/**
 * Records a non-passenger guest (FLAGGED_GUEST).
 * Specification 18.3:
 * FLAGGED_GUEST requires an explicit reason and is NEVER counted as an enrolled student/passenger.
 */
export function recordFlaggedGuest(input: FlaggedGuestInput): FlaggedGuestResult {
  const allowedRoles = ['COR', 'SAD', 'FAC'];
  if (!allowedRoles.includes(input.recorded_by_role)) {
    return {
      success: false,
      code: 'PERMISSION_DENIED',
      message: `Role ${input.recorded_by_role} is not authorized to log guest riders.`,
    };
  }

  if (!input.guest_name || input.guest_name.trim().length < 2) {
    return {
      success: false,
      code: 'INVALID_GUEST_DATA',
      message: 'Guest name must be at least 2 characters.',
    };
  }

  if (!input.reason || input.reason.trim().length === 0) {
    return {
      success: false,
      code: 'REASON_REQUIRED',
      message: 'A mandatory justification reason is required for FLAGGED_GUEST records.',
    };
  }

  const guestRecord: FlaggedGuestRecord = {
    id: `guest-${Date.now()}`,
    trip_id: input.trip_id,
    bus_id: input.bus_id,
    service_date: input.service_date,
    guest_name: input.guest_name.trim(),
    guest_phone: input.guest_phone.trim(),
    reason: input.reason.trim(),
    recorded_by_user_id: input.recorded_by_user_id,
    recorded_at: input.recorded_at_utc,
  };

  const audit: AuditRecordPayload = {
    entity_type: 'GUEST_PASSENGER',
    entity_id: guestRecord.id,
    action: 'GUEST_RECORDED',
    actor_id: input.recorded_by_user_id,
    actor_role: input.recorded_by_role,
    reason: input.reason.trim(),
    old_value: null,
    new_value: {
      guest_name: guestRecord.guest_name,
      guest_phone: guestRecord.guest_phone,
      is_enrolled_passenger: false, // Critical: never counted in student quota/reports
    },
    recorded_at: input.recorded_at_utc,
  };

  return {
    success: true,
    guestRecord,
    audit,
  };
}

export interface AttendanceCorrectionInput {
  attendance_id: string;
  current_status: AttendanceStatus;
  new_status: AttendanceStatus;
  reason: string;
  corrected_by_user_id: string;
  corrected_by_role: string;
  recorded_at_utc: string;
}

export interface AttendanceCorrectionResult {
  success: boolean;
  code?: 'PERMISSION_DENIED' | 'REASON_REQUIRED' | 'INVALID_TRANSITION';
  message?: string;
  audit?: AuditRecordPayload;
}

/**
 * Validates and applies an administrative correction to an attendance record.
 * Specification 18.4:
 * Corrections permitted by COR or SAD only, with mandatory reason, creating an immutable audit row.
 */
export function correctAttendanceRecord(
  input: AttendanceCorrectionInput,
): AttendanceCorrectionResult {
  if (input.corrected_by_role !== 'COR' && input.corrected_by_role !== 'SAD') {
    return {
      success: false,
      code: 'PERMISSION_DENIED',
      message: 'Only Transport Coordinators (COR) and Super Admins (SAD) can correct attendance records.',
    };
  }

  if (!input.reason || input.reason.trim().length === 0) {
    return {
      success: false,
      code: 'REASON_REQUIRED',
      message: 'Correction reason is mandatory for administrative modifications.',
    };
  }

  const audit: AuditRecordPayload = {
    entity_type: 'ATTENDANCE',
    entity_id: input.attendance_id,
    action: 'ATTENDANCE_CORRECTED',
    actor_id: input.corrected_by_user_id,
    actor_role: input.corrected_by_role,
    reason: input.reason.trim(),
    old_value: { status: input.current_status },
    new_value: { status: input.new_status },
    recorded_at: input.recorded_at_utc,
  };

  return {
    success: true,
    audit,
  };
}
