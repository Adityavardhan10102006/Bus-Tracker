# Master Coverage Gate Register (Part G)

This register implements **Part G** of `AG-MASTER-1.0-v2-College-Bus-Tracker.md`. It tracks every feature ID, business rule, acceptance criterion, endpoint, configuration key, test case, edge case, and operational requirement to guarantee that nothing is missed before the Phase P7 Release Gate.

> [!IMPORTANT]
> **Coverage Rule (Part G lines 518–537)**:  
> Before the release gate (Phase P7), every row below must name the Task ID that implements it, the automated test that verifies it, and its current status (`DONE`, `DEFERRED [Decision ID]`, or `BLOCKED [Conflict ID]`).

---

## 1. Feature Groups (Section 16 & Part C)

| Feature ID | Feature Description | Implementing Task | Verification Test | Status |
|---|---|---|---|---|
| **F-AUTH-01** | College SSO authentication over OIDC (Google Workspace / Entra ID) | `P0-T9` | [Pending Phase P0] | `LOCKED` |
| **F-AUTH-02** | Driver email OTP authentication (6-digit, 10 min, HMAC, rate limits) | `P0-T10` | [Pending Phase P0] | `LOCKED` |
| **F-AUTH-03** | JWT access tokens & opaque refresh tokens with rotation & reuse detection | `P0-T11` | [Pending Phase P0] | `LOCKED` |
| **F-AUTH-04** | Admin TOTP MFA enrolment and single-use argon2-hashed recovery codes | `P0-T12` | [Pending Phase P0] | `LOCKED` |
| **F-AUTH-05** | Session lists and remote sign-out of other devices | `P0-T11` | [Pending Phase P0] | `LOCKED` |
| **F-AUTH-06** | User status checked on each request with <= 30s cache | `P0-T11`, `P4-T8` | [Pending Phase P0] | `LOCKED` |
| **F-AUTH-07** | Immediate session revocation on user deactivation | `P0-T11`, `P4-T8` | [Pending Phase P0] | `LOCKED` |
| **F-USR** | User management, role assignment, and secure streaming CSV imports | `P4-T8` | [Pending Phase P4] | `LOCKED` |
| **F-FLT** | Bus fleet management, document expiry alerts (fitness, insurance, pollution, permit) | `P4-T1` | [Pending Phase P4] | `LOCKED` |
| **F-RTE** | Route management, stops, stop deactivation, timetables, holiday calendar | `P4-T6` | [Pending Phase P4] | `LOCKED` |
| **F-ASG** | Route-bus assignments, driver rosters, faculty assignments, student routes | `P4-T6`, `P4-T7` | [Pending Phase P4] | `LOCKED` |
| **F-SHF** | Driver pre-trip checklist, start shift, standby tracking, end shift, idle timeout | `P3-T1`..`P3-T10` | [Pending Phase P3] | `LOCKED` |
| **F-TRK** | Hardware ingestion, source selector, snapshot API, live MapLibre map, ETA | `P1-T1`..`P1-T13`, `P2-T1` | [Pending Phase P1/P2] | `LOCKED` |
| **F-ATT** | Dynamic rotating QR boarding, scan validation, manual check-in, leave marking | `P5-T1`..`P5-T8` | [Pending Phase P5] | `LOCKED` |
| **F-SOS** | Multi-tier emergency SOS pipeline, 1s dedupe, 15s escalation job, auto-resolution | `P1-T8`, `P3-T12`, `E.10` | [Pending Phase P1/P3] | `LOCKED` |
| **F-STP** | Student stop requests within corridor, duplicate detection, voting | `P2-T3` | [Pending Phase P2] | `LOCKED` |
| **F-NTF** | In-app notification center, FCM HTTP v1 push, DLT SMS, SES email, quiet hours | `P0-T15`, `P2-T8`, `E.12` | [Pending Phase P0/P2] | `LOCKED` |
| **F-ADM** | Administrative web console, audit log viewer, settings management, tickets | `P4-T1`..`P4-T15` | [Pending Phase P4] | `LOCKED` |
| **F-RPT** | Asynchronous report generation, presigned downloads, formula injection protection | `P6-T1`, `P6-T2` | [Pending Phase P6] | `LOCKED` |
| **F-PRV** | Privacy rights workflow, data export/deletion, driver privacy, retention jobs | `P6-T3`..`P6-T9` | [Pending Phase P6] | `LOCKED` |

---

## 2. Business Rules (R-01 to R-20, Specification 9.2)

