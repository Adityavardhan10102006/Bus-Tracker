import type { LocationSample } from '@vjit/contracts';

export interface StoredSampleSignature {
  device_id: string;
  boot_id: string;
  seq: number;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

/**
 * Checks for duplicate sequence number and evaluates content equality
 * Implements Specification 11.5 step 9 & Task P1-T5
 */
export function evaluateDeduplication(
  incoming: LocationSample,
  deviceId: string,
  bootId: string,
  existingSamples: StoredSampleSignature[],
): { isDuplicate: boolean; hasConflict: boolean } {
  const match = existingSamples.find(
    s => s.device_id === deviceId && s.boot_id === bootId && s.seq === incoming.seq,
  );

  if (!match) {
    return { isDuplicate: false, hasConflict: false };
  }

  // Check if content matches within GPS precision tolerance
  const isContentEqual =
    Math.abs(match.latitude - incoming.latitude) < 0.000001 &&
    Math.abs(match.longitude - incoming.longitude) < 0.000001 &&
    new Date(match.recorded_at).getTime() === new Date(incoming.recorded_at).getTime();

  if (isContentEqual) {
    // Identical content accepted silently
    return { isDuplicate: true, hasConflict: false };
  }

  // Different content with the same sequence number is a CONFLICT
  return { isDuplicate: true, hasConflict: true };
}
