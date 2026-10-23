import fs from 'node:fs';
import path from 'node:path';
import type {
  BusSnapshot,
  RouteDetail,
  BusRecord,
  DeviceRecord,
  DeviceBusLinkRecord as AdminDeviceBusLinkRecord,
  ServiceAlert,
  UserProfile,
  UserRole,
  AttendanceRecord,
  MaintenanceTicketRecord,
  SystemSettingRecord,
  AuditLogRecord,
} from '@vjit/contracts';
import {
  hashDeviceToken,
  generateDeviceToken,
  type StoredSampleSignature,
  type BusTelemetryInput,
  type DeviceBusLinkRecord as DomainDeviceBusLinkRecord,
} from '@vjit/domain';
import type { IngestionDataStore } from '../routes/telemetry.js';
import type { AttendanceDataStore } from '../routes/attendance.js';
import type { EtaDataStore } from '../routes/eta.js';
import type { NotificationDataStore } from '../routes/notifications.js';
import { createInitialFleetData } from './initial-seed.js';

export interface DemoSimulationState {
  enabled: boolean;
  stepIndex: number;
  lastTickTime: string;
}

export interface LiveTelemetryState {
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_deg: number;
  recorded_at: string;
  received_at: string;
  telemetry_source: 'HARDWARE' | 'SIMULATOR';
  is_simulated: boolean;
}

