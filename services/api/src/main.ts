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

export function createApiServer() {
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

      // Enforce Content-Type for state-changing operations
      if (!isAllowedContentType(req)) {
        return sendErrorResponse(
          res,
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Only application/json content type is accepted.',
          requestId,
        );
      }

      // Health & Observability routes
      if (method === 'GET' && (pathname === '/health' || pathname === '/healthz')) {
        const status = getLivenessStatus();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(status));
      }

      if (method === 'GET' && (pathname === '/health/ready' || pathname === '/readyz')) {
        // Internal/readiness check
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

      // Default 404 for unknown endpoints per Part I.3
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
