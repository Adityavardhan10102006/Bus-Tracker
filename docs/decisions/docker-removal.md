# Architecture Decision: Direct Local Node.js Development Workflow (Docker Removal)

**Decision ID**: `ADR-DEV-001`  
**Date**: 2026-10-21  
**Status**: **ACCEPTED & APPLIED**  
**Category**: Development Workflow & Tooling  

---

## 1. Context & Motivation

Initial repository foundation plans (`P0-T3`) included `docker-compose.yml` for local service orchestration (PostgreSQL 16 with PostGIS, MinIO, and Mailpit).

However, introducing Docker as a mandatory dependency for day-to-day engineering created unnecessary container orchestration overhead, host virtualization prerequisites, elevated permission requirements, and cross-platform container networking friction for developers working on native development environments.

The requirement was issued to eliminate Docker and Docker Compose from routine development workflows, standardizing on a direct local Node.js and npm development environment.

---

## 2. Decision

1. **Remove Docker Configuration**:
   - `docker-compose.yml` is completely removed from the repository.
   - Zero Dockerfiles, container scripts, or container-specific build steps are retained in the codebase.
   - Automated check `verify:prod-clean` enforces that zero Docker configuration files are re-introduced into the repository.

2. **Standardize on Pure Node.js & npm**:
   - Runtime baseline established at **Node.js 22 LTS** (`>= 20.18.0`), with [`.nvmrc`](file:///.nvmrc) pinning `22`.
   - Native npm workspace support established in root [`package.json`](file:///package.json) via `"workspaces": ["apps/*", "services/*", "packages/*", "tools/*"]`.
   - Standard scripts (`dev`, `build`, `start`, `test`, `lint`, `typecheck`, `verify:prod-clean`) run directly via `npm run`.

3. **Database & External Services Management**:
   - Local database development connects to native PostgreSQL 16 with the PostGIS extension installed on the host machine or via managed database connection strings.
   - Role creation, trigger installation, and Row-Level Security (RLS) setup scripts in `packages/db/prisma/` (`roles.sql`, `triggers.sql`, `rls.sql`) are applied directly using native PostgreSQL tools (`psql` or GUI clients).
   - Integration testing harnesses utilize standard, direct database connections or memory-safe test isolation instead of `testcontainers` container orchestration.

---

## 3. Consequences & Benefits

- **Faster Startup**: Development tasks, unit tests, and build loops run instantly without waiting for Docker daemon initialization or container startup.
- **Lower Resource Consumption**: Eliminates high memory and CPU overhead associated with container virtualization.
- **Strict Compliance**: All 199 unit and contract tests continue to pass with zero dependency on Docker.
- **Security**: Zero container configuration vulnerabilities, unpinned base images, or root permission escalations.
