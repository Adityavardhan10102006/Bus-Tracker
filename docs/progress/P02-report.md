# Phase Report: Phase P2 — Student & Faculty Mobile Applications (Milestone M2)

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P2)  
**Authoritative Operating Rules**: `AGENTS.md` (Part B)  
**UI System Specification**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md)  
**Approval Record**: [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md)  
**Phase ID**: `P2`  
**Milestone**: `M2`  
**Date**: 2026-10-21  
**Status**: COMPLETED — READY FOR PHASE-GATE APPROVAL  

---

## 1. Tasks Completed (IDs)

- [x] **`P2-T1`**: Home & Live Map: Map-first layout, MapLibre view configuration, student assigned route scope (`R-12`), bus markers with non-color state badges and source tags (`LIVE_HW`, `LIVE_PHONE`, `STALE`, `UNAVAILABLE`, `NOT_RUNNING`), search bar, route/stop filter chips, floating recenter FAB.
- [x] **`P2-T2`**: Bus Detail & Bottom Sheet: Expandable non-intrusive bottom sheet (collapsed 120px, half 320px, expanded 520px), stop list sequence, real ETA formatting, arrival/departure states (`ARRIVING`, `DEPARTED`), 10-second foreground telemetry polling (`app.poll_foreground_s`), 60-second staleness cutoff (positions > 60s never shown as live), em-dash (`—`) for unavailable/offline arrival times.
- [x] **`P2-T3`**: Stop Requests (Student side F-STP): Submission of proposed stops with name validation (max 60 chars), 300m route corridor boundary check (`route.corridor_m`), 100m duplicate stop guard (`stop.duplicate_m`), community voting, 7-day expiration limit (`stop_request.limit_days`).
- [x] **`P2-T4`**: Boarding-Stop Change: `POST /api/v1/student-routes/{id}/boarding-stop` with notification check and route validation.
- [x] **`P2-T5`**: Attendance View: Personal boarding history query (`GET /api/v1/attendance/me`), date filtering, and check-in method indicators (`QR`, `RFID`, `MANUAL`).
- [x] **`P2-T6`**: Student Leave Management: Submit absence for morning/afternoon trips up to 30 minutes before departure (`leave.cutoff_before_trip_min`), categories (`PERSONAL`, `ACADEMIC`, `OTHER`), cancellation permitted only before cutoff and only if boarding has not occurred.
- [x] **`P2-T7`**: Faculty Portal & Roster: Assigned bus whole-service-day overview, passenger check-in roster summary, leave marking on behalf of students on their bus, absence alerts review (`absence_alerts`) and acknowledgement.
- [x] **`P2-T8`**: Notification Centre & Preferences: In-app service alert feed, category filters, emergency lock ensuring `SAFETY` category cannot be disabled, muted, or suppressed by quiet hours (Rule `R-11`).
- [x] **`P2-T9`**: Profile & Personal Privacy (F-PRV): Name and phone number update (`PATCH /api/v1/me`), Indian DPDP data rights screen (export, correction, deletion, consent withdrawal).
- [x] **`P2-T10`**: Accessibility & Brand Integrity: WCAG 2.1 AA compliance audit, prohibition of direct VJIT Red on Deep Navy layering (contrast 2.70:1 blocked), white-on-navy (>12:1) and white-on-red (4.59:1) verification, touch targets >= 44x44pt, VJIT logo aspect ratio preservation (exact 1.242:1).
- [x] **`P2-T11`**: Student Location Privacy (Rule `R-19`): Verification that the student/faculty mobile package contains zero background location tracking libraries, zero background location permissions, and zero student device location reporting to the server.

---

## 2. Specification Sections Implemented

- **Section 5**: Permissions matrix enforcement for `STU` and `FAC` roles.
- **Section 6.8 & R-12**: Route scope filtering: students see only their assigned route buses with a trip today; faculty see assigned buses for the whole service day.
- **Section 13.7**: Five discrete tracking state badges and presentation rules (text + icon, non-color indicator).
- **Section 16.1**: Complete student experience (live map, stop list, ETAs, stop requests, leave marking, boarding stop change).
- **Section 16.2**: Complete faculty experience (assigned buses, passenger roster, absence alerts review, leave marking).
- **Section 17 (All)**: Live map architecture, MapLibre view model, 10s foreground polling, 60s staleness cutoff, route polyline overlay, stop cards, bottom sheet interaction.
- **Section 20.1 & 20.2**: Stop change requests (`corridor_m = 300m`, `duplicate_m = 100m`, `limit_days = 7d`), boarding stop update.
- **Section 21 (Student parts)**: Notification feed, quiet hours, `SAFETY` category unmutable (`R-11`).
- **Section 29 & F-PRV**: DPDP privacy rights (data export, correction, deletion, consent withdrawal).
- **Section 30**: Cold start and performance compliance.
- **Section 31.9 & Part I.5**: Operational thresholds (`leave.cutoff_before_trip_min = 30`, `app.poll_foreground_s = 10`, `hw.stale_after_s = 60`).

---

## 3. Acceptance Criteria Verified (IDs)

