import type { UserRole } from '@vjit/contracts';

export type MobileTab = 'MAP' | 'ROUTES' | 'ALERTS' | 'PROFILE';

export interface MobileNavigationTabItem {
  id: MobileTab;
  title: string;
  icon: string;
  routePath: string;
  accessibilityLabel: string;
  allowedRoles: UserRole[];
}

/**
 * Mobile Bottom Navigation Items
 * Conforms to UI-SPEC-1.0 Section 3.3 and Governing Plan Part C (Phase P2)
 * Prohibits any driver navigation or shift management tabs
 */
export const MOBILE_NAVIGATION_TABS: MobileNavigationTabItem[] = [
  {
    id: 'MAP',
    title: 'Live Map',
    icon: 'map-pin',
    routePath: '/map',
    accessibilityLabel: 'Live Map tab: view active buses and real-time locations',
    allowedRoles: ['STU', 'FAC'],
  },
  {
    id: 'ROUTES',
    title: 'Routes',
    icon: 'git-branch',
    routePath: '/routes',
    accessibilityLabel: 'Routes and stops tab: browse schedules and upcoming stops',
    allowedRoles: ['STU', 'FAC'],
  },
  {
    id: 'ALERTS',
    title: 'Alerts',
    icon: 'bell',
    routePath: '/alerts',
    accessibilityLabel: 'Service alerts tab: view campus transportation notices',
    allowedRoles: ['STU', 'FAC'],
  },
  {
    id: 'PROFILE',
    title: 'Profile',
    icon: 'user',
    routePath: '/profile',
    accessibilityLabel: 'Profile and settings tab: attendance history, leave, and personal privacy',
    allowedRoles: ['STU', 'FAC'],
  },
];

/**
 * Helper to ensure non-driver scope
 */
export function validateStudentFacultyNavigation(tabs: MobileNavigationTabItem[]): boolean {
  return tabs.every(tab => {
    // Assert strictly STU and FAC roles only
    return tab.allowedRoles.every(r => r === 'STU' || r === 'FAC') && !tab.id.toLowerCase().includes('driver');
  });
}
