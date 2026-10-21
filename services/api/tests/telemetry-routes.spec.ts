import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiServer } from '../dist/main.js';
import { hashDeviceToken } from '@vjit/domain';
import type { IngestionDataStore } from '../dist/routes/telemetry.js';

describe('API Ingestion Routes: POST /api/v1/telemetry & /api/v1/heartbeat', () => {
  let server: http.Server;
  let port: number;
  const secretV1 = 'vjit_device_hmac_secret_key_entropy_cluster_v1';
  const validToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1'; // 43 chars
  const tokenHash = hashDeviceToken(validToken, secretV1);

  const mockStore: IngestionDataStore = {
    async getDevice(deviceId: string) {
      if (deviceId === 'HW_REV1') {
        return { id: deviceId, status: 'REVOKED' as const };
      }
      if (deviceId === 'HW_1042') {
        return { id: deviceId, status: 'ACTIVE' as const, first_used_at: new Date() };
      }
      return null;
    },
    async getDeviceTokens(deviceId: string) {
      if (deviceId === 'HW_1042' || deviceId === 'HW_REV1') {
        return [{ key_version: 'v1', token_hash: tokenHash, is_revoked: false }];
      }
      return [];
    },
    async getActiveDeviceBusLinks(deviceId: string) {
      if (deviceId === 'HW_1042') {
        return [
          {
            id: 'link-1',
            device_id: deviceId,
            bus_id: 'bus-08',
            valid_from: new Date('2026-10-01T00:00:00.000Z'),
            valid_to: null,
          },
        ];
      }
      return [];
    },
  };

  before(async () => {
    server = createApiServer(mockStore, { v1: secretV1 });
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

  async function makeRequest(options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: options.path,
          method: options.method ?? 'GET',
          headers: options.headers ?? {},
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            let parsedBody = data;
            try {
              parsedBody = JSON.parse(data);
            } catch {}
            resolve({
              status: res.statusCode ?? 500,
              headers: res.headers,
              body: parsedBody,
            });
          });
        },
      );
      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  test('rejects request with 415 when Content-Type is not application/json', async () => {
    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'plain-text',
    });

    assert.equal(res.status, 415);
    assert.equal(res.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
  });

  test('rejects request with 413 when body exceeds 8 KB limit', async () => {
    const largeBody = JSON.stringify({ data: 'x'.repeat(8500) });
    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: largeBody,
    });

    assert.equal(res.status, 413);
    assert.equal(res.body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  test('rejects request with 401 when Authorization header is missing', async () => {
    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: 'HW_1042' }),
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_REQUIRED');
  });

  test('rejects request with 401 when Bearer token is invalid or wrong length', async () => {
    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_short_token',
      },
      body: JSON.stringify({ device_id: 'HW_1042' }),
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_REQUIRED');
  });

  test('rejects request with 400 when payload schema is violated', async () => {
    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        device_id: 'INVALID_ID_FORMAT_12345', // fails HW_ regex
        boot_id: 'boot-1',
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  });

  test('rejects request with 403 when device status is REVOKED', async () => {
    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        device_id: 'HW_REV1',
        boot_id: 'boot-1',
        firmware_version: '1.0.4',
        samples: [],
      }),
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'DEVICE_INACTIVE');
  });

  test('accepts valid telemetry payload and returns 200 with ack_seq & config', async () => {
    const telemetryPayload = {
      device_id: 'HW_1042',
      boot_id: 'boot-uuid-1',
      firmware_version: '1.0.4',
      samples: [
        {
          seq: 1,
          recorded_at: new Date(Date.now() - 5000).toISOString(),
          latitude: 17.3616,
          longitude: 78.3245,
          speed_kmh: 30.0,
          gps_valid: true,
          hdop: 1.2,
          satellites: 9,
          ignition: true,
          battery_mv: 12500,
        },
      ],
      events: [
        {
          seq: 1,
          type: 'SOS',
          triggered_at: new Date().toISOString(),
        },
      ],
    };

    const res = await makeRequest({
      path: '/api/v1/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify(telemetryPayload),
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.ack_seq, 1);
    assert.equal(res.body.rejected.length, 0);
    assert.equal(res.body.event_results.length, 1);
    assert.equal(res.body.event_results[0].type, undefined); // matches schema
    assert.equal(res.body.event_results[0].status, 'ACCEPTED');
    assert.ok(res.body.event_results[0].incident_id); // SOS generates incident_id
    assert.equal(res.body.config.hw_moving_interval_s, 10);
    assert.ok(res.body.server_time);
  });

  test('accepts valid heartbeat and returns 200 HEALTHY', async () => {
    const heartbeatPayload = {
      device_id: 'HW_1042',
      boot_id: 'boot-uuid-1',
      firmware_version: '1.0.4',
      timestamp: new Date().toISOString(),
      gps_status: 'FIX_3D',
      satellites: 8,
      hdop: 1.4,
      rssi_dbm: -75,
      battery_mv: 12600,
      ignition: true,
    };

    const res = await makeRequest({
      path: '/api/v1/heartbeat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify(heartbeatPayload),
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'HEALTHY');
    assert.equal(res.body.pending_action, 'NONE');
    assert.ok(res.body.server_time);
  });
});
