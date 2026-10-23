/**
 * Routing Provider Integration & Route Geometry Domain Service
 * Conforms to AG-MASTER-1.0-v2 and UI-SPEC-1.0
 */

export interface RouteStopInput {
  id?: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  scheduled_time?: string;
}

export type RouteGeometrySource = 'ROUTING_PROVIDER' | 'SAVED_GEOMETRY' | 'STRAIGHT_LINE_FALLBACK';

export interface RouteGeometryResult {
  source: RouteGeometrySource;
  polyline: [number, number][];
  distance_meters: number;
  distanceMeters?: number;
  duration_seconds: number;
  durationSeconds?: number;
  provider_name: string;
  confidence: 'ROAD_FOLLOWING' | 'SAVED_GEOMETRY' | 'STRAIGHT_LINE_FALLBACK';
  message: string;
}

export interface RouteValidationResult {
  isValid: boolean;
  errors: string[];
  problematicStopIds?: string[];
}

/**
 * Validates stop sequence, geographic coordinates, and ordering
 */
export function validateRouteStops(stops: RouteStopInput[]): RouteValidationResult {
  const errors: string[] = [];
  const problematicStopIds: string[] = [];

  if (!stops || stops.length < 2) {
    errors.push('A route requires at least 2 stops (origin and destination).');
    return { isValid: false, errors };
  }

  // Sort copy by sequence
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

  // Check sequence numbering
  const sequences = new Set<number>();
  for (let i = 0; i < sortedStops.length; i++) {
    const s = sortedStops[i]!;
    if (s.sequence === undefined || s.sequence === null || isNaN(s.sequence) || s.sequence <= 0) {
      errors.push(`Stop "${s.name || 'Unnamed'}" has an invalid sequence number: ${s.sequence}`);
      if (s.id) problematicStopIds.push(s.id);
    }
    if (sequences.has(s.sequence)) {
      errors.push(`Duplicate sequence number detected: ${s.sequence}`);
      if (s.id) problematicStopIds.push(s.id);
    }
    sequences.add(s.sequence);

    // Coordinate validation
    if (typeof s.latitude !== 'number' || typeof s.longitude !== 'number' || isNaN(s.latitude) || isNaN(s.longitude)) {
      errors.push(`Stop "${s.name || 'Unnamed'}" has missing or non-numeric coordinates.`);
      if (s.id) problematicStopIds.push(s.id);
      continue;
    }

    if (s.latitude < -90 || s.latitude > 90) {
      errors.push(`Stop "${s.name}" latitude out of valid range [-90, 90]: ${s.latitude}`);
      if (s.id) problematicStopIds.push(s.id);
    }

    if (s.longitude < -180 || s.longitude > 180) {
      errors.push(`Stop "${s.name}" longitude out of valid range [-180, 180]: ${s.longitude}`);
      if (s.id) problematicStopIds.push(s.id);
    }

    // Null Island rejection
    if (Math.abs(s.latitude) < 0.000001 && Math.abs(s.longitude) < 0.000001) {
      errors.push(`Stop "${s.name}" is located at Null Island (0,0), which is invalid.`);
      if (s.id) problematicStopIds.push(s.id);
    }

    // Name check
    if (!s.name || !s.name.trim()) {
      errors.push(`Stop at sequence ${s.sequence} is missing a descriptive name.`);
      if (s.id) problematicStopIds.push(s.id);
    }
  }

  // Sequence continuity check (must be contiguous: 1, 2, 3...)
  for (let i = 0; i < sortedStops.length; i++) {
    const expected = i + 1;
    if (sortedStops[i]!.sequence !== expected) {
      errors.push(`Sequence error: expected sequence ${expected} for stop "${sortedStops[i]!.name}", got ${sortedStops[i]!.sequence}.`);
      if (sortedStops[i]!.id) problematicStopIds.push(sortedStops[i]!.id!);
    }
  }

  // Duplicate stop name check
  const stopNames = new Set<string>();
  for (const s of sortedStops) {
    const norm = (s.name || '').trim().toLowerCase();
    if (norm && stopNames.has(norm)) {
      errors.push(`Duplicate stop name "${s.name}" detected on route.`);
      if (s.id) problematicStopIds.push(s.id);
    }
    if (norm) stopNames.add(norm);
  }

  // Duplicate coordinate check (consecutive stops with same coords within ~5m)
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const a = sortedStops[i]!;
    const b = sortedStops[i + 1]!;
    const latDiff = Math.abs(a.latitude - b.latitude);
    const lngDiff = Math.abs(a.longitude - b.longitude);
    if (latDiff < 0.00005 && lngDiff < 0.00005) {
      errors.push(`Consecutive stops "${a.name}" and "${b.name}" have identical coordinates.`);
      if (a.id) problematicStopIds.push(a.id);
      if (b.id) problematicStopIds.push(b.id);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    problematicStopIds: Array.from(new Set(problematicStopIds)),
  };
}

