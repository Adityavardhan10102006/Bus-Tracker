export interface DeviceBusLinkRecord {
  id: string;
  device_id: string;
  bus_id: string;
  valid_from: Date;
  valid_to: Date | null;
}

/**
 * Resolves the active bus association for a device at a specific point in time
 * Implements Specification 13.1 & HW-INT-1.0 Section 9
 */
export function resolveActiveBusForDevice(
  deviceId: string,
  targetTime: Date,
  activeLinks: DeviceBusLinkRecord[],
): { busId: string | null; linkId: string | null } {
  const targetMs = targetTime.getTime();

  for (const link of activeLinks) {
    if (link.device_id !== deviceId) continue;

    const fromMs = link.valid_from.getTime();
    const toMs = link.valid_to ? link.valid_to.getTime() : Infinity;

    if (targetMs >= fromMs && targetMs <= toMs) {
      return {
        busId: link.bus_id,
        linkId: link.id,
      };
    }
  }

  // Device is unlinked or outside open link range
  return {
    busId: null,
    linkId: null,
  };
}

/**
 * Validates device reassignment transition rules
 * - An open link cannot overlap with an existing open link for the same device or same bus
 */
export function validateLinkReassignment(
  newDeviceId: string,
  newBusId: string,
  validFrom: Date,
  existingOpenLinks: DeviceBusLinkRecord[],
): {
  allowed: boolean;
  linksToClose: DeviceBusLinkRecord[];
  conflictReason?: string;
} {
  const linksToClose: DeviceBusLinkRecord[] = [];

  for (const link of existingOpenLinks) {
    if (link.valid_to === null) {
      if (link.device_id === newDeviceId || link.bus_id === newBusId) {
        if (validFrom.getTime() < link.valid_from.getTime()) {
          return {
            allowed: false,
            linksToClose: [],
            conflictReason: `New link valid_from (${validFrom.toISOString()}) cannot precede existing open link valid_from (${link.valid_from.toISOString()}).`,
          };
        }
        linksToClose.push(link);
      }
    }
  }

  return {
    allowed: true,
    linksToClose,
  };
}
