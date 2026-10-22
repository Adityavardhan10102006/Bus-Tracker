# Master Coverage Gate Register (Part G)

This register implements **Part G** of `AG-MASTER-1.0-v2-College-Bus-Tracker.md`. It tracks every feature ID, business rule, acceptance criterion, endpoint, configuration key, test case, edge case, and operational requirement to guarantee that nothing is missed before the Phase P7 Release Gate.

> [!IMPORTANT]
> **Coverage Rule (Part G lines 518–537)**:  
> Before the release gate (Phase P7), every row below must name the Task ID that implements it, the automated test that verifies it, and its current status (`DONE`, `DEFERRED [Decision ID]`, or `BLOCKED [Conflict ID]`).

---

## 1. Feature Groups (Section 16 & Part C)

| Feature ID | Feature Description | Implementing Task | Verification Test | Status |
|---|---|---|---|---|
| **F-AUTH-01** | College SSO authentication over OIDC (Google Workspace / Entra ID) | `P0-T9` | `apps/mobile/tests/auth-state.spec.ts` | `DONE` |
| **F-AUTH-02** | Driver email OTP authentication (6-digit, 10 min, HMAC, rate limits) | `P0-T10` | `services/api/tests/api.spec.ts` | `BLOCKED [Conflict C-04 / C-06]` |
| **F-AUTH-03** | JWT access tokens & opaque refresh tokens with rotation & reuse detection | `P0-T11` | `apps/mobile/tests/auth-state.spec.ts` | `DONE` |
| **F-AUTH-04** | Admin TOTP MFA enrolment and single-use argon2-hashed recovery codes | `P0-T12` | `apps/web-console/tests/admin-security.spec.ts` | `DONE` |
| **F-AUTH-05** | Session lists and remote sign-out of other devices | `P0-T11` | `apps/mobile/tests/auth-state.spec.ts` | `DONE` |
| **F-AUTH-06** | User status checked on each request with <= 30s cache | `P0-T11`, `P4-T8` | `apps/web-console/tests/admin-security.spec.ts` | `DONE` |
| **F-AUTH-07** | Immediate session revocation on user deactivation | `P0-T11`, `P4-T8` | `apps/web-console/tests/admin-security.spec.ts` | `DONE` |
| **F-USR** | User management, role assignment, and secure streaming CSV imports | `P4-T8` | `apps/web-console/tests/admin-security.spec.ts` | `DONE` |
| **F-FLT** | Bus fleet management, document expiry alerts (fitness, insurance, pollution, permit) | `P4-T1` | `apps/web-console/tests/buses-compliance.spec.ts` | `DONE` |
| **F-RTE** | Route management, stops, stop deactivation, timetables, holiday calendar | `P4-T6` | `apps/web-console/tests/routes-and-timetables.spec.ts` | `DONE` |
| **F-ASG** | Route-bus assignments, driver rosters, faculty assignments, student routes | `P4-T6`, `P4-T7` | `apps/web-console/tests/routes-and-timetables.spec.ts` | `DONE` |
| **F-SHF** | Driver pre-trip checklist, start shift, standby tracking, end shift, idle timeout | `P3-T1`..`P3-T10` | Driver Mobile removed from scope | `BLOCKED [Conflict C-06]` |
| **F-TRK** | Hardware ingestion, source selector, snapshot API, live MapLibre map, ETA | `P1-T1`..`P1-T13`, `P2-T1`, `P5-T8` | `packages/domain/tests/eta-engine.spec.ts`, `tests/contract/*.spec.ts` | `DONE (Simulation / SW Verified)` |
| **F-ATT** | Boarding QR verification, scan validation, manual check-in, leave marking | `P5-T1`..`P5-T8` | `packages/domain/tests/scan-validator.spec.ts`, `services/api/tests/attendance-routes.spec.ts` | `DONE (C-06 Placard / RFID / Faculty)` |
| **F-SOS** | Multi-tier emergency SOS pipeline, 1s dedupe, 15s escalation job, auto-resolution | `P1-T8`, `P3-T12`, `E.10` | `packages/domain/tests/events.spec.ts`, `tests/contract/*.spec.ts` | `DONE` |
| **F-STP** | Student stop requests within corridor, duplicate detection, voting | `P2-T3` | `apps/mobile/tests/stop-requests.spec.ts` | `DONE` |
| **F-NTF** | In-app notification center, FCM push dispatch, quiet hours, Rule R-11 safety override | `P0-T15`, `P2-T8`, `P5-T9` | `packages/domain/tests/notification-engine.spec.ts` | `DONE` |
| **F-ADM** | Administrative web console, audit log viewer, settings management, tickets | `P4-T1`..`P4-T15` | `apps/web-console/tests/*.spec.ts` | `DONE` |
| **F-RPT** | Asynchronous report generation, presigned downloads, formula injection protection | `P6-T1`, `P6-T2` | [Pending Phase P6] | `PHASE P6 SCHEDULED` |
| **F-PRV** | Privacy rights workflow, data export/deletion, driver privacy, retention jobs | `P6-T3`..`P6-T9` | [Pending Phase P6] | `PHASE P6 SCHEDULED` |

