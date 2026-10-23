import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

// Ensure isolated persistence path for this test suite
const ISOLATED_STORE_PATH = path.resolve(process.cwd(), 'tmp/test-critical-workflows-store.json');
process.env.PERSISTENCE_FILE_PATH = ISOLATED_STORE_PATH;

import { createApiServer } from '../dist/main.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';

/**
 * Critical Workflows & Regression Prevention Test Suite
 * Covers all 8 core business invariants per Quality System specification.
 */
describe('Critical Workflows Regression Prevention Suite', () => {
  let server: http.Server;
  let port: number;

  // Authentic 43-character base64url token provisioned for HW_1042 in store
  const VALID_TOKEN = 'vjit_hw1042_token_auth_secret_cluster_v1_43';

  before(async () => {
    // Clean up isolated file if it exists
    if (fs.existsSync(ISOLATED_STORE_PATH)) {
      try {
        fs.unlinkSync(ISOLATED_STORE_PATH);
      } catch {}
    }

    server = createApiServer();
    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  after(async () => {
    fleetDataStore.switchUserRole('COR');
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (fs.existsSync(ISOLATED_STORE_PATH)) {
      try {
        fs.unlinkSync(ISOLATED_STORE_PATH);
      } catch {}
    }
  });

  async function request(options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<{ status: number; text: string; json?: any; headers: http.IncomingHttpHeaders }> {
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
            resolve({
              status: res.statusCode ?? 500,
              text: raw,
              json,
              headers: res.headers,
            });
          });
        },
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // --------------------------------------------------------------------------
  // 1. Administrator Authentication and Authorization
  // --------------------------------------------------------------------------
  describe('[REG-AUTH-01] Administrator Authorization & Role Matrix Enforcement', () => {
    test('Students (STU) are strictly forbidden from creating routes (403 FORBIDDEN)', async () => {
      fleetDataStore.switchUserRole('STU');
      const res = await request({
        path: '/api/v1/routes',
        method: 'POST',
        body: { name: 'Unauthorized Route', code: 'R-99', origin: 'A', destination: 'B' },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
      assert.ok(res.headers['x-request-id']);
    });

    test('Super Admins (SAD) can update operational settings; non-SAD roles are rejected', async () => {
      // 1. Coordinators cannot update settings
      fleetDataStore.switchUserRole('COR');
      const resCor = await request({
        path: '/api/v1/settings/stale_gps_threshold_seconds',
        method: 'PUT',
        body: { value: 65, reason: 'Testing Coordinator restriction' },
      });
      assert.strictEqual(resCor.status, 403);
      assert.strictEqual(resCor.json?.error?.code, 'FORBIDDEN');

      // 2. Super Admin can update settings
      fleetDataStore.switchUserRole('SAD');
      const resSad = await request({
        path: '/api/v1/settings/stale_gps_threshold_seconds',
        method: 'PUT',
        body: { value: 60, reason: 'Resetting to standard 60s threshold per Spec 35' },
      });
      assert.strictEqual(resSad.status, 200);
      assert.strictEqual(resSad.json?.success, true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Device Registration and Secure Identity Handling
  // --------------------------------------------------------------------------
  describe('[REG-DEV-02] Device Registration & Token HMAC Security', () => {
    test('Duplicate device registration with same device_id is rejected with 409', async () => {
      fleetDataStore.switchUserRole('COR');
      const res = await request({
        path: '/api/v1/devices',
        method: 'POST',
        body: {
          device_id: 'HW_1042',
          serial_number: 'SN-DUPLICATE-001',
          imei: '869201948201948',
          iccid: '89911012001928491029',
          firmware_version: '2.4.1',
        },
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.json?.error?.code, 'DUPLICATE_DEVICE_ERROR');
    });

    test('Telemetry request with invalid bearer token is rejected with 401 AUTH_REQUIRED', async () => {
      const res = await request({
        path: '/api/v1/telemetry',
        method: 'POST',
        headers: { Authorization: 'Bearer invalid_or_forged_device_bearer_token' },
        body: {
          device_id: 'HW_1042',
          boot_id: 'boot_reg_01',
          firmware_version: '2.4.1',
          samples: [
            {
              seq: 1,
              recorded_at: new Date().toISOString(),
              latitude: 17.3616,
              longitude: 78.3245,
              speed_kmh: 30,
              bearing: 90,
              gps_valid: true,
              hdop: 1.2,
              satellites: 8,
              ignition: true,
              battery_mv: 12600,
            },
          ],
        },
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.json?.error?.code, 'AUTH_REQUIRED');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Device-to-Bus Assignment and Authoritative Link Resolution
  // --------------------------------------------------------------------------
  describe('[REG-LINK-03] Authoritative Device-to-Bus Association (Rule E.6)', () => {
    test('Technician (TEC) cannot link or unlink devices (Rule E.6: only COR/SAD permitted)', async () => {
      fleetDataStore.switchUserRole('TEC');
      const res = await request({
        path: '/api/v1/devices/HW_1042/link',
        method: 'POST',
        body: { bus_id: '00000000-0000-4000-8000-000000000001' },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('Server authoritative assignment resolves active bus for telemetry, ignoring client claims', async () => {
      fleetDataStore.switchUserRole('COR');
      // Ensure HW_1042 is linked to Bus 12 (00000000-0000-4000-8000-000000000001)
      const resLink = await request({
        path: '/api/v1/devices/HW_1042/link',
        method: 'POST',
        body: { bus_id: '00000000-0000-4000-8000-000000000001' },
      });
      assert.ok(resLink.status === 200 || resLink.text.includes('already linked'));

      // Send telemetry
      const resTelem = await request({
        path: '/api/v1/telemetry',
        method: 'POST',
        headers: { Authorization: `Bearer ${VALID_TOKEN}` },
        body: {
          device_id: 'HW_1042',
          boot_id: 'boot_reg_01',
          firmware_version: '1.2.0',
          samples: [
            {
              seq: 991,
              recorded_at: new Date().toISOString(),
              latitude: 17.3625,
              longitude: 78.3255,
              speed_kmh: 28,
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
      assert.strictEqual(resTelem.status, 200);
      assert.strictEqual(resTelem.json?.ack_seq, 991);

      // Verify Bus 12 in snapshot was updated with new coordinates
      const resSnap = await request({ path: '/api/v1/snapshot' });
      assert.strictEqual(resSnap.status, 200);
      const bus12 = resSnap.json?.buses.find((b: any) => b.bus_number === 'Bus 12');
      assert.ok(bus12);
      assert.strictEqual(bus12.latitude, 17.3625);
      assert.strictEqual(bus12.longitude, 78.3255);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Bus-to-Route Assignment and Ordered Stops
  // --------------------------------------------------------------------------
  describe('[REG-ROUTE-04] Bus-to-Route Assignment & Stop Sequence Integrity', () => {
    test('Assigning bus to invalid route ID returns 404', async () => {
      fleetDataStore.switchUserRole('COR');
      const res = await request({
        path: '/api/v1/buses/00000000-0000-4000-8000-000000000001/assign-route',
        method: 'POST',
        body: { route_id: '00000000-0000-4000-8000-999999999999' },
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.json?.error?.code, 'ASSIGN_ROUTE_ERROR');
    });

    test('Route details preserve strictly ordered stop sequences', async () => {
      const res = await request({ path: '/api/v1/routes/00000000-0000-4000-8000-000000000012' });
      assert.strictEqual(res.status, 200);
      const route = res.json?.route;
      assert.ok(route);
      assert.ok(Array.isArray(route.stops));
      assert.ok(route.stops.length >= 2);

      // Verify sequence monotonicity
      for (let i = 0; i < route.stops.length - 1; i++) {
        assert.ok(route.stops[i].sequence < route.stops[i + 1].sequence);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Telemetry Validation Bounds
  // --------------------------------------------------------------------------
  describe('[REG-TELEM-05] Telemetry Ingestion Bounds and Rejections', () => {
    test('Rejects request with 413 when body exceeds 8 KB limit (Spec Section 35)', async () => {
      const oversizedPayload = {
        device_id: 'HW_1042',
        boot_id: 'boot_reg_01',
        firmware_version: '1.2.0',
        padding: 'X'.repeat(8500),
      };
      const res = await request({
        path: '/api/v1/telemetry',
        method: 'POST',
        headers: { Authorization: `Bearer ${VALID_TOKEN}` },
        body: oversizedPayload,
      });
      assert.strictEqual(res.status, 413);
      assert.strictEqual(res.json?.error?.code, 'PAYLOAD_TOO_LARGE');
    });

    test('Rejects telemetry with 400 when coordinates violate schema', async () => {
      const res = await request({
        path: '/api/v1/telemetry',
        method: 'POST',
        headers: { Authorization: `Bearer ${VALID_TOKEN}` },
        body: {
          device_id: 'HW_1042',
          boot_id: 'boot_reg_01',
          firmware_version: '1.2.0',
          samples: [
            {
              seq: 992,
              recorded_at: new Date().toISOString(),
              latitude: 95.0, // Invalid latitude (> 90)
              longitude: 78.32,
              speed_kmh: 20,
              bearing: 0,
              gps_valid: true,
              hdop: 1.0,
              satellites: 8,
              ignition: true,
              battery_mv: 12600,
            },
          ],
        },
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.json?.error?.code, 'VALIDATION_FAILED');
    });
  });

  // --------------------------------------------------------------------------
  // 6. GPS-Fix Validity and Freshness Calculations
  // --------------------------------------------------------------------------
  describe('[REG-FRESH-06] Freshness Calculation and Staleness Thresholds', () => {
    test('Telemetry older than 60s transitions to STALE and suppresses ETA', async () => {
      const staleTimestamp = new Date(Date.now() - 90000).toISOString(); // 90 seconds ago
      const res = await request({
        path: '/api/v1/telemetry',
        method: 'POST',
        headers: { Authorization: `Bearer ${VALID_TOKEN}` },
        body: {
          device_id: 'HW_1042',
          boot_id: 'boot_reg_01',
          firmware_version: '1.2.0',
          samples: [
            {
              seq: 993,
              recorded_at: staleTimestamp,
              latitude: 17.3620,
              longitude: 78.3250,
              speed_kmh: 0,
              bearing: 0,
              gps_valid: true,
              hdop: 1.0,
              satellites: 8,
              ignition: true,
              battery_mv: 12600,
            },
          ],
        },
      });
      assert.strictEqual(res.status, 200);

      const resSnap = await request({ path: '/api/v1/snapshot' });
      assert.strictEqual(resSnap.status, 200);
      const bus12 = resSnap.json?.buses.find((b: any) => b.bus_number === 'Bus 12');
      assert.ok(bus12);
      assert.strictEqual(bus12.state, 'STALE');
      assert.strictEqual(bus12.next_stop, null);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Student/Faculty Data Visibility & Secret Sanitization
  // --------------------------------------------------------------------------
  describe('[REG-VIS-07] Student/Faculty Snapshot Sanitization (Zero Secret Leakage)', () => {
    test('GET /api/v1/snapshot never exposes token hashes, secrets, or raw IMEI/ICCID', async () => {
      const res = await request({ path: '/api/v1/snapshot' });
      assert.strictEqual(res.status, 200);
      const rawText = JSON.stringify(res.json);

      assert.strictEqual(rawText.includes('token_hash'), false);
      assert.strictEqual(rawText.includes('private_key'), false);
      assert.strictEqual(rawText.includes('secret'), false);
      assert.strictEqual(rawText.includes('imei'), false);
      assert.strictEqual(rawText.includes('iccid'), false);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Persistence, Historical Records and Error Handling
  // --------------------------------------------------------------------------
  describe('[REG-AUDIT-08] Audit Logging & Persistence Snapshot Integrity', () => {
    test('Administrative actions create immutable audit log records', async () => {
      fleetDataStore.switchUserRole('SAD');
      const resAudit = await request({ path: '/api/v1/audit-logs' });
      assert.strictEqual(resAudit.status, 200);
      assert.ok(Array.isArray(resAudit.json?.logs));
      assert.ok(resAudit.json?.logs.length > 0);

      const latestLog = resAudit.json.logs[0];
      assert.ok(latestLog.id);
      assert.ok(latestLog.actor_email);
      assert.ok(latestLog.action);
      assert.ok(latestLog.recorded_at);
    });
  });
});
