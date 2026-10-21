import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DriverRosterRecord } from '@vjit/contracts';
import { buildDriverRostersViewModel } from '../dist/screens/DriverRostersScreen.js';

describe('Web Console: Driver Rosters & Conflict C-06 Disclosure (P4-T7, ADM-08)', () => {
  const roster1: DriverRosterRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    driver_id: '22222222-2222-4222-8222-222222222222',
    driver_name: 'M. Ramesh',
    license_number: 'TS09-2015-0012345',
    phone: '9848012345',
    bus_id: '33333333-3333-4333-8333-333333333333',
    bus_number: 'Bus 08',
    shift_date: '2026-10-21',
    trip_type: 'MORNING',
    status: 'ACTIVE',
  };

  it('keeps Conflict C-06 status and architectural disclosures visible on driver screens', () => {
    const vm = buildDriverRostersViewModel([roster1], {
      searchQuery: '',
      tripTypeFilter: null,
      page: 1,
      pageSize: 50,
    });

    assert.equal(vm.totalRostered, 1);
    assert.equal(vm.activeShiftsCount, 1);
    assert.equal(vm.conflictC06Banner.isOpen, true);
    assert.match(vm.conflictC06Banner.title, /Conflict C-06/);
    assert.match(vm.conflictC06Banner.details, /driver mobile application was removed/);
    assert.match(vm.conflictC06Banner.operationalWorkflow, /Web Console/);
  });
});
