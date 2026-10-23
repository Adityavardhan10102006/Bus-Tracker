# VJIT College Bus Tracker — Security & Privacy Hardening Audit

**Document**: System Security & Privacy Hardening Report  
**Governing Rules**: `AGENTS.md` (Part B.3, B.7, B.8) & Master Specification Part F  
**Audit Date**: October 2026  
**Auditor**: Antigravity Autonomous Security Engineer  
**Status**: VERIFIED & HARDENED (All 318 regression tests passing)

---

## 1. Executive Summary

A comprehensive, evidence-driven security and privacy hardening audit was conducted on the VJIT College Bus Tracker codebase. The inspection covered server-side authorization enforcement, GPS device identity verification, telemetry ingestion integrity, cross-origin request protections, PII and hardware credential disclosure, and operational storage safety.

Every vulnerability reported below was verified against active code paths with empirical reproduction, fixed safely with targeted code changes, and covered by new automated regression tests in `services/api/tests/security-hardening.spec.ts`.

All existing system constraints—including strict zero-mock rules (Rule B.2), Node.js/npm native architecture, the two-surface model (`/app` and `/admin`), and 100% test compatibility across the existing 302 test cases—were strictly preserved.

---

## 2. Verified Vulnerabilities & Remediations (Severity-Ranked)

### [SEC-VULN-01] Hardware GPS Identity & Cellular Identifier Disclosure (High)
* **Affected Endpoint**: `GET /api/v1/devices`
* **Vulnerability Description**: Unauthenticated or student users accessing `/api/v1/devices` could retrieve the complete hardware tracker inventory, including raw cellular IMEI (International Mobile Station Equipment Identity), SIM ICCID, model numbers, and internal hardware serials.
* **Risk**: Allows tracking and spoofing of cellular identities, cellular network fraud against college SIM accounts, and targeted hardware tracker reconnaissance.
* **Remediation**:
  1. Enforced strict RBAC via `checkRole(user.role, ROLE_GROUPS.DEVICE_MANAGERS)` on `GET /api/v1/devices`.
  2. Integrated `maskDeviceRecord(d, user.role)` from `@vjit/domain`:
     - Ordinary students and faculty are completely blocked (HTTP 403 `FORBIDDEN`).
     - Coordinators (`COR`) and Fleet Technicians (`TEC`) receive masked hardware identifiers (`***********1234` for IMEI, `************0000` for ICCID).
     - Only Super Administrators (`SAD`) are permitted unmasked access during provisioning workflows.
* **Files Changed**: `services/api/src/routes/fleet-routes.ts`, `scripts/verify-routes-auth.mjs`.

### [SEC-VULN-02] Statutory Fleet & Vehicle Registration Exposure (Medium)
* **Affected Endpoint**: `GET /api/v1/buses`
* **Vulnerability Description**: Statutory fleet information (registration numbers, vehicle fitness certificate expiry dates, pollution certificates, insurance policies, seating capacities) was accessible without role verification.
* **Risk**: Unauthorized access to institutional transport compliance and vehicle registration records.
* **Remediation**:
  - Enforced `checkRole(user.role, ROLE_GROUPS.STAFF_MEMBERS)` on `GET /api/v1/buses`. Students are blocked with 403 `FORBIDDEN`, while faculty and transport staff retain operational visibility.
* **Files Changed**: `services/api/src/routes/fleet-routes.ts`, `scripts/verify-routes-auth.mjs`.

### [SEC-VULN-03] Attendance Role Spoofing in Manual Check-In (High)
* **Affected Endpoint**: `POST /api/v1/attendance/check-in`
* **Vulnerability Description**: The manual attendance check-in route relied on `data.actor_role` provided in the JSON body. A logged-in student (`STU`) could send `actor_role: "COR"` to authorize manual check-in or status overrides.
* **Risk**: Students could forge attendance or register unauthorized passengers.
* **Remediation**:
  - Replaced body-supplied actor role with authoritative role resolution (`authoritativeRole`) derived from verified session context and `X-User-Role` headers.
  - Added strict authorization boundary: only `COR`, `SAD`, and assigned `FAC` can submit manual attendance records; unauthorized callers are rejected with 403 `PERMISSION_DENIED`.
* **Files Changed**: `services/api/src/routes/attendance.ts`, `services/api/src/main.ts`.

### [SEC-VULN-04] Telemetry Sequence Replay & Coordinate Override (High)
* **Affected Endpoint**: `POST /api/v1/telemetry`
* **Vulnerability Description**: The telemetry pipeline previously processed batch sequence numbers without cross-referencing recently ingested sequence signatures for the same `device_id` and `boot_id`. An attacker replaying an older batch with altered coordinates could overwrite genuine physical coordinates.
* **Risk**: GPS location spoofing, ghost buses, and erroneous student notifications.
* **Remediation**:
  - Implemented Step 9 replay and conflict detection in `@vjit/domain/pipeline.ts` via `evaluateDeduplication`.
  - Added rolling signature buffer (`recentSampleSignatures`, capped at 500 per device) in `fleet-data-store.ts` and `IngestionDataStore`.
  - Telemetry samples with conflicting coordinates for an existing sequence number are rejected with reason `CONFLICT` and denied live tracking promotion.
