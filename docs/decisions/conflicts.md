# Architecture Conflicts and Open Decisions Register

This register governs all architectural, specification, and policy conflicts and open decisions in the College Bus Tracker project.

> [!CAUTION]
> **Authority Rule (AGENTS.md B.4 & Part A line 21)**:
> *"The specification decides behaviour. This prompt decides architecture, security, data flow, and order of work. If the two conflict, stop work on that task, add an entry to `docs/decisions/conflicts.md`, and wait for approval. Do not guess."*
> If a task is listed in the **Dependencies / Blocks** field, work on that task must remain halted until the designated owner resolves it.

---

## Part 1: Seeded Conflicts (Part H)

### Conflict C-01: Device Status on Ingestion Authentication
- **Conflict Identifier**: `C-01`
- **Current Status**: **UNRESOLVED / PENDING OWNER SIGN-OFF**
- **Source of Conflict**: `SW-MVP-1.0` Section 11.5 Step 2 vs `HW-SPEC-1.0` Section 13.2 Step 5 & Provisioning Flow.
- **Original Issue**: `SW-MVP-1.0` Section 11.5 step 2 states that device status must be `ACTIVE` to authenticate. In contrast, `HW-SPEC-1.0` section 13.2 step 5 and the provisioning flow state that the first authenticated telemetry/heartbeat request on a `PROVISIONED` device succeeds and transitions the device to `ACTIVE`. The two cannot both be true as written.
- **Impact on Project**: Blocks device authentication implementation (`P1-T2`) and device provisioning pipeline (`E.5` step 5).
- **Available Evidence**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part H line 546; Part E.5 lines 373–379. Note: Original `SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf` are missing from the workspace.
- **Options**:
  - *Option A (Master Plan Recommendation)*: Accept a `PROVISIONED` device on its first request only if the token matches the token issued at provisioning and `first_used_at` is null; set status to `ACTIVE` and record `first_used_at` within the same database transaction. Require status `ACTIVE` for every subsequent request.
  - *Option B*: Require manual technician activation in the web console before the device can connect.
- **Responsible Decision Owner**: Engineering Lead in coordination with ECE Hardware Team Lead.
- **Approval / Resolution Evidence**: Pending formal written sign-off from owners.
- **Dependencies / Blocks**: Tasks `P1-T2` (Device authentication), `E.5` step 5 (Provisioning flow).
- **Next Required Action**: Engineering Lead and ECE Team Lead must review and approve Option A.

---

### Conflict C-02: Research Task Identifier Clashes
- **Conflict Identifier**: `C-02`
- **Current Status**: **RESOLVED**
- **Source of Conflict**: Earlier draft prompt vs `SW-MVP-1.0` Section 9.2.
- **Original Issue**: Research task identifiers in draft prompt (R-01 to R-16) clashed with the business-rule identifiers (R-01 to R-20) defined in the software specification.
- **Impact on Project**: Ambiguity in test names, code comments, and documentation.
- **Available Evidence**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part H line 547.
- **Options**:
  - *Option A*: Adopt `RS-` prefix for all research tasks (RS-01 to RS-16) and retain `R-` prefix for business rules (R-01 to R-20).
- **Responsible Decision Owner**: Product Owner.
- **Approval / Resolution Evidence**: Formally adopted and incorporated in `AG-MASTER-1.0-v2-College-Bus-Tracker.md`.
- **Dependencies / Blocks**: None (Resolved).
- **Next Required Action**: None.

---

### Conflict C-03: Mock Location Field Naming
- **Conflict Identifier**: `C-03`
- **Current Status**: **RESOLVED**
- **Source of Conflict**: Earlier draft prompt vs `SW-MVP-1.0` telemetry schema.
- **Original Issue**: An earlier draft prompt named the location mock field `mocked`. The specification uses `is_mock`.
- **Impact on Project**: Potential contract breakage between driver mobile app, ingestion schemas, and database columns.
- **Available Evidence**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part H line 548; Part C (P1-T1, P3-T5).
- **Options**:
  - *Option A*: Use `is_mock` everywhere (contracts, Zod schemas, database columns, and logs).
- **Responsible Decision Owner**: Engineering Lead.
- **Approval / Resolution Evidence**: Formally resolved in master plan v2; `is_mock` adopted as project standard.
- **Dependencies / Blocks**: Tasks `P1-T1`, `P1-T4`, `P3-T5`.
- **Next Required Action**: Enforce `is_mock` in contracts package and database migrations.

---