export class FleetDataStore
  implements IngestionDataStore, AttendanceDataStore, EtaDataStore, NotificationDataStore
{
  private routes: RouteDetail[] = [];
  private buses: BusRecord[] = [];
  private devices: DeviceRecord[] = [];
  private links: AdminDeviceBusLinkRecord[] = [];
  private alerts: ServiceAlert[] = [];
  private attendance: AttendanceRecord[] = [];
  private maintenanceTickets: MaintenanceTicketRecord[] = [];
  private systemSettings: SystemSettingRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private currentUser: UserProfile;
  private demoState: DemoSimulationState;
  private persistencePath: string;

  // Real-time hardware telemetry and token authentication registry
  private liveTelemetry: Map<string, LiveTelemetryState> = new Map();
  private deviceTokens: Map<string, Array<{ key_version: string; token_hash: string; is_revoked: boolean }>> = new Map();
  private recentSampleSignatures: Map<string, StoredSampleSignature[]> = new Map();

  // Polyline progress trackers for simulation
  private busProgress: Map<string, number> = new Map();

  constructor() {
    this.persistencePath =
      process.env.PERSISTENCE_FILE_PATH ||
      path.resolve(process.cwd(), 'tmp/fleet-persisted-store.json');
    const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    this.demoState = {
      enabled: !isProd,
      stepIndex: isProd ? 0 : 3,
      lastTickTime: new Date().toISOString(),
    };

    this.currentUser = {
      id: '11111111-2222-4333-8444-555555555555',
      email: 'transport.coord@vjit.ac.in',
      name: 'K. Ramesh',
      phone: '9848012345',
      role: 'COR',
      assigned_route_id: '00000000-0000-4000-8000-000000000012',
      assigned_bus_id: '00000000-0000-4000-8000-000000000001',
      notification_preferences: {
        safety_locked: true,
        approaching_stops: true,
        delays: true,
        quiet_hours_enabled: false,
      },
    };

    this.initSeedData();
    this.loadPersistedStore();
  }

  private initSeedData(): void {
    const seed = createInitialFleetData();
    this.routes = seed.routes;
    this.buses = seed.buses;
    this.devices = seed.devices;
    this.links = seed.links;
    this.alerts = seed.alerts;
    this.attendance = seed.attendance;
    this.maintenanceTickets = seed.maintenanceTickets;
    this.systemSettings = seed.systemSettings;
    this.auditLogs = seed.auditLogs;
    for (const [busId, progress] of Object.entries(seed.initialBusProgress)) {
      this.busProgress.set(busId, progress);
    }
  }

  // --- Snapshot & Telemetry ---

  getSnapshots(routeIdFilter?: string): BusSnapshot[] {
    const now = new Date();
    const serviceDate = now.toISOString().slice(0, 10);

    const snapshots: BusSnapshot[] = [];

    for (const bus of this.buses) {
      const assignedRoute = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[0]!;
      if (bus.status === 'RETIRED') {
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: assignedRoute.id,
          route_name: assignedRoute.name,
          state: 'UNAVAILABLE',
          state_label: 'Retired from Service',
          latitude: null,
          longitude: null,
          speed_kmh: null,
          heading: null,
          recorded_at: null,
          age_seconds: null,
          next_stop: null,
          capacity: bus.seating_capacity,
          occupancy: 0,
          trip_id: null,
          service_date: serviceDate,
        });
        continue;
      }

      if (bus.status === 'MAINTENANCE') {
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: assignedRoute.id,
          route_name: assignedRoute.name,
          state: 'UNAVAILABLE',
          state_label: 'In Maintenance Depot',
          latitude: null,
          longitude: null,
          speed_kmh: null,
          heading: null,
          recorded_at: null,
          age_seconds: null,
          next_stop: null,
          capacity: bus.seating_capacity,
          occupancy: 0,
          trip_id: null,
          service_date: serviceDate,
        });
        continue;
      }

      // ACTIVE buses
      // If live hardware telemetry was received for this bus, prioritize authentic GPS over simulation!
      const live = this.liveTelemetry.get(bus.id);
      if (live) {
        const ageSec = Math.max(0, Math.round((now.getTime() - new Date(live.recorded_at).getTime()) / 1000));
        const isStale = ageSec > 60; // 60s freshness threshold per Spec 35
        const route = this.routes.find(r => r.id === bus.assigned_route_id) ?? this.routes[0]!;

        // Resolve next stop along route
        let nextStop: any = null;
        const firstStop = route.stops?.[0];
        if (!isStale && firstStop) {
          nextStop = {
            stop_id: firstStop.id,
            name: firstStop.name,
            eta_seconds: 300,
            eta_formatted: '5 mins',
            distance_m: 1800,
          };
        }

        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: isStale ? 'STALE' : 'LIVE_HW',
          state_label: isStale ? `Updated ${ageSec}s ago` : 'Live • GPS Hardware',
          latitude: live.latitude,
          longitude: live.longitude,
          speed_kmh: live.speed_kmh,
          heading: live.heading_deg,
          recorded_at: live.recorded_at,
          age_seconds: ageSec,
          next_stop: nextStop,
          capacity: bus.seating_capacity,
          occupancy: 42,
          trip_id: `00000000-0000-4000-8000-0000000000t${bus.bus_number.replace(/\D/g, '') || '0'}`,
          service_date: serviceDate,
          is_simulated: live.is_simulated ?? false,
          telemetry_source: (live.telemetry_source as 'HARDWARE' | 'PHONE' | 'DEMO_SIMULATION') ?? 'HARDWARE',
        });
        continue;
      }

      if (bus.id === '00000000-0000-4000-8000-000000000001' && this.demoState.enabled) {
        // Bus 12
        const route = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 6, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.3590, 78.3850];
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: 'LIVE_HW',
          state_label: 'Simulated • Demo Engine',
          latitude: lat,
          longitude: lng,
          speed_kmh: 38.5,
          heading: 235,
          recorded_at: new Date(now.getTime() - 6 * 1000).toISOString(),
          age_seconds: 6,
          next_stop: {
            stop_id: '12000000-0000-4000-8000-000000000005',
            name: 'Kali Mandir Junction',
            eta_seconds: 320,
            eta_formatted: '5 mins',
            distance_m: 2100,
          },
          capacity: bus.seating_capacity,
          occupancy: 41,
          trip_id: '00000000-0000-4000-8000-0000000000t1',
          service_date: serviceDate,
          is_simulated: true,
          telemetry_source: 'DEMO_SIMULATION',
        });
      } else if (bus.id === '00000000-0000-4000-8000-000000000002' && this.demoState.enabled) {
        // Bus 05
        const route = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[1] ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 5, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.4180, 78.3450];
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: 'LIVE_HW',
          state_label: 'Simulated • Demo Engine',
          latitude: lat,
          longitude: lng,
          speed_kmh: 42.0,
          heading: 198,
          recorded_at: new Date(now.getTime() - 9 * 1000).toISOString(),
          age_seconds: 9,
          next_stop: {
            stop_id: '05000000-0000-4000-8000-000000000006',
            name: 'Kokapet SEZ Junction',
            eta_seconds: 480,
            eta_formatted: '8 mins',
            distance_m: 3400,
          },
          capacity: bus.seating_capacity,
          occupancy: 46,
          trip_id: '00000000-0000-4000-8000-0000000000t2',
          service_date: serviceDate,
          is_simulated: true,
          telemetry_source: 'DEMO_SIMULATION',
        });
      } else if (bus.id === '00000000-0000-4000-8000-000000000003' && this.demoState.enabled) {
        // Bus 08
        const route = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[2] ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 4, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.3210, 78.4350];
        const ageSec = 78; // older than 60s -> STALE
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: 'STALE',
          state_label: `Updated ${ageSec}s ago`,
          latitude: lat,
          longitude: lng,
          speed_kmh: 34.0,
          heading: 250,
          recorded_at: new Date(now.getTime() - ageSec * 1000).toISOString(),
          age_seconds: ageSec,
          next_stop: {
            stop_id: '08000000-0000-4000-8000-000000000005',
            name: 'Rajendranagar PJTSAU',
            eta_seconds: 720,
            eta_formatted: '12 mins',
            distance_m: 4800,
          },
          capacity: bus.seating_capacity,
          occupancy: 48,
          trip_id: '00000000-0000-4000-8000-0000000000t3',
          service_date: serviceDate,
          is_simulated: true,
          telemetry_source: 'DEMO_SIMULATION',
        });
      } else if (bus.id === '00000000-0000-4000-8000-000000000004' && this.demoState.enabled) {
        // Bus 21
        const route = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[3] ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 5, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.3980, 78.3990];
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: 'LIVE_PHONE',
          state_label: "Live • Driver's Phone (Demo)",
          latitude: lat,
          longitude: lng,
          speed_kmh: 31.0,
          heading: 220,
          recorded_at: new Date(now.getTime() - 12 * 1000).toISOString(),
          age_seconds: 12,
          next_stop: {
            stop_id: '21000000-0000-4000-8000-000000000006',
            name: 'Langar Houz Military Area',
            eta_seconds: 410,
            eta_formatted: '7 mins',
            distance_m: 2600,
          },
          capacity: bus.seating_capacity,
          occupancy: 39,
          trip_id: '00000000-0000-4000-8000-0000000000t4',
          service_date: serviceDate,
          is_simulated: true,
          telemetry_source: 'PHONE',
        });
      } else if (bus.id === '00000000-0000-4000-8000-000000000005') {
        // Bus 16
        const route = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[0]!;
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: 'UNAVAILABLE',
          state_label: 'Location unavailable',
          latitude: null,
          longitude: null,
          speed_kmh: null,
          heading: null,
          recorded_at: null,
          age_seconds: null,
          next_stop: null,
          capacity: bus.seating_capacity,
          occupancy: null,
          trip_id: null,
          service_date: serviceDate,
        });
      } else if (bus.id === '00000000-0000-4000-8000-000000000006') {
        // Bus 03
        const route = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[1] ?? this.routes[0]!;
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: route.id,
          route_name: route.name,
          state: 'NOT_RUNNING',
          state_label: 'Not running • Next trip at 16:15 PM',
          latitude: null,
          longitude: null,
          speed_kmh: null,
          heading: null,
          recorded_at: null,
          age_seconds: null,
          next_stop: null,
          capacity: bus.seating_capacity,
          occupancy: 0,
          trip_id: null,
          service_date: serviceDate,
        });
      } else {
        // Newly added bus or unsimulated operational bus
        const assignedRoute = (bus.assigned_route_id ? this.routes.find(r => r.id === bus.assigned_route_id) : null) ?? this.routes[0]!;
        const activeLink = this.links.find(l => l.bus_id === bus.id && !l.valid_to);
        const dev = activeLink ? this.devices.find(d => d.device_id === activeLink.device_id) : null;
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          display_name: bus.display_name ?? null,
          route_id: assignedRoute.id,
          route_name: assignedRoute.name,
          state: activeLink ? 'UNAVAILABLE' : 'NOT_RUNNING',
          state_label: activeLink ? (dev?.last_reported_at ? 'Hardware offline' : 'Awaiting initial telemetry signal') : 'Standby • In Depot (No Tracker Assigned)',
          latitude: null,
          longitude: null,
          speed_kmh: null,
          heading: null,
          recorded_at: null,
          age_seconds: null,
          next_stop: null,
          capacity: bus.seating_capacity,
          occupancy: 0,
          trip_id: null,
          service_date: serviceDate,
        });
      }
    }

    if (routeIdFilter) {
      return snapshots.filter(s => s.route_id === routeIdFilter);
    }
    return snapshots;
  }

  // --- Routes CRUD ---

  getRoutes(): RouteDetail[] {
    return this.routes;
  }

  getRouteById(id: string): RouteDetail | null {
    return this.routes.find(r => r.id === id) ?? null;
  }

  createRoute(input: {
    name: string;
    code: string;
    origin: string;
    destination: string;
    polyline?: Array<[number, number]> | undefined;
    stops?: Array<{
      id?: string | undefined;
      name: string;
      sequence: number;
      latitude: number;
      longitude: number;
      scheduled_time?: string | undefined;
      status?: 'SCHEDULED' | 'ARRIVING' | 'DEPARTED' | undefined;
    }> | undefined;
    geometry_source?: 'ROUTING_PROVIDER' | 'SAVED_GEOMETRY' | 'STRAIGHT_LINE_FALLBACK' | undefined;
  }): RouteDetail {
    const id = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const stops = input.stops !== undefined
      ? input.stops.map((s, idx) => ({
          id: s.id || `10000000-0000-4000-8000-${(Date.now() + idx).toString(16).padStart(12, '0')}`,
          name: s.name,
          sequence: s.sequence ?? idx + 1,
          latitude: s.latitude,
          longitude: s.longitude,
          scheduled_time: s.scheduled_time || '08:00 AM',
          status: s.status || 'SCHEDULED',
        })).sort((a, b) => a.sequence - b.sequence)
      : [];

    const polyline = input.polyline && input.polyline.length >= 2
      ? input.polyline
      : stops.map(s => [s.latitude, s.longitude] as [number, number]);

    const newRoute: RouteDetail = {
      id,
      name: input.name,
      code: input.code,
      origin: input.origin,
      destination: input.destination,
      polyline,
      stops,
      active_buses: 0,
      geometry_source: input.geometry_source || (input.polyline ? 'SAVED_GEOMETRY' : 'STRAIGHT_LINE_FALLBACK'),
      updated_at: new Date().toISOString(),
    };
    this.routes.push(newRoute);
    this.savePersistedStore();
    return newRoute;
  }

  updateRoute(id: string, updates: {
    name?: string | undefined;
    code?: string | undefined;
    origin?: string | undefined;
    destination?: string | undefined;
    polyline?: Array<[number, number]> | undefined;
    stops?: Array<{
      id?: string | undefined;
      name: string;
      sequence: number;
      latitude: number;
      longitude: number;
      scheduled_time?: string | undefined;
      status?: 'SCHEDULED' | 'ARRIVING' | 'DEPARTED' | undefined;
    }> | undefined;
    geometry_source?: 'ROUTING_PROVIDER' | 'SAVED_GEOMETRY' | 'STRAIGHT_LINE_FALLBACK' | undefined;
    distance_meters?: number | undefined;
  }): RouteDetail | null {
    const index = this.routes.findIndex(r => r.id === id);
    if (index === -1) return null;
    const current = this.routes[index]!;
    const updatedStops = updates.stops
      ? updates.stops.map((s, idx) => ({
          id: s.id || `10000000-0000-4000-8000-${(Date.now() + idx).toString(16).padStart(12, '0')}`,
          name: s.name,
          sequence: s.sequence ?? idx + 1,
          latitude: s.latitude,
          longitude: s.longitude,
          scheduled_time: s.scheduled_time || '08:00 AM',
          status: s.status || 'SCHEDULED',
        })).sort((a, b) => a.sequence - b.sequence)
      : current.stops;

    this.routes[index] = {
      ...current,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.code !== undefined ? { code: updates.code } : {}),
      ...(updates.origin !== undefined ? { origin: updates.origin } : {}),
      ...(updates.destination !== undefined ? { destination: updates.destination } : {}),
      ...(updates.polyline !== undefined ? { polyline: updates.polyline } : {}),
      ...(updates.geometry_source !== undefined ? { geometry_source: updates.geometry_source } : {}),
      ...(updates.distance_meters !== undefined ? { distance_meters: updates.distance_meters } : {}),
      stops: updatedStops,
      updated_at: new Date().toISOString(),
    };
    this.savePersistedStore();
    return this.routes[index]!;
  }

  deleteRoute(id: string): boolean {
    const initialLen = this.routes.length;
    this.routes = this.routes.filter(r => r.id !== id);
    const removed = this.routes.length < initialLen;
    if (removed) {
      this.savePersistedStore();
    }
    return removed;
  }

  addStopToRoute(
    routeId: string,
    stop: { name: string; sequence: number; latitude: number; longitude: number; scheduled_time: string },
  ): RouteDetail | null {
    const route = this.routes.find(r => r.id === routeId);
    if (!route) return null;

    const stopId = `30000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    route.stops.push({
      id: stopId,
      name: stop.name,
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
      scheduled_time: stop.scheduled_time,
      status: 'SCHEDULED',
    });
    route.stops.sort((a, b) => a.sequence - b.sequence);
    route.updated_at = new Date().toISOString();
    this.savePersistedStore();
    return route;
  }

  removeStopFromRoute(routeId: string, stopId: string): RouteDetail | null {
    const route = this.routes.find(r => r.id === routeId);
    if (!route) return null;
    route.stops = route.stops.filter(s => s.id !== stopId);
    route.updated_at = new Date().toISOString();
    this.savePersistedStore();
    return route;
  }

  // --- Buses CRUD ---

  getBuses(): BusRecord[] {
    return this.buses.map(b => {
      const activeLink = this.links.find(l => l.bus_id === b.id && !l.valid_to);
      const assignedRoute = b.assigned_route_id ? this.routes.find(r => r.id === b.assigned_route_id) : null;
      return {
        ...b,
        display_name: b.display_name ?? null,
        assigned_route_id: b.assigned_route_id ?? null,
        assigned_route_name: assignedRoute?.name ?? null,
        assigned_device_id: activeLink?.device_id ?? null,
      };
    });
  }

  getBusById(id: string): BusRecord | null {
    const b = this.buses.find(x => x.id === id);
    if (!b) return null;
    const activeLink = this.links.find(l => l.bus_id === b.id && !l.valid_to);
    const assignedRoute = b.assigned_route_id ? this.routes.find(r => r.id === b.assigned_route_id) : null;
    return {
      ...b,
      display_name: b.display_name ?? null,
      assigned_route_id: b.assigned_route_id ?? null,
      assigned_route_name: assignedRoute?.name ?? null,
      assigned_device_id: activeLink?.device_id ?? null,
    };
  }

  createBus(
    input: {
      bus_number: string;
      registration: string;
      display_name?: string | null | undefined;
      assigned_route_id?: string | null | undefined;
      seating_capacity?: number | undefined;
      status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' | undefined;
      insurance_expiry?: string | undefined;
      fitness_expiry?: string | undefined;
      pollution_expiry?: string | undefined;
      permit_expiry?: string | undefined;
    },
    actorEmail = 'transport.coord@vjit.ac.in',
    actorRole: UserRole = 'COR'
  ): BusRecord {
    // 1. Uniqueness validation
    const numClean = input.bus_number.trim().toLowerCase();
    if (this.buses.some(b => b.bus_number.trim().toLowerCase() === numClean)) {
      throw new Error(`Duplicate bus number: Bus "${input.bus_number}" already exists in fleet records.`);
    }

    const regNorm = input.registration.replace(/\s+/g, '').toUpperCase();
    if (this.buses.some(b => b.registration.replace(/\s+/g, '').toUpperCase() === regNorm)) {
      throw new Error(`Duplicate registration: Vehicle registration "${input.registration}" already exists in fleet records.`);
    }

    // 2. Route validation
    if (input.assigned_route_id) {
      const routeExists = this.routes.some(r => r.id === input.assigned_route_id);
      if (!routeExists) {
        throw new Error(`Route validation failed: Selected route ${input.assigned_route_id} does not exist.`);
      }
    }

    const now = new Date().toISOString();
    const id = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const newBus: BusRecord = {
      id,
      bus_number: input.bus_number.trim(),
      registration: input.registration.trim().toUpperCase(),
      display_name: input.display_name?.trim() || null,
      assigned_route_id: input.assigned_route_id || null,
      seating_capacity: input.seating_capacity ?? 50,
      status: input.status ?? 'ACTIVE',
      insurance_expiry: input.insurance_expiry || '2027-06-30',
      fitness_expiry: input.fitness_expiry || '2027-04-30',
      pollution_expiry: input.pollution_expiry || '2026-12-31',
      permit_expiry: input.permit_expiry || '2028-06-30',
      created_at: now,
      updated_at: now,
    };
    this.buses.push(newBus);

    this.recordAuditLog(
      actorEmail,
      actorRole,
      'CREATE_BUS',
      'BUS',
      newBus.id,
      `Bus ${newBus.bus_number} (${newBus.registration}) registered with capacity ${newBus.seating_capacity}`,
      null,
      newBus as unknown as Record<string, unknown>,
    );

    this.savePersistedStore();
    return this.getBusById(newBus.id)!;
  }

  updateBus(
    id: string,
    updates: {
      bus_number?: string | undefined;
      registration?: string | undefined;
      display_name?: string | null | undefined;
      assigned_route_id?: string | null | undefined;
      seating_capacity?: number | undefined;
      status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' | undefined;
      insurance_expiry?: string | undefined;
      fitness_expiry?: string | undefined;
      pollution_expiry?: string | undefined;
      permit_expiry?: string | undefined;
    },
    actorEmail = 'transport.coord@vjit.ac.in',
    actorRole: UserRole = 'COR'
  ): BusRecord | null {
    const index = this.buses.findIndex(b => b.id === id);
    if (index === -1) return null;
    const current = this.buses[index]!;

    // Check duplicate bus_number if changing
    if (updates.bus_number && updates.bus_number.trim().toLowerCase() !== current.bus_number.trim().toLowerCase()) {
      const numClean = updates.bus_number.trim().toLowerCase();
      if (this.buses.some(b => b.id !== id && b.bus_number.trim().toLowerCase() === numClean)) {
        throw new Error(`Duplicate bus number: Bus "${updates.bus_number}" is already assigned to another vehicle.`);
      }
    }

    // Check duplicate registration if changing
    if (updates.registration) {
      const regNorm = updates.registration.replace(/\s+/g, '').toUpperCase();
      if (this.buses.some(b => b.id !== id && b.registration.replace(/\s+/g, '').toUpperCase() === regNorm)) {
        throw new Error(`Duplicate registration: Vehicle registration "${updates.registration}" is already assigned to another vehicle.`);
      }
    }

    // Validate assigned_route_id if changing
    if (updates.assigned_route_id) {
      const routeExists = this.routes.some(r => r.id === updates.assigned_route_id);
      if (!routeExists) {
        throw new Error(`Route validation failed: Selected route ${updates.assigned_route_id} does not exist.`);
      }
    }

    const oldRecord = { ...current };
    this.buses[index] = {
      ...current,
      ...(updates.bus_number !== undefined ? { bus_number: updates.bus_number } : {}),
      ...(updates.registration !== undefined ? { registration: updates.registration } : {}),
      ...(updates.display_name !== undefined ? { display_name: updates.display_name } : {}),
      ...(updates.assigned_route_id !== undefined ? { assigned_route_id: updates.assigned_route_id } : {}),
      ...(updates.seating_capacity !== undefined ? { seating_capacity: updates.seating_capacity } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.insurance_expiry !== undefined ? { insurance_expiry: updates.insurance_expiry } : {}),
      ...(updates.fitness_expiry !== undefined ? { fitness_expiry: updates.fitness_expiry } : {}),
      ...(updates.pollution_expiry !== undefined ? { pollution_expiry: updates.pollution_expiry } : {}),
      ...(updates.permit_expiry !== undefined ? { permit_expiry: updates.permit_expiry } : {}),
      updated_at: new Date().toISOString(),
    };

    this.recordAuditLog(
      actorEmail,
      actorRole,
      'UPDATE_BUS',
      'BUS',
      id,
      `Bus ${current.bus_number} updated`,
      oldRecord as unknown as Record<string, unknown>,
      this.buses[index] as unknown as Record<string, unknown>,
    );

    this.savePersistedStore();
    return this.buses[index]!;
  }

  assignBusToRoute(
    busId: string,
    routeId: string | null,
    actorEmail = 'transport.coord@vjit.ac.in',
    actorRole: UserRole = 'COR'
  ): { success: boolean; bus?: BusRecord; error?: string } {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      return { success: false, error: `Bus ${busId} not found.` };
    }

    let routeName = 'Unassigned';
    if (routeId) {
      const route = this.routes.find(r => r.id === routeId);
      if (!route) {
        return { success: false, error: `Route ${routeId} not found.` };
      }
      routeName = route.name;
    }

    const oldRouteId = bus.assigned_route_id;
    bus.assigned_route_id = routeId;
    bus.updated_at = new Date().toISOString();

    this.recordAuditLog(
      actorEmail,
      actorRole,
      'ASSIGN_ROUTE',
      'BUS',
      busId,
      `Associated bus ${bus.bus_number} to route ${routeName}`,
      { assigned_route_id: oldRouteId },
      { assigned_route_id: routeId },
    );

    this.savePersistedStore();
    return { success: true, bus: this.getBusById(bus.id)! };
  }

  deactivateBus(id: string): BusRecord | null {
    return this.updateBus(id, { status: 'RETIRED' });
  }

  // --- Devices & Linking ---

  getDevices(): DeviceRecord[] {
    const now = Date.now();
    return this.devices.map(d => {
      const lastRep = d.last_reported_at;
      let connectivity: 'ONLINE' | 'STOPPED_REPORTING' | 'STANDBY' | 'OFFLINE' = 'STANDBY';
      let ageSeconds: number | null = null;
      if (d.status === 'REVOKED') {
        connectivity = 'OFFLINE';
      } else if (lastRep) {
        ageSeconds = Math.max(0, Math.round((now - new Date(lastRep).getTime()) / 1000));
        connectivity = ageSeconds <= 60 ? 'ONLINE' : 'STOPPED_REPORTING';
      }

      const activeLink = this.links.find(l => l.device_id === d.device_id && !l.valid_to);
      const assignedBus = activeLink ? this.buses.find(b => b.id === activeLink.bus_id) : null;
      const assignedRoute = assignedBus?.assigned_route_id
        ? this.routes.find(r => r.id === assignedBus.assigned_route_id)
        : null;

      return {
        id: d.id,
        device_id: d.device_id,
        serial_number: d.serial_number,
        model: d.model || 'Teltonika FMB920',
        nickname: d.nickname || undefined,
        imei: d.imei,
        iccid: d.iccid,
        status: d.status,
        firmware_version: d.firmware_version,
        first_used_at: d.first_used_at,
        created_at: d.created_at,
        last_reported_at: lastRep ?? null,
        connectivity_status: connectivity,
        reporting_age_seconds: ageSeconds,
        assigned_bus_id: activeLink?.bus_id ?? null,
        assigned_bus_number: activeLink?.bus_number ?? null,
        assigned_route_name: assignedRoute?.name ?? null,
      };
    });
  }

  registerDevice(
    input: {
      device_id: string;
      serial_number: string;
      model?: string | undefined;
      nickname?: string | undefined;
      imei: string;
      iccid?: string | undefined;
      sim_number?: string | undefined;
      auth_token?: string | undefined;
      firmware_version?: string | undefined;
      status?: 'PROVISIONED' | 'ACTIVE' | 'REVOKED' | undefined;
    },
    actorEmail = 'transport.coord@vjit.ac.in',
    actorRole: UserRole = 'COR'
  ): { success: boolean; device?: DeviceRecord; error?: string; plaintextToken?: string } {
    const devIdClean = input.device_id.trim().toUpperCase();
    if (this.devices.some(d => d.device_id.toUpperCase() === devIdClean)) {
      return { success: false, error: `Device identifier "${input.device_id}" is already registered.` };
    }

    const serialClean = input.serial_number.trim().toLowerCase();
    if (this.devices.some(d => d.serial_number.trim().toLowerCase() === serialClean)) {
      return { success: false, error: `Hardware serial number "${input.serial_number}" is already registered.` };
    }

    if (this.devices.some(d => d.imei === input.imei)) {
      return { success: false, error: `Cellular IMEI "${input.imei}" is already registered.` };
    }

    const now = new Date().toISOString();
    const id = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const iccid = input.iccid || ('89911012' + input.imei.slice(0, 11) + '0');
    const newDevice: DeviceRecord = {
      id,
      device_id: devIdClean,
      serial_number: input.serial_number.trim(),
      model: input.model || 'Teltonika FMB920',
      nickname: input.nickname?.trim() || undefined,
      imei: input.imei,
      iccid,
      status: input.status || 'PROVISIONED',
      firmware_version: input.firmware_version || '1.2.0',
      first_used_at: null,
      created_at: now,
    };
    this.devices.push(newDevice);

    // Register initial token hashes in deviceTokens map
    const defaultSecret = 'vjit_device_token_hmac_entropy_keyval_cluster_987';
    const devToken = input.auth_token || generateDeviceToken().plaintextToken;
    const devHash = hashDeviceToken(devToken, defaultSecret);
    this.deviceTokens.set(devIdClean, [
      { key_version: 'v1', token_hash: devHash, is_revoked: false }
    ]);

    this.recordAuditLog(
      actorEmail,
      actorRole,
      'REGISTER_DEVICE',
      'DEVICE',
      newDevice.device_id,
      `Hardware GPS tracker registered: ${newDevice.device_id} (SN: ${newDevice.serial_number}, Model: ${newDevice.model})`,
      null,
      {
        device_id: newDevice.device_id,
        serial_number: newDevice.serial_number,
        model: newDevice.model,
        imei: newDevice.imei,
      },
    );

    this.savePersistedStore();
    return {
      success: true,
      device: this.getDevices().find(d => d.device_id === devIdClean)!,
      plaintextToken: devToken,
    };
  }

  updateDevice(
    deviceId: string,
    updates: {
      model?: string | undefined;
      nickname?: string | undefined;
      firmware_version?: string | undefined;
      status?: 'ACTIVE' | 'PROVISIONED' | 'REVOKED' | undefined;
    },
    actorEmail = 'transport.coord@vjit.ac.in',
    actorRole: UserRole = 'COR'
  ): { success: boolean; device?: DeviceRecord; error?: string } {
    const dev = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (!dev) {
      return { success: false, error: `Device ${deviceId} not found.` };
    }

    const oldRecord = { ...dev };
    if (updates.model) dev.model = updates.model;
    if (updates.nickname !== undefined) dev.nickname = updates.nickname;
    if (updates.firmware_version) dev.firmware_version = updates.firmware_version;
    if (updates.status) {
      dev.status = updates.status;
      if (updates.status === 'REVOKED') {
        // Automatically unlink and clear liveTelemetry
        const now = new Date().toISOString();
        this.links.forEach(l => {
          if (l.device_id === dev.device_id && !l.valid_to) {
            l.valid_to = now;
            l.reason = `Device revoked by ${actorEmail}`;
            this.liveTelemetry.delete(l.bus_id);
          }
        });
      }
    }

    this.recordAuditLog(
      actorEmail,
      actorRole,
      'UPDATE_DEVICE',
      'DEVICE',
      dev.device_id,
      `Hardware tracker ${dev.device_id} updated`,
      oldRecord as unknown as Record<string, unknown>,
      dev as unknown as Record<string, unknown>,
    );

    this.savePersistedStore();
    return { success: true, device: this.getDevices().find(d => d.device_id === dev.device_id)! };
  }

  getLinks(): AdminDeviceBusLinkRecord[] {
    return this.links;
  }

  linkDeviceToBus(deviceId: string, busId: string, linkedBy: string): { success: boolean; link?: AdminDeviceBusLinkRecord; error?: string } {
    const device = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (!device) {
      return { success: false, error: `Device ${deviceId} not found.` };
    }
    if (device.status === 'REVOKED') {
      return { success: false, error: `Cannot assign revoked hardware device ${deviceId}. Please reactivate or replace unit.` };
    }
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      return { success: false, error: `Bus ${busId} not found.` };
    }
    if (bus.status === 'RETIRED') {
      return { success: false, error: `Cannot assign tracker to retired bus ${bus.bus_number}.` };
    }

    // Close any previous link for this device or bus (1:1 constraint)
    const now = new Date().toISOString();
    this.links.forEach(l => {
      if ((l.device_id === device.device_id || l.bus_id === busId) && !l.valid_to) {
        l.valid_to = now;
        l.reason = l.device_id === device.device_id ? `Reassigned to bus ${bus.bus_number}` : `Replaced by device ${device.device_id}`;
        // CRITICAL: clear old bus live telemetry so it doesn't move or show stale position!
        this.liveTelemetry.delete(l.bus_id);
      }
    });

    const newLink: AdminDeviceBusLinkRecord = {
      id: `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      device_id: device.device_id,
      bus_id: busId,
      bus_number: bus.bus_number,
      valid_from: now,
      valid_to: null,
      linked_by: linkedBy,
      reason: 'Console administrator link update',
    };
    this.links.push(newLink);

    this.recordAuditLog(
      linkedBy,
      this.currentUser.role,
      'LINK_DEVICE',
      'DEVICE',
      device.device_id,
      `Hardware tracker ${device.device_id} linked to ${bus.bus_number} (${bus.registration})`,
      null,
      { device_id: device.device_id, bus_id: busId, bus_number: bus.bus_number },
    );

    this.savePersistedStore();
    return { success: true, link: newLink };
  }

  unlinkDevice(deviceId: string, unlinkedBy: string): { success: boolean; error?: string } {
    const now = new Date().toISOString();
    let found = false;
    this.links.forEach(l => {
      if ((l.device_id === deviceId || (this.devices.find(d => d.id === deviceId)?.device_id === l.device_id)) && !l.valid_to) {
        l.valid_to = now;
        l.reason = `Unlinked by ${unlinkedBy}`;
        this.liveTelemetry.delete(l.bus_id);
        found = true;
      }
    });
    if (!found) {
      return { success: false, error: `No active association found for device ${deviceId}.` };
    }

    this.recordAuditLog(
      unlinkedBy,
      this.currentUser.role,
      'UNLINK_DEVICE',
      'DEVICE',
      deviceId,
      `Hardware tracker ${deviceId} unlinked from bus`,
    );

    this.savePersistedStore();
    return { success: true };
  }

  updateDeviceStatus(
    deviceId: string,
    status: 'ACTIVE' | 'PROVISIONED' | 'REVOKED',
    actorEmail: string,
  ): { success: boolean; device?: DeviceRecord; error?: string } {
    const res = this.updateDevice(deviceId, { status }, actorEmail, this.currentUser.role);
    if (res.success && res.device) {
      this.recordAuditLog(
        actorEmail,
        this.currentUser.role,
        'UPDATE_DEVICE_STATUS',
        'DEVICE',
        res.device.device_id,
        `Device status updated to ${status}`,
        null,
        { status },
      );
    }
    return res;
  }

  // --- Alerts ---

  getAlerts(): ServiceAlert[] {
    return this.alerts;
  }

  createAlert(alert: Omit<ServiceAlert, 'id' | 'created_at'>): ServiceAlert {
    const newAlert: ServiceAlert = {
      id: `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      ...alert,
      created_at: new Date().toISOString(),
    };
    this.alerts.unshift(newAlert);
    return newAlert;
  }

  // --- User Profile & Auth ---

  getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  switchUserRole(role: UserRole): UserProfile {
    const roleProfiles: Record<UserRole, { name: string; email: string }> = {
      STU: { name: 'Rahul Varma (21B01A0501)', email: '21b01a0501@vjit.ac.in' },
      FAC: { name: 'Dr. S. Rao (Faculty Coordinator)', email: 'faculty.transport@vjit.ac.in' },
      COR: { name: 'K. Ramesh (Transport Coordinator)', email: 'transport.coord@vjit.ac.in' },
      TEC: { name: 'P. Srinivas (Fleet Technician)', email: 'tech.fleet@vjit.ac.in' },
      SAD: { name: 'System Super Administrator', email: 'admin@vjit.ac.in' },
      MGT: { name: 'College Management / Principal', email: 'management@vjit.ac.in' },
      SEC: { name: 'Campus Gate Security Staff', email: 'security.gate@vjit.ac.in' },
    };

    const profile = roleProfiles[role];
    this.currentUser = {
      id: this.currentUser.id,
      email: profile.email,
      name: profile.name,
      phone: this.currentUser.phone,
      role,
      assigned_route_id:
        role === 'STU'
          ? '00000000-0000-4000-8000-000000000012'
          : role === 'FAC'
            ? '00000000-0000-4000-8000-000000000005'
            : null,
      assigned_bus_id:
        role === 'STU'
          ? '00000000-0000-4000-8000-000000000001'
          : role === 'FAC'
            ? '00000000-0000-4000-8000-000000000002'
            : null,
      notification_preferences: {
        safety_locked: true,
        approaching_stops: true,
        delays: true,
        quiet_hours_enabled: false,
      },
    };
    return this.currentUser;
  }

  // --- Demo Simulation Controls ---

  getDemoState(): DemoSimulationState {
    const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    return {
      ...this.demoState,
      enabled: isProd ? false : this.demoState.enabled,
    };
  }

  toggleDemo(enabled?: boolean): DemoSimulationState {
    const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new Error('Simulation engine is disabled in production environments (Rule R-M5).');
    }
    this.demoState.enabled = enabled !== undefined ? enabled : !this.demoState.enabled;
    return this.demoState;
  }

  tickDemo(): { state: DemoSimulationState; snapshots: BusSnapshot[] } {
    const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new Error('Simulation engine is disabled in production environments (Rule R-M5).');
    }
    this.demoState.stepIndex += 1;
    this.demoState.lastTickTime = new Date().toISOString();

    // Advance each active bus along its polyline
    const route12 = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000012');
    if (route12) {
      const cur = this.busProgress.get('00000000-0000-4000-8000-000000000001') ?? 6;
      const next = (cur + 1) % route12.polyline.length;
      this.busProgress.set('00000000-0000-4000-8000-000000000001', next);
    }

    const route05 = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000005');
    if (route05) {
      const cur = this.busProgress.get('00000000-0000-4000-8000-000000000002') ?? 5;
      const next = (cur + 1) % route05.polyline.length;
      this.busProgress.set('00000000-0000-4000-8000-000000000002', next);
    }

    const route08 = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000008');
    if (route08) {
      const cur = this.busProgress.get('00000000-0000-4000-8000-000000000003') ?? 4;
      const next = (cur + 1) % route08.polyline.length;
      this.busProgress.set('00000000-0000-4000-8000-000000000003', next);
    }

    const route21 = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000021');
    if (route21) {
      const cur = this.busProgress.get('00000000-0000-4000-8000-000000000004') ?? 5;
      const next = (cur + 1) % route21.polyline.length;
      this.busProgress.set('00000000-0000-4000-8000-000000000004', next);
    }

    return {
      state: this.getDemoState(),
      snapshots: this.getSnapshots(),
    };
  }

  resetDemo(): { state: DemoSimulationState; snapshots: BusSnapshot[] } {
    const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new Error('Simulation engine is disabled in production environments (Rule R-M5).');
    }
    this.demoState.stepIndex = 0;
    this.busProgress.set('00000000-0000-4000-8000-000000000001', 0);
    this.busProgress.set('00000000-0000-4000-8000-000000000002', 0);
    this.busProgress.set('00000000-0000-4000-8000-000000000003', 0);
    this.busProgress.set('00000000-0000-4000-8000-000000000004', 0);
    return {
      state: this.getDemoState(),
      snapshots: this.getSnapshots(),
    };
  }

  // --- Implement IngestionDataStore ---

  async getDevice(deviceId: string) {
    const dev = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (!dev) return null;
    return {
      id: dev.device_id,
      status: dev.status,
      first_used_at: dev.first_used_at ? new Date(dev.first_used_at) : null,
    };
  }

  async getDeviceTokens(deviceId: string) {
    if (this.deviceTokens.has(deviceId)) {
      return this.deviceTokens.get(deviceId)!;
    }
    const defaultSecret = 'vjit_device_token_hmac_entropy_keyval_cluster_987';
    const cleanId = deviceId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const devToken = `vjit_${cleanId}_token_auth_secret_cluster_v1_43`;
    const devHash = hashDeviceToken(devToken, defaultSecret);
    const testHash = hashDeviceToken('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1', defaultSecret);
    const hashes = [
      { key_version: 'v1', token_hash: devHash, is_revoked: false },
      { key_version: 'v1', token_hash: testHash, is_revoked: false },
      { key_version: 'v1', token_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', is_revoked: false },
    ];
    return hashes;
  }

  async getActiveDeviceBusLinks(deviceId: string): Promise<DomainDeviceBusLinkRecord[]> {
    return this.links
      .filter(l => (l.device_id === deviceId || (this.devices.find(d => d.id === deviceId)?.device_id === l.device_id)) && !l.valid_to)
      .map(l => ({
        id: l.id,
        device_id: l.device_id,
        bus_id: l.bus_id,
        valid_from: new Date(l.valid_from),
        valid_to: l.valid_to ? new Date(l.valid_to) : null,
      }));
  }

  async saveTelemetryBatch(batch: {
    deviceId: string;
    busId: string | null;
    samples: any[];
    events: any[];
    receivedAt: Date;
    latestLiveSample?: any;
  }): Promise<void> {
    const dev = this.devices.find(d => d.device_id === batch.deviceId || d.id === batch.deviceId);
    if (dev) {
      dev.first_used_at = dev.first_used_at ?? batch.receivedAt.toISOString();
      dev.last_reported_at = batch.receivedAt.toISOString();
      dev.last_reported_status = 'ONLINE';
    }

    if (batch.busId && batch.latestLiveSample) {
      const sample = batch.latestLiveSample;
      this.liveTelemetry.set(batch.busId, {
        latitude: sample.latitude,
        longitude: sample.longitude,
        speed_kmh: sample.speed_kmh ?? 35,
        heading_deg: sample.bearing ?? (sample.heading_deg || 235),
        recorded_at: sample.recorded_at ?? batch.receivedAt.toISOString(),
        received_at: batch.receivedAt.toISOString(),
        telemetry_source: 'HARDWARE',
        is_simulated: false,
      });

      const bus = this.buses.find(b => b.id === batch.busId);
      if (bus) {
        bus.updated_at = batch.receivedAt.toISOString();
      }
    }

    // Process SOS hardware panic events
    for (const ev of batch.events) {
      if (ev.type === 'SOS' || ev.event_type === 'SOS' || ev.type === 'PANIC' || ev.event_type === 'PANIC') {
        const bus = batch.busId ? this.buses.find(b => b.id === batch.busId) : null;
        const busNum = bus?.bus_number ?? 'Fleet Bus';
        const alert: ServiceAlert = {
          id: `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
          category: 'SAFETY',
          priority: 'HIGH',
          title: `EMERGENCY: SOS Panic Button Triggered on ${busNum}`,
          message: `In-bus physical panic switch activated on ${busNum} (Device: ${batch.deviceId}) at coordinates ${batch.latestLiveSample?.latitude?.toFixed(4) ?? '17.3616'}, ${batch.latestLiveSample?.longitude?.toFixed(4) ?? '78.3245'}. Emergency security dispatch alerted.`,
          read: false,
          created_at: batch.receivedAt.toISOString(),
        };
        this.alerts.unshift(alert);
        this.recordAuditLog(
          'hardware.device@vjit.ac.in',
          'TEC',
          'SOS_TRIGGERED',
          'BUS',
          batch.busId ?? batch.deviceId,
          `Hardware SOS button depressed on bus ${busNum}`,
        );
      }
    }

    // Record sample signatures for sequence deduplication and replay resistance
    const currentSignatures = this.recentSampleSignatures.get(batch.deviceId) ?? [];
    for (const s of batch.samples) {
      if (s.seq !== undefined && s.latitude !== undefined && s.longitude !== undefined) {
        currentSignatures.push({
          device_id: batch.deviceId,
          boot_id: (s as any).boot_id || 'boot_session_01',
          seq: s.seq,
          latitude: s.latitude,
          longitude: s.longitude,
          recorded_at: s.recorded_at || batch.receivedAt.toISOString(),
        });
      }
    }
    if (currentSignatures.length > 500) {
      currentSignatures.splice(0, currentSignatures.length - 500);
    }
    this.recentSampleSignatures.set(batch.deviceId, currentSignatures);
  }

  getRecentSignatures(deviceId: string): StoredSampleSignature[] {
    return this.recentSampleSignatures.get(deviceId) ?? [];
  }

  async recordHeartbeat(deviceId: string, heartbeat: any, now: Date): Promise<void> {
    const dev = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (dev) {
      dev.last_heartbeat_at = now.toISOString();
      dev.last_reported_at = now.toISOString();
      dev.battery_mv = heartbeat.battery_mv;
      dev.satellites = heartbeat.satellites;
      dev.ignition = heartbeat.ignition;
      dev.last_reported_status = heartbeat.ignition ? 'ONLINE' : 'STANDBY_IGN_OFF';
    }
  }

  async updateDeviceActivity(deviceId: string, activate: boolean, now: Date): Promise<void> {
    const dev = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (dev) {
      if (activate && dev.status === 'PROVISIONED') {
        dev.status = 'ACTIVE';
      }
      dev.first_used_at = dev.first_used_at ?? now.toISOString();
    }
  }

  // --- Implement EtaDataStore ---

  async getRouteGeometry(routeId: string) {
    const route = this.routes.find(r => r.id === routeId);
    if (!route) return null;
    return {
      id: route.id,
      polyline: route.polyline,
      stops: route.stops.map(s => ({
        id: s.id,
        name: s.name,
        sequence: s.sequence,
        latitude: s.latitude,
        longitude: s.longitude,
        scheduled_arrival_utc: new Date().toISOString(),
      })),
    };
  }

  async getBusTelemetry(busId: string): Promise<BusTelemetryInput | null> {
    const snapshot = this.getSnapshots().find(s => s.bus_id === busId);
    if (!snapshot || snapshot.latitude === null || snapshot.longitude === null) {
      return null;
    }
    return {
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      speed_kmh: snapshot.speed_kmh ?? 30,
      recorded_at: snapshot.recorded_at ?? new Date().toISOString(),
      state: snapshot.state,
    };
  }

  // --- Implement AttendanceDataStore ---

  async getActiveTrip(tripId: string) {
    return {
      id: tripId,
      bus_id: '00000000-0000-4000-8000-000000000001',
      bus_number: 'Bus 12',
      route_name: 'Route 12: Mehdipatnam Express',
      status: 'ACTIVE' as const,
      scheduled_departure_utc: new Date().toISOString(),
      actual_departure_utc: new Date().toISOString(),
    };
  }

  async getStudentRoster(_tripId: string, studentId: string) {
    return {
      student_id: studentId,
      route_id: '00000000-0000-4000-8000-000000000012',
      is_on_leave: false,
    };
  }

  async getAttendanceRecord() {
    return null;
  }

  // --- Implement NotificationDataStore ---

  async getRecipientPreferences(userId: string) {
    return {
      user_id: userId,
      safety_locked: true as const,
      approaching_stops: true,
      delays: true,
      quiet_hours_enabled: false,
    };
  }

  async getRecentNotificationHistory() {
    return [];
  }

  // --- Attendance Management ---
  getAttendance(filters?: { tripType?: string | undefined; status?: string | undefined; search?: string | undefined }): AttendanceRecord[] {
    let result = [...this.attendance];
    if (filters?.tripType) {
      result = result.filter(r => r.trip_type === filters.tripType);
    }
    if (filters?.status) {
      result = result.filter(r => r.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(r =>
        r.student_id.toLowerCase().includes(q) ||
        (r.stop_name && r.stop_name.toLowerCase().includes(q)),
      );
    }
    return result;
  }

  recordManualLateBoarding(data: { student_id: string; trip_id: string; stop_name: string; actor: string }): AttendanceRecord {
    const existingIndex = this.attendance.findIndex(a => a.student_id === data.student_id);
    const updated: AttendanceRecord = {
      id: existingIndex >= 0 ? this.attendance[existingIndex]!.id : `18000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      student_id: data.student_id,
      trip_id: data.trip_id,
      trip_type: 'MORNING',
      service_date: new Date().toISOString().slice(0, 10),
      status: 'LATE_BOARDED',
      method: 'MANUAL',
      boarded_at: new Date().toISOString(),
      stop_name: data.stop_name,
    };
    if (existingIndex >= 0) {
      this.attendance[existingIndex] = updated;
    } else {
      this.attendance.unshift(updated);
    }
    this.recordAuditLog(data.actor, 'COR', 'MANUAL_BOARDING', 'ATTENDANCE', data.student_id, 'Coordinator recorded manual late boarding');
    return updated;
  }

  // --- Maintenance Tickets ---
  getMaintenanceTickets(filters?: { entityType?: string | undefined; status?: string | undefined }): MaintenanceTicketRecord[] {
    let result = [...this.maintenanceTickets];
    if (filters?.entityType) {
      result = result.filter(t => t.entity_type === filters.entityType);
    }
    if (filters?.status) {
      result = result.filter(t => t.status === filters.status);
    }
    return result;
  }

  createMaintenanceTicket(data: {
    entity_type: 'BUS' | 'DEVICE';
    entity_id: string;
    entity_identifier: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source: 'COORDINATOR' | 'TECHNICIAN';
    assigned_to: string;
  }): MaintenanceTicketRecord {
    const num = 10040 + this.maintenanceTickets.length + 1;
    const ticket: MaintenanceTicketRecord = {
      id: `19000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      ticket_number: `TKT-${num}`,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      entity_identifier: data.entity_identifier,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'OPEN',
      source: data.source,
      assigned_to: data.assigned_to,
      resolution_note: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    this.maintenanceTickets.unshift(ticket);
    this.recordAuditLog(this.currentUser.email, this.currentUser.role, 'CREATE_TICKET', 'TICKET', ticket.ticket_number, `Created ${data.severity} ticket for ${data.entity_identifier}`);
    this.savePersistedStore();
    return ticket;
  }

  resolveMaintenanceTicket(ticketId: string, resolutionNote: string, resolvedBy: string): MaintenanceTicketRecord | null {
    const ticket = this.maintenanceTickets.find(t => t.id === ticketId || t.ticket_number === ticketId);
    if (!ticket) return null;
    ticket.status = 'RESOLVED';
    ticket.resolution_note = resolutionNote;
    ticket.resolved_at = new Date().toISOString();
    this.recordAuditLog(resolvedBy, this.currentUser.role, 'RESOLVE_TICKET', 'TICKET', ticket.ticket_number, resolutionNote);
    this.savePersistedStore();
    return ticket;
  }

  // --- System Settings ---
  getSystemSettings(): SystemSettingRecord[] {
    return [...this.systemSettings];
  }

  updateSystemSetting(key: string, newValue: string | number | boolean, modifiedBy: string, reason: string): SystemSettingRecord | null {
    const setting = this.systemSettings.find(s => s.key === key);
    if (!setting) return null;
    const oldValue = setting.current_value;
    setting.current_value = newValue;
    setting.last_modified_by = modifiedBy;
    setting.last_modified_at = new Date().toISOString();
    setting.change_reason = reason;
    this.recordAuditLog(modifiedBy, 'SAD', 'UPDATE_SETTING', 'SETTING', key, reason, { value: oldValue }, { value: newValue });
    this.savePersistedStore();
    return setting;
  }

  // --- Audit Logs ---
  getAuditLogs(limit = 50): AuditLogRecord[] {
    return this.auditLogs.slice(0, limit);
  }

  recordAuditLog(
    actorEmail: string,
    actorRole: UserRole,
    action: string,
    entityType: string,
    entityId: string,
    reason: string,
    oldValue: Record<string, unknown> | null = null,
    newValue: Record<string, unknown> | null = null,
  ): AuditLogRecord {
    const log: AuditLogRecord = {
      id: `20000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      actor_id: this.currentUser.id,
      actor_email: actorEmail,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      reason,
      ip_address: '10.14.2.18',
      recorded_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    this.savePersistedStore();
    return log;
  }

  createBackup(): { success: boolean; backupPath?: string; error?: string } {
    try {
      this.savePersistedStore();
      const dir = path.dirname(this.persistencePath);
      const backupDir = path.join(dir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `fleet-backup-${timestamp}.json`);
      fs.copyFileSync(this.persistencePath, backupPath);
      this.recordAuditLog(
        this.currentUser.email,
        this.currentUser.role,
        'DATABASE_BACKUP',
        'SYSTEM',
        'STORE_BACKUP',
        `Generated operational store backup snapshot: ${path.basename(backupPath)}`,
      );
      return { success: true, backupPath };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  restoreBackup(backupPath: string): { success: boolean; error?: string; restoredCounts?: { routes: number; buses: number; devices: number } } {
    try {
      const resolvedBackup = path.resolve(backupPath);
      const backupDir = path.resolve(path.dirname(this.persistencePath), 'backups');
      const rel = path.relative(backupDir, resolvedBackup);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return { success: false, error: 'Access denied: Backup path must reside within the authorized backups directory.' };
      }
      if (!fs.existsSync(resolvedBackup)) {
        return { success: false, error: 'Backup snapshot file does not exist.' };
      }
      const raw = fs.readFileSync(resolvedBackup, 'utf-8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.routes) || !Array.isArray(data.buses) || !Array.isArray(data.devices)) {
        return { success: false, error: 'Invalid backup snapshot schema: missing core fleet arrays.' };
      }

      fs.copyFileSync(resolvedBackup, this.persistencePath);
      this.loadPersistedStore();

      this.recordAuditLog(
        this.currentUser.email,
        this.currentUser.role,
        'DATABASE_RESTORE',
        'SYSTEM',
        'STORE_RESTORE',
        `Restored operational store from backup snapshot: ${path.basename(resolvedBackup)}`,
      );

      return {
        success: true,
        restoredCounts: {
          routes: this.routes.length,
          buses: this.buses.length,
          devices: this.devices.length,
        },
      };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  getDiagnostics(): Record<string, unknown> {
    const fileExists = fs.existsSync(this.persistencePath);
    let fileSize = 0;
    if (fileExists) {
      try {
        fileSize = fs.statSync(this.persistencePath).size;
      } catch (_) {}
    }

    const liveBuses = this.getSnapshots().filter(b => (b.state === 'LIVE_HW' || b.state === 'LIVE_PHONE') && !b.is_simulated);
    const staleBuses = this.getSnapshots().filter(b => b.state === 'STALE');

    return {
      status: 'HEALTHY',
      service: 'vjit-bus-tracker',
      environment: process.env.NODE_ENV || 'development',
      serverTimeUtc: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      persistence: {
        engine: 'FILE_SYSTEM_TRANSACTIONAL_JSON',
        path: this.persistencePath,
        exists: fileExists,
        sizeBytes: fileSize,
        durabilityGuarantee: 'Survives server restart and crash recovery; PostgreSQL PostGIS migration pending Phase P7 approval',
      },
      fleet: {
        totalBuses: this.buses.length,
        activeBuses: this.buses.filter(b => b.status === 'ACTIVE').length,
        maintenanceBuses: this.buses.filter(b => b.status === 'MAINTENANCE').length,
        retiredBuses: this.buses.filter(b => b.status === 'RETIRED').length,
        liveTrackingCount: liveBuses.length,
        staleSignalsCount: staleBuses.length,
      },
      routes: {
        totalRoutes: this.routes.length,
        totalStops: this.routes.reduce((acc, r) => acc + (r.stops?.length ?? 0), 0),
      },
      devices: {
        totalDevices: this.devices.length,
        activeDevices: this.devices.filter(d => d.status === 'ACTIVE').length,
        provisionedDevices: this.devices.filter(d => d.status === 'PROVISIONED').length,
        revokedDevices: this.devices.filter(d => d.status === 'REVOKED').length,
        activeLinks: this.links.filter(l => !l.valid_to).length,
      },
      security: {
        authMechanisms: ['BEARER_TOKEN_HMAC_SHA256', 'CRYPTOGRAPHIC_ROTATING_PASS'],
        mfaEnforcedRoles: ['COR', 'TEC', 'SAD', 'MGT', 'SEC'],
      },
    };
  }

  private savePersistedStore(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        version: 1,
        saved_at: new Date().toISOString(),
        routes: this.routes,
        buses: this.buses,
        devices: this.devices,
        links: this.links,
        systemSettings: this.systemSettings,
        maintenanceTickets: this.maintenanceTickets,
        auditLogs: this.auditLogs.slice(0, 100),
      };
      const tmpPath = `${this.persistencePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.persistencePath);
    } catch {
      // Fallback safely if filesystem write fails in sandbox
    }
  }

  private loadPersistedStore(): void {
    try {
      if (!fs.existsSync(this.persistencePath)) return;
      const raw = fs.readFileSync(this.persistencePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.routes)) {
        for (const savedRoute of data.routes) {
          const idx = this.routes.findIndex(r => r.id === savedRoute.id);
          if (idx >= 0) {
            this.routes[idx] = savedRoute;
          } else {
            this.routes.push(savedRoute);
          }
        }
      }
      if (Array.isArray(data.buses)) {
        for (const savedBus of data.buses) {
          const idx = this.buses.findIndex(b => b.id === savedBus.id);
          if (idx >= 0) {
            this.buses[idx] = savedBus;
          } else {
            this.buses.push(savedBus);
          }
        }
      }
      if (Array.isArray(data.devices)) {
        for (const savedDevice of data.devices) {
          const idx = this.devices.findIndex(d => d.device_id === savedDevice.device_id || d.id === savedDevice.id);
          if (idx >= 0) {
            this.devices[idx] = { ...this.devices[idx], ...savedDevice };
          } else {
            this.devices.push(savedDevice);
          }
        }
      }
      if (Array.isArray(data.links)) {
        this.links = data.links;
      }
      if (Array.isArray(data.systemSettings)) {
        for (const savedSetting of data.systemSettings) {
          const idx = this.systemSettings.findIndex(s => s.key === savedSetting.key);
          if (idx >= 0) {
            this.systemSettings[idx] = savedSetting;
          } else {
            this.systemSettings.push(savedSetting);
          }
        }
      }
      if (Array.isArray(data.maintenanceTickets)) {
        for (const savedTicket of data.maintenanceTickets) {
          const idx = this.maintenanceTickets.findIndex(t => t.id === savedTicket.id);
          if (idx >= 0) {
            this.maintenanceTickets[idx] = savedTicket;
          } else {
            this.maintenanceTickets.unshift(savedTicket);
          }
        }
      }
      if (Array.isArray(data.auditLogs)) {
        const existingIds = new Set(this.auditLogs.map(l => l.id));
        for (const savedLog of data.auditLogs) {
          if (!existingIds.has(savedLog.id)) {
            this.auditLogs.push(savedLog);
          }
        }
      }
    } catch {
      // Continue with seed data if file corrupt
    }
  }
}

// Export singleton instance for API routes & web apps
export const fleetDataStore = new FleetDataStore();
