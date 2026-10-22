# ADR-PWA-001: Progressive Web App (PWA) Architecture & Scoped Shell Caching

**Status**: ACCEPTED & IMPLEMENTED  
**Date**: 2026-10-22  
**Governing Standard**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` & `AGENTS.md` (Rule B.2, B.7, Security Control F)  

---

## 1. Context & Motivation

To provide students and faculty with an installable, mobile-optimized experience without introducing a separate driver application or fragile containerized wrappers, the mobile interface at `/app` requires Progressive Web App (PWA) capabilities. However, transit telemetry and passenger credentials involve strict privacy and freshness requirements:
- **Rule 263**: Telemetry older than 60 seconds must never be represented as live.
- **Rule B.2**: No fake, placeholder, or synthetic positions may be fabricated.
- **Security Control F**: Authentication tokens, session credentials, and user PII must never be stored in uncontrolled browser caches.

## 2. Decision

1. **W3C Web App Manifest (`/manifest.json`)**:
   - Provide standard manifest with `standalone` display mode, `#1e3a8a` primary theme, `#0f172a` dark background, and college branding icons.
2. **Strictly Scoped Service Worker (`/sw.js`)**:
   - Cache only immutable application shell assets: `/app` shell HTML, `/assets/vjit-logo.png`, Outfit web fonts, and Leaflet CSS/JS.
   - Non-GET requests (e.g., `POST`, `PUT`, `DELETE`) and all `/api/*` endpoints completely bypass the cache and go straight to network.
   - Zero caching of live GPS snapshots, student credentials, or authorization headers.
3. **Explicit Offline Recovery UX**:
   - When network connectivity is lost, display `#offline-banner` showing the exact timestamp of last synchronization (`HH:mm:ss`).
   - In vehicle detail views, display `#offline-cache-banner` explicitly notifying commuters:
     > *"You are viewing cached route data from [time]. Live GPS tracking and real-time ETAs are paused until network is restored."*

## 3. Consequences

- **Positive**: App can be installed to home screens on iOS and Android. Commuters can view route timetables and stops offline.
- **Privacy & Freshness**: Absolute protection against stale telemetry masquerading as live locations. Zero PII stored in service worker cache.
