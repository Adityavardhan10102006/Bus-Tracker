/**
 * Arrival Estimation (ETA) Engine
 * Specification Section 17.5, Part I.5 & UI-SPEC-1.0 Section 5
 *
 * METHODOLOGY & DESIGN DOCUMENTATION:
 * 1. Geometry-Along-Route:
 *    ETAs are computed along the designated route polyline, projecting the verified
 *    bus coordinates onto the nearest polyline segment. Distance is accumulated along
 *    the piecewise linear segments to downstream stops.
 *
 * 2. 5-Minute Rolling Speed Window:
 *    To smooth momentary stops at traffic lights or transient congestion without
 *    over-reacting, speeds are averaged over a rolling 5-minute window
 *    (eta.speed_window_min = 5). Clamped between 10 km/h and 60 km/h.
 *    If insufficient data exists, eta.speed_default_kmh (20 km/h) is used.
 *
 * 3. Truthful ETA / Zero-Speculation (Rule 263):
 *    If the bus tracking state is STALE (>60s age), UNAVAILABLE, NOT_RUNNING, or
 *    deviated from the route corridor (>300m), ETA returns unavailable (null / '—').
 *    Never extrapolate or simulate arrival times on outdated telemetry.
 *
 * 4. Limitations:
 *    - Relies on piecewise 2D Euclidean projection on WGS-84 coordinates.
 *    - Does not consume third-party real-time traffic sensor APIs (per SW-MVP-1.0 scope).
 *    - Sudden road blocks or deviations will transition the bus to off-corridor and
 *      suppress arrival estimates until route re-alignment.
 */

import type { TrackingIntegrityState } from '@vjit/contracts';
import { calculateDistanceMeters, isNullIsland } from './validation.js';

export const DEFAULT_ETA_CONFIG = {
  speedWindowMin: 5,     // eta.speed_window_min
  minSpeedKmh: 10,       // eta.speed_min_kmh
  maxSpeedKmh: 60,       // eta.speed_max_kmh
  defaultSpeedKmh: 20,   // eta.speed_default_kmh
  corridorBufferM: 300,  // route.corridor_m
  staleAfterSeconds: 60, // hw.stale_after_s
} as const;

export interface RouteStop {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
}

export interface SpeedHistorySample {
  speed_kmh: number;
  recorded_at: string;
}

export interface BusTelemetryInput {
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  recorded_at: string | null;
  state: TrackingIntegrityState;
  speed_history?: SpeedHistorySample[] | undefined;
}

export interface StopEtaDetail {
  stop_id: string;
  name: string;
  sequence: number;
  distance_m: number;
  eta_seconds: number | null;
  eta_formatted: string;
  is_passed: boolean;
}

export interface NextStopEta {
  stop_id: string;
  name: string;
  eta_seconds: number;
  eta_formatted: string;
  distance_m: number;
}

export interface RouteEtaResult {
  is_available: boolean;
  unavailability_reason?:
    | 'STALE_GPS'
    | 'OFFLINE_OR_UNAVAILABLE'
    | 'BUS_NOT_RUNNING'
    | 'OFF_CORRIDOR'
    | 'INSUFFICIENT_COORDINATES'
    | undefined;
  effective_speed_kmh: number;
  next_stop: NextStopEta | null;
  stops: StopEtaDetail[];
}

export interface EtaEngineOptions {
  speedWindowMin?: number | undefined;
  minSpeedKmh?: number | undefined;
  maxSpeedKmh?: number | undefined;
  defaultSpeedKmh?: number | undefined;
  corridorBufferM?: number | undefined;
  staleAfterSeconds?: number | undefined;
}

/**
 * Formats seconds into human-readable ETA string or '—'
 */
