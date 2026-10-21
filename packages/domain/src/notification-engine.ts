export type AlertCategory = 'SAFETY' | 'DELAY' | 'SCHEDULE' | 'SYSTEM' | 'ATTENDANCE';
export type AlertPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export const DEFAULT_NOTIFICATION_CONFIG = {
  groupWindowSec: 120, // notify.group_window_s
  pushPerHour: 6,      // notify.push_per_hour
  quietStartHour: 22,  // notify.quiet_start
  quietEndHour: 6,     // notify.quiet_end
  approachDefaultMin: 5, // approach.default_min
} as const;

export interface OutgoingNotificationPayload {
  id: string;
  user_id: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  message: string;
  entity_type?: 'BUS' | 'TRIP' | 'STOP' | 'ATTENDANCE' | undefined;
  entity_id?: string | undefined;
  created_at: string; // ISO UTC
}

export interface RecipientPreferences {
  user_id: string;
  safety_locked: true; // Rule R-11: Always true
  approaching_stops: boolean;
  delays: boolean;
  attendance_alerts?: boolean | undefined;
  quiet_hours_enabled: boolean;
  push_token?: string | null | undefined;
}

export interface NotificationHistoryEntry {
  notification_id: string;
  user_id: string;
  category: AlertCategory;
  entity_id?: string | undefined;
  dispatched_at_ms: number;
}

export interface DispatchPipelineOptions {
  groupWindowSec?: number | undefined;
  pushPerHourLimit?: number | undefined;
  quietStartHour?: number | undefined; // e.g. 22
  quietEndHour?: number | undefined;   // e.g. 6
}

export type DispatchStatus =
  | 'DELIVERED'
  | 'SUPPRESSED_DUPLICATE'
  | 'SUPPRESSED_RATE_LIMIT'
  | 'SUPPRESSED_QUIET_HOURS'
  | 'SUPPRESSED_PREFERENCE'
  | 'FAILED_NO_TOKEN';

export interface DispatchResult {
  notification_id: string;
  user_id: string;
  status: DispatchStatus;
  delivered: boolean;
  reason?: string | undefined;
  nextRetryDelayMin?: number | undefined;
}

/**
 * Checks whether current campus hour falls within overnight quiet hours window (22:00 to 06:00)
 */
export function isWithinQuietHours(
  campusHour: number,
  quietStartHour: number = DEFAULT_NOTIFICATION_CONFIG.quietStartHour,
  quietEndHour: number = DEFAULT_NOTIFICATION_CONFIG.quietEndHour,
): boolean {
  if (quietStartHour > quietEndHour) {
    // Overnight window (e.g., 22:00 to 06:00)
    return campusHour >= quietStartHour || campusHour < quietEndHour;
  }
  return campusHour >= quietStartHour && campusHour < quietEndHour;
}

/**
 * Evaluates whether an outgoing notification can be dispatched to a recipient.
 *
 * Rules:
 * 1. Rule R-11: SAFETY category alerts are UNCONDITIONAL and NEVER suppressed by
 *    quiet hours, rate limits, or user preference switches.
 * 2. User Preferences: Delays, approaching stops, or attendance notifications must
 *    respect individual opt-in toggles.
 * 3. Quiet Hours: Suppresses non-safety notifications between 22:00 and 06:00 campus time.
 * 4. Deduplication: Suppresses identical (user, category, entity) messages within 120s.
 * 5. Rate Limiting: Enforces max 6 pushes per hour for non-safety messages.
 */
