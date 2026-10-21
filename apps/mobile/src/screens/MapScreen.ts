import type { BusSnapshot, RouteDetail } from '@vjit/contracts';
import { createBusMarkerProps, type BusMarkerRenderProps } from '../components/BusMarker.js';
import { buildBottomSheetViewModel, type BottomSheetViewModel, type BottomSheetSnap } from '../components/BottomSheet.js';
import { VJIT_COLORS } from '../theme/branding.js';

export interface MapScreenState {
  buses: BusSnapshot[];
  selectedBusId: string | null;
  selectedRouteId: string | null;
  routes: RouteDetail[];
  searchQuery: string;
  activeFilter: 'ALL' | 'ASSIGNED' | 'FAVORITES';
  bottomSheetSnap: BottomSheetSnap;
  isRecenterTriggered: boolean;
  isLoading: boolean;
  isOffline: boolean;
  errorMessage?: string;
}

export interface MapScreenViewModel {
  searchQuery: string;
  activeFilter: 'ALL' | 'ASSIGNED' | 'FAVORITES';
  visibleMarkers: BusMarkerRenderProps[];
  activeRoutePolyline: [number, number][];
  bottomSheet: BottomSheetViewModel;
  statusSummary: {
    totalBuses: number;
    liveBuses: number;
    staleBuses: number;
    emptyStateMessage?: string | undefined;
  };
  recenterFab: {
    visible: boolean;
    accessibilityLabel: string;
    style: {
      backgroundColor: string;
      color: string;
      minWidth: string;
      minHeight: string;
    };
  };
}

/**
 * Pure controller and view model generator for the Map-first Home Screen
 * Implements Task P2-T1 and P2-T2
 */
export function buildMapScreenViewModel(
  state: MapScreenState,
  favoriteBusIds: Set<string>,
  assignedRouteId?: string,
): MapScreenViewModel {
  // 1. Filter buses by query and selected filters
  const query = state.searchQuery.trim().toLowerCase();
  let filteredBuses = state.buses;

  if (state.activeFilter === 'ASSIGNED' && assignedRouteId) {
    filteredBuses = filteredBuses.filter(b => b.route_id === assignedRouteId);
  } else if (state.activeFilter === 'FAVORITES') {
    filteredBuses = filteredBuses.filter(b => favoriteBusIds.has(b.bus_id));
  }

  if (query) {
    filteredBuses = filteredBuses.filter(
      b =>
        b.bus_number.toLowerCase().includes(query) ||
        b.route_name.toLowerCase().includes(query) ||
        (b.next_stop && b.next_stop.name.toLowerCase().includes(query)),
    );
  }

  // 2. Prepare markers
  const visibleMarkers: BusMarkerRenderProps[] = filteredBuses.map(bus =>
    createBusMarkerProps(bus, bus.bus_id === state.selectedBusId),
  );

  // 3. Resolve selected bus and route
  const selectedBus = state.selectedBusId
    ? state.buses.find(b => b.bus_id === state.selectedBusId) ?? null
    : null;

  const targetRouteId = selectedBus ? selectedBus.route_id : state.selectedRouteId;
  const activeRoute = targetRouteId
    ? state.routes.find(r => r.id === targetRouteId) ?? null
    : null;

  const isFav = selectedBus ? favoriteBusIds.has(selectedBus.bus_id) : false;
  const bottomSheet = buildBottomSheetViewModel(
    selectedBus,
    activeRoute,
    isFav,
    state.bottomSheetSnap,
  );

  // 4. Status summary
  const liveCount = filteredBuses.filter(b => b.state === 'LIVE_HW' || b.state === 'LIVE_PHONE').length;
  const staleCount = filteredBuses.filter(b => b.state === 'STALE').length;

  let emptyStateMessage: string | undefined;
  if (state.isOffline) {
    emptyStateMessage = 'Device is currently offline. Retrying connection to campus tracking server...';
  } else if (filteredBuses.length === 0) {
    emptyStateMessage =
      query.length > 0
        ? `No buses found matching "${query}".`
        : 'No buses currently running. Scheduled service operates during campus transit hours.';
  }

  return {
    searchQuery: state.searchQuery,
    activeFilter: state.activeFilter,
    visibleMarkers,
    activeRoutePolyline: activeRoute ? activeRoute.polyline : [],
    bottomSheet,
    statusSummary: {
      totalBuses: filteredBuses.length,
      liveBuses: liveCount,
      staleBuses: staleCount,
      emptyStateMessage,
    },
    recenterFab: {
      visible: true,
      accessibilityLabel: 'Recenter map to active bus route and campus area',
      style: {
        backgroundColor: VJIT_COLORS.brandNavy,
        color: VJIT_COLORS.canvasWhite,
        minWidth: '48px',
        minHeight: '48px',
      },
    },
  };
}
