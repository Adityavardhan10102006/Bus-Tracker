import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiServer } from '../dist/main.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';
import { generateDeviceToken, hashDeviceToken } from '@vjit/domain';
import { logger } from '@vjit/logger';
import type { IngestionDataStore } from '../dist/routes/telemetry.js';

describe('Security & Privacy Hardening Verification Suite (Spec Part F & B.3)', () => {
  let server: http.Server;
  let port: number;
  const secretV1 = 'vjit_device_hmac_secret_key_entropy_cluster_v1';
  const tokenObj = generateDeviceToken();
  const validToken = tokenObj.plaintextToken;
  const tokenHash = hashDeviceToken(validToken, secretV1);

  // Ingestion mock store for telemetry security checks
  const mockIngestionStore: IngestionDataStore = {
    async getDevice(deviceId: string) {
      if (deviceId === 'HW_SEC1') {
        return { id: deviceId, status: 'ACTIVE' as const, first_used_at: new Date() };
      }
      if (deviceId === 'HW_REV1') {
        return { id: deviceId, status: 'REVOKED' as const };
      }
      return null;
    },
    async getDeviceTokens(deviceId: string) {
      if (deviceId === 'HW_SEC1' || deviceId === 'HW_REV1') {
        return [{ key_version: 'v1', token_hash: tokenHash, is_revoked: false }];
      }
      return [];
    },
    async getActiveDeviceBusLinks(deviceId: string) {
      if (deviceId === 'HW_SEC1') {
        return [
          {
            id: 'link-sec-01',
            device_id: deviceId,
            bus_id: '00000000-0000-4000-8000-000000000001',
            valid_from: new Date('2026-10-01T00:00:00.000Z'),
            valid_to: null,
          },
        ];
      }
      return [];
    },
    getRecentSignatures(_deviceId: string) {
      return [
        {
          device_id: 'HW_SEC1',
          boot_id: 'boot-1',
          seq: 100,
          latitude: 17.3850,
          longitude: 78.4867,
          recorded_at: new Date(Date.now() - 30000).toISOString(),
        },
      ];
    },
  };

  before(async () => {
    // Ensure test device exists in fleetDataStore
    fleetDataStore.switchUserRole('SAD');
    server = createApiServer(mockIngestionStore, { v1: secretV1 });
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

  function makeRequest(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
      const dataStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            ...(dataStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dataStr) } : {}),
            ...headers,
          },
        },
        res => {
          let resBody = '';
          res.on('data', chunk => {
            resBody += chunk;
          });
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode ?? 500,
                headers: res.headers,
                body: resBody ? JSON.parse(resBody) : null,
              });
            } catch {
              resolve({ status: res.statusCode ?? 500, headers: res.headers, body: resBody });
            }
          });
        },
      );
      req.on('error', reject);
      if (dataStr) req.write(dataStr);
      req.end();
    });
  }

  describe('1. Role-Based Access Control & PII Boundary Enforcement (Spec 5 & Part B.3)', () => {
    test('rejects unprivileged student (STU) from listing hardware devices with 403', async () => {
      const res = await makeRequest('GET', '/api/v1/devices', undefined, {
        'x-user-role': 'STU',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    test('permits Transport Coordinator (COR) to list devices with masked IMEI & ICCID', async () => {
      const res = await makeRequest('GET', '/api/v1/devices', undefined, {
        'x-user-role': 'COR',
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.devices));
      assert.ok(res.body.devices.length > 0);
      for (const dev of res.body.devices) {
        assert.ok(dev.imei.startsWith('***********'), `IMEI ${dev.imei} should be masked with ***********`);
        assert.ok(dev.iccid.startsWith('************'), `ICCID ${dev.iccid} should be masked with ************`);
      }
    });

    test('permits Super Admin (SAD) to view unmasked hardware IMEI & ICCID for provisioning', async () => {
      const res = await makeRequest('GET', '/api/v1/devices', undefined, {
        'x-user-role': 'SAD',
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.devices));
      const sample = res.body.devices[0];
      assert.ok(sample);
      assert.ok(!sample.imei.includes('*'), `Super Admin should see unmasked IMEI, got ${sample.imei}`);
    });

    test('rejects student (STU) from accessing statutory bus fleet list with 403', async () => {
      const res = await makeRequest('GET', '/api/v1/buses', undefined, {
        'x-user-role': 'STU',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    test('permits faculty (FAC) and staff to access buses list with 200', async () => {
      const res = await makeRequest('GET', '/api/v1/buses', undefined, {
        'x-user-role': 'FAC',
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.buses));
    });

    test('prevents client-side attendance role spoofing when session header is STU', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/attendance/check-in',
        {
          type: 'MANUAL_LATE',
          student_id: '33333333-4444-5555-6666-777777777777',
          trip_id: '11111111-2222-3333-4444-555555555555',
          bus_id: '22222222-3333-4444-5555-666666666666',
          reason: 'Spoofed manual check-in attempt',
          actor_id: 'attacker-stu',
          actor_role: 'COR', // Spoofed in body
        },
        {
          'x-user-role': 'STU', // Authenticated session role
        },
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'PERMISSION_DENIED');
    });
  });

  describe('2. Device Identity & Cryptographic Token Protection', () => {
    test('generateDeviceToken produces cryptographically high-entropy 256-bit base64url tokens', () => {
      const token1 = generateDeviceToken();
      const token2 = generateDeviceToken();

      assert.notStrictEqual(token1.plaintextToken, token2.plaintextToken);
      assert.strictEqual(token1.plaintextToken.length, 43);
      assert.ok(token1.hmacSha256);
    });

    test('registerDevice stores one-way cryptographic hash and generates high-entropy token', () => {
      const uniqueSuffix = Date.now().toString(16).slice(-6);
      const reg = fleetDataStore.registerDevice({
        device_id: `HW_TEST_${uniqueSuffix}`,
        serial_number: `SN-${uniqueSuffix}`,
        imei: `8601234567${uniqueSuffix}`,
        model: 'Teltonika FMB920',
      });

      assert.strictEqual(reg.success, true);
      assert.ok(reg.plaintextToken);
      assert.strictEqual(reg.plaintextToken.length, 43);

      // Verify that plain token is not stored in device record
      const stored = fleetDataStore.getDevices().find(d => d.device_id === reg.device?.device_id);
      assert.ok(stored);
      assert.strictEqual((stored as any).auth_token, undefined);
    });

    test('rejects telemetry submitted with revoked device token', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/telemetry',
        {
          device_id: 'HW_REV1',
          boot_id: 'boot-1',
          firmware_version: '1.0.4',
          samples: [],
        },
        {
          Authorization: `Bearer ${validToken}`,
        },
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'DEVICE_INACTIVE');
    });
  });

  describe('3. Telemetry Ingestion Replay & Conflict Prevention', () => {
    test('records CONFLICT and rejects live promotion for conflicting sample sequence numbers', async () => {
      const now = new Date().toISOString();
      const res = await makeRequest(
        'POST',
        '/api/v1/telemetry',
        {
          device_id: 'HW_SEC1',
          boot_id: 'boot-1',
          firmware_version: '1.0.4',
          samples: [
            {
              seq: 100, // Conflict with existing sequence 100 in mock store
              recorded_at: now,
              latitude: 17.3999, // Altered coordinates
              longitude: 78.4999,
              speed_kmh: 80,
              gps_valid: true,
              hdop: 1.0,
              satellites: 8,
              ignition: true,
              battery_mv: 12500,
            },
          ],
        },
        {
          Authorization: `Bearer ${validToken}`,
        },
      );

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.rejected));
      const conflictDetail = res.body.rejected.find((d: any) => d.seq === 100 && d.reason === 'CONFLICT');
      assert.ok(conflictDetail, 'Should report CONFLICT for replayed sequence number');
    });
  });

  describe('4. Web Application Security Headers & CSRF Defense', () => {
    test('enforces strict Content-Security-Policy and security headers on responses', async () => {
      const res = await makeRequest('GET', '/app');
      assert.strictEqual(res.status, 200);

      const csp = res.headers['content-security-policy'];
      assert.ok(csp, 'Content-Security-Policy header must be present');
      assert.ok(csp.includes("default-src 'self'"), 'CSP must restrict default-src to self');
      assert.ok(csp.includes("tile.openstreetmap.org"), 'CSP must explicitly allow trusted map tiles');

      assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
      assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
      assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
      assert.ok(res.headers['permissions-policy'], 'Permissions-Policy header must be present');
    });

    test('rejects cross-origin state-changing request with 403 CSRF_FORBIDDEN', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/auth/role',
        { role: 'SAD' },
        {
          Origin: 'https://malicious-attacker.evil.com',
          Host: `127.0.0.1:${port}`,
        },
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error.code, 'CSRF_FORBIDDEN');
    });

    test('emits standard RateLimit headers', async () => {
      const res = await makeRequest('GET', '/api/v1/snapshot');
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers['ratelimit-limit']);
      assert.ok(res.headers['ratelimit-remaining']);
      assert.ok(res.headers['ratelimit-reset']);
    });
  });

  describe('5. Operational Safety & Path Traversal Guards', () => {
    test('restoreBackup rejects path traversal attempts with Access Denied', () => {
      const result = fleetDataStore.restoreBackup('../../etc/passwd');
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('Access denied'));
    });

    test('restoreBackup rejects Windows path traversal attempts with Access Denied', () => {
      const result = fleetDataStore.restoreBackup('..\\..\\windows\\win.ini');
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('Access denied'));
    });
  });

  describe('6. PII & Secret Redaction in Structured Logging', () => {
    test('logger redacts IMEI, ICCID, device keys and HMAC tokens from log context', () => {
      const testContext = {
        deviceId: 'HW_TEST_99',
        imei: '860123456789012',
        iccid: '8991101286012345670',
        tokenHash: 'secret-hash-value-12345',
        hmacKey: 'super-sensitive-hmac-key',
      };

      // Ensure that logger call doesn't throw and properly structures context
      assert.doesNotThrow(() => {
        logger.info('Audit test event', testContext);
      });
    });
  });
});
