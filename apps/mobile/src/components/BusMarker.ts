import type { BusSnapshot } from '@vjit/contracts';
import { getStateBadgeDescriptor, type StateBadgeDescriptor } from '@vjit/ui';

export interface BusMarkerRenderProps {
  bus: BusSnapshot;
  isSelected: boolean;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  badge: StateBadgeDescriptor;
  displayTitle: string;
  sourceText: string;
  isStale: boolean;
  isUnavailable: boolean;
  isNotRunning: boolean;
  accessibilityLabel: string;
}

/**
 * Prepares the marker representation for MapLibre or map layer
 * Conforms to Specification 13.7:
 * - Each bus marker shows Bus NN and its state label
 * - Source label beside position, never only in a menu
 * - Colour is never the only indicator (each state has icon and text)
 */
export function createBusMarkerProps(
  bus: BusSnapshot,
  isSelected = false,
): BusMarkerRenderProps {
  const badge = getStateBadgeDescriptor(bus.state, bus.age_seconds ?? undefined);
  const isStale = bus.state === 'STALE';
  const isUnavailable = bus.state === 'UNAVAILABLE';
  const isNotRunning = bus.state === 'NOT_RUNNING';

  const accessibilityLabel = `${bus.bus_number}, Route ${bus.route_name}. ${badge.accessibilityLabel}. ${
    bus.next_stop ? `Next stop: ${bus.next_stop.name}, ETA ${bus.next_stop.eta_formatted}.` : ''
  }`;

  return {
    bus,
    isSelected,
    latitude: bus.latitude,
    longitude: bus.longitude,
    heading: bus.heading,
    badge,
    displayTitle: bus.bus_number,
    sourceText: bus.state_label,
    isStale,
    isUnavailable,
    isNotRunning,
    accessibilityLabel,
  };
}
