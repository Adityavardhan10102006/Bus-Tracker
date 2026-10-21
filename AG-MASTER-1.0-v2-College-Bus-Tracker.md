# AG-MASTER-1.0 (v2): College Bus Tracker, Software Build Prompt

Prompt ID: AG-MASTER-1.0 v2 (replaces the partial draft AG-MASTER-1.0 of 19 October 2026)
Specification authority: SW-MVP-1.0 (what the software does)
Device authority: HW-SPEC-1.0 (what the tracker does; the ECE team owns it)
This prompt: how the software is built, connected, secured, tested, and released, and in what order.

---

## Part A. How to use this prompt in Antigravity

1. Create the repository. Save Part B as `AGENTS.md` at the repository root. Antigravity reads it in every session.
2. Save the two specifications in the repository:
   - `docs/spec/SW-MVP-1.0.pdf` (the software specification)
   - `docs/spec/HW-SPEC-1.0.pdf` (the hardware specification, read-only reference for the device contract)
3. Send Part D (research tasks RS-01 to RS-16) first. Wait for every output file to exist in `docs/decisions/`. Log any conflict from Part H before starting Phase P0.
4. Send one phase at a time from Part C. Each phase begins with the plan file (`docs/progress/PXX-plan.md`) and ends with the report file (`docs/progress/PXX-report.md`). Do not send the next phase until the report has been reviewed and approved.
5. Before any phase starts, Antigravity must read every specification section named in that phase, in full, and record in the plan file which section numbers it read.
6. Part G is the coverage gate. Every feature ID, business rule, acceptance criterion, endpoint, configuration key, and test case in the specification must map to a task. The coverage file must be complete before the release gate (P7).

Authority rule: the specification decides behaviour. This prompt decides architecture, security, data flow, and order of work. If the two conflict, stop work on that task, add an entry to `docs/decisions/conflicts.md`, and wait for approval. Do not guess.

---

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

---

## Part C. Build phases

Each phase maps to a milestone in SW-MVP-1.0 section 39. Dates are not committed here. They are set at kickoff.

### Phase P0. Foundation (milestone M0)
Read: sections 1, 2, 4, 6, 7, 8, 10 (identity and access tables), 28, 31, 33, 34, 35.

- P0-T1. Monorepo: pnpm workspaces and Turborepo, the layout in Part I.1, root scripts from Part I.2, ESLint with the unsafe-pattern rules, Prettier, TypeScript strict configuration shared by all packages, Renovate, lockfiles committed.
- P0-T2. Configuration loader in `packages/config`: Zod schema for every environment variable in Part I.4. Refuses to start when a required variable is missing, when `NODE_ENV` is `production` while `APP_ENV` is `local`, or when a secret equals a known placeholder value. Loads the defaults table from Part I.5.
- P0-T3. Local environment with Docker Compose: PostgreSQL 16 with PostGIS, MinIO (S3-compatible), Mailpit (email). Testcontainers for integration tests. The compose file contains no real credentials.
- P0-T4. Database roles and grants: `app_migrator` (owner, migrations only), `app_runtime` (API; no BYPASSRLS, not superuser, not owner), `app_worker` (only the grants the jobs need). The audit table grants no UPDATE, DELETE, or TRUNCATE to any application role, and a trigger rejects updates and deletes (specification R-09).
- P0-T5. Migration framework (Prisma migrations, applied as `app_migrator`). Expand-only rule: a migration may add tables, columns, and indexes. Destructive changes ship in a later release after the code no longer uses the old shape. Every partial unique index named in specification section 10 is created in a migration with a test.
- P0-T6. Initial schema from specification section 10 (all tables), with the common columns from Part I.6, CHECK constraints for enumerations (text, never database enum types), foreign-key indexes, citext emails, and geography types. Row-level security enabled and forced on the tables listed in Part I.6.3.
- P0-T7. `db:seed:config`: inserts only configuration keys with defaults (Part I.5), roles, notification templates, and the escalation tier definitions. It inserts no people, buses, routes, stops, devices, or contacts.
- P0-T8. `db:purge-synthetic`: deletes rows where `is_synthetic = true`, in dependency order. Refuses to run when `APP_ENV` is `production`. Prints row counts.
- P0-T9. Authentication: college SSO over OpenID Connect (`openid-client`, PKCE, state and nonce checks). Accepts only the college domains in `COLLEGE_EMAIL_DOMAINS`. On first sign-in, matches the email to an imported user record. If no match: show "Contact the transport office." (specification F-AUTH-01).
- P0-T10. Driver email OTP (F-AUTH-02): 6-digit code, valid 10 minutes, 5 attempts per code, 5 codes per hour per account, 10 consecutive failures lock the account for 15 minutes. Codes are stored only as HMAC (`OTP_HMAC_KEY`). Single use. Turnstile on the request endpoint after the first request in an hour (Part F).
- P0-T11. Sessions (F-AUTH-03 to F-AUTH-07): session families, access token as a signed JWT (15 minutes), opaque refresh tokens (30 days for students and staff, 12 hours for drivers), rotation on every use, reuse detection that revokes the whole family, session list and sign-out of other devices, user status checked on each request with a cache of at most 30 seconds, all sessions revoked on deactivation. No passwords are stored or accepted.
- P0-T12. Admin MFA (F-AUTH-04): TOTP enrolment at first sign-in for SEC, COR, TEC, MGT, SAD. Ten single-use recovery codes, shown once, stored as argon2id hashes. TOTP secrets encrypted at field level.
- P0-T13. Authorisation framework: role guards, scope resolution from the database (Part E.4), the route inventory check (`verify:routes-auth`), and the authorisation test harness that runs every endpoint against every role.
- P0-T14. Security baseline middleware: Helmet, cookie-parser, CORS allowlist (`CORS_ALLOWED_ORIGINS`, admin origin only), request ID (echo a valid incoming `X-Request-Id`, otherwise generate one), `Cache-Control: no-store` on authenticated responses, JSON-only (415 for other content types), body-size limits per endpoint, global error handler mapped to the envelope.
- P0-T15. Observability baseline: pino structured logs with redaction for tokens, cookies, phone numbers, emails, and coordinates; Sentry for errors (DSN from configuration); OpenTelemetry traces and metrics; health endpoints `/health` (liveness) and `/health/ready` (database; internal network only).
- P0-T16. CI and CD on GitHub Actions: lint, typecheck, unit, integration, `test:security`, `security:scan`, `verify:no-mock`, `verify:routes-auth`, build, and image scan. Deploy to dev on merge to main; staging and production need approval. Separate AWS accounts for dev, staging, and production (Terraform, Part I.8).
- P0-T17. Terraform skeleton for the environments (ECS on Fargate, ALB, RDS PostgreSQL Multi-AZ in an India region, S3 private buckets, SES, SNS, Secrets Manager, KMS, CloudWatch, WAF, ACM, Route 53, CloudFront for the console). Private subnets for the database and tasks. CloudTrail on in every account. Hardware MFA on root.
- P0-T18. Mobile shell (Expo, Expo Router): sign-in screens, role switcher (shown when a user holds more than one role), secure storage (Expo SecureStore) for tokens. Tokens are never written to AsyncStorage, logs, analytics, or crash reports.
- P0-T19. Web console shell (React, Vite, React Router, shadcn/ui, Tailwind): sign-in, MFA screens, cookie-based session, CSRF token header on every write, CSP, HSTS, X-Frame-Options DENY, SameSite=Strict cookies.

Exit: CI green in all environments; SSO and OTP sign-in work against the college test tenant with real staff accounts only after approval; `verify:no-mock` passes; security checks in Part F for P0 pass; report filed.

### Phase P1. Ingestion engine (milestone M1). Highest priority
Read: sections 5, 9, 10.5, 11 (all), 12 (all), 13 (all), 14, 17.3, 25 (source-selector, stale-checker, device-health-checker), 26.3, 26.2, 30 (latency and capacity), 32.2 (simulator), 32.3 (critical test cases for ingestion and selector).