| Rule ID | Business Rule Summary | Implementing Task | Verification Test | Status |
|---|---|---|---|---|
| **R-01** | Production code, seeds, and images contain zero mock or placeholder records | Part B.2 | `verify:no-mock`, `verify:prod-clean` | `GOVERNANCE ENFORCED` |
| **R-02** | Synthetic test data exists only in `tests/fixtures/` and `tools/simulator/` | Part B.2 | ESLint `no-restricted-imports` | `GOVERNANCE ENFORCED` |
| **R-03** | A driver may be rostered on several buses but runs exactly one shift at a time | `P3-T3` | Unit & API integration tests | `LOCKED` |
| **R-04** | One active shift per bus at any given time | `P1-T8`, `P3-T3` | Database partial unique index | `LOCKED` |
| **R-05** | One open primary faculty assignment per bus | `P4-T7` | Database partial unique index | `LOCKED` |
| **R-06** | One open student route per student and trip type | `P4-T7` | Database partial unique index | `LOCKED` |
| **R-07** | One open device link per device and per bus | `P4-T4`, `E.6` | Database partial unique index | `LOCKED` |
| **R-08** | Soft deactivation for business records; hard deletes only via retention jobs | `P4-T8`, `P6-T7` | RLS and purge integration tests | `LOCKED` |
| **R-09** | Audit log is append-only; update/delete rejected by trigger at database level | `P0-T4`, `P4-T14` | Database trigger test | `LOCKED` |
| **R-10** | Active tracking source is selected server-side; clients never choose active source | `P1-T10`, `P1-T12` | Domain pure function test | `LOCKED` |
| **R-11** | SOS safety notifications bypass quiet hours and cannot be disabled or muted | `P2-T8`, `E.10`, `E.12` | Notification engine tests | `LOCKED` |
| **R-12** | Students only see buses operating trips on their assigned route today | `P2-T1`, `E.4` | Scope resolution tests | `LOCKED` |
| **R-13** | Stop edits never modify an existing stop; approved requests create new stops | `P4-T6` | Stop service tests | `LOCKED` |
| **R-14** | All timestamps stored in UTC; displayed in Asia/Kolkata | `P0-T2`, Part B.7 | Date conversion tests | `LOCKED` |
| **R-15** | Strict input validation with Zod at every external boundary | Part B.7 | Zod boundary tests | `LOCKED` |
| **R-16** | Phone telemetry accepted only for driver with active shift on linked bus | `P3-T4`, `E.7` | Ingestion auth tests | `LOCKED` |
| **R-17** | Location history access restricted to COR and SAD; every access audited | `P6-T3` | Authorisation matrix test | `LOCKED` |
| **R-18** | Driver phone location collected only during an active shift and with permission | `P3-T4`, `P6-T9` | Mobile background test | `LOCKED` |
| **R-19** | Student mobile devices never send location to the server (zero background code) | `P2-T11` | Mobile code audit | `LOCKED` |
| **R-20** | `NOT_RUNNING` bus state is never displayed as Offline; device health reported separately | `P1-T11` | Bus state unit tests | `LOCKED` |

---

## 3. Emergency SOS Acceptance Criteria (19.10)

| Criterion ID | Acceptance Requirement | Implementing Task | Verification Test | Status |
|---|---|---|---|---|
| **AC-SOS-01** | Open incident joined if within 60s for same bus; new incident if different bus | `P1-T8`, `E.10` | Incident join unit test | `LOCKED` |
| **AC-SOS-02** | Tier 0 dispatch (faculty, security, coordinator, driver confirmation) < 1s | `P1-T8`, `E.10` | Ingestion benchmark test | `LOCKED` |
| **AC-SOS-03** | Automatic escalation to Tier 1 (2 min), Tier 2 (5 min), Tier 3 (10 min) | `E.10` | `sos-escalator` job test | `LOCKED` |
| **AC-SOS-04** | Cancellation by driver within 30s with required reason; coordinator after 30s | `P3-T12`, `E.10` | SOS cancellation test | `LOCKED` |
| **AC-SOS-05** | Zero delivered recipients after 60s raises Severity 1 operational alert | `E.10`, `P5-T10` | Escalation alert test | `LOCKED` |

---

## 4. Key Background Jobs (Section 25 / Part E.18)

| Job Name | Schedule / Trigger | Task | Verification Test | Status |
|---|---|---|---|---|
| `source-selector` | Every 5s per active bus & on accepted sample | `P1-T10` | Source selector integration test | `LOCKED` |
| `stale-checker` | Every 30s | `P1-T11` | Stale state transition test | `LOCKED` |
| `shift-auto-end` | Every 60s (20m idle prompt, 10m grace, 14h timeout) | `P3-T9` | Shift auto-end test | `LOCKED` |
| `trip-generator` | Daily at 00:30 campus time (7 days ahead) | `E.14` | Trip generation cron test | `LOCKED` |
| `late-start-check` | Every 60s during service hours (10m faculty, 20m coordinator) | `E.14` | Late start alert test | `LOCKED` |
| `attendance-expected-builder` | Triggered on shift/trip start | `P3-T3` | Attendance expected builder test | `LOCKED` |
| `boarding-cutoff` | Every minute (marks ABSENT after window) | `P5-T6` | Boarding cutoff job test | `LOCKED` |
| `absence-evaluator` | Afternoon cutoff + every 5 min safety net | `P5-T7` | Morning-present afternoon-absent test | `LOCKED` |
| `sos-escalator` | Every 15s (must never skip) | `E.10` | SOS escalation test | `LOCKED` |
| `notification-dispatcher` | Continuous queue processing (`SKIP LOCKED`) | `E.12` | Dispatcher retry and DLQ test | `LOCKED` |
| `device-health-checker` | Every minute | `P1-T7` | Device health transition test | `LOCKED` |
| `retention-purger` | Daily at 02:00 campus time | `P6-T7` | Partition drop and purge test | `LOCKED` |

---

## 5. Definition of Done & Release Gate Verification (Sections 38 & 39)

- [ ] Every API endpoint covered by authorization matrix test across all roles (`verify:routes-auth`).
- [ ] No mock, dummy, or synthetic data in production codebase or seeds (`verify:no-mock`).
- [ ] Clean production database verification with college domain check (`verify:prod-clean`).
- [ ] Ingestion load test: 200 requests/sec for 30 minutes with p95 snapshot latency <= 300ms.
- [ ] External penetration test completed with zero High or Critical vulnerabilities.
- [ ] Threat model document complete in [`docs/security/threat-model.md`](file:///c:/aditya/Bus%20tracker/docs/security/threat-model.md).
- [ ] All 16 research tasks resolved and verified against authentic documentation.
