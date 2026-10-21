import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BusSnapshot, StopSummary } from '@vjit/contracts';
import { MobileApiClient } from '../dist/services/api-client.js';
import { buildBottomSheetViewModel } from '../dist/components/BottomSheet.js';
import { buildStopTimeline } from '../dist/components/StopTimeline.js';

describe('Mobile: Bus Freshness & Detail (P2-T2, Spec 17.6)', () => {
  const client = new MobileApiClient({ baseUrl: 'http://localhost:3000', staleAfterSeconds: 60 });

  it('marks positions older than 60s as STALE and never displays them as live', () => {
    const now = new Date('2026-10-21T10:00:00Z');
    const recordedAt = new Date('2026-10-21T09:58:45Z'); // 75 seconds ago

    const liveBus: BusSnapshot = {
      bus_id: '11111111-1111-4111-8111-111111111111',
      bus_number: 'Bus 08',
      registration: 'AP 28 Z 5678',
      route_id: '22222222-2222-4222-8222-222222222222',
      route_name: 'Route 02',
      state: 'LIVE_HW',
      state_label: 'Live, bus tracker',
      latitude: 17.38,
      longitude: 78.45,
      speed_kmh: 35,
      heading: 90,
      recorded_at: recordedAt.toISOString(),
      age_seconds: null,
      next_stop: null,
      capacity: 50,
      occupancy: null,
      trip_id: null,
      service_date: '2026-10-21',
    };

    const processed = client.processBusFreshness(liveBus, now);
    assert.equal(processed.state, 'STALE');
    assert.equal(processed.age_seconds, 75);
    assert.equal(processed.state_label, 'Last update 75 seconds ago');
  });

  it('displays em-dash (—) instead of simulated times when bus is UNAVAILABLE or NOT_RUNNING (Rule 263)', () => {
    const unavailableBus: BusSnapshot = {
      bus_id: '11111111-1111-4111-8111-111111111111',
      bus_number: 'Bus 08',
      registration: 'AP 28 Z 5678',
      route_id: '22222222-2222-4222-8222-222222222222',
      route_name: 'Route 02',
      state: 'UNAVAILABLE',
      state_label: 'Location unavailable',
      latitude: null,
      longitude: null,
      speed_kmh: null,
      heading: null,
      recorded_at: null,
      age_seconds: null,
      next_stop: null,
      capacity: 50,
      occupancy: null,
      trip_id: null,
      service_date: '2026-10-21',
    };

    const vm = buildBottomSheetViewModel(unavailableBus, null);
    assert.equal(vm.etaDisplay, '—');
    assert.equal(vm.distanceDisplay, '—');
  });

  it('builds stop sequence timeline with boarding stop and status badges', () => {
    const stops: StopSummary[] = [
      {
        id: 'stop-1',
        name: 'Mehdipatnam Depot',
        sequence: 1,
        latitude: 17.39,
        longitude: 78.44,
        scheduled_time: '07:30',
        status: 'DEPARTED',
      },
      {
        id: 'stop-2',
        name: 'Rethi Bowli',
        sequence: 2,
        latitude: 17.38,
        longitude: 78.43,
        scheduled_time: '07:38',
        status: 'ARRIVING',
      },
      {
        id: 'stop-3',
        name: 'Appa Junction',
        sequence: 3,
        latitude: 17.36,
        longitude: 78.38,
        scheduled_time: '07:55',
        status: 'SCHEDULED',
      },
    ];

    const timeline = buildStopTimeline(stops, 'stop-2');
    assert.equal(timeline.length, 3);
    assert.equal(timeline[0].statusBadge.label, 'Departed');
    assert.equal(timeline[1].isBoardingStop, true);
    assert.equal(timeline[1].statusBadge.label, 'Arriving now');
    assert.equal(timeline[2].statusBadge.label, 'Scheduled');
  });
});
