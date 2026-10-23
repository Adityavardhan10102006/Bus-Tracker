import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { logger, runWithRequestContext } from '@vjit/logger';
import { loadAndValidateConfig } from '@vjit/config';
import {
  resolveRequestId,
  applySecurityHeaders,
  isAllowedContentType,
  sendErrorResponse,
} from './middleware/security.js';
import { getLivenessStatus, getReadinessStatus, getVersionInfo } from './health/health.js';
import { handleTelemetryIngestion, type IngestionDataStore } from './routes/telemetry.js';
import { handleHeartbeatIngestion } from './routes/heartbeat.js';
import {
  handleAttendanceScan,
  handleAttendanceCheckIn,
  type AttendanceDataStore,
} from './routes/attendance.js';
import { handleRouteEta, type EtaDataStore } from './routes/eta.js';
import {
  handleNotificationDispatch,
  type NotificationDataStore,
} from './routes/notifications.js';
import { fleetDataStore } from './store/fleet-data-store.js';
import { handleFleetApiRoutes } from './routes/fleet-routes.js';
import { renderPortalHtml } from './ui/portal-page.js';
import { renderMobileHtml } from './ui/mobile-page.js';
import { renderAdminHtml } from './ui/admin-page.js';
import { getManifestJson, getServiceWorkerJs } from './ui/pwa.js';

export interface ApiStores {
  ingestion?: IngestionDataStore | undefined;
  attendance?: AttendanceDataStore | undefined;
  eta?: EtaDataStore | undefined;
  notification?: NotificationDataStore | undefined;
}

