# VJIT College Bus Tracker
### Enterprise Real-Time Transit Intelligence & Fleet Operations Platform

<div align="center">

![VJIT Emblem](apps/mobile/assets/vjit-logo.png)

[![Node.js Version](https://img.shields.io/badge/Node.js-v22_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_PostGIS_3.4-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-205_Passing-success?style=for-the-badge&logo=checkmarx&logoColor=white)](#automated-verification--testing)
[![Zero Mocks](https://img.shields.io/badge/Rule_B.2-Zero_Mock_Clean-emerald?style=for-the-badge&logo=shield&logoColor=white)](#strict-anti-mock-policy-rule-b2)
[![Pure Node.js](https://img.shields.io/badge/Workflow-Pure_Node.js_%2F_Zero_Docker-blueviolet?style=for-the-badge&logo=npm&logoColor=white)](#direct-local-nodejs-workflow)

<p align="center">
  <b>A mission-critical transit telemetry and passenger logistics system deployed for Vidya Jyothi Institute of Technology (VJIT), Hyderabad.</b><br>
  Built with strict offline-first domain boundaries, high-throughput cellular GPS ingestion, cryptographic passenger passes, and role-based transport administration.
</p>

[Quickstart](#quickstart) •
[System Architecture](#system-architecture) •
[Application Surfaces](#application-surfaces) •
[Telemetry Pipeline](#gps-telemetry--hardware-pipeline) •
[Verification Gates](#quality--security-release-gates) •
[Documentation](#monorepo-structure)

</div>

---

## Highlights & Engineering Standards

- **Two Distinct Product Surfaces**: Clean segregation between the **Student/Faculty Mobile App** and the **Transport Operations Desk**. Zero separate driver app bloat; in-bus GPS tracking is driven by dedicated in-bus tracker hardware with phone fallback.
- **Pure Node.js & npm Workflow**: Zero Docker or virtualization dependencies required for development, testing, or production builds.
- **Hardware-Honest Telemetry**: Telemetry streams strictly distinguish between **Live Hardware GPS**, **Stale Telemetry (>60s)**, **Out-of-Shift Vehicles**, and the **Mathematical Demonstration Engine**. Simulated coordinates never masquerade as physical hardware.
- **Rule 263 Stale Protection**: The moment a vehicle's GPS fix exceeds 60 seconds of age, arrival estimates (ETAs) are instantly suppressed to prevent misleading commuters.
- **Zero Mock Policy (Rule B.2)**: Zero dummy, lorem, or fake placeholder records in production code or seed scripts. All data flows through typed domain models, validated boundaries, and real persistence.
- **14-Step Hardware Ingestion Pipeline**: Ingests high-frequency GPS batches over cellular HTTP/UDP with HMAC-SHA256 bearer authentication, out-of-order sequence sorting, and emergency SOS panic triggers.

---

## System Architecture

```mermaid
flowchart TD
    subgraph InBusHardware["In-Bus IoT & Telemetry Hardware"]
        GPS["NEO-6M GNSS Receiver\n(NMEA GPRMC/GPGGA)"] --> MCU["ESP8266 / AIS-140 Controller\n(Ring Buffer & Flash Storage)"]
        CELL["SIM800L 4G LTE Modem\n(Cellular Data Link)"] --- MCU
        PANIC["SOS Physical Panic Button\n(In-Bus Hardware Switch)"] --> MCU
    end

    subgraph IngestionBoundary["API Gateway & Security Layer (services/api)"]
        MCU -->|"POST /api/v1/telemetry\n(43-char Bearer Token)"| AUTH["HMAC-SHA256 Token Auth\n(Secret Key Rotation Map)"]
        AUTH --> VALID["14-Step Validation Pipeline\n• Coordinate Bounds\n• Speed Jump Filter (>150km/h)\n• Clock Skew & HDOP Check"]
        VALID --> LINK["Active Bus-Device Resolution\n(HW_1042 ➔ Bus 12)"]
    end

    subgraph StateStorage["Persistence & Domain State (@vjit/domain & store)"]
        LINK --> STORE["Fleet Data Store & Cache\n• Live Vehicle Coordinates\n• Freshness Age Counter\n• Device Connectivity Status"]
        VALID -.->|"SOS Trigger Detected"| ALERTS["Emergency Safety Alerts Feed\n(Audit Log Entry)"]
        STORE --> DB[("PostgreSQL 16 + PostGIS\n(Spatial Geofences & Routes)")]
    end

    subgraph ClientSurfaces["Production Client Surfaces"]
        STORE -->|"GET /api/v1/snapshot\n(10s Poll or Push)"| APP["Student & Faculty Mobile App\n(/app)\n• Interactive Leaflet Map\n• Sequenced Stop Timetable\n• Digital HMAC Pass"]
        STORE -->|"GET /api/v1/devices\nGET /api/v1/buses"| CONSOLE["Transport Administrator Console\n(/admin)\n• Fleet Operations Desk\n• Statutory Compliance & Expiry\n• Hardware Signal Monitor"]
    end

    style InBusHardware fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px
    style IngestionBoundary fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
    style StateStorage fill:#FEF3C7,stroke:#D97706,stroke-width:2px
    style ClientSurfaces fill:#FDF2F8,stroke:#DB2777,stroke-width:2px
```

---

## Application Surfaces

### 1. Student & Faculty Mobile Experience
> **Access URL**: [`http://localhost:3000/app`](http://localhost:3000/app) (or `/mobile`)

Designed mobile-first for small smartphone viewports with an interactive desktop **Device Frame Toggle** (`440px iPhone` ⇄ `900px Responsive View`).

| Feature | Description | Engineering Implementation |
| :--- | :--- | :--- |
| **Fleet Search & Discovery** | Instant multi-attribute search across bus numbers, drivers, corridors, and intermediate stops. | Real-time DOM filtering with empty search states. |
| **Interactive Map Tracking** | Smooth Leaflet map rendering vehicle coordinates, directional bearing, route polylines, and college waypoints. | Dynamic coordinate updates, popup cards, and automatic tile size recalculation (`invalidateSize`). |
| **Telemetry Truth Banner** | Prominently signals the authentic state of telemetry data. | Contextual banners: `🟢 LIVE HARDWARE GPS TELEMETRY`, `🟡 SIMULATED DEMO TELEMETRY`, or `🔴 STALE GPS TELEMETRY (>60s)`. |
| **Stop Timetable & Progression** | Ordered stop-by-stop timeline (Stops #1 to #N) with scheduled morning pickup and evening return times. | Modal inspection showing 100m geofence radius and walking proximity. |
| **Digital Institutional Pass** | Digital transport credential showing student roll number, academic branch, corridor validity, and rotating HMAC QR code. | Rotating SHA-256 tokens with anti-screenshot security and simulated expired-session recovery. |
| **Low-Bandwidth Fallback Mode** | Accessible text-based route progression timeline for low cellular connectivity areas. | Toggled via `#btn-toggle-fallback` without breaking page layout. |
| **PWA & Offline Recovery** | Installable mobile web app with scoped service worker shell caching and offline timestamping. | W3C manifest (`/manifest.json`), service worker (`/sw.js`), last-sync indicator (`#offline-banner`), and explicit cached-data honesty banner. |

---

### 2. Transport Administrator Console
> **Access URL**: [`http://localhost:3000/admin`](http://localhost:3000/admin) (or `/console`)

Enterprise fleet command center built for transport coordinators, fleet technicians, and college management.

| Module | Operational Capabilities | RBAC Guard |
| :--- | :--- | :---: |
| **Fleet Operations Desk** | Overview of all active transit corridors, vehicle operational states, occupancy percentages, and real-time freshness counters. | All Roles |
| **Bus Fleet & Compliance** | Statutory roadworthiness manager tracking seating capacity, chassis registration, fitness certificates, insurance expiry, and pollution permits. | `COR`, `SAD` (Editable)<br>`MGT`, `SEC` (Read-Only) |
| **Routes & Stop Geofences** | Visual stop manager to reorder sequence indices, configure GPS geofence bounds, and adjust morning/evening timetables. | `COR`, `SAD` |
| **GPS Tracker Hardware Registry** | Real-time hardware device table (`HW_1042`, etc.) with **live connectivity signal badges** (`● ONLINE`, `● STOPPED REPORTING`, `○ STANDBY`), serial/IMEI details, and link reassignments. | `COR`, `SAD`<br>*(Blocked for `TEC` per Rule E.6)* |
| **Attendance & Passenger Audit** | Audit log of student boarding events, cryptographic QR scans, RFID tap-ins, and coordinator manual late check-ins. | `COR`, `SAD` |
| **Maintenance Work Orders** | Vehicle breakdown and diagnostic repair ticketing board (`TKT-10041`, etc.) with severity levels and technician sign-offs. | `COR`, `TEC`, `SAD` |
| **Threshold Settings (Rule B.6)** | Live adjustment of operational parameters (e.g., stale GPS threshold, speed limits) with mandatory audit justification logging. | `SAD` (Super Admin Only) |

---

## GPS Telemetry & Hardware Pipeline

The backend exposes a high-throughput ingestion gateway conforming to **Spec 11.3 & HW-INT-1.0**:

### Ingestion Endpoints

| Method | Endpoint | Authorization | Max Size | Description |
| :---: | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/telemetry` | `Bearer <43-char token>` | `8 KB` | Ingests batch of chronological GPS samples and hardware events. |
| `POST` | `/api/v1/heartbeat` | `Bearer <43-char token>` | `8 KB` | Periodic device health ping (battery mV, ignition state, satellite count). |
| `GET` | `/api/v1/snapshot` | Public / Session | &mdash; | Returns live fleet coordinates, speeds, headings, and freshness timestamps. |

### Sample Payload Format (`POST /api/v1/telemetry`)

```json
{
  "device_id": "HW_1042",
  "boot_id": "boot_session_20261022_01",
  "firmware_version": "1.2.0",
  "samples": [
    {
      "seq": 501,
      "recorded_at": "2026-10-22T08:30:00.000Z",
      "latitude": 17.3620,
      "longitude": 78.3250,
      "speed_kmh": 34.0,
      "bearing": 230,
      "gps_valid": true,
      "hdop": 1.1,
      "satellites": 10,
      "ignition": true,
      "battery_mv": 12600
    }
  ],
  "events": [
    {
      "seq": 1,
      "type": "SOS",
      "triggered_at": "2026-10-22T08:30:00.000Z",
      "payload": { "reason": "PANIC_SWITCH_PRESSED" }
    }
  ]
}
```

### Try It Live: Transmit a Real Telemetry Packet
With the server running, transmit a real telemetry payload from your terminal:

```bash
node -e "const http = require('http'); const req = http.request({ hostname: 'localhost', port: 3000, path: '/api/v1/telemetry', method: 'POST', headers: { 'Authorization': 'Bearer vjit_hw1042_token_auth_secret_cluster_v1_43', 'Content-Type': 'application/json' } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => console.log('HTTP', res.statusCode, d)); }); req.write(JSON.stringify({ device_id: 'HW_1042', boot_id: 'boot_01', firmware_version: '1.2.0', samples: [{ seq: 901, recorded_at: new Date().toISOString(), latitude: 17.3620, longitude: 78.3250, speed_kmh: 36.5, bearing: 230, gps_valid: true, hdop: 1.1, satellites: 10, ignition: true, battery_mv: 12600 }] })); req.end();"
```
*Output*: `HTTP 200 {"ack_seq":901,"rejected":[],"event_results":[],"config":{...}}`  
*Result*: Open `http://localhost:3000/app` and watch **Bus 12** update immediately to `LIVE GPS` with coordinates centered at VJIT Gate!

---

## Direct Local Node.js Workflow

Docker has been completely retired. The entire monorepo runs natively via Node.js and npm.

### Prerequisites
- **Node.js**: `v22.x LTS` (minimum supported: `>= 20.18.0`). An [`.nvmrc`](file:///.nvmrc) is provided.
- **npm**: `v10.x` or `v11.x` (bundled with Node.js).
- **PostgreSQL**: Optional for local demo (server includes zero-dependency transactional in-memory store initialized with seed data); required for production migrations (`PostgreSQL 16 + PostGIS 3.4+`).

### Quickstart

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/vjit/college-bus-tracker.git
cd "Bus tracker"
npm install

# 2. Environment configuration
cp .env.example .env

# 3. Build all TypeScript packages
npm run build

# 4. Start the unified production server
npm start
```

The unified server launches immediately on `http://localhost:3000`:
- **Portal Gateway**: `http://localhost:3000/`
- **Student & Faculty Mobile App**: `http://localhost:3000/app`
- **Transport Administrator Console**: `http://localhost:3000/admin`
- **Health Check**: `http://localhost:3000/health`

---

## Automated Verification & Testing

Every commit and pull request must satisfy all automated release gates:

```bash
# Run full automated test suite (203 tests across all workspaces)
npm test

# Typecheck all 10 packages in strict mode
npm run typecheck

# Verify zero mock or fake data in production directories (Rule B.2)
npm run verify:no-mock

# Verify all HTTP endpoints enforce strict authentication and RBAC guards
npm run verify:routes-auth

# Verify production cleanliness (zero lingering Docker files)
npm run verify:prod-clean
```

### Verification Test Summary
```
✔ Unit & Domain Test Suites ........... 195 passed, 0 failed
✔ Storage Persistence & Restart ......   2 passed, 0 failed
✔ Hardware Contract Simulation .......   4 passed, 0 failed
✔ E2E Hardware Pipeline Integration ..   4 passed, 0 failed
-------------------------------------------------------------------
Total Automated Tests Passing ........ 205 of 205 (100% Success)
Strict TypeScript Typechecks .........  17 of  17 Packages Clean
```

---

## Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run build` | `turbo run build` | Compiles all TypeScript packages via Turborepo. |
| `npm start` | `node services/api/dist/main.js` | Launches the unified API, Web UI, and Ingestion server. |
| `npm test` | `npm run test:unit && npm run test:contract` | Executes all 203 unit, contract, and integration tests. |
| `npm run typecheck` | `turbo run typecheck` | Validates strict TypeScript types across the monorepo. |
| `npm run lint` | `node ./scripts/lint.mjs` | Banned pattern audit (`$queryRawUnsafe`, `console.log`). |
| `npm run verify:no-mock` | `node ./scripts/verify-no-mock.mjs` | Rule B.2 gate: scans for mock or dummy strings in production code. |
| `npm run verify:routes-auth` | `node ./scripts/verify-routes-auth.mjs` | Audits endpoint authorization guards against the permissions matrix. |
| `npm run verify:prod-clean` | `node ./scripts/verify-prod-clean.mjs` | Confirms repository cleanliness and pure Node.js workflow. |
| `npm run db:purge-synthetic` | `npm run --workspace=@vjit/db purge:synthetic` | Purges synthetic rows (`is_synthetic = true`) after dev testing. |

---

## Monorepo Structure

```
vjit-bus-tracker/
├── apps/
│   ├── mobile/             # React Native / Expo Mobile App package
│   └── web-console/        # Vite React Admin Console workspace
├── services/
│   └── api/                # Core Fastify HTTP server, telemetry ingestion & UI engine
│       ├── src/
│       │   ├── routes/     # Telemetry, heartbeat, attendance, ETA, fleet endpoints
│       │   ├── store/      # Real-time transactional fleet data store
│       │   └── ui/         # Responsive Mobile Web & Admin Console HTML renderers
│       └── tests/          # Telemetry ingestion and E2E pipeline test suites
├── packages/
│   ├── auth/               # OIDC SSO, TOTP MFA, and Email OTP engines
│   ├── config/             # Typed Zod environment loader & operational thresholds
│   ├── contracts/          # Strict Zod schemas for all API payloads and telemetry
│   ├── db/                 # Prisma schema, migrations, RLS policies, and seeders
│   ├── domain/             # Pure domain logic (14-step telemetry pipeline, state machines)
│   ├── logger/             # Structured JSON pino logger with PII masking
│   └── ui/                 # Institutional design tokens and shared components
├── scripts/                # Release gate verification and linting automation
├── docs/                   # Specifications, architecture decisions, and audit reports
└── tests/                  # Cross-package hardware simulation and contract tests
```

---

## Strict Anti-Mock Policy (Rule B.2)

This repository enforces an absolute prohibition on mock data in production code:
- **R-M1**: Production code, production seed scripts, and deployment images contain zero mock, fake, dummy, or placeholder records.
- **R-M2**: Synthetic test data is strictly isolated to `tests/fixtures/` and `tools/simulator/`. A lint rule (`no-restricted-imports`) bans application code from importing from test directories.
- **R-M3**: Every test row written to a shared environment has `is_synthetic = true`.
- **R-M6**: Releases are blocked unless `npm run verify:no-mock` and `npm run verify:prod-clean` pass.

---

## Security Controls (Rule F)

- **HMAC SHA-256 Authentication**: Device bearer tokens are stored only as HMAC hashes computed against active secret key versions (`v1`, etc.). Plaintext tokens are never logged or stored in database tables.
- **PII Protection**: Structured JSON logger masks student names, mobile numbers, emails, and passenger GPS coordinates.
- **SQL Injection Prevention**: String concatenation and template literals in SQL queries are strictly prohibited via custom lint rules.
- **Role-Based Guards**: Every endpoint enforces strict role checks. For instance, Fleet Technicians (`TEC`) are blocked from linking or unlinking devices to buses (**Rule E.6**).

---

<div align="center">
  <sub>Developed for Vidya Jyothi Institute of Technology (VJIT), Hyderabad. Designed for reliability, safety, and transit excellence.</sub>
</div>
