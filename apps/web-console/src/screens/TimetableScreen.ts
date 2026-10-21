import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface TimetableScheduleEntry {
  id: string;
  route_id: string;
  route_name: string;
  bus_id: string;
  bus_number: string;
  trip_type: 'MORNING' | 'AFTERNOON';
  scheduled_departure: string;
  weekday_mask: string; // e.g. "Mon,Tue,Wed,Thu,Fri"
  status: 'SCHEDULED' | 'DISPATCHED' | 'CANCELLED';
  cancellation_reason?: string | undefined;
}

export interface TimetableScreenFilterState {
  tripTypeFilter: string | null;
  searchQuery: string;
  page: number;
  pageSize: number;
}

export interface TimetableScreenViewModel {
  schedules: PaginatedResult<TimetableScheduleEntry>;
  summary: {
    totalScheduled: number;
    dispatchedCount: number;
    cancelledCount: number;
  };
  holidayNotice: string;
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Timetable & Trip Dispatch
 * Implements Task P4-T6, P4-T10
 */
export function buildTimetableScreenViewModel(
  schedules: TimetableScheduleEntry[],
  filters: TimetableScreenFilterState,
): TimetableScreenViewModel {
  let filtered = schedules;

  if (filters.tripTypeFilter) {
    filtered = filtered.filter(s => s.trip_type === filters.tripTypeFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      s =>
        s.route_name.toLowerCase().includes(query) ||
        s.bus_number.toLowerCase().includes(query) ||
        s.weekday_mask.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  const totalScheduled = schedules.length;
  const dispatchedCount = schedules.filter(s => s.status === 'DISPATCHED').length;
  const cancelledCount = schedules.filter(s => s.status === 'CANCELLED').length;

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      schedules.length === 0
        ? 'No scheduled timetables active for this service date.'
        : 'No trips match the selected filter.';
  }

  return {
    schedules: paginated,
    summary: {
      totalScheduled,
      dispatchedCount,
      cancelledCount,
    },
    holidayNotice: 'Service operates Monday through Saturday according to the approved VJIT academic calendar.',
    emptyMessage,
  };
}