- P1-T1. Contracts package: Zod schemas for the telemetry envelope, the sample, the event, the heartbeat, the driver location batch, and the driver status, exactly as in specification sections 11.3, 11.6, and 11.7. Unknown fields rejected. Response types for the ack structure.
- P1-T2. Device authentication (specification 11.1): read exactly one `Authorization` header with scheme `Bearer`. The token is 43 base64url characters (256 bits). Anything else returns 401 AUTH_REQUIRED. Compute HMAC-SHA256 with each active key version (at most two during rotation), look up `(key_version, token_hash)` through the unique index. Device status must be accepted per the conflict C-01 resolution in Part H. REVOKED or RETIRED device returns 403 DEVICE_INACTIVE. Revoked token returns 401 DEVICE_REVOKED. The token is never logged. Logs record `device_id` only, and only when the device exists.
- P1-T3. Telemetry validation pipeline (specification 11.5), in the exact order: authenticate; device status; body size 8 KB (413); schema (400, nothing stored); per-sample range (OUT_OF_RANGE, rejected alone); timestamps (FUTURE_TIMESTAMP beyond 60 s; STALE_TIMESTAMP older than 7 days; older than 10 minutes accepted as BUFFERED, history only); duplicates (identical content accepted silently; different content rejected CONFLICT); null island (lat 0 and lng 0 rejected NULL_ISLAND); service area (outside the area, stored flagged and rejected OUT_OF_AREA); plausibility (above 150 km/h from the last accepted valid sample, rejected IMPLAUSIBLE_JUMP and stored; reference point resets after 30 minutes without an accepted sample); clock skew (over 300 s, record CLOCK_SKEW and raise a technician alert; ordering still uses received_at); storage; selector queue; response. Each step is a separate pure function in `packages/domain` with table-driven unit tests.
- P1-T4. Transactional storage: accepted and rejected samples and all events in one database transaction. Device health updated in the same transaction. Outbox row written for the source-selector evaluation of the bus linked to the device at recorded_at (or received_at when recorded_at is null). Unlinked devices store `bus_id = null`.
- P1-T5. Duplicate guard: unique index on `(device_id, boot_id, seq)` is the final guard. A unique-violation inside the transaction is resolved by comparing content.
- P1-T6. Response builder: `ack_seq` is the highest sequence number for which every earlier sample was accepted or rejected with a reason. `rejected` lists seq and reason. `event_results` lists seq, status, and `incident_id` where relevant. `config` holds the configuration values the device needs (moving and stopped intervals, parked heartbeat). `server_time` in UTC.
- P1-T7. Heartbeat endpoint (11.6): validate, update `device_health`, insert `device_heartbeats` (partitioned daily), compute health (ONLINE, DELAYED, OFFLINE with the exact rules in specification 11.6), raise alerts on state change, return `pending_action` (NONE, UPDATE_CONFIG, REBOOT, FIRMWARE_UPDATE with `firmware_target`).
- P1-T8. Event handling (specification 12): store every event in `device_events` with dedupe key `(device_id, boot_id, event seq)`. SOS first in any request. Events older than 7 days are stored but not acted on. Handlers: SOS (incident creation or join, P2-scope alerts), GPS_LOST and GPS_RECOVERED (selector counters), NETWORK_RESTORED, BUFFER_OVERFLOW, LOW_VEHICLE_BATTERY, LOW_DEVICE_BATTERY, MODULE_ERROR (three in 24 hours opens a ticket), BOOT (three in 24 hours with WATCHDOG or BROWNOUT opens a ticket), TAMPER, FIRMWARE_UPDATED, FIRMWARE_FAILED (pauses rollout for the device), CONFIG_APPLIED, CLOCK_SYNC, DOOR_OPEN and DOOR_CLOSE (stored only), RFID_TAP (stored; phase 2 processing). Unknown type: stored as IGNORED and returned in `event_results`. Server-generated events are written to the operations timeline and the audit log: NO_HEARTBEAT, NO_SAMPLES, SOURCE_SWITCHED, SHIFT_STARTED, SHIFT_ENDED, TRIP_LATE_START, SOS_ESCALATED.
- P1-T9. Token rotation (11.1 and HW-SPEC 13.4): `POST /api/v1/devices/token/rotate` with the current token returns the new token once. PENDING token expires after 24 hours if unused. First successful request with the new token activates it and revokes the old one. Plaintext is never stored and never logged.
- P1-T10. Source selector (specification section 13), implemented as a pure function in `packages/domain`, exactly as in Part E.3. Runs on every accepted valid sample and every 5 seconds per bus with an active shift (job `source-selector`). Writes `source_switches` with the reason code. Anti-flapping (cooldown 30 s; return to hardware needs 3 valid fixes within 30 s; more than 6 switches in 600 s holds the current source for 300 s and raises a technician alert). Manual modes bypass the cooldown. Table-driven tests cover every row of the transitions table in 13.4.
- P1-T11. Bus state (specification 14): states NOT_RUNNING, LIVE, STALE, UNAVAILABLE, NO_HARDWARE. `bus_state` updated with optimistic locking (`version`). NOT_RUNNING is never displayed as Offline (R-20). Device health is reported separately.
- P1-T12. Snapshot endpoint (`GET /api/v1/snapshot?route_id=`): authenticates, resolves scope from the database, returns 404 when the route is outside scope, reads `bus_state` for buses on the route with a trip today, computes data age and ETA for the caller, caches per route version for `snapshot.cache_s` (3 s), returns an ETag and `Cache-Control: private, max-age=0`, returns 304 when unchanged. The active source is returned from the server; clients never choose it (R-10).
- P1-T13. Rate limits (specification 11.8): per-device telemetry (1 per 2 s, burst 5), heartbeat (1 per 30 s, burst 3), driver locations (1 per 5 s, burst 10), driver status (1 per 60 s, burst 3), global ingestion 200 requests per second (503 with Retry-After). Implemented with the `rate_counters` table and a cleanup job. Also the WAF rate rules on the ingest host (infrastructure).
- P1-T14. Authentication failure controls: failed authentications counted per source IP (more than 20 in 5 minutes returns 429 for that IP). More than 50 failures for one device in 5 minutes raises a security alert. The token is never in the log line.
- P1-T15. Simulator in `tools/simulator/` (local and staging only, R-M5): 50 buses, hardware and phone sources, normal and failure scenarios (no GNSS, network loss and buffered flush, ignition changes, SOS, duplicates, out-of-range values, null island, jump, clock skew, token revoked). Every simulator row carries `is_synthetic = true`. The simulator is excluded from production images.
- P1-T16. Contract replay harness (`test:contract`): replays recorded device messages from each firmware version. Starts with the example messages in specification section 11.3 and 11.4. Runs on every backend build.
- P1-T17. Load test (`load:test`, k6): sustained 200 requests per second on ingestion for 30 minutes, snapshot p95 at most 300 ms with 500 concurrent app users. Results recorded in the phase report.

Exit: the acceptance criteria for ingestion and the source selector pass in the simulator; the contract replay passes; load test meets the targets; no simulator data remains outside the simulator environment (`db:purge-synthetic` run after the test).

### Phase P2. Student and faculty apps (milestone M2)
Read: sections 16.1 (student), 16.2 (faculty), 17 (all), 13.7, 6.8 of this prompt cross-checked against section 5, 20.1 to 20.2, 21 (notifications, student-facing parts), 30 (app size, cold start).

- P2-T1. Home and live map (MapLibre React Native with a configurable style): the buses on the student's route with a trip today only (R-12). Each bus card shows Bus NN and its state label from specification 13.7 (for example "Live, bus tracker", "Live, driver's phone", "Last update N seconds ago", "Location unavailable. Last seen at HH:MM", "Not running. Next trip at HH:MM"). Source label beside the position, never only in a menu. Colour is never the only indicator: each state has text and an icon.
- P2-T2. Bus detail: stop list with ETA, arrival and departure states (Arriving, Departed), route line, last-update age. Polling every 10 seconds in foreground (`app.poll_foreground_s`). Stale badge when data age exceeds 60 seconds. Positions older than 60 seconds are never shown as live.
- P2-T3. Stop requests (F-STP student side): submit a proposed stop with a name (max 60 characters), a location within `route.corridor_m` (300 m) of the route, duplicate check within `stop.duplicate_m` (100 m), vote on others' requests, 7-day limit (`stop_request.limit_days`).
- P2-T4. Boarding-stop change (`POST /student-routes/{id}/boarding-stop`), only when the student has been notified.
- P2-T5. Attendance view (`GET /attendance/me`): own history only.
- P2-T6. Leave (student side): mark leave for a date and trip type until 30 minutes before the scheduled departure (`leave.cutoff_before_trip_min`). Categories Personal, Academic, Other. Cancel until the cutoff, only if no boarding occurred.
- P2-T7. Faculty home: buses assigned for the whole service day; trip summary; leave marking for students on their bus until the boarding cutoff; absence alerts view and acknowledgement.
- P2-T8. Notification centre (in-app), preferences screen. SAFETY category cannot be changed or muted (R-11).
- P2-T9. Profile: name and phone only (`PATCH /me`). Data request screen (export, correction, deletion, withdrawal of consent) per F-PRV.
- P2-T10. Accessibility: WCAG 2.1 AA checks (`test:a11y`, `@axe-core/playwright` for the web; Maestro checks on mobile). Text scaling and screen reader labels on every state label.
- P2-T11. Students' devices do not send location to the server (R-19). The student app contains no background location code.

Exit: student and faculty journeys pass Maestro and Playwright tests with synthetic accounts in staging; no real student data used; report filed.

### Phase P3. Driver app and phone tracking (milestone M3)
Read: sections 15 (all), 11.7, 13.1, 13.2, 13.6, 16.3, 18.3, 19 (SOS triggers for drivers), 30 (battery target), 32.3, and the Android and iOS findings in RS-02 and RS-03.

- P3-T1. Sign-in by driver email OTP. Roster screen lists only buses with an active roster entry for this driver (R-03: a driver may be rostered on several buses but runs one shift at a time).
- P3-T2. Pre-trip check (specification 15.1): nine checks in the order given there. Blocking checks: rostered bus, trip type selected, phone location Always (Android background permission or iOS Always), notification permission, phone GPS fix with accuracy 50 m or better within 60 s unless hardware is GREEN, network reachable. Warnings only: hardware status (GREEN, AMBER, RED), battery optimisation exemption (Android, opens the setting directly). Start is enabled only when all blocking checks pass.
- P3-T3. Start shift (`POST /shifts`): one shift per bus (R-04) and per driver (R-03). Creates the shift (status ACTIVE), the trip (or reuses it), sets the bus mode to AUTO (or the bus default), creates one EXPECTED attendance record per student on the route for the trip type unless ON_LEAVE, starts phone standby sampling, notifies faculty (TRIP). Issues a shift-scoped session claim containing `shift_id` and `bus_id`.
- P3-T4. Background location (expo-location and expo-task-manager with an Android foreground service of a location type, and iOS background location): sampling and buffering on the device in platform storage, batched upload to `POST /api/v1/driver/locations` (50 samples or 16 KB maximum). Interval from the server response: `phone_interval_s` (30 while hardware is active, 10 while phone is active). Plugin configuration and permission strings come from RS-02.
- P3-T5. Phone sample rules (specification 11.7): live use requires accuracy 50 m or better, a provider other than NETWORK, `is_mock` false, and passing 11.5. Mock samples are stored and flagged and never update live state. `speed_mps` is converted to km/h (multiplied by 3.6) on the server. Android reports mock status directly; iOS detection is best effort.
- P3-T6. Driver status (`POST /api/v1/driver/status`): at shift start, every 5 minutes during a shift, and whenever a permission changes.
- P3-T7. Mode control: AUTO (default), MANUAL_HW, MANUAL_PHONE. Each change requires a reason. Banner text per specification 13.4. Changes logged with actor and reason.
- P3-T8. Live and recovery: the app resumes the same `shift_id` after a restart. It never creates a new shift. A new sign-in during an active shift resumes that shift. Driver session expires 12 hours after sign-in.
- P3-T9. End shift (specification 15.4): manual end with confirmation; prompt after 20 minutes without movement below 3 km/h with ignition OFF or no hardware and no phone movement; if no response within 10 minutes the shift ends with AUTO_IDLE; timeout at 14 hours (TIMEOUT, coordinator alert). The driver cannot end a shift while an SOS incident for that bus is OPEN; only the coordinator can end it, with a reason.
- P3-T10. Ending a shift: stop phone tracking, mark the trip COMPLETED, compute the trip summary (specification 15.7), set bus state to NOT_RUNNING, close the boarding window, stop QR generation.
- P3-T11. Attendance on the driver app: expected passengers list (`GET /trips/{id}/passengers`), manual check-in with the search by name or roll number, FLAGGED_GUEST with a required reason, LATE_BOARDED with a required reason, and the QR payload (`GET /trips/{id}/qr`, rotating every 30 seconds, displayed full screen).
- P3-T12. SOS on the driver app: one-tap trigger with confirmation, full-screen alert with sound for incoming alerts (Android notification channel `SOS`, high importance, full-screen intent; iOS time-sensitive interruption level; no Critical Alerts in MVP per SW-MVP-1.0 section 41 item 11). Cancellation within 30 seconds with a required reason. After any acknowledgement, cancellation requires a coordinator.
- P3-T13. Battery and reliability: target 8 percent per hour or less of background tracking on the reference phone (specification 30). Measured in the two-hour test (section 32).
- P3-T14. Driver report to maintenance: `POST /tickets` (DRIVER_REPORT source), categories and a description of up to 500 characters.