export function evaluateNotificationDispatch(
  notification: OutgoingNotificationPayload,
  recipient: RecipientPreferences,
  recentHistory: NotificationHistoryEntry[],
  currentCampusHour: number,
  nowUtc: string,
  options?: DispatchPipelineOptions | undefined,
): DispatchResult {
  const groupWindowSec = options?.groupWindowSec ?? DEFAULT_NOTIFICATION_CONFIG.groupWindowSec;
  const pushPerHour = options?.pushPerHourLimit ?? DEFAULT_NOTIFICATION_CONFIG.pushPerHour;
  const quietStart = options?.quietStartHour ?? DEFAULT_NOTIFICATION_CONFIG.quietStartHour;
  const quietEnd = options?.quietEndHour ?? DEFAULT_NOTIFICATION_CONFIG.quietEndHour;

  const nowMs = new Date(nowUtc).getTime();

  // RULE R-11: Emergency SOS and SAFETY alerts are unconditional and never suppressed
  if (notification.category === 'SAFETY') {
    if (!recipient.push_token) {
      return {
        notification_id: notification.id,
        user_id: recipient.user_id,
        status: 'FAILED_NO_TOKEN',
        delivered: false,
        reason: 'SAFETY alert generated but recipient has no active push token registered.',
        nextRetryDelayMin: 1, // First retry step in '1, 5, 30, 120'
      };
    }

    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'DELIVERED',
      delivered: true,
    };
  }

  // Check 1: User Category Preferences
  if (notification.category === 'DELAY' && recipient.delays === false) {
    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'SUPPRESSED_PREFERENCE',
      delivered: false,
      reason: 'Recipient disabled delay notifications in preferences.',
    };
  }

  if (notification.category === 'SCHEDULE' && recipient.approaching_stops === false) {
    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'SUPPRESSED_PREFERENCE',
      delivered: false,
      reason: 'Recipient disabled approaching stops / schedule alerts in preferences.',
    };
  }

  if (notification.category === 'ATTENDANCE' && recipient.attendance_alerts === false) {
    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'SUPPRESSED_PREFERENCE',
      delivered: false,
      reason: 'Recipient disabled attendance notifications in preferences.',
    };
  }

  // Check 2: Quiet Hours (22:00 to 06:00)
  if (recipient.quiet_hours_enabled) {
    if (isWithinQuietHours(currentCampusHour, quietStart, quietEnd)) {
      return {
        notification_id: notification.id,
        user_id: recipient.user_id,
        status: 'SUPPRESSED_QUIET_HOURS',
        delivered: false,
        reason: 'Notification suppressed by recipient quiet hours configuration.',
      };
    }
  }

  // Check 3: Deduplication within groupWindowSec (120s)
  const windowLimitMs = nowMs - groupWindowSec * 1000;
  const isDuplicate = recentHistory.some(h => {
    if (h.user_id !== recipient.user_id) return false;
    if (h.category !== notification.category) return false;
    if (h.dispatched_at_ms < windowLimitMs) return false;

    // Same entity target within window
    if (notification.entity_id && h.entity_id) {
      return notification.entity_id === h.entity_id;
    }
    return true;
  });

  if (isDuplicate) {
    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'SUPPRESSED_DUPLICATE',
      delivered: false,
      reason: `Duplicate notification suppressed within ${groupWindowSec}s deduplication window.`,
    };
  }

  // Check 4: Rate Limiting (max 6 per hour)
  const oneHourAgoMs = nowMs - 3600 * 1000;
  const hourlyCount = recentHistory.filter(
    h => h.user_id === recipient.user_id && h.dispatched_at_ms >= oneHourAgoMs,
  ).length;

  if (hourlyCount >= pushPerHour) {
    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'SUPPRESSED_RATE_LIMIT',
      delivered: false,
      reason: `Rate limit of ${pushPerHour} push notifications per hour exceeded.`,
    };
  }

  // Check 5: Active Push Token
  if (!recipient.push_token) {
    return {
      notification_id: notification.id,
      user_id: recipient.user_id,
      status: 'FAILED_NO_TOKEN',
      delivered: false,
      reason: 'No push token registered for recipient device.',
      nextRetryDelayMin: 1,
    };
  }

  return {
    notification_id: notification.id,
    user_id: recipient.user_id,
    status: 'DELIVERED',
    delivered: true,
  };
}

/**
 * Helper to compute approaching stop trigger threshold.
 * Specification 21.3:
 * Proximity arrival notification triggered when bus ETA to student's stop
 * drops below threshold (default approach.default_min = 5 min, range 2 to 15 min).
 */
export function isApproachingStopAlertTriggered(
  etaSeconds: number | null,
  configuredApproachMinutes = DEFAULT_NOTIFICATION_CONFIG.approachDefaultMin,
): boolean {
  if (etaSeconds === null || etaSeconds <= 0) {
    return false;
  }
  const thresholdSeconds = configuredApproachMinutes * 60;
  return etaSeconds <= thresholdSeconds;
}

/**
 * Helper to compute schedule delay alert trigger threshold.
 * Specification 21.4:
 * Delay notification generated when bus delay relative to scheduled arrival exceeds 10 minutes.
 */
export function isScheduleDelayAlertTriggered(
  delayMinutes: number,
  thresholdMinutes = 10,
): boolean {
  return delayMinutes >= thresholdMinutes;
}
