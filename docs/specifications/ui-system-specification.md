# VJIT College Bus Tracker — UI System Specification

**Document Identifier**: `UI-SPEC-1.0`  
**Governing Master Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md`  
**Authoritative Operating Rules**: `AGENTS.md` (Part B)  
**Organization / Institution**: Vidya Jyothi Institute of Technology (VJIT), Hyderabad  
**Status**: PROVISIONALLY APPROVED UI DESIGN BASELINE ONLY (Approval ID: [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md); Implementation Not Authorized; Phase P0 Locked; Conflict C-06 Open; Spec PDFs Missing)  
**Version**: 1.0  
**Date**: 2026-10-21  

---

## 1. Executive Summary & Product Scope

> [!NOTE]
> **Project-Owner Approval Status (Decision ID: [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md))**:  
> The project owner has approved `UI-SPEC-1.0` as the **provisional UI design baseline only**.
> - **Implementation authorization**: NOT GRANTED.
> - **Phase P0 status**: STRICTLY LOCKED.
> - **Conflict C-06 status**: OPEN / UNRESOLVED.
> - **Authoritative specifications**: UNRESOLVED (`SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf` remain missing).
> - **Scope of use**: Reference for non-implementation design planning, screen inventories, and conflict analysis only. Proposed UI behavior does not override existing business requirements or authorize unapproved operational workflows.

This document specifies the visual design system, interaction models, screen architectures, tracking state indicators, and component standards for the **VJIT College Bus Tracker**.

### 1.1 Updated Two-Surface Product Scope
Per governing project directives, the software scope consists of **exactly two user-facing application surfaces**:
1. **Student and Faculty Mobile Tracking Application** (iOS & Android via Expo / React Native):
   - Map-first live bus navigation, route/stop search, personalized stop ETAs, bus telemetry details, arrival alerts, absence/leave management (faculty), and campus notification center.
2. **Transport Administrator Web Console** (Desktop & Tablet Web via React, Vite, Tailwind CSS, shadcn/ui):
   - Fleet operations control center, live fleet map, route/stop geometry management, timetable schedules, driver rosters, vehicle & hardware health monitors, attendance records, maintenance ticket boards, privacy audit logs, and settings.

> [!IMPORTANT]
> **Scope Boundary (Driver Mobile Application Removed)**:  
> The standalone driver mobile application has been **removed from the product scope**. No driver mobile screens, driver bottom navigation items, or driver-specific mobile application flows are specified. All operational dependencies previously handled by driver smartphones (trip initiation, attendance QR generation, secondary phone GPS, in-app SOS) are catalogued in Section 7 as a formal architectural conflict (**Conflict C-06**) with operational alternatives presented for project-owner resolution. Per approval record [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md), Conflict C-06 remains formally **OPEN**.

---

## 2. VJIT Campus Branding & Design Tokens

### 2.1 Brand Identity & Visual Anchor
The visual design system is anchored by the official emblem of **Vidya Jyothi Institute of Technology (VJIT)**.

- **Logo Asset Location**: [`docs/specifications/assets/vjit-logo.png`](file:///c:/aditya/Bus%20tracker/docs/specifications/assets/vjit-logo.png) (Source: `C:\aditya\VJITLOGO.png`).
- **Native Dimensions**: 241 × 194 pixels (RGBA).
- **Aspect Ratio**: Exact **1.242:1** (Proportions strictly preserved; redrawing, stretching, or altering geometry is prohibited).
- **Visual Structure**: Academic torch symbol, book emblem, gear crest, and college typographic wordmark in high-contrast scarlet red and deep navy.

---

### 2.2 Color Palette & Design Tokens

> [!NOTE]
> **Provisional Estimate Disclosure**: The hex values below represent calibrated digital samples from the official VJIT emblem for digital UI implementation. They serve as provisional visual baselines subject to formal institutional branding approval.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VJIT COLOR PALETTE                              │
├─────────────────┬───────────┬──────────────────────────────────────────┤
│ Token Name      │ Hex Code  │ Semantic UI Purpose                      │
├─────────────────┼───────────┼──────────────────────────────────────────┤
│ `brand-red`     │ #E51F35   │ Primary action CTA, accents, active tags │
│ `brand-red-dark`│ #B91C1C   │ High-contrast small text, pressed states │
│ `brand-navy`    │ #103754   │ Primary headers, app bars, dark surfaces │
│ `brand-navy-sub`│ #1E4E79   │ Secondary headers, active tab highlights │
│ `canvas-white`  │ #FFFFFF   │ Primary card background, input fields    │
│ `canvas-light`  │ #F8FAFC   │ Global screen background, neutral panels │
│ `border-subtle` │ #E2E8F0   │ Structural card borders, list dividers   │
│ `text-primary`  │ #0F172A   │ Main titles, body text, data values      │
│ `text-secondary`│ #475569   │ Captions, metadata, last-update text     │
│ `state-live`    │ #16A34A   │ Live bus tracking active (Green-600)     │
│ `state-stale`   │ #64748B   │ Data stale / buffered (Slate-500)        │
│ `state-unavail` │ #DC2626   │ Signal unavailable / hardware offline    │
│ `state-idle`    │ #D97706   │ Parked / Not running (Amber-600)         │
└─────────────────┴───────────┴──────────────────────────────────────────┘
```

