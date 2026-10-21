/**
 * Attendance Check-In Architecture & Method Registry
 * Specification Section 18.1; Conflict C-06 & Decision 4
 */

export type AttendanceCheckInMethod = 'QR' | 'RFID' | 'MANUAL';

export type AttendanceStatus =
  | 'EXPECTED'
  | 'BOARDED'
  | 'LATE_BOARDED'
  | 'ON_LEAVE'
  | 'ABSENT';

export interface AttendanceRecordCore {
  id: string;
  student_id: string;
  trip_id: string;
  bus_id: string;
  route_id: string;
  service_date: string; // YYYY-MM-DD
  trip_type: 'MORNING' | 'AFTERNOON';
  status: AttendanceStatus;
  method: AttendanceCheckInMethod | null;
  boarded_at: string | null;
  boarding_stop_id: string | null;
  boarding_stop_name: string | null;
  is_synthetic?: boolean;
}

export interface FlaggedGuestRecord {
  id: string;
  trip_id: string;
  bus_id: string;
  service_date: string;
  guest_name: string;
  guest_phone: string;
  reason: string;
  recorded_by_user_id: string;
  recorded_at: string;
}

/**
 * Registry of supported student attendance verification methods.
 * Conflict C-06 & Decision 4:
 * The removal of the standalone driver application removed the 30-second
 * rotating QR code generated on the driver's smartphone.
 * That specific workflow is formally SUSPENDED pending Project Owner Decision 4.
 */
export const ATTENDANCE_CHECKIN_CAPABILITIES = {
  FIXED_VEHICLE_QR: {
    enabled: true,
    description: 'Fixed laminated QR placard mounted at bus entrance scanned by student mobile app',
    requiresDriverApp: false,
  },
  HARDWARE_RFID_TAP: {
    enabled: true,
    description: 'Bus-mounted hardware RFID tapper streaming tap events via cellular telemetry',
    requiresDriverApp: false,
  },
  FACULTY_MANUAL_CHECKIN: {
    enabled: true,
    description: 'Manual roster verification performed by assigned primary faculty on board',
    requiresDriverApp: false,
  },
  DRIVER_PHONE_ROTATING_QR: {
    enabled: false,
    status: 'SUSPENDED_CONFLICT_C06',
    description: '30-second dynamic rotating QR displayed on driver smartphone screen',
    requiresDriverApp: true,
    blockReason: 'Conflict C-06 / Decision 4: Standalone driver app removed from product scope.',
  },
} as const;

export function isCheckInMethodPermitted(method: string): boolean {
  if (method === 'QR' || method === 'RFID' || method === 'MANUAL') {
    return true;
  }
  return false;
}
