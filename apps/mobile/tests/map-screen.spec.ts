import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BusSnapshot, RouteDetail } from '@vjit/contracts';
import { buildMapScreenViewModel, type MapScreenState } from '../dist/screens/MapScreen.js';

describe('Mobile: MapScreen & BottomSheet Controller (P2-T1, P2-T2)', () => {
  const dummyRoute: RouteDetail = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Route 06 (Mehdipatnam -> VJIT)',
    code: 'R-06',
    origin: 'Mehdipatnam',
    destination: 'VJIT Campus',
    polyline: [
      [17.385, 78.4867],
      [17.345, 78.365],
    ],
    stops: [],
    active_buses: 1,
  };

  const dummyLiveBus: BusSnapshot = {
    bus_id: '22222222-2222-4222-8222-222222222222',
    bus_number: 'Bus 14',
    registration: 'TS 09 UA 1234',
    route_id: dummyRoute.id,
    route_name: dummyRoute.name,
    state: 'LIVE_HW',
    state_label: 'Live, bus tracker',
    latitude: 17.37,
    longitude: 78.42,
    speed_kmh: 42,
    heading: 180,
    recorded_at: new Date().toISOString(),
    age_seconds: 12,
    next_stop: {
      stop_id: '33333333-3333-4333-8333-333333333333',
      name: 'Appa Junction',
      eta_seconds: 240,
      eta_formatted: '4 mins',
      distance_m: 1800,
    },
    capacity: 52,
    occupancy: 28,
    trip_id: '44444444-4444-4444-8444-444444444444',
    service_date: '2026-10-21',
  };

  it('renders visible bus markers with non-color state badges (Rule R-20)', () => {
    const state: MapScreenState = {
      buses: [dummyLiveBus],
      selectedBusId: null,
      selectedRouteId: dummyRoute.id,
      routes: [dummyRoute],
      searchQuery: '',
      activeFilter: 'ALL',
      bottomSheetSnap: 'COLLAPSED',
      isRecenterTriggered: false,
      isLoading: false,
      isOffline: false,
    };

    const vm = buildMapScreenViewModel(state, new Set());
    assert.equal(vm.visibleMarkers.length, 1);
    assert.equal(vm.visibleMarkers[0].displayTitle, 'Bus 14');
    assert.equal(vm.visibleMarkers[0].badge.label, 'Live • Bus Tracker');
    assert.match(vm.visibleMarkers[0].accessibilityLabel, /Status: Live tracking/);
  });

  it('filters visible buses by search query', () => {
    const bus2: BusSnapshot = {
      ...dummyLiveBus,
      bus_id: '55555555-5555-4555-8555-555555555555',
      bus_number: 'Bus 22',
      route_name: 'Route 10 (Secunderabad -> VJIT)',
    };

    const state: MapScreenState = {
      buses: [dummyLiveBus, bus2],
      selectedBusId: null,
      selectedRouteId: null,
      routes: [dummyRoute],
      searchQuery: 'Bus 22',
      activeFilter: 'ALL',
      bottomSheetSnap: 'COLLAPSED',
      isRecenterTriggered: false,
      isLoading: false,
      isOffline: false,
    };

    const vm = buildMapScreenViewModel(state, new Set());
    assert.equal(vm.visibleMarkers.length, 1);
    assert.equal(vm.visibleMarkers[0].displayTitle, 'Bus 22');
  });

  it('returns truthful empty state message when no buses are running', () => {
    const state: MapScreenState = {
      buses: [],
      selectedBusId: null,
      selectedRouteId: null,
      routes: [dummyRoute],
      searchQuery: '',
      activeFilter: 'ALL',
      bottomSheetSnap: 'COLLAPSED',
      isRecenterTriggered: false,
      isLoading: false,
      isOffline: false,
    };

    const vm = buildMapScreenViewModel(state, new Set());
    assert.equal(vm.visibleMarkers.length, 0);
    assert.match(vm.statusSummary.emptyStateMessage!, /No buses currently running/);
  });

  it('generates bottom sheet view model with next stop and real ETA', () => {
    const state: MapScreenState = {
      buses: [dummyLiveBus],
      selectedBusId: dummyLiveBus.bus_id,
      selectedRouteId: dummyRoute.id,
      routes: [dummyRoute],
      searchQuery: '',
      activeFilter: 'ALL',
      bottomSheetSnap: 'HALF',
      isRecenterTriggered: false,
      isLoading: false,
      isOffline: false,
    };

    const vm = buildMapScreenViewModel(state, new Set([dummyLiveBus.bus_id]));
    assert.equal(vm.bottomSheet.title, 'Bus 14 • Route 06 (Mehdipatnam -> VJIT)');
    assert.equal(vm.bottomSheet.etaDisplay, '4 mins');
    assert.equal(vm.bottomSheet.distanceDisplay, '1.8 km');
    assert.equal(vm.bottomSheet.isFavorite, true);
  });
});
