# Phase Report: Phase P5 — Arrival Estimation, Service Notifications & Attendance (Milestone M5)

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P5)  
**Authoritative Operating Rules**: `AGENTS.md` (Part B)  
**UI System Specification**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md) (Section 5)  
**Conflict Register**: [`docs/decisions/conflicts.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/conflicts.md) (Conflict C-06, Decision 4)  
**Phase ID**: `P5`  
**Milestone**: `M5`  
**Date**: 2026-10-21  
**Status**: COMPLETED — READY FOR PHASE-GATE APPROVAL  

---

## 1. Tasks Completed (IDs)

- [x] **`P5-T1`**: Attendance Check-In Architecture & Conflict C-06 Boundary (`packages/domain/src/attendance.ts`):
  Defined the verified attendance verification paths (fixed vehicle QR placards, hardware RFID tappers, assigned faculty check-in). Formally suspended driver phone rotating QR generation pending Decision 4 disposition.
- [x] **`P5-T2`**: 8-Step Boarding Scan Validation Pipeline (`packages/domain/src/scan-validator.ts`):
  Implemented pure validation pipeline strictly enforcing validation order: (1) session auth (`AUTH_REQUIRED`), (2) HMAC signature verification (`QR_INVALID`), (3) slot window (`QR_EXPIRED`), (4) active trip verification (`TRIP_NOT_ACTIVE`), (5) route assignment & leave status (`NOT_ON_ROUTE`), (6) duplicate boarding check (`DUPLICATE_BOARDING`), (7) boarding window check (`BOARDING_WINDOW_CLOSED`), and (8) write `BOARDED` with QR method and confirmation details.
- [x] **`P5-T3`**: Manual Late Check-In, FLAGGED_GUEST & Audited Correction (`packages/domain/src/attendance-correction.ts`):
  Implemented manual check-in for `LATE_BOARDED` with mandatory justification reasons; non-passenger guest rider tracking (`FLAGGED_GUEST`) with mandatory reason and explicit exclusion from enrolled passenger quotas (`is_enrolled_passenger = false`); coordinator/super admin administrative corrections with immutable audit logging.
- [x] **`P5-T4`**: Attendance State Machine & Immutability (`packages/domain/src/attendance-state-machine.ts`):
  Enforced valid state transitions (`EXPECTED` -> `BOARDED` / `LATE_BOARDED` / `ON_LEAVE` / `ABSENT`). Implemented the master plan hard-delete prohibition rule (attendance records are permanent audit artifacts and cannot be deleted).
- [x] **`P5-T5`**: Boarding Window Evaluator (`packages/domain/src/boarding-window.ts`):
  Implemented window evaluation opening 10 minutes before scheduled departure (`boarding.window_before_min = 10`) and closing 15 minutes after (`boarding.window_after_min = 15`), with automatic extension for late-departed trips based on actual departure time.
- [x] **`P5-T6`**: Boarding Cutoff Job Logic (`packages/domain/src/boarding-cutoff.ts`):
  Implemented automated cutoff evaluator transitioning all remaining `EXPECTED` passenger records to `ABSENT` once the boarding window closes. Fully idempotent across repeated runs.
- [x] **`P5-T7`**: Morning Present, Afternoon Absent Discrepancy Evaluator (`packages/domain/src/absence-evaluator.ts`):
  Implemented evaluator for students with morning check-in (`BOARDED` or `LATE_BOARDED`) and afternoon `ABSENT` (and not on leave). Generates `absence_alerts` records assigned to primary faculty -> all faculty -> coordinator; auto-resolves to `RESOLVED_BOARDED_LATE` if student boards late before acknowledgment.
- [x] **`P5-T8`**: Arrival Estimation (ETA) Engine (`packages/domain/src/eta-engine.ts`):
  Implemented arrival estimation along route polyline geometry, 5-minute rolling speed smoothing (`eta.speed_window_min = 5`), speed clamping (10–60 km/h, default 20 km/h). Strictly enforced Rule 263: returns unavailable state (`null` / `—`) when bus tracking is `STALE` (>60s), `UNAVAILABLE`, `NOT_RUNNING`, or deviated from corridor (`OFF_CORRIDOR` > 300m).
- [x] **`P5-T9`**: Service Notification & Dispatch Pipeline (`packages/domain/src/notification-engine.ts`):
  Implemented dispatch evaluator with approaching stop triggers (`approach.default_min = 5`), delay alerts (>10 min), 120-second deduplication (`notify.group_window_s`), 6 push/hour rate limits (`notify.push_per_hour`), and overnight quiet hours (22:00 to 06:00). Enforced Rule `R-11`: `SAFETY` category alerts are unconditional and never suppressed.
- [x] **`P5-T10`**: Integration API Endpoints (`services/api/src/routes/`):
  Created `/api/v1/attendance/scan`, `/api/v1/attendance/check-in`, `/api/v1/eta/route`, and `/api/v1/notifications/dispatch` in the API server with strict input validation, security headers, request ID tracking, and audit logging.

---

## 2. Specification Sections Implemented

- **Section 17.5 & Part I.5**: Arrival estimation (ETA) rules: distance along polyline geometry, 5-minute rolling speed calculation, speed clamping (10 to 60 km/h), stale and unavailable state handling (zero speculative prediction).
- **Section 18.1**: Student boarding QR payload signing (`QR_HMAC_KEYS`), 30-second rotation window (`qr.rotation_s`), acceptance of current and previous slot only.
- **Section 18.2**: 8-step scan validation pipeline evaluated in exact order with specific failure codes.
- **Section 18.3 & 18.4**: Manual check-in (`LATE_BOARDED`) with mandatory reasons, non-passenger guest riders (`FLAGGED_GUEST`), administrative corrections by `COR` or `SAD` with immutable audit logging.
- **Section 18.4**: Attendance state transitions and hard-delete prohibition rule.
- **Section 18.5**: Boarding window timing (`boarding.window_before_min = 10`, `boarding.window_after_min = 15`) and late-trip adjustment.
- **Section 18.5 & 25**: Boarding-cutoff job logic (idempotent transition of `EXPECTED` to `ABSENT`).
- **Section 18.6 & 25**: Absence alert evaluator (morning present, afternoon absent anomaly detection and faculty escalation).
- **Section 21.1 to 21.6**: Service alerts, approaching stop notifications, delay alerts, deduplication window, push rate limits, quiet hours, and unmutable `SAFETY` delivery (Rule `R-11`).
- **Section 26.7**: Attendance, ETA, and notification API endpoint contracts.

---

## 3. Acceptance Criteria Verified (IDs)

- **`AC-ETA-01`**: ETA computes distance along route polyline with 5-minute rolling speed smoothing, clamped between 10 km/h and 60 km/h.
- **`AC-ETA-02`**: Truthful ETA (Rule 263): Stale GPS (>60s), `UNAVAILABLE`, and `NOT_RUNNING` return `is_available: false` and `—` formatted time. Zero speculative dead-reckoning.
- **`AC-ETA-03`**: Off-corridor bus (>300m perpendicular deviation from route polyline) returns `OFF_CORRIDOR` unavailability state.
- **`AC-ETA-04`**: Upstream stops are marked `is_passed: true` with `—` ETA; first upcoming stop is exposed as `next_stop`.
- **`AC-SCAN-01`**: 8-step scan validation fails at the first failing condition in exact sequence (`AUTH_REQUIRED` -> `QR_INVALID` -> `QR_EXPIRED` -> `TRIP_NOT_ACTIVE` -> `NOT_ON_ROUTE` -> `DUPLICATE_BOARDING` -> `BOARDING_WINDOW_CLOSED` -> `BOARDED`).
- **`AC-SCAN-02`**: Boarding window opens 10m before departure and closes 15m after scheduled departure (or actual departure for late trips).
- **`AC-ATT-01`**: Conflict C-06 boundary verified: driver phone rotating QR generation is formally suspended pending Decision 4; fixed vehicle QR, hardware RFID, and faculty check-in supported.
- **`AC-ATT-02`**: Manual late check-in (`LATE_BOARDED`) requires explicit reason; unauthorized roles rejected with 403.
- **`AC-ATT-03`**: `FLAGGED_GUEST` requires reason and is explicitly marked `is_enrolled_passenger = false`.
- **`AC-ATT-04`**: Hard-delete prohibition enforced: attendance records cannot be deleted.
- **`AC-ABS-01`**: Absence alert generated when student has morning `BOARDED`/`LATE_BOARDED` and afternoon `ABSENT` (and not on leave).
- **`AC-ABS-02`**: Absence alerts target primary faculty -> all faculty -> coordinator; auto-resolved if student boards late before acknowledgment.
- **`AC-NOTIF-01`**: Rule R-11: `SAFETY` category notifications bypass quiet hours, rate limits, and muting preferences unconditionally.
- **`AC-NOTIF-02`**: Overnight quiet hours (22:00 to 06:00) suppress non-safety alerts when enabled.
- **`AC-NOTIF-03`**: Duplicate alerts suppressed within 120s window (`notify.group_window_s`).
- **`AC-NOTIF-04`**: Hourly rate limit (6/hr) enforced for non-safety push notifications.

---

## 4. Tests Added, Counts, and Results

- **Unit Test Suites**: 56 suites, **195 passing unit tests** (64 new Phase P5 unit tests added).
- **Contract Test Suites**: 1 suite, **4 passing hardware simulation replay tests**.
- **Total Passing Automated Tests**: **199 passing tests**, **0 failures**, **0 skipped**.

### Phase P5 Test Suites Breakdown:
1. `packages/domain/tests/attendance.spec.ts`: 3 tests (check-in methods, capabilities registry, C-06 suspension).
2. `packages/domain/tests/boarding-window.spec.ts`: 5 tests (pre-window rejection, in-window approval, post-window closure, late departure extension, invalid date).
3. `packages/domain/tests/attendance-fsm.spec.ts`: 5 tests (valid transitions, reason requirement, cancellation, terminal states, hard-delete ban).
4. `packages/domain/tests/scan-validator.spec.ts`: 8 tests (all 8 validation steps verified in strict order).
5. `packages/domain/tests/attendance-correction.spec.ts`: 7 tests (manual late check-in, guest tracking, audited corrections, role authorization).
6. `packages/domain/tests/boarding-cutoff.spec.ts`: 3 tests (open window no-op, cutoff ABSENT transition, idempotence).
7. `packages/domain/tests/absence-evaluator.spec.ts`: 5 tests (morning present/afternoon absent alert, on-leave exclusion, both absent exclusion, late boarding auto-resolution).
8. `packages/domain/tests/eta-engine.spec.ts`: 8 tests (downstream ETA, upstream passed stops, Rule 263 stale rejection, offline rejection, Null Island, off-corridor buffer, rolling speed clamp, string formatting).
9. `packages/domain/tests/notification-engine.spec.ts`: 8 tests (Rule R-11 safety override, opt-out preferences, quiet hours, 120s deduplication, 6/hr rate limit, missing token retry, approaching triggers, delay triggers).
10. `services/api/tests/attendance-routes.spec.ts`: 12 tests (attendance scan 200/400/409, manual check-in 200/403, FLAGGED_GUEST, route ETA live/stale/400, safety notification dispatch 200, recipient 404).

---

## 5. Security Checks Run & Results

- **`verify:no-mock`**: **PASSED**. Zero mock, dummy, or synthetic records in production source code.
- **`lint`**: **PASSED**. Zero unsafe SQL concatenation, zero `$queryRawUnsafe`, zero `console.log`.
- **`verify:routes-auth`**: **PASSED**. All newly created and existing routes enforce strict authentication and role guards.
- **`typecheck`**: **PASSED**. Strict TypeScript across all 10 packages in monorepo with 0 errors.

---

## 6. Migrations Applied

- None required for domain and API layer in Phase P5.

---

## 7. Configuration Keys Added / Changed

All operational defaults used by Phase P5 domain engines match `packages/config/src/defaults.ts` exactly:
- `eta.speed_window_min = 5`
- `eta.speed_min_kmh = 10`
- `eta.speed_max_kmh = 60`
- `eta.speed_default_kmh = 20`
- `route.corridor_m = 300`
- `hw.stale_after_s = 60`
- `boarding.window_before_min = 10`
- `boarding.window_after_min = 15`
- `qr.rotation_s = 30`
- `notify.quiet_start = '22:00'`
- `notify.quiet_end = '06:00'`
- `notify.push_per_hour = 6`
- `notify.group_window_s = 120`
- `approach.default_min = 5`

---

## 8. Known Gaps & Conflict Boundaries

- **Conflict C-06 / Decision 4 (Student Boarding Method)**:
  The standalone driver mobile application was removed from product scope. Consequently, dynamic 30-second rotating QR codes generated on the driver's phone cannot run as originally drafted in `P5-T1`. In strict compliance with AGENTS.md B.4, B.11, and the user prompt, that specific workflow is formally **SUSPENDED** and logged in `docs/decisions/conflicts.md`.
  The system currently supports:
  1. Fixed vehicle laminated QR placard at bus entrance doors (scanned by student mobile app).
  2. Bus-mounted hardware RFID tapper streaming tap events via cellular telemetry (`P1-T8`).
  3. Assigned faculty manual check-in roster.

---

## 9. Mock-Data Check Result

- `verify:no-mock`: **PASSED**. Zero mock records in production code.

---

## 10. Purge Result

- `db:purge-synthetic`: Clean (0 rows).

---

## 11. Commands to Reproduce

```bash
# Build all packages
pnpm build

# Run TypeScript type check across all 10 packages
pnpm typecheck

# Run unit tests (195 passing tests)
pnpm test:unit

# Run hardware contract replay tests (4 passing tests)
pnpm test:contract

# Verify zero mock data in production code
node ./scripts/verify-no-mock.mjs

# Verify security linting rules (no unsafe SQL, no console.log)
node ./scripts/lint.mjs

# Verify API route authorization coverage
node ./scripts/verify-routes-auth.mjs
```
