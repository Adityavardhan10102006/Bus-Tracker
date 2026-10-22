import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiServer } from '../dist/main.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';

describe('GPS Hardware Pipeline to Student/Admin UI E2E Integration', () => {
  let server: http.Server;
  let port: number;

  // Authentic 43-character base64url token provisioned for HW_1042
  const hw1042Token = 'vjit_hw1042_token_auth_secret_cluster_v1_43';

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
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  async function request(options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<{ status: number; body: any }> {
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
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            let parsed = data;
            try { parsed = JSON.parse(data); } catch {}
            resolve({ status: res.statusCode ?? 500, body: parsed });
          });
        },
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  test('1. Full Pipeline: Authentic GPS Telemetry ingested from HW_1042 updates Bus 12 in real time', async () => {
    const nowIso = new Date().toISOString();
    const telemetryPayload = {
      device_id: 'HW_1042',
      boot_id: 'boot_hw1042_run01',
      firmware_version: '1.2.0',
      samples: [
        {
          seq: 501,
          recorded_at: nowIso,
          latitude: 17.3620,
          longitude: 78.3250,
          speed_kmh: 34.0,
          bearing: 230,
          gps_valid: true,
          hdop: 1.1,
          satellites: 10,
          ignition: true,
          battery_mv: 12600,
        },
      ],
    };

    // Step A: Device sends telemetry to /api/v1/telemetry
    const res = await request({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hw1042Token}`,
      },
      body: telemetryPayload,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ack_seq, 501);
    assert.equal(res.body.rejected.length, 0);

    // Step B: Student / Faculty snapshot endpoint receives updated live coordinates
    const snapshotRes = await request({ path: '/api/v1/snapshot' });
    assert.equal(snapshotRes.status, 200);

    const bus12 = snapshotRes.body.buses.find((b: any) => b.bus_number === 'Bus 12');
    assert.ok(bus12, 'Bus 12 must be present in snapshot');
    assert.equal(bus12.state, 'LIVE_HW');
    assert.equal(bus12.state_label, 'Live • GPS Hardware');
    assert.equal(bus12.latitude, 17.3620);
    assert.equal(bus12.longitude, 78.3250);
    assert.equal(bus12.speed_kmh, 34.0);
    assert.equal(bus12.heading, 230);
    assert.ok(bus12.age_seconds <= 5, 'Freshness age must be <= 5 seconds');

    // Step C: Administrator devices table reflects ONLINE connectivity status
    const devicesRes = await request({ path: '/api/v1/devices' });
    assert.equal(devicesRes.status, 200);
    const hwDev = devicesRes.body.devices.find((d: any) => d.device_id === 'HW_1042');
    assert.ok(hwDev, 'HW_1042 must exist in device inventory');
    assert.equal(hwDev.connectivity_status, 'ONLINE');
    assert.ok(hwDev.reporting_age_seconds <= 5);
  });

  test('2. Stale Detection (Rule 263 & Spec 35): Telemetry older than 60s switches state to STALE and suppresses ETA', async () => {
    // 75 seconds ago
    const staleTime = new Date(Date.now() - 75 * 1000).toISOString();
    const stalePayload = {
      device_id: 'HW_1042',
      boot_id: 'boot_hw1042_run01',
      firmware_version: '1.2.0',
      samples: [
        {
          seq: 502,
          recorded_at: staleTime,
          latitude: 17.3615,
          longitude: 78.3240,
          speed_kmh: 28.0,
          bearing: 220,
          gps_valid: true,
          hdop: 1.2,
          satellites: 9,
          ignition: true,
          battery_mv: 12580,
        },
      ],
    };

    const res = await request({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hw1042Token}`,
      },
      body: stalePayload,
    });

    assert.equal(res.status, 200);

    const snapshotRes = await request({ path: '/api/v1/snapshot' });
    const bus12 = snapshotRes.body.buses.find((b: any) => b.bus_number === 'Bus 12');
    assert.equal(bus12.state, 'STALE');
    assert.ok(bus12.age_seconds >= 70);
    assert.equal(bus12.next_stop, null, 'Rule 263: ETA must be suppressed when telemetry is STALE');
  });

  test('3. Emergency SOS Panic Button triggers high-priority safety alert', async () => {
    const nowIso = new Date().toISOString();
    const sosPayload = {
      device_id: 'HW_1042',
      boot_id: 'boot_hw1042_run01',
      firmware_version: '1.2.0',
      samples: [
        {
          seq: 503,
          recorded_at: nowIso,
          latitude: 17.3616,
          longitude: 78.3245,
          speed_kmh: 30.0,
          bearing: 235,
          gps_valid: true,
          hdop: 1.0,
          satellites: 11,
          ignition: true,
          battery_mv: 12550,
        },
      ],
      events: [
        {
          seq: 1,
          type: 'SOS',
          triggered_at: nowIso,
          payload: { trigger: 'PANIC_SWITCH_PRESSED' },
        },
      ],
    };

    const res = await request({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hw1042Token}`,
      },
      body: sosPayload,
    });

    assert.equal(res.status, 200);

    // Verify alert appeared in service alerts feed
    const alertsRes = await request({ path: '/api/v1/alerts' });
    assert.equal(alertsRes.status, 200);
    const sosAlert = alertsRes.body.alerts.find((a: any) => a.category === 'SAFETY' && a.title.includes('SOS'));
    assert.ok(sosAlert, 'High-priority SOS safety alert must be generated');
    assert.equal(sosAlert.priority, 'HIGH');
  });

  test('4. Security & Rejection: Rejects unauthorized bearer token with 401', async () => {
    const res = await request({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid_unauthorized_token_entropy_key_123',
      },
      body: {
        device_id: 'HW_1042',
        samples: [],
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_REQUIRED');
  });
});