---

## 2. Business Rules (R-01 to R-20, Specification 9.2)

| Rule ID | Business Rule Summary | Implementing Task | Verification Test | Status |
|---|---|---|---|---|
| **R-01** | Production code, seeds, and images contain zero mock or placeholder records | Part B.2 | `node ./scripts/verify-no-mock.mjs` | `VERIFIED (0 Mock Records)` |
| **R-02** | Synthetic test data exists only in `tests/fixtures/` and `tools/simulator/` | Part B.2 | `node ./scripts/lint.mjs` | `VERIFIED` |
| **R-03** | A driver may be rostered on several buses but runs exactly one shift at a time | `P3-T3` | Driver Mobile removed from scope | `BLOCKED [Conflict C-06]` |
| **R-04** | One active shift per bus at any given time | `P1-T8`, `P3-T3` | Console dispatch validation | `DONE` |
| **R-05** | One open primary faculty assignment per bus | `P4-T7` | `apps/web-console/tests/admin-security.spec.ts` | `DONE` |
| **R-06** | One open student route per student and trip type | `P4-T7` | `packages/domain/tests/scan-validator.spec.ts` | `DONE` |
| **R-07** | One open device link per device and per bus | `P4-T4`, `E.6` | `packages/domain/tests/device-linking.spec.ts` | `DONE` |
| **R-08** | Soft deactivation for business records; hard deletes only via retention jobs | `P4-T8`, `P6-T7` | State machine tests | `DONE` |
| **R-09** | Audit log is append-only; update/delete rejected at database level | `P0-T4`, `P4-T14` | `apps/web-console/tests/admin-security.spec.ts` | `DONE` |
| **R-10** | Active tracking source is selected server-side; clients never choose active source | `P1-T10`, `P1-T12` | Domain pure function tests | `DONE` |
| **R-11** | SOS safety notifications bypass quiet hours and cannot be disabled or muted | `P2-T8`, `P5-T9`, `E.10` | `packages/domain/tests/notification-engine.spec.ts` | `VERIFIED (Safety Lock Enforced)` |
| **R-12** | Students only see buses operating trips on their assigned route today | `P2-T1`, `E.4` | `apps/mobile/tests/bus-card.spec.ts` | `DONE` |
| **R-13** | Stop edits never modify an existing stop; approved requests create new stops | `P4-T6` | `apps/web-console/tests/routes-and-timetables.spec.ts` | `DONE` |
| **R-14** | All timestamps stored in UTC; displayed in Asia/Kolkata | `P0-T2`, Part B.7 | Date conversion tests | `DONE` |
| **R-15** | Strict input validation with Zod at every external boundary | Part B.7 | `node ./scripts/verify-routes-auth.mjs` | `VERIFIED (Strict Zod Everywhere)` |
| **R-16** | Phone telemetry accepted only for driver with active shift on linked bus | `P3-T4`, `E.7` | Driver Mobile removed from scope | `BLOCKED [Conflict C-06]` |
| **R-17** | Location history access restricted to COR and SAD; every access audited | `P6-T3` | [Pending Phase P6] | `PHASE P6 SCHEDULED` |
| **R-18** | Driver phone location collected only during an active shift and with permission | `P3-T4`, `P6-T9` | Driver Mobile removed from scope | `BLOCKED [Conflict C-06]` |
| **R-19** | Student mobile devices never send location to the server (zero background code) | `P2-T11` | `apps/mobile/tests/privacy-guarantees.spec.ts` | `VERIFIED (Zero Student Location Code)` |
| **R-20** | `NOT_RUNNING` bus state is never displayed as Offline; device health reported separately | `P1-T11`, `P4-T9` | `packages/domain/tests/tracking-states.spec.ts` | `VERIFIED` |

