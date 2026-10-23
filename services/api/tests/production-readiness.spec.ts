import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { createApiServer } from '../dist/main.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';

describe('Production Readiness & Server-Side Security Audit', () => {
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
    // Reset user back to COR for normal operation
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
        },
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // -------------------------------------------------------------
  // 1. Strict Server-Side RBAC Enforcement for Student (STU)
  // -------------------------------------------------------------
  describe('1. Server-Side RBAC: Unauthorized Role (STU) Access Denied', () => {
    before(() => {
      fleetDataStore.switchUserRole('STU');
    });

    test('STU cannot create a bus (POST /api/v1/buses returns 403)', async () => {
      const res = await request({
        path: '/api/v1/buses',
        method: 'POST',
        body: { bus_number: 'Bus 99', registration: 'TS 09 UB 9999', seating_capacity: 50 },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot modify a bus (PUT /api/v1/buses/:id returns 403)', async () => {
      const res = await request({
        path: '/api/v1/buses/00000000-0000-4000-8000-000000000001',
        method: 'PUT',
        body: { seating_capacity: 60 },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot delete a bus (DELETE /api/v1/buses/:id returns 403)', async () => {
      const res = await request({
        path: '/api/v1/buses/00000000-0000-4000-8000-000000000001',
        method: 'DELETE',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot add stops to a route (POST /api/v1/routes/:id/stops returns 403)', async () => {
      const res = await request({
        path: '/api/v1/routes/00000000-0000-4000-8000-000000000012/stops',
        method: 'POST',
        body: { name: 'Unauthorized Stop', sequence: 99, latitude: 17.36, longitude: 78.33, scheduled_time: '08:45 AM' },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot link a GPS tracking device (POST /api/v1/devices/:id/link returns 403)', async () => {
      const res = await request({
        path: '/api/v1/devices/HW_1042/link',
        method: 'POST',
        body: { bus_id: '00000000-0000-4000-8000-000000000001', reason: 'Malicious attempt' },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot publish college alerts (POST /api/v1/alerts returns 403)', async () => {
      const res = await request({
        path: '/api/v1/alerts',
        method: 'POST',
        body: { title: 'Fake Alert', message: 'Classes cancelled', severity: 'CRITICAL', expires_at: new Date().toISOString() },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot access student attendance roster (GET /api/v1/attendance returns 403)', async () => {
      const res = await request({
        path: '/api/v1/attendance',
        method: 'GET',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot access maintenance tickets (GET /api/v1/maintenance/tickets returns 403)', async () => {
      const res = await request({
        path: '/api/v1/maintenance/tickets',
        method: 'GET',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot access audit logs (GET /api/v1/audit-logs returns 403)', async () => {
      const res = await request({
        path: '/api/v1/audit-logs',
        method: 'GET',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot access system diagnostics (GET /api/v1/diagnostics returns 403)', async () => {
      const res = await request({
        path: '/api/v1/diagnostics',
        method: 'GET',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('STU cannot trigger database backups (POST /api/v1/admin/backup returns 403)', async () => {
      const res = await request({
        path: '/api/v1/admin/backup',
        method: 'POST',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });
  });

  // -------------------------------------------------------------
  // 2. Role Boundaries for Fleet Technician (TEC)
  // -------------------------------------------------------------
  describe('2. Technician (TEC) Role Boundaries', () => {
    before(() => {
      fleetDataStore.switchUserRole('TEC');
    });

    test('TEC can view operational diagnostics', async () => {
      const res = await request({
        path: '/api/v1/diagnostics',
        method: 'GET',
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json?.success, true);
      assert.strictEqual(res.json?.diagnostics?.status, 'HEALTHY');
    });

    test('TEC can view and resolve maintenance tickets', async () => {
      const res = await request({
        path: '/api/v1/maintenance/tickets',
        method: 'GET',
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.json?.tickets));
    });

    test('TEC cannot trigger system backups (POST /api/v1/admin/backup returns 403)', async () => {
      const res = await request({
        path: '/api/v1/admin/backup',
        method: 'POST',
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });

    test('TEC cannot link or unlink devices (POST /api/v1/devices/:id/link returns 403)', async () => {
      const res = await request({
        path: '/api/v1/devices/HW_1042/link',
        method: 'POST',
        body: { bus_id: '00000000-0000-4000-8000-000000000001', reason: 'Tech linking' },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.json?.error?.code, 'FORBIDDEN');
    });
  });

  // -------------------------------------------------------------
  // 3. Coordinator (COR) & Super Admin (SAD) Privileged Operations
  // -------------------------------------------------------------
  describe('3. Super Admin (SAD) Diagnostics & Backup Snapshotting', () => {
    before(() => {
      fleetDataStore.switchUserRole('SAD');
    });

    test('SAD can fetch detailed diagnostics without secret leakage', async () => {
      const res = await request({
        path: '/api/v1/diagnostics',
        method: 'GET',
      });
      assert.strictEqual(res.status, 200);
      const diag = res.json?.diagnostics;
      assert.strictEqual(diag.status, 'HEALTHY');
      assert.strictEqual(diag.service, 'vjit-bus-tracker');
      assert.strictEqual(diag.persistence.engine, 'FILE_SYSTEM_TRANSACTIONAL_JSON');
      assert.ok(diag.uptimeSeconds >= 0);
      assert.ok(diag.fleet.totalBuses > 0);
      assert.ok(diag.routes.totalRoutes > 0);
      assert.ok(diag.devices.totalDevices > 0);
      // Ensure zero secrets/tokens leaked
      const rawText = JSON.stringify(diag);
      assert.strictEqual(rawText.includes('token_hash'), false);
      assert.strictEqual(rawText.includes('private_key'), false);
    });

    test('SAD can create an operational store backup snapshot (POST /api/v1/admin/backup)', async () => {
      const res = await request({
        path: '/api/v1/admin/backup',
        method: 'POST',
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.json?.success, true);
      assert.ok(res.json?.backupPath);
      assert.ok(fs.existsSync(res.json.backupPath));

      // Verify the backup file is valid JSON and contains fleet data
      const content = fs.readFileSync(res.json.backupPath, 'utf8');
      const parsed = JSON.parse(content);
      assert.ok(Array.isArray(parsed.routes));
      assert.ok(Array.isArray(parsed.buses));
      assert.ok(Array.isArray(parsed.devices));

      // Verify audit log entry was created
      const auditRes = await request({
        path: '/api/v1/audit-logs',
        method: 'GET',
      });
      assert.strictEqual(auditRes.status, 200);
      const latestLog = auditRes.json?.logs[0];
      assert.strictEqual(latestLog.action, 'DATABASE_BACKUP');
      assert.strictEqual(latestLog.actor_role, 'SAD');
    });
  });
});
