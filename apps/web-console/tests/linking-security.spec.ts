import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DeviceBusLinkRecord, DeviceRecord, BusRecord } from '@vjit/contracts';
import { buildLinkingScreenViewModel, type LinkingScreenFilterState } from '../dist/screens/LinkingScreen.js';

describe('Web Console: Device-to-Bus Linking & Role Guard (P4-T4, Rule E.6, ADM-05)', () => {
  const bus1: BusRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    bus_number: 'Bus 01',
    registration: 'TS 09 UA 1001',
    seating_capacity: 52,
    status: 'ACTIVE',
    insurance_expiry: '2027-04-15',
    fitness_expiry: '2027-02-10',
    pollution_expiry: '2026-12-30',
    permit_expiry: '2027-08-20',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const bus2: BusRecord = {
    ...bus1,
    id: '22222222-2222-4222-8222-222222222222',
    bus_number: 'Bus 02',
    registration: 'TS 09 UA 1002',
  };

  const device1: DeviceRecord = {
    id: '33333333-3333-4333-8333-333333333333',
    device_id: 'HW_1001',
    serial_number: 'SN-001',
    imei: '861234567890123',
    iccid: '89912345678901234567',
    status: 'ACTIVE',
    firmware_version: '1.2.0',
    first_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const device2: DeviceRecord = {
    ...device1,
    id: '44444444-4444-4444-8444-444444444444',
    device_id: 'HW_1002',
    serial_number: 'SN-002',
  };

  const activeLink: DeviceBusLinkRecord = {
    id: '55555555-5555-4555-8555-555555555555',
    device_id: 'HW_1001',
    bus_id: bus1.id,
    bus_number: bus1.bus_number,
    valid_from: '2026-09-01T00:00:00Z',
    valid_to: null,
    linked_by: 'transport@vjit.ac.in',
  };

  it('authorizes Coordinator (COR) and Super Admin (SAD) to perform linking operations', () => {
    const filters: LinkingScreenFilterState = { searchQuery: '', page: 1, pageSize: 50 };

    const vmCor = buildLinkingScreenViewModel([activeLink], [device1, device2], [bus1, bus2], filters, 'COR');
    assert.equal(vmCor.isActionAuthorized, true);

    const vmSad = buildLinkingScreenViewModel([activeLink], [device1, device2], [bus1, bus2], filters, 'SAD');
    assert.equal(vmSad.isActionAuthorized, true);
  });

  it('strictly blocks Technicians (TEC) from linking devices (Rule E.6)', () => {
    const filters: LinkingScreenFilterState = { searchQuery: '', page: 1, pageSize: 50 };

    const vmTec = buildLinkingScreenViewModel([activeLink], [device1, device2], [bus1, bus2], filters, 'TEC');
    assert.equal(vmTec.isActionAuthorized, false, 'Technicians must never have device linking authorization');
  });

  it('accurately identifies unlinked active devices and buses', () => {
    const filters: LinkingScreenFilterState = { searchQuery: '', page: 1, pageSize: 50 };

    const vm = buildLinkingScreenViewModel([activeLink], [device1, device2], [bus1, bus2], filters, 'COR');
    assert.equal(vm.unlinkedDevicesCount, 1);
    assert.deepEqual(vm.unlinkedDevicesList, ['HW_1002']);
    assert.equal(vm.unlinkedBusesCount, 1);
    assert.deepEqual(vm.unlinkedBusesList, ['Bus 02']);
  });
});
