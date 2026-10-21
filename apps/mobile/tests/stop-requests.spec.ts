import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { StopRequestCreate, StopSummary } from '@vjit/contracts';
import { validateStopRequest, isStopRequestExpired } from '@vjit/domain';

describe('Mobile: Stop Requests & Corridor Validation (P2-T3, Spec 20.1)', () => {
  const routePolyline = [
    { latitude: 17.385, longitude: 78.4867 },
    { latitude: 17.38, longitude: 78.48 },
    { latitude: 17.375, longitude: 78.473 },
  ];

  const existingStops: StopSummary[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Existing Stop 1',
      sequence: 1,
      latitude: 17.38,
      longitude: 78.48,
      scheduled_time: '07:30',
      status: 'SCHEDULED',
    },
  ];

  it('rejects proposed stop name exceeding 60 characters', () => {
    const req: StopRequestCreate = {
      route_id: '22222222-2222-4222-8222-222222222222',
      name: 'A'.repeat(61),
      latitude: 17.3802,
      longitude: 78.4802,
    };

    const result = validateStopRequest(req, routePolyline, existingStops, 300, 100);
    assert.equal(result.valid, false);
    assert.equal(result.code, 'NAME_TOO_LONG');
  });

  it('rejects proposed stop duplicate within 100m of an existing stop', () => {
    const req: StopRequestCreate = {
      route_id: '22222222-2222-4222-8222-222222222222',
      name: 'Near Existing Stop',
      latitude: 17.3801, // ~15 meters from (17.38, 78.48)
      longitude: 78.4801,
    };

    const result = validateStopRequest(req, routePolyline, existingStops, 300, 100);
    assert.equal(result.valid, false);
    assert.equal(result.code, 'DUPLICATE_STOP');
  });

  it('rejects proposed stop outside 300m route corridor', () => {
    const req: StopRequestCreate = {
      route_id: '22222222-2222-4222-8222-222222222222',
      name: 'Far Away Stop',
      latitude: 17.42, // ~4.5 km away
      longitude: 78.50,
    };

    const result = validateStopRequest(req, routePolyline, existingStops, 300, 100);
    assert.equal(result.valid, false);
    assert.equal(result.code, 'OUTSIDE_CORRIDOR');
  });

  it('accepts valid proposed stop within corridor and not duplicate', () => {
    const req: StopRequestCreate = {
      route_id: '22222222-2222-4222-8222-222222222222',
      name: 'Valid New Junction Stop',
      latitude: 17.376, // within 200m of route polyline, > 300m from existing stop
      longitude: 78.474,
    };

    const result = validateStopRequest(req, routePolyline, existingStops, 300, 100);
    assert.equal(result.valid, true);
  });

  it('verifies stop request 7-day expiration limit', () => {
    const createdAt = '2026-10-10T10:00:00Z';
    const activeAt = '2026-10-16T10:00:00Z'; // 6 days
    const expiredAt = '2026-10-18T10:00:00Z'; // 8 days

    assert.equal(isStopRequestExpired(createdAt, activeAt, 7), false);
    assert.equal(isStopRequestExpired(createdAt, expiredAt, 7), true);
  });
});
