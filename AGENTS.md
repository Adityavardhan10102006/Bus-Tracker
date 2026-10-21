## Part B. Project rules (save as AGENTS.md)

### B.1 Mission
Build the production software for a college bus tracker. It has four parts:
- A mobile app for iOS and Android, used by students, faculty, drivers, and security staff.
- A web console for transport staff: coordinators, technicians, super admins, management, and security (read-only views).
- A backend API with device and driver-phone ingestion routes.
- A background worker process on PostgreSQL with PostGIS.

The first release is production software. It is not a prototype, a demo, or a proof of concept. It must pass the release gate in Part C, Phase P7.

### B.2 No mock, fake, or demo data (absolute rules)
- R-M1. Production code, the production seed, and production images contain no mock, fake, dummy, sample, demo, lorem, or placeholder records. This covers buses, devices, routes, stops, people, phone numbers, email addresses, coordinates, tokens, notifications, and announcements.
- R-M2. Synthetic data exists only in `tests/fixtures/` and `tools/simulator/`. Application code must never import from those folders. A lint rule (`no-restricted-imports`) enforces this.
- R-M3. Every synthetic row written to a shared environment (dev or staging) has `is_synthetic = true`. Every business table has this column.
- R-M4. Tests create their own data inside a transaction or a disposable database, and clean up afterwards. No test depends on data left by another test.
- R-M5. The simulator refuses to run unless `APP_ENV` is `local` or `staging`, and only against hostnames in `SIMULATOR_ALLOWED_HOSTS`. It is excluded from the production build and the production image.
- R-M6. Before any release, `verify:no-mock` and `verify:prod-clean` must pass. A failure blocks the release.
- R-M7. The interface never shows sample buses, students, times, or trips. Empty states say what to do next, for example: "No buses yet. Coordinators can add buses from the Buses page."
- R-M8. Temporary test data created by hand during development is removed with `db:purge-synthetic` before a task is reported done. The purge is recorded in the phase report.
- R-M9. Never use real student, driver, or phone data in development. If a real record seems necessary for debugging, stop and ask.
- R-M10. On-duty lists, escalation contacts, college email domains, holiday calendars, and route data are entered by college staff through the console or the import tool. They are never typed into code or seed files.

### B.3 Security
Part F lists every security control. Every control is mandatory. A feature is not done until its security checks pass. Security findings of high or critical severity block the release.

### B.4 Specification conflicts
Log every conflict in `docs/decisions/conflicts.md` with: the conflicting sections, the two behaviours, the proposed resolution, and the owner. Stop work on that task until the owner resolves it. Do not implement either behaviour silently.

### B.5 Scope
Build only what SW-MVP-1.0 describes as in scope (section 2.1). Do not add features the specification does not describe. Record ideas in `docs/future.md`. Items in section 40 of the specification are out of scope for the MVP.

### B.6 Configuration, not constants
Every threshold, timing, limit, and window comes from configuration. Defaults are exactly the values in SW-MVP-1.0 section 35 (copied into Part I of this prompt). Store them in the `settings` table. Code reads them through the typed configuration loader. A threshold must never appear as a literal number in a feature file. A change to a setting is made by a super admin with a reason, and is written to the audit log.

### B.7 Coding standards
- TypeScript in strict mode everywhere. No `any`. No non-null assertion (`!`) unless a comment explains why.
- Validate every external input with Zod at the boundary: HTTP bodies, query strings, headers, path parameters, CSV rows, webhook payloads, environment variables, and device messages. Reject unknown fields. Strip nothing silently.
- Business logic lives in `packages/domain` (pure functions, no framework imports) or in services. Controllers only parse input, check authorisation, call a service, and map the result to a response.
- No SQL built by string concatenation or template literal interpolation. Use the ORM or tagged-template queries with bound parameters only. A lint rule bans `$queryRawUnsafe`, `$executeRawUnsafe`, and string-built SQL.
- Store all timestamps in UTC (`timestamptz`). Convert to `Asia/Kolkata` only in the presentation layer. Use luxon for date arithmetic.
- Errors are typed domain errors, mapped to the error envelope in Part I.3. Never return stack traces, SQL, file paths, or internal names.
- Logs are structured JSON (pino). No personal data in logs (no names, phone numbers, emails, coordinates of students, tokens, or QR payloads).
- No `TODO` or `FIXME` on the main branch without a tracking ID.
- Every service function has a unit test. Every endpoint has an authorisation test.
- No `console.log` in production code.
- No dead code, commented-out code, or unused exports.

### B.8 Definition of done (every task)
- Merged through a pull request with one approving review. CODEOWNERS applies.
- Unit and integration tests pass, covering success and every failure path named in the specification.
- Authorisation tests exist for each new endpoint, covering every role in the matrix (specification section 5).
- Every new input is validated with Zod.
- Migrations are expand-only (Phase P0, task P0-T6) and reversible in staging.
- Every admin write writes an audit row with the old and new values.
- The OpenAPI document is regenerated (development only; disabled in production).
- Logs and metrics are added (specification section 31).
- Acceptance criteria named in the task are verified and their IDs are cited in the test names.
- `verify:no-mock` and `verify:routes-auth` pass.
- The phase report is updated.
- Runbook updated if operations change (specification section 31.6).
- Risky features are behind a feature flag (specification section 33.5).

### B.9 Work process per phase
1. Read every specification section named in the phase. Write `docs/progress/PXX-plan.md`: each task ID, the files it touches, its tests, and the specification sections it implements.
2. Build tasks in the order given. Commit after each task. Commit messages start with the task ID, for example `P1-T4: transactional sample storage`.
3. Run all checks after each task. Fix failures before continuing.
4. Write `docs/progress/PXX-report.md` using the template in B.10.
5. Stop at the end of the phase and wait for approval.

### B.10 Phase report template
- Phase ID.
- Tasks completed (IDs).
- Specification sections implemented.
- Acceptance criteria verified (IDs).
- Tests added, with counts and results.
- Security checks run, with results.
- Migrations applied (names and direction).
- Configuration keys added or changed.
- Known gaps, each linked to a decision ID or a conflict ID.
- Mock-data check result (`verify:no-mock`).
- Purge result (`db:purge-synthetic`, with row counts).
- Commands to reproduce.

### B.11 When to ask
Ask only when:
- A decision in SW-MVP-1.0 section 41 has no recorded owner answer and the phase depends on it, or
- A conflict is logged and the task is blocked, or
- The work would need real personal data (R-M9).

Otherwise use the recommendation in section 41 (or the default in Part I), and record it in `docs/decisions/defaults-used.md`.