- **`AC-MAP-01`**: Map opens directly to live bus view with compact search and filter controls.
- **`AC-MAP-02`**: Buses on student's route display with discrete state labels beside the marker.
- **`AC-MAP-03`**: Bottom sheet displays upcoming stop ETA without obscuring the live map (3 snap heights).
- **`AC-TRK-01`**: Positions older than 60 seconds transition to `STALE` with explicit age tag ("Last update N seconds ago") and are never displayed as live.
- **`AC-TRK-02`**: Unavailable or idle buses display em-dash (`—`) rather than simulated or hallucinated arrival times.
- **`AC-STP-01`**: Stop requests with names > 60 chars or outside 300m corridor are rejected.
- **`AC-STP-02`**: Stop requests within 100m of existing stops are rejected as duplicates.
- **`AC-LEV-01`**: Student leave is accepted when requested >= 30 min before trip departure; rejected within 30 min.
- **`AC-LEV-02`**: Leave cannot be submitted or cancelled if passenger boarding has already occurred.
- **`AC-ALT-01`**: `SAFETY` category alerts are delivered unconditionally and cannot be suppressed by quiet hours (Rule R-11).
- **`AC-NAV-01`**: Navigation contains strictly 4 tabs (Map, Routes, Alerts, Profile) with zero driver views.
- **`AC-PRV-01`**: Student app contains zero background location code or reporting (Rule R-19).
- **`AC-A11Y-01`**: VJIT logo aspect ratio is strictly 1.242:1; direct red-on-navy layering is prohibited.

---

## 4. Tests Added, Counts, and Results

- **Unit Test Suites**: 31 suites, **109 passing unit tests** (23 new mobile unit tests added).
- **Contract Test Suites**: 1 suite, **4 passing hardware replay tests**.
- **Total Passing Automated Tests**: **113 passing tests**, **0 failures**, **0 skipped**.

### Test Suites Breakdown:
1. `apps/mobile/tests/map-screen.spec.ts`: 4 tests (markers, filters, empty state, bottom sheet).
2. `apps/mobile/tests/bus-detail.spec.ts`: 3 tests (60s staleness cutoff, em-dash arrival times, stop timeline).
3. `apps/mobile/tests/stop-requests.spec.ts`: 5 tests (name length, duplicate check, corridor check, 7-day expiration).
4. `apps/mobile/tests/leave-management.spec.ts`: 3 tests (cutoff enforcement, past cutoff rejection, boarded rejection).
5. `apps/mobile/tests/alerts-and-safety.spec.ts`: 2 tests (SAFETY quiet hours bypass, priority sorting).
6. `apps/mobile/tests/navigation-and-privacy.spec.ts`: 3 tests (4 tabs scope, zero driver items, Rule R-19 privacy).
7. `apps/mobile/tests/brand-and-a11y.spec.ts`: 3 tests (logo aspect ratio, WCAG AA contrast, touch target standards).
8. Existing Suites in `@vjit/contracts`, `@vjit/domain`, `@vjit/ui`, `@vjit/logger`, `@vjit/api`: 90 passing tests.

---

## 5. Security Checks Run & Results

- **`node scripts/lint.mjs`**: PASSED (Zero unsafe SQL, zero `$queryRawUnsafe`, zero `console.log` in production code).
- **`node scripts/verify-routes-auth.mjs`**: PASSED (All endpoints guarded by authentication and role validation).
- **`pnpm.cmd typecheck`**: PASSED (16/16 tasks across all 9 packages, zero TypeScript compiler errors).
- **WCAG 2.1 AA Contrast**: PASSED (Direct VJIT Red on Deep Navy blocked; White on Navy = 12.38:1; White on Red = 4.59:1).

---

## 6. Migrations Applied

- None in Phase P2 (Schema established in Phase P0 and extended through typed contracts).

---

## 7. Configuration Keys Added or Changed

- Operational thresholds read through typed `@vjit/config`:
  - `app.poll_foreground_s = 10` (Foreground telemetry polling interval).
  - `hw.stale_after_s = 60` (Staleness threshold cutoff).
  - `leave.cutoff_before_trip_min = 30` (Student leave cutoff window).
  - `route.corridor_m = 300` (Stop request corridor limit).
  - `stop.duplicate_m = 100` (Stop duplicate threshold).
  - `stop_request.limit_days = 7` (Stop request voting lifetime).

---

## 8. Known Gaps & Unresolved Conflicts

- **Conflict `C-06` (OPEN per `APR-UI-001`)**: Standalone driver mobile application removed from product scope. Student/Faculty app adheres strictly to 2-surface architecture with zero driver screens.
- **Hardware Telemetry Input**: Depends on in-bus hardware trackers running firmware compliant with `HW-INT-1.0`.

---

## 9. Mock Data & Synthetic Purge Results

- **`verify:no-mock` Result**: PASSED. Zero mock, dummy, sample, demo, or placeholder records in production code (`packages/`, `services/`, `apps/`). Empty states provide truthful guidance.
- **Synthetic Purge**: Automated unit tests create and clean up disposable test structures. No shared environment records left.

---

## 10. Commands to Reproduce

```bash
# 1. Typecheck the entire monorepo
pnpm.cmd typecheck

# 2. Run lint and mock-data verification
node scripts/verify-no-mock.mjs
node scripts/lint.mjs
node scripts/verify-routes-auth.mjs

# 3. Run all unit and contract tests
pnpm.cmd test:unit
pnpm.cmd test:contract
```
