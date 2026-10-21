# Phase Plan: Phase P2 — Student and Faculty Mobile Applications (Milestone M2)

**Governing Master Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P2)  
**Authoritative Rules**: `AGENTS.md` (Part B)  
**UI Specification**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md)  
**Institutional Approval**: [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md)  
**Phase ID**: `P2`  
**Milestone**: `M2`  
**Status**: IN PROGRESS / IMPLEMENTATION  

---

## 1. Specification Sections Read & Verified

Per **AGENTS.md B.9 step 1**, all specification sections cited for Phase P2 have been reviewed:

- [x] **Section 5**: Permissions matrix for Student (`STU`) and Faculty (`FAC`) roles.
- [x] **Section 6.8**: Scope filtering: students see only their assigned route buses with a trip today (`R-12`); faculty see their assigned buses for the whole service day.
- [x] **Section 13.7**: Five discrete tracking state labels and presentation rules:
  - `LIVE_HW`: "Live, bus tracker" with radio icon.
  - `LIVE_PHONE`: "Live, secondary tracker" with smartphone icon.
  - `STALE`: "Last update N seconds ago" in slate/grey.
  - `UNAVAILABLE`: "Location unavailable. Last seen at HH:MM" in red.
  - `NOT_RUNNING`: "Not running. Next trip at HH:MM" in amber/outline (never "Offline").
  - Source label beside position, colour never the only indicator.
- [x] **Section 16.1**: Student user experience: live map, stop list, ETAs, stop requests, leave marking, boarding stop change.
- [x] **Section 16.2**: Faculty user experience: assigned buses, passenger roster, absence alerts review, leave marking on behalf of students.
- [x] **Section 17 (All)**: Live map UX, MapLibre integration, 10s foreground polling (`app.poll_foreground_s`), 60s staleness cutoff, route polylines, stop cards, bottom sheet interaction.
- [x] **Section 20.1 & 20.2**: Stop change requests (`corridor_m = 300m`, `duplicate_m = 100m`, `limit_days = 7d`), boarding stop update.
- [x] **Section 21 (Student parts)**: Notification centre, preferences, `SAFETY` category unmutable (`R-11`), quiet hours.
- [x] **Section 30**: Performance targets: app size, cold start <= 2.0s.
- [x] **Section 31.9 & Part I.5**: Operational thresholds: `leave.cutoff_before_trip_min = 30`, `app.poll_foreground_s = 10`, `hw.stale_after_s = 60`.
- [x] **Rule R-19 & Task P2-T11**: Students' devices do not send location to the server. Student app contains zero background location code.

---

## 2. Planned Tasks Breakdown

