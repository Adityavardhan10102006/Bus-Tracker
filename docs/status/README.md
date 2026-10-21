# Project Phase Status, Gates, and Review Notes

This dashboard tracks the macro development status, gating milestones, blocker registers, and audit records for the College Bus Tracker project per `AG-MASTER-1.0-v2-College-Bus-Tracker.md`.

---

## 1. Current Phase: Preparation Phase

The project is currently in the **Preparation / Pre-P0 Phase**. 
- Application code, package installation, or code scaffolding: **NOT STARTED (LOCKED)**.
- Status: **Documentation & Governance Setup Complete; Research Gated**.

---

## 2. Phase Lifecycle & Milestone Dashboard

Per Part C of the master plan:

| Phase ID | Milestone (Section 39) | Phase Title | Status | Prerequisite Gates & Blockers |
|---|---|---|---|---|
| **PREP** | M-PREP | Documentation, Rules & Research Setup | **IN PROGRESS** | `AGENTS.md` verified; decision and conflict registers established; RS-01 and RS-02 complete; `UI-SPEC-1.0` provisionally approved under [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md) (design baseline only; Phase P0 locked). |
| **RESEARCH** | M-RES | Prerequisite Research (RS-01 to RS-16) | **BLOCKED / PARTIAL** | RS-01 and RS-02 completed; RS-03 to RS-15 pending research authorization; RS-16 blocked by missing `HW-SPEC-1.0.pdf`. |
| **P0** | Milestone M0 | Foundation | **LOCKED** | Gated on RS-01..RS-16 completion, `conflicts.md` sign-off, spec PDFs resolution, and formal implementation approval (Per `APR-UI-001`). |
| **P1** | Milestone M1 | Ingestion Engine (*Highest Priority*) | **LOCKED** | Gated on Phase P0 completion, CI green, and SSO test tenant approval. |
| **P2** | Milestone M2 | Student and Faculty Apps | **LOCKED** | Gated on Phase P1 ingestion acceptance and simulator pass. |
| **P3** | Milestone M3 | Driver App and Phone Tracking | **LOCKED / BLOCKED** | Gated on Phase P2, Decision 5, and formal disposition of Conflict C-06 (removal of driver app). |
| **P4** | Milestone M4 | Coordinator & Technician Consoles | **LOCKED** | Gated on Phase P3 and hardware device contract tests. |
| **P5** | Milestone M5 | Attendance and Alerts | **LOCKED** | Gated on Phase P4 and Decision 4 / C-06 (boarding method confirmation). |
| **P6** | Milestone M6 | Reports and Privacy | **LOCKED** | Gated on Phase P5 and Decisions 7 & 8 (legal counsel review). |
| **P7** | Milestone M7 | Hardening and Pilot (*Release Gate*) | **LOCKED** | Gated on Phase P6, penetration testing, load test, pilot exit criteria, and Coverage Gate. |

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
