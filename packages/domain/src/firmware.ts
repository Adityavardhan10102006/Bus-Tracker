import type { FirmwareRolloutStage } from '@vjit/contracts';

export interface RolloutEligibilityCheck {
  eligible: boolean;
  reason?: 'IGNITION_ACTIVE' | 'VOLTAGE_TOO_LOW' | 'ACTIVE_SOS' | 'NOT_PARKED' | 'ROLLOUT_PAUSED';
  message: string;
}

/**
 * Checks whether a vehicle/device is eligible to receive firmware download and flashing
 * Per Specification 33.8 & Task P4-T11:
 * - Update served ONLY while bus is parked with ignition OFF
 * - Vehicle voltage above threshold (12,000 mV)
 * - Zero open SOS incidents for the vehicle
 */
export function isEligibleForFirmwareUpdate(
  deviceTelemetry: {
    ignition: boolean;
    speed_kmh?: number | null;
    battery_mv: number;
    has_active_sos: boolean;
  },
  isRolloutPaused = false,
  minVoltageMv = 12000,
): RolloutEligibilityCheck {
  if (isRolloutPaused) {
    return {
      eligible: false,
      reason: 'ROLLOUT_PAUSED',
      message: 'Firmware rollout is paused for this device or fleet.',
    };
  }

  if (deviceTelemetry.has_active_sos) {
    return {
      eligible: false,
      reason: 'ACTIVE_SOS',
      message: 'Cannot deploy firmware while an SOS emergency is open.',
    };
  }

  if (deviceTelemetry.ignition) {
    return {
      eligible: false,
      reason: 'IGNITION_ACTIVE',
      message: 'Firmware update requires ignition to be OFF.',
    };
  }

  if ((deviceTelemetry.speed_kmh ?? 0) > 0) {
    return {
      eligible: false,
      reason: 'NOT_PARKED',
      message: 'Firmware update can only proceed when vehicle is stationary and parked.',
    };
  }

  if (deviceTelemetry.battery_mv < minVoltageMv) {
    return {
      eligible: false,
      reason: 'VOLTAGE_TOO_LOW',
      message: `Vehicle voltage (${deviceTelemetry.battery_mv} mV) is below minimum safe flashing threshold (${minVoltageMv} mV).`,
    };
  }

  return {
    eligible: true,
    message: 'Vehicle satisfies all pre-conditions for staged firmware flash.',
  };
}

/**
 * Evaluates whether 48 hours have elapsed between rollout stages
 */
export function canAdvanceRolloutStage(
  currentStage: FirmwareRolloutStage,
  lastTransitionAtIso: string,
  nowIso = new Date().toISOString(),
  intervalHours = 48,
): { canAdvance: boolean; hoursRemaining: number; nextStage?: FirmwareRolloutStage | undefined } {
  if (currentStage === 'COMPLETED' || currentStage === 'PAUSED') {
    return { canAdvance: false, hoursRemaining: 0 };
  }

  const lastTransitionTime = new Date(lastTransitionAtIso).getTime();
  const nowTime = new Date(nowIso).getTime();
  const elapsedHours = (nowTime - lastTransitionTime) / (1000 * 3600);
  const hoursRemaining = Math.max(0, Math.ceil(intervalHours - elapsedHours));

  let nextStage: FirmwareRolloutStage | undefined;
  if (currentStage === 'CANARY_5') nextStage = 'FLEET_25';
  else if (currentStage === 'FLEET_25') nextStage = 'FULL_100';
  else if (currentStage === 'FULL_100') nextStage = 'COMPLETED';

  return {
    canAdvance: hoursRemaining === 0,
    hoursRemaining,
    nextStage,
  };
}
