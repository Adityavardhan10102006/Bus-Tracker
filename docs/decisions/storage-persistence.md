# ADR-STO-001: Storage Persistence & Truthful Database Health Reporting

**Status**: ACCEPTED & IMPLEMENTED  
**Date**: 2026-10-22  
**Governing Standard**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` & `AGENTS.md` (Rule B.2, B.6, B.7)  

---

## 1. Context & Motivation

During early development and demonstration phases, running the full PostgreSQL 16 + PostGIS cluster may not always be available on every developer laptop or demo environment. However:
1. In-memory storage alone causes all administrative configurations, bus fleet changes, and hardware device assignments to be erased upon API process restart.
2. Silently falling back to an in-memory store while reporting healthy database status violates Rule B.2 and Part C release criteria (never present mock or simulated readiness as production-ready).

## 2. Decision

1. **Restart-Persistent Administrative Layer**:
   - Enhance `FleetDataStore` with atomic file serialization (`tmp/fleet-persisted-store.json`, configurable via `PERSISTENCE_FILE_PATH`).
   - Mutations to administrative state (`createBus`, `updateBus`, `linkDeviceToBus`, `unlinkDevice`, `updateSystemSetting`, `createMaintenanceTicket`, `resolveMaintenanceTicket`, `recordAuditLog`) trigger atomic writes.
   - On server startup, `FleetDataStore` loads the persisted state from disk if present, preserving administrative changes across process restarts.
2. **Truthful Database Readiness (`/health/ready`)**:
   - The `/health/ready` endpoint directly executes a query via PrismaClient against the configured PostgreSQL database.
   - If PostgreSQL is disconnected or unreachable, the endpoint returns HTTP 503 `status: 'unready'` with `database: 'disconnected'`.
   - The system never fakes a green database health check when the actual relational database is down.

## 3. Consequences

- **Positive**: Administrative workflows survive process restarts during demonstrations and local development.
- **Architectural Honesty**: Operational readiness endpoints reflect true PostgreSQL infrastructure status, ensuring production releases require real database connectivity.
