import type { BusSnapshot, RouteDetail } from '@vjit/contracts';
import { getStateBadgeDescriptor, type StateBadgeDescriptor } from '@vjit/ui';

export type BottomSheetSnap = 'COLLAPSED' | 'HALF' | 'EXPANDED';

export interface BottomSheetViewModel {
  snapState: BottomSheetSnap;
  selectedBus: BusSnapshot | null;
  selectedRoute: RouteDetail | null;
  badge: StateBadgeDescriptor | null;
  title: string;
  subtitle: string;
  etaDisplay: string;
  distanceDisplay: string;
  isFavorite: boolean;
  canMarkLeave: boolean;
  canViewSchedule: boolean;
  emptyMessage?: string;
}

/**
 * Builds the view model for the mobile map bottom sheet
 * Conforms to UI-SPEC-1.0 Section 3.1 & Rule 263 (No fake arrival times)
 */
export function buildBottomSheetViewModel(
  selectedBus: BusSnapshot | null,
  selectedRoute: RouteDetail | null,
  isFavorite = false,
  snapState: BottomSheetSnap = 'COLLAPSED',
): BottomSheetViewModel {
  if (!selectedBus) {
    return {
      snapState: 'COLLAPSED',
      selectedBus: null,
      selectedRoute,
      badge: null,
      title: selectedRoute ? selectedRoute.name : 'No bus selected',
      subtitle: selectedRoute ? `${selectedRoute.origin} ➔ ${selectedRoute.destination}` : 'Select a bus marker on the map to view real-time tracking details',
      etaDisplay: '—',
      distanceDisplay: '—',
      isFavorite,
      canMarkLeave: false,
      canViewSchedule: Boolean(selectedRoute),
      emptyMessage: 'Tap any active bus on the map to view live arrival estimates and upcoming stops.',
    };
  }

  const badge = getStateBadgeDescriptor(selectedBus.state, selectedBus.age_seconds ?? undefined);
  const isLive = selectedBus.state === 'LIVE_HW' || selectedBus.state === 'LIVE_PHONE';

  // Rule 263: If bus is UNAVAILABLE or NOT_RUNNING, display em-dash (—) rather than simulated times
  let etaDisplay = '—';
  let distanceDisplay = '—';

  if (isLive && selectedBus.next_stop) {
    etaDisplay = selectedBus.next_stop.eta_formatted;
    distanceDisplay = `${(selectedBus.next_stop.distance_m / 1000).toFixed(1)} km`;
  } else if (selectedBus.state === 'STALE' && selectedBus.next_stop) {
    etaDisplay = `~${selectedBus.next_stop.eta_formatted} (stale)`;
    distanceDisplay = `${(selectedBus.next_stop.distance_m / 1000).toFixed(1)} km`;
  }

  return {
    snapState,
    selectedBus,
    selectedRoute,
    badge,
    title: `${selectedBus.bus_number} • ${selectedBus.route_name}`,
    subtitle: `Registration: ${selectedBus.registration} | Capacity: ${selectedBus.capacity} seats`,
    etaDisplay,
    distanceDisplay,
    isFavorite,
    canMarkLeave: true,
    canViewSchedule: true,
  };
}
