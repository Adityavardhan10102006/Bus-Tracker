import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateLeaveCutoff } from '@vjit/domain';

describe('Mobile: Student Leave Management (P2-T6, Spec 18.7)', () => {
  it('allows marking leave when current time is at least 30 minutes before trip departure', () => {
    const departure = '2026-10-21T07:30:00Z';
    const now = '2026-10-21T06:50:00Z'; // 40 minutes before

    const check = validateLeaveCutoff(departure, now, 30, false);
    assert.equal(check.allowed, true);
    assert.equal(check.minutesUntilCutoff, 10);
  });

  it('rejects leave submission within 30 minutes of departure cutoff', () => {
    const departure = '2026-10-21T07:30:00Z';
    const now = '2026-10-21T07:15:00Z'; // 15 minutes before

    const check = validateLeaveCutoff(departure, now, 30, false);
    assert.equal(check.allowed, false);
    assert.equal(check.code, 'PAST_CUTOFF');
    assert.match(check.message!, /Cutoff passed/);
  });

  it('rejects leave submission after passenger has already boarded', () => {
    const departure = '2026-10-21T07:30:00Z';
    const now = '2026-10-21T06:45:00Z';

    const check = validateLeaveCutoff(departure, now, 30, true);
    assert.equal(check.allowed, false);
    assert.equal(check.code, 'ALREADY_BOARDED');
  });
});