#### Color Usage Rules:
1. **Red/Navy Separation Rule**: VJIT Red (`#E51F35`) and Deep Navy (`#103754`) must **never be layered directly on top of each other as foreground text and background** (Contrast ratio: 2.70:1 — Fails WCAG AA). They must always be separated by white (`#FFFFFF`) or neutral light canvas (`#F8FAFC`).
2. **Action Prominence**: Primary buttons use VJIT Red (`#E51F35`) with bold white text (`#FFFFFF`) or Deep Navy (`#103754`) with bold white text. Both satisfy WCAG AA (4.59:1 and 12.38:1 respectively).

---

### 2.3 Contrast & Accessibility Audit (WCAG 2.1 AA/AAA)

All proposed token pairings were verified against the W3C WCAG 2.1 relative luminance algorithm:

| Foreground Token | Background Token | Calculated Contrast Ratio | WCAG 2.1 AA (4.5:1) | WCAG 2.1 AAA (7.0:1) | Application Area |
|---|---|---|---|---|---|
| White (`#FFFFFF`) | Deep Navy (`#103754`) | **12.38:1** | **PASS** | **PASS** | Mobile Header, Web Nav Bar, Primary Navy Buttons |
| Deep Navy (`#103754`) | Canvas White (`#FFFFFF`) | **12.38:1** | **PASS** | **PASS** | Primary Page Titles, Card Headings, Data Table Text |
| Deep Navy (`#103754`) | Canvas Light (`#F8FAFC`) | **11.83:1** | **PASS** | **PASS** | Screen Headings on Neutral Canvas |
| Muted Slate (`#475569`) | Canvas White (`#FFFFFF`) | **7.58:1** | **PASS** | **PASS** | Secondary Metadata, ETA Labels, Timestamp Texts |
| White (`#FFFFFF`) | VJIT Red (`#E51F35`) | **4.59:1** | **PASS** | Fail | Primary Red Action CTAs, Emergency Buttons (Bold/Large) |
| Dark Red (`#B91C1C`) | Canvas White (`#FFFFFF`) | **6.47:1** | **PASS** | Fail | High-Contrast Alert Texts, Error Badges |
| VJIT Red (`#E51F35`) | Deep Navy (`#103754`) | **2.70:1** | **FAIL** | **FAIL** | **PROHIBITED COMBINATION** (Never layer red text on navy) |

---

### 2.4 Typography System

- **Primary Font Family**: **Inter** (Fallback: System Sans-Serif `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`).
- **Heading Font Family**: **Inter Display** or **Outfit** for clean architectural clarity.
- **Scale (Mobile & Web)**:
  - `Display / Hero`: 28pt / 34pt (Bold, Deep Navy `#103754`)
  - `Title 1 / Screen Title`: 22pt / 28pt (SemiBold, Deep Navy `#103754`)
  - `Title 2 / Section Header`: 18pt / 24pt (SemiBold, Navy Slate `#0F172A`)
  - `Body Regular`: 15pt / 20pt (Regular, Navy Slate `#0F172A`)
  - `Body Medium / Data Cell`: 15pt / 20pt (Medium, Navy Slate `#0F172A`)
  - `Caption / Stale Metadata`: 13pt / 16pt (Regular, Slate `#475569`)
  - `Overline / Status Tag`: 11pt / 14pt (Bold, Uppercase, Tracking +0.5px)

