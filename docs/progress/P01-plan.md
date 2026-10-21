# Phase Plan: Phase P1 — Ingestion Engine & GPS Hardware Telemetry Integration (Milestone M1)

**Governing Master Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P1)  
**Authoritative Rules**: `AGENTS.md` (Part B)  
**Hardware Specification**: [`HW-INT-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/hardware-integration-specification.md)  
**UI Specification**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md)  
**Phase ID**: `P1`  
**Milestone**: `M1`  
**Status**: IN PROGRESS / IMPLEMENTATION  

---

## 1. Specification Sections Read & Verified

Per **AGENTS.md B.9 step 1**, all specification sections cited for Phase P1 in `AG-MASTER-1.0-v2-College-Bus-Tracker.md` have been reviewed:

- [x] **Section 5**: Permissions matrix for device and ingestion routes (`POST /api/v1/telemetry`, `POST /api/v1/heartbeat`, `POST /api/v1/devices/token/rotate`).
- [x] **Section 9**: Business rules for data freshness, stale flags, and offline handling (`R-01` to `R-20`).
- [x] **Section 10.5**: Database telemetry tables: `location_samples`, `device_heartbeats`, `device_events`, `device_bus_links`, `sos_incidents`.
- [x] **Section 11 (All)**: Ingestion engine, device authentication, telemetry payload validation, duplicate guards, acknowledgment responses, heartbeat handling, and rate limits.
- [x] **Section 12 (All)**: Hardware event taxonomy: `SOS`, `GPS_LOST`, `GPS_RECOVERED`, `IGNITION_ON`, `IGNITION_OFF`, `POWER_DISCONNECTED`, `LOW_VEHICLE_BATTERY`, `BOOT`, `TAMPER`.
- [x] **Section 13 (All)**: Source selector, anti-flapping controls, device-to-bus linking rules.
- [x] **Section 14**: Bus tracking states (`LIVE_HW`, `LIVE_PHONE`, `STALE`, `UNAVAILABLE`, `NOT_RUNNING`).
- [x] **Section 17.3**: Real-time position pipeline and client delivery contract.
- [x] **Section 25**: Background jobs: `device-health-checker`, `stale-checker`, `rate-cleaner`.
- [x] **Section 26.2 & 26.3**: Ingestion and device administration route specifications.
- [x] **Section 30**: Non-functional requirements: Ingestion throughput ($\ge 200$ req/s), latency ($p95 \le 300$ ms).
- [x] **Section 32.2 & 32.3**: Simulator scenarios, contract replay harness, and critical test cases.

---

## 2. Planned Tasks Breakdown

| Task ID | Task Scope | Files Touched / Created | Verification & Tests Planned | Spec Sections |
|---|---|---|---|---|
| `P1-T1` | Contracts Package: Telemetry envelope, samples, heartbeat, events, ack responses, config options, unknown field rejection. | `packages/contracts/src/telemetry.ts` | `contracts.spec.ts` | Spec 11.3, 11.6, 11.7; HW-INT 4 |
| `P1-T2` | Device Authentication: Bearer token format (43-char base64url), HMAC-SHA256 lookup, active key versions (`v1`, `v2`), device status (Conflict C-01), zero plaintext logging. | `packages/domain/src/device-auth.ts`, `packages/auth/src/device.ts` | `device-auth.spec.ts` | Spec 11.1; Conflict C-01; HW-INT 3 |
| `P1-T3` | 14-Step Validation Pipeline: Pure functions for range, timestamps, deduplication, null island, service area, plausibility jump, clock skew. | `packages/domain/src/pipeline.ts`, `packages/domain/src/validation.ts` | `pipeline.spec.ts` | Spec 11.5; HW-INT 7 |
| `P1-T4` | Device-Bus Association & Linking: Open link evaluation (`valid_from` to `valid_to`), unlinked handling (`bus_id = null`), device reassignment. | `packages/domain/src/device-linking.ts` | `device-linking.spec.ts` | Spec 13.1, 11.1; HW-INT 9 |
| `P1-T5` | Duplicate Guard & Out-of-Order Recovery: Deduplication key `(device_id, boot_id, seq)`, conflict detection, replay tolerance. | `packages/domain/src/dedupe.ts` | `dedupe.spec.ts` | Spec 11.5, 11.2; HW-INT 8 |
| `P1-T6` | Response Builder: `ack_seq`, per-sample rejections, `event_results` with `incident_id`, dynamic device intervals, UTC server time. | `packages/domain/src/response-builder.ts` | `response-builder.spec.ts` | Spec 11.3; HW-INT 4.3 |
| `P1-T7` | Heartbeat & Health State Machine: Heartbeat endpoint, health calculation (`ONLINE`, `DELAYED`, `OFFLINE`), remote commands (`NONE`, `UPDATE_CONFIG`, `REBOOT`). | `packages/domain/src/health-evaluator.ts` | `health-evaluator.spec.ts` | Spec 11.6; HW-INT 5 |
| `P1-T8` | Emergency SOS & Hardware Events: High-priority SOS handling, deduplication within 60s, automated incident generation. | `packages/domain/src/events.ts` | `events.spec.ts` | Spec 12, 19; HW-INT 6 |
| `P1-T9` | Device Token Rotation: Rotation request, 24-hour expiration window, atomic swap on first use. | `packages/domain/src/token-rotation.ts` | `token-rotation.spec.ts` | Spec 11.1; HW-INT 3.3 |
| `P1-T10` | Ingestion HTTP Routes: `POST /api/v1/telemetry`, `POST /api/v1/heartbeat`, `POST /api/v1/devices/token/rotate` in `services/api`. | `services/api/src/routes/telemetry.ts`, `services/api/src/routes/heartbeat.ts`, `services/api/src/main.ts` | `telemetry-route.spec.ts` | Spec 26.2, 26.3; HW-INT 4 |
| `P1-T11` | Contract Replay Harness & Simulator Integration: Automated test suite replaying hardware message traces. | `tests/contract/replay.spec.ts` | Automated replay test suite | Spec 32.2, 32.3; HW-INT 12 |

---

## 3. Preconditions & Readiness Verification

- [x] `Phase P0` foundation committed (`commit 28b324b`) with 54 passing unit tests and clean automated checks.
- [x] Governing rules in `AGENTS.md` strictly verified (Rule B.2, R-M1 to R-M10, Rule B.7).
- [x] Hardware telemetry contract `HW-INT-1.0` approved as technical integration baseline.
- [x] Conflict `C-01` resolved (PROVISIONED devices allowed on first valid request with token issued at provisioning; sets ACTIVE).
- [x] Testing separation established: Automated unit tests vs simulated hardware traces vs physical bench/field tests.
