import type { DeviceBusLinkRecord, DeviceRecord, BusRecord, UserRole } from '@vjit/contracts';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface LinkingScreenFilterState {
  searchQuery: string;
  page: number;
  pageSize: number;
}

export interface LinkingScreenViewModel {
  links: PaginatedResult<DeviceBusLinkRecord>;
  unlinkedDevicesCount: number;
  unlinkedBusesCount: number;
  unlinkedDevicesList: string[]; // device_ids without open links
  unlinkedBusesList: string[];   // bus_numbers without open links
  isActionAuthorized: boolean;   // Rule E.6: COR and SAD only. TEC blocked.
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Device-to-Bus Linking Manager
 * Implements Task P4-T4, P4-T5 and Screen ADM-05
 */
export function buildLinkingScreenViewModel(
  allLinks: DeviceBusLinkRecord[],
  allDevices: DeviceRecord[],
  allBuses: BusRecord[],
  filters: LinkingScreenFilterState,
  viewerRole: UserRole,
): LinkingScreenViewModel {
  // Rule E.6: Coordinator and Super Admin exclusively. Technicians never link devices.
  const isActionAuthorized = viewerRole === 'COR' || viewerRole === 'SAD';

  // 1. Identify active open links (where valid_to is null)
  const openLinks = allLinks.filter(l => l.valid_to === null);
  const linkedDeviceIds = new Set(openLinks.map(l => l.device_id));
  const linkedBusIds = new Set(openLinks.map(l => l.bus_id));

  // 2. Identify unlinked active devices and unlinked active buses
  const unlinkedDevices = allDevices
    .filter(d => d.status === 'ACTIVE' && !linkedDeviceIds.has(d.device_id))
    .map(d => d.device_id);

  const unlinkedBuses = allBuses
    .filter(b => b.status === 'ACTIVE' && !linkedBusIds.has(b.id))
    .map(b => b.bus_number);

  // 3. Filter links by search query
  let filtered = allLinks;
  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      l =>
        l.bus_number.toLowerCase().includes(query) ||
        l.device_id.toLowerCase().includes(query) ||
        l.linked_by.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      allLinks.length === 0
        ? 'No device-bus links established yet. Coordinators can assign active trackers to institutional buses.'
        : 'No links match the search query.';
  }

  return {
    links: paginated,
    unlinkedDevicesCount: unlinkedDevices.length,
    unlinkedBusesCount: unlinkedBuses.length,
    unlinkedDevicesList: unlinkedDevices,
    unlinkedBusesList: unlinkedBuses,
    isActionAuthorized,
    emptyMessage,
  };
}