---

### 2.5 Spatial System, Elevation & Corner Radii

- **Grid Unit**: 4px base (8px standard increment: 4, 8, 12, 16, 20, 24, 32, 48px).
- **Corner Radii**:
  - `sm` (4px): Badges, inline status chips, small buttons.
  - `md` (8px): Form input fields, dropdown menus, table rows.
  - `lg` (12px): Standard cards, bottom navigation containers.
  - `xl` (16px): Bottom sheets, dialog modals, map floating cards.
  - `full` (9999px): Circular icon buttons, avatar chips, floating location FABs.
- **Elevation & Restrained Shadows**:
  - `elevation-0`: Flat borders (`border: 1px solid #E2E8F0`).
  - `elevation-1` (Cards): `box-shadow: 0 1px 3px 0 rgba(16, 55, 84, 0.06), 0 1px 2px -1px rgba(16, 55, 84, 0.04)`.
  - `elevation-2` (Floating Map Cards): `box-shadow: 0 4px 6px -1px rgba(16, 55, 84, 0.08), 0 2px 4px -2px rgba(16, 55, 84, 0.06)`.
  - `elevation-3` (Bottom Sheets & Modals): `box-shadow: 0 10px 15px -3px rgba(16, 55, 84, 0.12), 0 4px 6px -4px rgba(16, 55, 84, 0.08)`.

---

## 3. Student and Faculty Mobile Tracking Application

### 3.1 UX Architecture: Map-First Foundation
The mobile application employs a **map-first spatial architecture**. The live MapLibre map occupies the full screen height, with persistent, non-intrusive floating controls and an expandable bottom sheet providing route context.

```
┌─────────────────────────────────────────────────────────────┐
│ [≡ Menu]       VJIT BUS TRACKER             [🔔 Alerts]     │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search route, bus number, or stop...                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      [ MAP VIEW ]                           │
│                                                             │
│              🚌 Bus 14 (Live: 12s ago)                      │
│                  ────────●───────────                       │
│                                                             │
│                                           [⌖ My Stop]       │
│                                           [🛰 Recenter]     │
├─────────────────────────────────────────────────────────────┤
│ ═════════════════ EXPANDABLE SHEET ════════════════════════ │
│ 🚌 Bus 14 — Route 6 (Mehdipatnam -> VJIT)                  │
│ Next Stop: Appa Junction (ETA: 4 mins • 1.8 km)             │
│ [⭐ Favorite]  [Stop Schedule]  [Attendance History]        │
├─────────────────────────────────────────────────────────────┤
│  [🗺 Live Map]    [🚍 Routes]    [⭐ Favorites]   [👤 Profile]│
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Mobile Screen Inventory

| Screen ID | Screen Title | Primary User Roles | Core Capabilities |
|---|---|---|---|
| **MOB-01** | Splash & SSO Sign-In | All Students & Faculty | VJIT branded banner, college OIDC sign-in (`COLLEGE_EMAIL_DOMAINS` verification), session recovery. |
| **MOB-02** | Live Fleet Map (Home) | Student (`STU`), Faculty (`FAC`) | Fullscreen MapLibre live map, active bus marker on assigned route, search bar, floating recenter button. |
| **MOB-03** | Bus Detail & ETA Sheet | Student, Faculty | Real-time ETA along route polyline, stop arrival timeline, bus capacity badge, tracking freshness label. |
| **MOB-04** | Route & Stop Explorer | Student, Faculty | Searchable directory of all college bus routes, stop sequences, scheduled morning/evening timetables. |
| **MOB-05** | Stop Detail & Geofence View | Student, Faculty | Stop coordinates, walking directions, arriving buses, list of student stop change requests. |
| **MOB-06** | Favorites & My Trips | Student, Faculty | Pinned regular routes, favorite boarding stops, quick status card for today's assigned service. |
| **MOB-07** | Notification Center | Student, Faculty | In-app alerts, arrival proximity announcements, route delays, emergency broadcast notices. |
| **MOB-08** | Student Attendance Log | Student (`STU`) | Personal boarding history (`GET /attendance/me`), date-filtered check-ins, leave balance. |
| **MOB-09** | Student Leave Request | Student (`STU`) | Submit absence for morning/afternoon trips up to 30 min before departure (`leave.cutoff_before_trip_min`). |
| **MOB-10** | Faculty Bus Roster View | Faculty (`FAC`) | Assigned bus student passenger roster, leave acknowledgment, absence alert review (`absence_alerts`). |
| **MOB-11** | Profile & Privacy Rights | Student, Faculty | User profile details, notification preferences (SAFETY locked), DPDP personal data export/deletion requests. |

---

### 3.3 Mobile Bottom Navigation Structure
The primary navigation bar uses Deep Navy (`#103754`) background with VJIT Red (`#E51F35`) active tab highlights:

