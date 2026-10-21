import type { DeviceRecord, UserRole } from '@vjit/contracts';
import { maskDeviceRecord, type MaskedDeviceRecord } from '@vjit/domain';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface DevicesScreenFilterState {
  searchQuery: string;
  statusFilter: string | null;
  page: number;
  pageSize: number;
}

export interface DevicesScreenViewModel {
  devices: PaginatedResult<MaskedDeviceRecord>;
  viewerRole: UserRole;
  isUnmasked: boolean;
  summary: {
    totalDevices: number;
    activeDevices: number;
    provisionedDevices: number;
    revokedDevices: number;
    notYetConnectedCount: number;
  };
  canProvision: boolean; // TEC and SAD
  canRevoke: boolean;    // COR and SAD
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Tracker Devices & Token Management
 * Implements Task P4-T2, P4-T3 and Screen ADM-04
 */
export function buildDevicesScreenViewModel(
  devices: DeviceRecord[],
  filters: DevicesScreenFilterState,
  viewerRole: UserRole,
  now = new Date(),
): DevicesScreenViewModel {
  // 1. Mask device records based on viewer role (SAD unmasked; COR/TEC masked)
  const masked = devices.map(d => maskDeviceRecord(d, viewerRole, now));

  // 2. Summary counts
  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.status === 'ACTIVE').length;
  const provisionedDevices = devices.filter(d => d.status === 'PROVISIONED').length;
  const revokedDevices = devices.filter(d => d.status === 'REVOKED').length;
  const notYetConnectedCount = masked.filter(d => d.notYetConnectedWarning).length;

  // 3. Filter devices
  let filtered = masked;

  if (filters.statusFilter) {
    filtered = filtered.filter(d => d.status === filters.statusFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      d =>
        d.device_id.toLowerCase().includes(query) ||
        d.serial_number.toLowerCase().includes(query) ||
        d.imei.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      devices.length === 0
        ? 'No GPS devices provisioned yet. Fleet technicians can batch-provision hardware devices.'
        : 'No devices found matching the current search or status filter.';
  }

  return {
    devices: paginated,
    viewerRole,
    isUnmasked: viewerRole === 'SAD',
    summary: {
      totalDevices,
      activeDevices,
      provisionedDevices,
      revokedDevices,
      notYetConnectedCount,
    },
    canProvision: viewerRole === 'TEC' || viewerRole === 'SAD',
    canRevoke: viewerRole === 'COR' || viewerRole === 'SAD',
    emptyMessage,
  };
}
