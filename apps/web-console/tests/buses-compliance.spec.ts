import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BusRecord } from '@vjit/contracts';
import { buildBusesScreenViewModel, type BusesScreenFilterState } from '../dist/screens/BusesScreen.js';

describe('Web Console: Bus Fleet & Document Compliance (P4-T1, ADM-03)', () => {
  const now = new Date('2026-10-21T00:00:00Z');

  const compliantBus: BusRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    bus_number: 'Bus 01',
    registration: 'TS 09 UA 1001',
    seating_capacity: 52,
    status: 'ACTIVE',
    insurance_expiry: '2027-04-15',
    fitness_expiry: '2027-02-10',
    pollution_expiry: '2026-12-30',
    permit_expiry: '2027-08-20',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const warningBus: BusRecord = {
    ...compliantBus,
    id: '22222222-2222-4222-8222-222222222222',
    bus_number: 'Bus 02',
    pollution_expiry: '2026-10-26', // Expires in 5 days (WARN_7_DAYS)
  };

  const expiredBus: BusRecord = {
    ...compliantBus,
    id: '33333333-3333-4333-8333-333333333333',
    bus_number: 'Bus 03',
    fitness_expiry: '2026-10-15', // Expired 6 days ago (EXPIRED)
  };

  it('evaluates compliance warnings at 30 days and 7 days (doc.expiry_warn_days)', () => {
    const filters: BusesScreenFilterState = {
      searchQuery: '',
      statusFilter: null,
      complianceFilter: 'ALL',
      page: 1,
      pageSize: 50,
    };

    const vm = buildBusesScreenViewModel([compliantBus, warningBus, expiredBus], filters, now);
    assert.equal(vm.summary.totalBuses, 3);
    assert.equal(vm.summary.nonCompliantBuses, 1);

    const warnRow = vm.buses.items.find(r => r.bus.bus_number === 'Bus 02');
    assert.ok(warnRow);
    assert.equal(warnRow.compliance.hasUpcomingWarnings, true);
    assert.equal(warnRow.compliance.hasExpiredDocuments, false);

    const pollutionCheck = warnRow.compliance.checks.find(c => c.docType === 'POLLUTION');
    assert.ok(pollutionCheck);
    assert.equal(pollutionCheck.status, 'WARN_7_DAYS');
  });

  it('identifies expired documents and filters non-compliant vehicles', () => {
    const filters: BusesScreenFilterState = {
      searchQuery: '',
      statusFilter: null,
      complianceFilter: 'EXPIRED_ONLY',
      page: 1,
      pageSize: 50,
    };

    const vm = buildBusesScreenViewModel([compliantBus, warningBus, expiredBus], filters, now);
    assert.equal(vm.buses.items.length, 1);
    assert.equal(vm.buses.items[0].bus.bus_number, 'Bus 03');
    assert.equal(vm.buses.items[0].compliance.isCompliant, false);
  });
});
