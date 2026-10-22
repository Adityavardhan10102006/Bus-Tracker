import type { IncomingMessage, ServerResponse } from 'node:http';
import { heartbeatPayloadSchema } from '@vjit/contracts';
import {
  validateBearerTokenFormat,
  evaluateDeviceAuthStatus,
  hashDeviceToken,
  evaluateDeviceHealth,
} from '@vjit/domain';
import { logger } from '@vjit/logger';
import { sendErrorResponse } from '../middleware/security.js';
import type { IngestionDataStore } from './telemetry.js';

/**
 * Handles POST /api/v1/heartbeat
 * Implements Specification 11.6 & HW-INT-1.0 Section 5
 */
export async function handleHeartbeatIngestion(
  req: IncomingMessage,
  res: ServerResponse,
  rawBody: string,
  requestId: string,
  store: IngestionDataStore,
  hmacKeySecrets: Record<string, string>,
): Promise<void> {
  const receivedAt = new Date();

  // 1. Validate payload size <= 8 KB
  if (Buffer.from(rawBody, 'utf-8').length > 8192) {
    return sendErrorResponse(
      res,
      413,
      'PAYLOAD_TOO_LARGE',
      'Heartbeat payload exceeds 8,192 bytes limit.',
      requestId,
    );
  }

  // 2. Validate Bearer token
  const authCheck = validateBearerTokenFormat(req.headers['authorization']);
  if (!authCheck.valid || !authCheck.token) {
    return sendErrorResponse(
      res,
      401,
      'AUTH_REQUIRED',
      'Valid Bearer authentication token required.',
      requestId,
    );
  }

  // 3. Parse JSON with schema
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return sendErrorResponse(
      res,
      400,
      'VALIDATION_FAILED',
      'Malformed JSON payload.',
      requestId,
    );
  }

  const parsed = heartbeatPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return sendErrorResponse(
      res,
      400,
      'VALIDATION_FAILED',
      'Heartbeat payload failed schema validation.',
      requestId,
      parsed.error.issues,
    );
  }

  const heartbeatData = parsed.data;

  // 4. Authenticate device
  const device = await store.getDevice(heartbeatData.device_id);
  if (!device) {
    return sendErrorResponse(
      res,
      401,
      'AUTH_REQUIRED',
      'Device authentication failed.',
      requestId,
    );
  }

  const storedTokens = await store.getDeviceTokens(heartbeatData.device_id);
  const computedHashes: Record<string, string> = {};
  for (const [keyVersion, secret] of Object.entries(hmacKeySecrets)) {
    computedHashes[keyVersion] = hashDeviceToken(authCheck.token, secret);
  }

  const authEval = evaluateDeviceAuthStatus(device, storedTokens, computedHashes);
  if (!authEval.authenticated) {
    const status = authEval.errorCode === 'DEVICE_INACTIVE' ? 403 : 401;
    return sendErrorResponse(
      res,
      status,
      authEval.errorCode ?? 'AUTH_REQUIRED',
      authEval.errorMessage ?? 'Device authentication failed.',
      requestId,
    );
  }

  // 5. Evaluate device health
  const healthResult = evaluateDeviceHealth({
    lastHeartbeatTime: new Date(heartbeatData.timestamp),
    currentTime: receivedAt,
    ignition: heartbeatData.ignition,
  });

  logger.info('Device heartbeat received', {
    deviceId: device.id,
    health: healthResult.health,
    ignition: heartbeatData.ignition,
    batteryMv: heartbeatData.battery_mv,
    satellites: heartbeatData.satellites,
  });

  if (store.recordHeartbeat) {
    await store.recordHeartbeat(device.id, heartbeatData, receivedAt);
  }

  const response = {
    status: healthResult.health === 'ONLINE' ? 'HEALTHY' : 'DEGRADED',
    pending_action: 'NONE',
    server_time: receivedAt.toISOString(),
  };

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(response));
}
