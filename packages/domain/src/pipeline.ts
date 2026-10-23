import type { LocationSample } from '@vjit/contracts';
import {
  isNullIsland,
  checkTimestampFreshness,
  isImplausibleJump,
  hasClockSkew,
} from './validation.js';
import { evaluateDeduplication, type StoredSampleSignature } from './dedupe.js';

export type SampleRejectionReason =
  | 'OUT_OF_RANGE'
  | 'FUTURE_TIMESTAMP'
  | 'STALE_TIMESTAMP'
  | 'CONFLICT'
  | 'NULL_ISLAND'
  | 'OUT_OF_AREA'
  | 'IMPLAUSIBLE_JUMP'
  | 'DUPLICATE';

export interface SampleValidationOutcome {
  seq: number;
  accepted: boolean;
  isLiveEligible: boolean;
  rejectionReason?: SampleRejectionReason;
  isBuffered: boolean;
  hasClockSkew: boolean;
  isOutOfArea: boolean;
  isImplausibleJump: boolean;
}

export interface PipelineEvaluationContext {
  serverReceivedAt: Date;
  deviceId?: string | undefined;
  bootId?: string | undefined;
  existingSamples?: StoredSampleSignature[] | undefined;
  lastAcceptedSample?: {
    latitude: number;
    longitude: number;
    recorded_at: string;
  } | null | undefined;
  serviceAreaBounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | undefined;
}

// Bounding box for VJIT Campus Transit service region (Telangana / Hyderabad metro)
export const DEFAULT_SERVICE_AREA_BOUNDS = {
  minLat: 15.8,
  maxLat: 19.9,
  minLng: 77.2,
  maxLng: 81.8,
};

/**
 * Validates a single telemetry sample through the pure pipeline rules
 * Implements Specification 11.5 steps 7 to 13
 */
