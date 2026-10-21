import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  executeManualLateBoarding,
  recordFlaggedGuest,
  correctAttendanceRecord,
} from '../dist/index.js';

describe('Domain: Manual Check-In & Audited Correction (Spec 18.3, 18.4)', () => {
  const tripId = 'trip-101';
  const busId = 'bus-08';
  const routeId = 'route-12';
  const studentId = 'student-77';
  const now = '2026-10-21T08:35:00.000Z';

  describe('executeManualLateBoarding', () => {
    test('allows coordinator, super admin, or faculty to perform late boarding with reason', () => {
      const corResult = executeManualLateBoarding({
        student_id: studentId,
        trip_id: tripId,
        bus_id: busId,
        route_id: routeId,
        service_date: '2026-10-21',
        trip_type: 'MORNING',
        current_status: 'EXPECTED',
        reason: 'Laboratory exam completed late, student boarded with slip',
        boarded_at_utc: now,
        recorded_by_user_id: 'cor-user-1',
        recorded_by_role: 'COR',
        boarding_stop_id: 'stop-05',
        boarding_stop_name: 'Library Gate',
      });

      assert.equal(corResult.success, true);
      assert.equal(corResult.record?.status, 'LATE_BOARDED');
      assert.equal(corResult.record?.method, 'MANUAL');
      assert.equal(corResult.audit?.action, 'MANUAL_CHECKIN');
      assert.equal(corResult.audit?.actor_role, 'COR');
    });

    test('rejects late boarding without reason', () => {
      const noReason = executeManualLateBoarding({
        student_id: studentId,
        trip_id: tripId,
        bus_id: busId,
        route_id: routeId,
        service_date: '2026-10-21',
        trip_type: 'MORNING',
        current_status: 'EXPECTED',
        reason: '',
        boarded_at_utc: now,
        recorded_by_user_id: 'cor-user-1',
        recorded_by_role: 'COR',
        boarding_stop_id: null,
        boarding_stop_name: null,
      });

      assert.equal(noReason.success, false);
      assert.equal(noReason.code, 'REASON_REQUIRED');
    });

    test('rejects late boarding from unauthorized roles (students, drivers, technicians)', () => {
      const studentAttempt = executeManualLateBoarding({
        student_id: studentId,
        trip_id: tripId,
        bus_id: busId,
        route_id: routeId,
        service_date: '2026-10-21',
        trip_type: 'MORNING',
        current_status: 'EXPECTED',
        reason: 'Late student trying to self-check-in',
        boarded_at_utc: now,
        recorded_by_user_id: studentId,
        recorded_by_role: 'STU',
        boarding_stop_id: null,
        boarding_stop_name: null,
      });

      assert.equal(studentAttempt.success, false);
      assert.equal(studentAttempt.code, 'PERMISSION_DENIED');
    });
  });

  describe('recordFlaggedGuest', () => {
    test('records non-passenger guest with mandatory reason and sets is_enrolled_passenger = false', () => {
      const result = recordFlaggedGuest({
        trip_id: tripId,
        bus_id: busId,
        service_date: '2026-10-21',
        guest_name: 'Dr. Ramesh Kumar (Visiting Examiner)',
        guest_phone: '9848022338',
        reason: 'Visiting external practical examiner for ECE department',
        recorded_by_user_id: 'cor-user-1',
        recorded_by_role: 'COR',
        recorded_at_utc: now,
      });

      assert.equal(result.success, true);
      assert.equal(result.guestRecord?.guest_name, 'Dr. Ramesh Kumar (Visiting Examiner)');
      assert.equal(result.audit?.action, 'GUEST_RECORDED');
      assert.equal(result.audit?.new_value['is_enrolled_passenger'], false);
    });

    test('rejects guest without reason', () => {
      const result = recordFlaggedGuest({
        trip_id: tripId,
        bus_id: busId,
        service_date: '2026-10-21',
        guest_name: 'Guest Person',
        guest_phone: '9848022338',
        reason: '   ',
        recorded_by_user_id: 'cor-user-1',
        recorded_by_role: 'COR',
        recorded_at_utc: now,
      });

      assert.equal(result.success, false);
      assert.equal(result.code, 'REASON_REQUIRED');
    });
  });

  describe('correctAttendanceRecord', () => {
    test('allows coordinator or super admin to correct attendance with immutable audit record', () => {
      const result = correctAttendanceRecord({
        attendance_id: 'att-1234',
        current_status: 'ABSENT',
        new_status: 'LATE_BOARDED',
        reason: 'Manual faculty roster sheet verified student was aboard',
        corrected_by_user_id: 'cor-user-1',
        corrected_by_role: 'COR',
        recorded_at_utc: now,
      });

      assert.equal(result.success, true);
      assert.equal(result.audit?.action, 'ATTENDANCE_CORRECTED');
      assert.equal(result.audit?.old_value?.['status'], 'ABSENT');
      assert.equal(result.audit?.new_value['status'], 'LATE_BOARDED');
      assert.equal(result.audit?.reason, 'Manual faculty roster sheet verified student was aboard');
    });

    test('rejects corrections from faculty or technicians without admin privilege', () => {
      const facultyAttempt = correctAttendanceRecord({
        attendance_id: 'att-1234',
        current_status: 'ABSENT',
        new_status: 'BOARDED',
        reason: 'Faculty attempting correction',
        corrected_by_user_id: 'fac-1',
        corrected_by_role: 'FAC',
        recorded_at_utc: now,
      });

      assert.equal(facultyAttempt.success, false);
      assert.equal(facultyAttempt.code, 'PERMISSION_DENIED');
    });
  });
});