### Conflict C-04: Driver OTP Request Rate Limiting & CAPTCHA
- **Conflict Identifier**: `C-04`
- **Current Status**: **PENDING COUNSEL CONFIRMATION**
- **Source of Conflict**: Earlier draft prompt vs `SW-MVP-1.0` Section F-AUTH-02.
- **Original Issue**: The earlier draft required Cloudflare Turnstile CAPTCHA on OTP requests after the first request in an hour. Specification F-AUTH-02 sets a strict rate limit of 5 codes per hour per account and does not mandate CAPTCHA.
- **Impact on Project**: Affects driver sign-in UX and security controls in `P0-T10`.
- **Available Evidence**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part H line 549; Part F Control 11.
- **Options**:
  - *Option A (Master Plan Recommendation)*: Enforce both: keep the 5 codes/hour/account limit from the specification, and include Turnstile as an anti-bot defense after the 1st request/hour.
  - *Option B*: Enforce account-level limits only without CAPTCHA.
- **Responsible Decision Owner**: Engineering Lead and College Legal Counsel.
- **Approval / Resolution Evidence**: Awaiting counsel confirmation.
- **Dependencies / Blocks**: Task `P0-T10` (Driver email OTP).
- **Next Required Action**: Submit Option A to Legal Counsel and Transport Office for confirmation.

---

### Conflict C-05: Permitted Authentication States for Devices
- **Conflict Identifier**: `C-05`
- **Current Status**: **LINKED TO C-01**
- **Source of Conflict**: Earlier draft prompt vs `SW-MVP-1.0` Section 11.5.
- **Original Issue**: Earlier draft allowed both `ACTIVE` and `PROVISIONED` devices to authenticate in general. Specification 11.5 strictly requires `ACTIVE`.
- **Impact on Project**: Device authentication middleware logic in `P1-T2`.
- **Available Evidence**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part H line 550.
- **Options**:
  - Governed by resolution of `C-01`.
- **Responsible Decision Owner**: Engineering Lead.
- **Approval / Resolution Evidence**: Linked to `C-01` sign-off.
- **Dependencies / Blocks**: Task `P1-T2`.
- **Next Required Action**: Implement according to final sign-off of `C-01`.

---