export function createApiServer(
  customStore?: IngestionDataStore | ApiStores,
  customHmacKeys?: Record<string, string>,
) {
  // Support either single IngestionDataStore (legacy) or full ApiStores
  let stores: ApiStores = {};
  if (customStore) {
    if ('getDevice' in customStore) {
      stores.ingestion = customStore as IngestionDataStore;
    } else {
      stores = customStore as ApiStores;
    }
  }

  // Integrated in-memory stores with full VJIT network seed data
  const ingestionStore: IngestionDataStore = stores.ingestion ?? fleetDataStore;
  const attendanceStore: AttendanceDataStore = stores.attendance ?? fleetDataStore;
  const etaStore: EtaDataStore = stores.eta ?? fleetDataStore;
  const notificationStore: NotificationDataStore = stores.notification ?? fleetDataStore;

  const defaultKeys = customHmacKeys ?? {
    v1: process.env.DEVICE_TOKEN_HMAC_KEYS
      ? JSON.parse(process.env.DEVICE_TOKEN_HMAC_KEYS).v1 ?? 'vjit_device_token_hmac_entropy_keyval_cluster_987'
      : 'vjit_device_token_hmac_entropy_keyval_cluster_987',
  };

  const server = http.createServer((req, res) => {
    const requestId = resolveRequestId(req.headers['x-request-id']);

    runWithRequestContext(requestId, () => {
      applySecurityHeaders(res, requestId);

      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method?.toUpperCase();

      logger.info('HTTP Request received', {
        method,
        path: pathname,
        userAgent: req.headers['user-agent'],
      });

      // 1. Health & Observability routes
      if (method === 'GET' && (pathname === '/health' || pathname === '/healthz')) {
        const status = getLivenessStatus();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(status));
      }

      if (method === 'GET' && (pathname === '/health/ready' || pathname === '/readyz')) {
        return getReadinessStatus()
          .then(readyStatus => {
            const statusCode = readyStatus.status === 'ok' ? 200 : 503;
            res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(readyStatus));
          })
          .catch(err => {
            logger.error('Readiness check failed', err as Error);
            sendErrorResponse(
              res,
              503,
              'SERVICE_UNAVAILABLE',
              'Service readiness check failed.',
              requestId,
            );
          });
      }

      if (method === 'GET' && pathname === '/version') {
        const version = getVersionInfo(process.env.APP_ENV ?? 'local');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(version));
      }

      // 2. Static Assets & Progressive Web App (PWA) Manifest & Service Worker
      if (method === 'GET' && (pathname === '/manifest.json' || pathname === '/app/manifest.json')) {
        const manifest = getManifestJson();
        res.writeHead(200, {
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        });
        return res.end(manifest);
      }

      if (method === 'GET' && pathname === '/sw.js') {
        const sw = getServiceWorkerJs();
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Service-Worker-Allowed': '/',
          'Cache-Control': 'no-cache',
        });
        return res.end(sw);
      }

      // Static Assets: VJIT Emblem (preserved 1.242:1 aspect ratio)
      if (method === 'GET' && (pathname === '/assets/vjit-logo.png' || pathname === '/vjit-logo.png')) {
        const logoPath = path.resolve(process.cwd(), 'apps/mobile/assets/vjit-logo.png');
        if (fs.existsSync(logoPath)) {
          const data = fs.readFileSync(logoPath);
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
          });
          return res.end(data);
        }
      }

      // 3. Application Web UI Surfaces (UI-SPEC-1.0 & MVP deliverables)
      if (method === 'GET') {
        if (pathname === '/' || pathname === '/portal') {
          const html = renderPortalHtml();
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'SAMEORIGIN',
          });
          return res.end(html);
        }

        if (pathname === '/app' || pathname === '/mobile') {
          const html = renderMobileHtml();
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'SAMEORIGIN',
          });
          return res.end(html);
        }

        if (pathname === '/admin' || pathname === '/console') {
          const html = renderAdminHtml();
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'SAMEORIGIN',
          });
          return res.end(html);
        }
      }

      // 4. GET Route: Real-time ETA along route geometry
      if (method === 'GET' && pathname === '/api/v1/eta/route') {
        return handleRouteEta(req, res, url, requestId, etaStore).catch(err => {
          logger.error('Route ETA handler error', err as Error);
          sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'Internal error calculating route ETA.', requestId);
        });
      }

      // 5. Fleet and Snapshot REST APIs (Snapshot, Routes, Buses, Devices, Alerts, RBAC, Simulation)
      if (
        pathname.startsWith('/api/v1/snapshot') ||
        pathname.startsWith('/api/v1/routes') ||
        pathname.startsWith('/api/v1/buses') ||
        pathname.startsWith('/api/v1/devices') ||
        pathname.startsWith('/api/v1/alerts') ||
        pathname.startsWith('/api/v1/me') ||
        pathname.startsWith('/api/v1/auth') ||
        pathname.startsWith('/api/v1/demo') ||
        (pathname === '/api/v1/attendance' || pathname === '/api/v1/attendance/manual-checkin') ||
        pathname.startsWith('/api/v1/maintenance') ||
        pathname.startsWith('/api/v1/settings') ||
        pathname.startsWith('/api/v1/audit-logs') ||
        pathname.startsWith('/api/v1/diagnostics') ||
        pathname.startsWith('/api/v1/admin')
      ) {
        return handleFleetApiRoutes(req, res, url, requestId)
          .then(handled => {
            if (!handled) {
              sendErrorResponse(
                res,
                404,
                'NOT_FOUND',
                `Endpoint ${method} ${pathname} not found or outside authorized scope.`,
                requestId,
              );
            }
          })
          .catch(err => {
            logger.error('Fleet API route handling error', err as Error);
            sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'Internal server error in fleet API.', requestId);
          });
      }

      // 6. Ingestion & Attendance Write Routes (Telemetry, Heartbeat, Attendance, Notifications)
      if (method === 'POST') {
        if (!isAllowedContentType(req)) {
          return sendErrorResponse(
            res,
            415,
            'UNSUPPORTED_MEDIA_TYPE',
            'Only application/json content type is accepted.',
            requestId,
          );
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
          // Security limit: abort if body exceeds 64 KB total stream
          if (body.length > 65536) {
            req.destroy();
          }
        });

        req.on('end', async () => {
          try {
            if (pathname === '/api/v1/telemetry') {
              return await handleTelemetryIngestion(
                req,
                res,
                body,
                requestId,
                ingestionStore,
                defaultKeys,
              );
            }

            if (pathname === '/api/v1/heartbeat') {
              return await handleHeartbeatIngestion(
                req,
                res,
                body,
                requestId,
                ingestionStore,
                defaultKeys,
              );
            }

            if (pathname === '/api/v1/attendance/scan') {
              return await handleAttendanceScan(
                req,
                res,
                body,
                requestId,
                attendanceStore,
                defaultKeys,
              );
            }

            if (pathname === '/api/v1/attendance/check-in') {
              return await handleAttendanceCheckIn(
                req,
                res,
                body,
                requestId,
                attendanceStore,
              );
            }

            if (pathname === '/api/v1/notifications/dispatch') {
              return await handleNotificationDispatch(
                req,
                res,
                body,
                requestId,
                notificationStore,
              );
            }

            // Default 404 for unknown endpoints per Part I.3
            return sendErrorResponse(
              res,
              404,
              'NOT_FOUND',
              `Endpoint ${method} ${pathname} not found or outside authorized scope.`,
              requestId,
            );
          } catch (err) {
            logger.error('Unhandled route execution error', err as Error);
            return sendErrorResponse(
              res,
              500,
              'INTERNAL_ERROR',
              'An unexpected internal error occurred.',
              requestId,
            );
          }
        });

        return;
      }

      // Default 404 for non-POST unknown routes
      return sendErrorResponse(
        res,
        404,
        'NOT_FOUND',
        `Endpoint ${method} ${pathname} not found or outside authorized scope.`,
        requestId,
      );
    });
  });

  return server;
}

// Self-starting when executed directly
if (process.argv[1]?.endsWith('main.js') || process.argv[1]?.endsWith('main.ts')) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile();
      } catch {
        // .env file optional
      }
    }

    // Baseline fallbacks for direct local demonstration
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app_runtime:runtime_secure_pass_phrase_vjit_2026@localhost:5432/bus_tracker_dev?schema=public';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'vjit_jwt_signing_key_production_grade_entropy_2026_x89a';
    process.env.DEVICE_TOKEN_HMAC_KEYS = process.env.DEVICE_TOKEN_HMAC_KEYS || JSON.stringify({ v1: 'vjit_device_token_hmac_entropy_keyval_cluster_987' });
    process.env.QR_HMAC_KEYS = process.env.QR_HMAC_KEYS || JSON.stringify({ v1: 'vjit_qr_signature_hmac_entropy_keyval_cluster_456' });

    const config = loadAndValidateConfig();
    const server = createApiServer();

    server.listen(config.PORT, () => {
      logger.info(`VJIT Bus Tracker API started`, {
        port: config.PORT,
        appEnv: config.APP_ENV,
        nodeEnv: config.NODE_ENV,
        portalUrl: `http://localhost:${config.PORT}/`,
        studentAppUrl: `http://localhost:${config.PORT}/app`,
        adminConsoleUrl: `http://localhost:${config.PORT}/admin`,
      });
    });
  } catch (err) {
    logger.error('Fatal API initialization error', err as Error);
    process.exit(1);
  }
}
