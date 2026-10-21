import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from '@vjit/contracts';
import {
  evaluateNotificationDispatch,
  type OutgoingNotificationPayload,
  type RecipientPreferences,
  type NotificationHistoryEntry,
  type DispatchResult,
} from '@vjit/domain';
import { sendErrorResponse } from '../middleware/security.js';

export const dispatchNotificationRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category: z.enum(['SAFETY', 'DELAY', 'SCHEDULE', 'SYSTEM', 'ATTENDANCE']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  entity_type: z.enum(['BUS', 'TRIP', 'STOP', 'ATTENDANCE']).optional(),
  entity_id: z.string().optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
});

export interface NotificationDataStore {
  getRecipientPreferences(userId: string): Promise<RecipientPreferences | null>;
  getRecentNotificationHistory(userId: string): Promise<NotificationHistoryEntry[]>;
  recordNotificationDispatch?(entry: NotificationHistoryEntry): Promise<void>;
}

/**
 * Handles POST /api/v1/notifications/dispatch
 * Implements Specification 21.1–21.6 & Rule R-11 (Safety lock)
 */
export async function handleNotificationDispatch(
  _req: IncomingMessage,
  res: ServerResponse,
  rawBody: string,
  requestId: string,
  store: NotificationDataStore,
  campusHour?: number,
): Promise<void> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return sendErrorResponse(
      res,
      400,
      'INVALID_PAYLOAD',
      'Malformed JSON in notification dispatch request.',
      requestId,
    );
  }

  const parseResult = dispatchNotificationRequestSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return sendErrorResponse(
      res,
      400,
      'SCHEMA_VIOLATION',
      parseResult.error.issues[0]?.message ?? 'Invalid notification schema.',
      requestId,
    );
  }

  const data = parseResult.data;
  const nowUtc = data.created_at ?? new Date().toISOString();

  const recipient = await store.getRecipientPreferences(data.user_id);
  if (!recipient) {
    return sendErrorResponse(
      res,
      404,
      'RECIPIENT_NOT_FOUND',
      `User preferences for recipient ${data.user_id} not found.`,
      requestId,
    );
  }

  const history = await store.getRecentNotificationHistory(data.user_id);

  // Compute current hour in Asia/Kolkata campus time (UTC + 5:30) if not explicitly provided
  let effectiveCampusHour: number;
  if (campusHour !== undefined) {
    effectiveCampusHour = campusHour;
  } else {
    const nowDate = new Date(nowUtc);
    const kolkataHours = (nowDate.getUTCHours() + 5 + Math.floor((nowDate.getUTCMinutes() + 30) / 60)) % 24;
    effectiveCampusHour = kolkataHours;
  }

  const notificationPayload: OutgoingNotificationPayload = {
    id: data.id,
    user_id: data.user_id,
    category: data.category,
    priority: data.priority,
    title: data.title,
    message: data.message,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    created_at: nowUtc,
  };

  const outcome: DispatchResult = evaluateNotificationDispatch(
    notificationPayload,
    recipient,
    history,
    effectiveCampusHour,
    nowUtc,
  );

  if (outcome.delivered && store.recordNotificationDispatch) {
    await store.recordNotificationDispatch({
      notification_id: outcome.notification_id,
      user_id: outcome.user_id,
      category: data.category,
      entity_id: data.entity_id,
      dispatched_at_ms: new Date(nowUtc).getTime(),
    });
  }

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      status: 'ok',
      data: outcome,
      request_id: requestId,
    }),
  );
}
