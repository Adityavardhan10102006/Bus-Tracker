import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FleetDataStore } from '../dist/store/fleet-data-store.js';
import { getReadinessStatus } from '../dist/health/health.js';

describe('Phase 3: Persistent Storage & Administrative Change Survival', () => {
  const testPersistenceFile = path.resolve(process.cwd(), 'tmp/test-persistence-restart.json');

  test('administrative changes survive store restart without data loss', () => {
    // Clean any previous test artifacts
    if (fs.existsSync(testPersistenceFile)) {
      fs.unlinkSync(testPersistenceFile);
    }

    process.env.PERSISTENCE_FILE_PATH = testPersistenceFile;

    try {
      // 1. Initial Store Session
      const storeSession1 = new FleetDataStore();

      // Perform administrative operations
      const newBus = storeSession1.createBus({
        bus_number: 'Bus 99',
        registration: 'TS 09 UB 9999',
        seating_capacity: 55,
        status: 'ACTIVE',
        insurance_expiry: '2027-12-31',
        fitness_expiry: '2027-12-31',
        pollution_expiry: '2027-12-31',
        permit_expiry: '2027-12-31',
      });
      assert.ok(newBus.id, 'New bus must have an id');

      const linkResult = storeSession1.linkDeviceToBus('HW_1042', newBus.id, 'admin@vjit.ac.in');
      assert.equal(linkResult.success, true);

      const updatedSetting = storeSession1.updateSystemSetting(
        'stale_gps_threshold_seconds',
        75,
        'superadmin@vjit.ac.in',
        'Testing persistent threshold configuration',
      );
      assert.ok(updatedSetting);
      assert.equal(updatedSetting?.current_value, 75);

      const ticket = storeSession1.createMaintenanceTicket({
        entity_type: 'BUS',
        entity_id: newBus.id,
        entity_identifier: 'Bus 99',
        title: 'Brake Inspection',
        description: 'Scheduled campus brake pad replacement',
        severity: 'MEDIUM',
        source: 'MANUAL',
        assigned_to: 'Technician Team A',
      });
      assert.ok(ticket.ticket_number);

      // Verify file was written to disk
      assert.equal(fs.existsSync(testPersistenceFile), true, 'Storage file must exist on disk');

      // 2. Simulate API Server Shutdown & Restart (Brand New Store Instance)
      const storeSession2 = new FleetDataStore();

      // Verify new bus survived restart
      const restoredBus = storeSession2.getBusById(newBus.id);
      assert.ok(restoredBus, 'New bus must survive API restart');
      assert.equal(restoredBus?.bus_number, 'Bus 99');
      assert.equal(restoredBus?.registration, 'TS 09 UB 9999');

      // Verify device link survived restart
      const links = storeSession2.getLinks();
      const restoredLink = links.find(l => l.bus_id === newBus.id && !l.valid_to);
      assert.ok(restoredLink, 'Active device link must survive API restart');
      assert.equal(restoredLink?.device_id, 'HW_1042');

      // Verify updated setting survived restart
      const settings = storeSession2.getSystemSettings();
      const restoredSetting = settings.find(s => s.key === 'stale_gps_threshold_seconds');
      assert.equal(restoredSetting?.current_value, 75, 'Config setting update must survive API restart');

      // Verify ticket survived restart
      const tickets = storeSession2.getMaintenanceTickets();
      const restoredTicket = tickets.find(t => t.id === ticket.id);
      assert.ok(restoredTicket, 'Maintenance ticket must survive API restart');
      assert.equal(restoredTicket?.title, 'Brake Inspection');

      // Verify audit trail survived restart
      const auditLogs = storeSession2.getAuditLogs(10);
      assert.ok(auditLogs.length > 0, 'Audit trail must persist across restarts');
    } finally {
      // Clean up test file
      delete process.env.PERSISTENCE_FILE_PATH;
      if (fs.existsSync(testPersistenceFile)) {
        fs.unlinkSync(testPersistenceFile);
      }
    }
  });

  test('readiness check reports database status honestly without fake connections', async () => {
    // Disconnected state
    const disconnectedStatus = await getReadinessStatus(async () => {
      throw new Error('Connection refused at localhost:5432');
    });
    assert.equal(disconnectedStatus.status, 'unready');
    assert.equal(disconnectedStatus.database, 'disconnected');

    // Connected state
    const connectedStatus = await getReadinessStatus(async () => true);
    assert.equal(connectedStatus.status, 'ok');
    assert.equal(connectedStatus.database, 'connected');
  });
});
