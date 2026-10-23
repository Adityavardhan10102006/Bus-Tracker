import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiServer } from '../dist/main.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';

describe('Hardware, Bus, Route & Student Workflow Tests (Production Verification)', () => {
  let server: http.Server;
  let port: number;

  before(async () => {
    server = createApiServer();
    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const address = server.address() as any;
        port = address.port;
        resolve();
      });
    });
  });

  after(async () => {
    fleetDataStore.switchUserRole('COR');
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  async function request(options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<{ status: number; text: string; json?: any }> {
    return new Promise((resolve, reject) => {
      const payload = options.body ? JSON.stringify(options.body) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: options.path,
          method: options.method ?? 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...options.headers,
          },
        },
        res => {
          let raw = '';
          res.on('data', chunk => {
            raw += chunk;
          });
          res.on('end', () => {
            let json;
            try {
              json = JSON.parse(raw);
            } catch (_) {}
            resolve({ status: res.statusCode ?? 500, text: raw, json });
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // 1. HARDWARE DEVICE REGISTRATION & VALIDATION
  test('P-REG-01: Permitted administrator can register a valid GPS tracker device', async () => {
    fleetDataStore.switchUserRole('COR');
    const newDeviceId = 'HW_TEST_' + Date.now();
    const newSerial = 'SN-ESP8266-' + Math.floor(1000 + Math.random() * 9000);
    const newImei = '86' + Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

    const res = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: newDeviceId,
        serial_number: newSerial,
        model: 'ESP8266-NEO6M',
        nickname: 'Front Windshield Unit 9',
        imei: newImei,
        sim_number: '8991101200003456789',
        firmware_version: '1.2.0',
        status: 'ACTIVE',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.json?.success, true);
    assert.equal(res.json?.device?.device_id, newDeviceId);
    assert.equal(res.json?.device?.model, 'ESP8266-NEO6M');
    assert.equal(res.json?.device?.nickname, 'Front Windshield Unit 9');
    // Secret tokens must NEVER be leaked in the response object
    assert.equal(res.json?.device?.auth_token, undefined);
    assert.equal(res.json?.device?.auth_token_hash, undefined);
  });

  test('P-REG-02: Technician (TEC) can register hardware devices and edit metadata', async () => {
    fleetDataStore.switchUserRole('TEC');
    const tecDeviceId = 'HW_TEC_' + Date.now();
    const tecSerial = 'SN-TELT-' + Math.floor(1000 + Math.random() * 9000);
    const tecImei = '86' + Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

    const createRes = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: tecDeviceId,
        serial_number: tecSerial,
        model: 'TELTONIKA-FMB920',
        nickname: 'Depot Spare 2',
        imei: tecImei,
        firmware_version: '1.0.0',
        status: 'PROVISIONED',
      },
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.json?.device?.device_id, tecDeviceId);

    // Technician edits metadata
    const updateRes = await request({
      path: `/api/v1/devices/${tecDeviceId}`,
      method: 'PUT',
      body: {
        model: 'TELTONIKA-FMB920-PLUS',
        nickname: 'Bench Tested Unit 2',
        firmware_version: '1.0.1',
        status: 'ACTIVE',
      },
    });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.json?.device?.model, 'TELTONIKA-FMB920-PLUS');
    assert.equal(updateRes.json?.device?.nickname, 'Bench Tested Unit 2');
    assert.equal(updateRes.json?.device?.firmware_version, '1.0.1');
  });

  test('P-REG-03: Rejection of duplicate device ID, duplicate serial number, and duplicate IMEI', async () => {
    fleetDataStore.switchUserRole('COR');
    const existing = fleetDataStore.getDevices()[0];

    // Duplicate Device ID
    const dupIdRes = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: existing.device_id,
        serial_number: 'SN-UNIQUE-9999',
        model: 'ESP8266-NEO6M',
        imei: '861111111111111',
      },
    });
    assert.equal(dupIdRes.status, 409);
    assert.match(dupIdRes.json?.error?.message, /already (exists|registered)/i);

    // Duplicate Serial Number
    const dupSerialRes = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: 'HW_UNIQUE_9999',
        serial_number: existing.serial_number,
        model: 'ESP8266-NEO6M',
        imei: '861111111111111',
      },
    });
    assert.equal(dupSerialRes.status, 409);
    assert.match(dupSerialRes.json?.error?.message, /already (exists|registered)/i);

    // Duplicate IMEI
    const dupImeiRes = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: 'HW_UNIQUE_9998',
        serial_number: 'SN-UNIQUE-9998',
        model: 'ESP8266-NEO6M',
        imei: existing.imei,
      },
    });
    assert.equal(dupImeiRes.status, 409);
    assert.match(dupImeiRes.json?.error?.message, /already (exists|registered)/i);
  });

  test('P-REG-04: Unauthorized roles (SEC, MGT) cannot register or edit devices', async () => {
    fleetDataStore.switchUserRole('SEC');
    const resSec = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: 'HW_SEC_ATTEMPT',
        serial_number: 'SN-SEC-9999',
        model: 'ESP8266-NEO6M',
        imei: '869999999999999',
      },
    });
    assert.equal(resSec.status, 403);

    fleetDataStore.switchUserRole('MGT');
    const resMgt = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: 'HW_MGT_ATTEMPT',
        serial_number: 'SN-MGT-9999',
        model: 'ESP8266-NEO6M',
        imei: '869999999999998',
      },
    });
    assert.equal(resMgt.status, 403);
  });

  // 2. RULE E.6 RBAC RESTRICTION & ASSIGNMENT INTEGRITY
  test('P-LNK-01: Rule E.6 blocks Technicians (TEC) from linking or unlinking devices to buses', async () => {
    fleetDataStore.switchUserRole('TEC');
    const device = fleetDataStore.getDevices()[0];
    const bus = fleetDataStore.getBuses()[0];

    // Attempt link
    const linkRes = await request({
      path: `/api/v1/devices/${device.device_id}/link`,
      method: 'POST',
      body: { bus_id: bus.id },
    });
    assert.equal(linkRes.status, 403);
    assert.match(linkRes.json?.error?.message, /Rule E\.6/i);

    // Attempt unlink
    const unlinkRes = await request({
      path: `/api/v1/devices/${device.device_id}/unlink`,
      method: 'POST',
    });
    assert.equal(unlinkRes.status, 403);
    assert.match(unlinkRes.json?.error?.message, /Rule E\.6/i);
  });

  test('P-LNK-02: Permitted coordinator (COR) can associate device to bus and reassign safely', async () => {
    fleetDataStore.switchUserRole('COR');
    const deviceId = 'HW_LNK_' + Date.now();
    const serial = 'SN-LNK-' + Date.now();
    const imei = '86' + Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

    // Register test device first
    const regRes = await request({
      path: '/api/v1/devices',
      method: 'POST',
      body: {
        device_id: deviceId,
        serial_number: serial,
        model: 'Teltonika FMB920',
        nickname: 'Workflow Test Unit',
        imei,
        status: 'PROVISIONED',
      },
    });
    assert.equal(regRes.status, 201);

    const bus1 = fleetDataStore.createBus({
      bus_number: 'Bus LNK-1-' + Date.now(),
      registration: 'TS 09 UB ' + Math.floor(1000 + Math.random() * 9000),
      status: 'ACTIVE',
    });
    const bus2 = fleetDataStore.createBus({
      bus_number: 'Bus LNK-2-' + Date.now(),
      registration: 'TS 09 UB ' + Math.floor(1000 + Math.random() * 9000),
      status: 'ACTIVE',
    });

    // Link HW_3041 to bus1
    const res1 = await request({
      path: `/api/v1/devices/${deviceId}/link`,
      method: 'POST',
      body: { bus_id: bus1.id },
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.json?.link?.bus_id, bus1.id);

    // Verify 1:1 active link rule
    const activeLinks1 = fleetDataStore.getLinks().filter(l => l.device_id === deviceId && !l.valid_to);
    assert.equal(activeLinks1.length, 1);
    assert.equal(activeLinks1[0].bus_id, bus1.id);

    // Reassign HW_3041 to bus2
    const res2 = await request({
      path: `/api/v1/devices/${deviceId}/link`,
      method: 'POST',
      body: { bus_id: bus2.id },
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.json?.link?.bus_id, bus2.id);

    // Verify previous link to bus1 was closed and exactly one active link exists
    const activeLinks2 = fleetDataStore.getLinks().filter(l => l.device_id === deviceId && !l.valid_to);
    assert.equal(activeLinks2.length, 1);
    assert.equal(activeLinks2[0].bus_id, bus2.id);
  });

  // 3. TELEMETRY ROUTING & GHOST MOVEMENT PREVENTION ON REASSIGNMENT
  test('P-TEL-01: Reassignment immediately disconnects previous bus and clears ghost telemetry', async () => {
    fleetDataStore.switchUserRole('COR');
    // Create two dedicated active operational buses for testing ghost coordinate prevention
    const busA = fleetDataStore.createBus({
      bus_number: 'Bus 91A-' + Date.now(),
      registration: 'TS 09 UB ' + Math.floor(1000 + Math.random() * 9000),
      status: 'ACTIVE',
    });
    const busB = fleetDataStore.createBus({
      bus_number: 'Bus 91B-' + Date.now(),
      registration: 'TS 09 UB ' + Math.floor(1000 + Math.random() * 9000),
      status: 'ACTIVE',
    });
    const testTrackerId = 'HW_3045';

    // 1. Link tracker to busA
    const linkRes1 = await request({
      path: `/api/v1/devices/${testTrackerId}/link`,
      method: 'POST',
      body: { bus_id: busA.id },
    });
    assert.equal(linkRes1.status, 200);

    // 2. Ingest telemetry from testTrackerId with Bearer token authentication
    const telemetryRes1 = await request({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1',
      },
      body: {
        device_id: testTrackerId,
        boot_id: 'boot-seq-001',
        firmware_version: '1.2.0',
        samples: [
          {
            seq: 1,
            recorded_at: new Date().toISOString(),
            latitude: 17.3615,
            longitude: 78.3248,
            speed_kmh: 42.0,
            bearing: 180,
            gps_valid: true,
            hdop: 1.1,
            satellites: 9,
            ignition: true,
            battery_mv: 12600,
          },
        ],
      },
    });
    assert.equal(telemetryRes1.status, 200);

    // Verify busA snapshot is LIVE with verified hardware telemetry
    const snap1 = fleetDataStore.getSnapshots().find(s => s.bus_id === busA.id);
    assert.ok(snap1);
    assert.equal(snap1?.state, 'LIVE_HW');
    assert.equal(snap1?.latitude, 17.3615);

    // 3. Reassign tracker to busB
    const reassignRes = await request({
      path: `/api/v1/devices/${testTrackerId}/link`,
      method: 'POST',
      body: { bus_id: busB.id },
    });
    assert.equal(reassignRes.status, 200);

    // 4. Ghost Movement Prevention Check:
    // Bus A must no longer have live coordinates from tracker HW_3045!
    const snapAAfter = fleetDataStore.getSnapshots().find(s => s.bus_id === busA.id);
    assert.ok(snapAAfter);
    assert.notEqual(snapAAfter?.state, 'LIVE_HW');
    assert.equal(snapAAfter?.latitude, null);
    assert.equal(snapAAfter?.longitude, null);

    // 5. Ingest new telemetry from testTrackerId at different coordinates
    const telemetryRes2 = await request({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1',
      },
      body: {
        device_id: testTrackerId,
        boot_id: 'boot-seq-002',
        firmware_version: '1.2.0',
        samples: [
          {
            seq: 2,
            recorded_at: new Date().toISOString(),
            latitude: 17.3980,
            longitude: 78.4120,
            speed_kmh: 35.0,
            bearing: 210,
            gps_valid: true,
            hdop: 1.2,
            satellites: 8,
            ignition: true,
            battery_mv: 12550,
          },
        ],
      },
    });
    assert.equal(telemetryRes2.status, 200);

    // 6. Verify Bus B receives the telemetry, while Bus A remains unaffected
    const snapBAfter = fleetDataStore.getSnapshots().find(s => s.bus_id === busB.id);
    assert.ok(snapBAfter);
    assert.equal(snapBAfter?.state, 'LIVE_HW');
    assert.equal(snapBAfter?.latitude, 17.3980);
    assert.equal(snapBAfter?.longitude, 78.4120);

    const snapAFinal = fleetDataStore.getSnapshots().find(s => s.bus_id === busA.id);
    assert.notEqual(snapAFinal?.latitude, 17.3980);
  });

  // 4. BUS REGISTRATION, DISPLAY NAME, AND ROUTE CORRIDOR ASSOCIATION
  test('P-BUS-01: Create bus with display name and assigned route corridor', async () => {
    fleetDataStore.switchUserRole('COR');
    const route = fleetDataStore.getRoutes()[0];
    const uniqueSuffix = Date.now().toString(36).slice(-4).toUpperCase();
    const uniqueNum = 'Bus ' + uniqueSuffix;
    const uniqueReg = 'TS 09 UB ' + uniqueSuffix;

    const res = await request({
      path: '/api/v1/buses',
      method: 'POST',
      body: {
        bus_number: uniqueNum,
        display_name: 'Campus Express Extra',
        registration: uniqueReg,
        assigned_route_id: route.id,
        seating_capacity: 52,
        status: 'ACTIVE',
        insurance_expiry: '2028-06-30',
        fitness_expiry: '2028-04-30',
        pollution_expiry: '2027-12-31',
        permit_expiry: '2029-06-30',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.json?.bus?.bus_number, uniqueNum);
    assert.equal(res.json?.bus?.display_name, 'Campus Express Extra');
    assert.equal(res.json?.bus?.assigned_route_id, route.id);
    assert.equal(res.json?.bus?.assigned_route_name, route.name);

    // Verify student snapshot receives the bus with route information
    const snapRes = await request({ path: '/api/v1/snapshot' });
    assert.equal(snapRes.status, 200);
    const busSnap = snapRes.json?.buses?.find((b: any) => b.bus_number === uniqueNum);
    assert.ok(busSnap);
    assert.equal(busSnap.display_name, 'Campus Express Extra');
    assert.equal(busSnap.route_id, route.id);
    assert.equal(busSnap.route_name, route.name);
    // Unreported vehicle must honestly indicate in depot / not running
    assert.equal(busSnap.latitude, null);
    assert.equal(busSnap.longitude, null);
  });

  test('P-BUS-02: Assign route endpoint updates bus corridor', async () => {
    fleetDataStore.switchUserRole('COR');
    const bus = fleetDataStore.getBuses()[0];
    const targetRoute = fleetDataStore.getRoutes()[1];

    const res = await request({
      path: `/api/v1/buses/${bus.id}/assign-route`,
      method: 'POST',
      body: { route_id: targetRoute.id },
    });

    assert.equal(res.status, 200);
    assert.equal(res.json?.bus?.assigned_route_id, targetRoute.id);
    assert.equal(res.json?.bus?.assigned_route_name, targetRoute.name);

    // Non-existent route assignment must fail with 404
    const invalidRes = await request({
      path: `/api/v1/buses/${bus.id}/assign-route`,
      method: 'POST',
      body: { route_id: '00000000-0000-4000-8000-999999999999' },
    });
    assert.equal(invalidRes.status, 404);
  });

  // 5. PRIVACY, SECURITY & STUDENT BOUNDARY ENFORCEMENT
  test('P-SEC-01: Student and faculty snapshot strictly omits device tokens, IMEIs, and serials', async () => {
    const res = await request({ path: '/api/v1/snapshot' });
    assert.equal(res.status, 200);
    const buses = res.json?.buses || [];
    assert.ok(buses.length > 0);

    for (const b of buses) {
      assert.equal(b.auth_token, undefined);
      assert.equal(b.auth_token_hash, undefined);
      assert.equal(b.imei, undefined);
      assert.equal(b.sim_number, undefined);
      assert.equal(b.serial_number, undefined);
    }
  });

  test('P-SEC-02: Device listing does not expose device authentication tokens', async () => {
    fleetDataStore.switchUserRole('COR');
    const res = await request({ path: '/api/v1/devices' });
    assert.equal(res.status, 200);
    const devices = res.json?.devices || [];
    assert.ok(devices.length > 0);

    for (const d of devices) {
      assert.equal(d.auth_token, undefined);
      assert.equal(d.auth_token_hash, undefined);
    }
  });
});
