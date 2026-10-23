# VJIT College Bus Tracker — Code Quality & Regression Prevention System

This document outlines the repeatable code quality standards, automated checks, regression prevention suites, and continuous integration gates established for the VJIT College Bus Tracker repository.

---

## 1. Quality Architecture Overview

The quality system is designed around fast local developer feedback, strict boundary safety, and automated regression prevention before code is merged:

```mermaid
flowchart LR
    DEV["Developer Editing\n(Local Workspace)"] --> FAST["Fast Pre-Flight\n(npm run check)\n~1.5s"]
    FAST --> TYPE["Type Validation\n(npm run typecheck)\nStrict TS 5.x"]
    TYPE --> BUILD["Compilation\n(npm run build)\nTurborepo Monorepo"]
    BUILD --> TEST["Regression Suites\n(npm test)\n302 Automated Tests"]
    TEST --> GATE["Full Release Gate\n(npm run verify)\nCI Pre-Merge Pass"]

    style DEV fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px
    style FAST fill:#FEF3C7,stroke:#D97706,stroke-width:2px
    style TYPE fill:#F3E8FF,stroke:#9333EA,stroke-width:2px
    style BUILD fill:#E0E7FF,stroke:#4F46E5,stroke-width:2px
    style TEST fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
    style GATE fill:#DCFCE7,stroke:#15803D,stroke-width:3px
```

---

## 2. Available Quality-Check Commands

| Command | Execution Speed | Scope & Purpose | Recommended Frequency |
| :--- | :--- | :--- | :--- |
| `npm run check` | **~1.5 seconds** | Fast composite pre-flight: executes static analysis linting, anti-mock scans, route authorization audit, and clean repository checks. | **Every commit / local edit** |
| `npm run lint` | **< 1 second** | Scans 98+ source files for banned patterns (`$queryRawUnsafe`, `console.log`, hardcoded secrets, cross-package relative escapes, async Promise bugs). | Pre-commit / on-save |
| `npm run verify:no-mock` | **< 1 second** | Enforces Rule B.2 (zero mock, fake, dummy, or synthetic records in production code; zero imports from fixtures/simulator). | Pre-commit |
| `npm run verify:routes-auth` | **< 1 second** | Enforces Rule B.7 & B.8: audits all 25 administrative endpoints to verify explicit `checkRole` guards. | Pre-commit |
| `npm run verify:prod-clean` | **< 1 second** | Confirms repository cleanliness: zero Docker files, pure Node.js runtime, verified `.env` untracked status. | Pre-commit |
| `npm run typecheck` | **~3 seconds** | Strict TypeScript compilation (`tsc --noEmit`) across all 10 packages in the monorepo. | Before testing |
| `npm run build` | **~3 seconds** | Compiles all TypeScript packages via Turborepo dependency graph. | Before release |
| `npm test` | **~6 seconds** | Executes all 302 automated tests (298 unit/integration + 4 contract tests). | Before pushing |
| `npm run verify` | **~12 seconds** | Complete end-to-end verification gate: runs `check`, `typecheck`, `build`, and `test` in sequence. | **Pre-merge & PR release gate** |

---

## 3. Standard Execution Order

When preparing changes, run checks in this order:

1. **Fast Pre-Flight**:
   ```powershell
   npm run check
   ```
   *Catches lint, secret, import, and anti-mock violations in under two seconds.*

2. **Typecheck & Build**:
   ```powershell
   npm run typecheck
   npm run build
   ```
   *Ensures strict TypeScript contracts and workspace dependencies compile without errors.*

3. **Automated Test Suites**:
   ```powershell
   npm test
   ```
   *Runs all 302 unit, integration, and contract test cases.*

4. **Complete Pre-Merge Gate**:
   ```powershell
   npm run verify
   ```
   *Runs the exact sequence enforced by the Continuous Integration pipeline.*

---

## 4. Lint Rules & Security Defect Prevention

`scripts/lint.mjs` enforces structural security controls with actionable remediation messages:

| Rule ID | Violation Pattern | Risk Prevented | Required Remediation |
| :--- | :--- | :--- | :--- |
| `SEC-SQL-01` | `$queryRawUnsafe` | SQL injection | Use parameterised tagged-template `$queryRaw\`...\`` with bound parameters. |
| `SEC-SQL-02` | `$executeRawUnsafe` | SQL injection | Use parameterised tagged-template `$executeRaw\`...\`` with bound parameters. |
| `LOG-CON-01` | `console.log(...)` | Production log pollution & unmasked PII leakage | Use `@vjit/logger` (`logger.info`, `logger.warn`, `logger.error`). |
| `SEC-KEY-01` | `BEGIN PRIVATE KEY` | Private key exposure | Load cryptographic keys from environment variables or secure key vaults. |
| `SEC-AWS-01` | `AKIA[0-9A-Z]{16}` | Cloud credential compromise | Move AWS credentials to environment variables or IAM instance profiles. |
| `SEC-PWD-01` | `postgres://user:pass@host` | Hardcoded database credentials | Load `DATABASE_URL` via `@vjit/config` from `.env` or system environment. |
| `ARCH-IMP-01` | `import ... from 'tests/fixtures'` | Mock data leaking into production (Rule R-M2) | Move test fixtures to `tests/fixtures/` and isolate from application code. |
| `ARCH-PKG-01` | `import ... from '../../packages/'` | Monorepo boundary violation | Import sibling packages via their published workspace names (`@vjit/*`). |
| `ASYNC-PRM-01` | `new Promise(async (...)` | Swallowed unhandled rejection bugs | Avoid async Promise executors; handle promises directly or with `.catch()`. |
| `DEBUG-STMT-01`| `debugger;` | Accidental execution pauses in production | Remove debug breakpoints before committing. |

