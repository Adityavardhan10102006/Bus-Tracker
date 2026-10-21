import type { AttendanceRecord } from '@vjit/contracts';
import type { AbsenceAlert } from '@vjit/domain';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface AttendanceAdminFilterState {
  searchQuery: string;
  tripTypeFilter: string | null;
  statusFilter: string | null;
  page: number;
  pageSize: number;
}

export interface AttendanceAdminViewModel {
  records: PaginatedResult<AttendanceRecord>;
  absenceAlerts: AbsenceAlert[];
  summary: {
    totalBoarded: number;
    lateBoarded: number;
    expected: number;
    absent: number;
    onLeave: number;
  };
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Attendance & Absence Alert Review
 * Implements Task P4-T8 and Screen ADM-09
 */
export function buildAttendanceAdminViewModel(
  records: AttendanceRecord[],
  absenceAlerts: AbsenceAlert[],
  filters: AttendanceAdminFilterState,
): AttendanceAdminViewModel {
  let filtered = records;

  if (filters.tripTypeFilter) {
    filtered = filtered.filter(r => r.trip_type === filters.tripTypeFilter);
  }

  if (filters.statusFilter) {
    filtered = filtered.filter(r => r.status === filters.statusFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      r =>
        r.student_id.toLowerCase().includes(query) ||
        (r.stop_name && r.stop_name.toLowerCase().includes(query)),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  const summary = {
    totalBoarded: records.filter(r => r.status === 'BOARDED').length,
    lateBoarded: records.filter(r => r.status === 'LATE_BOARDED').length,
    expected: records.filter(r => r.status === 'EXPECTED').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    onLeave: records.filter(r => r.status === 'ON_LEAVE').length,
  };

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      records.length === 0
        ? 'No attendance records logged for this service date.'
        : 'No attendance records match the current filter.';
  }

  return {
    records: paginated,
    absenceAlerts,
    summary,
    emptyMessage,
  };
}
