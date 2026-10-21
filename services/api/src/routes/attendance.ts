import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from '@vjit/contracts';
import {
  validateBoardingScan,
  executeManualLateBoarding,
  recordFlaggedGuest,
  correctAttendanceRecord,
  type AttendanceStatus,
  type AttendanceRecordCore,
} from '@vjit/domain';
import { logger } from '@vjit/logger';
import { sendErrorResponse } from '../middleware/security.js';

export const attendanceScanRequestSchema = z.object({
  qr_payload: z.string().min(1),
  session_student_id: z.string().uuid(),
  boarding_stop_id: z.string().uuid(),
  boarding_stop_name: z.string().min(1).max(100),
  timestamp_utc: z.string().datetime({ offset: true }).optional(),
});

export const manualCheckInRequestSchema = z.object({
  type: z.enum(['MANUAL_LATE', 'FLAGGED_GUEST', 'CORRECTION']),
  student_id: z.string().uuid().optional(),
  trip_id: z.string().uuid(),
  bus_id: z.string().uuid(),
  route_id: z.string().uuid().optional(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  trip_type: z.enum(['MORNING', 'AFTERNOON']).optional(),
  current_status: z.enum(['EXPECTED', 'BOARDED', 'LATE_BOARDED', 'ON_LEAVE', 'ABSENT']).optional(),
  new_status: z.enum(['EXPECTED', 'BOARDED', 'LATE_BOARDED', 'ON_LEAVE', 'ABSENT']).optional(),
  attendance_id: z.string().optional(),
  guest_name: z.string().optional(),
  guest_phone: z.string().optional(),
  reason: z.string().min(1).max(500),
  actor_id: z.string(),
  actor_role: z.enum(['SAD', 'COR', 'TEC', 'FAC', 'STU', 'DRV', 'SEC', 'MGT']),
  timestamp_utc: z.string().datetime({ offset: true }).optional(),
  boarding_stop_id: z.string().optional(),
  boarding_stop_name: z.string().optional(),
});

export interface AttendanceDataStore {
  getActiveTrip(tripId: string): Promise<{
    id: string;
    bus_id: string;
    bus_number: string;
    route_name: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    scheduled_departure_utc: string;
    actual_departure_utc?: string | null;
  } | null>;
  getStudentRoster(tripId: string, studentId: string): Promise<{
    student_id: string;
    route_id?: string | null;
    is_on_leave: boolean;
  } | null>;
  getAttendanceRecord(tripId: string, studentId: string): Promise<{
    id: string;
    status: AttendanceStatus;
  } | null>;
  saveAttendanceRecord?(record: AttendanceRecordCore): Promise<void>;
  saveAuditRow?(audit: unknown): Promise<void>;
}

/**
 * Handles POST /api/v1/attendance/scan
 * Implements Specification 18.1 & 18.2 (8-step boarding scan validation)
 */
export async function handleAttendanceScan(
  _req: IncomingMessage,
  res: ServerResponse,
  rawBody: string,
  requestId: string,
  store: AttendanceDataStore,
  qrHmacKeys: Record<string, string>,
): Promise<void> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return sendErrorResponse(
      res,
      400,
      'INVALID_PAYLOAD',
      'Malformed JSON in attendance scan request.',
      requestId,
    );
  }

  const parseResult = attendanceScanRequestSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return sendErrorResponse(
      res,
      400,
      'SCHEMA_VIOLATION',
      parseResult.error.issues[0]?.message ?? 'Invalid scan request schema.',
      requestId,
    );
  }

  const { qr_payload, session_student_id, boarding_stop_id, boarding_stop_name, timestamp_utc } =
    parseResult.data;
  const nowUtc = timestamp_utc ?? new Date().toISOString();

  // Try to inspect QR token to fetch contextual trip
  let decodedTripId: string | null = null;
  try {
    const raw = JSON.parse(qr_payload) as { trip_id?: string };
    decodedTripId = raw.trip_id ?? null;
  } catch {
    // Malformed JSON handled in step 2 of pipeline
  }

  const trip = decodedTripId ? await store.getActiveTrip(decodedTripId) : null;
  const studentRoster = trip ? await store.getStudentRoster(trip.id, session_student_id) : null;
  const existingRecord = trip ? await store.getAttendanceRecord(trip.id, session_student_id) : null;

  const nowMs = new Date(nowUtc).getTime();
  const currentTimestampSec = Math.floor(nowMs / 1000);

  const result = validateBoardingScan({
    sessionStudentId: session_student_id,
    qrPayload: qr_payload,
    hmacKeys: qrHmacKeys,
    currentTimestampSec,
    nowUtc,
    trip,
    studentRosterRecord: studentRoster,
    existingAttendance: existingRecord,
    boardingStopId: boarding_stop_id,
    boardingStopName: boarding_stop_name,
  });

  if (!result.success) {
    const statusMap: Record<string, number> = {
      AUTH_REQUIRED: 401,
      QR_INVALID: 400,
      QR_EXPIRED: 400,
      TRIP_NOT_ACTIVE: 409,
      NOT_ON_ROUTE: 403,
      DUPLICATE_BOARDING: 409,
      BOARDING_WINDOW_CLOSED: 400,
    };
    const statusCode = statusMap[result.code] ?? 400;

    logger.warn('Boarding scan rejected', {
      requestId,
      code: result.code,
      message: result.message,
      step: result.stepFailed,
    });

    return sendErrorResponse(res, statusCode, result.code, result.message, requestId);
  }

  // Save successful boarding record if storage hook provided
  if (store.saveAttendanceRecord) {
    await store.saveAttendanceRecord({
      id: `att-${result.student_id}-${result.trip_id}`,
      student_id: result.student_id,
      trip_id: result.trip_id,
      bus_id: result.bus_id,
      route_id: trip?.id ?? '',
      service_date: nowUtc.split('T')[0] ?? '',
      trip_type: 'MORNING',
      status: 'BOARDED',
      method: 'QR',
      boarded_at: result.boarded_at,
      boarding_stop_id: result.boarding_stop_id,
      boarding_stop_name: result.boarding_stop_name,
    });
  }

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      status: 'ok',
      data: result,
      request_id: requestId,
    }),
  );
}