---

## 5. Critical Workflow Regression Test Suite

Automated regression coverage for core business rules is consolidated in [`services/api/tests/critical-workflows-regression.spec.ts`](file:///c:/aditya/Bus%20tracker/services/api/tests/critical-workflows-regression.spec.ts):

- **[REG-AUTH-01] Administrator Authorization**: Validates that unauthorized roles (`STU`, `FAC`) are rejected with 403 `FORBIDDEN` and Part I.3 envelopes, while `SAD` can access settings (`PUT /api/v1/settings/:key`).
- **[REG-DEV-02] Device Registration & Token HMAC Security**: Verifies duplicate device registration rejection (409) and token HMAC authentication.
- **[REG-LINK-03] Authoritative Device-to-Bus Association (Rule E.6)**: Verifies that technician role (`TEC`) is blocked from device linking, and server-side device link authoritatively determines vehicle identity.
- **[REG-ROUTE-04] Bus-to-Route Assignment & Stop Sequence Integrity**: Validates stop sequence monotonicity and non-existent route error handling.
- **[REG-TELEM-05] Telemetry Ingestion Bounds**: Enforces the 8 KB payload ceiling (Spec Section 35) and rejection of invalid coordinates.
- **[REG-FRESH-06] Freshness Calculation & Staleness Transition**: Validates that telemetry older than 60s transitions to `STALE` and arrival estimates are suppressed.
- **[REG-VIS-07] Student/Faculty Snapshot Sanitization**: Asserts that `/api/v1/snapshot` never leaks tokens, token hashes, HMAC secrets, or IMEI/ICCID numbers.
- **[REG-AUDIT-08] Audit Logging & Persistence Integrity**: Confirms that administrative mutations write immutable audit rows with actor and timestamp records.

---

## 6. Continuous Integration Gate (`.github/workflows/ci.yml`)

The GitHub Actions CI workflow triggers on every push and pull request to `master` and `main`:

```yaml
name: VJIT Bus Tracker CI Pipeline

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  verification:
    name: Lint, Typecheck, Security & Unit Verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run verify:no-mock
      - run: npm run verify:prod-clean
      - run: npm run lint
      - run: npm run verify:routes-auth
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

---

## 7. Troubleshooting & Interpreting Failures

### Check Failure Decision Matrix

| Failure Type | Common Cause | How to Diagnose & Fix |
| :--- | :--- | :--- |
| **Lint Error (`LINT ERROR`)** | A banned pattern was detected (e.g., `console.log`, hardcoded credential). | Check the error line in console output. It prints `File:Line`, `Reason`, `Snippet`, and `Fix`. Replace the offending pattern per the rule remediation. |
| **Typecheck Error (`TS2322`, `TS2305`)** | TypeScript strictness violation or missing type export. | Run `npm run typecheck` to see package-specific compiler output. Ensure types are exported from `@vjit/contracts` or `@vjit/domain`. |
| **Anti-Mock Failure (`VERIFY:NO-MOCK ERROR`)** | A dummy string (e.g., `lorem ipsum`, `dummy_token`, `test@example.com`) was added to production code. | Move synthetic data to `tests/fixtures/` or use real college campus seed data (`@vjit.ac.in`). |
| **Route Auth Failure (`VERIFY:ROUTES-AUTH`)** | An administrative mutation endpoint is missing `checkRole` guards. | Inspect `services/api/src/routes/fleet-routes.ts`. Ensure `checkRole(user.role, ROLE_GROUPS.*, res, requestId)` protects the route. |
| **Test Failure (`ERR_ASSERTION`)** | A regression occurred in domain logic or API behavior. | Run the failing test in isolation: `node --test services/api/tests/<test-file>.spec.ts`. Inspect the expected vs actual value. |

---

## 8. Known Gaps & Recommended Next Steps

1. **Concurrent Store Isolation in Test Runner**:
   - The test suite runs in multiple Node.js worker threads. Test suites that mutate singleton roles (`fleetDataStore.switchUserRole`) should restore the baseline role in `afterEach` or use scoped session tokens.
2. **PostgreSQL Automated CI Job**:
   - The current CI pipeline validates in-memory transactional persistence. When database provisioning is enabled in Phase P7, add a PostgreSQL 16 service container to the GitHub Actions workflow to run migration and PostGIS queries.
