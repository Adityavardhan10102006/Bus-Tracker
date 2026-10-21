# Operations Runbooks Catalogue (RB-01 to RB-13)

This directory houses the standard operating procedures and operational runbooks (**RB-01** through **RB-13**) required by Section 31.6 and Task `P6-T8` of `AG-MASTER-1.0-v2-College-Bus-Tracker.md`.

---

## Runbooks Index

| Runbook ID | Title / Operation | Primary Role | Trigger Condition | Status |
|---|---|---|---|---|
| **RB-01** | Device Provisioning & Initial Flashing | Technician (`TEC`) | New batch of hardware trackers received from manufacturer. | `TEMPLATE PENDING P4` |
| **RB-02** | Device Linking & Vehicle Installation | Coordinator (`COR`) | Hardware tracker installed on a new or reassigned bus. | `TEMPLATE PENDING P4` |
| **RB-03** | Device Token Rotation & Revocation | Technician (`TEC`) / Coordinator (`COR`) | Suspected token compromise or routine 90-day rotation. | `TEMPLATE PENDING P1/P4` |
| **RB-04** | Driver Onboarding & Phone Verification | Coordinator (`COR`) | New driver added to roster. | `TEMPLATE PENDING P3` |
| **RB-05** | Route Creation, Stop Approval & Version Bumping | Coordinator (`COR`) | Route expansion or stop request approval. | `TEMPLATE PENDING P4` |
| **RB-06** | Student Roster & Academic Year Rollover | Super Admin (`SAD`) / Coordinator (`COR`) | Start of new academic term; bulk CSV import. | `TEMPLATE PENDING P4` |
| **RB-07** | Emergency SOS Response & Escalation Handling | Security (`SEC`) / Coordinator (`COR`) | Real-time SOS incident triggered by bus hardware or driver. | `TEMPLATE PENDING P1/P3` |
| **RB-08** | Ingestion Engine Lag & Outbox Recovery | DevOps / Backend Engineer | Ingestion p95 latency > 300ms or queue backlog alert. | `TEMPLATE PENDING P1` |
| **RB-09** | Database Failover & Point-in-Time Restore | DevOps Lead | RDS Primary failure or accidental corruption drill. | `TEMPLATE PENDING P0` |
| **RB-10** | Staged Firmware Rollout & Canary Pausing | Technician (`TEC`) | Firmware release ready for fleet distribution (5 -> 25% -> 100%). | `TEMPLATE PENDING P4` |
| **RB-11** | Personal Data Request Handling (Export & Purge) | Data Protection Officer (`DPO`) / Super Admin (`SAD`) | Student/parental request for data correction, export, or deletion. | `TEMPLATE PENDING P6` |
| **RB-12** | Data Breach Incident Response & Notification | Security Lead / DPO | Detected unauthorized access to PII or security alert. | `TEMPLATE PENDING P6` |
| **RB-13** | Database Retention Purge & Partition Management | Worker Process / DBA | Daily automated partition management and 90-day sample drop. | `TEMPLATE PENDING P6` |

---

## Operating Instructions

Runbook procedures will be fully detailed during their respective implementation phases (`P0` through `P6`) as defined in the master plan. Every runbook must include:
1. Operational Prerequisites & Required Permissions.
2. Step-by-Step Execution Commands.
3. Verification Steps & Expected Outputs.
4. Rollback and Incident Escalation Procedures.
