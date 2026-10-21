import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBearerTokenFormat,
  evaluateDeviceAuthStatus,
  hashDeviceToken,
  validateTelemetrySample,
  processTelemetryBatch,
  resolveActiveBusForDevice,
  validateLinkReassignment,
  evaluateDeduplication,
  buildTelemetryAckResponse,
  evaluateDeviceHealth,
  evaluateHardwareEvent,
  initiateDeviceTokenRotation,
} from '../dist/index.js';

describe('GPS Telemetry: Device Authentication & Lifecycle (Spec 11.1 & Conflict C-01)', () => {
  const secretV1 = 'vjit_device_hmac_secret_key_entropy_cluster_v1';
  const validToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1'; // exactly 43 chars base64url

  test('validates strict 43-character base64url token format', () => {
    // Valid 43-char token
    const validCheck = validateBearerTokenFormat(`Bearer ${validToken}`);
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.token, validToken);

    // Invalid scheme (e.g. Basic or lowercase)
    assert.equal(validateBearerTokenFormat(`Token ${validToken}`).valid, false);

    // Token with invalid length (42 or 44 chars)
    assert.equal(validateBearerTokenFormat('Bearer short_token_123').valid, false);

    // Missing header
    assert.equal(validateBearerTokenFormat(undefined).valid, false);
  });

  test('authenticates valid device with active key version', () => {
    const tokenHash = hashDeviceToken(validToken, secretV1);
    const device = { id: 'HW_1042', status: 'ACTIVE' as const, first_used_at: new Date() };
    const storedTokens = [{ key_version: 'v1', token_hash: tokenHash, is_revoked: false }];
    const computedHashes = { v1: tokenHash };

    const result = evaluateDeviceAuthStatus(device, storedTokens, computedHashes);
    assert.equal(result.authenticated, true);
  });

  test('implements Conflict C-01: first use of PROVISIONED device activates it', () => {
    const tokenHash = hashDeviceToken(validToken, secretV1);
    const device = { id: 'HW_1042', status: 'PROVISIONED' as const, first_used_at: null };
    const storedTokens = [{ key_version: 'v1', token_hash: tokenHash, is_revoked: false }];
    const computedHashes = { v1: tokenHash };

    const result = evaluateDeviceAuthStatus(device, storedTokens, computedHashes);
    assert.equal(result.authenticated, true);
    assert.equal(result.shouldActivateDevice, true);
  });

  test('rejects REVOKED or RETIRED devices with 403 DEVICE_INACTIVE', () => {
    const tokenHash = hashDeviceToken(validToken, secretV1);
    const device = { id: 'HW_1042', status: 'RETIRED' as const };
    const storedTokens = [{ key_version: 'v1', token_hash: tokenHash, is_revoked: false }];
    const computedHashes = { v1: tokenHash };

    const result = evaluateDeviceAuthStatus(device, storedTokens, computedHashes);
    assert.equal(result.authenticated, false);
    assert.equal(result.errorCode, 'DEVICE_INACTIVE');
  });

  test('rejects revoked device token with 401 DEVICE_REVOKED', () => {
    const tokenHash = hashDeviceToken(validToken, secretV1);
    const device = { id: 'HW_1042', status: 'ACTIVE' as const };
    const storedTokens = [{ key_version: 'v1', token_hash: tokenHash, is_revoked: true }];
    const computedHashes = { v1: tokenHash };

    const result = evaluateDeviceAuthStatus(device, storedTokens, computedHashes);
    assert.equal(result.authenticated, false);
    assert.equal(result.errorCode, 'DEVICE_REVOKED');
  });
});

