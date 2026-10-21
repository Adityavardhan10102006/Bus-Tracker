import type { DriverRosterRecord } from '@vjit/contracts';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface DriverRostersFilterState {
  searchQuery: string;
  tripTypeFilter: string | null;
  page: number;
  pageSize: number;
}

export interface DriverRostersViewModel {
  rosters: PaginatedResult<DriverRosterRecord>;
  conflictC06Banner: {
    isOpen: boolean;
    title: string;
    details: string;
    operationalWorkflow: string;
  };
  totalRostered: number;
  activeShiftsCount: number;
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Driver Records & Rosters
 * Implements Task P4-T7 and keeps Conflict C-06 status visible per prompt instructions
 */
export function buildDriverRostersViewModel(
  rosters: DriverRosterRecord[],
  filters: DriverRostersFilterState,
): DriverRostersViewModel {
  let filtered = rosters;
  if (filters.tripTypeFilter) {
    filtered = filtered.filter(r => r.trip_type === filters.tripTypeFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      r =>
        r.driver_name.toLowerCase().includes(query) ||
        r.bus_number.toLowerCase().includes(query) ||
        r.license_number.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  const activeShiftsCount = rosters.filter(r => r.status === 'ACTIVE').length;

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      rosters.length === 0
        ? 'No driver rosters configured for this date. Coordinators can assign certified college drivers to bus shifts.'
        : 'No roster entries match the search query.';
  }

  return {
    rosters: paginated,
    conflictC06Banner: {
      isOpen: true,
      title: 'Architectural Disclosure: Conflict C-06 (Driver Mobile App Removed)',
      details:
        'Per Approval Record APR-UI-001, the standalone driver mobile application was removed from scope. Unresolved operational items remain tracked in Conflict C-06.',
      operationalWorkflow:
        'Trip shifts are dispatched via Web Console; emergency SOS is triggered via hardware panic buttons; attendance is captured via fixed vehicle QR placards and RFID.',
    },
    totalRostered: rosters.length,
    activeShiftsCount,
    emptyMessage,
  };
}
