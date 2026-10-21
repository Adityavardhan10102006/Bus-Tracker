import type { FirmwareRolloutRecord } from '@vjit/contracts';
import { canAdvanceRolloutStage } from '@vjit/domain';
import { paginateItems, type PaginatedResult } from '../components/DataTable.js';

export interface TrackerHealthEntry {
  device_id: string;
  linked_bus_number: string | null;
  health: 'ONLINE' | 'DELAYED' | 'OFFLINE';
  last_heartbeat_at: string;
  voltage_mv: number;
  internal_battery_mv: number | null;
  satellites: number;
  hdop: number;
  rssi_dbm: number;
  ignition: boolean;
  firmware_version: string;
}

export interface HealthRadarFilterState {
  healthFilter: string | null;
  searchQuery: string;
  page: number;
  pageSize: number;
}

export interface HealthRadarViewModel {
  trackers: PaginatedResult<TrackerHealthEntry>;
  summary: {
    totalTrackers: number;
    onlineCount: number;
    delayedCount: number;
    offlineCount: number;
    lowBatteryCount: number;
  };
  firmwareRollouts: Array<{
    rollout: FirmwareRolloutRecord;
    canAdvance: boolean;
    hoursRemaining: number;
    nextStageDisplay?: string | undefined;
  }>;
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Device Health Radar & Firmware Flashing
 * Implements Task P4-T5, P4-T11 and Screens ADM-06, ADM-11
 */
export function buildHealthRadarViewModel(
  trackers: TrackerHealthEntry[],
  rollouts: FirmwareRolloutRecord[],
  filters: HealthRadarFilterState,
  nowIso = new Date().toISOString(),
): HealthRadarViewModel {
  let filtered = trackers;

  if (filters.healthFilter) {
    filtered = filtered.filter(t => t.health === filters.healthFilter);
  }

  const query = filters.searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      t =>
        t.device_id.toLowerCase().includes(query) ||
        (t.linked_bus_number && t.linked_bus_number.toLowerCase().includes(query)) ||
        t.firmware_version.toLowerCase().includes(query),
    );
  }

  const paginated = paginateItems(filtered, filters.page, filters.pageSize);

  const summary = {
    totalTrackers: trackers.length,
    onlineCount: trackers.filter(t => t.health === 'ONLINE').length,
    delayedCount: trackers.filter(t => t.health === 'DELAYED').length,
    offlineCount: trackers.filter(t => t.health === 'OFFLINE').length,
    lowBatteryCount: trackers.filter(t => t.voltage_mv < 11800).length,
  };

  const processedRollouts = rollouts.map(r => {
    const stageCheck = canAdvanceRolloutStage(r.stage, r.last_stage_transition_at, nowIso, 48);
    return {
      rollout: r,
      canAdvance: stageCheck.canAdvance && !r.is_paused,
      hoursRemaining: stageCheck.hoursRemaining,
      nextStageDisplay: stageCheck.nextStage,
    };
  });

  let emptyMessage: string | undefined;
  if (paginated.items.length === 0) {
    emptyMessage =
      trackers.length === 0
        ? 'No tracker telemetry received yet. Health radar activates upon first device transmission.'
        : 'No tracker health entries match the current search or status filter.';
  }

  return {
    trackers: paginated,
    summary,
    firmwareRollouts: processedRollouts,
    emptyMessage,
  };
}