1. **Live Map** (`MOB-02`): Primary map-first tracking interface.
2. **Routes** (`MOB-04`): Route explorer, timetable schedules, stop lists.
3. **Favorites** (`MOB-06`): Pinned buses, regular commute cards, quick ETA glances.
4. **Profile** (`MOB-11`): Personal account, attendance history, privacy controls.

*(Note: Zero driver navigation items or shift-management tabs exist in this application).*

---

## 4. Transport Administrator Web Console

### 4.1 UX Architecture: Operations Fleet Deck
The Web Console is designed for transport coordinators, fleet technicians, management, and super admins. It features an adaptive sidebar, a persistent header with system health indicators, and a dual-pane operations workspace (Live Map + Filterable Data Grid).

```
┌───────────┬─────────────────────────────────────────────────────────────┐
│ VJIT      │ Fleet Operations Deck            [Active: 48/50] [🚨 SOS: 0]│
│ TRANSPORT │ Coordinator: transport@vjit.ac.in               [👤 Admin]  │
├───────────┼─────────────────────────────────────────────────────────────┤
│ 📊 Overview│ ┌───────────────────────────┬─────────────────────────────┐ │
│ 🗺 Fleet Map│ │ LIVE FLEET RADAR          │ BUS TELEMETRY & ATTRIBUTION │ │
│ 🚍 Buses   │ │                           │ Bus 08 • AP 28 Z 1234       │ │
│ 🛣 Routes  │ │   [MapLibre Fleet Track]  │ Device: HW_1048 (ONLINE)    │ │
│ 📅 Timetable│ │                           │ Driver: M. Ramesh (Assigned)│ │
│ 👥 Rosters │ │                           │ Speed: 38 km/h • Voltage: 12V│ │
│ 🎫 Tickets │ ├───────────────────────────┴─────────────────────────────┤ │
│ 📑 Reports │ │ FILTERABLE FLEET INVENTORY                              │ │
│ ⚙ Settings │ │ Bus | Route | Device | Status   | Last Fix | Action     │ │
│ 🔒 Audit   │ │ B01 | R01   | HW_1001| LIVE (HW) | 8s ago   | [Inspect]  │ │
└───────────┴─┴─────────────────────────────────────────────────────────┴─┘
```

---

### 4.2 Web Console Screen Inventory

