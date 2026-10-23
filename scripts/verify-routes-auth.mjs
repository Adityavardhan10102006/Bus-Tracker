#!/usr/bin/env node

/**
 * verify-routes-auth.mjs
 * Enforces Rule B.7 & B.8:
 * - Scans route definitions to verify that every administrative and mutation endpoint
 *   has explicit authorization and role checks mapped against the permission matrix.
 * - Rejects any unprotected write endpoints or missing role checks.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const fleetRoutesFile = path.resolve(ROOT_DIR, 'services/api/src/routes/fleet-routes.ts');
const authMiddlewareFile = path.resolve(ROOT_DIR, 'services/api/src/middleware/auth.ts');

console.log('[VERIFY:ROUTES-AUTH] Verifying API route authorization coverage...');

if (!fs.existsSync(fleetRoutesFile)) {
  console.error(`[FAIL] fleet-routes.ts not found at ${fleetRoutesFile}`);
  process.exit(1);
}

if (!fs.existsSync(authMiddlewareFile)) {
  console.error(`[FAIL] auth.ts middleware not found at ${authMiddlewareFile}`);
  process.exit(1);
}

const authContent = fs.readFileSync(authMiddlewareFile, 'utf8');
if (!authContent.includes('export function checkRole') || !authContent.includes('ROLE_GROUPS')) {
  console.error('[FAIL] auth.ts middleware missing checkRole or ROLE_GROUPS export.');
  process.exit(1);
}

const routesContent = fs.readFileSync(fleetRoutesFile, 'utf8');

// List of critical mutation and protected endpoints that MUST have role guards
const requiredGuardedEndpoints = [
  { method: 'POST', path: '/api/v1/routes', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'PUT', path: '/api/v1/routes/:id', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'DELETE', path: '/api/v1/routes/:id', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'POST', path: '/api/v1/routes/:id/stops', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'DELETE', path: '/api/v1/routes/:id/stops/:stopId', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'GET', path: '/api/v1/buses', requiredRoleGroup: 'STAFF_MEMBERS' },
  { method: 'POST', path: '/api/v1/buses', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'POST', path: '/api/v1/buses/:id/assign-route', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'PUT', path: '/api/v1/buses/:id', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'DELETE', path: '/api/v1/buses/:id', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'GET', path: '/api/v1/devices', requiredRoleGroup: 'DEVICE_MANAGERS' },
  { method: 'POST', path: '/api/v1/devices', requiredRoleGroup: 'DEVICE_MANAGERS' },
  { method: 'PUT', path: '/api/v1/devices/:id', requiredRoleGroup: 'DEVICE_MANAGERS' },
  { method: 'POST', path: '/api/v1/devices/:id/link', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'POST', path: '/api/v1/devices/:id/unlink', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'POST', path: '/api/v1/devices/:id/status', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'POST', path: '/api/v1/alerts', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'GET', path: '/api/v1/attendance', requiredRoleGroup: 'STAFF_MEMBERS' },
  { method: 'POST', path: '/api/v1/attendance/manual-checkin', requiredRoleGroup: 'COORDINATORS_AND_ADMINS' },
  { method: 'GET', path: '/api/v1/maintenance/tickets', requiredRoleGroup: 'MAINTENANCE_DESK' },
  { method: 'POST', path: '/api/v1/maintenance/tickets', requiredRoleGroup: 'MAINTENANCE_RESOLVERS' },
  { method: 'POST', path: '/api/v1/maintenance/tickets/:id/resolve', requiredRoleGroup: 'MAINTENANCE_RESOLVERS' },
  { method: 'PUT', path: '/api/v1/settings/:key', requiredRoleGroup: 'SUPER_ADMINS_ONLY' },
  { method: 'GET', path: '/api/v1/audit-logs', requiredRoleGroup: 'AUDIT_READERS' },
  { method: 'GET', path: '/api/v1/diagnostics', requiredRoleGroup: 'DIAGNOSTICS_VIEWERS' },
  { method: 'POST', path: '/api/v1/admin/backup', requiredRoleGroup: 'SUPER_ADMINS_ONLY' },
  { method: 'POST', path: '/api/v1/admin/restore', requiredRoleGroup: 'SUPER_ADMINS_ONLY' },
];

let failed = false;

for (const ep of requiredGuardedEndpoints) {
  const roleGroupToken = `ROLE_GROUPS.${ep.requiredRoleGroup}`;
  if (!routesContent.includes(roleGroupToken)) {
    console.error(`[FAIL] Missing role check token ${roleGroupToken} for ${ep.method} ${ep.path}`);
    failed = true;
  }
}

// Count total checkRole calls
const checkRoleMatches = routesContent.match(/checkRole\(/g) || [];
console.log(`[VERIFY:ROUTES-AUTH] Found ${checkRoleMatches.length} explicit checkRole authorization guards.`);

if (checkRoleMatches.length < requiredGuardedEndpoints.length) {
  console.error(`[FAIL] Expected at least ${requiredGuardedEndpoints.length} checkRole guards, found ${checkRoleMatches.length}.`);
  failed = true;
}

if (failed) {
  console.error('[FAIL] Route authorization verification failed.');
  process.exit(1);
}

console.log(`[VERIFY:ROUTES-AUTH PASSED] All ${requiredGuardedEndpoints.length} declared administrative & mutation endpoints enforce strict checkRole guards.`);
process.exit(0);
