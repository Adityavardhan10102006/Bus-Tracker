import type { MaintenanceTicketRecord, UserRole } from '@vjit/contracts';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface MaintenanceFilterState {
  statusFilter: string | null;
  severityFilter: string | null;
  entityTypeFilter: string | null;
  searchQuery: string;
  page: number;
  pageSize: number;
}

export interface MaintenanceBoardViewModel {
  tickets: PaginatedResult<MaintenanceTicketRecord>;
  summary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    criticalTickets: number;
  };
  viewerRole: UserRole;
  canCreateTicket: boolean;
  canResolveTicket: boolean;
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Maintenance Ticket Board
 * Implements Task P4-T12 and Screen ADM-10
 */
export function buildMaintenanceBoardViewModel(
  tickets: MaintenanceTicketRecord[],
  filters: MaintenanceFilterState,
  viewerRole: UserRole,
): MaintenanceBoardViewModel {
  // Role separation per Spec 16.4, 16.5:
  // Technicians focus on DEVICE tickets; Coordinators focus on BUS tickets; Super Admin sees all
  let filtered = tickets;
  if (viewerRole === 'TEC') {
    filtered = filtered.filter(t => t.entity_type === 'DEVICE');
  } else if (viewerRole === 'COR') {
    filtered = filtered.filter(t => t.entity_type === 'BUS');
  }

  if (filters.statusFilter) {
    filtered = filtered.filter(t => t.status === filters.statusFilter);
  }

  if (filters.severityFilter) {
    filtered = filtered.filter(t => t.severity === filters.severityFilter);
  }

  if (filters.entityTypeFilter) {
    filtered = filtered.filter(t => t.entity_type === filters.entityTypeFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      t =>
        t.ticket_number.toLowerCase().includes(query) ||
        t.title.toLowerCase().includes(query) ||
        t.entity_identifier.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  const summary = {
    totalTickets: filtered.length,
    openTickets: filtered.filter(t => t.status === 'OPEN').length,
    inProgressTickets: filtered.filter(t => t.status === 'IN_PROGRESS').length,
    criticalTickets: filtered.filter(t => t.severity === 'CRITICAL').length,
  };

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      tickets.length === 0
        ? 'No maintenance or vehicle issue tickets currently logged. System is operating normally.'
        : 'No tickets match the selected filters.';
  }

  return {
    tickets: paginated,
    summary,
    viewerRole,
    canCreateTicket: viewerRole === 'COR' || viewerRole === 'TEC' || viewerRole === 'SAD',
    canResolveTicket: viewerRole === 'TEC' || viewerRole === 'COR' || viewerRole === 'SAD',
    emptyMessage,
  };
}