/**
 * Calculates Euclidean distance in meters along an array of [lat, lng] coordinates
 */
export function calculatePolylineDistanceMeters(polyline: [number, number][]): number {
  let totalDistance = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [lat1, lon1] = polyline[i]!;
    const [lat2, lon2] = polyline[i + 1]!;

    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }
  return Math.round(totalDistance);
}

/**
 * Generates straight-line connection between ordered stops as fallback
 */
export function generateStraightLineFallback(stops: RouteStopInput[]): RouteGeometryResult {
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const polyline: [number, number][] = sortedStops.map(s => [s.latitude, s.longitude]);
  const distance = calculatePolylineDistanceMeters(polyline);

  // Estimate duration assuming 25 km/h average speed
  const speedMps = (25 * 1000) / 3600;
  const duration = Math.round(distance / speedMps);

  return {
    source: 'STRAIGHT_LINE_FALLBACK',
    polyline,
    distance_meters: distance,
    distanceMeters: distance,
    duration_seconds: duration,
    durationSeconds: duration,
    provider_name: 'Straight-Line Stop Interpolation',
    confidence: 'STRAIGHT_LINE_FALLBACK',
    message: 'Notice: Road routing service unavailable. Displaying straight-line connection fallback. Please review before saving.',
  };
}

export interface RoutingServiceOptions {
  routingServiceUrl?: string | undefined;
  timeoutMs?: number | undefined;
  existingPolyline?: [number, number][] | undefined;
  fetchFn?: typeof fetch | undefined;
}

/**
 * Routing Provider Integration Boundary
 *
 * Requests road-following geometry from a configured routing engine (OSRM or custom provider).
 * If routing fails, times out, or is unconfigured, gracefully falls back to existing verified
 * geometry or clearly identified straight-line connections.
 */
export async function calculateRouteGeometry(
  stops: RouteStopInput[],
  options: RoutingServiceOptions = {},
): Promise<RouteGeometryResult> {
  const validation = validateRouteStops(stops);
  if (!validation.isValid) {
    throw new Error(`Invalid route stops: ${validation.errors.join('; ')}`);
  }

  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

  // 1. Check if routing service is enabled or custom URL provided
  const providerUrl =
    options.routingServiceUrl ||
    process.env.ROUTING_PROVIDER_URL ||
    'https://router.project-osrm.org/route/v1/driving';

  const timeoutMs = options.timeoutMs ?? 4000;
  const fetchImpl = options.fetchFn ?? globalThis.fetch;

  if (fetchImpl && providerUrl) {
    try {
      // Build coordinate string for OSRM: lng,lat;lng,lat;...
      const coordsString = sortedStops.map(s => `${s.longitude},${s.latitude}`).join(';');
      const url = `${providerUrl}/${coordsString}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as {
          code?: string;
          routes?: Array<{
            geometry?: {
              coordinates?: [number, number][]; // [lng, lat]
            };
            distance?: number;
            duration?: number;
          }>;
        };

        if (data.code === 'Ok' && data.routes && data.routes.length > 0 && data.routes[0]?.geometry?.coordinates) {
          const rawCoords = data.routes[0].geometry.coordinates;
          // Convert OSRM [longitude, latitude] to Leaflet/WGS84 [latitude, longitude]
          const polyline: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          const dist = Math.round(data.routes[0].distance ?? calculatePolylineDistanceMeters(polyline));
          const dur = Math.round(data.routes[0].duration ?? 0);

          return {
            source: 'ROUTING_PROVIDER',
            polyline,
            distance_meters: dist,
            distanceMeters: dist,
            duration_seconds: dur,
            durationSeconds: dur,
            provider_name: 'OSRM Road Routing Service',
            confidence: 'ROAD_FOLLOWING',
            message: 'Road-following route geometry generated via routing provider.',
          };
        }
      }
    } catch {
      // Network interruption, abort, or DNS failure handled cleanly below
    }
  }

  // 2. If existing saved geometry is provided and still has >= 2 points, retain it
  if (options.existingPolyline && options.existingPolyline.length >= 2) {
    const dist = calculatePolylineDistanceMeters(options.existingPolyline);
    const dur = Math.round(dist / ((25 * 1000) / 3600));
    return {
      source: 'SAVED_GEOMETRY',
      polyline: options.existingPolyline,
      distance_meters: dist,
      distanceMeters: dist,
      duration_seconds: dur,
      durationSeconds: dur,
      provider_name: 'Existing Verified Geometry',
      confidence: 'SAVED_GEOMETRY',
      message: 'Retained existing verified road geometry. Routing provider was unreachable.',
    };
  }

  // 3. Fallback: Straight-line connection between stops with explicit warning
  return generateStraightLineFallback(sortedStops);
}
