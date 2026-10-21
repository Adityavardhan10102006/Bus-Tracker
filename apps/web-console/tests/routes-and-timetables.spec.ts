import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RouteDetail, StopRequest } from '@vjit/contracts';
import { buildRoutesAdminViewModel } from '../dist/screens/RoutesAdminScreen.js';
import { buildTimetableScreenViewModel, type TimetableScheduleEntry } from '../dist/screens/TimetableScreen.js';

describe('Web Console: Routes, Stops & Timetables (P4-T6, P4-T10, ADM-07)', () => {
  const route1: RouteDetail = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Route 06 (Mehdipatnam -> VJIT)',
    code: 'R-06',
    origin: 'Mehdipatnam',
    destination: 'VJIT Campus',
    polyline: [],
    stops: [
      {
        id: 'stop-01',
        name: 'Mehdipatnam Depot',
        sequence: 1,
        latitude: 17.39,
        longitude: 78.44,
        scheduled_time: '07:30',
        status: 'SCHEDULED',
      },
    ],
    active_buses: 2,
  };

  const pendingStopReq: StopRequest = {
    id: '22222222-2222-4222-8222-222222222222',
    route_id: route1.id,
    name: 'Proposed Junction Stop',
    latitude: 17.385,
    longitude: 78.435,
    votes_count: 14,
    has_voted: false,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'PENDING',
  };

  const schedule1: TimetableScheduleEntry = {
    id: '33333333-3333-4333-8333-333333333333',
    route_id: route1.id,
    route_name: route1.name,
    bus_id: 'bus-01',
    bus_number: 'Bus 01',
    trip_type: 'MORNING',
    scheduled_departure: '07:30 AM',
    weekday_mask: 'Mon,Tue,Wed,Thu,Fri,Sat',
    status: 'DISPATCHED',
  };

  const scheduleCancelled: TimetableScheduleEntry = {
    id: '44444444-4444-4444-8444-444444444444',
    route_id: route1.id,
    route_name: route1.name,
    bus_id: 'bus-02',
    bus_number: 'Bus 02',
    trip_type: 'AFTERNOON',
    scheduled_departure: '04:30 PM',
    weekday_mask: 'Mon,Tue,Wed,Thu,Fri,Sat',
    status: 'CANCELLED',
    cancellation_reason: 'Vehicle mechanical inspection scheduled',
  };

  it('manages transit routes and reviews pending student stop change requests', () => {
    const vm = buildRoutesAdminViewModel([route1], [pendingStopReq], route1.id, {
      searchQuery: '',
      page: 1,
      pageSize: 50,
    });

    assert.equal(vm.totalRoutes, 1);
    assert.equal(vm.totalStops, 1);
    assert.equal(vm.corridorLimitMeters, 300);
    assert.equal(vm.pendingStopRequests.length, 1);
    assert.equal(vm.pendingStopRequests[0].votes_count, 14);
    assert.equal(vm.selectedRoute?.id, route1.id);
  });

  it('manages timetable dispatch and records mandatory cancellation reason', () => {
    const vm = buildTimetableScreenViewModel([schedule1, scheduleCancelled], {
      tripTypeFilter: null,
      searchQuery: '',
      page: 1,
      pageSize: 50,
    });

    assert.equal(vm.summary.totalScheduled, 2);
    assert.equal(vm.summary.dispatchedCount, 1);
    assert.equal(vm.summary.cancelledCount, 1);

    const cancelledItem = vm.schedules.items.find(s => s.status === 'CANCELLED');
    assert.ok(cancelledItem);
    assert.equal(cancelledItem.cancellation_reason, 'Vehicle mechanical inspection scheduled');
  });
});
