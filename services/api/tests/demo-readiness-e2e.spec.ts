import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiServer } from '../dist/main.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';
import { renderMobileHtml } from '../dist/ui/mobile-page.js';
import { renderAdminHtml } from '../dist/ui/admin-page.js';

describe('End-to-End Integration & Demo Readiness Pass', () => {
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

  test('1. Student Journey: /app renders complete responsive shell, PWA metadata, and transport pass', async () => {
    const res = await request({ path: '/app' });

    assert.equal(res.status, 200);
    const body = res.text;

    // Viewport and responsive layout
    assert.ok(body.includes('name="viewport" content="width=device-width, initial-scale=1.0'), 'Must contain mobile viewport meta');
    assert.ok(body.includes('rel="manifest" href="/manifest.json"'), 'Must link to PWA manifest');
    assert.ok(body.includes('/sw.js'), 'Must register Service Worker');

    // Transport pass card & feedback markup
    assert.ok(body.includes('id="pass-validity-badge"'), 'Pass must have dynamic validity badge');
    assert.ok(body.includes('id="pass-expired-watermark"'), 'Pass must include expired suspension watermark');
    assert.ok(body.includes('id="pass-invalid-feedback"'), 'Pass must have feedback alert for expired/unpaid pass');
    assert.ok(body.includes('id="btn-toggle-pass-validity"'), 'Must include simulation toggle for pass validity');
  });

  test('2. Cross-App Consistency: Admin route edit persists and is immediately reflected in /api/v1/routes', async () => {
    fleetDataStore.switchUserRole('COR');

    const route12 = fleetDataStore.getRoutes().find(r => r.name.includes('Mehdipatnam'));
    assert.ok(route12, 'Route 12 must exist');

    const updatedStops = [
      {
        name: 'Mehdipatnam Bus Station Terminal',
        sequence: 1,
        latitude: 17.3916,
        longitude: 78.4410,
        scheduled_time: '07:45 AM',
      },
      {
        name: 'Rethibowli Ring Road',
        sequence: 2,
        latitude: 17.3875,
        longitude: 78.4320,
        scheduled_time: '07:55 AM',
      },
      {
        name: 'Sun City Bandlaguda Express Stop',
        sequence: 3,
        latitude: 17.3680,
        longitude: 78.4020,
        scheduled_time: '08:15 AM',
      },
      {
        name: 'VJIT Main Campus Terminal',
        sequence: 4,
        latitude: 17.3616,
        longitude: 78.3245,
        scheduled_time: '08:45 AM',
      },
    ];

    const putRes = await request({
      method: 'PUT',
      path: `/api/v1/routes/${route12.id}`,
      body: {
        stops: updatedStops,
        calculate_geometry: false,
      },
    });

    assert.equal(putRes.status, 200);
    assert.equal(putRes.json.success, true);
    assert.equal(putRes.json.route.stops.length, 4);
    assert.equal(putRes.json.route.stops[0].name, 'Mehdipatnam Bus Station Terminal');

    // Verify /api/v1/routes (consumed by /app and /admin) reflects the updated route
    const getRes = await request({ path: '/api/v1/routes' });
    assert.equal(getRes.status, 200);
    const fetchedRoute = getRes.json.routes.find((r: any) => r.id === route12.id);
    assert.ok(fetchedRoute);
    assert.equal(fetchedRoute.stops.length, 4);
    assert.equal(fetchedRoute.stops[2].name, 'Sun City Bandlaguda Express Stop');
  });

  test('3. Security Boundary: Unauthorized role (STU) cannot modify routes', async () => {
    fleetDataStore.switchUserRole('STU');

    const route12 = fleetDataStore.getRoutes()[0]!;
    const putRes = await request({
      method: 'PUT',
      path: `/api/v1/routes/${route12.id}`,
      body: {
        name: 'Hacked Route Name',
      },
    });

    assert.equal(putRes.status, 403);
    assert.equal(putRes.json.error.code, 'FORBIDDEN');
  });

  test('4. Demo Simulation: Predictable advance and safe reset mechanism', async () => {
    // Advance simulation
    const tickRes = await request({
      method: 'POST',
      path: '/api/v1/demo/tick',
    });
    assert.equal(tickRes.status, 200);
    assert.equal(tickRes.json.success, true);

    // Reset simulation back to step 0
    const resetRes = await request({
      method: 'POST',
      path: '/api/v1/demo/reset',
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.json.success, true);
    assert.equal(resetRes.json.state.stepIndex, 0);

    // Verify snapshot returns buses with zero progress
    const snapshotRes = await request({ path: '/api/v1/snapshot' });
    assert.equal(snapshotRes.status, 200);
    assert.ok(Array.isArray(snapshotRes.json.buses));
    assert.ok(snapshotRes.json.buses.length > 0);
  });

  test('5. Admin Console: /admin renders fleet deck, Route Studio, and simulation controls', async () => {
    const res = await request({ path: '/admin' });

    assert.equal(res.status, 200);
    const body = res.text;

    assert.ok(body.includes('Fleet Operations Deck'), 'Must render fleet deck');
    assert.ok(body.includes('id="btn-admin-step-sim"'), 'Must render simulation step button');
    assert.ok(body.includes('id="btn-admin-reset-sim"'), 'Must render simulation reset button');
    assert.ok(body.includes('GPS Tracker Hardware'), 'Must render hardware tracking section');
    assert.ok(body.includes('Routes & Stop Geofences'), 'Must render routes section');
  });

  test('6. Rule R-M5: Demo simulation endpoints return 403 SIMULATOR_PROHIBITED in production', async () => {
    const origEnv = process.env.APP_ENV;
    try {
      process.env.APP_ENV = 'production';
      const tickRes = await request({
        method: 'POST',
        path: '/api/v1/demo/tick',
      });
      assert.equal(tickRes.status, 403);
      assert.equal(tickRes.json.error.code, 'SIMULATOR_PROHIBITED');

      const toggleRes = await request({
        method: 'POST',
        path: '/api/v1/demo/toggle',
      });
      assert.equal(toggleRes.status, 403);
      assert.equal(toggleRes.json.error.code, 'SIMULATOR_PROHIBITED');

      const resetRes = await request({
        method: 'POST',
        path: '/api/v1/demo/reset',
      });
      assert.equal(resetRes.status, 403);
      assert.equal(resetRes.json.error.code, 'SIMULATOR_PROHIBITED');
    } finally {
      if (origEnv !== undefined) {
        process.env.APP_ENV = origEnv;
      } else {
        delete process.env.APP_ENV;
      }
    }
  });

  test('7. Rule R-M5: Demo simulation rejects requests with unauthorized Host header', async () => {
    const origEnv = process.env.APP_ENV;
    try {
      process.env.APP_ENV = 'local';
      const tickRes = await request({
        method: 'POST',
        path: '/api/v1/demo/tick',
        headers: {
          Host: 'evil-external-domain.com',
        },
      });
      assert.equal(tickRes.status, 403);
      assert.equal(tickRes.json.error.code, 'SIMULATOR_PROHIBITED');
      assert.ok(tickRes.json.error.message.includes('evil-external-domain.com'));
    } finally {
      if (origEnv !== undefined) {
        process.env.APP_ENV = origEnv;
      } else {
        delete process.env.APP_ENV;
      }
    }
  });

  test('8. Production UI: Omits simulation controls in /app and /admin when in production', async () => {
    const origEnv = process.env.APP_ENV;
    try {
      process.env.APP_ENV = 'production';
      const appHtml = renderMobileHtml();
      assert.ok(!appHtml.includes('id="btn-step-sim"'), 'Production /app must omit simulation step button');

      const adminHtml = renderAdminHtml();
      assert.ok(!adminHtml.includes('id="btn-admin-step-sim"'), 'Production /admin must omit simulation step button');
    } finally {
      if (origEnv !== undefined) {
        process.env.APP_ENV = origEnv;
      } else {
        delete process.env.APP_ENV;
      }
    }
  });
});