describe('GPS Telemetry: 14-Step Validation Pipeline (Spec 11.5 & HW-INT-1.0)', () => {
  const serverTime = new Date('2026-10-21T10:00:00.000Z');
  const baseSample = {
    seq: 101,
    recorded_at: '2026-10-21T09:59:55.000Z', // 5s ago
    latitude: 17.3616,
    longitude: 78.3245,
    speed_kmh: 35.0,
    gps_valid: true,
    hdop: 1.2,
    satellites: 9,
    ignition: true,
    battery_mv: 12600,
  };

  test('accepts valid in-bounds GPS sample with live eligibility', () => {
    const outcome = validateTelemetrySample(baseSample, { serverReceivedAt: serverTime });
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.isLiveEligible, true);
    assert.equal(outcome.isBuffered, false);
    assert.equal(outcome.rejectionReason, undefined);
  });

  test('rejects Null Island coordinates (0.0, 0.0) alone', () => {
    const sample = { ...baseSample, latitude: 0.0, longitude: 0.0 };
    const outcome = validateTelemetrySample(sample, { serverReceivedAt: serverTime });
    assert.equal(outcome.accepted, false);
    assert.equal(outcome.rejectionReason, 'NULL_ISLAND');
  });

  test('rejects future timestamps > 60s ahead of server UTC', () => {
    const sample = {
      ...baseSample,
      recorded_at: '2026-10-21T10:01:10.000Z', // +70s future
    };
    const outcome = validateTelemetrySample(sample, { serverReceivedAt: serverTime });
    assert.equal(outcome.accepted, false);
    assert.equal(outcome.rejectionReason, 'FUTURE_TIMESTAMP');
  });

  test('rejects stale timestamps > 7 days in the past', () => {
    const sample = {
      ...baseSample,
      recorded_at: '2026-10-10T10:00:00.000Z', // >10 days past
    };
    const outcome = validateTelemetrySample(sample, { serverReceivedAt: serverTime });
    assert.equal(outcome.accepted, false);
    assert.equal(outcome.rejectionReason, 'STALE_TIMESTAMP');
  });

  test('accepts buffered timestamps (10m - 7d) for history but rejects for live', () => {
    const sample = {
      ...baseSample,
      recorded_at: '2026-10-21T09:40:00.000Z', // 20 min buffered
    };
    const outcome = validateTelemetrySample(sample, { serverReceivedAt: serverTime });
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.isBuffered, true);
    assert.equal(outcome.isLiveEligible, false); // Never updates live map
  });

  test('detects implausible speed jumps (>150 km/h) and flags without live update', () => {
    const lastAccepted = {
      latitude: 17.3616,
      longitude: 78.3245,
      recorded_at: '2026-10-21T09:59:30.000Z',
    };

    // 15km jump in 25 seconds (~2160 km/h)
    const jumpSample = {
      ...baseSample,
      latitude: 17.4800,
      longitude: 78.4500,
      recorded_at: '2026-10-21T09:59:55.000Z',
    };

    const outcome = validateTelemetrySample(jumpSample, {
      serverReceivedAt: serverTime,
      lastAcceptedSample: lastAccepted,
    });

    assert.equal(outcome.isImplausibleJump, true);
    assert.equal(outcome.isLiveEligible, false);
    assert.equal(outcome.rejectionReason, 'IMPLAUSIBLE_JUMP');
  });

  test('flags clock skew over 300s while accepting sample', () => {
    const sample = {
      ...baseSample,
      recorded_at: '2026-10-21T09:54:00.000Z', // 360s skew
    };
    const outcome = validateTelemetrySample(sample, { serverReceivedAt: serverTime });
    assert.equal(outcome.hasClockSkew, true);
  });

  test('processes a mixed batch and computes accurate ack_seq', () => {
    const samples = [
      { ...baseSample, seq: 1 },
      { ...baseSample, seq: 2, latitude: 0.0, longitude: 0.0 }, // Null Island (rejected)
      { ...baseSample, seq: 3 },
    ];

    const result = processTelemetryBatch(samples, { serverReceivedAt: serverTime });
    assert.equal(result.ackSeq, 3);
    assert.equal(result.rejectedList.length, 1);
    assert.equal(result.rejectedList[0]?.seq, 2);
    assert.equal(result.rejectedList[0]?.reason, 'NULL_ISLAND');
  });
});

describe('GPS Telemetry: Deduplication & Conflict Detection (Spec 11.2 & HW-INT-1.0)', () => {
  const existingSample = {
    device_id: 'HW_1042',
    boot_id: 'boot-123',
    seq: 42,
    latitude: 17.3616,
    longitude: 78.3245,
    recorded_at: '2026-10-21T09:59:55.000Z',
  };

  test('silently accepts duplicate with identical content', () => {
    const incoming = {
      seq: 42,
      latitude: 17.3616,
      longitude: 78.3245,
      recorded_at: '2026-10-21T09:59:55.000Z',
      speed_kmh: 30,
      gps_valid: true,
      hdop: 1.2,
      satellites: 8,
      ignition: true,
      battery_mv: 12400,
    };

    const dedupe = evaluateDeduplication(incoming, 'HW_1042', 'boot-123', [existingSample]);
    assert.equal(dedupe.isDuplicate, true);
    assert.equal(dedupe.hasConflict, false);
  });

  test('flags conflict when same sequence carries different coordinates', () => {
    const conflicting = {
      seq: 42,
      latitude: 17.4000, // Different latitude
      longitude: 78.3245,
      recorded_at: '2026-10-21T09:59:55.000Z',
      speed_kmh: 30,
      gps_valid: true,
      hdop: 1.2,
      satellites: 8,
      ignition: true,
      battery_mv: 12400,
    };

    const dedupe = evaluateDeduplication(conflicting, 'HW_1042', 'boot-123', [existingSample]);
    assert.equal(dedupe.isDuplicate, true);
    assert.equal(dedupe.hasConflict, true);
  });
});

