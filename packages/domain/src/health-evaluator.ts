export type DeviceHealthState = 'ONLINE' | 'DELAYED' | 'OFFLINE';

export type PendingDeviceAction = 'NONE' | 'UPDATE_CONFIG' | 'REBOOT' | 'FIRMWARE_UPDATE';

export interface DeviceHealthEvaluationContext {
  lastHeartbeatTime: Date;
  currentTime: Date;
  ignition: boolean;
  movingIntervalSeconds?: number; // default 60s
  parkedIntervalSeconds?: number; // default 600s
}

/**
 * Evaluates device operational health status from heartbeats
 * Implements Specification 11.6 & Task P1-T7
 */
export function evaluateDeviceHealth(
  context: DeviceHealthEvaluationContext,
): {
  health: DeviceHealthState;
  elapsedSeconds: number;
  expectedIntervalSeconds: number;
  shouldAlertTechnician: boolean;
} {
  const expectedInterval = context.ignition
    ? (context.movingIntervalSeconds ?? 60)
    : (context.parkedIntervalSeconds ?? 600);

  const elapsedSeconds = Math.max(
    0,
    Math.round((context.currentTime.getTime() - context.lastHeartbeatTime.getTime()) / 1000),
  );

  // ONLINE: within 1.5x expected interval
  if (elapsedSeconds <= expectedInterval * 1.5) {
    return {
      health: 'ONLINE',
      elapsedSeconds,
      expectedIntervalSeconds: expectedInterval,
      shouldAlertTechnician: false,
    };
  }

  // OFFLINE: missed by >3x interval or >20 minutes (1200s)
  if (elapsedSeconds > expectedInterval * 3 || elapsedSeconds > 1200) {
    return {
      health: 'OFFLINE',
      elapsedSeconds,
      expectedIntervalSeconds: expectedInterval,
      // Open ticket if ignition was ON when contact ceased
      shouldAlertTechnician: context.ignition,
    };
  }

  // DELAYED: missed by >1.5x interval but <=3x
  return {
    health: 'DELAYED',
    elapsedSeconds,
    expectedIntervalSeconds: expectedInterval,
    shouldAlertTechnician: false,
  };
}