### Conflict C-06: Removal of Standalone Driver Mobile Application from Product Scope
- **Conflict Identifier**: `C-06`
- **Current Status**: **OPEN / UNRESOLVED (Affirmed in Approval Record APR-UI-001)**
- **Source of Conflict**: Product Scope Directive (October 2026) vs `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part B.1, Phase P3 (Tasks `P3-T1` through `P3-T14`), Secondary Ingestion Fallback (Tasks `P1-T10`, `E.3`), Attendance (Task `P5-T1`), and In-App Emergency SOS (Task `P3-T12`).
- **Original Issue**: The updated product scope limits user-facing applications to strictly two surfaces: (1) Student and Faculty Mobile Tracking App, and (2) Transport Administrator Web Console. The separate driver mobile application is removed. However, the governing master plan contains extensive business and operational requirements that assume a driver mobile app:
  1. *Driver shift & trip lifecycle* (`P3-T3`, `P3-T9`): Shift start, bus selection, checklist completion, trip start, and trip end were executed by drivers on their smartphones.
  2. *Secondary phone-based GPS tracking fallback* (`P1-T10`, `E.3`): Driver phones sent background location batches if the hardware tracker failed.
  3. *Student boarding QR verification* (`P5-T1`): Driver phones displayed a 30-second rotating QR code for student check-in.
  4. *Pre-trip vehicle checklists* (`P3-T4`): Drivers submitted inspection checklists via their mobile app before starting trips.
  5. *Driver emergency SOS* (`P3-T12`): Drivers triggered panic alerts through an in-app hold-to-activate button.
  Per Rule B.4 and AGENTS.md, these business requirements cannot be silently deleted or altered without formal decision logging and owner approval. Furthermore, drivers must **not** be assumed to use the student mobile app.
- **Impact on Project**: Directly impacts the entirety of Phase P3 (14 tasks), the secondary phone ingestion route in Phase P1 (`P1-T10`), the student check-in mechanism in Phase P5 (`P5-T1`), and driver-triggered emergency alerting. Phase P3 cannot proceed in its current master-plan form without resolution.
- **Available Evidence**: `docs/specifications/ui-system-specification.md` (UI-SPEC-1.0 Section 7); `AG-MASTER-1.0-v2-College-Bus-Tracker.md` lines 27, 240–254, 303–318, 335–339, 360–371; Project-Owner Approval Record [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md).
- **Options**:
  - *Option A (Recommended for 2-Surface Scope)*: Formally approve the removal of the standalone driver application and adopt the operational alternatives detailed in `UI-SPEC-1.0`:
    1. *Trip Lifecycle*: Manage trip dispatch through the Transport Coordinator Web Console (`ADM-08`) or automated hardware ignition detection (`IGNITION_ON` + timeout).
    2. *Student Attendance*: Transition from phone-screen rotating QR to either (a) fixed vehicle QR code placards at bus entrance doors with server-side GPS and timetable geofence matching, (b) bus-mounted RFID card tappers linked to the hardware tracker (`P1-T8`), or (c) passenger verification performed by the assigned faculty member on the bus.
    3. *GPS Tracking*: Rely 100% on the dedicated in-bus hardware tracker. Disable secondary phone tracking fallback unless an alternative is approved. Hardware outages transition buses to `STALE` (60s) and `UNAVAILABLE` (120s), automatically opening maintenance tickets (`P4-T12`).
    4. *Emergency SOS*: Rely on the physical hardware panic button on the bus dashboard wired directly to the tracker unit's digital input (1-second cellular telemetry alert), supplemented by in-app SOS available to faculty members on board.
    5. *Phase P3 Re-scoping*: Re-scope or defer Phase P3 tasks to reflect the removal of driver mobile screens.
  - *Option B (Reinstate Driver App)*: Maintain the 3-application architecture originally defined in the master plan, including Phase P3.
  - *Option C (Driver Web Portal)*: Provide a lightweight, mobile-responsive web portal exclusively for driver shift check-in (requires explicit owner approval).
- **Responsible Decision Owner**: Project Owner in coordination with Transport Office and Engineering Lead.
- **Approval / Resolution Evidence**: Per Project-Owner Approval Record [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md) Section 4: *"Conflict C-06 is not resolved by this approval. The project team must preserve the underlying operational, safety, attendance, and tracking requirements until approved alternatives are documented. It must not assume that drivers will use the student/faculty application or that hardware-only tracking is sufficient."* Conflict C-06 remains formally **OPEN**.
- **Dependencies / Blocks**: Entire Phase `P3` (Tasks `P3-T1` through `P3-T14`), Task `P1-T10` (Phone ingestion route), Task `P5-T1` (Boarding QR verification).
- **Next Required Action**: Submit detailed operational alternatives, risk matrices, and dependency impacts for each driver workflow to Project Owner for explicit binding disposition prior to Phase P1 and Phase P3.

---

## Part 2: Open Decisions That Block Phases (SW-MVP-1.0 Section 41)

### Decision 2: AWS Region Selection
- **Current Status**: **UNRESOLVED (Default in Use)**
- **Topic**: Primary AWS cloud region for infrastructure hosting.
- **Default in Use**: AWS India Region (`ap-south-1` / Mumbai).
- **Impact on Project**: Governs Terraform infrastructure skeleton (`P0-T17`), latency targets, and compliance with Indian data protection laws.
- **Responsible Decision Owner**: DevOps Lead / Engineering Lead.
- **Dependencies / Blocks**: Task `P0-T17` (Terraform skeleton).
- **Next Required Action**: DevOps Lead to confirm `ap-south-1` as the designated production AWS region.

---

### Decision 4: Student Boarding Method at Launch
- **Current Status**: **UNRESOLVED (Default in Use)**
- **Topic**: Primary student check-in / boarding verification mechanism.
- **Default in Use**: Dynamic rotating QR code generated by driver phone app (every 30s), scanned by students.
- **Impact on Project**: Decides attendance scanning architecture and hardware procurement dependencies (`P5-T1`).
- **Responsible Decision Owner**: Product Owner / Transport Office.
- **Dependencies / Blocks**: Task `P5-T1` (Boarding QR).
- **Next Required Action**: Product Owner confirmation for launch boarding method.

---

### Decision 5: Driver Mobile Devices Policy
- **Current Status**: **UNRESOLVED (Default in Use)**
- **Topic**: Provisioning model for driver smartphones running tracking and attendance.
- **Default in Use**: College-issued smartphones where budget permits; personal phones with explicit driver consent as secondary fallback.
- **Impact on Project**: Driver app background location permissions, battery optimization exemptions, and device fleet management (`P3`).
- **Responsible Decision Owner**: Transport Office / College Management.
- **Dependencies / Blocks**: Phase `P3` (Driver app and phone tracking).
- **Next Required Action**: College management confirmation of hardware allocation budget.

---

### Decision 6: Security Staff Operational Visibility
- **Current Status**: **UNRESOLVED (Default in Use)**
- **Topic**: Scope of bus fleet access granted to Security Staff (`SEC` role).
- **Default in Use**: Read-only tracking visibility for all active buses across the fleet; no modification privileges.
- **Impact on Project**: Scope resolution rules (`E.4`) and admin live fleet view (`P4-T9`).
- **Responsible Decision Owner**: Security Lead / College Management.
- **Dependencies / Blocks**: Task `P4-T9` (Live fleet view).
- **Next Required Action**: Security Lead sign-off.

---

### Decisions 7 & 8: Parental Consent & Limited Mode for Under-18 Students
- **Current Status**: **UNRESOLVED (Feature Flag Default in Use)**
- **Topic**: Legal requirements for parental consent and restricted app mode for minor students.
- **Default in Use**: Build feature per specification Section 29.2 behind an administrative feature flag, disabled until counsel issues formal guidance.
- **Impact on Project**: Privacy controls (`P6-T4`, `P6-T5`).
- **Responsible Decision Owner**: College Legal Counsel / Data Protection Officer.
- **Dependencies / Blocks**: Tasks `P6-T4`, `P6-T5`.
- **Next Required Action**: Legal Counsel review of Digital Personal Data Protection (DPDP) Act requirements.

---

### Decision 10: Escalation Contacts and Duty Rosters
- **Current Status**: **UNRESOLVED (College Data Dependency)**
- **Topic**: Production on-duty rosters and escalation contact chains.
- **Default in Use**: College transport office must provide real rosters via console or bulk import tool; **zero synthetic data in production/staging (R-M1, R-M10)**.
- **Impact on Project**: Tier fan-out notifications in staging and production (`P1-T8`, `E.10`).
- **Responsible Decision Owner**: Transport Office.
- **Dependencies / Blocks**: Phase `P1-T8` staging validation.
- **Next Required Action**: Transport Office to prepare duty lists prior to staging deployment.

---

### Decision 11: Apple Critical Alerts Entitlement
- **Current Status**: **RESOLVED (Excluded from MVP)**
- **Topic**: Requirement for Apple Critical Alerts entitlement for emergency notifications.
- **Default in Use**: Do not implement Critical Alerts in MVP; use Time-Sensitive notifications (`interruption-level: time-sensitive`).
- **Impact on Project**: Avoids blocking Apple Developer Program special entitlement review delays.
- **Responsible Decision Owner**: Mobile Lead / Product Owner.
- **Approval Evidence**: Formally excluded per Section 41 item 11 and Part H line 559.
- **Dependencies / Blocks**: None.
- **Next Required Action**: None.

---

### Decision 14: Tracker GNSS Source Module
- **Current Status**: **OPEN (ECE Hardware Track)**
- **Topic**: Selection of GPS/GNSS receiver module on hardware tracker.
- **Default in Use**: Software API ingestion contract remains identical regardless of hardware module chosen (standard NMEA-derived coordinates, HDOP, satellites count).
- **Impact on Project**: Hardware track only; software ingestion is decoupled.
- **Responsible Decision Owner**: ECE Hardware Team.
- **Dependencies / Blocks**: None for software.
- **Next Required Action**: ECE team to finalize tracker component bill of materials.

---

### Decision 15: Supported Mobile Operating System Floors
- **Current Status**: **VERIFIED IN RS-01 (Clarification Documented)**
- **Topic**: Minimum OS versions supported for mobile apps.
- **Default in Use**: Android 10+ (API level 29) and iOS 16.4+. (Note: iOS 16.4 is enforced by Expo SDK 58 / React Native 0.88 baseline).
- **Impact on Project**: Target build configurations in `app.json`.
- **Responsible Decision Owner**: Mobile Lead.
- **Approval Evidence**: Verified in [`docs/decisions/versions.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/versions.md).
- **Dependencies / Blocks**: Phases `P2` and `P3`.
- **Next Required Action**: Mobile team to configure deployment targets in mobile app repository.

---

### Decision 16: Regional Disaster Recovery Target
- **Current Status**: **UNRESOLVED (Default in Use)**
- **Topic**: Disaster recovery RTO/RPO targets.
- **Default in Use**: Accept 4-hour Recovery Time Objective (RTO) and 15-minute Recovery Point Objective (RPO) within single India AWS region for MVP.
- **Impact on Project**: Multi-region replication is deferred to Phase 2; RDS automated daily backups with PITR used for MVP.
- **Responsible Decision Owner**: DevOps Lead / College Management.
- **Dependencies / Blocks**: Infrastructure configuration.
- **Next Required Action**: DevOps Lead confirmation.