/**
 * Handles POST /api/v1/attendance/check-in
 * Implements Specification 18.3 & 18.4 (manual check-in, guest tracking, correction)
 */
export async function handleAttendanceCheckIn(
  _req: IncomingMessage,
  res: ServerResponse,
  rawBody: string,
  requestId: string,
  store: AttendanceDataStore,
): Promise<void> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return sendErrorResponse(
      res,
      400,
      'INVALID_PAYLOAD',
      'Malformed JSON in attendance check-in request.',
      requestId,
    );
  }

  const parseResult = manualCheckInRequestSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return sendErrorResponse(
      res,
      400,
      'SCHEMA_VIOLATION',
      parseResult.error.issues[0]?.message ?? 'Invalid check-in request schema.',
      requestId,
    );
  }

  const data = parseResult.data;
  const nowUtc = data.timestamp_utc ?? new Date().toISOString();

  if (data.type === 'MANUAL_LATE') {
    if (!data.student_id) {
      return sendErrorResponse(res, 400, 'STUDENT_REQUIRED', 'student_id is required.', requestId);
    }
    const outcome = executeManualLateBoarding({
      student_id: data.student_id,
      trip_id: data.trip_id,
      bus_id: data.bus_id,
      route_id: data.route_id ?? '',
      service_date: data.service_date ?? nowUtc.split('T')[0] ?? '',
      trip_type: data.trip_type ?? 'MORNING',
      current_status: data.current_status ?? 'EXPECTED',
      reason: data.reason,
      boarded_at_utc: nowUtc,
      recorded_by_user_id: data.actor_id,
      recorded_by_role: data.actor_role,
      boarding_stop_id: data.boarding_stop_id ?? null,
      boarding_stop_name: data.boarding_stop_name ?? null,
    });

    if (!outcome.success) {
      const code = outcome.code === 'PERMISSION_DENIED' ? 403 : 400;
      return sendErrorResponse(res, code, outcome.code ?? 'ERROR', outcome.message ?? '', requestId);
    }

    if (store.saveAttendanceRecord && outcome.record) {
      await store.saveAttendanceRecord(outcome.record);
    }
    if (store.saveAuditRow && outcome.audit) {
      await store.saveAuditRow(outcome.audit);
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', data: outcome, request_id: requestId }));
    return;
  }

  if (data.type === 'FLAGGED_GUEST') {
    const outcome = recordFlaggedGuest({
      trip_id: data.trip_id,
      bus_id: data.bus_id,
      service_date: data.service_date ?? nowUtc.split('T')[0] ?? '',
      guest_name: data.guest_name ?? '',
      guest_phone: data.guest_phone ?? '',
      reason: data.reason,
      recorded_by_user_id: data.actor_id,
      recorded_by_role: data.actor_role,
      recorded_at_utc: nowUtc,
    });

    if (!outcome.success) {
      const code = outcome.code === 'PERMISSION_DENIED' ? 403 : 400;
      return sendErrorResponse(res, code, outcome.code ?? 'ERROR', outcome.message ?? '', requestId);
    }

    if (store.saveAuditRow && outcome.audit) {
      await store.saveAuditRow(outcome.audit);
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', data: outcome, request_id: requestId }));
    return;
  }

  if (data.type === 'CORRECTION') {
    const outcome = correctAttendanceRecord({
      attendance_id: data.attendance_id ?? `att-${data.student_id}-${data.trip_id}`,
      current_status: data.current_status ?? 'EXPECTED',
      new_status: data.new_status ?? 'LATE_BOARDED',
      reason: data.reason,
      corrected_by_user_id: data.actor_id,
      corrected_by_role: data.actor_role,
      recorded_at_utc: nowUtc,
    });

    if (!outcome.success) {
      const code = outcome.code === 'PERMISSION_DENIED' ? 403 : 400;
      return sendErrorResponse(res, code, outcome.code ?? 'ERROR', outcome.message ?? '', requestId);
    }

    if (store.saveAuditRow && outcome.audit) {
      await store.saveAuditRow(outcome.audit);
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', data: outcome, request_id: requestId }));
    return;
  }

  return sendErrorResponse(res, 400, 'UNSUPPORTED_TYPE', 'Unsupported check-in action type.', requestId);
}
