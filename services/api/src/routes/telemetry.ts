import type { IncomingMessage, ServerResponse } from 'node:http';
import { telemetryPayloadSchema } from '@vjit/contracts';
import {
  validateBearerTokenFormat,
  evaluateDeviceAuthStatus,
  hashDeviceToken,
  processTelemetryBatch,
  buildTelemetryAckResponse,
  evaluateHardwareEvent,
  resolveActiveBusForDevice,
  type DeviceStatus,
  type DeviceBusLinkRecord,
} from '@vjit/domain';
import { logger } from '@vjit/logger';
import { sendErrorResponse } from '../middleware/security.js';

export interface IngestionDataStore {
  getDevice(deviceId: string): Promise<{
    id: string;
    status: DeviceStatus;
    first_used_at?: Date | null;
  } | null>;
  getDeviceTokens(deviceId: string): Promise<Array<{
    key_version: string;
    token_hash: string;
    is_revoked: boolean;
  }>>;
  getActiveDeviceBusLinks(deviceId: string): Promise<DeviceBusLinkRecord[]>;
  getRecentSignatures?(deviceId: string): Array<{
    device_id: string;
    boot_id: string;
    seq: number;
    latitude: number;
    longitude: number;
    recorded_at: string;
  }>;
  saveTelemetryBatch?(batch: {
    deviceId: string;
    busId: string | null;
    samples: any[];
    events: any[];
    receivedAt: Date;
    latestLiveSample?: any;
  }): Promise<void>;
  updateDeviceActivity?(deviceId: string, activate: boolean, now: Date): Promise<void>;
  recordHeartbeat?(deviceId: string, heartbeat: any, now: Date): Promise<void>;
}

/**
 * Handles POST /api/v1/telemetry
 * Implements Specification 11.1, 11.3, 11.5 & HW-INT-1.0
 */
export async function handleTelemetryIngestion(
  req: IncomingMessage,
  res: ServerResponse,
  rawBody: string,
  requestId: string,
  store: IngestionDataStore,
  hmacKeySecrets: Record<string, string>,
): Promise<void> {
  const receivedAt = new Date();

  // 1. Validate payload size <= 8 KB (8192 bytes)
  const bodyBuffer = Buffer.from(rawBody, 'utf-8');
  if (bodyBuffer.length > 8192) {
    return sendErrorResponse(
      res,
      413,
      'PAYLOAD_TOO_LARGE',
      `Telemetry payload exceeds maximum allowed size of 8,192 bytes (received: ${bodyBuffer.length} bytes).`,
      requestId,
    );
  }

  // 2. Validate Bearer token format
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

  // 3. Parse JSON envelope with Zod schema (Rule 6: Schema error rejects whole request)
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

  const parsed = telemetryPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return sendErrorResponse(
      res,
      400,
      'VALIDATION_FAILED',
      'Telemetry payload failed schema validation.',
      requestId,
      parsed.error.issues,
    );
  }

  const telemetryData = parsed.data;

  // 4. Authenticate device and verify lifecycle status
  const device = await store.getDevice(telemetryData.device_id);
  if (!device) {
    return sendErrorResponse(
      res,
      401,
      'AUTH_REQUIRED',
      'Device authentication failed.',
      requestId,
    );
  }

  const storedTokens = await store.getDeviceTokens(telemetryData.device_id);
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

  // If Conflict C-01 applies, update device to ACTIVE
  if (authEval.shouldActivateDevice && store.updateDeviceActivity) {
    await store.updateDeviceActivity(device.id, true, receivedAt);
  }

  // 5. Resolve active bus association at received_at
  const links = await store.getActiveDeviceBusLinks(device.id);
  const { busId } = resolveActiveBusForDevice(device.id, receivedAt, links);

  // 6. Process sample batch through 14-step validation pipeline
  const existingSamples = store.getRecentSignatures ? store.getRecentSignatures(telemetryData.device_id) : undefined;
  const batchResult = processTelemetryBatch(telemetryData.samples, {
    serverReceivedAt: receivedAt,
    deviceId: telemetryData.device_id,
    bootId: telemetryData.boot_id,
    existingSamples,
  });

  // 7. Process hardware events (e.g., SOS)
  const eventResults = (telemetryData.events ?? []).map(event =>
    evaluateHardwareEvent(event, busId, receivedAt, []),
  );

  // 8. Persist accepted telemetry and update active bus coordinates
  if (store.saveTelemetryBatch) {
    await store.saveTelemetryBatch({
      deviceId: device.id,
      busId: busId ?? null,
      samples: telemetryData.samples,
      latestLiveSample: batchResult.latestLiveSample,
      events: telemetryData.events ?? [],
      receivedAt,
    });
  }

  // 9. Log device ingestion without exposing plaintext token (Rule B.7 & Rule F Control 18)
  logger.info('Device telemetry accepted', {
    deviceId: device.id,
    busId,
    sampleCount: telemetryData.samples.length,
    ackSeq: batchResult.ackSeq,
    rejectedCount: batchResult.rejectedList.length,
  });

  // 9. Build and return conforming acknowledgment response
  const response = buildTelemetryAckResponse({
    ackSeq: batchResult.ackSeq,
    rejected: batchResult.rejectedList,
    eventResults: eventResults.map(e => ({
      seq: e.seq,
      status: e.status,
      incident_id: e.incident_id,
    })),
    serverTime: receivedAt,
  });

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(response));
}