Exit: pre-trip, shift, mode switch, phone tracking, SOS, and end-of-shift journeys pass Maestro on Android and iOS reference devices; battery test recorded; report filed.

### Phase P4. Coordinator and technician consoles (milestone M4)
Read: sections 16.4, 16.5, 16.6, 16.8 (management), 24, 10.2 to 10.4, 13.8, 26.4 to 26.6, 26.9, 27, 33.8 (firmware rollout), and HW-SPEC sections 13 and 17 as the device contract.

- P4-T1. Buses: create and edit (bus number, registration, capacity 1 to 150, status ACTIVE, MAINTENANCE, RETIRED, expiry dates for insurance, fitness, pollution, and permit with reminders at 30 and 7 days (`doc.expiry_warn_days`)). Audit row per write.
- P4-T2. Devices: batch provisioning (device_id pattern HW_ plus 3 or 4 digits, serial number, IMEI 15 digits unique, ICCID 19 or 20 digits). Generates the token once (256-bit random, shown once as text and as a QR code). Stores only HMAC-SHA256 with the newest key version. Status PROVISIONED. "Not yet connected" after 30 days without first use. IMEI and ICCID masked to the last four digits for COR and TEC; unmasked for SAD only.
- P4-T3. Token rotation request (TEC or COR), revocation (COR or SAD; the coordinator types the bus number to confirm; creates a maintenance ticket automatically).
- P4-T4. Device linking (COR only; specification 13.1 and 11.1): one open link per device and per bus, `valid_from` defaults to now, past dates up to 7 days back, lock both rows with SELECT FOR UPDATE, close earlier open links at `valid_from`, write the audit row with old and new values. Technicians never link devices.
- P4-T5. Unlinked devices list (warning), device health view (ONLINE, DELAYED, OFFLINE with last heartbeat), the health summary card per bus, the comparison view for COR and SAD (last 10 minutes of both sources as two tracks, active source marked; specification 13.8).
- P4-T6. Routes, stops, route geometry (versioned line), timetables, route-bus assignments per weekday mask with overlap checks in one transaction, holidays calendar. Stop deactivation has an effective date. Stop edits never modify an existing stop (R-13); a stop request approval creates a new stop.
- P4-T7. Rosters and faculty assignments (dated, one open primary per bus). Student routes (one open route per student and trip type, R-06).
- P4-T8. User management: create, edit, deactivate (sessions revoked within the 30-second cache), role assignment (SAD only, every change audited), CSV import with dry run then commit (5 MB, streaming parser, formula-injection protection, per-row errors reported, nothing committed until the user confirms; specification 36 for formats).
- P4-T9. Live fleet view for COR, SEC, SAD, MGT (MGT sees counts only). Bus detail with source labels, device ID for COR and TEC, the track view.
- P4-T10. Trip management: list by date, route, or bus; cancel with reason (notifies faculty and students, category TRIP); trip summary; manual shift end (ADMIN, with reason); manual mode override with reason.
- P4-T11. Firmware releases and staged rollouts (TEC): upload firmware image to a private bucket, record SHA-256 and size, sign-off by the release key (signature verified server-side before the release is marked READY). Rollout steps: canary of 5 buses, then 25 percent, then the full fleet, with 48 hours between steps (`firmware_rollouts`). Rollout pauses for a device on FIRMWARE_FAILED. The update is served only while the bus is parked with ignition OFF and the vehicle voltage is above the threshold reported in the heartbeat. No update starts while an SOS is pending for the device.
- P4-T12. Maintenance tickets: create, assign, update status, resolve with a note, close. Automatic tickets from system alerts. Technicians see tickets for devices; coordinators see tickets for buses.
- P4-T13. Settings console (SAD writes with a reason; COR reads): every key in Part I.5, shown with its default, its current value, and its section reference. Feature flags (SAD).
- P4-T14. Audit log viewer (SAD, COR read-only), filters by actor, entity, and date. Export of the audit log is allowed only to SAD and is itself audited.
- P4-T15. Admin console host (`ADMIN_PUBLIC_HOST`) serves the static console; it calls the API host. Admin pages are not discoverable: unauthorised users receive 404 for admin routes, the admin bundle is not reachable from the mobile app, and the page list is generated from the server's role result, not hard-coded in the client.

Exit: console journeys pass Playwright tests with synthetic accounts in dev; authorisation matrix tests pass for every endpoint; axe checks pass; report filed.

### Phase P5. Attendance and alerts (milestone M5)
Read: sections 18 (all), 21.1 to 21.6, 21.9, 22 (operational alerts), 25 (absence-evaluator, boarding-cutoff, attendance-expected-builder), 26.7.

- P5-T1. Boarding QR (specification 18.1): payload signed with `QR_HMAC_KEYS` (versioned), rotated every 30 seconds (`qr.rotation_s`), accepted for the current and previous slot only. QR payload contains the trip reference, the bus reference, and the slot; no student data.
- P5-T2. Scan validation (specification 18.2), in order, first failure returns its code: session (AUTH_REQUIRED); token decode and HMAC (QR_INVALID); slot window (QR_EXPIRED); trip ACTIVE for the bus in the token (TRIP_NOT_ACTIVE); student expected on this trip and not on leave (NOT_ON_ROUTE); no BOARDED or LATE_BOARDED record (DUPLICATE_BOARDING); boarding window open (BOARDING_WINDOW_CLOSED); write BOARDED with method QR and boarding stop; return confirmation with bus number and time.
- P5-T3. Manual check-in and correction (18.3, 18.4): LATE_BOARDED after the window with a reason; FLAGGED_GUEST with a reason, never counted as a passenger; corrections by COR only, with a reason, audited.
- P5-T4. Status transitions exactly as in specification 18.4. Records are never deleted.
- P5-T5. Boarding window (18.5): opens 10 minutes before scheduled departure (`boarding.window_before_min`), closes 15 minutes after (`boarding.window_after_min`). For a late-started trip, measured from actual departure.
- P5-T6. Boarding-cutoff job (every minute): sets ABSENT for EXPECTED records after the cutoff. Idempotent.
- P5-T7. Absence evaluator (18.6): afternoon cutoff plus a safety run every 5 minutes. Applies to students with records on both trips of the same date. Condition: morning BOARDED or LATE_BOARDED and afternoon ABSENT. Not on leave for the afternoon. Creates one `absence_alerts` row per student per date, notifies the primary faculty (else all assigned faculty, else the coordinator). Closes with BOARDED_LATE if the student boards late before acknowledgement.
- P5-T8. Leave (18.7): student or faculty creates leave until the cutoff; leave sets EXPECTED to ON_LEAVE immediately; cancellation reverts to EXPECTED only if no boarding occurred. Leave records store the category only.
- P5-T9. Daily coordinator summary (21.9) at `summary.send_time` (08:00 campus time): lists every alert of the day and trip exceptions.
- P5-T10. Operational alerts (specification section 22): implement every alert in the catalogue of section 22, each with its severity, recipients, and auto-resolution rule. Includes device offline during a shift, source switch flapping, no source for 120 seconds, SOS with zero delivered recipients after 60 seconds (Severity 1), job lag over threshold, dead-lettered jobs, certificate and token expiry, backup freshness, clock skew, buffer overflow.
- P5-T11. Attendance acceptance tests from specification 18.10 and the morning-present, afternoon-absent acceptance criteria.

Exit: QR, manual, late, absence, and leave journeys pass in staging with synthetic data; operational alert catalogue complete; report filed.

### Phase P6. Reports and privacy (milestone M6)
Read: sections 23 (reports), 26.9, 29 (all), 22 (privacy-related alerts), 10.10, 25 (retention-purger, export-generator).

- P6-T1. Reports (section 23): each report defined there, with its role access, filters, and columns. Exports are asynchronous (`export_jobs`), stored in the private bucket, presigned for 15 minutes or less, expire on the schedule in section 23, and the requester is notified on completion or failure.
- P6-T2. CSV export hardening: cells starting with `=`, `+`, `-`, or `@` prefixed with an apostrophe. UTF-8 with BOM for spreadsheet compatibility.
- P6-T3. Location history access (R-17): COR and SAD only, every access audited, the track view limited to the period chosen and shown with the purpose field.
- P6-T4. Parental consent flow (29.2): verification of the guardian by one-time code confirmed by counsel; consent rows with `granted_by_user_id` and the notice version; withdrawal of consent.
- P6-T5. Limited mode for under-18 students without consent (SW-MVP-1.0 section 41 item 8, counsel to confirm): implement the mode as defined in section 29.2 behind a feature flag until counsel confirms.
- P6-T6. Personal data requests (29.3): export, correction, deletion, withdrawal of consent. Status workflow RECEIVED, IN_PROGRESS, COMPLETED, REJECTED_WITH_REASON. Due dates from the policy. Deletion job removes personal fields and keeps aggregate counts.
- P6-T7. Retention jobs (29.4 defaults, configured): partitions for location samples (90 days) and heartbeats (90 days) dropped; device events 1 year; trip summaries 2 years; attendance 2 years or the academic-year policy; absence alerts 1 year; SOS incidents 3 years with personal fields anonymised and aggregate counts kept; stop requests 2 years; in-app notifications 90 days; notification delivery logs 90 days. Retention values are configuration, owned by the policy owner.
- P6-T8. Breach response runbook and the notification template for the data protection officer (29.6). Runbook RB-01 to RB-13 (section 31.6) written for each named operation.
- P6-T9. Driver privacy (29.7): phone location collected only during an active shift and with permission (R-18); the driver can see what is collected.

