# Architecture Decision: Eventual Retirement of pnpm Lockfile & Workspace Artifacts

**Decision ID**: `ADR-DEV-002`  
**Date**: 2026-10-22  
**Status**: **PROPOSED / PENDING FINAL PHASE P0 RETIREMENT SIGN-OFF**  
**Category**: Package Manager & Dependency Governance  

---

## 1. Context & Motivation

As part of the migration to a direct local Node.js development workflow without Docker (`ADR-DEV-001`), the project transitioned its root and workspace package manifests to native npm workspaces (`workspaces: ["apps/*", "services/*", "packages/*", "tools/*"]`).

During this transition, [pnpm-lock.yaml](file:///pnpm-lock.yaml) and [pnpm-workspace.yaml](file:///pnpm-workspace.yaml) were preserved in source control to guarantee zero loss of dependency resolution history or version reproducibility.

A verified, reproducible [package-lock.json](file:///package-lock.json) has now been generated using the repository's declared Node.js / npm engines and current manifests.

---

## 2. Decision & Governance Protocol

1. **Dual-File Transition Period (Current State)**:
   - [package-lock.json](file:///package-lock.json) is generated, verified, and proposed as the active lockfile for routine npm development, CI testing, and production builds (`npm ci`). In the Git working tree, it remains untracked pending explicit Project Owner authorization to stage and commit.
   - [pnpm-lock.yaml](file:///pnpm-lock.yaml) and [pnpm-workspace.yaml](file:///pnpm-workspace.yaml) remain **preserved, unmodified, and tracked** in git during the transition period to maintain historical continuity and prevent uncoordinated breakage.

2. **Conditions for Formal Retirement of pnpm Files**:
   The pnpm lockfile and workspace files will be permanently removed (`git rm pnpm-lock.yaml pnpm-workspace.yaml`) only when all of the following conditions are met:
   - **Condition 1 (Clean CI Run)**: Continuous Integration in `.github/workflows/ci.yml` passes using `npm ci` from a clean checkout on GitHub Actions.
   - **Condition 2 (Local Parity Verified)**: All 199 unit and contract tests continue to pass with 100% success using dependencies reified via `package-lock.json`.
   - **Condition 3 (Phase Gate Approval)**: The Project Owner formally signs off on Phase P0 completion and authorizes transitioning to the single-package-manager state.

3. **Dependency Version Parity Scope (Direct vs Transitive)**:
   - **Direct Workspace Dependency Parity**: Every primary/direct dependency version in `package-lock.json` was compared against `pnpm-lock.yaml`:
     - `zod`: `3.25.76` (Exact match)
     - `turbo`: `2.11.10` (Exact match)
     - `typescript`: `5.9.3` (Exact match)
     - `@types/node`: `22.20.5` (Exact match)
     - `@prisma/client`: `6.19.3` (Exact semantic version match)
     - `prisma`: `6.19.3` (Exact semantic version match)
   - **Transitive Dependency Graph Distinction**: Full dependency parity across the complete resolved dependency graphs is **not** claimed. npm and pnpm resolve and reify dependency graphs differently (npm uses a flat, hoisted `node_modules` tree, whereas pnpm utilizes a hard-linked, content-addressable store with strict isolated junction links). While primary packages and build/runtime behaviors are identical (proven by 100% pass across all 199 unit/contract tests, builds, and linters in isolated clean installations), an exhaustive leaf-by-leaf transitive resolution graph comparison has not been performed. Both lockfiles will be retained until the owner approves single-lockfile authority.

---

## 3. Consequences & Benefits

- **Single Lockfile Authority**: Once retired, developers will no longer maintain two separate lockfile formats.
- **Native npm Support**: Eliminates Corepack or standalone pnpm installation requirements on developer workstations and CI runners.
- **Risk Mitigation**: Preserving `pnpm-lock.yaml` until formal sign-off allows instant rollback if any downstream workspace edge case emerges.
