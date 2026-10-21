import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLivenessStatus,
  getReadinessStatus,
  getVersionInfo,
} from '../dist/health/health.js';
import {
  resolveRequestId,
  isAllowedContentType,
} from '../dist/middleware/security.js';

describe('API: Health & Observability Endpoints (Spec 31.1 & Task P0-T16)', () => {
  test('returns liveness ok status', () => {
    const liveness = getLivenessStatus();
    assert.equal(liveness.status, 'ok');
    assert.ok(liveness.timestamp);
    assert.ok(liveness.uptimeSeconds >= 0);
  });

  test('returns readiness status based on database connectivity check', async () => {
    const readyHealthy = await getReadinessStatus(async () => true);
    assert.equal(readyHealthy.status, 'ok');
    assert.equal(readyHealthy.database, 'connected');

    const readyUnhealthy = await getReadinessStatus(async () => false);
    assert.equal(readyUnhealthy.status, 'unready');
    assert.equal(readyUnhealthy.database, 'disconnected');
  });

  test('returns valid version metadata', () => {
    const version = getVersionInfo('local');
    assert.equal(version.version, '1.0.0-foundation');
    assert.equal(version.environment, 'local');
    assert.equal(version.service, 'vjit-bus-tracker-api');
  });
});

describe('API: Security Headers and Request Context', () => {
  test('echoes valid incoming request id or generates a new one', () => {
    const incomingId = 'client-req-999-aaa';
    const resolved = resolveRequestId(incomingId);
    assert.equal(resolved, incomingId);

    const generated = resolveRequestId(undefined);
    assert.ok(generated.length >= 32);
  });

  test('enforces application/json content type on write operations', () => {
    const jsonReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    } as any;
    assert.equal(isAllowedContentType(jsonReq), true);

    const textReq = {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
    } as any;
    assert.equal(isAllowedContentType(textReq), false);

    const getReq = {
      method: 'GET',
      headers: {},
    } as any;
    assert.equal(isAllowedContentType(getReq), true);
  });
});