Exit: privacy requests complete end to end in staging; retention jobs verified with a backdated synthetic dataset that is then purged; report filed.

### Phase P7. Hardening and pilot (milestone M7). Release gate
Read: sections 30, 31, 32 (all), 33 (all), 34 (all), 36, 37 (edge cases), 38 (release gate), 39 (definition of done).

- P7-T1. Load tests: ingestion at 200 requests per second, snapshot with 500 concurrent app users, 5,000 registered users dataset (synthetic, in staging, purged after). Results and the capacity conclusion in the report.
- P7-T2. Failover drills: database failover in staging, ECS task kill during ingestion, Redis is not used so no Redis drill; pg-boss job recovery after worker kill; restore from backup within 1 hour; point in time within 15 minutes (recovery point).
- P7-T3. Failure injection (HW-SPEC 16.3 failure cases relevant to the server): token revocation, 503 storm, clock skew of 2 hours, delayed buffered flush, duplicate storms, mock locations from the phone, phone app killed mid-shift.
- P7-T4. Edge cases: section 37 of the specification, one test per listed edge case.
- P7-T5. Penetration test before launch (external firm). Findings of high or critical severity block release (specification 28). OWASP ZAP baseline in CI.
- P7-T6. Security review: threat model in `docs/security/threat-model.md`, Semgrep and CodeQL with zero high findings, gitleaks clean, dependency audit clean for critical (within 7 days) and high (within 30 days).
- P7-T7. Accessibility audit (section 30) and the mobile performance targets: cold start 3 seconds or less on a mid-range Android phone with 4 GB RAM; Android download 40 MB or less; iOS app 60 MB or less.
- P7-T8. Pilot: three buses for two weeks, then a staged rollout. Pilot exit criteria from specification section 39 (live position available for at least 99 percent of active-shift minutes; SOS delivered within 5 seconds at 95th percentile in drills; at least 95 percent of boardings recorded within 2 minutes; no cross-role exposure; no Severity 1 open).
- P7-T9. Release gate (specification section 38): every item checked and recorded. `verify:no-mock`, `verify:prod-clean` (no synthetic rows, all user emails in the college domains), `verify:routes-auth` pass in the production build.
- P7-T10. Coverage gate (Part G): every ID mapped, every test present, every gap closed or explicitly deferred by the product owner.

Exit: release gate passed and signed by the product owner, security reviewer, and the transport office.

---

## Part D. Research tasks (do these before Phase P0)

For each task, write the output to the file named. Cite the official source you used and the date you checked it. If a result contradicts this prompt or the specification, log it in `docs/decisions/conflicts.md` and stop that task. IDs are prefixed RS- so they do not clash with the business-rule IDs (R-01 to R-20) in the specification.

| ID | Question | Output file |
|---|---|---|
| RS-01 | Current stable versions of every package in Part I.2. Compatibility of the Expo SDK with React Native, NestJS with the chosen Node.js LTS, Prisma with PostgreSQL 16, pg-boss, and MapLibre React Native with Expo. Confirm the Android and iOS minimum versions from SW-MVP-1.0 section 41 item 15 (Android 10 and later, iOS 16 and later, pending device check) | `docs/decisions/versions.md` |
| RS-02 | Expo background location: config plugin options for an Android foreground service with a location type; Android and iOS permission strings; entitlements and background modes; iOS behaviour when the app is swiped away | `docs/decisions/location-permissions.md` |
| RS-03 | Google Play background location policy and the location permission declaration form, as currently published | `docs/decisions/location-permissions.md` |
| RS-04 | Apple App Review guidance for background location and time-sensitive notifications; whether the Critical Alerts entitlement is needed (MVP uses time-sensitive only) | `docs/decisions/ios-notifications.md` |
| RS-05 | FCM HTTP v1 with the Firebase Admin SDK: Android priority and channel fields, APNs headers (apns-priority, interruption level) for high-priority safety alerts | `docs/decisions/push.md` |
| RS-06 | DLT requirements for transactional SMS in India with the chosen provider: template registration, sender ID, delivery report format, signature verification | `docs/decisions/sms.md` |
| RS-07 | SNS signature verification for SES bounce and complaint messages: certificate URL allowlist, signature algorithm, topic checks | `docs/decisions/email-webhooks.md` |
| RS-08 | Cloudflare Turnstile server-side verification: endpoint, fields, hostname and action checks | `docs/decisions/captcha.md` |
| RS-09 | openid-client with Google Workspace and Microsoft Entra ID: discovery, PKCE, hosted-domain or tenant restriction. Confirm which provider the college uses (open item) | `docs/decisions/sso.md` |
| RS-10 | PostGIS: distance on geography, ST_LineLocatePoint for distance along a route, ST_Length, ST_DWithin, index types (GIST) | `docs/decisions/postgis.md` |
| RS-11 | pg-boss: queues, retry and backoff, dead letters after 6 attempts, singleton keys, cron scheduling, skip-locked fetching | `docs/decisions/jobs.md` |
| RS-12 | Prisma with PostgreSQL row-level security: setting session variables per transaction with set_config(..., true), connecting as a non-owner role without BYPASSRLS | `docs/decisions/rls.md` |
| RS-13 | MapLibre GL JS and @maplibre/maplibre-react-native: markers, line layers, style configuration with OpenStreetMap tiles and a switch for a later provider | `docs/decisions/maps.md` |
| RS-14 | Expo Location object fields on Android and iOS: speed units (m/s), accuracy, provider, mock-location flag availability per platform | `docs/decisions/gps-fields.md` |
| RS-15 | Helmet and CORS in NestJS; disabling the OpenAPI UI in production; security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options) | `docs/decisions/http-hardening.md` |
| RS-16 | Verify the device-side contract against HW-SPEC-1.0 sections 8, 9, 10, 12, and 13 before the contract tests are written. List every mismatch as a conflict | `docs/decisions/hw-contract-check.md` |

---

## Part E. End-to-end pipeline

### E.1 Overview
One path per bus. The hardware tracker and the driver's phone both send into the same ingestion API. The source selector decides which source is active. The snapshot API serves the result. The apps show the server's answer and its source label. The admin console reads the same state. Every admin write is audited.

### E.2 Hardware sample pipeline (stages run in this order)
| Stage | What happens | Owner | On failure |
|---|---|---|---|
| S1 Edge | TLS ends at the load balancer. WAF rate rules on the ingest host | Infrastructure | WAF block or 429 |
| S2 Authenticate | Bearer token, HMAC with each active key version, device lookup, status check | Ingestion auth | 401 AUTH_REQUIRED or DEVICE_REVOKED; 403 DEVICE_INACTIVE |
| S3 Size | Body at most 8 KB | Ingestion | 413 |
| S4 Schema | Zod envelope and sample schemas; unknown fields rejected | Contracts | 400 with field errors, nothing stored |
| S5 Range | Per-sample ranges (11.3) | Domain | That sample rejected with OUT_OF_RANGE |
| S6 Time | Future over 60 s rejected; older than 7 days rejected; older than 10 minutes stored as BUFFERED | Domain | Rejected or flagged |
| S7 Duplicate | Identical content accepted silently; different content CONFLICT. Unique index is the final guard | Ingestion, database | CONFLICT |
| S8 Null island and area | (0, 0) rejected; outside the service area flagged and rejected | Domain | Rejected |
| S9 Plausibility | Above 150 km/h from last accepted valid sample: IMPLAUSIBLE_JUMP, stored and flagged | Domain | Flagged |
| S10 Clock skew | sent_at differs from server time by more than 300 s: CLOCK_SKEW and technician alert | Domain | Alert |
| S11 Attribution | Device link valid at recorded_at (or received_at if null) | Ingestion | Stored with bus_id null, not shown |
| S12 Transaction | Samples, rejections, events, device health, outbox row for selector: one transaction | Ingestion | Whole transaction rolls back |
| S13 Response | ack_seq, rejected, event_results, config, server_time | Ingestion | n/a |
| S14 Selector | Evaluate the bus (E.3) | Worker | Retried by pg-boss |
| S15 Bus state | Update `bus_state` with optimistic locking | Selector | Retried |
| S16 Apps | Poll the snapshot; stale badge after 60 s | Apps | n/a |

### E.3 Source selector (exact rules, specification 13)
Clients never decide. Exactly one source is active at a time. Sources are never averaged. Both are stored in full.

Valid fixes:
- Hardware fix is valid when gps_valid is true, satellites is at least 4, hdop is 5.0 or less, the sample passed 11.5, and it is not BUFFERED.
- Phone fix is valid when accuracy_m is 50 or less, provider is not NETWORK, is_mock is false, and the sample passed 11.5.
- A source is fresh when its last valid fix is no older than 60 seconds.

