# Project Phase Status, Gates, and Review Notes

This dashboard tracks the macro development status, gating milestones, blocker registers, and audit records for the College Bus Tracker project per `AG-MASTER-1.0-v2-College-Bus-Tracker.md`.

---

## 1. Current Phase: MVP Stabilization & Production Readiness Complete

The project has completed **Phase P0 through Phase P5**, delivering a stabilized, installable (PWA) MVP with restart-persistent administrative storage and full hardware contract replay verification:
- Application status: **MVP Complete & Running** (205 automated tests passing; 0 lint/mock violations).
- Governance status: **Phases P0–P5 Implemented; Phase P6 & P7 Gated on Physical Pilot & Conflict Owner Approvals**.

---

## 2. Phase Lifecycle & Milestone Dashboard

Per Part C of `AG-MASTER-1.0-v2-College-Bus-Tracker.md`:

| Phase ID | Milestone | Phase Title | Status | Prerequisite Gates & Blockers |
|---|---|---|---|---|
| **PREP** | M-PREP | Documentation, Rules & Governance Setup | **COMPLETE** | `AGENTS.md` active; conflict and decision registers maintained. |
| **P0** | Milestone M0 | Foundation & Security Scaffolding | **COMPLETE** | Pure Node.js workflow, Zod contracts, auth, and database schemas. |
| **P1** | Milestone M1 | Ingestion Engine (*Highest Priority*) | **COMPLETE** | 14-step ingestion pipeline, HMAC auth, replay contract tests passing. |
| **P2** | Milestone M2 | Student and Faculty Mobile Experience | **COMPLETE** | Leaflet tracking, timetable, low-bandwidth fallback, PWA installability & offline shell. |
| **P3** | Milestone M3 | Driver App & Phone Tracking | **DEFERRED / REPLACED** | Driver mobile removed per Conflict C-06 in favor of dedicated hardware tracking. |
| **P4** | Milestone M4 | Coordinator & Technician Consoles | **COMPLETE** | Fleet operations deck, device management, maintenance tickets, disk persistence. |
| **P5** | Milestone M5 | Attendance, Arrival Estimation & Alerts | **COMPLETE** | Polyline ETA, 8-step scan validator, absence anomaly engine, emergency SOS. |
| **P6** | Milestone M6 | Reports and Statutory Privacy Rights | **SCHEDULED** | Gated on Legal/IT counsel review (Decisions 7 & 8). |
| **P7** | Milestone M7 | Physical Pilot & Hardening (*Release Gate*) | **PENDING FIELD PILOT** | Gated on physical hardware bench tests, 2-week 3-bus pilot, and final sign-off. |

---

## 3. Active Blockers to Phase P0 Kickoff

| Blocker ID | Description | Impact | Required Resolution |
|---|---|---|---|
| **BLK-01** | Missing `SW-MVP-1.0.pdf` | Prevents section-by-section specification verification prior to Phase P0. | Project owner must provide official `SW-MVP-1.0.pdf`. |
| **BLK-02** | Missing `HW-SPEC-1.0.pdf` | Completely blocks research task `RS-16` (contract verification). | ECE hardware team must supply official `HW-SPEC-1.0.pdf`. |
| **BLK-03** | Pending Research Tasks (RS-03 to RS-16) | Phase P0 cannot start until all research tasks are resolved with official citations. | Execute authorized research tasks sequentially. |
| **BLK-04** | Seeded Conflict `C-01` Unsigned | Prevents device authentication implementation in Phase P1. | Engineering Lead & ECE Lead sign-off on Option A. |
| **BLK-05** | Decision 2 (AWS Region) & Decision 9 (College SSO Provider) Unconfirmed | Required for environment config in P0-T2, P0-T9, and P0-T17. | College IT to specify SSO provider (Google Workspace vs Microsoft Entra ID). |
| **BLK-06** | Conflict `C-06` Open (Driver App Removal) | Impacts Phase P3, secondary phone ingestion (`P1-T10`), and boarding QR (`P5-T1`). Affirmed OPEN in `APR-UI-001`. | Project Owner binding decision on operational alternatives. |

---

## 4. Work Process per Phase Protocol (AGENTS.md B.9)

Every phase from P0 to P7 must strictly adhere to the following 5-step operational protocol:
1. **Plan Document**: Read every specification section named in the phase. Write `docs/progress/PXX-plan.md` detailing: task IDs, files touched, unit/integration/security tests, and specification sections implemented.
2. **Sequential Commits**: Build tasks in the order given. Commit after each task with prefix (e.g., `P1-T4: transactional sample storage`).
3. **Verification**: Run all checks (`lint`, `typecheck`, `test:unit`, `test:int`, `test:security`, `verify:no-mock`, `verify:routes-auth`). Fix failures before proceeding.
4. **Phase Report**: Write `docs/progress/PXX-report.md` using the exact template in B.10.
5. **Approval Stop**: **STOP at the end of each phase and wait for explicit project owner approval before advancing.**