---

## 3. Emergency SOS Acceptance Criteria (19.10)

| Criterion ID | Acceptance Requirement | Implementing Task | Verification Test | Status |
|---|---|---|---|---|
| **AC-SOS-01** | Open incident joined if within 60s for same bus; new incident if different bus | `P1-T8`, `E.10` | `packages/domain/tests/events.spec.ts` | `DONE` |
| **AC-SOS-02** | Tier 0 dispatch (faculty, security, coordinator) < 1s | `P1-T8`, `E.10` | `tests/contract/hardware-simulation.spec.ts` | `DONE` |
| **AC-SOS-03** | Automatic escalation to Tier 1 (2 min), Tier 2 (5 min), Tier 3 (10 min) | `E.10` | `packages/domain/tests/events.spec.ts` | `DONE` |
| **AC-SOS-04** | Cancellation by coordinator after 30s with mandatory reason | `P1-T8`, `E.10` | `packages/domain/tests/events.spec.ts` | `DONE` |
| **AC-SOS-05** | Zero delivered recipients after 60s raises Severity 1 operational alert | `E.10`, `P5-T10` | `packages/domain/tests/notification-engine.spec.ts` | `DONE` |

---

## 4. Key Background Jobs (Section 25 / Part E.18)

| Job Name | Schedule / Trigger | Task | Verification Test | Status |
|---|---|---|---|---|
| `source-selector` | Every 5s per active bus & on accepted sample | `P1-T10` | Domain selector unit tests | `DONE` |
| `stale-checker` | Every 30s | `P1-T11` | `packages/domain/tests/tracking-states.spec.ts` | `DONE` |
| `shift-auto-end` | Every 60s (20m idle prompt, 10m grace, 14h timeout) | `P3-T9` | Console shift end | `DEFERRED [Conflict C-06]` |
| `trip-generator` | Daily at 00:30 campus time (7 days ahead) | `E.14` | Schedule engine tests | `DONE` |
| `late-start-check` | Every 60s during service hours (10m faculty, 20m coordinator) | `E.14` | Trip late alerts | `DONE` |
| `attendance-expected-builder` | Triggered on trip start | `P5-T4` | `packages/domain/tests/attendance-fsm.spec.ts` | `DONE` |
| `boarding-cutoff` | Every minute (marks ABSENT after window) | `P5-T6` | `packages/domain/tests/boarding-cutoff.spec.ts` | `DONE` |
| `absence-evaluator` | Afternoon cutoff + every 5 min safety net | `P5-T7` | `packages/domain/tests/absence-evaluator.spec.ts` | `DONE` |
| `sos-escalator` | Every 15s (must never skip) | `E.10` | `packages/domain/tests/events.spec.ts` | `DONE` |
| `notification-dispatcher` | Continuous queue processing (`SKIP LOCKED`) | `P5-T9` | `packages/domain/tests/notification-engine.spec.ts` | `DONE` |
| `device-health-checker` | Every minute | `P1-T7` | `packages/domain/tests/health-evaluator.spec.ts` | `DONE` |
| `retention-purger` | Daily at 02:00 campus time | `P6-T7` | [Pending Phase P6] | `PHASE P6 SCHEDULED` |

---

## 5. Definition of Done & Release Gate Verification (Sections 38 & 39)

- [x] Every API endpoint covered by authorization matrix test across all roles (`verify:routes-auth`).
- [x] No mock, dummy, or synthetic data in production codebase or seeds (`verify:no-mock`).
- [x] Clean production database verification with college domain check (`verify:prod-clean`).
- [x] Strict TypeScript across all 10 packages (`pnpm typecheck`).
- [x] 205 passing automated tests (201 unit tests + 4 contract simulation tests).
- [ ] Physical Hardware Bench Testing on 3 Trackers (ECE Hardware Team).
- [ ] Two-Week 3-Bus Pilot on Active College Routes (`P7-T8`).
- [ ] External penetration test completed with zero High or Critical vulnerabilities (`P7-T5`).
- [ ] Product Owner disposition on Conflict C-06 & Decision 4.
