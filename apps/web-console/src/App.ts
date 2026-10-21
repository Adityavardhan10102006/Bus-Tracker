import type { UserRole } from '@vjit/contracts';
import {
  type AdminPageId,
  getAuthorizedAdminPages,
  canAccessAdminPage,
} from './auth/authorization.js';
import { VJIT_COLORS } from '@vjit/ui';

export interface WebConsoleAppState {
  activePageId: AdminPageId;
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  isSidebarCollapsed: boolean;
  activeNotificationCount: number;
}

export class WebConsoleCoordinator {
  private state: WebConsoleAppState;

  constructor(initialRole: UserRole = 'COR') {
    this.state = {
      activePageId: 'FLEET_DECK',
      currentUser: {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'transport@vjit.ac.in',
        name: 'Transport Coordinator',
        role: initialRole,
      },
      isSidebarCollapsed: false,
      activeNotificationCount: 0,
    };
  }

  getState(): WebConsoleAppState {
    return { ...this.state };
  }

  setRole(role: UserRole): void {
    this.state.currentUser.role = role;
    // If current page is unauthorized for new role, default to first authorized page
    if (!canAccessAdminPage(role, this.state.activePageId)) {
      const authorized = getAuthorizedAdminPages(role);
      this.state.activePageId = authorized[0]?.id ?? 'FLEET_DECK';
    }
  }

  navigateTo(pageId: AdminPageId): { allowed: boolean; pageId: AdminPageId } {
    if (!canAccessAdminPage(this.state.currentUser.role, pageId)) {
      return { allowed: false, pageId: this.state.activePageId };
    }
    this.state.activePageId = pageId;
    return { allowed: true, pageId };
  }

  toggleSidebar(): void {
    this.state.isSidebarCollapsed = !this.state.isSidebarCollapsed;
  }

  /**
   * Generates header view properties preserving VJIT brand tokens
   */
  getHeaderProps() {
    return {
      title: 'VJIT FLEET OPERATIONS DESK',
      subtitle: 'Vidya Jyothi Institute of Technology',
      user: this.state.currentUser,
      logoDimensions: {
        width: 45,
        height: 36,
        aspectRatio: 241 / 194, // exact 1.242:1
      },
      branding: {
        headerBackground: VJIT_COLORS.brandNavy,
        headerTextColor: VJIT_COLORS.canvasWhite,
        accentRed: VJIT_COLORS.brandRed,
      },
    };
  }

  /**
   * Generates sidebar navigation items strictly filtered by role
   * Enforces Specification Section 5 & Part E.4
   */
  getSidebarNavigation() {
    const authorized = getAuthorizedAdminPages(this.state.currentUser.role);
    return authorized.map(page => ({
      ...page,
      isActive: page.id === this.state.activePageId,
    }));
  }
}
