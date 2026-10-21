export const DEFAULT_BOARDING_WINDOW_CONFIG = {
  windowBeforeMin: 10, // boarding.window_before_min
  windowAfterMin: 15,  // boarding.window_after_min
} as const;

export interface BoardingWindowOptions {
  windowBeforeMin?: number | undefined;
  windowAfterMin?: number | undefined;
}

export interface BoardingWindowResult {
  isOpen: boolean;
  code?: 'BEFORE_WINDOW' | 'AFTER_WINDOW' | 'INVALID_DATE' | undefined;
  message?: string | undefined;
  windowOpenUtc: string;
  windowCloseUtc: string;
  minutesUntilOpen?: number | undefined;
  minutesUntilClose?: number | undefined;
}

/**
 * Evaluates whether the boarding window is open for a given trip.
 * Specification 18.5:
 * - Opens 10 minutes before scheduled departure (boarding.window_before_min).
 * - Closes 15 minutes after scheduled departure (boarding.window_after_min).
 * - For a late-started trip, the closing boundary is measured from actual departure.
 */
export function evaluateBoardingWindow(
  scheduledDepartureUtc: string,
  nowUtc: string,
  actualDepartureUtc?: string | null | undefined,
  options?: BoardingWindowOptions | undefined,
): BoardingWindowResult {
  const windowBeforeMin = options?.windowBeforeMin ?? DEFAULT_BOARDING_WINDOW_CONFIG.windowBeforeMin;
  const windowAfterMin = options?.windowAfterMin ?? DEFAULT_BOARDING_WINDOW_CONFIG.windowAfterMin;

  const schedTime = new Date(scheduledDepartureUtc).getTime();
  const now = new Date(nowUtc).getTime();

  if (Number.isNaN(schedTime) || Number.isNaN(now)) {
    return {
      isOpen: false,
      code: 'INVALID_DATE',
      message: 'Invalid scheduled departure or evaluation timestamp.',
      windowOpenUtc: new Date(0).toISOString(),
      windowCloseUtc: new Date(0).toISOString(),
    };
  }

  // Window opens windowBeforeMin before scheduled departure
  const windowOpenTime = schedTime - windowBeforeMin * 60 * 1000;

  // Window closes windowAfterMin after scheduled departure,
  // or after actual departure if trip departed late
  let effectiveDepartureTime = schedTime;
  if (actualDepartureUtc) {
    const actTime = new Date(actualDepartureUtc).getTime();
    if (!Number.isNaN(actTime) && actTime > schedTime) {
      effectiveDepartureTime = actTime;
    }
  }

  const windowCloseTime = effectiveDepartureTime + windowAfterMin * 60 * 1000;

  const windowOpenUtc = new Date(windowOpenTime).toISOString();
  const windowCloseUtc = new Date(windowCloseTime).toISOString();

  const minutesUntilOpen = Math.round((windowOpenTime - now) / 60000);
  const minutesUntilClose = Math.round((windowCloseTime - now) / 60000);

  if (now < windowOpenTime) {
    return {
      isOpen: false,
      code: 'BEFORE_WINDOW',
      message: `Boarding window has not opened yet. Opens ${windowBeforeMin} minutes before departure.`,
      windowOpenUtc,
      windowCloseUtc,
      minutesUntilOpen,
      minutesUntilClose,
    };
  }

  if (now > windowCloseTime) {
    return {
      isOpen: false,
      code: 'AFTER_WINDOW',
      message: `Boarding window closed. Allowed boarding window has expired.`,
      windowOpenUtc,
      windowCloseUtc,
      minutesUntilOpen,
      minutesUntilClose,
    };
  }

  return {
    isOpen: true,
    windowOpenUtc,
    windowCloseUtc,
    minutesUntilOpen: 0,
    minutesUntilClose,
  };
}
