# Phase Plan: Phase P4 — Transport Administrator Web Console (Milestone M4)

**Governing Master Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P4)  
**Authoritative Rules**: `AGENTS.md` (Part B)  
**UI Specification**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md) (Section 4)  
**Phase ID**: `P4`  
**Milestone**: `M4`  
**Status**: IN PROGRESS / IMPLEMENTATION  

---

## 1. Specification Sections Read & Verified

Per **AGENTS.md B.9 step 1**, all specification sections cited for Phase P4 have been reviewed:

- [x] **Section 5**: Permissions matrix for Transport Coordinator (`COR`), Fleet Technician (`TEC`), Super Admin (`SAD`), Management (`MGT`), and Security (`SEC`).
- [x] **Section 10.2 to 10.4**: Data models for `buses`, `devices`, `device_bus_links`, `routes`, `stops`, `timetables`, `rosters`, `maintenance_tickets`, `settings`, and `audit_logs`.
- [x] **Section 13.1 & Rule E.6**: Device-to-bus linking rules: one open link per device and bus, `valid_from` defaults to now (past up to 7d), `COR` and `SAD` exclusively (technicians strictly blocked).
- [x] **Section 13.8**: Comparison view for COR and SAD (last 10 minutes of telemetry, active source marked).
- [x] **Section 16.4**: Transport Coordinator Console experience (`COR`).
- [x] **Section 16.5**: Fleet Technician Console experience (`TEC`).
- [x] **Section 16.6**: Super Admin Console experience (`SAD`).
- [x] **Section 16.8**: Management read-only aggregate views (`MGT`).
- [x] **Section 22**: Operational alerts catalogue (device offline during shift, low voltage, GPS lost).
- [x] **Section 24 & E.4**: Scope resolution and role-based route/view visibility. Admin pages not discoverable; unauthorized roles receive 404.
- [x] **Section 26.4 to 26.6, 26.9**: Admin API endpoints.
- [x] **Section 27 & HW-SPEC 13, 17**: Device provisioning, IMEI/ICCID masking (last 4 digits for COR/TEC; unmasked for SAD only).
- [x] **Section 33.8**: Staged firmware rollout: canary 5 -> 25% -> 100% with 48h intervals.
- [x] **Part I.5**: Operational settings manager for all 72 configuration thresholds.

---

## 2. Planned Tasks Breakdown

