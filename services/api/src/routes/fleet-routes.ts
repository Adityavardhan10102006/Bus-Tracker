import type { IncomingMessage, ServerResponse } from 'node:http';
import { fleetDataStore } from '../store/fleet-data-store.js';
import { sendErrorResponse } from '../middleware/security.js';
import { logger } from '@vjit/logger';
import type { UserRole } from '@vjit/contracts';
import { validateRouteStops, calculateRouteGeometry } from '@vjit/domain';

/**
 * Parses JSON body from incoming request safely
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

function sendJsonResponse(res: ServerResponse, statusCode: number, data: unknown, requestId: string): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(data));
}

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

  // 1. GET /api/v1/snapshot: Active buses with coordinates & freshness
  if (method === 'GET' && pathname === '/api/v1/snapshot') {
    const routeId = url.searchParams.get('route_id') ?? undefined;
    const buses = fleetDataStore.getSnapshots(routeId);
    sendJsonResponse(res, 200, { buses, total: buses.length, request_id: requestId }, requestId);
    return true;
  }

  // 2. Routes endpoints
  if (method === 'GET' && pathname === '/api/v1/routes') {
    const routes = fleetDataStore.getRoutes();
    sendJsonResponse(res, 200, { routes, total: routes.length, request_id: requestId }, requestId);
    return true;
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

  // POST /api/v1/routes/preview-geometry: Preview road-following geometry without persisting
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

  // POST /api/v1/routes: Create new route with stops & geometry
  if (method === 'POST' && pathname === '/api/v1/routes') {
    const user = fleetDataStore.getCurrentUser();
    if (user.role !== 'COR' && user.role !== 'SAD') {
      sendErrorResponse(res, 403, 'FORBIDDEN', 'Role Unauthorized: Only Coordinators and Super Admins can create transit routes.', requestId);
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

  // PUT /api/v1/routes/:id: Update route with stops & geometry
  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/routes/') && !pathname.includes('/stops') && !pathname.includes('/preview-geometry')) {
    const user = fleetDataStore.getCurrentUser();
    if (user.role !== 'COR' && user.role !== 'SAD') {
      sendErrorResponse(res, 403, 'FORBIDDEN', 'Role Unauthorized: Only Coordinators and Super Admins can modify transit routes.', requestId);
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
    const user = fleetDataStore.getCurrentUser();
    if (user.role !== 'COR' && user.role !== 'SAD') {
      sendErrorResponse(res, 403, 'FORBIDDEN', 'Role Unauthorized: Only Coordinators and Super Admins can remove routes.', requestId);
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

  // 3. Buses endpoints
  if (method === 'GET' && pathname === '/api/v1/buses') {
    const buses = fleetDataStore.getBuses();
    sendJsonResponse(res, 200, { buses, total: buses.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/buses: Create bus
  if (method === 'POST' && pathname === '/api/v1/buses') {
    try {
      const body = await parseJsonBody<{
        bus_number: string;
        registration: string;
        seating_capacity: number;
        status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
        insurance_expiry: string;
        fitness_expiry: string;
        pollution_expiry: string;
        permit_expiry: string;
      }>(req);

      if (!body.bus_number || !body.registration || !body.seating_capacity) {
        sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'Bus number, registration, and seating capacity are required.', requestId);
        return true;
      }

      const newBus = fleetDataStore.createBus(body);
      logger.info('Bus created by administrator', { busId: newBus.id, busNumber: newBus.bus_number });
      sendJsonResponse(res, 201, { success: true, bus: newBus, request_id: requestId }, requestId);
      return true;
    } catch (e) {
      sendErrorResponse(res, 400, 'BAD_REQUEST', (e as Error).message, requestId);
      return true;
    }
  }

  // PUT /api/v1/buses/:id: Update bus
  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/buses/')) {
    const busId = pathname.replace('/api/v1/buses/', '');
    try {
      const body = await parseJsonBody<Record<string, unknown>>(req);
      const updated = fleetDataStore.updateBus(busId, body);
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

  // 4. GPS Tracker Devices & Linking
  if (method === 'GET' && pathname === '/api/v1/devices') {
    const devices = fleetDataStore.getDevices();
    const links = fleetDataStore.getLinks();
    sendJsonResponse(res, 200, { devices, links, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/devices/:id/link: Link device to bus
  if (method === 'POST' && pathname.includes('/api/v1/devices/') && pathname.endsWith('/link')) {
    const parts = pathname.split('/');
    const deviceId = parts[4] ?? '';
    const user = fleetDataStore.getCurrentUser();

    // Security Check: Rule E.6 - Technicians cannot link devices!
    if (user.role === 'TEC') {
      sendErrorResponse(
        res,
        403,
        'FORBIDDEN',
        'Role Unauthorized: Fleet Technicians are restricted from associating devices to buses (Rule E.6: Coordinator or Super Admin only).',
        requestId,
      );
      return true;
    }

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

  // POST /api/v1/devices/:id/unlink: Unlink device from bus
  if (method === 'POST' && pathname.includes('/api/v1/devices/') && pathname.endsWith('/unlink')) {
    const parts = pathname.split('/');
    const deviceId = parts[4] ?? '';
    const user = fleetDataStore.getCurrentUser();

    // Security Check: Rule E.6 - Technicians cannot modify device links!
    if (user.role === 'TEC' || user.role === 'MGT' || user.role === 'SEC') {
      sendErrorResponse(
        res,
        403,
        'FORBIDDEN',
        'Role Unauthorized: Fleet Technicians and read-only roles cannot modify device associations (Rule E.6: Coordinator or Super Admin only).',
        requestId,
      );
      return true;
    }

    const result = fleetDataStore.unlinkDevice(deviceId, user.email);
    if (!result.success) {
      sendErrorResponse(res, 400, 'UNLINK_ERROR', result.error ?? 'Unlinking failed.', requestId);
      return true;
    }
    logger.info('Device unlinked from bus successfully', { deviceId, unlinkedBy: user.email });
    sendJsonResponse(res, 200, { success: true, message: `Device ${deviceId} unlinked from bus.`, request_id: requestId }, requestId);
    return true;
  }

  // PATCH/POST /api/v1/devices/:id/status: Update device provisioning/revocation status
  if ((method === 'PATCH' || method === 'POST') && pathname.includes('/api/v1/devices/') && pathname.endsWith('/status')) {
    const parts = pathname.split('/');
    const deviceId = parts[4] ?? '';
    const user = fleetDataStore.getCurrentUser();

    // Security Check: Rule E.6 - Technicians and read-only roles cannot change device lifecycle status
    if (user.role !== 'COR' && user.role !== 'SAD') {
      sendErrorResponse(
        res,
        403,
        'FORBIDDEN',
        'Role Unauthorized: Only Transport Coordinators (COR) and Super Admins (SAD) can change device lifecycle status.',
        requestId,
      );
      return true;
    }

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

  // 5. Service Alerts
  if (method === 'GET' && pathname === '/api/v1/alerts') {
    const alerts = fleetDataStore.getAlerts();
    sendJsonResponse(res, 200, { alerts, total: alerts.length, request_id: requestId }, requestId);
    return true;
  }

  // POST /api/v1/alerts: Create alert
  if (method === 'POST' && pathname === '/api/v1/alerts') {
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

  // 6. User Profile & Role Switcher
  if (method === 'GET' && pathname === '/api/v1/me') {
    const user = fleetDataStore.getCurrentUser();
    sendJsonResponse(res, 200, { user, request_id: requestId }, requestId);
    return true;
  }

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

  // 7. Demo Simulation Engine
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

  // 8. Attendance & Boarding Logs (Spec 18 & ADM-08)
  if (method === 'GET' && pathname === '/api/v1/attendance') {
    const tripType = url.searchParams.get('trip_type') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const search = url.searchParams.get('q') ?? undefined;
    const records = fleetDataStore.getAttendance({ tripType, status, search });
    sendJsonResponse(res, 200, { records, total: records.length, request_id: requestId }, requestId);
    return true;
  }

  if (method === 'POST' && pathname === '/api/v1/attendance/manual-checkin') {
    const user = fleetDataStore.getCurrentUser();
    if (user.role !== 'COR' && user.role !== 'SAD') {
      sendErrorResponse(res, 403, 'FORBIDDEN', 'Only Coordinators and Super Admins can manually record late boarding.', requestId);
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

  // 9. Maintenance & Repair Ticket Board (Spec 16.4, 16.5 & ADM-05)
  if (method === 'GET' && pathname === '/api/v1/maintenance/tickets') {
    const entityType = url.searchParams.get('entity_type') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const tickets = fleetDataStore.getMaintenanceTickets({ entityType, status });
    sendJsonResponse(res, 200, { tickets, total: tickets.length, request_id: requestId }, requestId);
    return true;
  }

  if (method === 'POST' && pathname === '/api/v1/maintenance/tickets') {
    const user = fleetDataStore.getCurrentUser();
    if (user.role !== 'COR' && user.role !== 'TEC' && user.role !== 'SAD') {
      sendErrorResponse(res, 403, 'FORBIDDEN', 'Insufficient permissions to create maintenance tickets.', requestId);
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

  if (method === 'POST' && pathname.includes('/api/v1/maintenance/tickets/') && pathname.endsWith('/resolve')) {
    const parts = pathname.split('/');
    const ticketId = parts[5] ?? '';
    const user = fleetDataStore.getCurrentUser();
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

  // 10. Operational Settings (Spec Section 35 & ADM-12)
  if (method === 'GET' && pathname === '/api/v1/settings') {
    const settings = fleetDataStore.getSystemSettings();
    sendJsonResponse(res, 200, { settings, total: settings.length, request_id: requestId }, requestId);
    return true;
  }

  if ((method === 'PUT' || method === 'PATCH') && pathname.startsWith('/api/v1/settings/')) {
    const key = pathname.replace('/api/v1/settings/', '');
    const user = fleetDataStore.getCurrentUser();

    // Security check: Only Super Admin (SAD) can update system settings per Spec 16.3 & Rule B.6
    if (user.role !== 'SAD') {
      sendErrorResponse(
        res,
        403,
        'FORBIDDEN',
        'Role Unauthorized: Only Super Administrators (SAD) can modify operational settings (Spec 16.3 & Rule B.6).',
        requestId,
      );
      return true;
    }

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

  // 11. Immutable Audit Trail (Spec Section 31 & ADM-14)
  if (method === 'GET' && pathname === '/api/v1/audit-logs') {
    const logs = fleetDataStore.getAuditLogs();
    sendJsonResponse(res, 200, { logs, total: logs.length, request_id: requestId }, requestId);
    return true;
  }

  // Unhandled by fleet routes
  return false;
}
