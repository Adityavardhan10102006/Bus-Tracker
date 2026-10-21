import type { BusSnapshot, RouteDetail, UserRole } from '@vjit/contracts';
import { getStateBadgeDescriptor, type StateBadgeDescriptor } from '@vjit/ui';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface FleetDeckFilterState {
  searchQuery: string;
  routeIdFilter: string | null;
  stateFilter: string | null;
  page: number;
  pageSize: number;
}

export interface FleetDeckCounterSummary {
  totalBuses: number;
  liveBuses: number;
  staleBuses: number;
  unavailableBuses: number;
  notRunningBuses: number;
  activeIncidentsCount: number;
}

export interface FleetDeckBusRow {
  bus: BusSnapshot;
  badge: StateBadgeDescriptor;
  isLive: boolean;
  isStale: boolean;
  isUnavailable: boolean;
  lastKnownLocationDisplay: string;
  telemetrySummary: {
    speedKmh: number | null;
    heading: number | null;
    recordedAtFormatted: string;
    ageSeconds: number | null;
  };
}

export interface FleetDeckViewModel {
  isManagementView: boolean; // Spec 16.8: MGT sees aggregate counts only
  counters: FleetDeckCounterSummary;
  filteredBuses: PaginatedResult<FleetDeckBusRow>;
  selectedBusDetail: BusSnapshot | null;
  routesList: Array<{ id: string; name: string }>;
  emptyStateMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Fleet Radar & Operations Deck
 * Implements Task P4-T9 and Screen ADM-02
 */
export function buildFleetDeckViewModel(
  buses: BusSnapshot[],
  routes: RouteDetail[],
  filters: FleetDeckFilterState,
  selectedBusId: string | null,
  viewerRole: UserRole,
  activeSosCount = 0,
): FleetDeckViewModel {
  const isManagementView = viewerRole === 'MGT';

  // 1. Calculate aggregate fleet counters
  const liveBuses = buses.filter(b => b.state === 'LIVE_HW' || b.state === 'LIVE_PHONE').length;
  const staleBuses = buses.filter(b => b.state === 'STALE').length;
  const unavailableBuses = buses.filter(b => b.state === 'UNAVAILABLE').length;
  const notRunningBuses = buses.filter(b => b.state === 'NOT_RUNNING').length;

  const counters: FleetDeckCounterSummary = {
    totalBuses: buses.length,
    liveBuses,
    staleBuses,
    unavailableBuses,
    notRunningBuses,
    activeIncidentsCount: activeSosCount,
  };

  // If role is Management, return aggregate deck immediately (Spec 16.8)
  if (isManagementView) {
    return {
      isManagementView: true,
      counters,
      filteredBuses: {
        items: [],
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: filters.pageSize,
      },
      selectedBusDetail: null,
      routesList: routes.map(r => ({ id: r.id, name: r.name })),
      emptyStateMessage: undefined,
    };
  }

  // 2. Filter buses for Operations staff (COR, TEC, SAD, SEC)
  let filtered = buses;

  if (filters.routeIdFilter) {
    filtered = filtered.filter(b => b.route_id === filters.routeIdFilter);
  }

  if (filters.stateFilter) {
    filtered = filtered.filter(b => b.state === filters.stateFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      b =>
        b.bus_number.toLowerCase().includes(query) ||
        b.registration.toLowerCase().includes(query) ||
        b.route_name.toLowerCase().includes(query),
    );
  }

  // 3. Map to view rows with discrete tracking state tags
  const rows: FleetDeckBusRow[] = filtered.map(bus => {
    const badge = getStateBadgeDescriptor(bus.state, bus.age_seconds ?? undefined);
    const isLive = bus.state === 'LIVE_HW' || bus.state === 'LIVE_PHONE';
    const isStale = bus.state === 'STALE';
    const isUnavailable = bus.state === 'UNAVAILABLE';

    let lastKnownLocationDisplay = '—';
    if (bus.latitude !== null && bus.longitude !== null) {
      lastKnownLocationDisplay = `${bus.latitude.toFixed(4)}, ${bus.longitude.toFixed(4)}`;
      if (isStale) {
        lastKnownLocationDisplay += ` (stale: ${bus.age_seconds}s ago)`;
      }
    }

    const recordedAtFormatted = bus.recorded_at
      ? new Date(bus.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';

    return {
      bus,
      badge,
      isLive,
      isStale,
      isUnavailable,
      lastKnownLocationDisplay,
      telemetrySummary: {
        speedKmh: bus.speed_kmh,
        heading: bus.heading,
        recordedAtFormatted,
        ageSeconds: bus.age_seconds,
      },
    };
  });

  const paginatedResult = paginateItems(rows, filters.page, filters.pageSize);

  const selectedBusDetail = selectedBusId
    ? buses.find(b => b.bus_id === selectedBusId) ?? null
    : null;

  let emptyStateMessage: string | undefined;
  if (rows.length === 0) {
    emptyStateMessage =
      buses.length === 0
        ? 'No active buses currently in the fleet. Coordinators can register buses from the Bus Management screen.'
        : 'No buses match the selected route, bus, or status filters.';
  }

  return {
    isManagementView: false,
    counters,
    filteredBuses: paginatedResult,
    selectedBusDetail,
    routesList: routes.map(r => ({ id: r.id, name: r.name })),
    emptyStateMessage,
  };
}
