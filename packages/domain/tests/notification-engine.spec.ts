import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateNotificationDispatch,
  isWithinQuietHours,
  isApproachingStopAlertTriggered,
  isScheduleDelayAlertTriggered,
  type OutgoingNotificationPayload,
  type RecipientPreferences,
  type NotificationHistoryEntry,
} from '../dist/index.js';

describe('Domain: Service Notification & Dispatch Pipeline (Spec 21.1–21.6 & Rule R-11)', () => {
  const userId = 'user-student-99';
  const nowUtc = '2026-10-21T08:00:00.000Z'; // 08:00 UTC = 13:30 Campus time (daytime)
  const nowMs = new Date(nowUtc).getTime();

  const standardRecipient: RecipientPreferences = {
    user_id: userId,
    safety_locked: true,
    approaching_stops: true,
    delays: true,
    attendance_alerts: true,
    quiet_hours_enabled: true,
    push_token: 'ExponentPushToken[mock-active-token]',
  };

  const sampleDelayNotification: OutgoingNotificationPayload = {
    id: 'notif-1',
    user_id: userId,
    category: 'DELAY',
    priority: 'MEDIUM',
    title: 'Bus Delay Alert',
    message: 'Bus 12 is delayed by 15 minutes due to heavy ring road traffic.',
    entity_type: 'BUS',
    entity_id: 'bus-12',
    created_at: nowUtc,
  };

  test('Rule R-11: Emergency SOS / SAFETY alerts are delivered unconditionally bypassing quiet hours and rate limits', () => {
    const safetyNotification: OutgoingNotificationPayload = {
      id: 'notif-sos-1',
      user_id: userId,
      category: 'SAFETY',
      priority: 'HIGH',
      title: 'EMERGENCY SOS ALERT',
      message: 'Bus 12 driver activated physical dashboard panic button.',
      entity_type: 'BUS',
      entity_id: 'bus-12',
      created_at: nowUtc,
    };

    // Recipient has all options disabled, overnight quiet hours, and 10 recent notifications in history
    const restrictedRecipient: RecipientPreferences = {
      ...standardRecipient,
      delays: false,
      approaching_stops: false,
      attendance_alerts: false,
      quiet_hours_enabled: true,
    };

    const heavyHistory: NotificationHistoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
      notification_id: `past-${i}`,
      user_id: userId,
      category: 'DELAY',
      dispatched_at_ms: nowMs - 60000 * i,
    }));

    // Overnight campus hour: 02:00 AM
    const campusHourOvernight = 2;

    const result = evaluateNotificationDispatch(
      safetyNotification,
      restrictedRecipient,
      heavyHistory,
      campusHourOvernight,
      nowUtc,
    );

    assert.equal(result.delivered, true);
    assert.equal(result.status, 'DELIVERED');
  });

  test('suppresses non-safety notification if recipient disabled that category preference', () => {
    const optOutRecipient: RecipientPreferences = {
      ...standardRecipient,
      delays: false,
    };

    const result = evaluateNotificationDispatch(
      sampleDelayNotification,
      optOutRecipient,
      [],
      14, // 2 PM daytime
      nowUtc,
    );

    assert.equal(result.delivered, false);
    assert.equal(result.status, 'SUPPRESSED_PREFERENCE');
  });

  test('suppresses non-safety notifications during overnight quiet hours (22:00 to 06:00)', () => {
    assert.equal(isWithinQuietHours(23, 22, 6), true);  // 11 PM
    assert.equal(isWithinQuietHours(1, 22, 6), true);   // 1 AM
    assert.equal(isWithinQuietHours(5, 22, 6), true);   // 5 AM
    assert.equal(isWithinQuietHours(6, 22, 6), false);  // 6 AM (quiet ends)
    assert.equal(isWithinQuietHours(14, 22, 6), false); // 2 PM

    const quietHourResult = evaluateNotificationDispatch(
      sampleDelayNotification,
      standardRecipient,
      [],
      23, // 11 PM
      nowUtc,
    );

    assert.equal(quietHourResult.delivered, false);
    assert.equal(quietHourResult.status, 'SUPPRESSED_QUIET_HOURS');
  });

  test('suppresses duplicate notifications for the same entity within 120s window', () => {
    const recentHistory: NotificationHistoryEntry[] = [
      {
        notification_id: 'prev-notif',
        user_id: userId,
        category: 'DELAY',
        entity_id: 'bus-12',
        dispatched_at_ms: nowMs - 45000, // 45 seconds ago (< 120s)
      },
    ];

    const duplicateResult = evaluateNotificationDispatch(
      sampleDelayNotification,
      standardRecipient,
      recentHistory,
      14,
      nowUtc,
    );

    assert.equal(duplicateResult.delivered, false);
    assert.equal(duplicateResult.status, 'SUPPRESSED_DUPLICATE');
  });

  test('suppresses non-safety notifications when hourly push rate limit (6/hr) is exceeded', () => {
    // 6 prior notifications within the last hour
    const limitHistory: NotificationHistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
      notification_id: `rate-${i}`,
      user_id: userId,
      category: 'SCHEDULE',
      dispatched_at_ms: nowMs - (10 + i) * 60000, // between 10m and 15m ago
    }));

    const rateResult = evaluateNotificationDispatch(
      sampleDelayNotification,
      standardRecipient,
      limitHistory,
      14,
      nowUtc,
    );

    assert.equal(rateResult.delivered, false);
    assert.equal(rateResult.status, 'SUPPRESSED_RATE_LIMIT');
  });

  test('flags failure with retry schedule step when recipient lacks push token', () => {
    const noTokenRecipient: RecipientPreferences = {
      ...standardRecipient,
      push_token: null,
    };

    const result = evaluateNotificationDispatch(
      sampleDelayNotification,
      noTokenRecipient,
      [],
      14,
      nowUtc,
    );

    assert.equal(result.delivered, false);
    assert.equal(result.status, 'FAILED_NO_TOKEN');
    assert.equal(result.nextRetryDelayMin, 1);
  });

  test('evaluates approaching stop triggers with threshold (default 5 min)', () => {
    // ETA is 3 minutes (180s) -> triggered
    assert.equal(isApproachingStopAlertTriggered(180, 5), true);
    // ETA is 5 minutes (300s) -> triggered
    assert.equal(isApproachingStopAlertTriggered(300, 5), true);
    // ETA is 8 minutes (480s) -> NOT triggered yet
    assert.equal(isApproachingStopAlertTriggered(480, 5), false);
    // ETA is null or 0 -> false
    assert.equal(isApproachingStopAlertTriggered(null, 5), false);
    assert.equal(isApproachingStopAlertTriggered(0, 5), false);
  });

  test('evaluates schedule delay triggers with threshold (default 10 min)', () => {
    assert.equal(isScheduleDelayAlertTriggered(12, 10), true);
    assert.equal(isScheduleDelayAlertTriggered(10, 10), true);
    assert.equal(isScheduleDelayAlertTriggered(8, 10), false);
  });
});
