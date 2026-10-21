import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBoardingCutoff, type AttendanceRecordCore } from '../dist/index.js';

describe('Domain: Boarding Cutoff Job Logic (Spec 18.5, 25)', () => {
  const trip = {
    trip_id: 'trip-909',
    scheduled_departure_utc: '2026-10-21T08:00:00.000Z',
    status: 'ACTIVE' as const,
  };

  const records: AttendanceRecordCore[] = [
    {
      id: 'rec-1',
      student_id: 'stu-1',
      trip_id: 'trip-909',
      bus_id: 'bus-08',
      route_id: 'route-12',
      service_date: '2026-10-21',
      trip_type: 'MORNING',
      status: 'BOARDED',
      method: 'QR',
      boarded_at: '2026-10-21T08:05:00.000Z',
      boarding_stop_id: 'stop-1',
      boarding_stop_name: 'Main Gate',
    },
    {
      id: 'rec-2',
      student_id: 'stu-2',
      trip_id: 'trip-909',
      bus_id: 'bus-08',
      route_id: 'route-12',
      service_date: '2026-10-21',
      trip_type: 'MORNING',
      status: 'EXPECTED',
      method: null,
      boarded_at: null,
      boarding_stop_id: null,
      boarding_stop_name: null,
    },
    {
      id: 'rec-3',
      student_id: 'stu-3',
      trip_id: 'trip-909',
      bus_id: 'bus-08',
      route_id: 'route-12',
      service_date: '2026-10-21',
      trip_type: 'MORNING',
      status: 'ON_LEAVE',
      method: null,
      boarded_at: null,
      boarding_stop_id: null,
      boarding_stop_name: null,
    },
    {
      id: 'rec-4',
      student_id: 'stu-4',
      trip_id: 'trip-909',
      bus_id: 'bus-08',
      route_id: 'route-12',
      service_date: '2026-10-21',
      trip_type: 'MORNING',
      status: 'EXPECTED',
      method: null,
      boarded_at: null,
      boarding_stop_id: null,
      boarding_stop_name: null,
    },
  ];

  test('does not modify records if boarding window is still open', () => {
    // 5 minutes after scheduled departure (08:05) -> window still open (closes 08:15)
    const result = evaluateBoardingCutoff(trip, records, '2026-10-21T08:05:00.000Z');
    assert.equal(result.windowClosed, false);
    assert.equal(result.markedAbsentCount, 0);
    assert.equal(result.updatedRecords.length, 0);
  });

  test('transitions remaining EXPECTED records to ABSENT after cutoff', () => {
    // 20 minutes after scheduled departure (08:20) -> window closed
    const result = evaluateBoardingCutoff(trip, records, '2026-10-21T08:20:00.000Z');
    assert.equal(result.windowClosed, true);
    assert.equal(result.markedAbsentCount, 2); // stu-2 and stu-4
    assert.equal(result.unchangedCount, 2);    // stu-1 (BOARDED) and stu-3 (ON_LEAVE)

    const absentStudentIds = result.updatedRecords.map(r => r.student_id);
    assert.deepEqual(absentStudentIds, ['stu-2', 'stu-4']);
    assert.ok(result.updatedRecords.every(r => r.status === 'ABSENT'));
  });

  test('is completely idempotent when run repeatedly', () => {
    // First run
    const firstRun = evaluateBoardingCutoff(trip, records, '2026-10-21T08:20:00.000Z');
    const combinedState = records.map(r => {
      const updated = firstRun.updatedRecords.find(u => u.id === r.id);
      return updated ?? r;
    });

    // Second run with updated state
    const secondRun = evaluateBoardingCutoff(trip, combinedState, '2026-10-21T08:25:00.000Z');
    assert.equal(secondRun.markedAbsentCount, 0);
    assert.equal(secondRun.unchangedCount, 4);
    assert.equal(secondRun.updatedRecords.length, 0);
  });
});
