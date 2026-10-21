import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNullIsland,
  checkTimestampFreshness,
  haversineDistanceKm,
  isImplausibleJump,
  hasClockSkew,
  hashTokenHmac,
  timingSafeEqualString,
} from '../dist/index.js';

describe('Domain: Telemetry & Ingestion Validation Rules', () => {
  test('rejects Null Island coordinates (0.0, 0.0) per Spec 11.5 step 10', () => {
    assert.equal(isNullIsland({ latitude: 0, longitude: 0 }), true);
    assert.equal(isNullIsland({ latitude: 0.0000001, longitude: 0 }), true);
    assert.equal(isNullIsland({ latitude: 17.385, longitude: 78.486 }), false);
  });

  test('validates timestamp freshness windows per Spec 11.5 step 8', () => {
    const serverTime = new Date('2026-10-21T12:00:00.000Z');

    // Future timestamp beyond 60s
    const futureTime = new Date('2026-10-21T12:01:05.000Z');
    assert.equal(checkTimestampFreshness(futureTime, serverTime), 'FUTURE_TIMESTAMP');

    // Recent timestamp within 60s
    const validTime = new Date('2026-10-21T11:59:50.000Z');
    assert.equal(checkTimestampFreshness(validTime, serverTime), 'VALID_LIVE');

    // Buffered timestamp (>10 min ago, <7 days)
    const bufferedTime = new Date('2026-10-21T11:40:00.000Z');
    assert.equal(checkTimestampFreshness(bufferedTime, serverTime), 'BUFFERED');

    // Stale timestamp (>7 days ago)
    const staleTime = new Date('2026-10-10T11:00:00.000Z');
    assert.equal(checkTimestampFreshness(staleTime, serverTime), 'STALE_TIMESTAMP');
  });

  test('calculates accurate Haversine distance between coordinates', () => {
    // VJIT Campus (approx 17.3616, 78.3245) to Mehdipatnam (approx 17.3916, 78.4402)
    const p1 = { latitude: 17.3616, longitude: 78.3245 };
    const p2 = { latitude: 17.3916, longitude: 78.4402 };
    const distance = haversineDistanceKm(p1, p2);

    assert.ok(distance > 12 && distance < 14, `Expected ~12.5km, got ${distance}`);
  });

  test('detects implausible speed jumps (>150 km/h) per Spec 11.5 step 12', () => {
    const lastSample = {
      latitude: 17.3616,
      longitude: 78.3245,
      recorded_at: '2026-10-21T12:00:00.000Z',
    };

    // Jump 20km away in 30 seconds (~2400 km/h)
    const jumpSample = {
      latitude: 17.5000,
      longitude: 78.5000,
      recorded_at: '2026-10-21T12:00:30.000Z',
    };

    assert.equal(isImplausibleJump(lastSample, jumpSample, 150), true);

    // Realistic bus travel: 200m in 30 seconds (~24 km/h)
    const normalSample = {
      latitude: 17.3630,
      longitude: 78.3245,
      recorded_at: '2026-10-21T12:00:30.000Z',
    };

    assert.equal(isImplausibleJump(lastSample, normalSample, 150), false);
  });

  test('flags clock skew over 300s per Spec 11.5 step 13', () => {
    const recordedAt = new Date('2026-10-21T12:00:00.000Z');
    const receivedSkewed = new Date('2026-10-21T12:06:00.000Z'); // 360s skew
    const receivedOk = new Date('2026-10-21T12:02:00.000Z'); // 120s skew

    assert.equal(hasClockSkew(recordedAt, receivedSkewed, 300), true);
    assert.equal(hasClockSkew(recordedAt, receivedOk, 300), false);
  });

  test('computes HMAC-SHA256 and constant-time string equality', () => {
    const secret = 'vjit_test_secret_key_12345';
    const token = 'sample_device_token_xyz';
    const hash = hashTokenHmac(token, secret);

    assert.ok(hash.length === 64);
    assert.equal(timingSafeEqualString(hash, hash), true);
    assert.equal(timingSafeEqualString(hash, 'wrong_hash_value'), false);
  });
});
