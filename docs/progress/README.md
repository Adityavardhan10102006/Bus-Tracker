# Project Progress and Milestone Tracking

This directory maintains the phase plans (`docs/progress/PXX-plan.md`), phase completion reports (`docs/progress/PXX-report.md`), and the comprehensive Coverage Gate register (`docs/progress/coverage.md`) mandated by `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Parts B, C, and G.

---

## Directory Contents

- [`coverage.md`](file:///c:/aditya/Bus%20tracker/docs/progress/coverage.md): Master coverage register tracking all feature IDs (F-AUTH to F-PRV), business rules (R-01 to R-20), acceptance criteria (AC-), endpoints, config keys, critical test cases, and edge cases.
- [`PXX-plan-template.md`](file:///c:/aditya/Bus%20tracker/docs/progress/PXX-plan-template.md): Required template for writing phase plan files before starting work.
- [`PXX-report-template.md`](file:///c:/aditya/Bus%20tracker/docs/progress/PXX-report-template.md): Required template for writing phase completion reports before requesting approval.

---

## Protocol for Phase Execution (AGENTS.md B.9 & B.10)

1. **Before any phase starts**:
   - Create `docs/progress/PXX-plan.md` using the plan template.
   - Read every specification section cited for that phase in full, recording the exact section numbers in the plan file.
2. **During the phase**:
   - Implement tasks strictly in the order listed.
   - Commit after each task with task ID prefix (e.g. `P0-T1: ...`).
   - Run verification checks after every task.
3. **At the end of the phase**:
   - Create `docs/progress/PXX-report.md` using the report template.
   - Update `coverage.md` with tests and task mappings.
   - Run `db:purge-synthetic` to clean test data.
   - **STOP and wait for user approval.**