describe('GPS Telemetry: Device-Bus Association & Reassignment (Spec 13.1 & HW-INT-1.0)', () => {
  const activeLink = {
    id: 'link-101',
    device_id: 'HW_1042',
    bus_id: 'bus-vjit-08',
    valid_from: new Date('2026-10-01T00:00:00.000Z'),
    valid_to: null, // Open link
  };

  test('resolves active bus for linked device at recorded_at', () => {
    const target = new Date('2026-10-21T10:00:00.000Z');
    const result = resolveActiveBusForDevice('HW_1042', target, [activeLink]);
    assert.equal(result.busId, 'bus-vjit-08');
    assert.equal(result.linkId, 'link-101');
  });

  test('returns busId = null when device has no active link', () => {
    const target = new Date('2026-10-21T10:00:00.000Z');
    const result = resolveActiveBusForDevice('HW_9999', target, [activeLink]);
    assert.equal(result.busId, null);
  });

  test('identifies previous open links to close upon device reassignment', () => {
    const newFrom = new Date('2026-10-21T12:00:00.000Z');
    const validation = validateLinkReassignment('HW_1042', 'bus-vjit-12', newFrom, [activeLink]);
    assert.equal(validation.allowed, true);
    assert.equal(validation.linksToClose.length, 1);
    assert.equal(validation.linksToClose[0]?.id, 'link-101');
  });
});

describe('GPS Telemetry: Heartbeat & Health State Machine (Spec 11.6 & HW-INT-1.0)', () => {
  const now = new Date('2026-10-21T10:00:00.000Z');

  test('evaluates ONLINE state within 1.5x expected moving interval', () => {
    const lastHeartbeat = new Date('2026-10-21T09:59:15.000Z'); // 45s ago (moving interval 60s)
    const result = evaluateDeviceHealth({
      lastHeartbeatTime: lastHeartbeat,
      currentTime: now,
      ignition: true,
      movingIntervalSeconds: 60,
    });

    assert.equal(result.health, 'ONLINE');
    assert.equal(result.shouldAlertTechnician, false);
  });

  test('evaluates DELAYED state when heartbeat missed by > 1.5x interval', () => {
    const lastHeartbeat = new Date('2026-10-21T09:58:10.000Z'); // 110s ago (> 90s)
    const result = evaluateDeviceHealth({
      lastHeartbeatTime: lastHeartbeat,
      currentTime: now,
      ignition: true,
      movingIntervalSeconds: 60,
    });

    assert.equal(result.health, 'DELAYED');
  });

  test('evaluates OFFLINE state and flags alert if ignition was ON', () => {
    const lastHeartbeat = new Date('2026-10-21T09:50:00.000Z'); // 600s ago (> 3x 60s)
    const result = evaluateDeviceHealth({
      lastHeartbeatTime: lastHeartbeat,
      currentTime: now,
      ignition: true,
      movingIntervalSeconds: 60,
    });

    assert.equal(result.health, 'OFFLINE');
    assert.equal(result.shouldAlertTechnician, true); // Opens technician ticket per Spec 11.6
  });
});

describe('GPS Telemetry: Hardware Events & Emergency SOS (Spec 12, 19 & HW-INT-1.0)', () => {
  const now = new Date('2026-10-21T10:00:00.000Z');

  test('creates new SOS incident on initial panic button press', () => {
    const event = {
      seq: 1,
      type: 'SOS',
      triggered_at: '2026-10-21T09:59:58.000Z',
    };

    const result = evaluateHardwareEvent(event, 'bus-vjit-08', now, []);
    assert.equal(result.status, 'ACCEPTED');
    assert.equal(result.priorityAlert, true);
    assert.ok(result.incident_id);
    assert.equal(result.isDeviceDelayed, false);
  });

  test('joins existing open incident for same bus within 60s window (AC-SOS-02)', () => {
    const existingIncident = {
      id: 'existing-incident-uuid',
      bus_id: 'bus-vjit-08',
      status: 'OPEN' as const,
      created_at: new Date('2026-10-21T09:59:45.000Z'), // 15s ago
    };

    const event = {
      seq: 2,
      type: 'SOS',
      triggered_at: '2026-10-21T09:59:58.000Z',
    };

    const result = evaluateHardwareEvent(event, 'bus-vjit-08', now, [existingIncident]);
    assert.equal(result.status, 'ACCEPTED');
    assert.equal(result.incident_id, 'existing-incident-uuid');
  });

  test('flags DEVICE_DELAYED when buffered SOS arrives > 60s late', () => {
    const event = {
      seq: 3,
      type: 'SOS',
      triggered_at: '2026-10-21T09:58:00.000Z', // 120s late
    };

    const result = evaluateHardwareEvent(event, 'bus-vjit-08', now, []);
    assert.equal(result.isDeviceDelayed, true);
  });
});
