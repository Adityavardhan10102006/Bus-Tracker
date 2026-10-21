import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBoardingWindow } from '../dist/index.js';

describe('Domain: Boarding Window Evaluator (Spec 18.5)', () => {
  const scheduledDeparture = '2026-10-21T08:00:00.000Z';

  test('rejects check-in before window opens (earlier than 10 min before departure)', () => {
    // 15 minutes before departure (07:45)
    const now = '2026-10-21T07:45:00.000Z';
    const result = evaluateBoardingWindow(scheduledDeparture, now);

    assert.equal(result.isOpen, false);
    assert.equal(result.code, 'BEFORE_WINDOW');
    assert.equal(result.minutesUntilOpen, 5);
  });

  test('allows check-in inside valid window (10 min before to 15 min after departure)', () => {
    // Exactly 10 minutes before departure (07:50) -> opens
    const opens = evaluateBoardingWindow(scheduledDeparture, '2026-10-21T07:50:00.000Z');
    assert.equal(opens.isOpen, true);

    // At scheduled departure (08:00) -> open
    const atDep = evaluateBoardingWindow(scheduledDeparture, '2026-10-21T08:00:00.000Z');
    assert.equal(atDep.isOpen, true);

    // 10 minutes after departure (08:10) -> open
    const inside = evaluateBoardingWindow(scheduledDeparture, '2026-10-21T08:10:00.000Z');
    assert.equal(inside.isOpen, true);

    // Exactly 15 minutes after departure (08:15) -> still open
    const atClose = evaluateBoardingWindow(scheduledDeparture, '2026-10-21T08:15:00.000Z');
    assert.equal(atClose.isOpen, true);
  });

  test('rejects check-in after window closes (> 15 min after scheduled departure)', () => {
    // 16 minutes after departure (08:16)
    const now = '2026-10-21T08:16:00.000Z';
    const result = evaluateBoardingWindow(scheduledDeparture, now);

    assert.equal(result.isOpen, false);
    assert.equal(result.code, 'AFTER_WINDOW');
  });

  test('extends closing boundary for late-started trip based on actual departure', () => {
    // Trip was scheduled at 08:00, but actually departed at 08:20 (20 min late)
    const actualDeparture = '2026-10-21T08:20:00.000Z';

    // At 08:25 (25 min past scheduled, but only 5 min past actual)
    const now = '2026-10-21T08:25:00.000Z';
    const result = evaluateBoardingWindow(scheduledDeparture, now, actualDeparture);

    assert.equal(result.isOpen, true);
    assert.equal(result.minutesUntilClose, 10);

    // Closes at actual + 15 min (08:35)
    const closed = evaluateBoardingWindow(
      scheduledDeparture,
      '2026-10-21T08:36:00.000Z',
      actualDeparture,
    );
    assert.equal(closed.isOpen, false);
    assert.equal(closed.code, 'AFTER_WINDOW');
  });

  test('handles invalid date input gracefully', () => {
    const result = evaluateBoardingWindow('invalid-date', 'not-a-timestamp');
    assert.equal(result.isOpen, false);
    assert.equal(result.code, 'INVALID_DATE');
  });
});
