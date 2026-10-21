import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  processTelemetryBatch,
  evaluateHardwareEvent,
  resolveActiveBusForDevice,
  buildTelemetryAckResponse,
} from '../../packages/domain/dist/index.js';

describe('Hardware Message Simulation & Offline Recovery Harness (HW-INT-1.0 Section 8)', () => {
  const serverReceivedAt = new Date('2026-10-21T08:30:00.000Z');

  test('Simulated Scenario 1: Standard moving bus transmit at 10s cadence', () => {
    // 3 successive 10-second updates along Chevella Road towards VJIT campus
    const simulatedStream = [
      {
        seq: 101,
        recorded_at: '2026-10-21T08:29:40.000Z',
        latitude: 17.3580,
        longitude: 78.3200,
        speed_kmh: 38.0,
        gps_valid: true,
        hdop: 1.1,
        satellites: 10,
        ignition: true,
        battery_mv: 12600,
      },
      {
        seq: 102,
        recorded_at: '2026-10-21T08:29:50.000Z',
        latitude: 17.3600,
        longitude: 78.3220,
        speed_kmh: 40.0,
        gps_valid: true,
        hdop: 1.1,
        satellites: 10,
        ignition: true,
        battery_mv: 12580,
      },
      {
        seq: 103,
        recorded_at: '2026-10-21T08:30:00.000Z',
        latitude: 17.3616,
        longitude: 78.3245, // VJIT Gate
        speed_kmh: 15.0,
        gps_valid: true,
        hdop: 1.0,
        satellites: 11,
        ignition: true,
        battery_mv: 12550,
      },
    ];

    const result = processTelemetryBatch(simulatedStream, { serverReceivedAt });
    assert.equal(result.outcomes.length, 3);
    assert.equal(result.ackSeq, 103);
    assert.equal(result.rejectedList.length, 0);
    assert.equal(result.latestLiveSample?.seq, 103);
    assert.equal(result.latestLiveSample?.latitude, 17.3616);
  });

  test('Simulated Scenario 2: Cellular dead-zone loss & buffered recovery flush', () => {
    // Bus traversed a 15-minute cellular dead zone. 5 samples were buffered in flash memory.
    const bufferedBatch = [
      {
        seq: 201,
        recorded_at: '2026-10-21T08:14:00.000Z', // 16 min ago (buffered)
        latitude: 17.3400,
        longitude: 78.3000,
        speed_kmh: 45.0,
        gps_valid: true,
        hdop: 1.5,
        satellites: 8,
        ignition: true,
        battery_mv: 12500,
      },
      {
        seq: 202,
        recorded_at: '2026-10-21T08:17:00.000Z', // 13 min ago (buffered)
        latitude: 17.3450,
        longitude: 78.3050,
        speed_kmh: 42.0,
        gps_valid: true,
        hdop: 1.4,
        satellites: 8,
        ignition: true,
        battery_mv: 12480,
      },
      {
        seq: 203,
        recorded_at: '2026-10-21T08:29:55.000Z', // 5s ago (live upon reconnection)
        latitude: 17.3610,
        longitude: 78.3240,
        speed_kmh: 20.0,
        gps_valid: true,
        hdop: 1.1,
        satellites: 10,
        ignition: true,
        battery_mv: 12550,
      },
    ];

    const result = processTelemetryBatch(bufferedBatch, { serverReceivedAt });
    assert.equal(result.ackSeq, 203);

    // Samples 201 & 202 are accepted as buffered history
    assert.equal(result.outcomes[0]?.isBuffered, true);
    assert.equal(result.outcomes[0]?.isLiveEligible, false);

    assert.equal(result.outcomes[1]?.isBuffered, true);
    assert.equal(result.outcomes[1]?.isLiveEligible, false);

    // Sample 203 is accepted as live
    assert.equal(result.outcomes[2]?.isBuffered, false);
    assert.equal(result.outcomes[2]?.isLiveEligible, true);
    assert.equal(result.latestLiveSample?.seq, 203);
  });

  test('Simulated Scenario 3: Delayed out-of-order sequence arrival', () => {
    // Packets arrived out of sequence over cellular UDP/TCP retry
    const outOfOrderSamples = [
      {
        seq: 303,
        recorded_at: '2026-10-21T08:29:50.000Z',
        latitude: 17.3600,
        longitude: 78.3220,
        speed_kmh: 30.0,
        gps_valid: true,
        hdop: 1.2,
        satellites: 9,
        ignition: true,
        battery_mv: 12500,
      },
      {
        seq: 301,
        recorded_at: '2026-10-21T08:29:30.000Z',
        latitude: 17.3550,
        longitude: 78.3180,
        speed_kmh: 35.0,
        gps_valid: true,
        hdop: 1.2,
        satellites: 9,
        ignition: true,
        battery_mv: 12520,
      },
      {
        seq: 302,
        recorded_at: '2026-10-21T08:29:40.000Z',
        latitude: 17.3575,
        longitude: 78.3200,
        speed_kmh: 32.0,
        gps_valid: true,
        hdop: 1.2,
        satellites: 9,
        ignition: true,
        battery_mv: 12510,
      },
    ];

    // Pipeline sorts by sequence number
    const result = processTelemetryBatch(outOfOrderSamples, { serverReceivedAt });
    assert.equal(result.ackSeq, 303);
    assert.equal(result.outcomes[0]?.seq, 301);
    assert.equal(result.outcomes[1]?.seq, 302);
    assert.equal(result.outcomes[2]?.seq, 303);
  });

  test('Simulated Scenario 4: In-bus SOS panic button trigger during transit', () => {
    const sosEvent = {
      seq: 10,
      type: 'SOS',
      triggered_at: '2026-10-21T08:29:59.000Z',
    };

    const locationSample = {
      seq: 401,
      recorded_at: '2026-10-21T08:29:59.000Z',
      latitude: 17.3616,
      longitude: 78.3245,
      speed_kmh: 0.0,
      gps_valid: true,
      hdop: 1.0,
      satellites: 11,
      ignition: true,
      battery_mv: 12400,
    };

    const batchResult = processTelemetryBatch([locationSample], { serverReceivedAt });
    const eventResult = evaluateHardwareEvent(sosEvent, 'bus-vjit-08', serverReceivedAt, []);

    const ack = buildTelemetryAckResponse({
      ackSeq: batchResult.ackSeq,
      rejected: batchResult.rejectedList,
      eventResults: [eventResult],
      serverTime: serverReceivedAt,
    });

    assert.equal(ack.ack_seq, 401);
    assert.equal(ack.event_results.length, 1);
    assert.equal(ack.event_results[0]?.status, 'ACCEPTED');
    assert.ok(ack.event_results[0]?.incident_id); // Generated emergency incident
  });
});