Evaluation for bus B:
1. If B has no ACTIVE shift: state NOT_RUNNING, active NONE. Stop.
2. hw_fresh = last_hw_valid_at within 60 s of now.
3. phone_fresh = last_phone_valid_at within 60 s of now.
4. cooldown_ok = the last automatic switch was more than 30 s ago.
5. Apply the mode:
   - MANUAL_HW: active = HW. If not hw_fresh, state STALE.
   - MANUAL_PHONE: active = PHONE. If not phone_fresh, state STALE.
   - AUTO:
     - active HW, not hw_fresh, phone_fresh, cooldown_ok: switch to PHONE, reason HW_STALE.
     - active PHONE, consecutive_hw_valid at least 3, cooldown_ok: switch to HW, reason HW_RECOVERED.
     - active PHONE, not phone_fresh, hw_fresh, cooldown_ok: switch to HW, reason PHONE_LOST.
     - active NONE, hw_fresh: switch to HW, reason INITIAL.
     - active NONE, phone_fresh: switch to PHONE, reason PHONE_FALLBACK.
6. If neither source is fresh: state STALE. If neither has been fresh for 120 s: state UNAVAILABLE and raise one alert.
7. Otherwise: state LIVE with the active source.

consecutive_hw_valid counts valid hardware fixes in a row and resets on any invalid sample. Manual changes bypass the cooldown. A manual change to a stale source leaves the bus STALE until that source recovers.

Anti-flapping: automatic switches at least 30 s apart; return to HW needs 3 valid fixes within 30 s; every switch written to `source_switches`; more than 6 switches in 600 s holds the current source for 300 s and raises a technician alert.

Labels (13.7): LIVE with HW is "Live, bus tracker"; LIVE with PHONE is "Live, driver's phone"; STALE is "Last update N seconds ago" in grey; UNAVAILABLE is "Location unavailable. Last seen at HH:MM"; NOT_RUNNING is "Not running. Next trip at HH:MM". The source label is always beside the position. Colour is never the only indicator.

### E.4 Scope resolution (server-side only)
Scope is computed from database rows on every request. It is never taken from the client.
- STU: active student route for today, then the buses serving that route on today's weekday and trip type (R-12).
- FAC: active faculty assignments.
- DRV: active roster entries; during a shift, only the shift's bus.
- SEC: all buses with status ACTIVE, read-only.
- COR and SAD: all buses.
- TEC: devices and device health. No passenger data.
- MGT: aggregate endpoints only.
Identifiers sent by the client are filters. The server checks each against scope. An identifier outside scope returns 404, never 403.

Visibility rules are defined by the permissions matrix in SW-MVP-1.0 section 5 and the features by role in section 16. Those sections are the authority. Where this prompt summarises them, the specification wins.

### E.5 Device connection and provisioning
1. Technician creates device records in batch. Status PROVISIONED. Validation: device_id unique; IMEI 15 digits and unique; ICCID 19 or 20 digits.
2. Server generates a 256-bit random token, encoded base64url (43 characters). Stores only HMAC-SHA256 with the newest key version, records key_version. Plaintext shown once, as text and as a QR code.
3. The technician flashes device_id and token to the controller over the serial port with the provisioning tool (outside this software; HW-SPEC 13.2).
4. Label carries device_id and a QR code of device_id only. The token never appears on a label.
5. First authenticated request succeeds, and the server sets the device to ACTIVE and records first_used_at (conflict C-01 in Part H governs this step).
6. Coordinator links the device to one bus (E.6). Technicians and installers never link devices (HW-SPEC 1.4 and 13.2).

### E.6 Linking a device to a bus
- One open link per device and one per bus (partial unique indexes).
- valid_from defaults to now; past dates up to 7 days back; future dates allowed.
- In one transaction: lock the bus and the device rows (SELECT FOR UPDATE), close earlier open links at valid_from, insert the new link, write the audit row.
- From valid_from, samples are attributed to the bus. A buffered sample recorded before a move keeps its original bus.

### E.7 Driver phone connection
1. Email OTP sign-in (F-AUTH-02). Refresh token in Expo SecureStore.
2. Roster screen lists only buses with an active roster entry for this driver.
3. Start shift: server checks rostered, no ACTIVE shift on the bus, pre-trip checks (P3-T2). Creates shift and trip. Issues a shift-scoped claim with shift_id and bus_id.
4. Phone samples to `POST /api/v1/driver/locations`. Accepted only when the claim matches an ACTIVE shift for that bus and the roster entry is active (R-16).
5. Shift end: the claim stops allowing writes; the app stops sending.
6. The hardware is not bound to any driver. The selector combines both sources per bus.

### E.8 Read pipeline (snapshot)
Authenticate. Resolve scope from the database. Return 404 if the route is outside scope. Read `bus_state` for buses on the route with a trip today. Compute data age and ETA for the caller. Cache for 3 seconds per route version. Return an ETag. Return 304 when unchanged.

### E.9 Live tracking and ETA (specification 17)
- Map: MapLibre; markers for buses in state LIVE, STALE, or UNAVAILABLE with the labels from E.3; NOT_RUNNING buses have no marker.
- Update cadence: apps poll every 10 seconds in the foreground; web polls every 10 seconds.
- Stop arrival (17.4): ARRIVED when inside the stop radius (50 m) with speed below 5 km/h for 15 s. DEPARTED when outside the radius for 10 s, or when speed exceeds 10 km/h after arriving. Driver manual arrival recorded with method MANUAL and overrides automatic detection for that stop only. Each event stored in `stop_events`.
- ETA (17.5): project the bus position onto the route line; remaining distance to each stop along the line; speed estimate is the median of moving speeds (above 3 km/h) over the last 5 minutes, clamped to 10 to 60 km/h, default 20 km/h when no moving sample; ETA equals remaining distance divided by speed, rounded to the nearest minute. Under 60 seconds shows "Arriving". Passed stops show "Departed". No road snapping in the MVP.
- Stale display (17.6): STALE shows the last position in grey with age. UNAVAILABLE shows last position in grey with the last contact time; no ETA. A position is never shown live when its age is over 60 seconds.

### E.10 SOS pipeline (specification 19)
- Trigger arrives. Incident created or joined within 1 second: an OPEN incident for the same bus, triggered within 60 s of the first, becomes a JOINED event; otherwise a new incident. Two buses at the same moment always produce two incidents.
- Tier 0 starts immediately: faculty assigned to the bus, security on duty, coordinators on duty, and the sender (confirmation). Channels: high-priority push, full-screen in-app alert with sound.
- Tier 1 at 2 minutes without acknowledgement: all coordinators and the bus escalation contacts. Push, SMS (DLT template), in-app.
- Tier 2 at 5 minutes: super admins, the security office number, and the college emergency desk. Push, SMS, email.
- Tier 3 at 10 minutes: the college emergency contact list by SMS and push, repeated every 5 minutes until resolved. The MVP sends no automatic voice calls. A person telephones the list (automatic calling is phase 2).
- The sos-escalator job runs every 15 seconds and must not skip.
- Escalation stops when any FAC, SEC, or COR user marks the incident RESPONDING. A recipient's acknowledgement stops only that recipient's reminders.
- Delivery states per recipient: QUEUED, SENT, DELIVERED (where the provider gives a receipt), FAILED. Zero delivered recipients after 60 seconds raises a Severity 1 alert.
- Cancellation by the trigger user within 30 seconds, with a reason (Accidental press, Resolved before sending, Other). After any acknowledgement, a coordinator must cancel.
- Resolution: FAC, SEC, or COR marks RESOLVED with a required note of up to 500 characters. All recipients notified. Timeline exportable as CSV.
- Device delays: if triggered_at is more than 60 seconds before received_at, the incident is labelled DEVICE_DELAYED.
- Drills: flagged is_drill; recipients see a TEST label; drills never escalate beyond tier 0; drill records kept one year.
- SOS cannot be disabled by settings, quiet hours, or muting (R-11). The driver cannot end a shift while an SOS for that bus is OPEN.

### E.11 Attendance pipeline (specification 15.2, 18)
Trip starts: EXPECTED records created for each student on the route for the trip type, unless ON_LEAVE. Driver app shows the rotating QR (30 s). Student scans; server validates in the order of P5-T2. BOARDED recorded. Cutoff job sets ABSENT. Absence evaluator raises the morning-present, afternoon-absent alert. Primary faculty notified. Coordinator daily summary at 08:00.

### E.12 Notification outbox pipeline (specification 21)
A business event writes the notification and its delivery rows in the same transaction. The dispatcher fetches QUEUED rows with SKIP LOCKED. Quiet hours (22:00 to 06:00 by default) and rate limits (6 pushes per hour by default; group window 120 s) apply at dispatch. SAFETY notifications bypass both. Retry schedule 1, 5, 30, 120 minutes. After six attempts the delivery is dead-lettered and an alert is raised. Provider reference and status recorded. No personal data in `last_error`.

### E.13 Admin change pipeline
Request, authenticate, authorise, validate. One transaction: the change, an audit row with old and new values, and a route version bump for each affected route. On commit, clients see the change at their next poll (within 60 seconds for deactivated users, specification 5). The snapshot cache is keyed by route version, so no manual invalidation.

### E.14 Trip generation, late start, and end (specification 15)
- Nightly job at 00:30 campus time creates trips for the next 7 days from route-bus assignments and timetables. Unscheduled trips only when enabled by the coordinator.
- Late start: no shift within 10 minutes of scheduled departure records TRIP_LATE_START and notifies faculty. Still not started 20 minutes after departure: coordinator notified.
- Trip cancellation by coordinator with a reason notifies faculty and students on the route (category TRIP).
- Shift end (AUTO_IDLE, TIMEOUT, MANUAL, ADMIN) as in P3-T9. Trip summary (15.7): distance in km to one decimal place from accepted valid samples; duration; average moving speed excluding samples below 3 km/h; stops arrived and departed with times; boardings by method (QR, DRIVER, RFID) and late boardings; source usage percentages (HW, PHONE, none); failover count; longest data gap in minutes; SOS incidents linked to the trip.

