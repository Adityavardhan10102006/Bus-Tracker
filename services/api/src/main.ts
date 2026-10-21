import http from 'node:http';
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

  // Default in-memory stores for fallback/dev
  const ingestionStore: IngestionDataStore = stores.ingestion ?? {
    async getDevice(id: string) {
      return { id, status: 'ACTIVE', first_used_at: new Date() };
    },
    async getDeviceTokens() {
      return [];
    },
    async getActiveDeviceBusLinks() {
      return [];
    },
  };

  const attendanceStore: AttendanceDataStore = stores.attendance ?? {
    async getActiveTrip() {
      return null;
    },
    async getStudentRoster() {
      return null;
    },
    async getAttendanceRecord() {
      return null;
    },
  };

  const etaStore: EtaDataStore = stores.eta ?? {
    async getRouteGeometry() {
      return null;
    },
    async getBusTelemetry() {
      return null;
    },
  };

  const notificationStore: NotificationDataStore = stores.notification ?? {
    async getRecipientPreferences() {
      return null;
    },
    async getRecentNotificationHistory() {
      return [];
    },
  };

  const defaultKeys = customHmacKeys ?? {
    v1: process.env.DEVICE_TOKEN_HMAC_KEYS
      ? JSON.parse(process.env.DEVICE_TOKEN_HMAC_KEYS).v1 ?? 'default_vjit_device_secret_key_entropy'
      : 'default_vjit_device_secret_key_entropy',
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

      // Health & Observability routes
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

      // GET Route: Real-time ETA along route geometry
      if (method === 'GET' && pathname === '/api/v1/eta/route') {
        return handleRouteEta(req, res, url, requestId, etaStore).catch(err => {
          logger.error('Route ETA handler error', err as Error);
          sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'Internal error calculating route ETA.', requestId);
        });
      }

      // Enforce Content-Type for state-changing write operations
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
    const config = loadAndValidateConfig();
    const server = createApiServer();

    server.listen(config.PORT, () => {
      logger.info(`VJIT Bus Tracker API started`, {
        port: config.PORT,
        appEnv: config.APP_ENV,
        nodeEnv: config.NODE_ENV,
      });
    });
  } catch (err) {
    logger.error('Fatal API initialization error', err as Error);
    process.exit(1);
  }
}
