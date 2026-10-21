import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeLogData,
  runWithRequestContext,
  getCurrentRequestId,
  logger,
} from '../dist/index.js';

describe('Logger: Privacy Safeguards & PII Redaction (Rule B.7 & Task P0-T14)', () => {
  test('redacts sensitive authentication tokens and passwords', () => {
    const raw = {
      user: 'admin',
      token: 'secret_token_value_abc',
      password: 'my_super_password',
      otp: '123456',
      totp: '654321',
      authorization: 'Bearer sensitive_token_xyz',
    };

    const sanitized = sanitizeLogData(raw) as Record<string, unknown>;
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.otp, '[REDACTED]');
    assert.equal(sanitized.totp, '[REDACTED]');
    assert.equal(sanitized.authorization, '[REDACTED]');
  });

  test('redacts student coordinates, emails, and phone numbers', () => {
    const raw = {
      student_id: 'vjit-001',
      email: 'student@vjit.ac.in',
      phone: '9876543210',
      lat: 17.385,
      lng: 78.486,
      coordinates: [17.385, 78.486],
    };

    const sanitized = sanitizeLogData(raw) as Record<string, unknown>;
    assert.equal(sanitized.email, '[REDACTED]');
    assert.equal(sanitized.phone, '[REDACTED]');
    assert.equal(sanitized.lat, '[REDACTED]');
    assert.equal(sanitized.lng, '[REDACTED]');
    assert.equal(sanitized.coordinates, '[REDACTED]');
    assert.equal(sanitized.student_id, 'vjit-001');
  });

  test('propagates request id through AsyncLocalStorage context', () => {
    runWithRequestContext('req-audit-xyz-987', () => {
      const current = getCurrentRequestId();
      assert.equal(current, 'req-audit-xyz-987');
    });

    // Outside context
    assert.equal(getCurrentRequestId(), undefined);
  });
});
