export type TrackingStateKey =
  | 'LIVE_HW'
  | 'LIVE_PHONE'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'NOT_RUNNING'
  | 'NO_HARDWARE';

export type TrackingIntegrityState = TrackingStateKey;

export interface TrackingStatePresentation {
  state: TrackingStateKey;
  label: string;
  badgeColorHex: string;
  isLive: boolean;
  canDisplayCoordinates: boolean;
}

/**
 * Computes official tracking presentation state and label
 * Implements Specification 13.7, 17.6 and Rules R-10, R-20
 */
export function getTrackingStatePresentation(
  state: TrackingStateKey,
  dataAgeSeconds?: number,
  nextTripTimeFormatted?: string,
): TrackingStatePresentation {
  switch (state) {
    case 'LIVE_HW':
      return {
        state: 'LIVE_HW',
        label: 'Live, bus tracker',
        badgeColorHex: '#16A34A', // Green-600
        isLive: true,
        canDisplayCoordinates: true,
      };

    case 'LIVE_PHONE':
      return {
        state: 'LIVE_PHONE',
        label: 'Live, backup tracker',
        badgeColorHex: '#16A34A', // Green-600
        isLive: true,
        canDisplayCoordinates: true,
      };

    case 'STALE': {
      const age = Math.max(0, Math.round(dataAgeSeconds ?? 61));
      return {
        state: 'STALE',
        label: `Last update ${age} seconds ago`,
        badgeColorHex: '#64748B', // Slate-500
        isLive: false,
        canDisplayCoordinates: true, // Display muted pin at last known coordinate
      };
    }

    case 'UNAVAILABLE':
      return {
        state: 'UNAVAILABLE',
        label: 'Location unavailable',
        badgeColorHex: '#DC2626', // Red-600
        isLive: false,
        canDisplayCoordinates: false,
      };

    case 'NOT_RUNNING':
      return {
        state: 'NOT_RUNNING',
        label: nextTripTimeFormatted
          ? `Not running. Next trip at ${nextTripTimeFormatted}`
          : 'Not running',
        badgeColorHex: '#D97706', // Amber-600
        isLive: false,
        canDisplayCoordinates: false,
      };

    case 'NO_HARDWARE':
      return {
        state: 'NO_HARDWARE',
        label: 'No tracker assigned',
        badgeColorHex: '#94A3B8', // Slate-400
        isLive: false,
        canDisplayCoordinates: false,
      };
  }
}

/**
 * Pure evaluator for server-side active source and state transition
 * Implements Specification 13.3, 17.6
 */
export function evaluateDataFreshnessState(
  dataAgeSeconds: number,
  hasActiveTrip: boolean,
  activeSource: 'HW' | 'PHONE' | 'NONE' = 'HW',
): TrackingStateKey {
  if (!hasActiveTrip) {
    return 'NOT_RUNNING';
  }

  if (activeSource === 'NONE') {
    return 'UNAVAILABLE';
  }

  // 60-Second Cutoff Rule (Specification 17.6)
  if (dataAgeSeconds <= 60) {
    return activeSource === 'HW' ? 'LIVE_HW' : 'LIVE_PHONE';
  }

  // Stale Cutoff Rule (61s to 120s)
  if (dataAgeSeconds <= 120) {
    return 'STALE';
  }

  // Both Down Cutoff Rule (> 120s)
  return 'UNAVAILABLE';
}
