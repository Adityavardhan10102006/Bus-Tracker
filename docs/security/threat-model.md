# System Threat Model and Attack Surface Analysis

**Document**: System Threat Model (STRIDE)  
**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part F.17 & Task P7-T6)  
**Status**: DRAFT ARCHITECTURE BASELINE (To be audited during Phase P7)  

---

## 1. System Overview & Trust Boundaries

The College Bus Tracker processes real-time telemetry, location data of college buses, student attendance, driver identities, and emergency SOS alerts.

### Primary Trust Boundaries:
1. **Edge Boundary**: Public internet to AWS Application Load Balancer / WAF (`INGEST_PUBLIC_HOST` and `API_PUBLIC_HOST`).
2. **Device Boundary**: Hardware trackers communicating via cellular 4G LTE sending binary/JSON telemetry over TLS.
3. **Driver Mobile Boundary**: Driver smartphones sending foreground/background GPS batches and driver status.
4. **Student/Faculty Mobile Boundary**: Authenticated mobile apps polling route snapshots and scanning QR codes.
5. **Transport Staff Web Boundary**: Role-segregated admin console communicating with API host.
6. **Internal VPC Boundary**: API and background worker tasks accessing RDS PostgreSQL Multi-AZ and S3 private buckets.

---

## 2. Threat Analysis (STRIDE Matrix)

| Threat Category | Potential Attack Vector | Master Plan Security Mitigation | Check / Test |
|---|---|---|---|
| **Spoofing** | Rogue device transmitting false bus locations. | Per-device 256-bit Bearer tokens hashed with HMAC-SHA256 (`DEVICE_TOKEN_HMAC_KEYS`). Device linking locked to bus. | Ingestion Auth Tests (`P1-T2`) |
| **Spoofing** | Student scanning recorded/shared boarding QR code. | QR rotates every 30s (`qr.rotation_s`), HMAC signed (`QR_HMAC_KEYS`), strictly rejects outside current/previous slot. | QR Validation Tests (`P5-T2`) |
| **Tampering** | In-transit tampering of telemetry samples or events. | Mandatory TLS 1.2+ encryption; Zod boundary schema enforcement; body size limits (8 KB). | Contract replay & payload tests (`P1-T1`) |
| **Tampering** | SQL Injection via route or telemetry filters. | Lint banned `$queryRawUnsafe` & string SQL concatenation; tagged templates & ORM parameterization only. | Semgrep & ESLint rules |
| **Repudiation** | Admin altering bus assignment or deleting attendance. | Append-only `audit_logs` protected by database trigger rejecting UPDATE/DELETE; records actor, IP, timestamp, old/new state. | Database trigger test (`P0-T4`) |
| **Information Disclosure** | Student tracking unauthorized bus or intercepting other students' routes. | Strict server-side scope resolution (`E.4`); student can only see buses on their own route today; out-of-scope returns 404. | IDOR & Authorisation Matrix tests (`test:security`) |
| **Information Disclosure** | Exposure of PII (names, coordinates, phone numbers) in system logs. | Pino structured logging with strict redaction of coordinates, phone numbers, tokens, and cookies. | Log redaction unit tests (`P0-T15`) |
| **Denial of Service** | Telemetry flooding attacking ingestion endpoint. | WAF rate rules, per-device rate limiting (1 req / 2s, burst 5), global limit 200 rps with 503 Retry-After. | Load testing (`k6`) & rate limit tests (`P1-T13`) |
| **Elevation of Privilege** | Driver or student accessing coordinator/admin console endpoints. | Role-based access control guards; server-side scope evaluation; admin endpoints return 404 to unauthorized users. | Route inventory check (`verify:routes-auth`) |

---

## 3. High-Risk Operational Assets

1. **Device Tokens**: Rotated via `POST /api/v1/devices/token/rotate`; plaintext never logged or stored.
2. **Emergency SOS Pipeline**: Bypasses rate limits and quiet hours; must guarantee Tier 0 alerting < 1s.
3. **Database RLS Policies**: Forced on all 18 business tables; prevents multi-tenant or multi-role data leaks even if ORM queries omit filters.

---

## 4. Phase P7 Verification Checklist

- [ ] Complete third-party external penetration test report archived.
- [ ] Automated CodeQL and Semgrep scans clean of High/Critical findings.
- [ ] Gitleaks scan verified across all Git history.
- [ ] OWASP ZAP baseline scan clean on staging ALB.
