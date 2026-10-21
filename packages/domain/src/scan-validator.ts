import { hashTokenHmac, timingSafeEqualString } from './security.js';
import { evaluateBoardingWindow } from './boarding-window.js';
import type { AttendanceStatus } from './attendance.js';

export interface BoardingQrPayload {
  trip_id: string;
  bus_id: string;
  slot: number;
  key_version: string;
  sig: string;
}

export type ScanValidationErrorCode =
  | 'AUTH_REQUIRED'
  | 'QR_INVALID'
  | 'QR_EXPIRED'
  | 'TRIP_NOT_ACTIVE'
  | 'NOT_ON_ROUTE'
  | 'DUPLICATE_BOARDING'
  | 'BOARDING_WINDOW_CLOSED';

export interface BoardingScanInput {
  // Step 1: Session Auth
  sessionStudentId: string | null | undefined;

  // Step 2 & 3: Raw QR payload and key config
  qrPayload: string;
  hmacKeys: Record<string, string>;
  currentTimestampSec?: number;
  slotDurationSec?: number; // default 30s per qr.rotation_s

  // Step 4: Trip state
  trip: {
    id: string;
    bus_id: string;
    bus_number: string;
    route_name: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    scheduled_departure_utc: string;
    actual_departure_utc?: string | null;
  } | null | undefined;

  // Step 5: Student route assignment and leave status
  studentRosterRecord: {
    student_id: string;
    route_id?: string | null;
    is_on_leave: boolean;
  } | null | undefined;

  // Step 6: Existing boarding record
  existingAttendance: {
    status: AttendanceStatus;
  } | null | undefined;

  // Step 7 & 8: Context for window evaluation and boarding write
  nowUtc: string;
  boardingStopId: string;
  boardingStopName: string;
}

export interface BoardingScanSuccess {
  success: true;
  status: 'BOARDED';
  method: 'QR';
  student_id: string;
  trip_id: string;
  bus_id: string;
  bus_number: string;
  route_name: string;
  boarded_at: string;
  boarding_stop_id: string;
  boarding_stop_name: string;
  confirmation_message: string;
}

export interface BoardingScanFailure {
  success: false;
  code: ScanValidationErrorCode;
  message: string;
  stepFailed: number;
}

export type BoardingScanResult = BoardingScanSuccess | BoardingScanFailure;

/**
 * Generates an authenticated boarding QR payload.
 * Specification 18.1:
 * Payload signed with QR_HMAC_KEYS (versioned), rotated every 30s.
 * Contains trip reference, bus reference, and slot. No student data.
 */
export function generateBoardingQrPayload(
  tripId: string,
  busId: string,
  nowTimestampSec: number,
  keyVersion: string,
  secretKey: string,
  slotDurationSec = 30,
): string {
  const slot = Math.floor(nowTimestampSec / slotDurationSec);
  const data = `${tripId}:${busId}:${slot}`;
  const sig = hashTokenHmac(data, secretKey);

  const payload: BoardingQrPayload = {
    trip_id: tripId,
    bus_id: busId,
    slot,
    key_version: keyVersion,
    sig,
  };

  return JSON.stringify(payload);
}

/**
 * 8-Step Boarding Scan Validation Pipeline
 * Specification 18.2:
 * Evaluated strictly in order, the first failure returns its specific code:
 * Step 1: session (AUTH_REQUIRED)
 * Step 2: token decode and HMAC (QR_INVALID)
 * Step 3: slot window (QR_EXPIRED)
 * Step 4: trip ACTIVE for the bus in the token (TRIP_NOT_ACTIVE)
 * Step 5: student expected on this trip and not on leave (NOT_ON_ROUTE)
 * Step 6: no BOARDED or LATE_BOARDED record (DUPLICATE_BOARDING)
 * Step 7: boarding window open (BOARDING_WINDOW_CLOSED)
 * Step 8: write BOARDED with method QR and boarding stop; return confirmation.
 */
