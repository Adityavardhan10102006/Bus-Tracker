import type { AuditLogRecord, SystemSettingRecord, UserRole } from '@vjit/contracts';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface AuditLogFilterState {
  actorSearch: string;
  entityTypeFilter: string | null;
  page: number;
  pageSize: number;
}

export interface SettingsAndAuditViewModel {
  settings: SystemSettingRecord[];
  auditLogs: PaginatedResult<AuditLogRecord>;
  viewerRole: UserRole;
  canEditSettings: boolean; // SAD exclusively
  canExportAudit: boolean;   // SAD exclusively
  formulaSanitizationNotice: string;
  emptyAuditMessage?: string | undefined;
}

/**
 * Sanitizes CSV cell content against formula-injection attacks
 * Specification Section 36 & Task P6-T2:
 * Cells starting with '=', '+', '-', or '@' are prefixed with an apostrophe (')
 */
export function sanitizeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Pure controller and view model builder for Settings, Feature Flags, and Audit Logs
 * Implements Tasks P4-T13, P4-T14 and Screens ADM-12, ADM-13, ADM-14
 */
export function buildSettingsAndAuditViewModel(
  settings: SystemSettingRecord[],
  auditLogs: AuditLogRecord[],
  filters: AuditLogFilterState,
  viewerRole: UserRole,
): SettingsAndAuditViewModel {
  const canEditSettings = viewerRole === 'SAD';
  const canExportAudit = viewerRole === 'SAD';

  let filteredAudit = auditLogs;

  if (filters.entityTypeFilter) {
    filteredAudit = filteredAudit.filter(l => l.entity_type === filters.entityTypeFilter);
  }

  const query = filters.actorSearch.trim().toLowerCase();
  if (query) {
    filteredAudit = filteredAudit.filter(
      l =>
        l.actor_email.toLowerCase().includes(query) ||
        l.action.toLowerCase().includes(query) ||
        l.entity_id.toLowerCase().includes(query),
    );
  }

  const paginatedLogs = paginateItems(filteredAudit, filters.page, filters.pageSize);

  let emptyAuditMessage: string | undefined;
  if (paginatedLogs.items.length === 0) {
    emptyAuditMessage =
      auditLogs.length === 0
        ? 'No administrative audit events recorded yet. Every write operation is immutably logged.'
        : 'No audit records match the current filter.';
  }

  return {
    settings,
    auditLogs: paginatedLogs,
    viewerRole,
    canEditSettings,
    canExportAudit,
    formulaSanitizationNotice:
      'All CSV exports apply RFC-4180 escaping and prefix formula characters (=, +, -, @) with apostrophes to protect spreadsheet users.',
    emptyAuditMessage,
  };
}