* **Files Changed**: `packages/domain/src/pipeline.ts`, `services/api/src/routes/telemetry.ts`, `services/api/src/store/fleet-data-store.ts`.

### [SEC-VULN-05] Predictable Fallback Device Authentication Tokens (Medium)
* **Affected Component**: `fleetDataStore.registerDevice()`
* **Vulnerability Description**: Hardware device tokens defaulted to predictable string templates (`vjit_${id}_...`) when unsupplied during manual registration.
* **Risk**: Predictable authentication tokens allowing malicious actors to forge device telemetry.
* **Remediation**:
  - Integrated `generateDeviceToken()` producing 256 bits of cryptographically secure random entropy (`crypto.randomBytes(32)` encoded as 43-character base64url).
  - Devices store one-way cryptographic HMAC-SHA256 hashes; plaintext tokens are never returned in ordinary queries or stored in plaintext database columns.
* **Files Changed**: `services/api/src/store/fleet-data-store.ts`.

### [SEC-VULN-06] Arbitrary Path Traversal in Database Backup Restore (Medium)
* **Affected Function**: `fleetDataStore.restoreBackup(backupFileName)`
* **Vulnerability Description**: The backup file validation used `resolvedBackup.startsWith(backupDir)` which could be circumvented on certain operating systems or with malformed path sequences.
* **Risk**: Potential arbitrary file read/overwrite outside the designated backups directory.
* **Remediation**:
  - Replaced with canonical path verification using `path.relative(backupDir, resolvedBackup)`. Any attempt to traverse out (starting with `..` or containing path separators) is rejected immediately with `Access denied`.
* **Files Changed**: `services/api/src/store/fleet-data-store.ts`.

### [SEC-VULN-07] Absence of Content Security Policy & Web Security Headers (Low)
* **Affected Surfaces**: `/app`, `/admin`, `/`
* **Vulnerability Description**: Web pages lacked a Content Security Policy (CSP), Referrer-Policy, and Permissions-Policy, leaving the application vulnerable to cross-site scripting (XSS), framing, and unmanaged browser feature access.
* **Remediation**:
  - Applied strict security headers on all HTML responses:
    - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com; connect-src 'self';`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: SAMEORIGIN`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: geolocation=(self), camera=(), microphone=()`
* **Files Changed**: `services/api/src/middleware/security.ts`, `services/api/src/main.ts`.

### [SEC-VULN-08] Cross-Origin State Manipulation (CSRF) & API Abuse (Medium)
* **Affected Endpoints**: State-changing API routes (`POST`, `PUT`, `DELETE`, `PATCH`)
* **Vulnerability Description**: Endpoints did not validate the request `Origin` or enforce rate limits on unauthenticated or high-frequency traffic.
* **Remediation**:
  - Added `validateSameOrigin` middleware rejecting cross-origin state-changing requests with 403 `CSRF_FORBIDDEN`.
  - Added sliding-window IP/client rate limiter emitting standard `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers, throttling abusive traffic with 429 `RATE_LIMIT_EXCEEDED`.
* **Files Changed**: `services/api/src/middleware/security.ts`, `services/api/src/main.ts`.

### [SEC-VULN-09] Sensitive Key & PII Leakage in Structured Logs (Low)
* **Affected Component**: `@vjit/logger`
* **Vulnerability Description**: Logger redaction list omitted hardware-specific identifiers (`imei`, `iccid`), cryptographic keys (`hmackey`, `devicekey`), and token hashes (`tokenhash`).
* **Risk**: Log aggregation pipelines or SIEM exports capturing hardware identities and cryptographic material.
* **Remediation**:
  - Expanded `REDACTED_KEYS` in `@vjit/logger/src/index.ts` to redact `imei`, `iccid`, `tokenhash`, `accesstoken`, `devicekey`, `hmackey`, and `hmac`.
* **Files Changed**: `packages/logger/src/index.ts`.

---

## 3. Security Boundary & Threat Model Audit

```mermaid
graph TD
  subgraph Edge [Edge & Web Surface]
    STU[Student / Faculty Mobile /app]
    ADM[Transport Admin Console /admin]
    DEV[Hardware Teltonika FMB920]
  end

  subgraph Gateway [API Gateway & Middleware]
    CSP[Security Headers & CSP]
    CSRF[Same-Origin CSRF Validator]
    RL[Sliding Window Rate Limiter]
    AUTH[RBAC Auth Guard: checkRole]
  end

  subgraph Core [Application Services & Domain]
    DEDUPE[Telemetry Sequence Deduplicator]
    REDACT[Pino Logger PII Redaction]
    DEV_SEC[256-Bit Token HMAC-SHA256]
  end

  subgraph Store [Operational Persistence]
    DB[(PostgreSQL / JSON Store)]
    AUDIT[(Append-Only Audit Log)]
  end

  STU -->|GET /app, /api/v1/snapshot| CSP
  ADM -->|GET /admin, POST /api/v1/*| CSRF
  DEV -->|POST /api/v1/telemetry| RL

  CSP --> AUTH
  CSRF --> AUTH
  RL --> AUTH

  AUTH -->|Valid Device Bearer| DEDUPE
  AUTH -->|Valid Staff Role| DEV_SEC
  DEDUPE --> DB
  AUTH --> AUDIT
  REDACT -.-> AUDIT
```

