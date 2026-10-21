import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  userRoleSchema,
  ALL_USER_ROLES,
  isStaffRole,
  requiresMfa,
  createErrorEnvelope,
  errorEnvelopeSchema,
  locationSampleSchema,
  telemetryPayloadSchema,
  heartbeatPayloadSchema,
} from '../dist/index.js';

describe('Contracts: User Roles & Access Restrictions', () => {
  test('validates all 7 approved roles in SW-MVP-1.0', () => {
    for (const role of ALL_USER_ROLES) {
      assert.equal(userRoleSchema.parse(role), role);
    }
  });

  test('rejects unapproved or lowercase roles', () => {
    assert.throws(() => userRoleSchema.parse('admin'));
    assert.throws(() => userRoleSchema.parse('STUDENT'));
    assert.throws(() => userRoleSchema.parse('DRIVER'));
  });

  test('identifies staff roles correctly', () => {
    assert.equal(isStaffRole('COR'), true);
    assert.equal(isStaffRole('TEC'), true);
    assert.equal(isStaffRole('SAD'), true);
    assert.equal(isStaffRole('MGT'), true);
    assert.equal(isStaffRole('SEC'), true);
    assert.equal(isStaffRole('STU'), false);
    assert.equal(isStaffRole('FAC'), false);
  });

  test('enforces MFA requirement for staff roles', () => {
    assert.equal(requiresMfa('SAD'), true);
    assert.equal(requiresMfa('COR'), true);
    assert.equal(requiresMfa('TEC'), true);
    assert.equal(requiresMfa('MGT'), true);
    assert.equal(requiresMfa('SEC'), true);
    assert.equal(requiresMfa('STU'), false);
    assert.equal(requiresMfa('FAC'), false);
  });
});

describe('Contracts: Error Envelope Format (Part I.3)', () => {
  test('creates and validates conforming error envelope', () => {
    const envelope = createErrorEnvelope(
      'AUTH_REQUIRED',
      'No valid session found',
      'req-test-1234',
      [{ field: 'Authorization', issue: 'Header missing' }],
    );

    const parsed = errorEnvelopeSchema.parse(envelope);
    assert.equal(parsed.error.code, 'AUTH_REQUIRED');
    assert.equal(parsed.error.request_id, 'req-test-1234');
    assert.equal(parsed.error.message, 'No valid session found');
  });

  test('rejects error envelope with invalid structure', () => {
    const invalidEnvelope = {
      error: {
        code: '', // min(1) fails
        message: 'Something broke',
        request_id: 'req-001',
      },
    };
    assert.throws(() => errorEnvelopeSchema.parse(invalidEnvelope));
  });
});

describe('Contracts: Telemetry & Hardware Integration (HW-INT-1.0)', () => {
  const validSample = {
    seq: 1,
    recorded_at: '2026-10-21T10:00:00.000Z',
    latitude: 17.385044,
    longitude: 78.486671,
    speed_kmh: 42.5,
    gps_valid: true,
    hdop: 1.2,
    satellites: 9,
    ignition: true,
    battery_mv: 12600,
  };

  test('validates valid GPS location sample', () => {
    const parsed = locationSampleSchema.parse(validSample);
    assert.equal(parsed.latitude, 17.385044);
    assert.equal(parsed.gps_valid, true);
  });

  test('rejects telemetry payload exceeding 50 samples limit', () => {
    const samples = Array.from({ length: 51 }, (_, i) => ({
      ...validSample,
      seq: i + 1,
    }));

    const payload = {
      device_id: 'HW_001',
      boot_id: 'boot-uuid-1234',
      firmware_version: '1.0.0',
      samples,
    };

    assert.throws(() => telemetryPayloadSchema.parse(payload));
  });

  test('validates device heartbeat payload', () => {
    const heartbeat = {
      device_id: 'HW_001',
      boot_id: 'boot-uuid-1234',
      firmware_version: '1.0.4',
      timestamp: '2026-10-21T10:00:00.000Z',
      gps_status: 'FIX_3D' as const,
      satellites: 8,
      hdop: 1.5,
      rssi_dbm: -75,
      battery_mv: 12400,
      ignition: true,
    };

    const parsed = heartbeatPayloadSchema.parse(heartbeat);
    assert.equal(parsed.device_id, 'HW_001');
    assert.equal(parsed.ignition, true);
  });
});
