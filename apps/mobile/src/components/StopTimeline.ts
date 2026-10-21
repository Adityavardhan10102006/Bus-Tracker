import type { StopSummary } from '@vjit/contracts';

export interface StopTimelineItem {
  stop: StopSummary;
  isBoardingStop: boolean;
  statusBadge: {
    label: string;
    color: string;
    backgroundColor: string;
  };
}

/**
 * Builds view model for stop sequence timeline along a route
 */
export function buildStopTimeline(
  stops: StopSummary[],
  designatedBoardingStopId?: string,
): StopTimelineItem[] {
  return stops.map(stop => {
    const isBoardingStop = stop.id === designatedBoardingStopId;
    let statusBadge = {
      label: 'Scheduled',
      color: '#475569',
      backgroundColor: '#F1F5F9',
    };

    if (stop.status === 'ARRIVING') {
      statusBadge = {
        label: 'Arriving now',
        color: '#16A34A',
        backgroundColor: '#DCFCE7',
      };
    } else if (stop.status === 'DEPARTED') {
      statusBadge = {
        label: 'Departed',
        color: '#94A3B8',
        backgroundColor: '#F8FAFC',
      };
    }

    return {
      stop,
      isBoardingStop,
      statusBadge,
    };
  });
}
