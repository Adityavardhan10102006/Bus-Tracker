import type { RouteDetail, StopRequest } from '@vjit/contracts';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface RoutesAdminFilterState {
  searchQuery: string;
  page: number;
  pageSize: number;
}

export interface RoutesAdminViewModel {
  routes: PaginatedResult<RouteDetail>;
  selectedRoute: RouteDetail | null;
  pendingStopRequests: StopRequest[];
  totalRoutes: number;
  totalStops: number;
  corridorLimitMeters: number; // 300m default
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Route & Stop Geometry Planner
 * Implements Task P4-T6, P2-T3 and Screen ADM-07
 */
export function buildRoutesAdminViewModel(
  routes: RouteDetail[],
  allStopRequests: StopRequest[],
  selectedRouteId: string | null,
  filters: RoutesAdminFilterState,
  corridorMeters = 300,
): RoutesAdminViewModel {
  let filtered = routes;
  const query = filters.searchQuery.trim().toLowerCase();

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

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  const selectedRoute = selectedRouteId
    ? routes.find(r => r.id === selectedRouteId) ?? null
    : null;

  const pendingRequests = allStopRequests.filter(req => req.status === 'PENDING');
  const totalStops = routes.reduce((acc, r) => acc + r.stops.length, 0);

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      routes.length === 0
        ? 'No transit routes configured. Coordinators can create routes, plot geofences, and define stops.'
        : 'No routes match the search query.';
  }

  return {
    routes: paginated,
    selectedRoute,
    pendingStopRequests: pendingRequests,
    totalRoutes: routes.length,
    totalStops,
    corridorLimitMeters: corridorMeters,
    emptyMessage,
  };
}