export function formatEta(seconds: number | null): string {
  if (seconds === null || seconds < 0 || Number.isNaN(seconds)) {
    return '—';
  }
  if (seconds < 60) {
    return '< 1 min';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

/**
 * Calculates effective rolling speed with smoothing and clamping
 */
export function calculateEffectiveSpeed(
  currentSpeed: number | null,
  speedHistory: SpeedHistorySample[] | undefined,
  nowMs: number,
  options?: EtaEngineOptions | undefined,
): number {
  const windowMin = options?.speedWindowMin ?? DEFAULT_ETA_CONFIG.speedWindowMin;
  const minSpeed = options?.minSpeedKmh ?? DEFAULT_ETA_CONFIG.minSpeedKmh;
  const maxSpeed = options?.maxSpeedKmh ?? DEFAULT_ETA_CONFIG.maxSpeedKmh;
  const defaultSpeed = options?.defaultSpeedKmh ?? DEFAULT_ETA_CONFIG.defaultSpeedKmh;

  const windowLimitMs = nowMs - windowMin * 60 * 1000;

  let speedSum = 0;
  let count = 0;

  if (speedHistory && speedHistory.length > 0) {
    for (const sample of speedHistory) {
      const sampleTime = new Date(sample.recorded_at).getTime();
      if (!Number.isNaN(sampleTime) && sampleTime >= windowLimitMs && sample.speed_kmh > 0) {
        speedSum += sample.speed_kmh;
        count++;
      }
    }
  }

  let rawSpeed: number;
  if (count > 0) {
    rawSpeed = speedSum / count;
  } else if (currentSpeed !== null && currentSpeed > 0) {
    rawSpeed = currentSpeed;
  } else {
    rawSpeed = defaultSpeed;
  }

  // Clamp speed to allowable operational window
  return Math.min(Math.max(rawSpeed, minSpeed), maxSpeed);
}

/**
 * Computes projected distance from a point to a line segment in meters
 */
function distanceToSegment(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): { distanceM: number; fraction: number } {
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const segLengthSq = dx * dx + dy * dy;

  if (segLengthSq === 0) {
    return {
      distanceM: calculateDistanceMeters(pLat, pLon, aLat, aLon),
      fraction: 0,
    };
  }

  let t = ((pLon - aLon) * dx + (pLat - aLat) * dy) / segLengthSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * dy;
  const projLon = aLon + t * dx;

  return {
    distanceM: calculateDistanceMeters(pLat, pLon, projLat, projLon),
    fraction: t,
  };
}

/**
 * Calculates arrival estimations along route polyline for all downstream stops.
 * Enforces Rule 263: Returns unavailable state when data is stale, offline, or invalid.
 */
export function calculateRouteEtas(
  bus: BusTelemetryInput,
  routePolyline: Array<[number, number]>, // Array of [lat, lon]
  stops: RouteStop[],
  nowUtc: string,
  options?: EtaEngineOptions | undefined,
): RouteEtaResult {
  const corridorBufferM = options?.corridorBufferM ?? DEFAULT_ETA_CONFIG.corridorBufferM;
  const staleThresholdSec = options?.staleAfterSeconds ?? DEFAULT_ETA_CONFIG.staleAfterSeconds;
  const nowMs = new Date(nowUtc).getTime();

  // Create default passed/unavailable stop list helper
  const makeUnavailableStops = (reason: RouteEtaResult['unavailability_reason']): RouteEtaResult => ({
    is_available: false,
    unavailability_reason: reason,
    effective_speed_kmh: 0,
    next_stop: null,
    stops: stops.map(s => ({
      stop_id: s.id,
      name: s.name,
      sequence: s.sequence,
      distance_m: 0,
      eta_seconds: null,
      eta_formatted: '—',
      is_passed: false,
    })),
  });

  // Check 1: Bus Tracking State Integrity
  if (bus.state === 'NOT_RUNNING') {
    return makeUnavailableStops('BUS_NOT_RUNNING');
  }

  if (bus.state === 'UNAVAILABLE') {
    return makeUnavailableStops('OFFLINE_OR_UNAVAILABLE');
  }

  if (bus.state === 'STALE') {
    return makeUnavailableStops('STALE_GPS');
  }

  // Check 2: Valid coordinates and null island rejection
  if (
    bus.latitude === null ||
    bus.longitude === null ||
    isNullIsland({ latitude: bus.latitude, longitude: bus.longitude })
  ) {
    return makeUnavailableStops('INSUFFICIENT_COORDINATES');
  }

  // Check 3: Check timestamp freshness (> 60s is stale)
  if (bus.recorded_at) {
    const recordedMs = new Date(bus.recorded_at).getTime();
    if (!Number.isNaN(recordedMs) && (nowMs - recordedMs) / 1000 > staleThresholdSec) {
      return makeUnavailableStops('STALE_GPS');
    }
  }

  if (routePolyline.length < 2) {
    return makeUnavailableStops('INSUFFICIENT_COORDINATES');
  }

  // Check 4: Corridor Buffer Check (Perpendicular deviation from route polyline)
  let minDistanceM = Number.POSITIVE_INFINITY;
  let bestSegIndex = 0;
  let bestFraction = 0;

  for (let i = 0; i < routePolyline.length - 1; i++) {
    const a = routePolyline[i]!;
    const b = routePolyline[i + 1]!;
    const seg = distanceToSegment(
      bus.latitude,
      bus.longitude,
      a[0],
      a[1],
      b[0],
      b[1],
    );

    if (seg.distanceM < minDistanceM) {
      minDistanceM = seg.distanceM;
      bestSegIndex = i;
      bestFraction = seg.fraction;
    }
  }

  if (minDistanceM > corridorBufferM) {
    return makeUnavailableStops('OFF_CORRIDOR');
  }

  // Calculate effective smoothed speed
  const effectiveSpeed = calculateEffectiveSpeed(
    bus.speed_kmh,
    bus.speed_history,
    nowMs,
    options,
  );

  // Pre-calculate cumulative polyline segment distances
  const segmentLengthsM: number[] = [];
  for (let i = 0; i < routePolyline.length - 1; i++) {
    const p1 = routePolyline[i]!;
    const p2 = routePolyline[i + 1]!;
    segmentLengthsM.push(calculateDistanceMeters(p1[0], p1[1], p2[0], p2[1]));
  }

  // Cumulative distance from route start to the bus's projected position
  let busDistFromStart = 0;
  for (let i = 0; i < bestSegIndex; i++) {
    busDistFromStart += segmentLengthsM[i] ?? 0;
  }
  busDistFromStart += (segmentLengthsM[bestSegIndex] ?? 0) * bestFraction;

  // For each stop, compute distance along route polyline
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const stopResults: StopEtaDetail[] = [];
  let nextStop: NextStopEta | null = null;

  for (const stop of sortedStops) {
    // Project stop onto route polyline
    let minStopDistM = Number.POSITIVE_INFINITY;
    let stopSegIndex = 0;
    let stopFraction = 0;

    for (let i = 0; i < routePolyline.length - 1; i++) {
      const a = routePolyline[i]!;
      const b = routePolyline[i + 1]!;
      const seg = distanceToSegment(
        stop.latitude,
        stop.longitude,
        a[0],
        a[1],
        b[0],
        b[1],
      );
      if (seg.distanceM < minStopDistM) {
        minStopDistM = seg.distanceM;
        stopSegIndex = i;
        stopFraction = seg.fraction;
      }
    }

    let stopDistFromStart = 0;
    for (let i = 0; i < stopSegIndex; i++) {
      stopDistFromStart += segmentLengthsM[i] ?? 0;
    }
    stopDistFromStart += (segmentLengthsM[stopSegIndex] ?? 0) * stopFraction;

    const deltaDistanceM = stopDistFromStart - busDistFromStart;

    // Buffer of 30 meters for "already passed"
    if (deltaDistanceM < -30) {
      stopResults.push({
        stop_id: stop.id,
        name: stop.name,
        sequence: stop.sequence,
        distance_m: 0,
        eta_seconds: null,
        eta_formatted: '—',
        is_passed: true,
      });
    } else {
      const positiveDistM = Math.max(0, deltaDistanceM);
      const etaSeconds = Math.round((positiveDistM / 1000 / effectiveSpeed) * 3600);
      const formatted = formatEta(etaSeconds);

      stopResults.push({
        stop_id: stop.id,
        name: stop.name,
        sequence: stop.sequence,
        distance_m: Math.round(positiveDistM),
        eta_seconds: etaSeconds,
        eta_formatted: formatted,
        is_passed: false,
      });

      if (!nextStop) {
        nextStop = {
          stop_id: stop.id,
          name: stop.name,
          eta_seconds: etaSeconds,
          eta_formatted: formatted,
          distance_m: Math.round(positiveDistM),
        };
      }
    }
  }

  return {
    is_available: true,
    effective_speed_kmh: Math.round(effectiveSpeed * 10) / 10,
    next_stop: nextStop,
    stops: stopResults,
  };
}
