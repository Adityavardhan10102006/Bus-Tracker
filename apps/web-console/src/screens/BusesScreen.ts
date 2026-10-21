import type { BusRecord } from '@vjit/contracts';
import { evaluateBusCompliance, type BusComplianceSummary } from '@vjit/domain';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface BusesScreenFilterState {
  searchQuery: string;
  statusFilter: string | null;
  complianceFilter: 'ALL' | 'EXPIRED_ONLY' | 'WARNINGS_ONLY';
  page: number;
  pageSize: number;
}

export interface BusRowViewModel {
  bus: BusRecord;
  compliance: BusComplianceSummary;
  canEdit: boolean;
  canRetire: boolean;
}

export interface BusesScreenViewModel {
  buses: PaginatedResult<BusRowViewModel>;
  summary: {
    totalBuses: number;
    activeBuses: number;
    maintenanceBuses: number;
    retiredBuses: number;
    nonCompliantBuses: number;
  };
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Bus Fleet & Document Compliance
 * Implements Task P4-T1 and Screen ADM-03
 */
export function buildBusesScreenViewModel(
  buses: BusRecord[],
  filters: BusesScreenFilterState,
  now = new Date(),
): BusesScreenViewModel {
  // 1. Calculate compliance for each bus
  let rows: BusRowViewModel[] = buses.map(bus => {
    const compliance = evaluateBusCompliance(bus, now);
    return {
      bus,
      compliance,
      canEdit: bus.status !== 'RETIRED',
      canRetire: bus.status === 'ACTIVE' || bus.status === 'MAINTENANCE',
    };
  });

  // 2. Summary counts
  const totalBuses = buses.length;
  const activeBuses = buses.filter(b => b.status === 'ACTIVE').length;
  const maintenanceBuses = buses.filter(b => b.status === 'MAINTENANCE').length;
  const retiredBuses = buses.filter(b => b.status === 'RETIRED').length;
  const nonCompliantBuses = rows.filter(r => !r.compliance.isCompliant).length;

  // 3. Apply filters
  if (filters.statusFilter) {
    rows = rows.filter(r => r.bus.status === filters.statusFilter);
  }

  if (filters.complianceFilter === 'EXPIRED_ONLY') {
    rows = rows.filter(r => r.compliance.hasExpiredDocuments);
  } else if (filters.complianceFilter === 'WARNINGS_ONLY') {
    rows = rows.filter(r => r.compliance.hasUpcomingWarnings);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    rows = rows.filter(
      r =>
        r.bus.bus_number.toLowerCase().includes(query) ||
        r.bus.registration.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(rows, filters.page, filters.pageSize);

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      buses.length === 0
        ? 'No buses registered in the system. Use the "Add Bus" button to register institutional vehicles.'
        : 'No buses match the selected status or compliance criteria.';
  }

  return {
    buses: paginated,
    summary: {
      totalBuses,
      activeBuses,
      maintenanceBuses,
      retiredBuses,
      nonCompliantBuses,
    },
    emptyMessage,
  };
}