### E.15 Hardware messages and what the software does (specification 11 and 12 summary)
| Hardware message | Software action | Visible result |
|---|---|---|
| Valid sample, fresh | Stored; becomes HW live state if newest and valid | Live, bus tracker |
| gps_valid false | Stored; not used for live state | Source may switch to phone after 60 s |
| Sample older than 10 min | Stored as BUFFERED; history only | Trip history only |
| (0, 0) | Rejected NULL_ISLAND | None |
| Jump above 150 km/h | Stored, flagged, rejected IMPLAUSIBLE_JUMP | Not shown live |
| Duplicate | Accepted silently | None |
| Same seq, different content | Rejected CONFLICT | Technician sees count |
| Batch up to 50 | One transaction; ack_seq | Device deletes acknowledged samples |
| Heartbeat gps_status NO_FIX | Health ONLINE; hardware fix invalid | Source may switch to phone |
| Heartbeat stops during ignition ON | DELAYED, then OFFLINE | Technician ticket |
| IGNITION_OFF during shift | Idle timer starts | Driver prompted after 20 min without movement |
| SOS | Incident created or joined; tier 0; incident_id returned | Recipients alerted within 5 s; device LED confirms |
| SOS triggered_at older than 60 s | DEVICE_DELAYED | Coordinator sees delay |
| LOW_VEHICLE_BATTERY | Ticket; technician and coordinator notified | Ticket |
| MODULE_ERROR three times in 24 h | Ticket | Technician |
| FIRMWARE_FAILED | Ticket; rollout paused for this device | Technician sees pause |
| 401 or 403 | Authentication failure recorded | Health OFFLINE once heartbeats stop |
| Unknown event type | Stored IGNORED | None |
| CONFIG_APPLIED | Logged | None |

### E.16 Heartbeat and device health (specification 11.6)
ONLINE: last heartbeat within twice the expected interval. DELAYED: older than that but within 10 minutes while ignition is ON, or within 24 hours while parked. OFFLINE: older than 10 minutes while ignition is ON or during a shift, or older than 24 hours while parked. Expected intervals: 60 s while ignition ON; 600 s while parked.

### E.17 Device firmware updates (server side; specification 33.8 and HW-SPEC 17)
- `pending_action` FIRMWARE_UPDATE with `firmware_target` returned in heartbeat responses only for devices in the current rollout step.
- Rollout order: canary of 5 buses, then 25 percent, then the full fleet, with 48 hours between steps.
- Server serves the image from a private bucket with a presigned link for the device. The device verifies SHA-256 and signature.
- Server records FIRMWARE_UPDATED (ok) or FIRMWARE_FAILED (pauses rollout for that device).
- Updates are only offered while the bus is parked with ignition OFF and the vehicle voltage is above the threshold reported in the heartbeat.

### E.18 Background jobs (specification 25)
All jobs run in the worker process. Each job is idempotent with a unique key. Failures retry with backoff; after six attempts the job is dead-lettered and an operational alert is raised. Jobs and schedules:
source-selector (every 5 s per active bus and on each accepted sample); stale-checker (30 s); shift-auto-end (60 s); trip-generator (daily 00:30); late-start-check (60 s during service hours); attendance-expected-builder (on trip start); boarding-cutoff (every minute); absence-evaluator (at afternoon cutoff and every 5 minutes as safety net); sos-escalator (every 15 s, must not skip); notification-dispatcher (continuous); device-health-checker (every minute); cert-and-token-check (daily); retention-purger (daily 02:00); partition-manager (daily, 7 days ahead); export-generator (on request); coordinator-summary (08:00); backup-verifier (daily).

---

## Part F. Security baseline (the 19 controls, plus the specification's controls)

Every control below must be implemented and must have a test in `test:security` or the named check. "Done" means the control is in code, has a test, and is listed in the phase report.

| # | Control | Implementation | Check |
|---|---|---|---|
| 1 | Row-level security | RLS enabled and forced on the tables in Part I.6.3. Session values set per transaction with `set_config(..., true)`: app.user_id, app.roles, app.bus_ids, app.route_ids. App role has no BYPASSRLS. Service layer still enforces the matrix (defence in depth) | Integration test: each role sees only its scope with RLS on and with service checks bypassed in a test harness |
| 2 | Auth on every API route | Every route declares its auth decision in code (`public`, `device`, `driver`, or a role list). Routes without a decision fail to build | `verify:routes-auth` in CI |
| 3 | Never trust the frontend | Scope from the database; client identifiers are filters; server chooses the active source (R-10); clients never send role or scope | Authorisation matrix tests; IDOR tests |
| 4 | Rate limiting | Specification 11.8 limits; WAF managed rules and rate rules on both hosts; sign-in and OTP limits (F-AUTH-02); per-IP auth failure limits (P1-T14) | Load test and rate-limit integration tests |
| 5 | Sanitise user input | Zod at every boundary; reject unknown fields; plain-text fields only (announcement body, notes); React escaping; no `dangerouslySetInnerHTML`; no HTML in emails except templates | Unit tests; Semgrep rules |
| 6 | Parameterised queries | ORM or tagged templates only; lint bans raw unsafe query functions and string-built SQL | Lint rule and Semgrep rule in `security:scan` |
| 7 | Lock down CORS | Allowlist from `CORS_ALLOWED_ORIGINS` (admin web origin only); credentials allowed only for that origin; no wildcard | Header tests in `test:security` |
| 8 | HTTPS everywhere | TLS 1.2 minimum, 1.3 preferred; HTTP redirected or refused; HSTS on the console; certificates via ACM with automatic renewal | Infrastructure test; ZAP baseline |
| 9 | Stop IDOR | Out-of-scope identifiers return 404; identifiers are UUID v4 except device_id; no sequential integers exposed | IDOR test suite per endpoint |
| 10 | Debug mode off in production | `NODE_ENV=production`; OpenAPI UI disabled; stack traces never returned; serial console off on devices; source maps not published | Startup refuses misconfiguration; `verify:prod-clean` |
| 11 | CAPTCHA on public forms | Cloudflare Turnstile verified on the server (hostname and action checked) on the OTP request after the first in an hour, and any public form added later | Integration test with the Turnstile test secret in local only |
| 12 | Log admin actions | `audit_logs` append-only; every admin write records actor, role, action, entity, before, after, IP, user agent (max 255), request ID | Test per admin endpoint asserts an audit row |
| 13 | Private storage buckets | S3 buckets private, public access blocked at account level, KMS encryption, presigned links at most 15 minutes for exports and firmware | Terraform policy test; test that anonymous access fails |
| 14 | Hide admin pages properly | Admin routes served only on the admin host; unauthorised users get 404; admin bundle not referenced by the mobile app; page list computed server-side from role | Route inventory test; manual review of bundle |
| 15 | Update vulnerable packages | Lockfiles committed; Renovate; `pnpm audit` and scanner in CI; critical patched within 7 days, high within 30 days | `security:scan` and the release gate |
| 16 | Check file upload types | Only CSV imports (5 MB, streaming) and firmware images (server-side, signature and SHA-256 checked). Check extension, declared type, and magic bytes; reject others; no user-uploaded images in the MVP | Unit tests with malicious samples |
| 17 | Code security review | PR review with CODEOWNERS for security-sensitive paths; Semgrep; CodeQL; threat model in `docs/security/threat-model.md`; penetration test before launch | Review record in `docs/security/` |
| 18 | Security headers | Helmet on the API; web console CSP that blocks inline scripts from unknown sources; X-Frame-Options DENY; X-Content-Type-Options nosniff; Referrer-Policy strict-origin-when-cross-origin; HSTS | Header tests in `test:security` |
| 19 | Verify webhook signatures | SNS message signature and certificate URL allowlist for SES bounces and complaints (RS-07); SMS delivery callback verified with `SMS_CALLBACK_SECRET` (RS-06); Turnstile verified server-side (RS-08); FCM and APNs use authenticated service calls only | Tests with valid and tampered signatures |

Additional specification controls (specification section 28):
- Admin roles require TOTP. Recovery codes hashed with argon2id.
- OTP codes single-use, HMAC-stored, attempts counted and locked.
- Session cookies HttpOnly, Secure, SameSite=Strict on the web. CSRF token header on every state-changing request.
- Tokens never in URLs, never in request bodies for device auth (Bearer header only), never in logs.
- Cross-role exposure: every endpoint has an authorisation test for each role (specification 5 matrix).
- Spreadsheet formula injection: exported cells starting with `=`, `+`, `-`, or `@` are prefixed with an apostrophe.
- Field-level encryption: date of birth, guardian contact, and TOTP secrets.
- Secrets in AWS Secrets Manager, rotated every 90 days; device-token HMAC keys support two active versions.
- Database and tasks in private subnets with no public address; only the load balancer is public.
- Least-privilege IAM; root protected with hardware MFA; CloudTrail on in every account.
- Audit log append-only at the database level.
- Device credentials per device, hashed, revocable. No shared keys.
- Mobile storage only in platform secure storage.
- Lockfiles committed; dependency scanning on every build.

---

## Part G. Coverage gate (nothing missing)

Before the release gate, produce `docs/progress/coverage.md` with one row per item below. Every row must name the task ID that implements it, the test that verifies it, and its status (done, deferred with a decision ID, or blocked with a conflict ID).

Items to cover:
- Every feature ID in the specification: F-AUTH-01 to F-AUTH-07; F-USR; F-FLT; F-RTE; F-ASG; F-SHF; F-TRK; F-ATT; F-SOS; F-STP; F-NTF; F-ADM; F-RPT; F-PRV. Each F- group is listed in specification section 16 (features by role) and the sections cited in Part C.
- Every business rule R-01 to R-20 (specification 9.2).
- Every acceptance criterion (AC-) in the specification, including AC-SOS-01 to AC-SOS-05 (19.10) and the attendance and tracking criteria.
- Every endpoint in specification section 26, with its role list. Cross-check against the route inventory.
- Every configuration key in specification section 35 (Part I.5), with a test that reads its default.
- Every test case T- in specification section 32.3 (critical test cases).
- Every edge case in specification section 37.
- Every row of the release gate in specification section 38.
- Every row of the definition of done in specification section 39.
- Every operational alert in specification section 22, and every background job in section 25.
- Every event type in section 12 and every rejection reason in section 11.5.
- Every role in section 4 and every cell of the permissions matrix in section 5.
- Every non-functional requirement in section 30, with its measurement method.
- Every open decision in section 41, with its owner and the default used if the owner has not answered.

---

## Part H. Conflict register (seeded)

