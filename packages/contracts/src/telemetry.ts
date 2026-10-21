import { z } from 'zod';

export const locationSampleSchema = z.object({
  seq: z.number().int().positive(),
  recorded_at: z.string().datetime({ offset: true }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed_kmh: z.number().min(0).max(150),
  bearing: z.number().min(0).max(360).optional(),
  altitude_m: z.number().min(-100).max(5000).optional(),
  gps_valid: z.boolean(),
  hdop: z.number().min(0.1).max(50),
  satellites: z.number().int().min(0).max(32),
  ignition: z.boolean(),
  battery_mv: z.number().int().min(0).max(35000),
});

export type LocationSample = z.infer<typeof locationSampleSchema>;

export const hardwareEventSchema = z.object({
  seq: z.number().int().positive(),
  type: z.string().min(1).max(32),
  triggered_at: z.string().datetime({ offset: true }),
  payload: z.record(z.unknown()).optional(),
});

export type HardwareEvent = z.infer<typeof hardwareEventSchema>;

export const telemetryPayloadSchema = z.object({
  device_id: z.string().regex(/^HW_[0-9A-Z]{3,4}$/, 'Invalid device ID format'),
  boot_id: z.string().min(1).max(64),
  firmware_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid firmware version format'),
  samples: z.array(locationSampleSchema).max(50),
  events: z.array(hardwareEventSchema).max(20).optional().default([]),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export const heartbeatPayloadSchema = z.object({
  device_id: z.string().regex(/^HW_[0-9A-Z]{3,4}$/, 'Invalid device ID format'),
  boot_id: z.string().min(1).max(64),
  firmware_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid firmware version format'),
  timestamp: z.string().datetime({ offset: true }),
  gps_status: z.enum(['NO_FIX', 'FIX_2D', 'FIX_3D']),
  satellites: z.number().int().min(0).max(32),
  hdop: z.number().min(0.1).max(50),
  rssi_dbm: z.number().int().min(-140).max(0),
  cellular_rat: z.string().min(1).max(16).optional().default('LTE'),
  battery_mv: z.number().int().min(0).max(35000),
  internal_battery_mv: z.number().int().min(0).max(5000).optional(),
  temperature_c: z.number().min(-40).max(105).optional(),
  ignition: z.boolean(),
  buffer_count: z.number().int().min(0).optional().default(0),
});

export type HeartbeatPayload = z.infer<typeof heartbeatPayloadSchema>;

export const rejectedSampleSchema = z.object({
  seq: z.number().int().positive(),
  reason: z.string().min(1),
});

export type RejectedSample = z.infer<typeof rejectedSampleSchema>;

export const eventResultSchema = z.object({
  seq: z.number().int().positive(),
  status: z.enum(['ACCEPTED', 'DUPLICATE', 'IGNORED']),
  incident_id: z.string().uuid().optional(),
});

export type EventResult = z.infer<typeof eventResultSchema>;

export const telemetryAckResponseSchema = z.object({
  ack_seq: z.number().int().min(0),
  rejected: z.array(rejectedSampleSchema),
  event_results: z.array(eventResultSchema),
  config: z.object({
    hw_moving_interval_s: z.number().int().positive(),
    hw_stopped_interval_s: z.number().int().positive(),
    hw_parked_heartbeat_s: z.number().int().positive(),
  }),
  server_time: z.string().datetime({ offset: true }),
});

export type TelemetryAckResponse = z.infer<typeof telemetryAckResponseSchema>;
