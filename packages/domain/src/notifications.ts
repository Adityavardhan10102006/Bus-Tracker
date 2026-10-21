import type { ServiceAlert } from '@vjit/contracts';

export interface NotificationFilterOptions {
  quietHoursEnabled: boolean;
  quietStartHour: number; // e.g. 22 (10 PM)
  quietEndHour: number;   // e.g. 6 (6 AM)
  currentHourCampus: number;
}

/**
 * Evaluates whether an alert can be delivered to the student/faculty device.
 * Rule R-11: SAFETY category CANNOT be muted, disabled, or suppressed by quiet hours.
 */
export function shouldDeliverNotification(
  alert: ServiceAlert,
  options: NotificationFilterOptions,
): boolean {
  // Rule R-11: Emergency & Safety alerts are unconditional and never suppressed
  if (alert.category === 'SAFETY') {
    return true;
  }

  // Check quiet hours for non-safety alerts
  if (options.quietHoursEnabled) {
    const { quietStartHour, quietEndHour, currentHourCampus } = options;
    if (quietStartHour > quietEndHour) {
      // Overnight window (e.g. 22:00 -> 06:00)
      if (currentHourCampus >= quietStartHour || currentHourCampus < quietEndHour) {
        return false;
      }
    } else if (currentHourCampus >= quietStartHour && currentHourCampus < quietEndHour) {
      return false;
    }
  }

  return true;
}
