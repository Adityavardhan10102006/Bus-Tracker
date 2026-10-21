# Phase Plan Template: Phase P[XX] — [Phase Title]

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part C)  
**Phase ID**: `P[XX]`  
**Milestone**: `M[X]`  
**Status**: DRAFT / AWAITING KICKOFF  

---

## 1. Specification Sections Read & Authority Verification

Per **AGENTS.md B.9 step 1**, before any phase starts, Antigravity must read every specification section named in that phase, in full, and record the exact section numbers verified below:

- [ ] Specification Section [e.g. 11.1 Device Authentication]
- [ ] Specification Section [e.g. 11.5 Ingestion Validation]
- [ ] Specification Section [e.g. 13 Source Selector]

---

## 2. Planned Tasks Breakdown

| Task ID | Task Title & Scope | Files Touched / Created | Unit & Integration Tests Planned | Spec Sections Implemented |
|---|---|---|---|---|
| `P[XX]-T1` | [Task Description] | `packages/...`, `services/...` | `...spec.ts` | Section [X.Y] |
| `P[XX]-T2` | [Task Description] | `packages/...`, `services/...` | `...spec.ts` | Section [X.Y] |

---

## 3. Prerequisite Gates & Blockers Check

- [ ] All previous phase exit criteria verified and approved by project owner.
- [ ] No active conflicts in `docs/decisions/conflicts.md` blocking this phase.
- [ ] Required configuration keys registered in `packages/config`.
- [ ] Synthetic fixtures confined strictly to `tests/fixtures/`.

---

## 4. Verification Check Commands

Commands to be executed after each task:
```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:int
pnpm verify:no-mock
pnpm verify:routes-auth
```
