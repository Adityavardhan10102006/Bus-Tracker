import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAttendanceTransition,
  enforceNoAttendanceDeletion,
} from '../dist/index.js';

describe('Domain: Attendance State Machine & Immutability (Spec 18.4)', () => {
  test('allows valid status transitions from EXPECTED', () => {
    assert.equal(validateAttendanceTransition('EXPECTED', 'BOARDED').allowed, true);
    assert.equal(
      validateAttendanceTransition('EXPECTED', 'LATE_BOARDED', 'Traffic delay').allowed,
      true,
    );
    assert.equal(validateAttendanceTransition('EXPECTED', 'ON_LEAVE').allowed, true);
    assert.equal(validateAttendanceTransition('EXPECTED', 'ABSENT').allowed, true);
  });

  test('requires a non-empty reason when transitioning to LATE_BOARDED', () => {
    const withoutReason = validateAttendanceTransition('EXPECTED', 'LATE_BOARDED', '');
    assert.equal(withoutReason.allowed, false);
    assert.equal(withoutReason.code, 'REASON_REQUIRED');

    const withWhitespace = validateAttendanceTransition('EXPECTED', 'LATE_BOARDED', '   ');
    assert.equal(withWhitespace.allowed, false);
    assert.equal(withWhitespace.code, 'REASON_REQUIRED');

    const withReason = validateAttendanceTransition(
      'EXPECTED',
      'LATE_BOARDED',
      'Student arrived at secondary gate with coordinator permission',
    );
    assert.equal(withReason.allowed, true);
  });

  test('allows ON_LEAVE -> EXPECTED when leave is cancelled', () => {
    assert.equal(validateAttendanceTransition('ON_LEAVE', 'EXPECTED').allowed, true);
  });

  test('allows ABSENT -> LATE_BOARDED if student arrives after cutoff with reason', () => {
    const result = validateAttendanceTransition(
      'ABSENT',
      'LATE_BOARDED',
      'Missed first stop, caught up at Stop 4',
    );
    assert.equal(result.allowed, true);
  });

  test('rejects illegal status transitions', () => {
    // BOARDED is terminal in normal FSM
    assert.equal(validateAttendanceTransition('BOARDED', 'ABSENT').allowed, false);
    assert.equal(validateAttendanceTransition('BOARDED', 'EXPECTED').allowed, false);

    // LATE_BOARDED is terminal
    assert.equal(validateAttendanceTransition('LATE_BOARDED', 'ABSENT').allowed, false);

    // ON_LEAVE cannot directly become BOARDED without cancelling leave
    assert.equal(validateAttendanceTransition('ON_LEAVE', 'BOARDED').allowed, false);
  });

  test('enforces hard-delete prohibition rule (AG-MASTER Part C P5-T4)', () => {
    const deletionAttempt = enforceNoAttendanceDeletion();
    assert.equal(deletionAttempt.allowed, false);
    assert.equal(deletionAttempt.code, 'HARD_DELETE_PROHIBITED');
  });
});