export function validateTelemetrySample(
  sample: LocationSample,
  context: PipelineEvaluationContext,
): SampleValidationOutcome {
  const { seq, latitude, longitude, speed_kmh, hdop, satellites, recorded_at } = sample;
  const recordedDate = new Date(recorded_at);
  const bounds = context.serviceAreaBounds ?? DEFAULT_SERVICE_AREA_BOUNDS;

  // Step 7: Value range checks
  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    speed_kmh < 0 ||
    speed_kmh > 150 ||
    hdop < 0.1 ||
    hdop > 50 ||
    satellites < 0 ||
    satellites > 32
  ) {
    return {
      seq,
      accepted: false,
      isLiveEligible: false,
      rejectionReason: 'OUT_OF_RANGE',
      isBuffered: false,
      hasClockSkew: false,
      isOutOfArea: false,
      isImplausibleJump: false,
    };
  }

  // Step 10: Null Island filter (0.0, 0.0)
  if (isNullIsland({ latitude, longitude })) {
    return {
      seq,
      accepted: false,
      isLiveEligible: false,
      rejectionReason: 'NULL_ISLAND',
      isBuffered: false,
      hasClockSkew: false,
      isOutOfArea: false,
      isImplausibleJump: false,
    };
  }

  // Step 8: Timestamp freshness
  const freshness = checkTimestampFreshness(recordedDate, context.serverReceivedAt);
  if (freshness === 'FUTURE_TIMESTAMP') {
    return {
      seq,
      accepted: false,
      isLiveEligible: false,
      rejectionReason: 'FUTURE_TIMESTAMP',
      isBuffered: false,
      hasClockSkew: false,
      isOutOfArea: false,
      isImplausibleJump: false,
    };
  }

  if (freshness === 'STALE_TIMESTAMP') {
    return {
      seq,
      accepted: false,
      isLiveEligible: false,
      rejectionReason: 'STALE_TIMESTAMP',
      isBuffered: false,
      hasClockSkew: false,
      isOutOfArea: false,
      isImplausibleJump: false,
    };
  }

  // Step 9: Replay and sequence conflict check
  if (context.existingSamples && context.deviceId && context.bootId) {
    const dedupe = evaluateDeduplication(sample, context.deviceId, context.bootId, context.existingSamples);
    if (dedupe.isDuplicate) {
      return {
        seq,
        accepted: false,
        isLiveEligible: false,
        rejectionReason: dedupe.hasConflict ? 'CONFLICT' : 'DUPLICATE',
        isBuffered: false,
        hasClockSkew: false,
        isOutOfArea: false,
        isImplausibleJump: false,
      };
    }
  }

  const isBuffered = freshness === 'BUFFERED';

  // Step 13: Clock skew check (> 300s)
  const skew = hasClockSkew(recordedDate, context.serverReceivedAt, 300);

  // Step 11: Service area geofence check
  const isOutOfArea =
    latitude < bounds.minLat ||
    latitude > bounds.maxLat ||
    longitude < bounds.minLng ||
    longitude > bounds.maxLng;

  if (isOutOfArea) {
    return {
      seq,
      accepted: true, // Stored flagged for audit
      isLiveEligible: false, // Rejected for live tracking
      rejectionReason: 'OUT_OF_AREA',
      isBuffered,
      hasClockSkew: skew,
      isOutOfArea: true,
      isImplausibleJump: false,
    };
  }

  // Step 12: Implausible jump check (>150 km/h)
  let isJump = false;
  if (context.lastAcceptedSample) {
    // Reset jump reference if last sample was > 30 minutes ago (Spec 11.5 step 12)
    const lastTime = new Date(context.lastAcceptedSample.recorded_at).getTime();
    const currentTime = recordedDate.getTime();
    const elapsedMinutes = Math.abs(currentTime - lastTime) / (60 * 1000);

    if (elapsedMinutes <= 30) {
      isJump = isImplausibleJump(
        {
          latitude: context.lastAcceptedSample.latitude,
          longitude: context.lastAcceptedSample.longitude,
          recorded_at: context.lastAcceptedSample.recorded_at,
        },
        {
          latitude,
          longitude,
          recorded_at,
        },
        150,
      );
    }
  }

  if (isJump) {
    return {
      seq,
      accepted: true, // Stored flagged for technician review
      isLiveEligible: false, // Rejected for live tracking
      rejectionReason: 'IMPLAUSIBLE_JUMP',
      isBuffered,
      hasClockSkew: skew,
      isOutOfArea: false,
      isImplausibleJump: true,
    };
  }

  // Valid and eligible for live tracking unless buffered or invalid GNSS fix
  const isLiveEligible = !isBuffered && sample.gps_valid;

  return {
    seq,
    accepted: true,
    isLiveEligible,
    isBuffered,
    hasClockSkew: skew,
    isOutOfArea: false,
    isImplausibleJump: false,
  };
}

/**
 * Processes an entire batch of samples in chronological order
 * Computes highest contiguous ack_seq and returns individual outcomes
 * Per Specification 11.3 & 11.5
 */
export function processTelemetryBatch(
  samples: LocationSample[],
  context: PipelineEvaluationContext,
): {
  outcomes: SampleValidationOutcome[];
  ackSeq: number;
  rejectedList: Array<{ seq: number; reason: string }>;
  latestLiveSample?: LocationSample | undefined;
} {
  // Sort samples by sequence number
  const sorted = [...samples].sort((a, b) => a.seq - b.seq);
  const outcomes: SampleValidationOutcome[] = [];
  const rejectedList: Array<{ seq: number; reason: string }> = [];

  let currentContext = { ...context };
  let latestLiveSample: LocationSample | undefined;

  for (const sample of sorted) {
    const outcome = validateTelemetrySample(sample, currentContext);
    outcomes.push(outcome);

    if (!outcome.accepted || outcome.rejectionReason) {
      rejectedList.push({
        seq: sample.seq,
        reason: outcome.rejectionReason ?? 'REJECTED',
      });
    }

    if (outcome.accepted && !outcome.isImplausibleJump && !outcome.isOutOfArea) {
      currentContext.lastAcceptedSample = {
        latitude: sample.latitude,
        longitude: sample.longitude,
        recorded_at: sample.recorded_at,
      };

      if (outcome.isLiveEligible) {
        latestLiveSample = sample;
      }
    }
  }

  // ack_seq is highest sequence number processed
  const ackSeq = sorted.length > 0 ? (sorted[sorted.length - 1]?.seq ?? 0) : 0;

  return {
    outcomes,
    ackSeq,
    rejectedList,
    latestLiveSample,
  };
}