These conflicts were found when this prompt was checked against SW-MVP-1.0 and HW-SPEC-1.0. Log each in `docs/decisions/conflicts.md` at the start of Phase P0. The task stated in each row stays blocked until its owner resolves it.

| ID | Conflict | Proposed resolution | Owner | Blocks |
|---|---|---|---|---|
| C-01 | Specification 11.5 step 2 says the device status must be ACTIVE. HW-SPEC 13.2 step 5 and the provisioning flow say the first authenticated request on a PROVISIONED device succeeds and sets ACTIVE. The two cannot both be true as written | Accept a PROVISIONED device on its first request only if the token is the one issued at provisioning and first_used_at is empty; set ACTIVE in the same transaction. Every later request requires ACTIVE | Engineering lead with ECE team | P1-T2, E.5 step 5 |
| C-02 | Research IDs in earlier drafts (R-01 to R-16) clash with the specification's business-rule IDs (R-01 to R-20) | Use RS- prefix for research tasks (this document) | Product owner (note only) | None; resolved here |
| C-03 | The earlier draft named the location field `mocked`. The specification uses `is_mock` | Use `is_mock` everywhere, including the database column and contracts | Engineering lead | P1-T1, P1-T4, P3-T5 |
| C-04 | The earlier draft required a CAPTCHA on OTP requests after the first in an hour. Specification F-AUTH-02 sets five codes per hour per account and does not mention CAPTCHA | Keep both: the per-account limit is from the specification, and Turnstile is an added bot control recorded in defaults-used.md | Engineering lead, counsel to confirm | P0-T10 |
| C-05 | The earlier draft allowed both ACTIVE and PROVISIONED devices to authenticate in general. Specification 11.5 requires ACTIVE | Resolved by C-01 | Engineering lead | P1-T2 |

Open decisions that block phases (specification 41), with the default in use until the owner answers:
- Decision 2 (AWS region): default an India region of AWS. Blocks P0-T17.
- Decision 4 (boarding method): default QR at launch. Blocks P5-T1.
- Decision 5 (driver phones): default college-issued phones where budget allows, personal phones with consent as fallback. Blocks P3.
- Decision 6 (security visibility): default read-only, all active buses. Blocks P4-T9.
- Decision 7 and 8 (parental consent, limited mode): counsel. Blocks P6-T4 and P6-T5. Build behind a feature flag.
- Decision 10 (escalation contacts and duty lists): college provides. Blocks P1-T8 tier fan-out in staging; not needed for simulator.
- Decision 11 (Critical Alerts): not in MVP. Do not implement.
- Decision 14 (GNSS source): ECE team. Software is unchanged either way.
- Decision 15 (supported OS versions): default Android 10 and later, iOS 16 and later, confirmed by RS-01.
- Decision 16 (regional disaster recovery): default accept the 4-hour regional recovery for MVP.

---

## Part I. Reference values (copied from the specification; do not change in code)

### I.1 Repository layout
```
bus-tracker/
  apps/mobile/            Expo app (student, faculty, driver, security)
  apps/admin-web/         React console (coordinator, technician, super admin, management, security)
  services/api/           NestJS API: REST routes, device ingestion, auth
  services/worker/        Job runner (same codebase, separate entry point)
  packages/contracts/     Zod schemas shared by API, mobile, and web
  packages/domain/        Pure logic: source selector, ETA, QR tokens, validation rules, state machines
  packages/db/            Prisma schema, migrations, SQL helpers, RLS policies
  packages/config/        Typed configuration loader and the defaults table
  tools/simulator/        Device and phone simulator (local and staging only)
  tests/fixtures/         Synthetic fixtures for tests only
  infra/terraform/        All AWS resources
  docs/spec/              SW-MVP-1.0 and HW-SPEC-1.0
  docs/decisions/         Research outputs, decisions, conflicts, defaults used
  docs/progress/          Phase plans, reports, coverage
  docs/runbooks/          RB-01 to RB-13
  docs/security/          Threat model and review records
  scripts/                Verification and maintenance scripts
  .github/                Workflows, pull request template, CODEOWNERS
  renovate.json
```

### I.2 Root scripts
| Script | Purpose |
|---|---|
| dev | Local services; API, web, worker in watch mode |
| build | Build all packages (production build excludes simulator) |
| lint | ESLint, Prettier check, unsafe-pattern rules, no-restricted-imports for fixtures and simulator |
| typecheck | TypeScript across packages |
| test:unit | Vitest unit tests |
| test:int | Integration tests on Testcontainers PostgreSQL with PostGIS |
| test:contract | Replays recorded device messages from every firmware version |
| test:e2e:web | Playwright |
| test:e2e:mobile | Maestro |
| test:security | Authorisation matrix, IDOR tests, route inventory, header tests |
| test:a11y | Accessibility checks |
| load:test | k6 scenarios |
| db:migrate | Apply migrations as app_migrator |
| db:seed:config | Insert configuration, roles, templates, tiers only |
| db:purge-synthetic | Delete rows where is_synthetic is true; refuses in production |
| sim:start | Start the simulator; refuses unless APP_ENV is local or staging |
| verify:no-mock | Fails on mock-data patterns in production code and seeds |
| verify:prod-clean | Fails if any production row is synthetic or has a non-college email |
| verify:routes-auth | Fails if any route lacks an explicit auth decision |
| security:scan | Semgrep, CodeQL configuration check, gitleaks, pnpm audit |

### I.3 Error envelope and codes
Every error has `error.code`, `error.message`, `error.details` (optional; never personal data), and `error.request_id`. Authentication messages are generic.

| Code | HTTP | Meaning |
|---|---|---|
| AUTH_REQUIRED | 401 | No valid credentials |
| SESSION_EXPIRED | 401 | Refresh failed or session revoked |
| DEVICE_REVOKED | 401 | Device token revoked |
| FORBIDDEN | 403 | Role not allowed |
| DEVICE_INACTIVE | 403 | Device retired or revoked |
| NOT_ON_ROUTE | 403 | Student not on this trip |
| CAPTCHA_REQUIRED | 403 | CAPTCHA missing or failed |
| NOT_FOUND | 404 | Not found, or outside scope |
| VALIDATION_FAILED | 400 | Schema mismatch; field errors listed |
| UNSUPPORTED_MEDIA_TYPE | 415 | Wrong content type |
| PAYLOAD_TOO_LARGE | 413 | Body exceeds endpoint limit |
| QR_INVALID | 422 | QR fails signature check |
| QR_EXPIRED | 422 | QR outside current or previous slot |
| CONFLICT | 409 | State conflict, or same seq with different content |
| DUPLICATE_BOARDING | 409 | Already boarded on this trip |
| BOARDING_WINDOW_CLOSED | 409 | Outside boarding window |
| SHIFT_NOT_ACTIVE | 409 | Shift not active |
| BUS_ALREADY_ON_SHIFT | 409 | Another shift holds this bus |
| TRIP_NOT_ACTIVE | 409 | Trip not active |
| IDEMPOTENCY_CONFLICT | 409 | Same key, different body |
| RATE_LIMITED | 429 | Limit exceeded; Retry-After set |
| SERVICE_UNAVAILABLE | 503 | Maintenance or overload; Retry-After set |
| INTERNAL_ERROR | 500 | Unexpected; no details; logged with request_id |

Per-sample rejection reasons (in `rejected`): OUT_OF_RANGE, FUTURE_TIMESTAMP, STALE_TIMESTAMP, CONFLICT, NULL_ISLAND, OUT_OF_AREA, IMPLAUSIBLE_JUMP. Clock skew is recorded as CLOCK_SKEW.

### I.4 Environment variables (validated with Zod at startup)
APP_ENV (local, dev, staging, production); NODE_ENV; DATABASE_URL (app_runtime, secret); DATABASE_URL_MIGRATIONS (app_migrator, secret); DATABASE_URL_WORKER (app_worker, secret); JWT_SIGNING_KEY (asymmetric, secret); JWT_KEY_ID; DEVICE_TOKEN_HMAC_KEYS (format version:key, secret, up to two active); QR_HMAC_KEYS (versioned, secret); OTP_HMAC_KEY (secret); OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET (secret); COLLEGE_EMAIL_DOMAINS; SSO_ALLOWED_RETURN_URLS; FCM_SERVICE_ACCOUNT_JSON (secret); SMS_PROVIDER_KEY, SMS_SENDER_ID, SMS_CALLBACK_SECRET (secret for the first and last); SES_REGION, SES_FROM_ADDRESS, SNS_EMAIL_TOPIC_ARNS; S3_EXPORT_BUCKET, S3_IMPORT_BUCKET; TURNSTILE_SECRET_KEY (secret); CORS_ALLOWED_ORIGINS; API_PUBLIC_HOST, INGEST_PUBLIC_HOST, ADMIN_PUBLIC_HOST; SENTRY_DSN; LOG_LEVEL (info); SERVICE_TIMEZONE (Asia/Kolkata); SIMULATOR_ALLOWED_HOSTS.

Refuse to start if a required variable is missing, if NODE_ENV is production while APP_ENV is local, or if a secret equals a known placeholder value.

### I.5 Configuration defaults (SW-MVP-1.0 section 35, copied exactly)
Seed these with `db:seed:config`. Change only through the settings console (SAD, with reason, audited).