export function validateBoardingScan(input: BoardingScanInput): BoardingScanResult {
  // Step 1: Session authentication
  if (!input.sessionStudentId || input.sessionStudentId.trim().length === 0) {
    return {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Student session is unauthenticated or missing valid credentials.',
      stepFailed: 1,
    };
  }

  // Step 2: Token decode and HMAC signature
  let decoded: BoardingQrPayload;
  try {
    decoded = JSON.parse(input.qrPayload) as BoardingQrPayload;
    if (
      typeof decoded.trip_id !== 'string' ||
      typeof decoded.bus_id !== 'string' ||
      typeof decoded.slot !== 'number' ||
      typeof decoded.key_version !== 'string' ||
      typeof decoded.sig !== 'string'
    ) {
      return {
        success: false,
        code: 'QR_INVALID',
        message: 'Malformed QR payload structure.',
        stepFailed: 2,
      };
    }
  } catch {
    return {
      success: false,
      code: 'QR_INVALID',
      message: 'Failed to decode QR token payload JSON.',
      stepFailed: 2,
    };
  }

  const secret = input.hmacKeys[decoded.key_version];
  if (!secret) {
    return {
      success: false,
      code: 'QR_INVALID',
      message: `Unknown or retired QR key version: ${decoded.key_version}`,
      stepFailed: 2,
    };
  }

  const expectedData = `${decoded.trip_id}:${decoded.bus_id}:${decoded.slot}`;
  const expectedSig = hashTokenHmac(expectedData, secret);

  if (!timingSafeEqualString(decoded.sig, expectedSig)) {
    return {
      success: false,
      code: 'QR_INVALID',
      message: 'Cryptographic signature mismatch on QR payload.',
      stepFailed: 2,
    };
  }

  // Step 3: Slot window (current and previous slot only per Spec 18.1)
  const currentSec = input.currentTimestampSec ?? Math.floor(Date.now() / 1000);
  const slotSec = input.slotDurationSec ?? 30;
  const currentSlot = Math.floor(currentSec / slotSec);

  // Accepted for current and previous slot only
  if (decoded.slot !== currentSlot && decoded.slot !== currentSlot - 1) {
    return {
      success: false,
      code: 'QR_EXPIRED',
      message: 'Scanned QR code has expired. Please scan the current code.',
      stepFailed: 3,
    };
  }

  // Step 4: Trip ACTIVE for the bus in the token
  if (!input.trip || input.trip.status !== 'ACTIVE' || input.trip.bus_id !== decoded.bus_id) {
    return {
      success: false,
      code: 'TRIP_NOT_ACTIVE',
      message: 'Trip is not currently active for the bus in the scanned token.',
      stepFailed: 4,
    };
  }

  // Verify trip id matches token trip id
  if (input.trip.id !== decoded.trip_id) {
    return {
      success: false,
      code: 'TRIP_NOT_ACTIVE',
      message: 'Trip identifier does not match active journey.',
      stepFailed: 4,
    };
  }

  // Step 5: Student expected on this trip and not on leave
  if (!input.studentRosterRecord || input.studentRosterRecord.student_id !== input.sessionStudentId) {
    return {
      success: false,
      code: 'NOT_ON_ROUTE',
      message: 'Student is not assigned or scheduled for this route.',
      stepFailed: 5,
    };
  }

  if (input.studentRosterRecord.is_on_leave) {
    return {
      success: false,
      code: 'NOT_ON_ROUTE',
      message: 'Student has an approved leave request on file for this trip.',
      stepFailed: 5,
    };
  }

  // Step 6: No duplicate BOARDED or LATE_BOARDED record
  if (
    input.existingAttendance &&
    (input.existingAttendance.status === 'BOARDED' || input.existingAttendance.status === 'LATE_BOARDED')
  ) {
    return {
      success: false,
      code: 'DUPLICATE_BOARDING',
      message: 'Student has already boarded this trip. Duplicate boarding rejected.',
      stepFailed: 6,
    };
  }

  // Step 7: Boarding window open
  const windowCheck = evaluateBoardingWindow(
    input.trip.scheduled_departure_utc,
    input.nowUtc,
    input.trip.actual_departure_utc,
  );

  if (!windowCheck.isOpen) {
    return {
      success: false,
      code: 'BOARDING_WINDOW_CLOSED',
      message: windowCheck.message ?? 'Boarding window is closed for this trip.',
      stepFailed: 7,
    };
  }

  // Step 8: Successful boarding confirmation
  return {
    success: true,
    status: 'BOARDED',
    method: 'QR',
    student_id: input.sessionStudentId,
    trip_id: input.trip.id,
    bus_id: input.trip.bus_id,
    bus_number: input.trip.bus_number,
    route_name: input.trip.route_name,
    boarded_at: input.nowUtc,
    boarding_stop_id: input.boardingStopId,
    boarding_stop_name: input.boardingStopName,
    confirmation_message: `Boarded Bus ${input.trip.bus_number} on ${input.trip.route_name} at ${input.boardingStopName}`,
  };
}
