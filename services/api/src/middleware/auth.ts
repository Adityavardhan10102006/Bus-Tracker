import type { ServerResponse } from 'node:http';
import type { UserRole } from '@vjit/contracts';
import { sendErrorResponse } from './security.js';

/**
 * Standard Role Groups per Specification Section 5 & Part E RBAC Matrix
 */
export const ROLE_GROUPS = {
  /** Coordinators and Super Admins (fleet mutations, routes, bus management) */
  COORDINATORS_AND_ADMINS: ['COR', 'SAD'] as const,
  /** Hardware & Technicians (device registry, repairs, diagnostics) */
  DEVICE_MANAGERS: ['COR', 'TEC', 'SAD'] as const,
  /** Super Admins only (system settings, backups, restorations) */
  SUPER_ADMINS_ONLY: ['SAD'] as const,
  /** Transport & Operations Staff (attendance, diagnostics) */
  STAFF_MEMBERS: ['COR', 'SAD', 'MGT', 'SEC', 'FAC'] as const,
  /** Maintenance Desk (tickets, work orders) */
  MAINTENANCE_DESK: ['COR', 'TEC', 'SAD', 'MGT'] as const,
  /** Maintenance Resolution (techs and managers) */
  MAINTENANCE_RESOLVERS: ['COR', 'TEC', 'SAD'] as const,
  /** Audit Log Readers */
  AUDIT_READERS: ['COR', 'SAD', 'MGT', 'SEC'] as const,
  /** Diagnostics & Telemetry Monitors */
  DIAGNOSTICS_VIEWERS: ['COR', 'TEC', 'SAD', 'MGT', 'SEC'] as const,
} as const;

/**
 * Validates that an active user has one of the allowed roles for an endpoint.
 * If unauthorized, immediately writes a 403 FORBIDDEN response matching Part I.3 error envelope.
 *
 * @returns true if authorized, false if 403 was sent
 */
export function checkRole(
  userRole: UserRole,
  allowedRoles: readonly UserRole[],
  res: ServerResponse,
  requestId: string,
  actionDescription?: string,
): boolean {
  if (allowedRoles.includes(userRole)) {
    return true;
  }

  const message = actionDescription
    ? `Role Unauthorized: ${actionDescription}.`
    : `Role Unauthorized: Insufficient permissions for role '${userRole}'. Allowed roles: ${allowedRoles.join(', ')}.`;

  sendErrorResponse(res, 403, 'FORBIDDEN', message, requestId, [
    { field: 'role', issue: `Role '${userRole}' unauthorized. Allowed: [${allowedRoles.join(', ')}]` },
  ]);
  return false;
}
