# Phase Plan: Phase P0 — Foundation (Milestone M0)

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C, Phase P0)  
**Authoritative Rules**: `AGENTS.md` (Part B)  
**UI Specification**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md) (Provisional Baseline via [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md))  
**Hardware Contract**: [`HW-INT-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/hardware-integration-specification.md)  
**Phase ID**: `P0`  
**Milestone**: `M0`  
**Status**: IN PROGRESS / FOUNDATION BUILD  

---

## 1. Specification Sections Read & Authority Verification

Per **AGENTS.md B.9 step 1**, Antigravity has read and verified all specification sections cited for Phase P0 in `AG-MASTER-1.0-v2-College-Bus-Tracker.md`:

- [x] **Section 1**: Purpose and Scope (College transit tracking for VJIT, 2-surface scope).
- [x] **Section 2**: Architecture overview and sub-system boundaries.
- [x] **Section 4**: User roles (STU, FAC, COR, TEC, SAD, MGT, SEC).
- [x] **Section 6**: Identity and Access Management principles.
- [x] **Section 7**: Authentication flows (OIDC SSO, Email OTP, Sessions).
- [x] **Section 8**: OTP generation, verification, locking, and rate limiting.
- [x] **Section 10**: Database data model (10.1 to 10.4 identity, roles, sessions, MFA, audit, settings, feature flags).
- [x] **Section 28**: Security baseline controls and hardening requirements.
- [x] **Section 31**: Operational monitoring, logging, metrics, and health endpoints.
- [x] **Section 33**: Environment configurations, secrets management, and feature flags.
- [x] **Section 34**: Code standards, lint rules, and error handling conventions.
- [x] **Section 35**: 72 operational configuration defaults (copied in Part I.5).

---

## 2. Planned Tasks Breakdown

| Task ID | Task Title & Scope | Files Touched / Created | Unit & Integration Tests Planned | Spec Sections Implemented |
|---|---|---|---|---|
| `P0-T1` | Monorepo Setup: pnpm workspaces, Turborepo, layout in Part I.1, root scripts in Part I.2, strict TypeScript config, shared ESLint/Prettier rules, `.gitignore`. | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `.gitignore` | Monorepo syntax & lint check | Sections 2, 34; Part I.1, I.2 |
| `P0-T2` | Typed Config Loader in `packages/config`: Zod schema for environment variables (Part I.4), refusal on invalid production/local mix or placeholders, loader for Part I.5 defaults. | `packages/config/src/*`, `packages/config/package.json` | `config.spec.ts` | Sections 33, 35; Part I.4, I.5 |
| `P0-T3` | Local Environment & Direct Node.js Workflow: Local PostgreSQL 16 with PostGIS setup, `.env.example` configuration, direct Node.js development. Zero Docker requirement. Zero real credentials. | `.env.example`, `package.json`, `.nvmrc` | Node.js runtime & clean repo verification (`verify:prod-clean`) | Section 2; Part I.9; ADR-DEV-001 |
| `P0-T4` | Database Roles & Grants: `app_migrator`, `app_runtime`, `app_worker`, and append-only audit trigger rejecting UPDATE/DELETE. | `packages/db/prisma/roles.sql`, `packages/db/prisma/triggers.sql` | `db-roles.spec.ts` | Section 10; Rule R-09; Part I.6.4 |
| `P0-T5` | Prisma Schema in `packages/db`: Identity tables, access tables, roles, sessions, MFA factors, audit logs, settings, rate counters, feature flags. UUID v4, timestamptz UTC, `is_synthetic` column (Rule R-M3), partial unique indexes. | `packages/db/prisma/schema.prisma`, `packages/db/package.json` | `prisma-validate.spec.ts` | Sections 10.1–10.4; Rule R-M3 |
| `P0-T6` | Expand-Only Migration Engine & Scripts: Migration runner, rollback support for dev, verification scripts. | `packages/db/src/migrator.ts` | `test:migration` idempotency test | Section 10; Part B.8 |
| `P0-T7` | Database Seed: Configuration defaults from Part I.5 into `settings` table. Default roles & permissions from Sections 4 & 5. Super admin bootstrap user from env vars. Zero mock data (Rule B.2). | `packages/db/prisma/seed.ts` | `seed.spec.ts` | Section 35; Rule B.2; Part I.5 |
| `P0-T8` | RLS Policies on Identity Tables: PostgreSQL row-level security enabled and forced per Part I.6.3. | `packages/db/prisma/rls.sql` | `rls.spec.ts` | Section 28; Part I.6.3 |
| `P0-T9` | OIDC Client in `packages/auth`: openid-client against Google Workspace and Entra ID with PKCE, domain allowlist from settings, cryptographically signed state. | `packages/auth/src/oidc.ts` | `oidc.spec.ts` | Section 7; F-AUTH-01 |
| `P0-T10` | Email OTP in `packages/auth`: otplib 6-digit numeric, TTL 10m (`otp.ttl_min`), max 5 attempts (`otp.attempts`), lock 15m (`otp.lock_min`), consumed OTP marked, Turnstile verification support (Conflict C-04). | `packages/auth/src/otp.ts` | `otp.spec.ts` | Section 8; F-AUTH-02; Conflict C-04 |
| `P0-T11` | Session Manager in `packages/auth`: short-lived JWT access tokens, opaque refresh token rotated on each use, idle timeout 30m (15m for SEC), immediate revocation. | `packages/auth/src/session.ts` | `session.spec.ts` | Section 6, 7; F-AUTH-04 |
| `P0-T12` | MFA Factors in `packages/auth`: TOTP with QR code generation, 10 single-use recovery codes hashed with argon2id. Enforced for staff roles (COR, TEC, SAD, MGT). | `packages/auth/src/mfa.ts` | `mfa.spec.ts` | Section 6.4; F-AUTH-05 |
| `P0-T13` | Error Envelope & Domain Errors: Standard Zod error envelope in `packages/contracts`, domain error classes in `packages/domain` mapped to HTTP status codes. No stack traces or SQL details in output. | `packages/contracts/src/errors.ts`, `packages/domain/src/errors.ts` | `errors.spec.ts` | Section 34; Part I.3 |
| `P0-T14` | Structured Logger in `packages/logger`: pino with redaction of tokens, passwords, OTPs, student coordinates, personal info. `X-Request-Id` tracing. | `packages/logger/src/index.ts` | `logger.spec.ts` | Section 31; Rule B.7 |
| `P0-T15` | Shared UI Tokens & Foundations in `packages/ui`: VJIT design tokens (#E51F35 red, #103754 navy), typography, accessible buttons, inputs, tracking state badges per UI-SPEC-1.0. | `packages/ui/src/*`, `packages/ui/package.json` | `ui-tokens.spec.ts` | UI-SPEC-1.0; Sections 2, 34 |
| `P0-T16` | API Health Endpoints & Core Service Skeleton: `/healthz`, `/readyz`, `/version` in `services/api`. | `services/api/src/health/*`, `services/api/src/main.ts` | `health.spec.ts` | Section 31.1 |
| `P0-T17` | CI Pipeline & Infrastructure Skeleton: `.github/workflows/ci.yml`, Terraform skeleton in `infra/terraform/`. | `.github/workflows/ci.yml`, `infra/terraform/*` | CI syntax & Terraform validate | Sections 28, 33; Part I.8 |
| `P0-T18` | Anti-Mock Verification Tool: `verify:no-mock` script checking that production source files contain zero placeholder strings, mock imports, or dummy tokens per Rule B.2. | `scripts/verify-no-mock.mjs` | Self-test in test suite | Rule B.2; Rule R-M6 |

---

## 3. Prerequisite Gates & Blockers Check

- [x] `AGENTS.md` verified as 100% exact match against Part B.
- [x] Conflict `C-06` registered with operational alternatives documented; UI-SPEC-1.0 provisionally approved under `APR-UI-001`.
- [x] Hardware integration contract `HW-INT-1.0` documented.
- [x] Missing specification files `SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf` tracked as unresolved (`BLK-01`, `BLK-02`); research tasks `RS-16` kept blocked.
- [x] Synthetic fixtures strictly segregated into `tests/fixtures/` and simulator into `tools/simulator/`.

---

## 4. Verification Check Commands

The following commands must pass cleanly:
```bash
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test:unit
pnpm.cmd verify:no-mock
```