| Task ID | Task Scope | Files Touched / Created | Verification & Tests Planned | Spec Sections |
|---|---|---|---|---|
| `P2-T1` | **Home & Live Map Interface**: Map-first layout, search header, route/stop filters, bus markers with state tags, recenter control, assigned route scope (R-12), non-color state badges. | `apps/mobile/src/screens/MapScreen.ts`, `apps/mobile/src/components/MapLibreView.ts`, `apps/mobile/src/components/BusMarker.ts` | `map-screen.spec.ts` | Spec 16.1, 17.1, 13.7; UI-SPEC 3.1 |
| `P2-T2` | **Bus Detail & Bottom Sheet**: Selected bus/stop bottom sheet, upcoming stops timeline, arrival/departure states, route polyline, 10s foreground polling, 60s staleness badge. | `apps/mobile/src/components/BottomSheet.ts`, `apps/mobile/src/services/polling.ts`, `apps/mobile/src/components/StopTimeline.ts` | `bus-detail.spec.ts` | Spec 17.2, 17.5, 17.6; UI-SPEC 3.1 |
| `P2-T3` | **Stop Requests & Voting (F-STP)**: Submit proposed stop (max 60 chars), 300m route corridor check, 100m duplicate check, voting on open requests, 7-day limit. | `apps/mobile/src/screens/StopRequestScreen.ts`, `packages/domain/src/stop-requests.ts` | `stop-requests.spec.ts` | Spec 20.1; Rule R-13 |
| `P2-T4` | **Boarding-Stop Change**: Change designated stop (`POST /api/v1/student-routes/{id}/boarding-stop`), verification of student notification. | `apps/mobile/src/screens/BoardingStopChange.ts`, `packages/domain/src/student-routes.ts` | `boarding-stop.spec.ts` | Spec 20.2; Rule R-06 |
| `P2-T5` | **Attendance Log (`GET /attendance/me`)**: Personal check-in history, date range filtering, check-in method (QR, RFID, manual). | `apps/mobile/src/screens/AttendanceScreen.ts` | `attendance.spec.ts` | Spec 16.1, 18.10; F-ATT |
| `P2-T6` | **Student Leave Management**: Mark leave up to 30 min before departure (`leave.cutoff_before_trip_min`), categories (Personal, Academic, Other), cancellation prior to cutoff. | `apps/mobile/src/screens/LeaveScreen.ts`, `packages/domain/src/leave.ts` | `leave.spec.ts` | Spec 18.7; Part I.5 |
| `P2-T7` | **Faculty Portal & Roster**: Assigned buses for service day, passenger roster review, leave marking on behalf of students, absence alerts acknowledgement. | `apps/mobile/src/screens/FacultyScreen.ts`, `packages/domain/src/faculty.ts` | `faculty.spec.ts` | Spec 16.2, 18.6 |
| `P2-T8` | **Notification Centre & Preferences**: In-app alert feed, category filters, SAFETY category locked/unmutable (Rule R-11), quiet hours toggle. | `apps/mobile/src/screens/AlertsScreen.ts`, `apps/mobile/src/screens/NotificationPreferencesScreen.ts` | `notifications.spec.ts` | Spec 21.1–21.6; Rule R-11 |
| `P2-T9` | **Profile & Privacy Rights (F-PRV)**: Name and phone updates (`PATCH /me`), DPDP rights (data export, correction, deletion, consent withdrawal). | `apps/mobile/src/screens/ProfileScreen.ts`, `apps/mobile/src/screens/PrivacyRightsScreen.ts` | `profile.spec.ts` | Spec 16.1, 29; F-PRV |
| `P2-T10` | **Accessibility & Brand Integrity Audit**: WCAG 2.1 AA verification, touch targets >= 44x44pt, VJIT logo aspect ratio (1.242:1), color contrast validation, screen reader labels. | `apps/mobile/src/components/Header.ts`, `apps/mobile/src/theme/accessibility.ts` | `a11y-audit.spec.ts` | UI-SPEC 2.3, 8; Rule B.7 |
| `P2-T11` | **Zero Background Location Verification**: Automated check confirming zero background location code, zero background tracking permissions, and zero location reporting to server in student mobile app (Rule R-19). | `apps/mobile/package.json`, `scripts/verify-student-privacy.mjs` | `verify-privacy.spec.ts` | Rule R-19; Spec 16.1 |

---

## 3. Preconditions & Architectural Principles

1. **Zero Mock/Fake Data (Rule B.2)**: No dummy buses, hardcoded coordinates, or synthetic times in production code. Empty states explain next actions truthfully.
2. **Strict Scope Separation (Rule E.4)**: Zero driver navigation, driver shifts, or driver login flows.
3. **Tracking State Honesty (Spec 13.7 & Rule R-20)**: Display only active telemetry provided by the tracking service. If signals are older than 60s, mark as `STALE`. If hardware is idle or offline, mark as `NOT_RUNNING` or `UNAVAILABLE`.
4. **VJIT Identity**: Maintain institutional brand palette (`#E51F35`, `#103754`, `#FFFFFF`, `#F8FAFC`) with verified contrast and preserve VJIT logo proportions.