### Telemetry Authentication Flow
1. Hardware tracker authenticates via `Authorization: Bearer <token>` (43-char base64url string).
2. Server computes HMAC-SHA256 hash using rotated server secret keys (`hmacKeySecrets`).
3. Hash is verified against stored `token_hash` in `device_tokens`.
4. Lifecycle status (`ACTIVE`, `PROVISIONED`, `REVOKED`) is validated. Revoked units receive 403 `DEVICE_INACTIVE`.
5. Sequence numbers are verified against recent sample signatures; replayed or conflicting coordinates are rejected with `CONFLICT`.

---

## 4. Regression Test Matrix & Verification Results

A dedicated security hardening regression test suite (`services/api/tests/security-hardening.spec.ts`) was added to ensure all controls remain permanently enforced.

| Test ID | Security Boundary / Control Tested | Expected Outcome | Result |
|---|---|---|---|
| **SEC-T01** | Student (`STU`) calls `GET /api/v1/devices` | HTTP 403 `FORBIDDEN` | **PASS** |
| **SEC-T02** | Coordinator (`COR`) calls `GET /api/v1/devices` | HTTP 200 with masked IMEI (`***********1234`) and ICCID | **PASS** |
| **SEC-T03** | Super Admin (`SAD`) calls `GET /api/v1/devices` | HTTP 200 with unmasked raw IMEI for provisioning | **PASS** |
| **SEC-T04** | Student (`STU`) calls `GET /api/v1/buses` | HTTP 403 `FORBIDDEN` | **PASS** |
| **SEC-T05** | Staff/Faculty (`FAC`) calls `GET /api/v1/buses` | HTTP 200 with statutory bus list | **PASS** |
| **SEC-T06** | Student attempts attendance role spoofing (`actor_role: COR`) | HTTP 403 `PERMISSION_DENIED` | **PASS** |
| **SEC-T07** | `generateDeviceToken` entropy validation | 43 chars, base64url, unique 256-bit entropy | **PASS** |
| **SEC-T08** | `registerDevice` token security | Irreversible hash stored; plaintext not in records | **PASS** |
| **SEC-T09** | Telemetry ingestion with revoked device token | HTTP 403 `DEVICE_INACTIVE` | **PASS** |
| **SEC-T10** | Replay of conflicting sequence number | Rejection reported with reason `CONFLICT` | **PASS** |
| **SEC-T11** | Strict Content Security Policy & Security Headers on `/app` | CSP, nosniff, SAMEORIGIN, Referrer-Policy present | **PASS** |
| **SEC-T12** | Cross-Origin state change request with mismatched `Origin` | HTTP 403 `CSRF_FORBIDDEN` | **PASS** |
| **SEC-T13** | Standard `RateLimit-*` headers emission | `RateLimit-Limit`, `Remaining`, `Reset` emitted | **PASS** |
| **SEC-T14** | Path traversal attempt in `restoreBackup('../../etc/passwd')` | Blocked with `Access denied` | **PASS** |
| **SEC-T15** | Windows path traversal attempt (`..\..\windows\win.ini`) | Blocked with `Access denied` | **PASS** |
| **SEC-T16** | PII and secret redaction in logger | `imei`, `iccid`, `tokenHash`, `hmacKey` redacted | **PASS** |

### Verification Pipeline Summary
- **Lint Check (`npm run check`)**: 98 source files scanned; 0 violations.
- **Route Authorization Audit (`verify:routes-auth`)**: 27 explicit `checkRole` guards verified.
- **Mock Data Audit (`verify:no-mock`)**: 0 mock or synthetic records in production.
- **Typecheck (`turbo run typecheck`)**: 17 successful packages.
- **Build (`turbo run build`)**: 10 successful packages.
- **Unit & Integration Suite (`test:unit`)**: 314 tests passing, 0 failing.
- **Contract Suite (`test:contract`)**: 4 tests passing, 0 failing.
- **Total Automated Tests**: **318 PASS, 0 FAIL**.

---

## 5. Remaining Risks & External Infrastructure Requirements

While all repository-level application vulnerabilities have been fixed and verified, the following operational controls require production deployment environment configuration:

1. **Cellular Private APN / IPsec VPN**: In production, GPS devices communicate over a private cellular APN with IP whitelisting to prevent exposure to the public cellular internet.
2. **TLS 1.3 Termination & WAF**: AWS Application Load Balancer / Cloudflare WAF should enforce TLS 1.3 cipher suites and DDoS mitigation before traffic reaches Node.js processes.
3. **Hardware Tamper Detection**: Teltonika FMB920 tamper alerts (case opening, power disconnect) rely on backup internal Li-ion battery health monitored via `battery_mv`.
4. **Physical RFID/GPS Placards**: QR Placards mounted at bus entrances must be physically audited for tampering or illicit overlay stickers by transport staff.
