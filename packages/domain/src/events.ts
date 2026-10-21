import crypto from 'node:crypto';
import type { HardwareEvent } from '@vjit/contracts';

export const RECOGNIZED_HARDWARE_EVENTS = new Set([
  'SOS',
  'GPS_LOST',
  'GPS_RECOVERED',
  'IGNITION_ON',
  'IGNITION_OFF',
  'POWER_DISCONNECTED',
  'LOW_VEHICLE_BATTERY',
  'LOW_DEVICE_BATTERY',
  'BUFFER_OVERFLOW',
  'BOOT',
  'TAMPER',
  'RFID_TAP',
]);

export interface ExistingIncidentReference {
  id: string;
  bus_id: string;
  status: 'OPEN' | 'RESOLVED' | 'CANCELLED';
  created_at: Date;
}

export interface ProcessedEventResult {
  seq: number;
  type: string;
  status: 'ACCEPTED' | 'DUPLICATE' | 'IGNORED';
  incident_id?: string;
  isDeviceDelayed?: boolean;
  priorityAlert?: boolean;
}

/**
 * Evaluates a hardware event and manages SOS incident joining/creation
 * Implements Specification 12, 19 & HW-INT-1.0 Section 6
 */
export function evaluateHardwareEvent(
  event: HardwareEvent,
  busId: string | null,
  serverReceivedAt: Date,
  openIncidents: ExistingIncidentReference[],
): ProcessedEventResult {
  const isRecognized = RECOGNIZED_HARDWARE_EVENTS.has(event.type);

  if (!isRecognized) {
    return {
      seq: event.seq,
      type: event.type,
      status: 'IGNORED',
    };
  }

  if (event.type === 'SOS') {
    const triggeredAt = new Date(event.triggered_at);
    const delaySeconds = Math.abs(serverReceivedAt.getTime() - triggeredAt.getTime()) / 1000;
    const isDeviceDelayed = delaySeconds > 60;

    // Check for open incident for this bus within the last 60 seconds (AC-SOS-02)
    const existing = busId
      ? openIncidents.find(
          inc =>
            inc.bus_id === busId &&
            inc.status === 'OPEN' &&
            Math.abs(serverReceivedAt.getTime() - inc.created_at.getTime()) < 60 * 1000,
        )
      : undefined;

    const incidentId = existing ? existing.id : crypto.randomUUID();

    return {
      seq: event.seq,
      type: 'SOS',
      status: 'ACCEPTED',
      incident_id: incidentId,
      isDeviceDelayed,
      priorityAlert: true,
    };
  }

  return {
    seq: event.seq,
    type: event.type,
    status: 'ACCEPTED',
  };
}
