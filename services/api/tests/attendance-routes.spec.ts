import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiServer } from '../dist/main.js';
import { generateBoardingQrPayload } from '@vjit/domain';
import type { AttendanceDataStore } from '../dist/routes/attendance.js';
import type { EtaDataStore } from '../dist/routes/eta.js';
import type { NotificationDataStore } from '../dist/routes/notifications.js';

describe('API Routes: Attendance, ETA & Notifications (Spec 18, 17.5, 21)', () => {
  let server: http.Server;
  let port: number;

  const secretV1 = 'vjit_test_secret_for_attendance_and_qr_tokens_v1';
  const tripId = '11111111-2222-3333-4444-555555555555';
  const busId = '22222222-3333-4444-5555-666666666666';
  const studentId = '33333333-4444-5555-6666-777777777777';
  const routeId = '44444444-5555-6666-7777-888888888888';
  const stopId = '55555555-6666-7777-8888-999999999999';

  const scheduledDeparture = '2026-10-21T08:00:00.000Z';
  const testNowUtc = '2026-10-21T08:05:00.000Z';
  const testNowSec = Math.floor(new Date(testNowUtc).getTime() / 1000);

  const mockAttendanceStore: AttendanceDataStore = {
    async getActiveTrip(id: string) {
      if (id === tripId) {
        return {
          id: tripId,
          bus_id: busId,
          bus_number: '12',
          route_name: 'Route 12 - Mehdipatnam',
          status: 'ACTIVE',
          scheduled_departure_utc: scheduledDeparture,
          actual_departure_utc: null,
        };
      }
      return null;
    },
    async getStudentRoster(_tripId: string, sid: string) {
      if (sid === studentId) {
        return {
          student_id: sid,
          route_id: routeId,
          is_on_leave: false,
        };
      }
      return null;
    },
    async getAttendanceRecord() {
      return null; // Not boarded yet
    },
  };

  const mockEtaStore: EtaDataStore = {
    async getRouteGeometry(id: string) {
      if (id === routeId) {
        return {
          id: routeId,
          polyline: [
            [17.3800, 78.3600],
            [17.3850, 78.3650],
            [17.3880, 78.3680],
          ],
          stops: [
            { id: stopId, name: 'Main Gate', sequence: 1, latitude: 17.3850, longitude: 78.3650 },
          ],
        };
      }
      return null;
    },
    async getBusTelemetry(id: string) {
      if (id === busId) {
        return {
          latitude: 17.3810,
          longitude: 78.3610,
          speed_kmh: 30,
          recorded_at: new Date().toISOString(),
          state: 'LIVE_HW',
        };
      }
      if (id === 'stale-bus') {
        return {
          latitude: 17.3810,
          longitude: 78.3610,
          speed_kmh: 0,
          recorded_at: new Date(Date.now() - 3600000).toISOString(),
          state: 'STALE',
        };
      }
      return null;
    },
  };

  const mockNotificationStore: NotificationDataStore = {
    async getRecipientPreferences(userId: string) {
      if (userId === studentId) {
        return {
          user_id: userId,
          safety_locked: true,
          approaching_stops: true,
          delays: true,
          attendance_alerts: true,
          quiet_hours_enabled: true,
          push_token: 'ExponentPushToken[student-test-token]',
        };
      }
      return null;
    },
    async getRecentNotificationHistory() {
      return [];
    },
  };

  before(async () => {
    server = createApiServer(
      {
        attendance: mockAttendanceStore,
        eta: mockEtaStore,
        notification: mockNotificationStore,
      },
      { v1: secretV1 },
    );

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

  function makeRequest(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const dataStr = body ? JSON.stringify(body) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {}),
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
                body: resBody ? JSON.parse(resBody) : null,
              });
            } catch {
              resolve({ status: res.statusCode ?? 500, body: resBody });
            }
          });
        },
      );
      req.on('error', reject);
      if (dataStr) req.write(dataStr);
      req.end();
    });
  }

  describe('POST /api/v1/attendance/scan', () => {
    test('accepts valid boarding scan and returns 200 with confirmation', async () => {
      const qrPayload = generateBoardingQrPayload(
        tripId,
        busId,
        testNowSec,
        'v1',
        secretV1,
        30,
      );

      const res = await makeRequest('POST', '/api/v1/attendance/scan', {
        qr_payload: qrPayload,
        session_student_id: studentId,
        boarding_stop_id: stopId,
        boarding_stop_name: 'Main Gate',
        timestamp_utc: testNowUtc,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.data.status, 'BOARDED');
      assert.equal(res.body.data.bus_number, '12');
      assert.match(res.body.data.confirmation_message, /Boarded Bus 12/);
    });

    test('rejects tampered QR signature with 400 QR_INVALID', async () => {
      const tampered = JSON.stringify({
        trip_id: tripId,
        bus_id: busId,
        slot: Math.floor(testNowSec / 30),
        key_version: 'v1',
        sig: 'badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb',
      });

      const res = await makeRequest('POST', '/api/v1/attendance/scan', {
        qr_payload: tampered,
        session_student_id: studentId,
        boarding_stop_id: stopId,
        boarding_stop_name: 'Main Gate',
        timestamp_utc: testNowUtc,
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'QR_INVALID');
    });

    test('rejects unknown trip with 409 TRIP_NOT_ACTIVE', async () => {
      const unknownTripId = '99999999-9999-9999-9999-999999999999';
      const unknownTripQr = generateBoardingQrPayload(
        unknownTripId,
        busId,
        testNowSec,
        'v1',
        secretV1,
        30,
      );

      const res = await makeRequest('POST', '/api/v1/attendance/scan', {
        qr_payload: unknownTripQr,
        session_student_id: studentId,
        boarding_stop_id: stopId,
        boarding_stop_name: 'Main Gate',
        timestamp_utc: testNowUtc,
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'TRIP_NOT_ACTIVE');
    });
  });

  describe('POST /api/v1/attendance/check-in', () => {
    test('allows coordinator manual late check-in with reason and returns 200', async () => {
      const res = await makeRequest('POST', '/api/v1/attendance/check-in', {
        type: 'MANUAL_LATE',
        student_id: studentId,
        trip_id: tripId,
        bus_id: busId,
        reason: 'Student arrived with approved sports duty slip',
        actor_id: 'cor-user-1',
        actor_role: 'COR',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.record.status, 'LATE_BOARDED');
      assert.equal(res.body.data.audit.action, 'MANUAL_CHECKIN');
    });

    test('rejects manual check-in from unauthorized role (STU) with 403', async () => {
      const res = await makeRequest('POST', '/api/v1/attendance/check-in', {
        type: 'MANUAL_LATE',
        student_id: studentId,
        trip_id: tripId,
        bus_id: busId,
        reason: 'Attempted self check-in',
        actor_id: studentId,
        actor_role: 'STU',
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'PERMISSION_DENIED');
    });

    test('logs non-passenger guest (FLAGGED_GUEST) with 200', async () => {
      const res = await makeRequest('POST', '/api/v1/attendance/check-in', {
        type: 'FLAGGED_GUEST',
        trip_id: tripId,
        bus_id: busId,
        guest_name: 'Dr. John Doe',
        guest_phone: '9848011223',
        reason: 'Guest symposium speaker',
        actor_id: 'cor-user-1',
        actor_role: 'COR',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.audit.new_value.is_enrolled_passenger, false);
    });
  });

  describe('GET /api/v1/eta/route', () => {
    test('returns 200 with available ETA along polyline for live bus', async () => {
      const res = await makeRequest('GET', `/api/v1/eta/route?route_id=${routeId}&bus_id=${busId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.is_available, true);
      assert.equal(res.body.data.next_stop.name, 'Main Gate');
      assert.ok(res.body.data.next_stop.eta_seconds > 0);
    });

    test('Rule 263: returns 200 with is_available: false when bus GPS is STALE', async () => {
      const res = await makeRequest('GET', `/api/v1/eta/route?route_id=${routeId}&bus_id=stale-bus`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.is_available, false);
      assert.equal(res.body.data.unavailability_reason, 'STALE_GPS');
      assert.equal(res.body.data.next_stop, null);
    });

    test('returns 400 when query parameters are missing', async () => {
      const res = await makeRequest('GET', `/api/v1/eta/route?route_id=${routeId}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'MISSING_PARAMS');
    });
  });

  describe('POST /api/v1/notifications/dispatch', () => {
    test('delivers SAFETY notification unconditionally (Rule R-11)', async () => {
      const res = await makeRequest('POST', '/api/v1/notifications/dispatch', {
        id: '12345678-1234-1234-1234-123456789012',
        user_id: studentId,
        category: 'SAFETY',
        priority: 'HIGH',
        title: 'EMERGENCY SOS',
        message: 'Bus emergency panic button pressed.',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.delivered, true);
      assert.equal(res.body.data.status, 'DELIVERED');
    });

    test('returns 404 for unknown recipient', async () => {
      const unknownUserId = '99999999-8888-7777-6666-555555555555';
      const res = await makeRequest('POST', '/api/v1/notifications/dispatch', {
        id: '12345678-1234-1234-1234-123456789012',
        user_id: unknownUserId,
        category: 'DELAY',
        priority: 'MEDIUM',
        title: 'Delay Alert',
        message: 'Delayed bus notification.',
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'RECIPIENT_NOT_FOUND');
    });
  });
});
