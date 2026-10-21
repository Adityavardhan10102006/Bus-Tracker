import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAbsenceAlerts,
  resolveAbsenceOnLateBoarding,
  type StudentDailyAttendancePair,
  type AbsenceAlertRecord,
} from '../dist/index.js';

describe('Domain: Absence Evaluator (Spec 18.6 & 25)', () => {
  const serviceDate = '2026-10-21';
  const now = '2026-10-21T16:30:00.000Z'; // Afternoon evaluation window

  test('generates absence alert for morning present (BOARDED) and afternoon ABSENT', () => {
    const pairs: StudentDailyAttendancePair[] = [
      {
        student_id: 'stu-101',
        service_date: serviceDate,
        morningRecord: {
          id: 'att-m-1',
          student_id: 'stu-101',
          trip_id: 'trip-morning',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'MORNING',
          status: 'BOARDED',
          method: 'QR',
          boarded_at: '2026-10-21T08:05:00.000Z',
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonRecord: {
          id: 'att-a-1',
          student_id: 'stu-101',
          trip_id: 'trip-afternoon',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'AFTERNOON',
          status: 'ABSENT',
          method: null,
          boarded_at: null,
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonOnLeave: false,
        assignedPrimaryFacultyId: 'faculty-prof-sharma',
      },
    ];

    const result = evaluateAbsenceAlerts(pairs, new Set(), now);
    assert.equal(result.newAlerts.length, 1);

    const alert = result.newAlerts[0]!;
    assert.equal(alert.student_id, 'stu-101');
    assert.equal(alert.status, 'OPEN');
    assert.equal(alert.target_role, 'PRIMARY_FACULTY');
    assert.equal(alert.assigned_faculty_id, 'faculty-prof-sharma');
  });

  test('generates absence alert for morning LATE_BOARDED and afternoon ABSENT', () => {
    const pairs: StudentDailyAttendancePair[] = [
      {
        student_id: 'stu-102',
        service_date: serviceDate,
        morningRecord: {
          id: 'att-m-2',
          student_id: 'stu-102',
          trip_id: 'trip-morning',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'MORNING',
          status: 'LATE_BOARDED',
          method: 'MANUAL',
          boarded_at: '2026-10-21T08:25:00.000Z',
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonRecord: {
          id: 'att-a-2',
          student_id: 'stu-102',
          trip_id: 'trip-afternoon',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'AFTERNOON',
          status: 'ABSENT',
          method: null,
          boarded_at: null,
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonOnLeave: false,
        hasAssignedFaculty: true,
      },
    ];

    const result = evaluateAbsenceAlerts(pairs, new Set(), now);
    assert.equal(result.newAlerts.length, 1);
    assert.equal(result.newAlerts[0]?.target_role, 'ALL_FACULTY');
  });

  test('does not generate alert if student is on approved leave in afternoon', () => {
    const pairs: StudentDailyAttendancePair[] = [
      {
        student_id: 'stu-103',
        service_date: serviceDate,
        morningRecord: {
          id: 'att-m-3',
          student_id: 'stu-103',
          trip_id: 'trip-morning',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'MORNING',
          status: 'BOARDED',
          method: 'QR',
          boarded_at: '2026-10-21T08:05:00.000Z',
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonRecord: {
          id: 'att-a-3',
          student_id: 'stu-103',
          trip_id: 'trip-afternoon',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'AFTERNOON',
          status: 'ON_LEAVE',
          method: null,
          boarded_at: null,
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonOnLeave: true,
      },
    ];

    const result = evaluateAbsenceAlerts(pairs, new Set(), now);
    assert.equal(result.newAlerts.length, 0);
  });

  test('does not generate alert if student was absent in the morning as well', () => {
    const pairs: StudentDailyAttendancePair[] = [
      {
        student_id: 'stu-104',
        service_date: serviceDate,
        morningRecord: {
          id: 'att-m-4',
          student_id: 'stu-104',
          trip_id: 'trip-morning',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'MORNING',
          status: 'ABSENT',
          method: null,
          boarded_at: null,
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonRecord: {
          id: 'att-a-4',
          student_id: 'stu-104',
          trip_id: 'trip-afternoon',
          bus_id: 'bus-08',
          route_id: 'route-12',
          service_date: serviceDate,
          trip_type: 'AFTERNOON',
          status: 'ABSENT',
          method: null,
          boarded_at: null,
          boarding_stop_id: null,
          boarding_stop_name: null,
        },
        afternoonOnLeave: false,
      },
    ];

    const result = evaluateAbsenceAlerts(pairs, new Set(), now);
    assert.equal(result.newAlerts.length, 0);
  });

  test('auto-resolves open alert when student boards late prior to acknowledgment', () => {
    const openAlert: AbsenceAlertRecord = {
      id: 'abs-alert-1',
      student_id: 'stu-101',
      service_date: serviceDate,
      morning_trip_id: 'trip-morning',
      afternoon_trip_id: 'trip-afternoon',
      status: 'OPEN',
      assigned_faculty_id: 'faculty-prof-sharma',
      target_role: 'PRIMARY_FACULTY',
      created_at: '2026-10-21T16:30:00.000Z',
      resolved_at: null,
      resolution_note: null,
    };

    const resolved = resolveAbsenceOnLateBoarding(openAlert, '2026-10-21T16:45:00.000Z');
    assert.equal(resolved.status, 'RESOLVED_BOARDED_LATE');
    assert.equal(resolved.resolved_at, '2026-10-21T16:45:00.000Z');
    assert.match(resolved.resolution_note ?? '', /boarded late/i);
  });
});
