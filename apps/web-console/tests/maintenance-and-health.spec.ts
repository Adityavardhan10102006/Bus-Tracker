import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MaintenanceTicketRecord, FirmwareRolloutRecord } from '@vjit/contracts';
import { isEligibleForFirmwareUpdate } from '@vjit/domain';
import { buildMaintenanceBoardViewModel } from '../dist/screens/MaintenanceBoardScreen.js';
import { buildHealthRadarViewModel, type TrackerHealthEntry } from '../dist/screens/HealthRadarScreen.js';

describe('Web Console: Maintenance, Device Health Radar & Firmware (P4-T5, P4-T11, P4-T12)', () => {
  const busTicket: MaintenanceTicketRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    ticket_number: 'TKT-00101',
    entity_type: 'BUS',
    entity_id: 'bus-01',
    entity_identifier: 'Bus 01 (TS 09 UA 1001)',
    title: 'Brake pad inspection required',
    description: 'Driver reported squeaking sound during morning braking.',
    severity: 'MEDIUM',
    status: 'OPEN',
    source: 'COORDINATOR',
    assigned_to: null,
    resolution_note: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  const deviceTicket: MaintenanceTicketRecord = {
    id: '22222222-2222-4222-8222-222222222222',
    ticket_number: 'TKT-00102',
    entity_type: 'DEVICE',
    entity_id: 'HW_1001',
    entity_identifier: 'HW_1001 (Bus 01)',
    title: 'Backup battery voltage drop',
    description: 'Internal battery dropped below 3600 mV.',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    source: 'AUTO_ALERT',
    assigned_to: 'tech@vjit.ac.in',
    resolution_note: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  const tracker1: TrackerHealthEntry = {
    device_id: 'HW_1001',
    linked_bus_number: 'Bus 01',
    health: 'ONLINE',
    last_heartbeat_at: new Date().toISOString(),
    voltage_mv: 12600,
    internal_battery_mv: 4100,
    satellites: 9,
    hdop: 1.1,
    rssi_dbm: -75,
    ignition: true,
    firmware_version: '1.2.0',
  };

  const trackerLowVolt: TrackerHealthEntry = {
    ...tracker1,
    device_id: 'HW_1002',
    linked_bus_number: 'Bus 02',
    voltage_mv: 11400, // < 11800 (low battery)
    health: 'DELAYED',
  };

  const sampleRollout: FirmwareRolloutRecord = {
    id: '33333333-3333-4333-8333-333333333333',
    version: '1.3.0',
    sha256: 'a'.repeat(64),
    size_bytes: 524288,
    stage: 'CANARY_5',
    buses_targeted: 5,
    buses_updated: 5,
    buses_failed: 0,
    started_at: '2026-10-18T10:00:00Z',
    last_stage_transition_at: '2026-10-18T10:00:00Z', // > 48h ago
    is_paused: false,
    pause_reason: null,
  };

  it('separates maintenance tickets by role: TEC sees DEVICE tickets; COR sees BUS tickets', () => {
    const filters = { statusFilter: null, severityFilter: null, entityTypeFilter: null, searchQuery: '', page: 1, pageSize: 50 };

    const vmTec = buildMaintenanceBoardViewModel([busTicket, deviceTicket], filters, 'TEC');
    assert.equal(vmTec.tickets.items.length, 1);
    assert.equal(vmTec.tickets.items[0].entity_type, 'DEVICE');

    const vmCor = buildMaintenanceBoardViewModel([busTicket, deviceTicket], filters, 'COR');
    assert.equal(vmCor.tickets.items.length, 1);
    assert.equal(vmCor.tickets.items[0].entity_type, 'BUS');

    const vmSad = buildMaintenanceBoardViewModel([busTicket, deviceTicket], filters, 'SAD');
    assert.equal(vmSad.tickets.items.length, 2);
  });

  it('detects low battery and delayed trackers in health radar', () => {
    const vm = buildHealthRadarViewModel([tracker1, trackerLowVolt], [sampleRollout], {
      healthFilter: null,
      searchQuery: '',
      page: 1,
      pageSize: 50,
    });

    assert.equal(vm.summary.totalTrackers, 2);
    assert.equal(vm.summary.onlineCount, 1);
    assert.equal(vm.summary.delayedCount, 1);
    assert.equal(vm.summary.lowBatteryCount, 1);
  });

  it('enforces staged firmware safety gates: parked, ignition OFF, voltage adequate, no SOS', () => {
    // 1. Ignition is active -> blocked
    const ignActive = isEligibleForFirmwareUpdate({
      ignition: true,
      battery_mv: 12500,
      has_active_sos: false,
    });
    assert.equal(ignActive.eligible, false);
    assert.equal(ignActive.reason, 'IGNITION_ACTIVE');

    // 2. Active SOS -> blocked
    const sosActive = isEligibleForFirmwareUpdate({
      ignition: false,
      battery_mv: 12500,
      has_active_sos: true,
    });
    assert.equal(sosActive.eligible, false);
    assert.equal(sosActive.reason, 'ACTIVE_SOS');

    // 3. Low voltage (< 12000 mV) -> blocked
    const lowVolt = isEligibleForFirmwareUpdate({
      ignition: false,
      battery_mv: 11500,
      has_active_sos: false,
    });
    assert.equal(lowVolt.eligible, false);
    assert.equal(lowVolt.reason, 'VOLTAGE_TOO_LOW');

    // 4. Safe parked conditions -> approved
    const safe = isEligibleForFirmwareUpdate({
      ignition: false,
      battery_mv: 12600,
      has_active_sos: false,
    });
    assert.equal(safe.eligible, true);
  });
});
