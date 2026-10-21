import type { TelemetryAckResponse } from '@vjit/contracts';

export interface ResponseBuilderParams {
  ackSeq: number;
  rejected: Array<{ seq: number; reason: string }>;
  eventResults: Array<{
    seq: number;
    status: 'ACCEPTED' | 'DUPLICATE' | 'IGNORED';
    incident_id?: string | undefined;
  }>;
  operationalIntervals?: {
    movingIntervalSeconds?: number;
    stoppedIntervalSeconds?: number;
    parkedHeartbeatSeconds?: number;
  };
  serverTime?: Date;
}

/**
 * Builds the official TelemetryAckResponse structure
 * Implements Specification 11.3 & Task P1-T6
 */
export function buildTelemetryAckResponse(params: ResponseBuilderParams): TelemetryAckResponse {
  const intervals = params.operationalIntervals ?? {};
  const serverTime = params.serverTime ?? new Date();

  return {
    ack_seq: params.ackSeq,
    rejected: params.rejected,
    event_results: params.eventResults.map(e => {
      const res: {
        seq: number;
        status: 'ACCEPTED' | 'DUPLICATE' | 'IGNORED';
        incident_id?: string;
      } = {
        seq: e.seq,
        status: e.status,
      };
      if (e.incident_id) {
        res.incident_id = e.incident_id;
      }
      return res;
    }),
    config: {
      hw_moving_interval_s: intervals.movingIntervalSeconds ?? 10,
      hw_stopped_interval_s: intervals.stoppedIntervalSeconds ?? 30,
      hw_parked_heartbeat_s: intervals.parkedHeartbeatSeconds ?? 600,
    },
    server_time: serverTime.toISOString(),
  };
}
