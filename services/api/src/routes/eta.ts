import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  calculateRouteEtas,
  type RouteStop,
  type BusTelemetryInput,
  type RouteEtaResult,
} from '@vjit/domain';
import { sendErrorResponse } from '../middleware/security.js';

export interface EtaDataStore {
  getRouteGeometry(routeId: string): Promise<{
    id: string;
    polyline: Array<[number, number]>;
    stops: RouteStop[];
  } | null>;
  getBusTelemetry(busId: string): Promise<BusTelemetryInput | null>;
}

/**
 * Handles GET /api/v1/eta/route?route_id=...&bus_id=...
 * Implements Specification Section 17.5 & UI-SPEC-1.0 Section 5
 */
export async function handleRouteEta(
  _req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  requestId: string,
  store: EtaDataStore,
): Promise<void> {
  const routeId = url.searchParams.get('route_id');
  const busId = url.searchParams.get('bus_id');

  if (!routeId || !busId) {
    return sendErrorResponse(
      res,
      400,
      'MISSING_PARAMS',
      'Both route_id and bus_id query parameters are required.',
      requestId,
    );
  }

  const routeData = await store.getRouteGeometry(routeId);
  if (!routeData) {
    return sendErrorResponse(
      res,
      404,
      'ROUTE_NOT_FOUND',
      `Route ${routeId} not found.`,
      requestId,
    );
  }

  const busTelemetry = await store.getBusTelemetry(busId);
  if (!busTelemetry) {
    return sendErrorResponse(
      res,
      404,
      'BUS_NOT_FOUND',
      `Bus ${busId} telemetry not found.`,
      requestId,
    );
  }

  const nowUtc = new Date().toISOString();
  const etaResult: RouteEtaResult = calculateRouteEtas(
    busTelemetry,
    routeData.polyline,
    routeData.stops,
    nowUtc,
  );

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      status: 'ok',
      data: etaResult,
      request_id: requestId,
    }),
  );
}
