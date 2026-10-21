import type { AttendanceRecordCore } from './attendance.js';

export interface AbsenceAlertRecord {
  id: string;
  student_id: string;
  service_date: string;
  morning_trip_id: string;
  afternoon_trip_id: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED_BOARDED_LATE' | 'CLOSED';
  assigned_faculty_id: string | null;
  target_role: 'PRIMARY_FACULTY' | 'ALL_FACULTY' | 'COORDINATOR';
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface StudentDailyAttendancePair {
  student_id: string;
  service_date: string;
  morningRecord?: AttendanceRecordCore | null;
  afternoonRecord?: AttendanceRecordCore | null;
  afternoonOnLeave?: boolean;
  assignedPrimaryFacultyId?: string | null;
  hasAssignedFaculty?: boolean;
}

export interface AbsenceEvaluationResult {
  service_date: string;
  evaluatedStudentsCount: number;
  newAlerts: AbsenceAlertRecord[];
  skippedCount: number;
}

/**
 * Evaluates student attendance records for morning-present, afternoon-absent discrepancy.
 * Specification 18.6 & Section 25:
 * Condition:
 * 1. Morning status is BOARDED or LATE_BOARDED
 * 2. Afternoon status is ABSENT
 * 3. Not on leave for the afternoon
 * Generates one absence_alerts record per student per date.
 * Notifies primary faculty -> else all faculty -> else coordinator.
 */
export function evaluateAbsenceAlerts(
  studentPairs: StudentDailyAttendancePair[],
  existingAlertStudentIds: Set<string>,
  nowUtc: string,
): AbsenceEvaluationResult {
  const newAlerts: AbsenceAlertRecord[] = [];
  let skippedCount = 0;

  for (const pair of studentPairs) {
    // Condition 1: Must have alert not already created for this student & date
    if (existingAlertStudentIds.has(pair.student_id)) {
      skippedCount++;
      continue;
    }

    const morningStatus = pair.morningRecord?.status;
    const afternoonStatus = pair.afternoonRecord?.status;

    // Condition 2: Morning must be BOARDED or LATE_BOARDED
    const morningPresent = morningStatus === 'BOARDED' || morningStatus === 'LATE_BOARDED';

    // Condition 3: Afternoon must be ABSENT
    const afternoonAbsent = afternoonStatus === 'ABSENT';

    // Condition 4: Afternoon must not be marked ON_LEAVE
    const notOnLeave = !pair.afternoonOnLeave && afternoonStatus !== 'ON_LEAVE';

    if (morningPresent && afternoonAbsent && notOnLeave) {
      // Determine recipient priority per Spec 18.6:
      // Primary faculty -> else all assigned faculty -> else coordinator
      let targetRole: 'PRIMARY_FACULTY' | 'ALL_FACULTY' | 'COORDINATOR' = 'COORDINATOR';
      let assignedFacultyId: string | null = null;

      if (pair.assignedPrimaryFacultyId) {
        targetRole = 'PRIMARY_FACULTY';
        assignedFacultyId = pair.assignedPrimaryFacultyId;
      } else if (pair.hasAssignedFaculty) {
        targetRole = 'ALL_FACULTY';
      } else {
        targetRole = 'COORDINATOR';
      }

      newAlerts.push({
        id: `abs-alert-${pair.student_id}-${pair.service_date}`,
        student_id: pair.student_id,
        service_date: pair.service_date,
        morning_trip_id: pair.morningRecord?.trip_id ?? '',
        afternoon_trip_id: pair.afternoonRecord?.trip_id ?? '',
        status: 'OPEN',
        assigned_faculty_id: assignedFacultyId,
        target_role: targetRole,
        created_at: nowUtc,
        resolved_at: null,
        resolution_note: null,
      });
    } else {
      skippedCount++;
    }
  }

  return {
    service_date: studentPairs[0]?.service_date ?? '',
    evaluatedStudentsCount: studentPairs.length,
    newAlerts,
    skippedCount,
  };
}

/**
 * Handles late boarding auto-resolution for an existing open absence alert.
 * Specification 18.6:
 * "Closes with BOARDED_LATE if the student boards late before acknowledgement."
 */
export function resolveAbsenceOnLateBoarding(
  alert: AbsenceAlertRecord,
  nowUtc: string,
): AbsenceAlertRecord {
  if (alert.status === 'OPEN') {
    return {
      ...alert,
      status: 'RESOLVED_BOARDED_LATE',
      resolved_at: nowUtc,
      resolution_note: 'Student boarded late; absence alert automatically resolved prior to acknowledgment.',
    };
  }
  return alert;
}
