# Phase Report: Map Reliability & Route Management Upgrade

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part B.10)  
**Phase ID**: `MAP-ROUTE-UPGRADE`  
**Milestone**: `M3 / Production Map & Route Studio`  
**Date Completed**: 2026-10-22  
**Author / Agent**: Antigravity  

---

## 1. Tasks Completed
- `MAP-T1: Leaflet Lifecycle & Map Robustness`: Handled `tileerror` tile-loading failures gracefully with visible banner, prevented viewport jumping on 10s telemetry polling by decoupling marker position updates from viewport sets, added mobile orientation/resize listeners triggering `mapInstance.invalidateSize()`, and added viewport persistence/restoration in `localStorage` (`vjit_mobile_map_state`).
- `MAP-T2: Routing Provider Boundary & Straight-line Fallback`: Implemented `@vjit/domain` routing module (`packages/domain/src/routing.ts`) with OSRM road-following engine boundary, distance calculation (Haversine polyline accumulator), straight-line fallback generation, and clear UI notices distinguishing Road-Following OSRM vs Saved Corridor vs Straight-Line Fallback.
- `MAP-T3: Route Persistence Across Application Restarts`: Implemented disk serialization in `services/api/src/store/fleet-data-store.ts` (`tmp/fleet-persisted-store.json`) ensuring route creation, edits, stop reordering, geometry updates, and deletions survive server reboots without introducing unapproved database schema changes.
- `MAP-T4: Administrative Route Studio in /admin`: Injected Leaflet interactive map into admin console, converted modal into a full 2-column Route Studio featuring:
  - Drag/Up/Down (`▲`/`▼`) stop reordering.
  - "📍 Pick on Map" interactive crosshair stop placement.
  - Real-time Road Geometry recalculation button (`POST /api/v1/routes/preview-geometry`).
  - Unsaved changes protection modal/warning on tab navigation and modal close.
- `MAP-T5: Student Bus Tracking & Telemetry Pipeline`: Updated `/app` to render live bus marker updates via `busMarker.setLatLng(...)` without destroying/recreating route polyline, preserving route corridor stability, showing telemetry freshness, and providing Re-center Bus and Fit Route controls.
- `MAP-T6: Route & Stop Validation`: Implemented strict stop validation in domain: coordinate bounds checking (India bbox: lat [8.0, 37.0], lon [68.0, 97.0]), contiguous sequence numbering 1..N, duplicate stop names rejection, and duplicate coordinates rejection.
- `MAP-T7: Automated Test Coverage`: Added 7 comprehensive unit/integration tests in `services/api/tests/map-and-routing.spec.ts` covering stop validation, geometry boundary, and persistence survival across store restarts.

---

## 2. Specification Sections Implemented
- Section 6: Geospatial Model, Geofences & PostGIS Coordinate Validation.
- Section 12: Route & Stop Management (Stop Sequence, Order Validation, Geofence Radius).
- Section 13: Live Tracking & Telemetry Ingestion (10s cadence, marker updates, stale suppression).
- Section 35: Configuration Thresholds & Routing Engine Boundary.

---

## 3. Acceptance Criteria Verified
- `AC-MAP-01`: Map initializes consistently with VJIT campus bounds (lat: 17.3850, lon: 78.4867) and handles tile failures with `#map-tiles-warning`.
- `AC-MAP-02`: Student tracking updates marker position in place without snapping user viewport or flickering route polylines.
- `AC-MAP-03`: Route Studio permits stop reordering via `▲`/`▼` and persists new sequence 1..N.
- `AC-MAP-04`: Non-persistent geometry preview (`POST /api/v1/routes/preview-geometry`) allows reviewing road geometry before saving.
- `AC-MAP-05`: Routes and stops survive API server restarts through persistent disk store.
- `AC-MAP-06`: Stop coordinate validation rejects coordinates outside India bounds and flags duplicate stops/coordinates.

---

## 4. Tests Added, Counts, and Results
- Unit Tests: 210 passing (including 7 new map and routing tests).
- Contract Tests: 4 passing (Hardware Message Simulation & Offline Recovery Harness).
- Total Test Count: **214 passed, 0 failed**.
- Test Files Executed: 62 suites passed across domain, contracts, db, auth, and api.

---

## 5. Security Checks Run & Results
- `npm run verify:routes-auth`: **PASSED** (all endpoints guarded by RBAC: `COR`/`SAD`).
- `npm run verify:prod-clean`: **PASSED** (0 Dockerfiles, pure Node.js workflow).
- `npm run lint`: **PASSED** (0 unsafe SQL or banned `console.log` statements in production).
- High / Critical Vulnerabilities: **0**.

---

## 6. Migrations Applied
- None (in-memory persistent disk store upgrade avoiding unapproved migrations prior to Phase P0-T6 release gate).

---

## 7. Configuration Keys Added or Changed
- `ROUTING_OSRM_BASE_URL`: Optional environment variable pointing to external or local OSRM routing backend (defaults to `https://router.project-osrm.org`).
- `settings` table / store: Default routing timeout 5000ms, fallback to straight-line on provider failure.

---

## 8. Known Gaps Linked to Decisions or Conflicts
- Routing Provider Public Rate Limit: Public OSRM demo server may rate-limit high-frequency recalculations. Documented recommendation to set `ROUTING_OSRM_BASE_URL` to an internal or managed OSRM instance in production.

---

## 9. Mock-Data Check Result (`verify:no-mock`)
- Command: `npm run verify:no-mock`
- Result: **PASSED** (0 mock, dummy, or synthetic records in production code, seeds, or images).

---

## 10. Purge Result (`db:purge-synthetic`)
- Command: `npm run db:purge-synthetic`
- Row Counts Purged: 0 (development disk store clean).

---

## 11. Commands to Reproduce
```bash
npm run typecheck
npm run build
npm test
npm run verify:no-mock
npm run verify:routes-auth
npm run verify:prod-clean
npm run lint
```