| Screen ID | Screen Title | Permitted Roles (Sec 5) | Functional Capabilities |
|---|---|---|---|
| **ADM-01** | Admin SSO Sign-In & MFA | `COR`, `TEC`, `SEC`, `MGT`, `SAD` | College SSO, TOTP MFA verification, Argon2 recovery code fallback. |
| **ADM-02** | Fleet Radar & Operations Deck | `COR`, `SEC`, `SAD`, `MGT` | Fullscreen fleet overview, active bus pins, incident tickers, aggregate fleet health counters. |
| **ADM-03** | Bus Management & Compliance | `COR`, `SAD` | Create/edit bus records, seating capacity (1–150), fitness/insurance/pollution expiry alerts. |
| **ADM-04** | Tracker Device Provisioning | `TEC`, `SAD` | Batch device creation (`HW_NNN`), IMEI/ICCID entry, 256-bit token generation (shown once with QR). |
| **ADM-05** | Device-Bus Linking Manager | `COR`, `SAD` exclusively | Transactional linking (`valid_from` timestamps), audit row creation. Technicians strictly blocked (`E.6`). |
| **ADM-06** | Hardware Health & Telemetry | `TEC`, `COR`, `SAD` | Real-time voltage, satellite HDOP, heartbeat latency, firmware version, clock skew logs. |
| **ADM-07** | Route & Geometry Planner | `COR`, `SAD` | Visual route polyline editing, stop geofence radii (50m default), schedule timetable configuration. |
| **ADM-08** | Driver Roster Management | `COR`, `SAD` | Assign registered drivers to specific bus shifts, calendar schedule mapping, duty lists. |
| **ADM-09** | Attendance & Boarding Logs | `COR`, `SAD` | Campus attendance audit, boarded passenger lists, late boardings, unexcused absence alerts. |
| **ADM-10** | Maintenance Ticket Board | `TEC`, `COR`, `SAD` | Ticket triage: automated device alerts (voltage drop, GPS lost), manual driver defect reports. |
| **ADM-11** | Staged Firmware Rollout | `TEC`, `SAD` | Secure binary upload to S3 private bucket, signature check, 3-step staged deployment (5 -> 25% -> 100%). |
| **ADM-12** | Reports & Data Exporter | `COR`, `SAD`, `MGT` | Asynchronous CSV export generation, formula-injection sanitization (`'`, `@`, `=`), audit trail. |
| **ADM-13** | Settings & Feature Flags | `SAD` exclusively (COR read-only) | Typed settings manager for all 72 thresholds from Part I.5; change reasons mandatory and audited. |
| **ADM-14** | Audit Log Explorer | `SAD` (COR read-only) | Append-only audit record viewer; filter by actor, entity, date range; export audited. |

---

## 5. Tracking Integrity & State Definitions

To prevent dangerous or misleading presentation of vehicle locations, the UI must strictly adhere to the five discrete operational tracking states defined in **SW-MVP-1.0 Section 13.7 & 14**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRACKING STATE BADGES                           │
├─────────────────┬──────────┬──────────────┬────────────────────────────┤
│ Tracking State  │ Dot Icon │ Badge Color  │ Required UI Text Template  │
├─────────────────┼──────────┼──────────────┼────────────────────────────┤
│ **LIVE (HW)**   │ 🟢 Pulse │ Green-50     │ "Live, bus tracker"        │
│ **LIVE (SEC)**  │ 🟢 Solid │ Blue-50      │ "Live, secondary tracker"  │
│ **STALE**       │ 🟡 Solid │ Slate-100    │ "Last update N seconds ago"│
│ **UNAVAILABLE** │ 🔴 Solid │ Red-50       │ "Location unavailable.     │
│                 │          │              │  Last seen at HH:MM"       │
│ **NOT_RUNNING** │ ⚪ Outline│ Zinc-100     │ "Not running. Next trip    │
│                 │          │              │  at HH:MM"                 │
└─────────────────┴──────────┴──────────────┴────────────────────────────┘
```

### Strict Tracking Integrity Rules:
1. **Rule R-10 (Server Decides Active Source)**: The client application never calculates, infers, or selects the active location source. It renders the source provided by the `/api/v1/snapshot` endpoint.
2. **Rule R-20 (`NOT_RUNNING` is Never 'Offline')**: Buses outside scheduled shift hours must display *"Not running. Next trip at HH:MM"*. They must **never** be displayed as "Offline" or "Hardware Error". Device health is reported separately on the admin console.
3. **60-Second Staleness Cutoff (Specification 17.6)**: The moment a sample's data age exceeds **60 seconds**, the live marker transitions to grey and displays the explicit age (*"Last update 68 seconds ago"*). **Positions older than 60 seconds are never displayed as live.**
4. **No Simulated Arrival Times**: If a bus is `UNAVAILABLE` or `NOT_RUNNING`, ETA fields display an em-dash (`—`). The system never extrapolates, assumes, or hallucinates an estimated arrival time when GPS fixes are lost.

---

## 6. Shared Component Library & Design Tokens

### 6.1 Interactive Elements

#### A. Buttons
- **Primary CTA**: Background VJIT Red (`#E51F35`), Text White (`#FFFFFF`), Corner Radius 8px, Height 44px (touch target >= 44x44pt). Hover state: `#C81426`.
- **Secondary Action**: Background Deep Navy (`#103754`), Text White (`#FFFFFF`), Corner Radius 8px, Height 44px. Hover state: `#0B283E`.
- **Outline / Filter Button**: Background Transparent, Border 1.5px solid `#103754`, Text Deep Navy (`#103754`).
- **Destructive Action**: Background Red-50, Border 1px solid Red-200, Text Red-700.

