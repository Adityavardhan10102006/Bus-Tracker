import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRouteEtas,
  calculateEffectiveSpeed,
  formatEta,
  type BusTelemetryInput,
  type RouteStop,
} from '../dist/index.js';

describe('Domain: Arrival Estimation (ETA) Engine (Spec 17.5 & Rule 263)', () => {
  // A realistic 3-point route corridor in Hyderabad (VJIT Campus area)
  // Stop 1 (Start) -> Stop 2 (Midpoint) -> Stop 3 (VJIT Gate)
  const routePolyline: Array<[number, number]> = [
    [17.3800, 78.3600],
    [17.3820, 78.3620],
    [17.3850, 78.3650],
    [17.3880, 78.3680],
  ];

  const stops: RouteStop[] = [
    { id: 'stop-1', name: 'Start Junction', sequence: 1, latitude: 17.3800, longitude: 78.3600 },
    { id: 'stop-2', name: 'Midpoint Circle', sequence: 2, latitude: 17.3835, longitude: 78.3635 },
    { id: 'stop-3', name: 'VJIT Main Gate', sequence: 3, latitude: 17.3880, longitude: 78.3680 },
  ];

  const nowUtc = '2026-10-21T08:15:00.000Z';
  const nowMs = new Date(nowUtc).getTime();

  test('calculates accurate downstream ETAs along route polyline for live bus', () => {
    // Bus is positioned near Stop 1 progressing toward Stop 2
    const bus: BusTelemetryInput = {
      latitude: 17.3810,
      longitude: 78.3610,
      speed_kmh: 30,
      recorded_at: '2026-10-21T08:14:50.000Z', // 10s ago (fresh)
      state: 'LIVE_HW',
      speed_history: [
        { speed_kmh: 28, recorded_at: '2026-10-21T08:13:00.000Z' },
        { speed_kmh: 32, recorded_at: '2026-10-21T08:14:00.000Z' },
      ],
    };

    const result = calculateRouteEtas(bus, routePolyline, stops, nowUtc);

    assert.equal(result.is_available, true);
    assert.ok(result.effective_speed_kmh >= 25 && result.effective_speed_kmh <= 35);
    assert.ok(result.next_stop !== null);
    assert.equal(result.next_stop?.name, 'Midpoint Circle');
    assert.ok(result.next_stop?.eta_seconds! > 0);
    assert.notEqual(result.next_stop?.eta_formatted, '—');

    // Downstream Stop 3 has a larger ETA than Stop 2
    const stop2 = result.stops.find(s => s.sequence === 2);
    const stop3 = result.stops.find(s => s.sequence === 3);
    assert.ok(stop3?.eta_seconds! > stop2?.eta_seconds!);
    assert.equal(stop2?.is_passed, false);
    assert.equal(stop3?.is_passed, false);
  });

  test('marks upstream stops as passed (is_passed: true, eta: —)', () => {
    // Bus is positioned beyond Stop 2, approaching Stop 3
    const bus: BusTelemetryInput = {
      latitude: 17.3860,
      longitude: 78.3660,
      speed_kmh: 30,
      recorded_at: '2026-10-21T08:14:55.000Z',
      state: 'LIVE_HW',
    };

    const result = calculateRouteEtas(bus, routePolyline, stops, nowUtc);
    assert.equal(result.is_available, true);

    const stop1 = result.stops.find(s => s.sequence === 1);
    const stop2 = result.stops.find(s => s.sequence === 2);
    const stop3 = result.stops.find(s => s.sequence === 3);

    assert.equal(stop1?.is_passed, true);
    assert.equal(stop1?.eta_formatted, '—');
    assert.equal(stop2?.is_passed, true);
    assert.equal(stop2?.eta_formatted, '—');

    assert.equal(stop3?.is_passed, false);
    assert.ok(stop3?.eta_seconds! > 0);
    assert.equal(result.next_stop?.stop_id, 'stop-3');
  });

  test('Rule 263: returns unavailable state when GPS is STALE (>60s old)', () => {
    // Bus state marked STALE
    const staleStateBus: BusTelemetryInput = {
      latitude: 17.3810,
      longitude: 78.3610,
      speed_kmh: 30,
      recorded_at: '2026-10-21T08:14:50.000Z',
      state: 'STALE',
    };
    const staleResult = calculateRouteEtas(staleStateBus, routePolyline, stops, nowUtc);
    assert.equal(staleResult.is_available, false);
    assert.equal(staleResult.unavailability_reason, 'STALE_GPS');
    assert.equal(staleResult.next_stop, null);
    assert.ok(staleResult.stops.every(s => s.eta_formatted === '—'));

    // Bus timestamp older than 60s
    const oldTimestampBus: BusTelemetryInput = {
      latitude: 17.3810,
      longitude: 78.3610,
      speed_kmh: 30,
      recorded_at: '2026-10-21T08:13:00.000Z', // 120s ago
      state: 'LIVE_HW',
    };
    const oldResult = calculateRouteEtas(oldTimestampBus, routePolyline, stops, nowUtc);
    assert.equal(oldResult.is_available, false);
    assert.equal(oldResult.unavailability_reason, 'STALE_GPS');
  });

  test('returns unavailable state when bus is UNAVAILABLE or NOT_RUNNING', () => {
    const offlineBus: BusTelemetryInput = {
      latitude: null,
      longitude: null,
      speed_kmh: null,
      recorded_at: null,
      state: 'UNAVAILABLE',
    };
    const offlineResult = calculateRouteEtas(offlineBus, routePolyline, stops, nowUtc);
    assert.equal(offlineResult.is_available, false);
    assert.equal(offlineResult.unavailability_reason, 'OFFLINE_OR_UNAVAILABLE');

    const notRunningBus: BusTelemetryInput = {
      latitude: 17.3810,
      longitude: 78.3610,
      speed_kmh: 0,
      recorded_at: nowUtc,
      state: 'NOT_RUNNING',
    };
    const notRunningResult = calculateRouteEtas(notRunningBus, routePolyline, stops, nowUtc);
    assert.equal(notRunningResult.is_available, false);
    assert.equal(notRunningResult.unavailability_reason, 'BUS_NOT_RUNNING');
  });

  test('rejects Null Island coordinates', () => {
    const nullIslandBus: BusTelemetryInput = {
      latitude: 0,
      longitude: 0,
      speed_kmh: 30,
      recorded_at: nowUtc,
      state: 'LIVE_HW',
    };
    const result = calculateRouteEtas(nullIslandBus, routePolyline, stops, nowUtc);
    assert.equal(result.is_available, false);
    assert.equal(result.unavailability_reason, 'INSUFFICIENT_COORDINATES');
  });

  test('returns OFF_CORRIDOR when bus deviates > 300m from route polyline', () => {
    // Coordinate 2 km away from route corridor
    const offCorridorBus: BusTelemetryInput = {
      latitude: 17.4100, // significantly north
      longitude: 78.3900,
      speed_kmh: 35,
      recorded_at: nowUtc,
      state: 'LIVE_HW',
    };
    const result = calculateRouteEtas(offCorridorBus, routePolyline, stops, nowUtc);
    assert.equal(result.is_available, false);
    assert.equal(result.unavailability_reason, 'OFF_CORRIDOR');
    assert.equal(result.next_stop, null);
  });

  test('smooths speed across 5-minute rolling window and clamps to 10-60 km/h', () => {
    // Clamp high speed (e.g. 100 km/h clamped to 60)
    const clampedHigh = calculateEffectiveSpeed(100, [], nowMs);
    assert.equal(clampedHigh, 60);

    // Clamp low speed (e.g. 2 km/h clamped to 10)
    const clampedLow = calculateEffectiveSpeed(2, [], nowMs);
    assert.equal(clampedLow, 10);

    // Default fallback when speed is 0 or null
    const fallback = calculateEffectiveSpeed(0, [], nowMs);
    assert.equal(fallback, 20); // default speed

    // Rolling average over past 5 min
    const history = [
      { speed_kmh: 20, recorded_at: new Date(nowMs - 60000).toISOString() },
      { speed_kmh: 40, recorded_at: new Date(nowMs - 120000).toISOString() },
      { speed_kmh: 60, recorded_at: new Date(nowMs - 180000).toISOString() },
      // Sample older than 5 min (> 300s) should be excluded
      { speed_kmh: 80, recorded_at: new Date(nowMs - 360000).toISOString() },
    ];
    const avg = calculateEffectiveSpeed(null, history, nowMs);
    assert.equal(avg, 40); // (20 + 40 + 60) / 3 = 40
  });

  test('formats ETA string accurately', () => {
    assert.equal(formatEta(null), '—');
    assert.equal(formatEta(-5), '—');
    assert.equal(formatEta(30), '< 1 min');
    assert.equal(formatEta(300), '5 min');
    assert.equal(formatEta(3600), '1h');
    assert.equal(formatEta(4500), '1h 15m');
  });
});
