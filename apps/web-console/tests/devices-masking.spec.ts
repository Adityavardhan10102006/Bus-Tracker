import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DeviceRecord } from '@vjit/contracts';
import { generateDeviceToken } from '@vjit/domain';
import { buildDevicesScreenViewModel, type DevicesScreenFilterState } from '../dist/screens/DevicesScreen.js';

describe('Web Console: Device Provisioning & Role-Based Masking (P4-T2, ADM-04)', () => {
  const now = new Date('2026-10-21T00:00:00Z');

  const activeDevice: DeviceRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    device_id: 'HW_1001',
    serial_number: 'SN-987654321',
    imei: '861234567890123',
    iccid: '89912345678901234567',
    status: 'ACTIVE',
    firmware_version: '1.2.0',
    first_used_at: '2026-09-01T10:00:00Z',
    created_at: '2026-08-15T10:00:00Z',
  };

  const oldUnconnectedDevice: DeviceRecord = {
    id: '22222222-2222-4222-8222-222222222222',
    device_id: 'HW_1002',
    serial_number: 'SN-123456789',
    imei: '869876543210987',
    iccid: '89998765432109876543',
    status: 'PROVISIONED',
    firmware_version: '1.0.0',
    first_used_at: null,
    created_at: '2026-09-01T10:00:00Z', // 50 days ago (> 30 days)
  };

  const allDevices = [activeDevice, oldUnconnectedDevice];

  it('masks IMEI and ICCID to last 4 digits for Coordinator (COR) and Technician (TEC)', () => {
    const filters: DevicesScreenFilterState = {
      searchQuery: '',
      statusFilter: null,
      page: 1,
      pageSize: 50,
    };

    const vmCor = buildDevicesScreenViewModel(allDevices, filters, 'COR', now);
    assert.equal(vmCor.isUnmasked, false);
    const itemCor = vmCor.devices.items[0];
    assert.equal(itemCor.imei, '***********0123');
    assert.equal(itemCor.iccid, '****************4567');
    assert.equal(itemCor.isMasked, true);

    const vmTec = buildDevicesScreenViewModel(allDevices, filters, 'TEC', now);
    assert.equal(vmTec.isUnmasked, false);
    const itemTec = vmTec.devices.items[0];
    assert.equal(itemTec.imei, '***********0123');
  });

  it('displays unmasked IMEI and ICCID exclusively to Super Admin (SAD)', () => {
    const filters: DevicesScreenFilterState = {
      searchQuery: '',
      statusFilter: null,
      page: 1,
      pageSize: 50,
    };

    const vmSad = buildDevicesScreenViewModel(allDevices, filters, 'SAD', now);
    assert.equal(vmSad.isUnmasked, true);
    const itemSad = vmSad.devices.items[0];
    assert.equal(itemSad.imei, '861234567890123');
    assert.equal(itemSad.iccid, '89912345678901234567');
    assert.equal(itemSad.isMasked, false);
  });

  it('flags not-yet-connected warning for devices provisioned over 30 days without first use', () => {
    const filters: DevicesScreenFilterState = {
      searchQuery: '',
      statusFilter: null,
      page: 1,
      pageSize: 50,
    };

    const vm = buildDevicesScreenViewModel(allDevices, filters, 'SAD', now);
    assert.equal(vm.summary.notYetConnectedCount, 1);
    const oldItem = vm.devices.items.find(d => d.device_id === 'HW_1002');
    assert.ok(oldItem);
    assert.equal(oldItem.notYetConnectedWarning, true);
  });

  it('generates 256-bit device token with 43-character base64url encoding (HW-SPEC 13.2)', () => {
    const { plaintextToken, hmacSha256 } = generateDeviceToken();
    assert.equal(plaintextToken.length, 43, '256-bit base64url token must be exactly 43 chars');
    assert.equal(hmacSha256.length, 64, 'HMAC-SHA256 hex digest must be 64 chars');
  });
});