#### B. Form Inputs
- Border 1px solid Border-Subtle (`#E2E8F0`), Background White (`#FFFFFF`), Text Navy Slate (`#0F172A`).
- Focus State: Border 2px solid Deep Navy (`#103754`), Outline none.
- Error State: Border 2px solid VJIT Red (`#E51F35`), Error caption below input in Red-700.

---

### 6.2 Data Display & Map Overlays

#### A. Live Vehicle Map Marker
- Circular pin with white rim (2px) and drop shadow (`elevation-2`).
- Marker icon: Bus silhouette vector.
- Marker background color reflects tracking state:
  - Green (`#16A34A`): Live tracking.
  - Grey Slate (`#64748B`): Stale tracking (> 60s).
  - Amber (`#D97706`): Approaching stop (< 2 min).
- Floating label beside marker: Always displays bus number (`Bus 14`) and state label (`Live, bus tracker`).

#### B. Route Polyline
- Active assigned route line: Deep Navy (`#103754`), Width 5px, Opacity 0.9.
- Alternative / Inactive route lines: Slate (`#94A3B8`), Width 3px, Dasharray `[2, 2]`.
- Campus Service Corridor Geofence: Faint navy polygon fill (`rgba(16, 55, 84, 0.05)`), border 1px dashed `#103754`.

#### C. Empty & Offline States
- All empty states provide an informative vector illustration, clear explanation of current state, and actionable next steps.
- **Example Empty Fleet**: *"No buses currently running. Scheduled service commences at 06:30 AM. Coordinators can inspect timetables in the Routes tab."*

---

## 7. Dedicated Scope Conflict: Removal of Driver Mobile Application

> [!CAUTION]
> **Conflict C-06 Status (Remains OPEN per Decision APR-UI-001)**:  
> Approval Record [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md) explicitly affirms that **Conflict C-06 is not resolved by UI baseline approval**. The operational alternatives outlined below represent proposed architectural options for project-owner review. Until explicit owner disposition is granted, all underlying safety, attendance, tracking, and operational requirements remain in force, and Phase P0/P3 implementation remains blocked.

### 7.1 Identified Master Plan Requirements Affected
Removing the standalone driver mobile application directly impacts multiple architectural and operational workflows defined in `AG-MASTER-1.0-v2-College-Bus-Tracker.md`:

```
┌────────────────────────────────────────────────────────────────────────┐
│             DRIVER APP REMOVAL — IMPACTED MASTER PLAN AREAS            │
├─────────────────┬───────────────────┬──────────────────────────────────┤
│ Plan Area       │ Master Plan Task  │ Original Assumption              │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Mission Scope   │ Part B.1          │ Assumed 4 parts including driver │
│                 │                   │ mobile application for shifts    │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Ingestion API   │ Phase P1 (P1-T1,  │ Secondary driver phone GPS batch │
│                 │ P1-T10, P1-T13)   │ ingestion and source-selector    │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Driver Phase    │ Entire Phase P3   │ 14 tasks dedicated to driver app │
│                 │ (P3-T1 to P3-T14) │ UI, checklist, shift lifecycle   │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Boarding & QR   │ Phase P5 (P5-T1)  │ Driver phone displayed rotating  │
│                 │                   │ QR code for student scans        │
├─────────────────┼───────────────────┼──────────────────────────────────┤
│ Emergency SOS   │ Phase P3 (P3-T12) │ In-app driver panic button       │
└─────────────────┴───────────────────┴──────────────────────────────────┘
```

---

### 7.2 Analysis of Operational Dependencies & Proposed Alternatives

The master plan strictly prohibits silently omitting business requirements. To maintain fleet safety and operational integrity without a driver app, the following alternatives are proposed for **Project-Owner Approval**:

#### 1. Shift Activation & Trip Lifecycle (Originally P3-T3 & P3-T9)
- *Problem*: Who or what starts and ends a bus trip if the driver has no phone app?
- *Option A (Recommended: Web Console Dispatch)*: Transport Coordinators manage fleet dispatch directly from the Web Console (`ADM-08`). The coordinator marks trips "Active/Dispatched" based on campus morning/evening schedules.
- *Option B (Automated Ignition Trigger)*: The server background worker monitors hardware ignition telemetry (`IGNITION_ON`). When a bus turns on its engine within scheduled hours, the worker automatically generates the active shift and trip. Shift ends automatically after 20 minutes of vehicle inactivity (`shift.idle_min`).

