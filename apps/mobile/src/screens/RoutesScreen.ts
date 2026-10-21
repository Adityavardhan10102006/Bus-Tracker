import type { RouteDetail } from '@vjit/contracts';
import { buildStopTimeline, type StopTimelineItem } from '../components/StopTimeline.js';

export interface RoutesScreenState {
  routes: RouteDetail[];
  selectedRouteId: string | null;
  searchQuery: string;
  favoriteRouteIds: Set<string>;
  favoriteStopIds: Set<string>;
  designatedBoardingStopId?: string | undefined;
  isStopRequestModalOpen: boolean;
  isLoading: boolean;
  errorMessage?: string | undefined;
}

export interface RoutesScreenViewModel {
  searchQuery: string;
  filteredRoutes: Array<{
    route: RouteDetail;
    isFavorite: boolean;
    stopsCount: number;
    activeBuses: number;
  }>;
  selectedRouteDetail: {
    route: RouteDetail;
    isFavorite: boolean;
    timeline: StopTimelineItem[];
  } | null;
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for the Routes & Stops Explorer
 * Implements Tasks P2-T2, P2-T3, P2-T4
 */
export function buildRoutesScreenViewModel(state: RoutesScreenState): RoutesScreenViewModel {
  const query = state.searchQuery.trim().toLowerCase();

  // Filter routes
  let filtered = state.routes;
  if (query) {
    filtered = filtered.filter(
      r =>
        r.name.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query) ||
        r.origin.toLowerCase().includes(query) ||
        r.destination.toLowerCase().includes(query) ||
        r.stops.some(s => s.name.toLowerCase().includes(query)),
    );
  }

  const filteredRoutes = filtered.map(route => ({
    route,
    isFavorite: state.favoriteRouteIds.has(route.id),
    stopsCount: route.stops.length,
    activeBuses: route.active_buses,
  }));

  // Selected route detail
  let selectedRouteDetail: RoutesScreenViewModel['selectedRouteDetail'] = null;
  if (state.selectedRouteId) {
    const route = state.routes.find(r => r.id === state.selectedRouteId);
    if (route) {
      selectedRouteDetail = {
        route,
        isFavorite: state.favoriteRouteIds.has(route.id),
        timeline: buildStopTimeline(route.stops, state.designatedBoardingStopId),
      };
    }
  }

  let emptyMessage: string | undefined;
  if (filteredRoutes.length === 0) {
    emptyMessage =
      query.length > 0
        ? `No transit routes match "${query}".`
        : 'No routes currently registered. Transport staff can configure routes in the management console.';
  }

  return {
    searchQuery: state.searchQuery,
    filteredRoutes,
    selectedRouteDetail,
    emptyMessage,
  };
}
