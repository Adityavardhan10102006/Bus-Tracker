export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Checks if coordinate is Null Island (0.0, 0.0)
 * Per Specification 11.5 step 10
 */
export function isNullIsland(coord: Coordinate): boolean {
  return Math.abs(coord.latitude) < 0.000001 && Math.abs(coord.longitude) < 0.000001;
}

/**
 * Validates timestamp freshness window
 * Per Specification 11.5 step 8:
 * - Reject FUTURE_TIMESTAMP if recorded_at > 60s ahead of server time
 * - Reject STALE_TIMESTAMP if recorded_at > 7 days in the past
 * - Flag BUFFERED if recorded_at > 10 minutes in the past
 */
export function checkTimestampFreshness(
  recordedAt: Date,
  serverTime: Date,
  options = { futureToleranceSeconds: 60, staleDays: 7, bufferedMinutes: 10 },
): 'VALID_LIVE' | 'BUFFERED' | 'FUTURE_TIMESTAMP' | 'STALE_TIMESTAMP' {
  const recordedMs = recordedAt.getTime();
  const serverMs = serverTime.getTime();
  const diffSec = (recordedMs - serverMs) / 1000;

  if (diffSec > options.futureToleranceSeconds) {
    return 'FUTURE_TIMESTAMP';
  }

  const staleLimitMs = options.staleDays * 24 * 60 * 60 * 1000;
  if (serverMs - recordedMs > staleLimitMs) {
    return 'STALE_TIMESTAMP';
  }

  const bufferedLimitMs = options.bufferedMinutes * 60 * 1000;
  if (serverMs - recordedMs > bufferedLimitMs) {
    return 'BUFFERED';
  }

  return 'VALID_LIVE';
}

/**
 * Haversine distance in kilometers between two WGS84 points
 */
export function haversineDistanceKm(p1: Coordinate, p2: Coordinate): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks for implausible physical speed jumps (> 150 km/h) between consecutive samples
 * Per Specification 11.5 step 12
 */
export function isImplausibleJump(
  lastSample: { latitude: number; longitude: number; recorded_at: string },
  currentSample: { latitude: number; longitude: number; recorded_at: string },
  maxKmh = 150,
): boolean {
  const t1 = new Date(lastSample.recorded_at).getTime();
  const t2 = new Date(currentSample.recorded_at).getTime();
  const deltaHours = Math.abs(t2 - t1) / (1000 * 3600);

  // If time delta is near zero (less than 100ms), avoid divide by zero
  if (deltaHours < 0.0000277) {
    return false;
  }

  const distanceKm = haversineDistanceKm(
    { latitude: lastSample.latitude, longitude: lastSample.longitude },
    { latitude: currentSample.latitude, longitude: currentSample.longitude },
  );

  const impliedSpeedKmh = distanceKm / deltaHours;
  return impliedSpeedKmh > maxKmh;
}

/**
 * Clock skew check
 * Per Specification 11.5 step 13
 */
export function hasClockSkew(recordedAt: Date, receivedAt: Date, maxSkewSeconds = 300): boolean {
  const diffSec = Math.abs(recordedAt.getTime() - receivedAt.getTime()) / 1000;
  return diffSec > maxSkewSeconds;
}
