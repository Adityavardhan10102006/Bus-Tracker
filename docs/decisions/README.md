# Architecture Decisions and Research Records Index

This directory maintains the authoritative architectural decision records, conflict logs, policy defaults, and research findings for the College Bus Tracker project per Part D, Part H, and Part I of `AG-MASTER-1.0-v2-College-Bus-Tracker.md`.

---

## Core Decision & Policy Registers

| Document | Purpose | Authority Reference | Status |
|---|---|---|---|
| [`conflicts.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/conflicts.md) | Conflict register tracking discrepancies (C-01 to C-06) and Section 41 open decisions. | Part H, Section 41 | Active Governance Register |
| [`defaults-used.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/defaults-used.md) | Three-category register of authorized defaults, working assumptions, and operational thresholds. | Part B.11, Part I.5 | Active Governance Register |

---

## Formal Project-Owner Approval Records & Architecture Decisions

| Decision ID | Document / Subject | Approval Scope | Implementation Authorized | Status |
|---|---|---|---|---|
| [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md) | [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md) (VJIT UI Baseline) | Design and documentation reference only | **NO (Phase P0 Locked)** | **APPROVED FOR PROVISIONAL DESIGN BASELINE ONLY** (Conflict C-06 remains OPEN; Spec PDFs unresolved) |
| [`ADR-DEV-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/docker-removal.md) | Direct Local Node.js Development Workflow | Development Environment & Tooling | **YES (Applied)** | **ACCEPTED & APPLIED** (Docker removed; Node.js/npm native workflow) |
| [`ADR-DEV-002`](file:///c:/aditya/Bus%20tracker/docs/decisions/pnpm-retirement.md) | Eventual Retirement of pnpm Lockfile & Workspace Artifacts | Package Manager & Dependency Governance | **YES (Dual-State Applied)** | **PROPOSED / PENDING FINAL PHASE P0 RETIREMENT SIGN-OFF** |
| [`ADR-PWA-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/pwa-shell-caching.md) | Progressive Web App Architecture & Scoped Shell Caching | Mobile App Distribution & Offline Shell | **YES (Applied)** | **ACCEPTED & APPLIED** (Manifest, Service Worker, Offline Honesty) |
| [`ADR-STO-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/storage-persistence.md) | Storage Persistence & Truthful Database Health Reporting | API Persistence Layer & Readiness Gate | **YES (Applied)** | **ACCEPTED & APPLIED** (Disk persistence for admin CRUD, truthful DB check) |

---

## Research Decision Records (Part D: RS-01 to RS-16)

| Output File | Task ID | Subject / Topic | Status |
|---|---|---|---|
| [`versions.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/versions.md) | **RS-01** | Stable package versions, subsystem compatibility, and mobile OS floors. | **RESOLVED** (2026-10-21) |
| [`location-permissions.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/location-permissions.md) | **RS-02, RS-03** | Expo background location, foreground service config, and Google Play policy declaration. | **RS-02 RESOLVED** (2026-10-21) / RS-03 PENDING |
| [`ios-notifications.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/ios-notifications.md) | **RS-04** | Apple App Review guidelines, Time-Sensitive notifications, Critical Alerts exclusion. | **PENDING RESEARCH** |
| [`push.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/push.md) | **RS-05** | FCM HTTP v1 payload schemas, Android priority channels, and APNs headers. | **PENDING RESEARCH** |
| [`sms.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/sms.md) | **RS-06** | Indian TRAI DLT registration, transactional SMS templates, and webhook verification. | **PENDING RESEARCH** |
| [`email-webhooks.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/email-webhooks.md) | **RS-07** | SNS signature verification and certificate allowlist for SES bounces/complaints. | **PENDING RESEARCH** |
| [`captcha.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/captcha.md) | **RS-08** | Cloudflare Turnstile server-side verification endpoint, payload, and hostname checks. | **PENDING RESEARCH** |
| [`sso.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/sso.md) | **RS-09** | OpenID Connect RP with Google Workspace / Entra ID, PKCE, and domain restrictions. | **PENDING RESEARCH** |
| [`postgis.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/postgis.md) | **RS-10** | PostGIS spatial functions (`ST_LineLocatePoint`, `ST_DWithin`, `ST_Length`) on geography. | **PENDING RESEARCH** |
| [`jobs.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/jobs.md) | **RS-11** | `pg-boss` queues, retry backoff, dead-letter policies, singleton keys, and cron scheduling. | **PENDING RESEARCH** |
| [`rls.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/rls.md) | **RS-12** | Prisma with PostgreSQL row-level security (`set_config(..., true)`) as non-owner role. | **PENDING RESEARCH** |
| [`maps.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/maps.md) | **RS-13** | MapLibre GL JS & React Native layer architecture with OpenStreetMap tile styles. | **PENDING RESEARCH** |
| [`gps-fields.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/gps-fields.md) | **RS-14** | Expo Location cross-platform payload fields, `is_mock` availability, and m/s to km/h conversion. | **PENDING RESEARCH** |
| [`http-hardening.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/http-hardening.md) | **RS-15** | Helmet security headers, CORS origin allowlists, and Swagger UI production disabling. | **PENDING RESEARCH** |
| [`hw-contract-check.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/hw-contract-check.md) | **RS-16** | Hardware ingestion contract verification against HW-SPEC-1.0 sections 8, 9, 10, 12, 13. | **BLOCKED** (`HW-SPEC-1.0.pdf` missing) |

---

## Decision Logging Protocol

1. **Stop on Conflict**: If an implementation task or research discovery contradicts `SW-MVP-1.0`, `HW-SPEC-1.0`, or `AG-MASTER-1.0-v2-College-Bus-Tracker.md`, work on that task must stop immediately.
2. **Log Entry**: Add an entry in [`conflicts.md`](file:///c:/aditya/Bus%20tracker/docs/decisions/conflicts.md) with:
   - Conflicting sections/documents.
   - The two conflicting behaviours.
   - Proposed resolution.
   - Designated owner.
   - Tasks blocked.
3. **Wait for Approval**: Do not implement either behaviour silently.
