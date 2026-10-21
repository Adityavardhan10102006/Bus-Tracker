import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateBoardingQrPayload,
  validateBoardingScan,
  type BoardingScanInput,
} from '../dist/index.js';

describe('Domain: 8-Step Boarding Scan Validation Pipeline (Spec 18.2)', () => {
  const secretKey = 'test_qr_hmac_secret_entropy_key_v1';
  const hmacKeys = { v1: secretKey };
  const tripId = '11111111-2222-3333-4444-555555555555';
  const busId = 'bus-08';
  const studentId = 'student-42';
  const stopId = 'stop-01';
  const stopName = 'VJIT Main Gate';
  const scheduledDeparture = '2026-10-21T08:00:00.000Z';
  const nowUtc = '2026-10-21T08:02:00.000Z'; // Inside boarding window
  const nowSec = Math.floor(new Date(nowUtc).getTime() / 1000);

  const validQrPayload = generateBoardingQrPayload(
    tripId,
    busId,
    nowSec,
    'v1',
    secretKey,
    30,
  );

  const baseValidInput: BoardingScanInput = {
    sessionStudentId: studentId,
    qrPayload: validQrPayload,
    hmacKeys,
    currentTimestampSec: nowSec,
    nowUtc,
    trip: {
      id: tripId,
      bus_id: busId,
      bus_number: '12',
      route_name: 'Route 12 - Mehdipatnam',
      status: 'ACTIVE',
      scheduled_departure_utc: scheduledDeparture,
      actual_departure_utc: null,
    },
    studentRosterRecord: {
      student_id: studentId,
      route_id: 'route-12',
      is_on_leave: false,
    },
    existingAttendance: null,
    boardingStopId: stopId,
    boardingStopName: stopName,
  };

  test('Step 1: rejects unauthenticated session with AUTH_REQUIRED', () => {
    const input: BoardingScanInput = {
      ...baseValidInput,
      sessionStudentId: '',
    };
    const result = validateBoardingScan(input);
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.code, 'AUTH_REQUIRED');
      assert.equal(result.stepFailed, 1);
    }
  });

  test('Step 2: rejects malformed payload or invalid signature with QR_INVALID', () => {
    // Malformed JSON
    const malformed = validateBoardingScan({
      ...baseValidInput,
      qrPayload: 'not-json-content',
    });
    assert.equal(malformed.success, false);
    if (!malformed.success) {
      assert.equal(malformed.code, 'QR_INVALID');
      assert.equal(malformed.stepFailed, 2);
    }

    // Tampered signature
    const tamperedPayload = JSON.stringify({
      trip_id: tripId,
      bus_id: busId,
      slot: Math.floor(nowSec / 30),
      key_version: 'v1',
      sig: 'deadbeefcafe0000111122223333444455556666777788889999aaaabbbbcccc',
    });
    const tampered = validateBoardingScan({
      ...baseValidInput,
      qrPayload: tamperedPayload,
    });
    assert.equal(tampered.success, false);
    if (!tampered.success) {
      assert.equal(tampered.code, 'QR_INVALID');
      assert.equal(tampered.stepFailed, 2);
    }
  });

  test('Step 3: rejects expired QR code slot with QR_EXPIRED', () => {
    // Expired slot: 3 slots ago (> 60 seconds old)
    const oldSec = nowSec - 90;
    const oldQrPayload = generateBoardingQrPayload(
      tripId,
      busId,
      oldSec,
      'v1',
      secretKey,
      30,
    );

    const expired = validateBoardingScan({
      ...baseValidInput,
      qrPayload: oldQrPayload,
    });
    assert.equal(expired.success, false);
    if (!expired.success) {
      assert.equal(expired.code, 'QR_EXPIRED');
      assert.equal(expired.stepFailed, 3);
    }

    // But accepts previous slot (slot - 1, within 30s)
    const prevSlotSec = nowSec - 25;
    const prevSlotPayload = generateBoardingQrPayload(
      tripId,
      busId,
      prevSlotSec,
      'v1',
      secretKey,
      30,
    );
    const prevSlotResult = validateBoardingScan({
      ...baseValidInput,
      qrPayload: prevSlotPayload,
    });
    assert.equal(prevSlotResult.success, true);
  });

  test('Step 4: rejects when trip is not ACTIVE with TRIP_NOT_ACTIVE', () => {
    const inactiveTrip = validateBoardingScan({
      ...baseValidInput,
      trip: {
        ...baseValidInput.trip!,
        status: 'SCHEDULED', // Not started yet
      },
    });
    assert.equal(inactiveTrip.success, false);
    if (!inactiveTrip.success) {
      assert.equal(inactiveTrip.code, 'TRIP_NOT_ACTIVE');
      assert.equal(inactiveTrip.stepFailed, 4);
    }

    // Mismatched bus
    const wrongBus = validateBoardingScan({
      ...baseValidInput,
      trip: {
        ...baseValidInput.trip!,
        bus_id: 'other-bus',
      },
    });
    assert.equal(wrongBus.success, false);
    if (!wrongBus.success) {
      assert.equal(wrongBus.code, 'TRIP_NOT_ACTIVE');
      assert.equal(wrongBus.stepFailed, 4);
    }
  });

  test('Step 5: rejects when student not on route or on approved leave with NOT_ON_ROUTE', () => {
    // Unassigned student
    const unassigned = validateBoardingScan({
      ...baseValidInput,
      studentRosterRecord: null,
    });
    assert.equal(unassigned.success, false);
    if (!unassigned.success) {
      assert.equal(unassigned.code, 'NOT_ON_ROUTE');
      assert.equal(unassigned.stepFailed, 5);
    }

    // Student on leave
    const onLeave = validateBoardingScan({
      ...baseValidInput,
      studentRosterRecord: {
        student_id: studentId,
        route_id: 'route-12',
        is_on_leave: true,
      },
    });
    assert.equal(onLeave.success, false);
    if (!onLeave.success) {
      assert.equal(onLeave.code, 'NOT_ON_ROUTE');
      assert.equal(onLeave.stepFailed, 5);
    }
  });

  test('Step 6: rejects duplicate boarding with DUPLICATE_BOARDING', () => {
    const duplicate = validateBoardingScan({
      ...baseValidInput,
      existingAttendance: {
        status: 'BOARDED',
      },
    });
    assert.equal(duplicate.success, false);
    if (!duplicate.success) {
      assert.equal(duplicate.code, 'DUPLICATE_BOARDING');
      assert.equal(duplicate.stepFailed, 6);
    }
  });

  test('Step 7: rejects scan outside boarding window with BOARDING_WINDOW_CLOSED', () => {
    // 30 minutes after departure (boarding window closed after 15 min)
    const lateNow = '2026-10-21T08:30:00.000Z';
    const closed = validateBoardingScan({
      ...baseValidInput,
      nowUtc: lateNow,
    });
    assert.equal(closed.success, false);
    if (!closed.success) {
      assert.equal(closed.code, 'BOARDING_WINDOW_CLOSED');
      assert.equal(closed.stepFailed, 7);
    }
  });

  test('Step 8: writes BOARDED and returns confirmation when all checks pass', () => {
    const success = validateBoardingScan(baseValidInput);
    assert.equal(success.success, true);
    if (success.success) {
      assert.equal(success.status, 'BOARDED');
      assert.equal(success.method, 'QR');
      assert.equal(success.bus_id, busId);
      assert.equal(success.bus_number, '12');
      assert.equal(success.boarding_stop_name, stopName);
      assert.match(success.confirmation_message, /Boarded Bus 12 on Route 12 - Mehdipatnam/);
    }
  });
});