#### 2. Student Boarding & Attendance Verification (Originally P5-T1)
- *Problem*: How do students check in if there is no driver screen displaying rotating QR codes?
- *Option A (Physical Fixed Vehicle QR Placards)*: Each bus is fitted with an official, high-security laminated QR code placard at the bus entrance door. Students scan the vehicle QR using their mobile app. The server validates:
  1. Student is assigned to this bus route.
  2. Timestamp is within the boarding window (`boarding.window_before_min`).
  3. Server verifies bus GNSS location matches the student's designated stop geofence.
- *Option B (In-Bus RFID Card Tappers)*: Students tap their college RFID ID cards against the hardware tracker's RFID scanner module on the bus. Telemetry event `RFID_TAP` (already supported in `P1-T8` contract) records check-in automatically.
- *Option C (Assigned Faculty Check-in)*: The assigned primary faculty member on the bus uses the faculty mode in their mobile app to verify boarding passengers.

#### 3. GPS Tracking Redundancy & Source Selector (Originally P1-T10 & E.3)
- *Problem*: In the master plan, driver phones provided fallback tracking if hardware GPS failed.
- *Consequence*: Without driver phones, tracking relies **100% on the dedicated in-bus hardware tracker**.
- *Resolution*: If the hardware tracker loses GNSS or cellular signal, the bus transitions to `STALE` (60s) and then `UNAVAILABLE` (120s), raising an automatic maintenance ticket for fleet technicians (`P4-T12`). The software source-selector logic will treat `PHONE` fallback as disabled unless an alternative mobile tracking agent is approved.

#### 4. Emergency In-Bus SOS Alerts (Originally P3-T12)
- *Preservation of Safety Rule*: In-bus emergency SOS is **not eliminated**.
- *Hardware Implementation*: The bus is fitted with a physical hardware panic button wired directly to the tracker unit's digital input pin. Pressing the physical button transmits the `SOS` event via cellular telemetry to the server within 1 second (`P1-T8`).
- *Secondary In-Bus Trigger*: Faculty members on board can also trigger an immediate emergency alert through their mobile app.

---

## 8. UI Acceptance Checklist

Before any UI design or frontend code can be approved during Phase P0/P2/P4, it must satisfy the following verification criteria:

- [ ] **VJIT Brand Integrity**: VJIT Red (`#E51F35`) and Deep Navy (`#103754`) are used consistently across all screens with verified WCAG 2.1 AA contrast (>= 4.5:1 for body text, >= 3.0:1 for large headers).
- [ ] **No Direct Red/Navy Layering**: VJIT Red text is never placed directly on Deep Navy backgrounds.
- [ ] **Logo Fidelity**: The VJIT logo (`docs/specifications/assets/vjit-logo.png`) maintains its exact 1.242:1 aspect ratio without stretching, cropping, or recoloring.
- [ ] **Two Surfaces Only**: The UI specification and component tree contain strictly two application surfaces (Student/Faculty Mobile and Admin Web Console).
- [ ] **Zero Driver Screens**: No driver screens, driver login flows, or driver bottom navigation bars exist in the mobile app.
- [ ] **Tracking Integrity Labels**: All bus cards and map callouts display the exact state labels: *"Live, bus tracker"*, *"Last update N seconds ago"*, *"Location unavailable"*, or *"Not running"*.
- [ ] **60-Second Age Cutoff**: Vehicle positions older than 60 seconds are visually muted and never presented as live.
- [ ] **Zero Simulated Arrival Times**: Unavailable or offline buses display an em-dash (`—`) instead of extrapolated arrival times.
- [ ] **Student Privacy Rule R-19**: Student mobile app contains zero background location tracking code or permissions.
- [ ] **Responsive Web Console**: Admin Web Console is fully functional on desktop and tablet viewport widths (>= 768px).
- [ ] **Accessibility WCAG 2.1 AA**: All interactive touch targets are at least 44 × 44 pt on mobile; all form inputs have visible label tags and aria descriptors.
