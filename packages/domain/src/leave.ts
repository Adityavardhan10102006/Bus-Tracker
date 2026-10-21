export interface LeaveCutoffCheck {
  allowed: boolean;
  code?: 'PAST_CUTOFF' | 'ALREADY_BOARDED' | 'INVALID_DATE';
  message?: string;
  minutesUntilCutoff?: number;
}

/**
 * Validates whether student leave can be marked or cancelled.
 * Specification 18.7 & Part I.5:
 * Cutoff is 30 minutes before the scheduled trip departure (leave.cutoff_before_trip_min).
 */
export function validateLeaveCutoff(
  scheduledDepartureUtc: string,
  nowUtc: string,
  cutoffMinutes = 30,
  hasBoarded = false,
): LeaveCutoffCheck {
  if (hasBoarded) {
    return {
      allowed: false,
      code: 'ALREADY_BOARDED',
      message: 'Leave cannot be marked or modified after passenger has boarded.',
    };
  }

  const departureTime = new Date(scheduledDepartureUtc).getTime();
  const now = new Date(nowUtc).getTime();

  if (Number.isNaN(departureTime) || Number.isNaN(now)) {
    return {
      allowed: false,
      code: 'INVALID_DATE',
      message: 'Invalid departure or comparison date.',
    };
  }

  const cutoffTime = departureTime - cutoffMinutes * 60 * 1000;
  const minutesUntilCutoff = Math.round((cutoffTime - now) / 60000);

  if (now > cutoffTime) {
    return {
      allowed: false,
      code: 'PAST_CUTOFF',
      message: `Cutoff passed. Leave must be submitted at least ${cutoffMinutes} minutes before scheduled departure.`,
      minutesUntilCutoff,
    };
  }

  return {
    allowed: true,
    minutesUntilCutoff,
  };
}
