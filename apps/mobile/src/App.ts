import type { BusSnapshot, RouteDetail, ServiceAlert, UserProfile } from '@vjit/contracts';
import { MOBILE_NAVIGATION_TABS, type MobileTab } from './navigation/types.js';
import { FavoritesManager } from './state/favorites.js';
import { MobileApiClient } from './services/api-client.js';
import { getPreservedLogoDimensions, VJIT_COLORS } from './theme/branding.js';
import { buildMapScreenViewModel, type MapScreenViewModel } from './screens/MapScreen.js';
import { buildRoutesScreenViewModel, type RoutesScreenViewModel } from './screens/RoutesScreen.js';
import { buildAlertsScreenViewModel, type AlertsScreenViewModel } from './screens/AlertsScreen.js';
import { buildProfileScreenViewModel, type ProfileScreenViewModel } from './screens/ProfileScreen.js';

export interface MobileAppState {
  currentTab: MobileTab;
  isOnline: boolean;
  isLoading: boolean;
  currentUser: UserProfile | null;
  buses: BusSnapshot[];
  routes: RouteDetail[];
  alerts: ServiceAlert[];
  selectedBusId: string | null;
  selectedRouteId: string | null;
  searchQuery: string;
  errorMessage?: string | undefined;
}

export class MobileAppCoordinator {
  private state: MobileAppState;
  private apiClient: MobileApiClient;
  private favorites: FavoritesManager;
  private pollingIntervalId?: ReturnType<typeof setInterval> | undefined;
  private readonly pollSeconds: number;

  constructor(apiBaseUrl: string, pollSeconds = 10) {
    this.pollSeconds = pollSeconds;
    this.apiClient = new MobileApiClient({ baseUrl: apiBaseUrl, staleAfterSeconds: 60 });
    this.favorites = new FavoritesManager();
    this.state = {
      currentTab: 'MAP',
      isOnline: true,
      isLoading: false,
      currentUser: null,
      buses: [],
      routes: [],
      alerts: [],
      selectedBusId: null,
      selectedRouteId: null,
      searchQuery: '',
    };
  }

  getState(): MobileAppState {
    return { ...this.state };
  }

  getFavorites(): FavoritesManager {
    return this.favorites;
  }

  getApiClient(): MobileApiClient {
    return this.apiClient;
  }

  setTab(tab: MobileTab): void {
    this.state.currentTab = tab;
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
  }

  selectBus(busId: string | null): void {
    this.state.selectedBusId = busId;
    if (busId) {
      const bus = this.state.buses.find(b => b.bus_id === busId);
      if (bus) {
        this.state.selectedRouteId = bus.route_id;
      }
    }
  }

  selectRoute(routeId: string | null): void {
    this.state.selectedRouteId = routeId;
  }

  setOnlineStatus(isOnline: boolean): void {
    this.state.isOnline = isOnline;
  }

  setUser(user: UserProfile | null): void {
    this.state.currentUser = user;
    if (user?.assigned_route_id) {
      this.state.selectedRouteId = user.assigned_route_id;
    }
  }

  /**
   * Initializes real telemetry polling
   */
  async startLivePolling(): Promise<void> {
    await this.refreshAllData();

    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }

    this.pollingIntervalId = setInterval(async () => {
      if (this.state.isOnline) {
        await this.refreshTelemetry();
      }
    }, this.pollSeconds * 1000);
  }

  stopLivePolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }
  }

  async refreshTelemetry(): Promise<void> {
    const routeId = this.state.selectedRouteId ?? undefined;
    const buses = await this.apiClient.fetchSnapshot(routeId);
    this.state.buses = buses;
  }

  async refreshAllData(): Promise<void> {
    this.state.isLoading = true;
    try {
      const [routes, alerts, profile] = await Promise.all([
        this.apiClient.fetchRoutes(),
        this.apiClient.fetchAlerts(),
        this.apiClient.fetchProfile(),
      ]);

      this.state.routes = routes;
      this.state.alerts = alerts;
      if (profile) {
        this.setUser(profile);
      }
      await this.refreshTelemetry();
    } catch (e) {
      this.state.errorMessage = (e as Error).message;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Builds the view model for the currently active tab
   */
  getActiveTabViewModel():
    | { tab: 'MAP'; data: MapScreenViewModel }
    | { tab: 'ROUTES'; data: RoutesScreenViewModel }
    | { tab: 'ALERTS'; data: AlertsScreenViewModel }
    | { tab: 'PROFILE'; data: ProfileScreenViewModel } {
    switch (this.state.currentTab) {
      case 'MAP': {
        const data = buildMapScreenViewModel(
          {
            buses: this.state.buses,
            selectedBusId: this.state.selectedBusId,
            selectedRouteId: this.state.selectedRouteId,
            routes: this.state.routes,
            searchQuery: this.state.searchQuery,
            activeFilter: 'ALL',
            bottomSheetSnap: this.state.selectedBusId ? 'HALF' : 'COLLAPSED',
            isRecenterTriggered: false,
            isLoading: this.state.isLoading,
            isOffline: !this.state.isOnline,
          },
          new Set(this.favorites.getFavoriteRoutes()),
          this.state.currentUser?.assigned_route_id ?? undefined,
        );
        return { tab: 'MAP', data };
      }
      case 'ROUTES': {
        const data = buildRoutesScreenViewModel({
          routes: this.state.routes,
          selectedRouteId: this.state.selectedRouteId,
          searchQuery: this.state.searchQuery,
          favoriteRouteIds: new Set(this.favorites.getFavoriteRoutes()),
          favoriteStopIds: new Set(this.favorites.getFavoriteStops()),
          designatedBoardingStopId: undefined,
          isStopRequestModalOpen: false,
          isLoading: this.state.isLoading,
        });
        return { tab: 'ROUTES', data };
      }
      case 'ALERTS': {
        const data = buildAlertsScreenViewModel({
          alerts: this.state.alerts,
          activeCategory: 'ALL',
          filterUnreadOnly: false,
          isLoading: this.state.isLoading,
        });
        return { tab: 'ALERTS', data };
      }
      case 'PROFILE': {
        const data = buildProfileScreenViewModel({
          profile: this.state.currentUser,
          attendanceHistory: [],
          leaveRecords: [],
          isEditingPhone: false,
          phoneInput: this.state.currentUser?.phone ?? '',
          isSubmittingLeave: false,
          isExportingData: false,
          activeSubSection: 'OVERVIEW',
          isLoading: this.state.isLoading,
        });
        return { tab: 'PROFILE', data };
      }
    }
  }

  /**
   * Header metadata with strictly preserved VJIT logo aspect ratio
   */
  getHeaderProps(logoTargetHeight = 36) {
    const logoDimensions = getPreservedLogoDimensions(logoTargetHeight);
    return {
      title: 'VJIT BUS TRACKER',
      subtitle: 'Vidya Jyothi Institute of Technology',
      logo: {
        path: 'assets/vjit-logo.png',
        ...logoDimensions,
      },
      userBadge: this.state.currentUser ? this.state.currentUser.role : 'GUEST',
      isOnline: this.state.isOnline,
      backgroundColor: VJIT_COLORS.brandNavy,
      textColor: VJIT_COLORS.canvasWhite,
    };
  }

  getNavigationTabs() {
    return MOBILE_NAVIGATION_TABS.map(tab => ({
      ...tab,
      isActive: tab.id === this.state.currentTab,
    }));
  }
}
