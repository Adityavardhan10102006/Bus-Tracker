import type { IncomingMessage, ServerResponse } from 'node:http';
import { fleetDataStore } from '../store/fleet-data-store.js';
import { sendErrorResponse } from '../middleware/security.js';
import { checkRole, ROLE_GROUPS } from '../middleware/auth.js';
import { logger } from '@vjit/logger';
import {
  type UserRole,
  type UserProfile,
  createBusInputSchema,
  updateBusInputSchema,
  assignRouteInputSchema,
  createDeviceInputSchema,
  updateDeviceInputSchema,
} from '@vjit/contracts';
import { validateRouteStops, calculateRouteGeometry, maskDeviceRecord } from '@vjit/domain';

/**
 * Parses JSON body from incoming request safely with byte limit guard
 */
export async function parseJsonBody<T = unknown>(req: IncomingMessage, maxBytes = 65536): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > maxBytes) {
        req.destroy();
        reject(new Error('Request payload exceeded size limit.'));
      }
    });
    req.on('end', () => {
      if (!data.trim()) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(data) as T);
      } catch (err) {
        reject(new Error('Malformed JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

export function sendJsonResponse(res: ServerResponse, statusCode: number, data: unknown, requestId: string): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(data));
}

/**
 * Verifies if simulator and demo routes are permitted per Rule R-M5:
 * "The simulator refuses to run unless APP_ENV is local or staging, and only against hostnames in SIMULATOR_ALLOWED_HOSTS."
 */
export function isSimulatorAllowed(req: IncomingMessage): { allowed: boolean; reason?: string } {
  const appEnv = process.env.APP_ENV ?? 'local';
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (appEnv === 'production' || nodeEnv === 'production' || !['local', 'staging'].includes(appEnv)) {
    return {
      allowed: false,
      reason: 'Simulation endpoints (/api/v1/demo/*) are strictly forbidden in production (Rule R-M5).',
    };
  }
  const rawAllowedHosts = process.env.SIMULATOR_ALLOWED_HOSTS || 'localhost,127.0.0.1';
  const allowedHosts = rawAllowedHosts
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
  const hostHeader = (req.headers.host || '').split(':')[0]?.toLowerCase() ?? '';
  if (hostHeader && !allowedHosts.includes(hostHeader)) {
    return {
      allowed: false,
      reason: `Simulator request from host "${hostHeader}" rejected. Host is not in SIMULATOR_ALLOWED_HOSTS (Rule R-M5).`,
    };
  }
  return { allowed: true };
}

// ============================================================================
// Domain Dispatchers
// ============================================================================

/**
 * Handles /api/v1/snapshot: Active buses with coordinates & freshness
 */
async function handleSnapshotEndpoints(
  _req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  url: URL,
): Promise<boolean> {
  if (method === 'GET' && pathname === '/api/v1/snapshot') {
    const routeId = url.searchParams.get('route_id') ?? undefined;
    const buses = fleetDataStore.getSnapshots(routeId);
    sendJsonResponse(res, 200, { buses, total: buses.length, request_id: requestId }, requestId);
    return true;
  }
  return false;
}

/**
 * Handles /api/v1/routes endpoints: Listing, details, stop management, and road geometry
 */
async function handleRouteEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/routes')) {
    return false;
  }

  // GET /api/v1/routes
  if (method === 'GET' && pathname === '/api/v1/routes') {
    const routes = fleetDataStore.getRoutes();
    sendJsonResponse(res, 200, { routes, total: routes.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/routes/preview-geometry
  if (method === 'POST' && pathname === '/api/v1/routes/preview-geometry') {
    try {
      const body = await parseJsonBody<{
        stops: Array<{ name: string; sequence: number; latitude: number; longitude: number; scheduled_time?: string }>;
        existing_polyline?: [number, number][];
      }>(req);

      if (!body.stops || !Array.isArray(body.stops)) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'An array of stops is required for geometry preview.', requestId);
        return true;
      }

      const validation = validateRouteStops(body.stops);
      if (!validation.isValid) {
        sendJsonResponse(res, 400, {
          success: false,
          code: 'VALIDATION_ERROR',
          message: validation.errors.join('; '),
          errors: validation.errors,
          problematicStopIds: validation.problematicStopIds,
          request_id: requestId,
        }, requestId);
        return true;
      }

      const geometryOptions: { existingPolyline?: [number, number][] } = {};
      if (body.existing_polyline) {
        geometryOptions.existingPolyline = body.existing_polyline;
      }
      const geometry = await calculateRouteGeometry(body.stops, geometryOptions);

      sendJsonResponse(res, 200, { success: true, geometry, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // GET /api/v1/routes/:id
  if (method === 'GET' && pathname.startsWith('/api/v1/routes/')) {
    const routeId = pathname.replace('/api/v1/routes/', '').split('/')[0];
    if (routeId) {
      const route = fleetDataStore.getRouteById(routeId);
      if (!route) {
        sendErrorResponse(res, 404, 'NOT_FOUND', `Route ${routeId} not found.`, requestId);
        return true;
      }
      sendJsonResponse(res, 200, { route, request_id: requestId }, requestId);
      return true;
    }
  }

  // POST /api/v1/routes: Create new route
  if (method === 'POST' && pathname === '/api/v1/routes') {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can create transit routes')) {
      return true;
    }

    try {
      const body = await parseJsonBody<{
        name: string;
        code: string;
        origin: string;
        destination: string;
        stops?: Array<{ name: string; sequence: number; latitude: number; longitude: number; scheduled_time?: string }>;
        polyline?: [number, number][];
        geometry_source?: 'ROUTING_PROVIDER' | 'SAVED_GEOMETRY' | 'STRAIGHT_LINE_FALLBACK';
      }>(req);

      if (!body.name || !body.code || !body.origin || !body.destination) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Name, code, origin, and destination are required.', requestId);
        return true;
      }

      let polyline = body.polyline;
      let geometrySource = body.geometry_source;

      if (body.stops && body.stops.length >= 2) {
        const validation = validateRouteStops(body.stops);
        if (!validation.isValid) {
          sendJsonResponse(res, 400, {
            success: false,
            code: 'VALIDATION_ERROR',
            message: validation.errors.join('; '),
            errors: validation.errors,
            problematicStopIds: validation.problematicStopIds,
            request_id: requestId,
          }, requestId);
          return true;
        }

        if (!polyline || polyline.length < 2) {
          const geomResult = await calculateRouteGeometry(body.stops);
          polyline = geomResult.polyline;
          geometrySource = geomResult.source;
        }
      }

      const newRoute = fleetDataStore.createRoute({
        name: body.name,
        code: body.code,
        origin: body.origin,
        destination: body.destination,
        ...(body.stops ? { stops: body.stops } : {}),
        ...(polyline ? { polyline } : {}),
        ...(geometrySource ? { geometry_source: geometrySource } : {}),
      });

      fleetDataStore.recordAuditLog(
        user.email,
        user.role,
        'ROUTE_CREATED',
        'ROUTE',
        newRoute.id,
        'Transit corridor created with validated geometry and stops',
        null,
        newRoute as unknown as Record<string, unknown>,
      );

      logger.info('Route created by administrator', { routeId: newRoute.id, code: newRoute.code });
      sendJsonResponse(res, 201, { success: true, route: newRoute, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // PUT /api/v1/routes/:id: Update route
  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/routes/') && !pathname.includes('/stops') && !pathname.includes('/preview-geometry')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can modify transit routes')) {
      return true;
    }

    const routeId = pathname.replace('/api/v1/routes/', '');
    const oldRoute = fleetDataStore.getRouteById(routeId);
    if (!oldRoute) {
      sendErrorResponse(res, 404, 'NOT_FOUND', `Route ${routeId} not found.`, requestId);
      return true;
    }

    try {
      const body = await parseJsonBody<{
        name?: string;
        code?: string;
        origin?: string;
        destination?: string;
        stops?: Array<{ id?: string; name: string; sequence: number; latitude: number; longitude: number; scheduled_time?: string; status?: 'SCHEDULED' | 'ARRIVING' | 'DEPARTED' }>;
        polyline?: [number, number][];
        geometry_source?: 'ROUTING_PROVIDER' | 'SAVED_GEOMETRY' | 'STRAIGHT_LINE_FALLBACK';
        calculate_geometry?: boolean;
      }>(req);

      let polyline = body.polyline;
      let geometrySource = body.geometry_source;

      if (body.stops && body.stops.length >= 2) {
        const validation = validateRouteStops(body.stops);
        if (!validation.isValid) {
          sendJsonResponse(res, 400, {
            success: false,
            code: 'VALIDATION_ERROR',
            message: validation.errors.join('; '),
            errors: validation.errors,
            problematicStopIds: validation.problematicStopIds,
            request_id: requestId,
          }, requestId);
          return true;
        }

        if (body.calculate_geometry || (!polyline && JSON.stringify(body.stops) !== JSON.stringify(oldRoute.stops))) {
          const geomResult = await calculateRouteGeometry(body.stops, {
            existingPolyline: oldRoute.polyline,
          });
          polyline = geomResult.polyline;
          geometrySource = geomResult.source;
        }
      }

      const updated = fleetDataStore.updateRoute(routeId, {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.origin !== undefined ? { origin: body.origin } : {}),
        ...(body.destination !== undefined ? { destination: body.destination } : {}),
        ...(body.stops !== undefined ? { stops: body.stops } : {}),
        ...(polyline !== undefined ? { polyline } : {}),
        ...(geometrySource !== undefined ? { geometry_source: geometrySource } : {}),
      });

      fleetDataStore.recordAuditLog(
        user.email,
        user.role,
        'ROUTE_UPDATED',
        'ROUTE',
        routeId,
        'Transit corridor and geometry updated',
        oldRoute as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
      );

      logger.info('Route updated', { routeId });
      sendJsonResponse(res, 200, { success: true, route: updated, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // DELETE /api/v1/routes/:id: Delete route
  if (method === 'DELETE' && pathname.startsWith('/api/v1/routes/') && !pathname.includes('/stops') && !pathname.includes('/preview-geometry')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can remove routes')) {
      return true;
    }
    const routeId = pathname.replace('/api/v1/routes/', '');
    const oldRoute = fleetDataStore.getRouteById(routeId);
    const ok = fleetDataStore.deleteRoute(routeId);
    if (!ok) {
      sendErrorResponse(res, 404, 'NOT_FOUND', `Route ${routeId} not found.`, requestId);
      return true;
    }
    fleetDataStore.recordAuditLog(
      user.email,
      user.role,
      'ROUTE_DELETED',
      'ROUTE',
      routeId,
      'Transit corridor retired by administrator',
      oldRoute as unknown as Record<string, unknown>,
      null,
    );
    logger.info('Route deleted', { routeId });
    sendJsonResponse(res, 200, { success: true, message: `Route ${routeId} removed.`, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/routes/:id/stops: Add stop
  if (method === 'POST' && pathname.includes('/api/v1/routes/') && pathname.endsWith('/stops')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can add route stops')) {
      return true;
    }
    const parts = pathname.split('/');
    const routeId = parts[4] ?? '';
    try {
      const body = await parseJsonBody<{ name: string; sequence: number; latitude: number; longitude: number; scheduled_time: string }>(req);
      if (!body.name || !body.latitude || !body.longitude) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Stop name, latitude, and longitude are required.', requestId);
        return true;
      }
      const updated = fleetDataStore.addStopToRoute(routeId, body);
      if (!updated) {
        sendErrorResponse(res, 404, 'NOT_FOUND', `Route ${routeId} not found.`, requestId);
        return true;
      }
      logger.info('Stop added to route', { routeId, stopName: body.name });
      sendJsonResponse(res, 201, { success: true, route: updated, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // DELETE /api/v1/routes/:id/stops/:stopId
  if (method === 'DELETE' && pathname.includes('/api/v1/routes/') && pathname.includes('/stops/')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can remove route stops')) {
      return true;
    }
    const parts = pathname.split('/');
    const routeId = parts[4] ?? '';
    const stopId = parts[6] ?? '';
    const updated = fleetDataStore.removeStopFromRoute(routeId, stopId);
    if (!updated) {
      sendErrorResponse(res, 404, 'NOT_FOUND', `Route or stop not found.`, requestId);
      return true;
    }
    logger.info('Stop removed from route', { routeId, stopId });
    sendJsonResponse(res, 200, { success: true, route: updated, request_id: requestId }, requestId);
    return true;
  }

  return false;
}

/**
 * Handles /api/v1/buses endpoints: Fleet inventory, registration, route assignments, updates, deactivations
 */
async function handleBusEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/buses')) {
    return false;
  }

  // GET /api/v1/buses: Statutory fleet records restricted to staff
  if (method === 'GET' && pathname === '/api/v1/buses') {
    if (!checkRole(user.role, ROLE_GROUPS.STAFF_MEMBERS, res, requestId, 'Access to statutory bus records is restricted to transport staff')) {
      return true;
    }
    const buses = fleetDataStore.getBuses();
    sendJsonResponse(res, 200, { buses, total: buses.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/buses: Create bus
  if (method === 'POST' && pathname === '/api/v1/buses') {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can register buses')) {
      return true;
    }
    try {
      const rawBody = await parseJsonBody<unknown>(req);
      const parseResult = createBusInputSchema.safeParse(rawBody);
      if (!parseResult.success) {
        sendErrorResponse(
          res,
          400,
          'VALIDATION_ERROR',
          parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
          requestId,
        );
        return true;
      }

      const newBus = fleetDataStore.createBus(parseResult.data, user.email, user.role);
      logger.info('Bus created by administrator', { busId: newBus.id, busNumber: newBus.bus_number });
      sendJsonResponse(res, 201, { success: true, bus: newBus, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      const status = msg.toLowerCase().includes('duplicate') ? 409 : 400;
      sendErrorResponse(res, status, 'BAD_REQUEST', msg, requestId);
      return true;
    }
  }

  // POST /api/v1/buses/:id/assign-route: Associate bus to saved transit route
  if (method === 'POST' && pathname.includes('/api/v1/buses/') && pathname.endsWith('/assign-route')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can assign routes to buses')) {
      return true;
    }
    const parts = pathname.split('/');
    const busId = parts[4] ?? '';
    try {
      const rawBody = await parseJsonBody<unknown>(req);
      const parseResult = assignRouteInputSchema.safeParse(rawBody);
      if (!parseResult.success) {
        sendErrorResponse(
          res,
          400,
          'VALIDATION_ERROR',
          parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
          requestId,
        );
        return true;
      }
      const result = fleetDataStore.assignBusToRoute(busId, parseResult.data.route_id, user.email, user.role);
      if (!result.success) {
        const status = result.error?.toLowerCase().includes('not found') ? 404 : 400;
        sendErrorResponse(res, status, 'ASSIGN_ROUTE_ERROR', result.error ?? 'Failed to associate bus with route.', requestId);
        return true;
      }
      logger.info('Bus associated with route', { busId, routeId: parseResult.data.route_id });
      sendJsonResponse(res, 200, { success: true, bus: result.bus, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // PUT /api/v1/buses/:id: Update bus
  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/buses/') && !pathname.endsWith('/assign-route')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can update buses')) {
      return true;
    }
    const busId = pathname.replace('/api/v1/buses/', '');
    try {
      const rawBody = await parseJsonBody<unknown>(req);
      const parseResult = updateBusInputSchema.safeParse(rawBody);
      if (!parseResult.success) {
        sendErrorResponse(
          res,
          400,
          'VALIDATION_ERROR',
          parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
          requestId,
        );
        return true;
      }
      const updated = fleetDataStore.updateBus(busId, parseResult.data, user.email, user.role);
      if (!updated) {
        sendErrorResponse(res, 404, 'NOT_FOUND', `Bus ${busId} not found.`, requestId);
        return true;
      }
      logger.info('Bus record updated', { busId });
      sendJsonResponse(res, 200, { success: true, bus: updated, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // DELETE /api/v1/buses/:id: Deactivate bus
  if (method === 'DELETE' && pathname.startsWith('/api/v1/buses/')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can deactivate buses')) {
      return true;
    }
    const busId = pathname.replace('/api/v1/buses/', '');
    const deactivated = fleetDataStore.deactivateBus(busId);
    if (!deactivated) {
      sendErrorResponse(res, 404, 'NOT_FOUND', `Bus ${busId} not found.`, requestId);
      return true;
    }
    logger.info('Bus deactivated to RETIRED status', { busId });
    sendJsonResponse(res, 200, { success: true, bus: deactivated, request_id: requestId }, requestId);
    return true;
  }

  return false;
}

/**
 * Handles /api/v1/devices endpoints: Device inventory, registration, bus association, lifecycle status
 */
async function handleDeviceEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/devices')) {
    return false;
  }

  // GET /api/v1/devices: Hardware inventory restricted to device managers with IMEI/ICCID masking
  if (method === 'GET' && pathname === '/api/v1/devices') {
    if (!checkRole(user.role, ROLE_GROUPS.DEVICE_MANAGERS, res, requestId, 'Access to GPS device inventory is restricted to hardware and transport staff')) {
      return true;
    }
    const rawDevices = fleetDataStore.getDevices();
    const devices = rawDevices.map(d => maskDeviceRecord(d, user.role));
    const links = fleetDataStore.getLinks();
    sendJsonResponse(res, 200, { devices, links, total: devices.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/devices: Register new hardware device
  if (method === 'POST' && pathname === '/api/v1/devices') {
    if (!checkRole(user.role, ROLE_GROUPS.DEVICE_MANAGERS, res, requestId, 'Only Coordinators, Technicians, and Super Admins can register GPS devices')) {
      return true;
    }
    try {
      const rawBody = await parseJsonBody<unknown>(req);
      const parseResult = createDeviceInputSchema.safeParse(rawBody);
      if (!parseResult.success) {
        sendErrorResponse(
          res,
          400,
          'VALIDATION_ERROR',
          parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
          requestId,
        );
        return true;
      }
      const result = fleetDataStore.registerDevice(parseResult.data, user.email, user.role);
      if (!result.success) {
        sendErrorResponse(res, 409, 'DUPLICATE_DEVICE_ERROR', result.error ?? 'Device registration failed.', requestId);
        return true;
      }
      logger.info('Device registered in registry', { deviceId: result.device?.device_id, actor: user.email });
      sendJsonResponse(
        res,
        201,
        {
          success: true,
          device: result.device ? maskDeviceRecord(result.device, user.role) : undefined,
          token: result.plaintextToken,
          request_id: requestId,
        },
        requestId,
      );
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // PUT/PATCH /api/v1/devices/:id: Update device details (model, nickname, firmware)
  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/devices/') &&
      !pathname.endsWith('/link') && !pathname.endsWith('/unlink') && !pathname.endsWith('/status')) {
    if (!checkRole(user.role, ROLE_GROUPS.DEVICE_MANAGERS, res, requestId, 'Only Coordinators, Technicians, and Super Admins can edit device details')) {
      return true;
    }
    const deviceId = pathname.replace('/api/v1/devices/', '');
    try {
      const rawBody = await parseJsonBody<unknown>(req);
      const parseResult = updateDeviceInputSchema.safeParse(rawBody);
      if (!parseResult.success) {
        sendErrorResponse(
          res,
          400,
          'VALIDATION_ERROR',
          parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
          requestId,
        );
        return true;
      }
      const result = fleetDataStore.updateDevice(deviceId, parseResult.data, user.email, user.role);
      if (!result.success) {
        sendErrorResponse(res, 404, 'NOT_FOUND', result.error ?? 'Device not found.', requestId);
        return true;
      }
      logger.info('Device details updated', { deviceId, actor: user.email });
      sendJsonResponse(res, 200, { success: true, device: result.device, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // POST /api/v1/devices/:id/link: Link device to bus (Rule E.6)
  if (method === 'POST' && pathname.includes('/api/v1/devices/') && pathname.endsWith('/link')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Transport Coordinators (COR) and Super Admins (SAD) can associate devices to buses (Rule E.6)')) {
      return true;
    }
    const parts = pathname.split('/');
    const deviceId = parts[4] ?? '';
    try {
      const body = await parseJsonBody<{ bus_id: string }>(req);
      if (!body.bus_id) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'bus_id is required.', requestId);
        return true;
      }
      const result = fleetDataStore.linkDeviceToBus(deviceId, body.bus_id, user.email);
      if (!result.success) {
        sendErrorResponse(res, 400, 'LINK_ERROR', result.error ?? 'Linking failed.', requestId);
        return true;
      }
      logger.info('Device linked to bus successfully', { deviceId, busId: body.bus_id, linkedBy: user.email });
      sendJsonResponse(res, 200, { success: true, link: result.link, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // POST /api/v1/devices/:id/unlink: Unlink device from bus (Rule E.6)
  if (method === 'POST' && pathname.includes('/api/v1/devices/') && pathname.endsWith('/unlink')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Transport Coordinators (COR) and Super Admins (SAD) can modify device associations (Rule E.6)')) {
      return true;
    }
    const parts = pathname.split('/');
    const deviceId = parts[4] ?? '';
    const result = fleetDataStore.unlinkDevice(deviceId, user.email);
    if (!result.success) {
      sendErrorResponse(res, 400, 'UNLINK_ERROR', result.error ?? 'Unlinking failed.', requestId);
      return true;
    }
    logger.info('Device unlinked from bus successfully', { deviceId, unlinkedBy: user.email });
    sendJsonResponse(res, 200, { success: true, message: `Device ${deviceId} unlinked from bus.`, request_id: requestId }, requestId);
    return true;
  }

  // PATCH/POST /api/v1/devices/:id/status: Update device lifecycle status (Rule E.6)
  if ((method === 'PATCH' || method === 'POST') && pathname.includes('/api/v1/devices/') && pathname.endsWith('/status')) {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Transport Coordinators (COR) and Super Admins (SAD) can change device lifecycle status')) {
      return true;
    }
    const parts = pathname.split('/');
    const deviceId = parts[4] ?? '';
    try {
      const body = await parseJsonBody<{ status: 'ACTIVE' | 'PROVISIONED' | 'REVOKED' }>(req);
      if (!body.status || !['ACTIVE', 'PROVISIONED', 'REVOKED'].includes(body.status)) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'status must be ACTIVE, PROVISIONED, or REVOKED.', requestId);
        return true;
      }
      const result = fleetDataStore.updateDeviceStatus(deviceId, body.status, user.email);
      if (!result.success) {
        sendErrorResponse(res, 404, 'NOT_FOUND', result.error ?? 'Device not found.', requestId);
        return true;
      }
      logger.info('Device status updated', { deviceId, status: body.status, updatedBy: user.email });
      sendJsonResponse(res, 200, { success: true, device: result.device, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  return false;
}

/**
 * Handles /api/v1/alerts: Broadcast announcements & disruption notices
 */
async function handleAlertEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/alerts')) {
    return false;
  }

  // GET /api/v1/alerts
  if (method === 'GET' && pathname === '/api/v1/alerts') {
    const alerts = fleetDataStore.getAlerts();
    sendJsonResponse(res, 200, { alerts, total: alerts.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/alerts: Create alert
  if (method === 'POST' && pathname === '/api/v1/alerts') {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can publish service alerts')) {
      return true;
    }
    try {
      const body = await parseJsonBody<{
        title: string;
        message: string;
        category: 'SAFETY' | 'DELAY' | 'SCHEDULE' | 'SYSTEM';
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
      }>(req);
      if (!body.title || !body.message) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Title and message are required.', requestId);
        return true;
      }
      const alert = fleetDataStore.createAlert({
        title: body.title,
        message: body.message,
        category: body.category ?? 'DELAY',
        priority: body.priority ?? 'MEDIUM',
        read: false,
      });
      logger.info('Service alert published', { alertId: alert.id, title: alert.title });
      sendJsonResponse(res, 201, { success: true, alert, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  return false;
}

/**
 * Handles /api/v1/me and /api/v1/auth/switch-role: User identity and role switching
 */
async function handleAuthAndProfileEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
): Promise<boolean> {
  // GET /api/v1/me
  if (method === 'GET' && pathname === '/api/v1/me') {
    const user = fleetDataStore.getCurrentUser();
    sendJsonResponse(res, 200, { user, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/auth/switch-role
  if (method === 'POST' && pathname === '/api/v1/auth/switch-role') {
    try {
      const body = await parseJsonBody<{ role: UserRole }>(req);
      if (!body.role) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Role parameter required.', requestId);
        return true;
      }
      const updatedUser = fleetDataStore.switchUserRole(body.role);
      logger.info('Active user role switched', { role: updatedUser.role, email: updatedUser.email });
      sendJsonResponse(res, 200, { success: true, user: updatedUser, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  return false;
}

/**
 * Handles /api/v1/demo/*: Simulation engine (controlled by Rule R-M5)
 */
async function handleDemoEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/demo/')) {
    return false;
  }

  const simCheck = isSimulatorAllowed(req);
  if (!simCheck.allowed) {
    sendErrorResponse(res, 403, 'SIMULATOR_PROHIBITED', simCheck.reason!, requestId);
    return true;
  }

  if (method === 'GET' && pathname === '/api/v1/demo/state') {
    const state = fleetDataStore.getDemoState();
    sendJsonResponse(res, 200, { state, request_id: requestId }, requestId);
    return true;
  }

  if (method === 'POST' && pathname === '/api/v1/demo/toggle') {
    const state = fleetDataStore.toggleDemo();
    logger.info('Demo simulation toggled', { enabled: state.enabled });
    sendJsonResponse(res, 200, { success: true, state, request_id: requestId }, requestId);
    return true;
  }

  if (method === 'POST' && pathname === '/api/v1/demo/tick') {
    const result = fleetDataStore.tickDemo();
    logger.info('Demo simulation stepped forward', { stepIndex: result.state.stepIndex });
    sendJsonResponse(res, 200, { success: true, ...result, request_id: requestId }, requestId);
    return true;
  }

  if (method === 'POST' && pathname === '/api/v1/demo/reset') {
    const result = fleetDataStore.resetDemo();
    logger.info('Demo simulation reset to initial state', { stepIndex: result.state.stepIndex });
    sendJsonResponse(res, 200, { success: true, ...result, request_id: requestId }, requestId);
    return true;
  }

  return false;
}

/**
 * Handles /api/v1/attendance: Boarding records & manual check-in (Spec 18 & ADM-08)
 */
async function handleAttendanceEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
  url: URL,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/attendance')) {
    return false;
  }

  // GET /api/v1/attendance
  if (method === 'GET' && pathname === '/api/v1/attendance') {
    if (!checkRole(user.role, ROLE_GROUPS.STAFF_MEMBERS, res, requestId, 'Access to attendance logs is restricted to authorized staff')) {
      return true;
    }
    const tripType = url.searchParams.get('trip_type') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const search = url.searchParams.get('q') ?? undefined;
    const records = fleetDataStore.getAttendance({ tripType, status, search });
    sendJsonResponse(res, 200, { records, total: records.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/attendance/manual-checkin
  if (method === 'POST' && pathname === '/api/v1/attendance/manual-checkin') {
    if (!checkRole(user.role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res, requestId, 'Only Coordinators and Super Admins can manually record late boarding')) {
      return true;
    }
    try {
      const body = await parseJsonBody<{ student_id: string; trip_id: string; stop_name: string }>(req);
      if (!body.student_id || !body.stop_name) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'student_id and stop_name are required.', requestId);
        return true;
      }
      const record = fleetDataStore.recordManualLateBoarding({
        student_id: body.student_id,
        trip_id: body.trip_id || '00000000-0000-4000-8000-000000000001',
        stop_name: body.stop_name,
        actor: user.email,
      });
      logger.info('Manual late boarding logged', { studentId: body.student_id, stop: body.stop_name });
      sendJsonResponse(res, 201, { success: true, record, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  return false;
}

/**
 * Handles /api/v1/maintenance/tickets: Fleet maintenance work orders (Spec 16.4, 16.5 & ADM-05)
 */
async function handleMaintenanceEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
  url: URL,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/maintenance')) {
    return false;
  }

  // GET /api/v1/maintenance/tickets
  if (method === 'GET' && pathname === '/api/v1/maintenance/tickets') {
    if (!checkRole(user.role, ROLE_GROUPS.MAINTENANCE_DESK, res, requestId, 'Access to maintenance tickets is restricted to fleet operations staff')) {
      return true;
    }
    const entityType = url.searchParams.get('entity_type') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const tickets = fleetDataStore.getMaintenanceTickets({ entityType, status });
    sendJsonResponse(res, 200, { tickets, total: tickets.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/maintenance/tickets
  if (method === 'POST' && pathname === '/api/v1/maintenance/tickets') {
    if (!checkRole(user.role, ROLE_GROUPS.MAINTENANCE_RESOLVERS, res, requestId, 'Insufficient permissions to create maintenance tickets')) {
      return true;
    }
    try {
      const body = await parseJsonBody<{
        entity_type: 'BUS' | 'DEVICE';
        entity_id: string;
        entity_identifier: string;
        title: string;
        description: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        assigned_to: string;
      }>(req);
      if (!body.title || !body.entity_identifier || !body.severity) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Title, entity identifier, and severity are required.', requestId);
        return true;
      }
      const ticket = fleetDataStore.createMaintenanceTicket({
        ...body,
        source: user.role === 'TEC' ? 'TECHNICIAN' : 'COORDINATOR',
      });
      logger.info('Maintenance ticket created', { ticketNumber: ticket.ticket_number, title: ticket.title });
      sendJsonResponse(res, 201, { success: true, ticket, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // POST /api/v1/maintenance/tickets/:id/resolve
  if (method === 'POST' && pathname.includes('/api/v1/maintenance/tickets/') && pathname.endsWith('/resolve')) {
    if (!checkRole(user.role, ROLE_GROUPS.MAINTENANCE_RESOLVERS, res, requestId, 'Insufficient permissions to resolve maintenance tickets')) {
      return true;
    }
    const parts = pathname.split('/');
    const ticketId = parts[5] ?? '';
    try {
      const body = await parseJsonBody<{ resolution_note: string }>(req);
      if (!body.resolution_note) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'resolution_note is required.', requestId);
        return true;
      }
      const resolved = fleetDataStore.resolveMaintenanceTicket(ticketId, body.resolution_note, user.email);
      if (!resolved) {
        sendErrorResponse(res, 404, 'NOT_FOUND', `Ticket ${ticketId} not found.`, requestId);
        return true;
      }
      logger.info('Maintenance ticket resolved', { ticketId, resolvedBy: user.email });
      sendJsonResponse(res, 200, { success: true, ticket: resolved, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  return false;
}

/**
 * Handles /api/v1/settings: System configuration (Spec Section 35 & Rule B.6)
 */
async function handleSettingsEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/settings')) {
    return false;
  }

  // GET /api/v1/settings
  if (method === 'GET' && pathname === '/api/v1/settings') {
    const settings = fleetDataStore.getSystemSettings();
    sendJsonResponse(res, 200, { settings, total: settings.length, request_id: requestId }, requestId);
    return true;
  }

  // PUT/PATCH /api/v1/settings/:key
  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/settings/')) {
    if (!checkRole(user.role, ROLE_GROUPS.SUPER_ADMINS_ONLY, res, requestId, 'Only Super Administrators (SAD) can modify operational settings (Spec 16.3 & Rule B.6)')) {
      return true;
    }

    const key = pathname.replace('/api/v1/settings/', '');
    try {
      const body = await parseJsonBody<{ value: string | number | boolean; reason: string }>(req);
      if (body.value === undefined || !body.reason) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Setting value and reason are required.', requestId);
        return true;
      }
      const updated = fleetDataStore.updateSystemSetting(key, body.value, user.email, body.reason);
      if (!updated) {
        sendErrorResponse(res, 404, 'NOT_FOUND', `Setting ${key} not found.`, requestId);
        return true;
      }
      logger.info('System setting updated by Super Admin', { key, value: body.value, reason: body.reason });
      sendJsonResponse(res, 200, { success: true, setting: updated, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  return false;
}

/**
 * Handles /api/v1/audit-logs & /api/v1/diagnostics: Audit trails & system telemetry
 */
async function handleAuditAndDiagnosticsEndpoints(
  _req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  // GET /api/v1/audit-logs
  if (method === 'GET' && pathname === '/api/v1/audit-logs') {
    if (!checkRole(user.role, ROLE_GROUPS.AUDIT_READERS, res, requestId, 'Audit logs are restricted to authorized audit and operations staff')) {
      return true;
    }
    const logs = fleetDataStore.getAuditLogs();
    sendJsonResponse(res, 200, { logs, total: logs.length, request_id: requestId }, requestId);
    return true;
  }

  // GET /api/v1/diagnostics
  if (method === 'GET' && pathname === '/api/v1/diagnostics') {
    if (!checkRole(user.role, ROLE_GROUPS.DIAGNOSTICS_VIEWERS, res, requestId, 'Operational diagnostics are restricted to transport staff')) {
      return true;
    }
    const diagnostics = fleetDataStore.getDiagnostics();
    sendJsonResponse(res, 200, { success: true, diagnostics, request_id: requestId }, requestId);
    return true;
  }

  return false;
}

/**
 * Handles /api/v1/admin/backup & /api/v1/admin/restore: Storage persistence backups (Spec Section 31.6)
 */
async function handleBackupAndRestoreEndpoints(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  requestId: string,
  user: UserProfile,
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/admin/')) {
    return false;
  }

  // POST /api/v1/admin/backup
  if (method === 'POST' && pathname === '/api/v1/admin/backup') {
    if (!checkRole(user.role, ROLE_GROUPS.SUPER_ADMINS_ONLY, res, requestId, 'Only Super Administrators (SAD) can trigger store backup snapshots')) {
      return true;
    }
    const backupResult = fleetDataStore.createBackup();
    if (!backupResult.success) {
      sendErrorResponse(res, 500, 'BACKUP_FAILED', backupResult.error ?? 'Failed to create store backup snapshot.', requestId);
      return true;
    }
    logger.info('System store backup snapshot created by Super Admin', { backupPath: backupResult.backupPath });
    sendJsonResponse(res, 201, { success: true, backupPath: backupResult.backupPath, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/admin/restore
  if (method === 'POST' && pathname === '/api/v1/admin/restore') {
    if (!checkRole(user.role, ROLE_GROUPS.SUPER_ADMINS_ONLY, res, requestId, 'Only Super Administrators (SAD) can restore store backup snapshots')) {
      return true;
    }
    try {
      const body = await parseJsonBody<{ backupPath: string }>(req);
      if (!body.backupPath) {
        sendErrorResponse(res, 400, 'BAD_REQUEST', 'Missing required parameter: backupPath', requestId);
        return true;
      }
      const restoreResult = fleetDataStore.restoreBackup(body.backupPath);
      if (!restoreResult.success) {
        sendErrorResponse(res, 400, 'RESTORE_FAILED', restoreResult.error ?? 'Failed to restore store backup snapshot.', requestId);
        return true;
      }
      logger.info('System store restored from backup snapshot by Super Admin', { backupPath: body.backupPath });
      sendJsonResponse(res, 200, { success: true, restoredCounts: restoreResult.restoredCounts, request_id: requestId }, requestId);
      return true;
    } catch (err) {
      sendErrorResponse(res, 500, 'INTERNAL_ERROR', (err as Error).message, requestId);
      return true;
    }
  }

  return false;
}

// ============================================================================
// Master Fleet API Route Dispatcher
// ============================================================================

/**
 * Dispatches fleet, snapshot, and management API requests
 */
export async function handleFleetApiRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  requestId: string,
): Promise<boolean> {
  const pathname = url.pathname;
  const method = req.method?.toUpperCase() ?? 'GET';

  // Resolve user identity: support per-request role header (for testing and isolated session requests)
  let user = fleetDataStore.getCurrentUser();
  const headerRole = req.headers['x-user-role'] || req.headers['x-vjit-role'];
  if (typeof headerRole === 'string' && ['STU', 'FAC', 'COR', 'TEC', 'SAD', 'MGT', 'SEC'].includes(headerRole.toUpperCase())) {
    const role = headerRole.toUpperCase() as UserRole;
    user = {
      ...user,
      role,
      email: role === 'SAD' ? 'admin@vjit.ac.in' : role === 'STU' ? 'student@vjit.ac.in' : role === 'FAC' ? 'faculty@vjit.ac.in' : user.email,
    };
  }

  // 1. Snapshot endpoints
  if (await handleSnapshotEndpoints(req, res, pathname, method, requestId, url)) {
    return true;
  }

  // 2. Route endpoints
  if (await handleRouteEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // 3. Bus endpoints
  if (await handleBusEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // 4. Device endpoints
  if (await handleDeviceEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // 5. Alert endpoints
  if (await handleAlertEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // 6. User Profile & Role Switcher
  if (await handleAuthAndProfileEndpoints(req, res, pathname, method, requestId)) {
    return true;
  }

  // 7. Demo Simulation Engine
  if (await handleDemoEndpoints(req, res, pathname, method, requestId)) {
    return true;
  }

  // 8. Attendance & Boarding Logs
  if (await handleAttendanceEndpoints(req, res, pathname, method, requestId, user, url)) {
    return true;
  }

  // 9. Maintenance Tickets
  if (await handleMaintenanceEndpoints(req, res, pathname, method, requestId, user, url)) {
    return true;
  }

  // 10. Operational Settings
  if (await handleSettingsEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // 11. Audit Logs & Diagnostics
  if (await handleAuditAndDiagnosticsEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // 12. Backup & Restore
  if (await handleBackupAndRestoreEndpoints(req, res, pathname, method, requestId, user)) {
    return true;
  }

  // Unhandled by fleet routes
  return false;
}