| Task ID | Task Scope | Files Touched / Created | Verification & Tests Planned | Spec Sections |
|---|---|---|---|---|
| `P4-T1` | **Bus Management & Compliance**: Bus inventory (capacity 1-150, status `ACTIVE`, `MAINTENANCE`, `RETIRED`), document compliance expiry dates (insurance, fitness, pollution, permit) with 30-day and 7-day warnings (`doc.expiry_warn_days`). | `apps/web-console/src/screens/BusesScreen.ts`, `packages/domain/src/compliance.ts` | `buses-compliance.spec.ts` | Spec 16.4, 22; P4-T1 |
| `P4-T2` | **Device Provisioning & Masking**: Batch provisioning (`HW_NNN`, IMEI 15 digits, ICCID 19-20 digits), 256-bit token generation (shown once with QR), status `PROVISIONED`, IMEI/ICCID masking (last 4 digits for COR/TEC; unmasked for SAD). | `apps/web-console/src/screens/DevicesScreen.ts`, `packages/domain/src/device-provisioning.ts` | `devices-provisioning.spec.ts` | Spec 16.5, 27; P4-T2 |
| `P4-T3` | **Token Rotation & Revocation**: Token rotation request (TEC/COR), revocation (COR/SAD with bus confirmation; auto-creates maintenance ticket). | `apps/web-console/src/components/TokenRotationModal.ts` | `token-mgmt.spec.ts` | Spec 11.1; P4-T3 |
| `P4-T4` | **Device-to-Bus Linking Manager**: Transactional linking (`valid_from` to `valid_to`), audit row generation. COR/SAD only; technicians strictly prohibited per Rule E.6. | `apps/web-console/src/screens/LinkingScreen.ts`, `packages/domain/src/device-linking.ts` | `device-linking.spec.ts` | Spec 13.1; Rule E.6; P4-T4 |
| `P4-T5` | **Unlinked Warning & Health Radar**: Unlinked devices warning list, device health state view (`ONLINE`, `DELAYED`, `OFFLINE`), hardware telemetry metrics (voltage, satellites, HDOP, RSSI). | `apps/web-console/src/screens/HealthRadarScreen.ts` | `health-radar.spec.ts` | Spec 11.6, 13.8; P4-T5 |
| `P4-T6` | **Routes, Stops & Timetables**: Route polyline editor, stops sequence with 50m geofence radii, stop deactivation with effective date (no in-place mutations per R-13), holiday calendar, timetable schedule dispatch. | `apps/web-console/src/screens/RoutesAdminScreen.ts`, `apps/web-console/src/screens/TimetableScreen.ts` | `routes-admin.spec.ts` | Spec 16.4, 20.1; P4-T6 |
| `P4-T7` | **Driver Records & Conflict C-06 Disclosure**: Roster assignment list with duty schedules, persistent banner disclosing Conflict C-06 status and Web Console dispatch workflow. | `apps/web-console/src/screens/DriverRostersScreen.ts` | `rosters.spec.ts` | Spec 16.4; Conflict C-06; P4-T7 |
| `P4-T8` | **Attendance & Boarding Logs**: Campus attendance audit, boarded passengers, late boarding with mandatory reasons, absence alerts review (`absence_alerts`). | `apps/web-console/src/screens/AttendanceAdminScreen.ts` | `attendance-admin.spec.ts` | Spec 16.4, 18.6; P4-T8 |
| `P4-T9` | **Live Fleet Operations Deck**: Fullscreen live map and filterable fleet inventory (bus number, route, tracking state). Distinguishes live from stale (>60s) and unavailable positions. Read-only counts for MGT. | `apps/web-console/src/screens/FleetDeckScreen.ts` | `fleet-deck.spec.ts` | Spec 16.4, 16.8, 17.6; P4-T9 |
| `P4-T10` | **Trip Management & Manual Dispatch**: Trip listing by date, route, or bus; trip cancellation with required reason (notifies students/faculty); manual shift end; emergency incident review. | `apps/web-console/src/screens/TripDispatchScreen.ts` | `trip-dispatch.spec.ts` | Spec 15.5, 16.4; P4-T10 |
| `P4-T11` | **Staged Firmware Rollout Dashboard**: Staged rollout management: Canary 5 buses -> 25% -> 100% full fleet with 48h intervals (`firmware_rollouts`), pre-condition checks (parked, ignition OFF, voltage adequate, no pending SOS). | `apps/web-console/src/screens/FirmwareRolloutScreen.ts` | `firmware.spec.ts` | Spec 33.8; P4-T11 |
| `P4-T12` | **Maintenance Ticket Board**: Automated defect tickets (low battery, GPS lost) and manual tickets; triage by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`); device tickets for TEC, bus tickets for COR. | `apps/web-console/src/screens/MaintenanceBoardScreen.ts` | `maintenance.spec.ts` | Spec 16.4, 16.5; P4-T12 |
| `P4-T13` | **Settings Console & Feature Flags**: Typed configuration console for all 72 thresholds from Part I.5; SAD writes with mandatory reason, COR reads; feature flags manager. | `apps/web-console/src/screens/SettingsScreen.ts` | `settings-console.spec.ts` | Part I.5; Spec 33.5; P4-T13 |
| `P4-T14` | **Security Audit Log Explorer**: Append-only audit record viewer; filters by actor, entity, date range; export restricted to SAD and audited. | `apps/web-console/src/screens/AuditLogScreen.ts` | `audit-log.spec.ts` | Spec 28; Rule B.8; P4-T14 |
| `P4-T15` | **Role-Based Navigation & Security Layout**: Adaptive sidebar navigation strictly filtered by role; non-discoverable admin pages (404 for unauthorized roles per E.4); VJIT brand styling with verified contrast. | `apps/web-console/src/navigation/Sidebar.ts`, `apps/web-console/src/App.ts` | `console-a11y-auth.spec.ts` | Spec 5, 24; UI-SPEC 4 |

---

## 3. Preconditions & Rules Verification

1. **Zero Mock Data (Rule B.2)**: No dummy buses, hardcoded coordinates, or fake device telemetry in production code. Real data only; empty states provide truthful setup instructions.
2. **Strict Authorization Matrix (Spec 5)**: COR cannot access Super Admin settings; TEC cannot link devices; MGT sees aggregate counts only.
3. **Data Protection & PII (Rule B.7)**: Mask sensitive IMEI/ICCID for non-SAD users; redaction of student PII in logs; append-only audit trail for all admin writes.
4. **Institutional Branding**: VJIT emblem preserved with 1.242:1 aspect ratio, Navy header (`#103754`), restrained Red accents (`#E51F35`), neutral light canvas (`#F8FAFC`), verified WCAG AA contrast.
