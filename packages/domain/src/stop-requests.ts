import { calculateDistanceMeters } from './validation.js';
import type { StopRequestCreate, StopSummary } from '@vjit/contracts';

export interface RouteCorridorPoint {
  latitude: number;
  longitude: number;
}

export interface StopRequestValidationResult {
  valid: boolean;
  code?: 'NAME_TOO_LONG' | 'NAME_TOO_SHORT' | 'OUTSIDE_CORRIDOR' | 'DUPLICATE_STOP';
  message?: string;
  minDistanceToRouteMeters?: number;
}

/**
 * Validates a student stop change request (F-STP):
 * - Name max 60 chars
 * - Located within route corridor (default 300m per route.corridor_m)
 * - Not a duplicate of existing stops within stop.duplicate_m (default 100m)
 */
export function validateStopRequest(
  request: StopRequestCreate,
  routePolyline: RouteCorridorPoint[],
  existingStops: StopSummary[],
  corridorMeters = 300,
  duplicateMeters = 100,
): StopRequestValidationResult {
  if (request.name.trim().length < 2) {
    return {
      valid: false,
      code: 'NAME_TOO_SHORT',
      message: 'Proposed stop name must be at least 2 characters.',
    };
  }

  if (request.name.length > 60) {
    return {
      valid: false,
      code: 'NAME_TOO_LONG',
      message: 'Proposed stop name cannot exceed 60 characters.',
    };
  }

  // Check duplicate stops
  for (const stop of existingStops) {
    const dist = calculateDistanceMeters(
      request.latitude,
      request.longitude,
      stop.latitude,
      stop.longitude,
    );
    if (dist <= duplicateMeters) {
      return {
        valid: false,
        code: 'DUPLICATE_STOP',
        message: `A stop (${stop.name}) already exists within ${Math.round(dist)}m.`,
      };
    }
  }

  // Check route corridor
  if (routePolyline.length === 0) {
    return { valid: true };
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (const pt of routePolyline) {
    const dist = calculateDistanceMeters(
      request.latitude,
      request.longitude,
      pt.latitude,
      pt.longitude,
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  if (minDistance > corridorMeters) {
    return {
      valid: false,
      code: 'OUTSIDE_CORRIDOR',
      message: `Proposed stop is ${Math.round(minDistance)}m away from route (corridor limit is ${corridorMeters}m).`,
      minDistanceToRouteMeters: Math.round(minDistance),
    };
  }

  return {
    valid: true,
    minDistanceToRouteMeters: Math.round(minDistance),
  };
}

/**
 * Checks whether a stop request has expired (7 days per stop_request.limit_days)
 */
export function isStopRequestExpired(
  createdAtIso: string,
  nowIso: string,
  limitDays = 7,
): boolean {
  const created = new Date(createdAtIso).getTime();
  const now = new Date(nowIso).getTime();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays > limitDays;
}
