import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BusSnapshot, RouteDetail } from '@vjit/contracts';
import { buildFleetDeckViewModel, type FleetDeckFilterState } from '../dist/screens/FleetDeckScreen.js';

describe('Web Console: Fleet Operations Deck & Monitoring (P4-T9, ADM-02)', () => {
  const sampleRoute: RouteDetail = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Route 06 (Mehdipatnam -> VJIT)',
    code: 'R-06',
    origin: 'Mehdipatnam',
    destination: 'VJIT Campus',
    polyline: [],
    stops: [],
    active_buses: 2,
  };

  const liveBus: BusSnapshot = {
    bus_id: '22222222-2222-4222-8222-222222222222',
    bus_number: 'Bus 01',
    registration: 'TS 09 UA 1001',
    route_id: sampleRoute.id,
    route_name: sampleRoute.name,
    state: 'LIVE_HW',
    state_label: 'Live, bus tracker',
    latitude: 17.385,
    longitude: 78.486,
    speed_kmh: 38,
    heading: 90,
    recorded_at: new Date().toISOString(),
    age_seconds: 10,
    next_stop: null,
    capacity: 52,
    occupancy: 30,
    trip_id: '33333333-3333-4333-8333-333333333333',
    service_date: '2026-10-21',
  };

  const staleBus: BusSnapshot = {
    ...liveBus,
    bus_id: '44444444-4444-4444-8444-444444444444',
    bus_number: 'Bus 02',
    state: 'STALE',
    state_label: 'Last update 85 seconds ago',
    age_seconds: 85,
  };

  const unavailableBus: BusSnapshot = {
    ...liveBus,
    bus_id: '55555555-5555-4555-8555-555555555555',
    bus_number: 'Bus 03',
    state: 'UNAVAILABLE',
    state_label: 'Location unavailable',
    latitude: null,
    longitude: null,
    age_seconds: null,
  };

  const notRunningBus: BusSnapshot = {
    ...liveBus,
    bus_id: '66666666-6666-4666-8666-666666666666',
    bus_number: 'Bus 04',
    state: 'NOT_RUNNING',
    state_label: 'Not running',
    latitude: null,
    longitude: null,
    age_seconds: null,
  };

  const allBuses = [liveBus, staleBus, unavailableBus, notRunningBus];

  it('computes accurate aggregate counters across tracking states', () => {
    const filters: FleetDeckFilterState = {
      searchQuery: '',
      routeIdFilter: null,
      stateFilter: null,
      page: 1,
      pageSize: 50,
    };

    const vm = buildFleetDeckViewModel(allBuses, [sampleRoute], filters, null, 'COR', 1);
    assert.equal(vm.counters.totalBuses, 4);
    assert.equal(vm.counters.liveBuses, 1);
    assert.equal(vm.counters.staleBuses, 1);
    assert.equal(vm.counters.unavailableBuses, 1);
    assert.equal(vm.counters.notRunningBuses, 1);
    assert.equal(vm.counters.activeIncidentsCount, 1);
  });

  it('restricts Management (MGT) role to aggregate counts only without granular tracks (Spec 16.8 / E.4)', () => {
    const filters: FleetDeckFilterState = {
      searchQuery: '',
      routeIdFilter: null,
      stateFilter: null,
      page: 1,
      pageSize: 50,
    };

    const vm = buildFleetDeckViewModel(allBuses, [sampleRoute], filters, null, 'MGT');
    assert.equal(vm.isManagementView, true);
    assert.equal(vm.counters.totalBuses, 4);
    assert.equal(vm.filteredBuses.items.length, 0, 'Management must not see granular vehicle list');
  });

  it('filters fleet list by tracking state and clearly distinguishes live from stale positions', () => {
    const filters: FleetDeckFilterState = {
      searchQuery: '',
      routeIdFilter: null,
      stateFilter: 'STALE',
      page: 1,
      pageSize: 50,
    };

    const vm = buildFleetDeckViewModel(allBuses, [sampleRoute], filters, null, 'COR');
    assert.equal(vm.filteredBuses.items.length, 1);
    assert.equal(vm.filteredBuses.items[0].bus.bus_number, 'Bus 02');
    assert.equal(vm.filteredBuses.items[0].isStale, true);
    assert.match(vm.filteredBuses.items[0].lastKnownLocationDisplay, /stale: 85s ago/);
  });
});
