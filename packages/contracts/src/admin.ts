import { z } from 'zod';
import { userRoleSchema } from './roles.js';

export const busStatusSchema = z.enum(['ACTIVE', 'MAINTENANCE', 'RETIRED']);
export type BusStatus = z.infer<typeof busStatusSchema>;

export const busRecordSchema = z.object({
  id: z.string().uuid(),
  bus_number: z.string().min(1).max(20),
  registration: z.string().min(1).max(30),
  seating_capacity: z.number().int().min(1).max(150),
  status: busStatusSchema,
  insurance_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required'),
  fitness_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required'),
  pollution_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required'),
  permit_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required'),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type BusRecord = z.infer<typeof busRecordSchema>;

export const deviceStatusSchema = z.enum(['PROVISIONED', 'ACTIVE', 'REVOKED']);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export const deviceRecordSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string().regex(/^HW_[0-9A-Z]{3,4}$/, 'Pattern HW_NNN required'),
  serial_number: z.string().min(1).max(64),
  imei: z.string().regex(/^\d{15}$/, 'IMEI must be exactly 15 digits'),
  iccid: z.string().regex(/^\d{19,20}$/, 'ICCID must be 19 or 20 digits'),
  status: deviceStatusSchema,
  firmware_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  first_used_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  last_reported_at: z.string().datetime({ offset: true }).nullable().optional(),
  connectivity_status: z.enum(['ONLINE', 'STOPPED_REPORTING', 'STANDBY']).optional(),
  reporting_age_seconds: z.number().nullable().optional(),
});
export type DeviceRecord = z.infer<typeof deviceRecordSchema>;

export const deviceBusLinkRecordSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string(),
  bus_id: z.string().uuid(),
  bus_number: z.string(),
  valid_from: z.string().datetime({ offset: true }),
  valid_to: z.string().datetime({ offset: true }).nullable(),
  linked_by: z.string(),
  reason: z.string().optional(),
});
export type DeviceBusLinkRecord = z.infer<typeof deviceBusLinkRecordSchema>;

export const driverRosterRecordSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  driver_name: z.string().min(2).max(100),
  license_number: z.string().min(5).max(30),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  bus_id: z.string().uuid(),
  bus_number: z.string(),
  shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trip_type: z.enum(['MORNING', 'AFTERNOON', 'SPECIAL']),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
});
export type DriverRosterRecord = z.infer<typeof driverRosterRecordSchema>;

export const maintenanceTicketSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type MaintenanceTicketSeverity = z.infer<typeof maintenanceTicketSeveritySchema>;

export const maintenanceTicketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
export type MaintenanceTicketStatus = z.infer<typeof maintenanceTicketStatusSchema>;

export const maintenanceTicketRecordSchema = z.object({
  id: z.string().uuid(),
  ticket_number: z.string().regex(/^TKT-\d{5,}$/),
  entity_type: z.enum(['BUS', 'DEVICE']),
  entity_id: z.string(),
  entity_identifier: z.string(),
  title: z.string().min(3).max(150),
  description: z.string().max(1000),
  severity: maintenanceTicketSeveritySchema,
  status: maintenanceTicketStatusSchema,
  source: z.enum(['AUTO_ALERT', 'COORDINATOR', 'TECHNICIAN']),
  assigned_to: z.string().nullable(),
  resolution_note: z.string().max(1000).nullable(),
  created_at: z.string().datetime({ offset: true }),
  resolved_at: z.string().datetime({ offset: true }).nullable(),
});
export type MaintenanceTicketRecord = z.infer<typeof maintenanceTicketRecordSchema>;

export const firmwareRolloutStageSchema = z.enum([
  'CANARY_5',
  'FLEET_25',
  'FULL_100',
  'COMPLETED',
  'PAUSED',
]);
export type FirmwareRolloutStage = z.infer<typeof firmwareRolloutStageSchema>;

export const firmwareRolloutRecordSchema = z.object({
  id: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  sha256: z.string().length(64),
  size_bytes: z.number().int().positive(),
  stage: firmwareRolloutStageSchema,
  buses_targeted: z.number().int().min(0),
  buses_updated: z.number().int().min(0),
  buses_failed: z.number().int().min(0),
  started_at: z.string().datetime({ offset: true }),
  last_stage_transition_at: z.string().datetime({ offset: true }),
  is_paused: z.boolean(),
  pause_reason: z.string().nullable(),
});
export type FirmwareRolloutRecord = z.infer<typeof firmwareRolloutRecordSchema>;

export const auditLogRecordSchema = z.object({
  id: z.string().uuid(),
  actor_id: z.string(),
  actor_email: z.string().email(),
  actor_role: userRoleSchema,
  action: z.string().min(2).max(64),
  entity_type: z.string().min(2).max(64),
  entity_id: z.string(),
  old_value: z.record(z.unknown()).nullable(),
  new_value: z.record(z.unknown()).nullable(),
  reason: z.string().nullable(),
  ip_address: z.string(),
  recorded_at: z.string().datetime({ offset: true }),
});
export type AuditLogRecord = z.infer<typeof auditLogRecordSchema>;

export const systemSettingRecordSchema = z.object({
  key: z.string(),
  default_value: z.union([z.string(), z.number(), z.boolean()]),
  current_value: z.union([z.string(), z.number(), z.boolean()]),
  section: z.string(),
  description: z.string(),
  last_modified_by: z.string(),
  last_modified_at: z.string().datetime({ offset: true }),
  change_reason: z.string(),
});
export type SystemSettingRecord = z.infer<typeof systemSettingRecordSchema>;
