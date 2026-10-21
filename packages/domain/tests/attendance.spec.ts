import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTENDANCE_CHECKIN_CAPABILITIES,
  isCheckInMethodPermitted,
} from '../dist/index.js';

describe('Domain: Attendance Check-In Architecture & C-06 Boundary', () => {
  test('permits QR, RFID, and MANUAL check-in methods per Spec 18.1', () => {
    assert.equal(isCheckInMethodPermitted('QR'), true);
    assert.equal(isCheckInMethodPermitted('RFID'), true);
    assert.equal(isCheckInMethodPermitted('MANUAL'), true);
    assert.equal(isCheckInMethodPermitted('UNKNOWN'), false);
    assert.equal(isCheckInMethodPermitted('BLUETOOTH'), false);
  });

  test('verifies fixed vehicle QR, hardware RFID, and faculty check-in are enabled', () => {
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.FIXED_VEHICLE_QR.enabled, true);
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.FIXED_VEHICLE_QR.requiresDriverApp, false);

    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.HARDWARE_RFID_TAP.enabled, true);
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.HARDWARE_RFID_TAP.requiresDriverApp, false);

    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.FACULTY_MANUAL_CHECKIN.enabled, true);
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.FACULTY_MANUAL_CHECKIN.requiresDriverApp, false);
  });

  test('enforces Conflict C-06 suspension on driver phone rotating QR generation (Decision 4)', () => {
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.DRIVER_PHONE_ROTATING_QR.enabled, false);
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.DRIVER_PHONE_ROTATING_QR.status, 'SUSPENDED_CONFLICT_C06');
    assert.equal(ATTENDANCE_CHECKIN_CAPABILITIES.DRIVER_PHONE_ROTATING_QR.requiresDriverApp, true);
    assert.match(
      ATTENDANCE_CHECKIN_CAPABILITIES.DRIVER_PHONE_ROTATING_QR.blockReason,
      /Conflict C-06/i,
    );
  });
});
