import type { UserRole } from '@vjit/contracts';

export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  allowedRoles: UserRole[];
  surface: 'MOBILE' | 'WEB_CONSOLE';
}

export const ALL_NAVIGATION_ITEMS: NavigationItem[] = [
  // Surface 1: Mobile (Student & Faculty)
  {
    id: 'mob-map',
    title: 'Live Map',
    path: '/map',
    icon: 'map-pin',
    allowedRoles: ['STU', 'FAC'],
    surface: 'MOBILE',
  },
  {
    id: 'mob-routes',
    title: 'Routes & Stops',
    path: '/routes',
    icon: 'git-branch',
    allowedRoles: ['STU', 'FAC'],
    surface: 'MOBILE',
  },
  {
    id: 'mob-alerts',
    title: 'Alerts',
    path: '/alerts',
    icon: 'bell',
    allowedRoles: ['STU', 'FAC'],
    surface: 'MOBILE',
  },
  {
    id: 'mob-profile',
    title: 'Profile',
    path: '/profile',
    icon: 'user',
    allowedRoles: ['STU', 'FAC'],
    surface: 'MOBILE',
  },

  // Surface 2: Web Console (Transport Staff)
  {
    id: 'adm-fleet',
    title: 'Fleet Operations',
    path: '/console/fleet',
    icon: 'layout-dashboard',
    allowedRoles: ['COR', 'TEC', 'SAD', 'MGT', 'SEC'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-map',
    title: 'Live Fleet Map',
    path: '/console/map',
    icon: 'map',
    allowedRoles: ['COR', 'TEC', 'SAD', 'MGT', 'SEC'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-routes',
    title: 'Routes & Stops',
    path: '/console/routes',
    icon: 'route',
    allowedRoles: ['COR', 'SAD'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-dispatch',
    title: 'Dispatch & Timetables',
    path: '/console/dispatch',
    icon: 'calendar',
    allowedRoles: ['COR', 'SAD'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-devices',
    title: 'Tracker Health',
    path: '/console/devices',
    icon: 'cpu',
    allowedRoles: ['TEC', 'SAD', 'COR'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-maintenance',
    title: 'Maintenance Board',
    path: '/console/maintenance',
    icon: 'wrench',
    allowedRoles: ['TEC', 'COR', 'SAD'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-attendance',
    title: 'Passenger Attendance',
    path: '/console/attendance',
    icon: 'clipboard-check',
    allowedRoles: ['COR', 'SAD', 'MGT'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-audit',
    title: 'Security Audit Log',
    path: '/console/audit',
    icon: 'shield-check',
    allowedRoles: ['SAD', 'COR'],
    surface: 'WEB_CONSOLE',
  },
  {
    id: 'adm-settings',
    title: 'System Settings',
    path: '/console/settings',
    icon: 'settings',
    allowedRoles: ['SAD'],
    surface: 'WEB_CONSOLE',
  },
];

/**
 * Returns allowed navigation items for a given role and surface
 * Enforces Specification Section 5 & Part E.4
 */
export function getNavigationForRole(
  role: UserRole,
  surface: 'MOBILE' | 'WEB_CONSOLE',
): NavigationItem[] {
  return ALL_NAVIGATION_ITEMS.filter(
    item => item.surface === surface && item.allowedRoles.includes(role),
  );
}
