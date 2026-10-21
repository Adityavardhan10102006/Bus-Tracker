# Phase Plan: Phase P5 — Arrival Estimation, Service Notifications & Attendance (Milestone M5)

**Governing Master Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P5)  
**Authoritative Rules**: `AGENTS.md` (Part B)  
**Conflict Register**: [`docs/decisions/conflicts.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/conflicts.md) (Conflict C-06, Decision 4)  
**Phase ID**: `P5`  
**Milestone**: `M5`  
**Status**: IN PROGRESS / IMPLEMENTATION  

---

## 1. Specification Sections Read & Verified

Per **AGENTS.md B.9 step 1**, all specification sections cited for Phase P5 have been reviewed:

- [x] **Section 17.5 & Part I.5**: Arrival estimation (ETA) rules: speed calculation window (`eta.speed_window_min = 5`), distance along route geometry, unavailable state handling, zero fake or simulated times.
- [x] **Section 18.1 to 18.5**: Student boarding verification, scan validation (8 steps), manual check-in (`LATE_BOARDED`), non-passenger guests (`FLAGGED_GUEST`), boarding window (`boarding.window_before_min = 10`, `boarding.window_after_min = 15`), immutable records.
- [x] **Section 18.6**: Absence alert evaluator: morning `BOARDED` or `LATE_BOARDED` and afternoon `ABSENT` flags `absence_alerts` for primary faculty.
- [x] **Section 18.7**: Leave marking until 30 minutes before departure (`leave.cutoff_before_trip_min = 30`).
- [x] **Section 21.1 to 21.6**: Service alerts, proximity arrival alerts (`approach.default_min = 5`, range 2–15m), delay notices, deduplication window (`notify.group_window_s = 120`), rate limits (`notify.push_per_hour = 6`), quiet hours (22:00 to 06:00), `SAFETY` category unmutable (`R-11`).
- [x] **Section 22**: Operational alerts catalogue.
- [x] **Section 25**: Background jobs: `boarding-cutoff` and `absence-evaluator`.
- [x] **Conflict C-06 & Decision 4**: Resolution boundary: Standalone driver rotating QR code generation suspended; fixed vehicle QR placard, RFID tapper, and manual faculty check-in supported.

---

## 2. Planned Tasks Breakdown

| Task ID | Task Scope | Files Touched / Created | Verification & Tests Planned | Spec Sections |
|---|---|---|---|---|
| `P5-T1` | **Attendance Check-In Architecture (C-06 Boundary)**: Define supported check-in paths (fixed vehicle QR, hardware RFID tap, faculty check-in). Explicitly suspend driver phone rotating QR generation pending Decision 4 disposition. | `packages/domain/src/attendance.ts`, `docs/decisions/conflicts.md` | `attendance-c06.spec.ts` | Spec 18.1; Conflict C-06; Dec 4 |
| `P5-T2` | **8-Step Boarding Scan Validation Pipeline**: Pure validation function enforcing order: session auth, HMAC decode, slot window, active trip check, on-route check, duplicate check, boarding window open, write `BOARDED`. | `packages/domain/src/scan-validator.ts` | `scan-validator.spec.ts` | Spec 18.2 |
| `P5-T3` | **Manual Check-In & Audited Correction**: Coordinator/faculty manual check-in (`LATE_BOARDED` with reason, `FLAGGED_GUEST` non-passenger tracking), immutable audit row per correction. | `packages/domain/src/attendance-correction.ts` | `attendance-correction.spec.ts` | Spec 18.3, 18.4 |
| `P5-T4` | **Attendance State Machine & Immutability**: Enforce valid status transitions (`EXPECTED` -> `BOARDED` / `LATE_BOARDED` / `ON_LEAVE` / `ABSENT`). Hard delete prohibition (records never deleted). | `packages/domain/src/attendance-state-machine.ts` | `attendance-fsm.spec.ts` | Spec 18.4 |
| `P5-T5` | **Boarding Window Evaluator**: Pure evaluator determining if boarding window is open (`boarding.window_before_min = 10`, `boarding.window_after_min = 15`) relative to scheduled or actual departure. | `packages/domain/src/boarding-window.ts` | `boarding-window.spec.ts` | Spec 18.5 |
| `P5-T6` | **Boarding Cutoff Job Logic**: Automated evaluator setting `ABSENT` for remaining `EXPECTED` records after boarding window closes. Idempotent. | `packages/domain/src/boarding-cutoff.ts` | `boarding-cutoff.spec.ts` | Spec 18.5, 25 |
| `P5-T7` | **Absence Alert Evaluator**: Identifies students with morning check-in (`BOARDED` or `LATE_BOARDED`) and afternoon `ABSENT`. Generates `absence_alerts` row and notifies assigned faculty. Closes with `BOARDED_LATE` if boarded before acknowledgment. | `packages/domain/src/absence-evaluator.ts` | `absence-evaluator.spec.ts` | Spec 18.6, 25 |
| `P5-T8` | **Arrival Estimation (ETA) Engine**: Computes distance along route polyline, applies 5-minute rolling speed (`eta.speed_window_min = 5`), clamp speed (15-60 km/h, fallback 25 km/h). Sets `null` / `—` if bus is `STALE` (>60s), `UNAVAILABLE`, `NOT_RUNNING`, or off-corridor (>300m). | `packages/domain/src/eta-engine.ts` | `eta-engine.spec.ts` | Spec 17.5; UI-SPEC 5 |
| `P5-T9` | **Service Notification & Dispatch Pipeline**: Generates approaching stop alerts (`approach.default_min = 5`), schedule delays (>10 min), and emergency broadcasts. Implements deduplication (120s window), rate limiting (6/hr), quiet hours (22:00-06:00), and unmutable `SAFETY` delivery (Rule `R-11`). | `packages/domain/src/notification-engine.ts` | `notification-engine.spec.ts` | Spec 21.1–21.6; Rule R-11 |
| `P5-T10` | **Integration API Endpoints**: Add `/api/v1/attendance/scan`, `/api/v1/attendance/check-in`, `/api/v1/eta/route`, `/api/v1/notifications/dispatch` in `services/api`. | `services/api/src/routes/attendance.ts`, `services/api/src/routes/eta.ts`, `services/api/src/routes/notifications.ts` | `attendance-routes.spec.ts` | Spec 26.7 |

---

## 3. Preconditions & Boundaries

1. **Zero Mock Data (Rule B.2)**: All tests use disposable fixtures created inside test files. No placeholder ETAs or mock student check-ins.
2. **Conflict C-06 Boundary**: Driver mobile rotating QR generation is stopped and reported as an open decision. Only approved alternatives (placards, RFID, faculty check-in) are operational.
3. **Truthful ETA (Rule 263)**: When GPS signals are stale (>60s) or offline, ETA returns `null` (displayed as `—`), never a speculative prediction.
4. **Safety Rule R-11**: Safety emergency broadcasts bypass all notification filters, quiet hours, and muting settings.
