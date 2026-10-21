import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTrackingStatePresentation,
  evaluateDataFreshnessState,
} from '../dist/index.js';

describe('Domain: Tracking States & Presentation (UI-SPEC-1.0 & Rule R-20)', () => {
  test('returns verified live bus tracker state for LIVE_HW', () => {
    const pres = getTrackingStatePresentation('LIVE_HW');
    assert.equal(pres.label, 'Live, bus tracker');
    assert.equal(pres.isLive, true);
    assert.equal(pres.canDisplayCoordinates, true);
  });

  test('returns verified live backup tracker state for LIVE_PHONE', () => {
    const pres = getTrackingStatePresentation('LIVE_PHONE');
    assert.equal(pres.label, 'Live, backup tracker');
    assert.equal(pres.isLive, true);
    assert.equal(pres.canDisplayCoordinates, true);
  });

  test('returns STALE state with exact age seconds', () => {
    const pres = getTrackingStatePresentation('STALE', 45);
    assert.equal(pres.label, 'Last update 45 seconds ago');
    assert.equal(pres.isLive, false);
    assert.equal(pres.canDisplayCoordinates, true);
  });

  test('returns UNAVAILABLE when hardware/phone signal is lost', () => {
    const pres = getTrackingStatePresentation('UNAVAILABLE');
    assert.equal(pres.label, 'Location unavailable');
    assert.equal(pres.isLive, false);
    assert.equal(pres.canDisplayCoordinates, false);
  });

  test('returns NOT_RUNNING with next trip time (Rule R-20: Never shown as Offline)', () => {
    const pres = getTrackingStatePresentation('NOT_RUNNING', undefined, '08:15 AM');
    assert.equal(pres.label, 'Not running. Next trip at 08:15 AM');
    assert.notEqual(pres.label.toLowerCase().includes('offline'), true);
  });

  test('evaluates data freshness state dynamically based on cutoff thresholds', () => {
    // Active trip with HW fix 10s old -> LIVE_HW
    assert.equal(evaluateDataFreshnessState(10, true, 'HW'), 'LIVE_HW');

    // Active trip with HW fix 70s old (>60s cutoff) -> STALE
    assert.equal(evaluateDataFreshnessState(70, true, 'HW'), 'STALE');

    // Inactive trip -> NOT_RUNNING
    assert.equal(evaluateDataFreshnessState(5, false, 'HW'), 'NOT_RUNNING');
  });
});
