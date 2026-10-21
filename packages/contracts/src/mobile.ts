import { z } from 'zod';
import { userRoleSchema } from './roles.js';

export const trackingIntegrityStateSchema = z.enum([
  'LIVE_HW',
  'LIVE_PHONE',
  'STALE',
  'UNAVAILABLE',
  'NOT_RUNNING',
]);

export type TrackingIntegrityState = z.infer<typeof trackingIntegrityStateSchema>;

export const nextStopEtaSchema = z.object({
  stop_id: z.string().uuid(),
  name: z.string(),
  eta_seconds: z.number().int().min(0),
  eta_formatted: z.string(),
  distance_m: z.number().min(0),
});

export type NextStopEta = z.infer<typeof nextStopEtaSchema>;

export const busSnapshotSchema = z.object({
  bus_id: z.string().uuid(),
  bus_number: z.string(),
  registration: z.string(),
  route_id: z.string().uuid(),
  route_name: z.string(),
  state: trackingIntegrityStateSchema,
  state_label: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  speed_kmh: z.number().nullable(),
  heading: z.number().nullable(),
  recorded_at: z.string().datetime({ offset: true }).nullable(),
  age_seconds: z.number().int().min(0).nullable(),
  next_stop: nextStopEtaSchema.nullable(),
  capacity: z.number().int().min(1).max(150),
  occupancy: z.number().int().min(0).nullable(),
  trip_id: z.string().uuid().nullable(),
  service_date: z.string(),
});

export type BusSnapshot = z.infer<typeof busSnapshotSchema>;

export const stopSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  sequence: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  scheduled_time: z.string(),
  status: z.enum(['SCHEDULED', 'ARRIVING', 'DEPARTED']),
});

export type StopSummary = z.infer<typeof stopSummarySchema>;

export const routeDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  origin: z.string(),
  destination: z.string(),
  polyline: z.array(z.tuple([z.number(), z.number()])),
  stops: z.array(stopSummarySchema),
  active_buses: z.number().int().min(0),
});

export type RouteDetail = z.infer<typeof routeDetailSchema>;

export const stopRequestCreateSchema = z.object({
  route_id: z.string().uuid(),
  name: z.string().min(2).max(60),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type StopRequestCreate = z.infer<typeof stopRequestCreateSchema>;

export const stopRequestSchema = z.object({
  id: z.string().uuid(),
  route_id: z.string().uuid(),
  name: z.string().max(60),
  latitude: z.number(),
  longitude: z.number(),
  votes_count: z.number().int().min(0),
  has_voted: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

export type StopRequest = z.infer<typeof stopRequestSchema>;

export const boardingStopChangeSchema = z.object({
  student_route_id: z.string().uuid(),
  new_stop_id: z.string().uuid(),
});

export type BoardingStopChange = z.infer<typeof boardingStopChangeSchema>;

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  trip_id: z.string().uuid(),
  trip_type: z.enum(['MORNING', 'AFTERNOON']),
  service_date: z.string(),
  status: z.enum(['BOARDED', 'LATE_BOARDED', 'EXPECTED', 'ABSENT', 'ON_LEAVE']),
  method: z.enum(['QR', 'RFID', 'MANUAL']).nullable(),
  boarded_at: z.string().datetime({ offset: true }).nullable(),
  stop_name: z.string().nullable(),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

export const leaveCategorySchema = z.enum(['PERSONAL', 'ACADEMIC', 'OTHER']);
export type LeaveCategory = z.infer<typeof leaveCategorySchema>;

export const leaveRequestCreateSchema = z.object({
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  trip_type: z.enum(['MORNING', 'AFTERNOON', 'BOTH']),
  category: leaveCategorySchema,
});

export type LeaveRequestCreate = z.infer<typeof leaveRequestCreateSchema>;

export const leaveRecordSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  service_date: z.string(),
  trip_type: z.enum(['MORNING', 'AFTERNOON', 'BOTH']),
  category: leaveCategorySchema,
  status: z.enum(['PENDING', 'APPROVED', 'CANCELLED']),
  created_at: z.string().datetime({ offset: true }),
});

export type LeaveRecord = z.infer<typeof leaveRecordSchema>;

export const serviceAlertSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  category: z.enum(['SAFETY', 'DELAY', 'SCHEDULE', 'SYSTEM']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  created_at: z.string().datetime({ offset: true }),
  read: z.boolean(),
});

export type ServiceAlert = z.infer<typeof serviceAlertSchema>;

export const userProfileUpdateSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
});

export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  role: userRoleSchema,
  assigned_route_id: z.string().uuid().nullable(),
  assigned_bus_id: z.string().uuid().nullable(),
  notification_preferences: z.object({
    safety_locked: z.literal(true),
    approaching_stops: z.boolean(),
    delays: z.boolean(),
    quiet_hours_enabled: z.boolean(),
  }),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
