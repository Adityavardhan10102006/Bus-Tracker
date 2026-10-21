import type { ServiceAlert } from '@vjit/contracts';

export type AlertCategoryFilter = 'ALL' | 'SAFETY' | 'DELAY' | 'SCHEDULE' | 'SYSTEM';

export interface AlertsScreenState {
  alerts: ServiceAlert[];
  activeCategory: AlertCategoryFilter;
  filterUnreadOnly: boolean;
  isLoading: boolean;
  errorMessage?: string | undefined;
}

export interface AlertsScreenViewModel {
  activeCategory: AlertCategoryFilter;
  alerts: Array<{
    alert: ServiceAlert;
    isSafety: boolean;
    formattedTime: string;
    badgeColor: string;
    badgeBackground: string;
  }>;
  safetyLockedNotice: string;
  emptyMessage?: string | undefined;
}

/**
 * Pure controller and view model builder for Service Alerts Screen
 * Implements Task P2-T8 and Rule R-11
 */
export function buildAlertsScreenViewModel(state: AlertsScreenState): AlertsScreenViewModel {
  let filtered = state.alerts;

  if (state.activeCategory !== 'ALL') {
    filtered = filtered.filter(a => a.category === state.activeCategory);
  }

  if (state.filterUnreadOnly) {
    filtered = filtered.filter(a => !a.read);
  }

  // Sort by priority and timestamp desc (SAFETY first)
  filtered.sort((a, b) => {
    if (a.category === 'SAFETY' && b.category !== 'SAFETY') return -1;
    if (b.category === 'SAFETY' && a.category !== 'SAFETY') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const alerts = filtered.map(alert => {
    let badgeColor = '#475569';
    let badgeBackground = '#F1F5F9';

    if (alert.category === 'SAFETY') {
      badgeColor = '#DC2626';
      badgeBackground = '#FEE2E2';
    } else if (alert.category === 'DELAY') {
      badgeColor = '#D97706';
      badgeBackground = '#FEF3C7';
    } else if (alert.category === 'SCHEDULE') {
      badgeColor = '#103754';
      badgeBackground = '#E0F2FE';
    }

    const date = new Date(alert.created_at);
    const formattedTime = Number.isNaN(date.getTime())
      ? alert.created_at
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      alert,
      isSafety: alert.category === 'SAFETY',
      formattedTime,
      badgeColor,
      badgeBackground,
    };
  });

  let emptyMessage: string | undefined;
  if (alerts.length === 0) {
    emptyMessage =
      state.activeCategory === 'ALL'
        ? 'No active service alerts at this time. Operations are running normally.'
        : `No ${state.activeCategory.toLowerCase()} alerts found.`;
  }

  return {
    activeCategory: state.activeCategory,
    alerts,
    safetyLockedNotice: 'Emergency & Safety alerts (Rule R-11) cannot be muted or suppressed.',
    emptyMessage,
  };
}
