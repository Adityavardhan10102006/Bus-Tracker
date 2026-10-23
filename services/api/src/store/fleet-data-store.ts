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
  type BusTelemetryInput,
  type DeviceBusLinkRecord as DomainDeviceBusLinkRecord,
} from '@vjit/domain';
import type { IngestionDataStore } from '../routes/telemetry.js';
import type { AttendanceDataStore } from '../routes/attendance.js';
import type { EtaDataStore } from '../routes/eta.js';
import type { NotificationDataStore } from '../routes/notifications.js';

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

  // Polyline progress trackers for simulation
  private busProgress: Map<string, number> = new Map();

  constructor() {
    this.persistencePath =
      process.env.PERSISTENCE_FILE_PATH ||
      path.resolve(process.cwd(), 'tmp/fleet-persisted-store.json');
    this.demoState = {
      enabled: true,
      stepIndex: 3,
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
    // 1. Authoritative Transit Routes connecting Hyderabad nodes to VJIT Campus (Aziz Nagar Gate, Chevella Road)
    this.routes = [
      {
        id: '00000000-0000-4000-8000-000000000012',
        name: 'Route 12: Mehdipatnam Express',
        code: 'R-12',
        origin: 'Mehdipatnam (Rethi Bowli)',
        destination: 'VJIT Main Campus',
        active_buses: 2,
        polyline: [
          [17.3916, 78.4416], // Mehdipatnam
          [17.3820, 78.4360],
          [17.3750, 78.4320], // Attapur
          [17.3710, 78.4210],
          [17.3680, 78.4110], // Hyderguda
          [17.3630, 78.3980],
          [17.3590, 78.3850], // Sun City
          [17.3550, 78.3730],
          [17.3520, 78.3620], // Kali Mandir
          [17.3510, 78.3490], // TSPA Junction
          [17.3550, 78.3370], // Himayatnagar
          [17.3580, 78.3290],
          [17.3616, 78.3245], // VJIT Main Gate
        ],
        stops: [
          {
            id: '12000000-0000-4000-8000-000000000001',
            name: 'Mehdipatnam (Rethi Bowli)',
            sequence: 1,
            latitude: 17.3916,
            longitude: 78.4416,
            scheduled_time: '07:45 AM',
            status: 'DEPARTED',
          },
          {
            id: '12000000-0000-4000-8000-000000000002',
            name: 'Attapur (Pillar 143)',
            sequence: 2,
            latitude: 17.3750,
            longitude: 78.4320,
            scheduled_time: '08:00 AM',
            status: 'DEPARTED',
          },
          {
            id: '12000000-0000-4000-8000-000000000003',
            name: 'Hyderguda Janachaitanya',
            sequence: 3,
            latitude: 17.3680,
            longitude: 78.4110,
            scheduled_time: '08:12 AM',
            status: 'DEPARTED',
          },
          {
            id: '12000000-0000-4000-8000-000000000004',
            name: 'Sun City Bandlaguda',
            sequence: 4,
            latitude: 17.3590,
            longitude: 78.3850,
            scheduled_time: '08:25 AM',
            status: 'ARRIVING',
          },
          {
            id: '12000000-0000-4000-8000-000000000005',
            name: 'Kali Mandir Junction',
            sequence: 5,
            latitude: 17.3520,
            longitude: 78.3620,
            scheduled_time: '08:35 AM',
            status: 'SCHEDULED',
          },
          {
            id: '12000000-0000-4000-8000-000000000006',
            name: 'TSPA Junction (APPA Jn)',
            sequence: 6,
            latitude: 17.3510,
            longitude: 78.3490,
            scheduled_time: '08:42 AM',
            status: 'SCHEDULED',
          },
          {
            id: '12000000-0000-4000-8000-000000000007',
            name: 'Himayatnagar Village',
            sequence: 7,
            latitude: 17.3550,
            longitude: 78.3370,
            scheduled_time: '08:50 AM',
            status: 'SCHEDULED',
          },
          {
            id: '12000000-0000-4000-8000-000000000008',
            name: 'VJIT Campus Main Gate',
            sequence: 8,
            latitude: 17.3616,
            longitude: 78.3245,
            scheduled_time: '09:00 AM',
            status: 'SCHEDULED',
          },
        ],
      },
      {
        id: '00000000-0000-4000-8000-000000000005',
        name: 'Route 05: Kukatpally IT Corridor',
        code: 'R-05',
        origin: 'KPHB Colony',
        destination: 'VJIT Main Campus',
        active_buses: 2,
        polyline: [
          [17.4930, 78.3990], // KPHB
          [17.4980, 78.3880], // JNTU
          [17.4720, 78.3850],
          [17.4500, 78.3810], // Hitec City
          [17.4440, 78.3490], // Gachibowli Stadium
          [17.4180, 78.3450], // ORR Nanakramguda
          [17.3950, 78.3320], // Kokapet
          [17.3780, 78.3210], // Gandipet
          [17.3616, 78.3245], // VJIT Main Gate
        ],
        stops: [
          {
            id: '05000000-0000-4000-8000-000000000001',
            name: 'KPHB Colony Phase 1',
            sequence: 1,
            latitude: 17.4930,
            longitude: 78.3990,
            scheduled_time: '07:30 AM',
            status: 'DEPARTED',
          },
          {
            id: '05000000-0000-4000-8000-000000000002',
            name: 'JNTU Main Road',
            sequence: 2,
            latitude: 17.4980,
            longitude: 78.3880,
            scheduled_time: '07:38 AM',
            status: 'DEPARTED',
          },
          {
            id: '05000000-0000-4000-8000-000000000003',
            name: 'Hitec City Cyber Towers',
            sequence: 3,
            latitude: 17.4500,
            longitude: 78.3810,
            scheduled_time: '07:55 AM',
            status: 'DEPARTED',
          },
          {
            id: '05000000-0000-4000-8000-000000000004',
            name: 'Gachibowli Stadium',
            sequence: 4,
            latitude: 17.4440,
            longitude: 78.3490,
            scheduled_time: '08:15 AM',
            status: 'DEPARTED',
          },
          {
            id: '05000000-0000-4000-8000-000000000005',
            name: 'ORR Nanakramguda Toll',
            sequence: 5,
            latitude: 17.4180,
            longitude: 78.3450,
            scheduled_time: '08:28 AM',
            status: 'ARRIVING',
          },
          {
            id: '05000000-0000-4000-8000-000000000006',
            name: 'Kokapet SEZ Junction',
            sequence: 6,
            latitude: 17.3950,
            longitude: 78.3320,
            scheduled_time: '08:40 AM',
            status: 'SCHEDULED',
          },
          {
            id: '05000000-0000-4000-8000-000000000007',
            name: 'Gandipet Ocean Park',
            sequence: 7,
            latitude: 17.3780,
            longitude: 78.3210,
            scheduled_time: '08:50 AM',
            status: 'SCHEDULED',
          },
          {
            id: '05000000-0000-4000-8000-000000000008',
            name: 'VJIT Campus Main Gate',
            sequence: 8,
            latitude: 17.3616,
            longitude: 78.3245,
            scheduled_time: '09:00 AM',
            status: 'SCHEDULED',
          },
        ],
      },
      {
        id: '00000000-0000-4000-8000-000000000008',
        name: 'Route 08: LB Nagar - Aramghar Link',
        code: 'R-08',
        origin: 'LB Nagar X Road',
        destination: 'VJIT Main Campus',
        active_buses: 1,
        polyline: [
          [17.3457, 78.5522], // LB Nagar
          [17.3688, 78.5247], // Dilsukhnagar
          [17.3180, 78.4750], // Chandrayangutta
          [17.3210, 78.4350], // Aramghar
          [17.3150, 78.3950], // Shamshabad Rd
          [17.3290, 78.4080], // Rajendranagar
          [17.3510, 78.3490], // TSPA Junction
          [17.3616, 78.3245], // VJIT Main Gate
        ],
        stops: [
          {
            id: '08000000-0000-4000-8000-000000000001',
            name: 'LB Nagar X Road',
            sequence: 1,
            latitude: 17.3457,
            longitude: 78.5522,
            scheduled_time: '07:35 AM',
            status: 'DEPARTED',
          },
          {
            id: '08000000-0000-4000-8000-000000000002',
            name: 'Dilsukhnagar Bus Station',
            sequence: 2,
            latitude: 17.3688,
            longitude: 78.5247,
            scheduled_time: '07:45 AM',
            status: 'DEPARTED',
          },
          {
            id: '08000000-0000-4000-8000-000000000003',
            name: 'Chandrayangutta X Road',
            sequence: 3,
            latitude: 17.3180,
            longitude: 78.4750,
            scheduled_time: '08:05 AM',
            status: 'DEPARTED',
          },
          {
            id: '08000000-0000-4000-8000-000000000004',
            name: 'Aramghar Junction',
            sequence: 4,
            latitude: 17.3210,
            longitude: 78.4350,
            scheduled_time: '08:20 AM',
            status: 'ARRIVING',
          },
          {
            id: '08000000-0000-4000-8000-000000000005',
            name: 'Rajendranagar PJTSAU',
            sequence: 5,
            latitude: 17.3290,
            longitude: 78.4080,
            scheduled_time: '08:40 AM',
            status: 'SCHEDULED',
          },
          {
            id: '08000000-0000-4000-8000-000000000006',
            name: 'TSPA Junction',
            sequence: 6,
            latitude: 17.3510,
            longitude: 78.3490,
            scheduled_time: '08:52 AM',
            status: 'SCHEDULED',
          },
          {
            id: '08000000-0000-4000-8000-000000000007',
            name: 'VJIT Campus Main Gate',
            sequence: 7,
            latitude: 17.3616,
            longitude: 78.3245,
            scheduled_time: '09:02 AM',
            status: 'SCHEDULED',
          },
        ],
      },
      {
        id: '00000000-0000-4000-8000-000000000021',
        name: 'Route 21: Secunderabad Central',
        code: 'R-21',
        origin: 'Secunderabad Station',
        destination: 'VJIT Main Campus',
        active_buses: 1,
        polyline: [
          [17.4399, 78.4983], // Secunderabad
          [17.4440, 78.4650], // Begumpet
          [17.4270, 78.4520], // Punjagutta
          [17.4120, 78.4350], // Banjara Hills
          [17.4280, 78.4070], // Jubilee Hills
          [17.3980, 78.3990], // Tolichowki
          [17.3820, 78.4090], // Langar Houz
          [17.3616, 78.3245], // VJIT Main Gate
        ],
        stops: [
          {
            id: '21000000-0000-4000-8000-000000000001',
            name: 'Secunderabad Railway Station',
            sequence: 1,
            latitude: 17.4399,
            longitude: 78.4983,
            scheduled_time: '07:30 AM',
            status: 'DEPARTED',
          },
          {
            id: '21000000-0000-4000-8000-000000000002',
            name: 'Begumpet Flyover',
            sequence: 2,
            latitude: 17.4440,
            longitude: 78.4650,
            scheduled_time: '07:42 AM',
            status: 'DEPARTED',
          },
          {
            id: '21000000-0000-4000-8000-000000000003',
            name: 'Punjagutta Central',
            sequence: 3,
            latitude: 17.4270,
            longitude: 78.4520,
            scheduled_time: '07:55 AM',
            status: 'DEPARTED',
          },
          {
            id: '21000000-0000-4000-8000-000000000004',
            name: 'Banjara Hills Road 12',
            sequence: 4,
            latitude: 17.4120,
            longitude: 78.4350,
            scheduled_time: '08:10 AM',
            status: 'DEPARTED',
          },
          {
            id: '21000000-0000-4000-8000-000000000005',
            name: 'Tolichowki X Road',
            sequence: 5,
            latitude: 17.3980,
            longitude: 78.3990,
            scheduled_time: '08:35 AM',
            status: 'ARRIVING',
          },
          {
            id: '21000000-0000-4000-8000-000000000006',
            name: 'Langar Houz Military Area',
            sequence: 6,
            latitude: 17.3820,
            longitude: 78.4090,
            scheduled_time: '08:45 AM',
            status: 'SCHEDULED',
          },
          {
            id: '21000000-0000-4000-8000-000000000007',
            name: 'VJIT Campus Main Gate',
            sequence: 7,
            latitude: 17.3616,
            longitude: 78.3245,
            scheduled_time: '09:05 AM',
            status: 'SCHEDULED',
          },
        ],
      },
    ];

    // 2. Bus Fleet Records (Spec Section 12 & ADM-03)
    this.buses = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        bus_number: 'Bus 12',
        registration: 'TS 09 UB 4412',
        seating_capacity: 52,
        status: 'ACTIVE',
        insurance_expiry: '2027-04-15',
        fitness_expiry: '2027-02-10',
        pollution_expiry: '2026-12-30',
        permit_expiry: '2028-01-20',
        created_at: new Date('2024-01-15').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        bus_number: 'Bus 05',
        registration: 'TS 09 UB 3305',
        seating_capacity: 50,
        status: 'ACTIVE',
        insurance_expiry: '2027-05-20',
        fitness_expiry: '2027-03-14',
        pollution_expiry: '2026-11-25',
        permit_expiry: '2028-02-15',
        created_at: new Date('2024-02-10').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        bus_number: 'Bus 08',
        registration: 'TS 09 UB 5508',
        seating_capacity: 54,
        status: 'ACTIVE',
        insurance_expiry: '2027-06-18',
        fitness_expiry: '2027-04-12',
        pollution_expiry: '2026-10-30',
        permit_expiry: '2028-03-10',
        created_at: new Date('2024-03-01').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        bus_number: 'Bus 21',
        registration: 'TS 09 UB 2221',
        seating_capacity: 48,
        status: 'ACTIVE',
        insurance_expiry: '2027-07-22',
        fitness_expiry: '2027-05-18',
        pollution_expiry: '2026-12-15',
        permit_expiry: '2028-04-05',
        created_at: new Date('2024-04-12').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000005',
        bus_number: 'Bus 16',
        registration: 'TS 09 UB 1616',
        seating_capacity: 50,
        status: 'MAINTENANCE',
        insurance_expiry: '2027-01-10',
        fitness_expiry: '2026-11-15',
        pollution_expiry: '2026-10-25',
        permit_expiry: '2027-08-10',
        created_at: new Date('2023-08-01').toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000006',
        bus_number: 'Bus 03',
        registration: 'TS 09 UB 1103',
        seating_capacity: 50,
        status: 'ACTIVE',
        insurance_expiry: '2027-08-30',
        fitness_expiry: '2027-06-25',
        pollution_expiry: '2027-01-10',
        permit_expiry: '2028-05-12',
        created_at: new Date('2024-05-01').toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 3. Hardware GPS Trackers (Spec 11 & ADM-04)
    this.devices = [
      {
        id: '00000000-0000-4000-8000-000000001042',
        device_id: 'HW_1042',
        serial_number: 'VJIT-GPS-1042-REV2',
        imei: '860456041234567',
        iccid: '89911012024123456789',
        status: 'ACTIVE',
        firmware_version: '1.2.0',
        first_used_at: new Date('2024-06-01').toISOString(),
        created_at: new Date('2024-05-10').toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000001085',
        device_id: 'HW_1085',
        serial_number: 'VJIT-GPS-1085-REV2',
        imei: '860456041234568',
        iccid: '89911012024123456790',
        status: 'ACTIVE',
        firmware_version: '1.2.0',
        first_used_at: new Date('2024-06-01').toISOString(),
        created_at: new Date('2024-05-10').toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000002011',
        device_id: 'HW_2011',
        serial_number: 'VJIT-GPS-2011-REV2',
        imei: '860456041234569',
        iccid: '89911012024123456791',
        status: 'ACTIVE',
        firmware_version: '1.1.8',
        first_used_at: new Date('2024-06-01').toISOString(),
        created_at: new Date('2024-05-10').toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000003045',
        device_id: 'HW_3045',
        serial_number: 'VJIT-GPS-3045-REV2',
        imei: '860456041234570',
        iccid: '89911012024123456792',
        status: 'PROVISIONED',
        firmware_version: '1.2.0',
        first_used_at: null,
        created_at: new Date('2024-08-01').toISOString(),
      },
    ];

    // 4. Device-to-Bus Links
    this.links = [
      {
        id: '00000000-0000-4000-8000-0000000000a1',
        device_id: 'HW_1042',
        bus_id: '00000000-0000-4000-8000-000000000001',
        bus_number: 'Bus 12',
        valid_from: new Date('2024-06-01').toISOString(),
        valid_to: null,
        linked_by: 'transport.coord@vjit.ac.in',
        reason: 'Permanent hardware installation',
      },
      {
        id: '00000000-0000-4000-8000-0000000000a2',
        device_id: 'HW_1085',
        bus_id: '00000000-0000-4000-8000-000000000002',
        bus_number: 'Bus 05',
        valid_from: new Date('2024-06-01').toISOString(),
        valid_to: null,
        linked_by: 'transport.coord@vjit.ac.in',
        reason: 'Permanent hardware installation',
      },
      {
        id: '00000000-0000-4000-8000-0000000000a3',
        device_id: 'HW_2011',
        bus_id: '00000000-0000-4000-8000-000000000003',
        bus_number: 'Bus 08',
        valid_from: new Date('2024-06-01').toISOString(),
        valid_to: null,
        linked_by: 'transport.coord@vjit.ac.in',
        reason: 'Permanent hardware installation',
      },
    ];

    // 5. Operational Service Alerts
    this.alerts = [
      {
        id: '00000000-0000-4000-8000-0000000000f1',
        category: 'DELAY',
        priority: 'MEDIUM',
        title: 'Moderate Traffic at TSPA Appa Junction',
        message: 'Flyover maintenance work near Appa Junction causing 8-12 minute transit delays for Route 12 and Route 08 buses towards campus.',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        read: false,
      },
      {
        id: '00000000-0000-4000-8000-0000000000f2',
        category: 'SCHEDULE',
        priority: 'LOW',
        title: 'Evening Return Schedule Shift',
        message: 'All campus return buses will depart at 16:40 PM following the institutional symposium.',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        read: true,
      },
    ];

    // Initialize initial bus progress indices along polyline
    this.busProgress.set('00000000-0000-4000-8000-000000000001', 6); // Sun City -> Kali Mandir
    this.busProgress.set('00000000-0000-4000-8000-000000000002', 5);  // Nanakramguda -> Kokapet
    this.busProgress.set('00000000-0000-4000-8000-000000000003', 4);  // Aramghar -> Rajendranagar
    this.busProgress.set('00000000-0000-4000-8000-000000000004', 5);  // Tolichowki
    this.busProgress.set('00000000-0000-4000-8000-000000000005', 0);
    this.busProgress.set('00000000-0000-4000-8000-000000000006', 0);

    // 6. Attendance Records (Spec 18 & ADM-08)
    const today = new Date().toISOString().slice(0, 10);
    this.attendance = [
      {
        id: '18000000-0000-4000-8000-000000000001',
        student_id: '00000000-0000-4000-8000-000000000501',
        trip_id: '00000000-0000-4000-8000-000000000001',
        trip_type: 'MORNING',
        service_date: today,
        status: 'BOARDED',
        method: 'QR',
        boarded_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
        stop_name: 'Sun City Bandlaguda',
      },
      {
        id: '18000000-0000-4000-8000-000000000002',
        student_id: '00000000-0000-4000-8000-000000000502',
        trip_id: '00000000-0000-4000-8000-000000000001',
        trip_type: 'MORNING',
        service_date: today,
        status: 'BOARDED',
        method: 'RFID',
        boarded_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        stop_name: 'Attapur (Pillar 143)',
      },
      {
        id: '18000000-0000-4000-8000-000000000003',
        student_id: '00000000-0000-4000-8000-000000000503',
        trip_id: '00000000-0000-4000-8000-000000000001',
        trip_type: 'MORNING',
        service_date: today,
        status: 'LATE_BOARDED',
        method: 'MANUAL',
        boarded_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        stop_name: 'Kali Mandir Junction',
      },
      {
        id: '18000000-0000-4000-8000-000000000004',
        student_id: '00000000-0000-4000-8000-000000000504',
        trip_id: '00000000-0000-4000-8000-000000000001',
        trip_type: 'MORNING',
        service_date: today,
        status: 'EXPECTED',
        method: null,
        boarded_at: null,
        stop_name: 'TSPA Appa Junction',
      },
      {
        id: '18000000-0000-4000-8000-000000000005',
        student_id: '00000000-0000-4000-8000-000000000505',
        trip_id: '00000000-0000-4000-8000-000000000001',
        trip_type: 'MORNING',
        service_date: today,
        status: 'ON_LEAVE',
        method: null,
        boarded_at: null,
        stop_name: 'Mehdipatnam (Rethi Bowli)',
      },
      {
        id: '18000000-0000-4000-8000-000000000006',
        student_id: '00000000-0000-4000-8000-000000000506',
        trip_id: '00000000-0000-4000-8000-000000000001',
        trip_type: 'MORNING',
        service_date: today,
        status: 'ABSENT',
        method: null,
        boarded_at: null,
        stop_name: 'Mehdipatnam (Rethi Bowli)',
      },
    ];

    // 7. Maintenance Tickets (Spec 16.4, 16.5 & ADM-05)
    this.maintenanceTickets = [
      {
        id: '19000000-0000-4000-8000-000000000001',
        ticket_number: 'TKT-10041',
        entity_type: 'BUS',
        entity_id: '00000000-0000-4000-8000-000000000005',
        entity_identifier: 'Bus 16 (TS 09 UB 1616)',
        title: 'Scheduled 40,000 km Brake & Suspension Overhaul',
        description: 'Periodic statutory inspection and front disc pad replacement at authorized service center.',
        severity: 'MEDIUM',
        status: 'IN_PROGRESS',
        source: 'COORDINATOR',
        assigned_to: 'Central Transport Workshop',
        resolution_note: null,
        created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        resolved_at: null,
      },
      {
        id: '19000000-0000-4000-8000-000000000002',
        ticket_number: 'TKT-10042',
        entity_type: 'DEVICE',
        entity_id: '00000000-0000-4000-8000-000000001085',
        entity_identifier: 'HW_1085 (Bus 05)',
        title: 'Cellular RSSI Signal Degradation near Appa Junction',
        description: 'Signal strength dropped below -105 dBm repeatedly. Requires RF coaxial antenna check.',
        severity: 'HIGH',
        status: 'OPEN',
        source: 'AUTO_ALERT',
        assigned_to: 'N. Srinivas (Fleet Tech)',
        resolution_note: null,
        created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        resolved_at: null,
      },
      {
        id: '19000000-0000-4000-8000-000000000003',
        ticket_number: 'TKT-10043',
        entity_type: 'BUS',
        entity_id: '00000000-0000-4000-8000-000000000003',
        entity_identifier: 'Bus 08 (TS 09 UB 5508)',
        title: 'AC blower motor airflow low reported on corridor',
        description: 'Cabin air filter cleaning and refrigerant pressure test requested by driver.',
        severity: 'LOW',
        status: 'OPEN',
        source: 'COORDINATOR',
        assigned_to: 'Campus HVAC Desk',
        resolution_note: null,
        created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        resolved_at: null,
      },
      {
        id: '19000000-0000-4000-8000-000000000004',
        ticket_number: 'TKT-10044',
        entity_type: 'DEVICE',
        entity_id: '00000000-0000-4000-8000-000000001042',
        entity_identifier: 'HW_1042 (Bus 12)',
        title: 'Firmware 1.2.0 OTA Flash & GNSS Bench Audit',
        description: 'Firmware binary hash verification and auxiliary battery test under ignition off.',
        severity: 'LOW',
        status: 'RESOLVED',
        source: 'TECHNICIAN',
        assigned_to: 'N. Srinivas (Fleet Tech)',
        resolution_note: 'OTA flash succeeded, SHA-256 confirmed, internal battery holds 12.58V nominal.',
        created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ];

    // 8. System Settings (Part I.5 & Spec 35)
    this.systemSettings = [
      {
        key: 'stale_gps_threshold_seconds',
        default_value: 60,
        current_value: 60,
        section: 'TELEMETRY',
        description: 'Age threshold in seconds before GPS signal is classified as STALE.',
        last_modified_by: 'admin.super@vjit.ac.in',
        last_modified_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        change_reason: 'Synchronized with 10s hardware cadence per Spec Section 35.',
      },
      {
        key: 'unavailability_threshold_seconds',
        default_value: 300,
        current_value: 300,
        section: 'TELEMETRY',
        description: 'Age threshold in seconds before vehicle tracking is marked UNAVAILABLE.',
        last_modified_by: 'admin.super@vjit.ac.in',
        last_modified_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        change_reason: 'Default configuration baseline.',
      },
      {
        key: 'low_battery_threshold_mv',
        default_value: 11500,
        current_value: 11500,
        section: 'HARDWARE',
        description: 'In-bus tracker battery warning threshold in millivolts (11.5 V).',
        last_modified_by: 'admin.super@vjit.ac.in',
        last_modified_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        change_reason: 'Preserves vehicle starter battery capacity.',
      },
      {
        key: 'sos_escalation_window_seconds',
        default_value: 300,
        current_value: 300,
        section: 'SAFETY',
        description: 'Time window in seconds before unacknowledged SOS escalates to Campus Security.',
        last_modified_by: 'admin.super@vjit.ac.in',
        last_modified_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        change_reason: 'Standard college safety protocol.',
      },
      {
        key: 'geofence_arrival_radius_m',
        default_value: 100,
        current_value: 100,
        section: 'DISPATCH',
        description: 'Circular radius in meters to evaluate vehicle arrival inside designated stop.',
        last_modified_by: 'admin.super@vjit.ac.in',
        last_modified_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        change_reason: 'Optimized for Hyderabad suburban stop coordinates.',
      },
      {
        key: 'speed_anomaly_threshold_kmh',
        default_value: 80,
        current_value: 80,
        section: 'SAFETY',
        description: 'Maximum velocity threshold before automated speed violation alert is logged.',
        last_modified_by: 'admin.super@vjit.ac.in',
        last_modified_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        change_reason: 'Campus transport corridor safety restriction.',
      },
    ];

    // 9. Immutable Audit Log (Rule B.6 & Spec 31)
    this.auditLogs = [
      {
        id: '20000000-0000-4000-8000-000000000001',
        actor_id: '11111111-2222-4333-8444-555555555555',
        actor_email: 'transport.coord@vjit.ac.in',
        actor_role: 'COR',
        action: 'CREATE_BUS',
        entity_type: 'BUS',
        entity_id: '00000000-0000-4000-8000-000000000001',
        old_value: null,
        new_value: { bus_number: 'Bus 12', registration: 'TS 09 UB 4412', capacity: 52 },
        reason: 'Fleet onboarding for Route 12 Mehdipatnam corridor',
        ip_address: '10.14.2.18',
        recorded_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: '20000000-0000-4000-8000-000000000002',
        actor_id: '11111111-2222-4333-8444-555555555555',
        actor_email: 'transport.coord@vjit.ac.in',
        actor_role: 'COR',
        action: 'LINK_DEVICE',
        entity_type: 'DEVICE',
        entity_id: 'HW_1042',
        old_value: null,
        new_value: { bus_id: '00000000-0000-4000-8000-000000000001', bus_number: 'Bus 12' },
        reason: 'Permanent hardware installation and bench test',
        ip_address: '10.14.2.18',
        recorded_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
      {
        id: '20000000-0000-4000-8000-000000000003',
        actor_id: '00000000-0000-4000-8000-000000000001',
        actor_email: 'admin.super@vjit.ac.in',
        actor_role: 'SAD',
        action: 'UPDATE_SETTING',
        entity_type: 'SETTING',
        entity_id: 'stale_gps_threshold_seconds',
        old_value: { value: 90 },
        new_value: { value: 60 },
        reason: 'Tightened telemetry freshness threshold to 60s per Spec Section 35.',
        ip_address: '10.14.1.5',
        recorded_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ];
  }

  // --- Snapshot & Telemetry ---

  getSnapshots(routeIdFilter?: string): BusSnapshot[] {
    const now = new Date();
    const serviceDate = now.toISOString().slice(0, 10);

    const snapshots: BusSnapshot[] = [];

    for (const bus of this.buses) {
      if (bus.status === 'RETIRED') {
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          route_id: this.routes[0]?.id ?? '00000000-0000-4000-8000-000000000012',
          route_name: this.routes[0]?.name ?? 'Unassigned Route',
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
          route_id: this.routes[0]?.id ?? '00000000-0000-4000-8000-000000000012',
          route_name: this.routes[0]?.name ?? 'Depot Maintenance',
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
        const route = this.routes.find(r => r.id === (bus as any).assigned_route_id) ?? this.routes[0]!;

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
          trip_id: `00000000-0000-4000-8000-0000000000t${bus.bus_number.replace(/\D/g, '')}`,
          service_date: serviceDate,
          is_simulated: live.is_simulated ?? false,
          telemetry_source: (live.telemetry_source as any) ?? 'HARDWARE',
        });
        continue;
      }

      if (bus.id === '00000000-0000-4000-8000-000000000001') {
        // Bus 12
        const route = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000012') ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 6, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.3590, 78.3850];
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
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
      } else if (bus.id === '00000000-0000-4000-8000-000000000002') {
        // Bus 05
        const route = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000005') ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 5, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.4180, 78.3450];
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
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
      } else if (bus.id === '00000000-0000-4000-8000-000000000003') {
        // Bus 08
        const route = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000008') ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 4, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.3210, 78.4350];
        const ageSec = 78; // older than 60s -> STALE
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
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
      } else if (bus.id === '00000000-0000-4000-8000-000000000004') {
        // Bus 21
        const route = this.routes.find(r => r.id === '00000000-0000-4000-8000-000000000021') ?? this.routes[0]!;
        const pIndex = Math.min(this.busProgress.get(bus.id) ?? 5, (route.polyline?.length ?? 1) - 1);
        const [lat, lng] = route.polyline[pIndex] ?? [17.3980, 78.3990];
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
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
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          route_id: '00000000-0000-4000-8000-000000000012',
          route_name: 'Route 12: Mehdipatnam Express',
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
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          route_id: '00000000-0000-4000-8000-000000000005',
          route_name: 'Route 05: Kukatpally IT Corridor',
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
        // Newly added bus by Transport Admin
        const defaultRoute = this.routes[0]!;
        snapshots.push({
          bus_id: bus.id,
          bus_number: bus.bus_number,
          registration: bus.registration,
          route_id: defaultRoute.id,
          route_name: defaultRoute.name,
          state: 'NOT_RUNNING',
          state_label: 'Standby • In Depot (New Fleet Addition)',
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
    return this.buses;
  }

  getBusById(id: string): BusRecord | null {
    return this.buses.find(b => b.id === id) ?? null;
  }

  createBus(input: {
    bus_number: string;
    registration: string;
    seating_capacity: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
    insurance_expiry: string;
    fitness_expiry: string;
    pollution_expiry: string;
    permit_expiry: string;
  }): BusRecord {
    const id = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const newBus: BusRecord = {
      id,
      bus_number: input.bus_number,
      registration: input.registration,
      seating_capacity: input.seating_capacity,
      status: input.status,
      insurance_expiry: input.insurance_expiry,
      fitness_expiry: input.fitness_expiry,
      pollution_expiry: input.pollution_expiry,
      permit_expiry: input.permit_expiry,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.buses.push(newBus);
    this.savePersistedStore();
    return newBus;
  }

  updateBus(id: string, updates: Partial<BusRecord>): BusRecord | null {
    const index = this.buses.findIndex(b => b.id === id);
    if (index === -1) return null;
    this.buses[index] = {
      ...this.buses[index]!,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.savePersistedStore();
    return this.buses[index]!;
  }

  deactivateBus(id: string): BusRecord | null {
    return this.updateBus(id, { status: 'RETIRED' });
  }

  // --- Devices & Linking ---

  getDevices(): DeviceRecord[] {
    const now = Date.now();
    return this.devices.map(d => {
      const lastRep = (d as any).last_reported_at;
      let connectivity: 'ONLINE' | 'STOPPED_REPORTING' | 'STANDBY' = 'STANDBY';
      let ageSeconds: number | null = null;
      if (lastRep) {
        ageSeconds = Math.max(0, Math.round((now - new Date(lastRep).getTime()) / 1000));
        connectivity = ageSeconds <= 60 ? 'ONLINE' : 'STOPPED_REPORTING';
      }
      return {
        ...d,
        last_reported_at: lastRep ?? null,
        connectivity_status: connectivity,
        reporting_age_seconds: ageSeconds,
      };
    });
  }

  getLinks(): AdminDeviceBusLinkRecord[] {
    return this.links;
  }

  linkDeviceToBus(deviceId: string, busId: string, linkedBy: string): { success: boolean; link?: AdminDeviceBusLinkRecord; error?: string } {
    const device = this.devices.find(d => d.device_id === deviceId);
    if (!device) {
      return { success: false, error: `Device ${deviceId} not found.` };
    }
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      return { success: false, error: `Bus ${busId} not found.` };
    }

    // Close any previous link for this device or bus
    const now = new Date().toISOString();
    this.links.forEach(l => {
      if ((l.device_id === deviceId || l.bus_id === busId) && !l.valid_to) {
        l.valid_to = now;
      }
    });

    const newLink: AdminDeviceBusLinkRecord = {
      id: `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      device_id: deviceId,
      bus_id: busId,
      bus_number: bus.bus_number,
      valid_from: now,
      valid_to: null,
      linked_by: linkedBy,
      reason: 'Console administrator link update',
    };
    this.links.push(newLink);
    this.savePersistedStore();
    return { success: true, link: newLink };
  }

  unlinkDevice(deviceId: string, unlinkedBy: string): { success: boolean; error?: string } {
    const now = new Date().toISOString();
    let found = false;
    this.links.forEach(l => {
      if (l.device_id === deviceId && !l.valid_to) {
        l.valid_to = now;
        l.reason = `Unlinked by ${unlinkedBy}`;
        found = true;
      }
    });
    if (!found) {
      return { success: false, error: `No active association found for device ${deviceId}.` };
    }
    this.savePersistedStore();
    return { success: true };
  }

  updateDeviceStatus(
    deviceId: string,
    status: 'ACTIVE' | 'PROVISIONED' | 'REVOKED',
    actorEmail: string,
  ): { success: boolean; device?: DeviceRecord; error?: string } {
    const dev = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (!dev) {
      return { success: false, error: `Device ${deviceId} not found.` };
    }
    const oldStatus = dev.status;
    dev.status = status;
    this.recordAuditLog(
      actorEmail,
      this.currentUser.role,
      'UPDATE_DEVICE_STATUS',
      'DEVICE',
      dev.device_id,
      `Hardware status changed from ${oldStatus} to ${status}`,
      { status: oldStatus },
      { status },
    );
    this.savePersistedStore();
    return { success: true, device: dev };
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
    return { ...this.demoState };
  }

  toggleDemo(enabled?: boolean): DemoSimulationState {
    this.demoState.enabled = enabled !== undefined ? enabled : !this.demoState.enabled;
    return this.demoState;
  }

  tickDemo(): { state: DemoSimulationState; snapshots: BusSnapshot[] } {
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
      (dev as any).last_reported_at = batch.receivedAt.toISOString();
      (dev as any).last_reported_status = 'ONLINE';
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
  }

  async recordHeartbeat(deviceId: string, heartbeat: any, now: Date): Promise<void> {
    const dev = this.devices.find(d => d.device_id === deviceId || d.id === deviceId);
    if (dev) {
      (dev as any).last_heartbeat_at = now.toISOString();
      (dev as any).last_reported_at = now.toISOString();
      (dev as any).battery_mv = heartbeat.battery_mv;
      (dev as any).satellites = heartbeat.satellites;
      (dev as any).ignition = heartbeat.ignition;
      (dev as any).last_reported_status = heartbeat.ignition ? 'ONLINE' : 'STANDBY_IGN_OFF';
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