| Key | Default | Spec section |
|---|---|---|
| hw.stale_after_s | 60 | 13.1 |
| hw.min_satellites | 4 | 13.1 |
| hw.max_hdop | 5.0 | 13.1 |
| phone.max_accuracy_m | 50 | 13.1 |
| selector.cooldown_s | 30 | 13.3 |
| selector.return_fixes | 3 | 13.3 |
| selector.return_window_s | 30 | 13.3 |
| selector.both_down_s | 120 | 13.3 |
| selector.flap_limit | 6 switches in 600 s | 13.5 |
| selector.flap_hold_s | 300 | 13.5 |
| phone.standby_interval_s | 30 | 13.6 |
| phone.fallback_interval_s | 10 | 13.6 |
| hw.moving_interval_s | 10 | 11.4 |
| hw.stopped_interval_s | 30 | 11.4 |
| hw.parked_heartbeat_s | 600 | 11.6 |
| hw.heartbeat_moving_s | 60 | 11.6 |
| hw.gps_lost_after_s | 30 | 12 |
| hw.gps_lost_ticket_min | 10 | 12 |
| vehicle.battery_mv_12v | 11800 | 12 |
| vehicle.battery_mv_24v | 23500 | 12 |
| ingest.future_tolerance_s | 60 | 11.5 |
| ingest.buffered_after_min | 10 | 11.5 |
| ingest.stale_timestamp_days | 7 | 11.5 |
| ingest.jump_max_kmh | 150 | 11.5 |
| ingest.jump_reset_min | 30 | 11.5 |
| ingest.clock_skew_s | 300 | 11.5 |
| ingest.service_area_buffer_km | 10 | 11.5 |
| ingest.batch_max | 50 | 11.3 |
| ingest.body_max_kb | 8 | 11.3 |
| ingest.phone_body_max_kb | 16 | 11.7 |
| ingest.global_rps | 200 | 11.8 |
| sos.dedupe_s | 60 | 19.2 |
| sos.cancel_window_s | 30 | 19.6 |
| sos.escalation_min | 0, 2, 5, 10 | 19.3 |
| sos.device_delay_flag_s | 60 | 19.8 |
| stop.radius_m | 50 | 17.4 |
| stop.arrival_speed_kmh | 5 | 17.4 |
| stop.arrival_dwell_s | 15 | 17.4 |
| stop.departure_dwell_s | 10 | 17.4 |
| stop.departure_speed_kmh | 10 | 17.4 |
| eta.speed_min_kmh | 10 | 17.5 |
| eta.speed_max_kmh | 60 | 17.5 |
| eta.speed_default_kmh | 20 | 17.5 |
| eta.speed_window_min | 5 | 17.5 |
| snapshot.cache_s | 3 | 17.3 |
| qr.rotation_s | 30 | 18.1 |
| boarding.window_before_min | 10 | 18.5 |
| boarding.window_after_min | 15 | 18.5 |
| leave.cutoff_before_trip_min | 30 | 18.7 |
| shift.idle_min | 20 | 15.4 |
| shift.idle_speed_kmh | 3 | 15.4 |
| shift.idle_grace_min | 10 | 15.4 |
| shift.timeout_h | 14 | 15.4 |
| shift.late_start_min | 10 | 15.6 |
| shift.late_start_coordinator_min | 20 | 15.6 |
| trip.generate_days_ahead | 7 | 15.5 |
| route.corridor_m | 300 | 20.1 |
| stop.duplicate_m | 100 | 20.1 |
| stop_request.limit_days | 7 | 20.1 |
| notify.quiet_start | 22:00 | 21.4 |
| notify.quiet_end | 06:00 | 21.4 |
| notify.push_per_hour | 6 | 21.3 |
| notify.group_window_s | 120 | 21.3 |
| notify.retry_min | 1, 5, 30, 120 | 21.2 |
| summary.send_time | 08:00 | 21.9 |
| approach.default_min | 5 (range 2 to 15) | 16.1 |
| app.poll_foreground_s | 10 | 17.2 |
| web.poll_s | 10 | 17.2 |
| session.idle_min | 30 (SEC: 15) | 24 |
| otp.ttl_min | 10 | 8 |
| otp.attempts | 5 | 8 |
| otp.lock_min | 15 | 8 |
| doc.expiry_warn_days | 30, 7 | 22 |
| service.hours | 05:30 to 22:30 | 31.9 |
| ops.peak_windows | Set at kickoff | 31.9 |
| holidays | College holiday calendar, set each year | 15.5 |

Where a key has a range or a list, store the list in the `value` column as JSON.

### I.6 Data model rules and key tables
I.6.1 Common columns for every business table: `id` (UUID v4, database-generated), `created_at`, `updated_at` (timestamptz, UTC), `is_synthetic` (boolean, not null, default false). Soft deactivation only (R-08); hard deletes only through the retention and personal-data jobs. Enumerations as text with CHECK constraints. Every foreign key indexed. Email as citext. Positions as `geography(Point, 4326)`, routes as `geography(LineString, 4326)`.

I.6.2 Tables are defined in specification section 10 (10.1 to 10.11). Key partial unique indexes: one open device link per device and per bus; one active token per device; one open route per student and trip type; one open primary faculty per bus; one ACTIVE shift per bus and per driver; one open roster entry per bus and driver; one open leave per student, date, and trip type; one attendance record per trip and student; one absence alert per student and date; one user role per user where not revoked.

Partitioned daily: `location_samples`, `device_heartbeats`. Partition manager creates partitions seven days ahead.

I.6.3 Row-level security is enabled and forced on: users, sessions, mfa_factors, recovery_codes, student_profiles, attendance_records, leave_records, student_routes, absence_alerts, sos_incidents, sos_events, notifications, notification_deliveries, notification_preferences, consents, data_requests, location_samples, export_jobs.

I.6.4 Append-only tables (no UPDATE or DELETE grant; trigger rejects changes): audit_logs, sos_events, source_switches (write-once).

### I.7 API conventions
- Two public hosts: API host (`API_PUBLIC_HOST`) for apps and the console under `/api/v1`; ingest host (`INGEST_PUBLIC_HOST`) for devices and driver phones under `/api/v1`; admin console host (`ADMIN_PUBLIC_HOST`) serves the static console.
- JSON only. Other content types return 415.
- Timestamps UTC ISO 8601 with Z. Service dates YYYY-MM-DD in the service time zone.
- IDs are UUID v4 except device_id.
- Cursor pagination: default limit 50, maximum 200; responses have `data` and `next_cursor`.
- State-changing requests from apps and the console require an `Idempotency-Key` header (UUID v4), stored 24 hours per user.
- Every response carries `X-Request-Id`, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`.
- Authenticated responses: `Cache-Control: no-store`. The snapshot: ETag and `Cache-Control: private, max-age=0`.
- Versioning: `/api/v1` stays while any device reports schema_version 1. Breaking changes need `/api/v2` and 90 days' notice.
- Bearer tokens for apps and devices; HttpOnly session cookie plus CSRF header for the console.

### I.8 Infrastructure notes
- Terraform. AWS: ECS on Fargate; Application Load Balancer; RDS PostgreSQL Multi-AZ with PostGIS; S3 private buckets; SES v2; SNS for bounces and complaints; Secrets Manager; KMS; CloudWatch; WAF; ACM; Route 53; CloudFront for the console.
- Separate AWS accounts for dev, staging, and production. Production never receives simulator traffic.
- Region: an India region (confirm in decision 2).
- Backups: daily automated, point-in-time recovery within 15 minutes, restore test each quarter, restore time 1 hour or less.

### I.9 Stack (Part 2 of v1, kept)
| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces with Turborepo |
| Mobile | Expo (React Native), TypeScript, Expo Router, latest stable SDK confirmed by RS-01 |
| Mobile libraries | expo-location, expo-task-manager, expo-notifications, expo-secure-store, expo-camera (QR display and scanning as required), @maplibre/maplibre-react-native, TanStack Query, react-hook-form, Zod |
| Admin web | React with Vite and TypeScript, React Router, Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form, Zod, MapLibre GL JS. Responsive to tablet width |
| API | Node.js LTS, NestJS, TypeScript, Helmet, cookie-parser, @nestjs/swagger (disabled in production) |
| Database | PostgreSQL 16 or later with PostGIS, managed, Multi-AZ. Prisma for migrations and typed queries; tagged-template SQL for PostGIS and RLS |
| Background jobs | pg-boss on PostgreSQL. No Redis in the MVP |
| Authentication | openid-client (college SSO over OIDC); jose (JWT); otplib (TOTP); argon2 (recovery codes) |
| Push | Firebase Admin SDK, FCM HTTP v1 (Android and iOS through APNs configured in Firebase) |
| SMS | Adapter for a DLT-registered transactional provider; registered templates only |
| Email | AWS SES v2 via AWS SDK v3; bounce and complaint through SNS |
| File storage | AWS S3 via AWS SDK v3; private buckets; presigned links |
| Bot protection | Cloudflare Turnstile, verified on the server |
| CSV | csv-parse in streaming mode |
| Logging and errors | pino; Sentry; OpenTelemetry |
| Testing | Vitest, Testcontainers (PostgreSQL with PostGIS), Supertest, Playwright, @axe-core/playwright, Maestro, k6 |
| Security tooling | Semgrep, CodeQL, gitleaks, OWASP ZAP baseline, pnpm audit, Renovate |
| CI/CD | GitHub Actions; EAS Build and EAS Submit for mobile |
| Time | Stored UTC; displayed Asia/Kolkata |
| Date library | luxon |
| Validation | Zod at every boundary |

### I.10 Device contract (summary; the specification section 11 and HW-SPEC section 10 are the authority)
- Telemetry: samples 0 to 50, events 0 to 20, body 8 KB. Sample rate: 10 s moving, 30 s stopped (ignition ON). Batch sends every 10 s moving and 30 s stopped, or at 10 samples.
- Heartbeat: every 60 s while ignition is ON; every 600 s parked.
- Driver locations: 1 to 50 samples per request, body 16 KB; phone interval 30 s standby, 10 s fallback.
- Driver status: at shift start, every 5 minutes during a shift, and on permission change.
- Device response handling: 200 delete acknowledged samples; 400 do not resend; 401 or 403 stop sending and recheck every 15 minutes; 413 split the batch; 429 wait Retry-After; 5xx backoff 5, 10, 20, 40, 80, then 120 s with plus or minus 20 percent jitter; timeout resend the same body (deduplicated on device_id, boot_id, seq).

---

## Part J. Final instruction to Antigravity

Build exactly what the specification describes, in the order of Part C, under the rules of Part B. Read each specification section before the task that implements it. Where this prompt and the specification disagree, stop and log the conflict. Where a value is missing, use the default in Part I.5 and record it in `docs/decisions/defaults-used.md`. Use no mock or sample data in production code, seeds, or images. Remove all test data with `db:purge-synthetic` before reporting a task done. Report each phase with the template in B.10 and wait for approval before starting the next phase.
