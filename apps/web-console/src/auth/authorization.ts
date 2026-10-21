import type { UserRole } from '@vjit/contracts';

export type AdminPageId =
  | 'FLEET_DECK'
  | 'BUSES'
  | 'DEVICES'
  | 'LINKING'
  | 'ROUTES'
  | 'TIMETABLE'
  | 'ROSTERS'
  | 'ATTENDANCE'
  | 'MAINTENANCE'
  | 'HEALTH_RADAR'
  | 'FIRMWARE'
  | 'SETTINGS'
  | 'AUDIT_LOG'
  | 'REPORTS';

export interface AdminPageDefinition {
  id: AdminPageId;
  title: string;
  category: 'OPERATIONS' | 'FLEET' | 'MAINTENANCE' | 'COMPLIANCE' | 'SYSTEM';
  icon: string;
  allowedRoles: UserRole[];
  readOnlyRoles?: UserRole[] | undefined;
}

export const ADMIN_PAGES: AdminPageDefinition[] = [
  // Operations Deck
  {
    id: 'FLEET_DECK',
    title: 'Fleet Operations Deck',
    category: 'OPERATIONS',
    icon: 'layout-dashboard',
    allowedRoles: ['COR', 'TEC', 'SAD', 'MGT', 'SEC'],
    readOnlyRoles: ['MGT', 'SEC'],
  },
  {
    id: 'TIMETABLE',
    title: 'Timetable & Dispatch',
    category: 'OPERATIONS',
    icon: 'calendar',
    allowedRoles: ['COR', 'SAD'],
  },
  {
    id: 'ROSTERS',
    title: 'Driver Rosters (C-06)',
    category: 'OPERATIONS',
    icon: 'users',
    allowedRoles: ['COR', 'SAD'],
  },
  {
    id: 'ATTENDANCE',
    title: 'Passenger Attendance',
    category: 'OPERATIONS',
    icon: 'clipboard-check',
    allowedRoles: ['COR', 'SAD', 'MGT'],
    readOnlyRoles: ['MGT'],
  },

  // Fleet & Assets
  {
    id: 'BUSES',
    title: 'Bus Fleet & Compliance',
    category: 'FLEET',
    icon: 'truck',
    allowedRoles: ['COR', 'SAD'],
  },
  {
    id: 'DEVICES',
    title: 'GPS Tracker Devices',
    category: 'FLEET',
    icon: 'cpu',
    allowedRoles: ['TEC', 'SAD', 'COR'],
  },
  {
    id: 'LINKING',
    title: 'Device-to-Bus Linking',
    category: 'FLEET',
    icon: 'link-2',
    // Rule E.6: Coordinator and Super Admin exclusively. Technicians strictly blocked.
    allowedRoles: ['COR', 'SAD'],
  },
  {
    id: 'ROUTES',
    title: 'Routes & Stop Geofences',
    category: 'FLEET',
    icon: 'route',
    allowedRoles: ['COR', 'SAD'],
  },

  // Maintenance & Health
  {
    id: 'HEALTH_RADAR',
    title: 'Tracker Health Radar',
    category: 'MAINTENANCE',
    icon: 'activity',
    allowedRoles: ['TEC', 'COR', 'SAD'],
  },
  {
    id: 'MAINTENANCE',
    title: 'Maintenance Board',
    category: 'MAINTENANCE',
    icon: 'wrench',
    allowedRoles: ['TEC', 'COR', 'SAD'],
  },
  {
    id: 'FIRMWARE',
    title: 'Staged Firmware Rollout',
    category: 'MAINTENANCE',
    icon: 'download-cloud',
    allowedRoles: ['TEC', 'SAD'],
  },

  // System & Compliance
  {
    id: 'REPORTS',
    title: 'Data Exporter & Reports',
    category: 'COMPLIANCE',
    icon: 'file-text',
    allowedRoles: ['COR', 'SAD', 'MGT'],
  },
  {
    id: 'SETTINGS',
    title: 'Operational Settings',
    category: 'SYSTEM',
    icon: 'settings',
    // Super Admin writes with reason; Coordinator reads
    allowedRoles: ['SAD', 'COR'],
    readOnlyRoles: ['COR'],
  },
  {
    id: 'AUDIT_LOG',
    title: 'Security Audit Explorer',
    category: 'SYSTEM',
    icon: 'shield-check',
    allowedRoles: ['SAD', 'COR'],
    readOnlyRoles: ['COR'],
  },
];

/**
 * Validates whether a given user role can access an admin page
 * Enforces Specification Section 5 & Part E.4
 */
export function canAccessAdminPage(role: UserRole, pageId: AdminPageId): boolean {
  const page = ADMIN_PAGES.find(p => p.id === pageId);
  if (!page) return false;
  return page.allowedRoles.includes(role);
}

/**
 * Returns whether access is strictly read-only for this role
 */
export function isReadOnlyForRole(role: UserRole, pageId: AdminPageId): boolean {
  const page = ADMIN_PAGES.find(p => p.id === pageId);
  if (!page || !page.readOnlyRoles) return false;
  return page.readOnlyRoles.includes(role);
}

/**
 * Returns visible pages for a given role (filtered navigation)
 */
export function getAuthorizedAdminPages(role: UserRole): AdminPageDefinition[] {
  return ADMIN_PAGES.filter(page => page.allowedRoles.includes(role));
}
