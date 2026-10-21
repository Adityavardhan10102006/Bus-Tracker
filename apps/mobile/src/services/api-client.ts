import type {
  BusSnapshot,
  RouteDetail,
  ServiceAlert,
  AttendanceRecord,
  LeaveRequestCreate,
  StopRequest,
  StopRequestCreate,
  UserProfile,
} from '@vjit/contracts';
import { getTrackingStatePresentation } from '@vjit/domain';

export interface MobileApiClientOptions {
  baseUrl: string;
  authToken?: string | undefined;
  staleAfterSeconds?: number | undefined;
}

export class MobileApiClient {
  private baseUrl: string;
  private authToken?: string | undefined;
  private staleAfterSeconds: number;

  constructor(options: MobileApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.authToken = options.authToken;
    this.staleAfterSeconds = options.staleAfterSeconds ?? 60;
  }

  setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Evaluates freshness and validates that positions older than 60s are never displayed as live
   */
  processBusFreshness(bus: BusSnapshot, nowUtc = new Date()): BusSnapshot {
    if (!bus.recorded_at) {
      return {
        ...bus,
        state: bus.state === 'NOT_RUNNING' ? 'NOT_RUNNING' : 'UNAVAILABLE',
        state_label: bus.state === 'NOT_RUNNING' ? bus.state_label : 'Location unavailable',
        age_seconds: null,
      };
    }

    const recordedTime = new Date(bus.recorded_at).getTime();
    const ageSeconds = Math.max(0, Math.floor((nowUtc.getTime() - recordedTime) / 1000));

    // Stale cutoff (Spec 17.6 & Rule 262): > 60s cannot be shown as live
    if (ageSeconds > this.staleAfterSeconds && (bus.state === 'LIVE_HW' || bus.state === 'LIVE_PHONE')) {
      const stateObj = getTrackingStatePresentation('STALE', ageSeconds);
      return {
        ...bus,
        state: 'STALE',
        state_label: stateObj.label,
        age_seconds: ageSeconds,
      };
    }

    return {
      ...bus,
      age_seconds: ageSeconds,
    };
  }

  /**
   * Fetch active bus snapshots for student/faculty route
   * Truthful real-time data: returns empty array if no buses are running
   */
  async fetchSnapshot(routeId?: string): Promise<BusSnapshot[]> {
    const url = new URL(`${this.baseUrl}/api/v1/snapshot`);
    if (routeId) {
      url.searchParams.set('route_id', routeId);
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Snapshot request failed with HTTP ${response.status}`);
      }

      const raw = (await response.json()) as { buses: BusSnapshot[] };
      const now = new Date();
      return (raw.buses || []).map(bus => this.processBusFreshness(bus, now));
    } catch {
      // In offline / network disconnect states, preserve safety by returning empty list
      return [];
    }
  }

  /**
   * Fetch routes directory
   */
  async fetchRoutes(): Promise<RouteDetail[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/routes`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as { routes: RouteDetail[] };
      return data.routes || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch route details by ID
   */
  async fetchRouteById(id: string): Promise<RouteDetail | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/routes/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      return (await response.json()) as RouteDetail;
    } catch {
      return null;
    }
  }

  /**
   * Fetch service alerts
   */
  async fetchAlerts(): Promise<ServiceAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/alerts`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as { alerts: ServiceAlert[] };
      return data.alerts || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch student's own attendance history
   */
  async fetchAttendanceHistory(): Promise<AttendanceRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/attendance/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as { records: AttendanceRecord[] };
      return data.records || [];
    } catch {
      return [];
    }
  }

  /**
   * Submit student leave request
   */
  async submitLeaveRequest(request: LeaveRequestCreate): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/leave`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        return { success: false, error: err.message || `Failed with status ${response.status}` };
      }
      const data = (await response.json()) as { id: string };
      return { success: true, id: data.id };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  /**
   * Submit proposed stop request (F-STP)
   */
  async submitStopRequest(request: StopRequestCreate): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stop-requests`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        return { success: false, error: err.message || `Failed with status ${response.status}` };
      }
      const data = (await response.json()) as { id: string };
      return { success: true, id: data.id };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  /**
   * Fetch active stop requests for route
   */
  async fetchStopRequests(routeId: string): Promise<StopRequest[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stop-requests?route_id=${encodeURIComponent(routeId)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as { requests: StopRequest[] };
      return data.requests || [];
    } catch {
      return [];
    }
  }

  /**
   * Vote on a stop request
   */
  async voteStopRequest(stopRequestId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stop-requests/${encodeURIComponent(stopRequestId)}/vote`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Change boarding stop (P2-T4)
   */
  async changeBoardingStop(studentRouteId: string, stopId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/student-routes/${encodeURIComponent(studentRouteId)}/boarding-stop`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ new_stop_id: stopId }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        return { success: false, error: err.message || `HTTP ${response.status}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  /**
   * Fetch user profile
   */
  async fetchProfile(): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      return (await response.json()) as UserProfile;
    } catch {
      return null;
    }
  }

  /**
   * Update phone number
   */
  async updatePhone(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/me`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        return { success: false, error: err.message || `HTTP ${response.status}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }
}
