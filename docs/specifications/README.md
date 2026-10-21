# Authoritative Specifications Register

This register catalogues the primary authority specifications governing the College Bus Tracker system.

---

## 1. Specification Authority Hierarchy

Per `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (lines 4–6 and line 21):

1. **Software Behaviour Authority**: `SW-MVP-1.0`  
   Defines what the software does: feature identifiers (F-AUTH-01 through F-PRV), roles, business rules (R-01 to R-20), acceptance criteria, error conditions, endpoints, and configuration parameters.
2. **Device Hardware Authority**: `HW-SPEC-1.0`  
   Defines what the tracker hardware does: serial communication, power management, cellular/GNSS behavior, hardware states, provisioning, and firmware flashing (owned by ECE team).
3. **Architecture & Delivery Authority**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md`  
   Governs software architecture, security baselines, data flow pipelines, testing harness, and the order of phase execution.

> **Master Authority Rule (Part A line 21)**:  
> *"The specification decides behaviour. This prompt decides architecture, security, data flow, and order of work. If the two conflict, stop work on that task, add an entry to `docs/decisions/conflicts.md`, and wait for approval. Do not guess."*

---

## 2. Specification Inventory & Audit Status

Audited on **2026-10-21**:

| Specification Document | Prescribed Path | Status | Impact on Project |
|---|---|---|---|
| **`SW-MVP-1.0.pdf`** | `docs/specifications/SW-MVP-1.0.pdf` *(or `docs/spec/SW-MVP-1.0.pdf`)* | **MISSING (Not Present)** | Primary specification PDF is absent. Blocks section-by-section requirements verification before starting phases. Requirements cited in `AG-MASTER-1.0-v2-College-Bus-Tracker.md` are used as secondary reference until the primary PDF is provided. |
| **`HW-SPEC-1.0.pdf`** | `docs/specifications/HW-SPEC-1.0.pdf` *(or `docs/spec/HW-SPEC-1.0.pdf`)* | **MISSING (Not Present)** | Primary hardware specification PDF is absent. **CRITICAL BLOCKER**: Completely blocks research task `RS-16` (Device-side contract verification against sections 8, 9, 10, 12, 13). |

---

## 3. Derived Subsystem Specifications & Design Assets

| Specification / Asset | Path | Status | Purpose & Scope |
|---|---|---|---|
| **`UI-SPEC-1.0`** | [`docs/specifications/ui-system-specification.md`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md) | **PROVISIONALLY APPROVED BASELINE ([`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md))** | Complete UI System Specification for VJIT College Bus Tracker: VJIT campus branding tokens (#E51F35 red, #103754 navy), two-surface product scope (Student/Faculty Mobile and Admin Web Console), complete removal of standalone driver mobile app, Conflict C-06 catalog, tracking integrity definitions, shared component standards, and UI acceptance checklist. Approved for provisional design baseline only (Implementation not authorized). |
| **`HW-INT-1.0`** | [`docs/specifications/hardware-integration-specification.md`](file:///c:/aditya/Bus%20tracker/docs/specifications/hardware-integration-specification.md) | **PROPOSED HARDWARE INTEGRATION CONTRACT** | Complete Real GPS Hardware Integration & Telemetry Contract Specification: in-bus tracker subsystems (NEO-6M, ESP8266, SIM7600G), Bearer token HMAC-SHA256 authentication, telemetry and heartbeat JSON schemas, 14-step pure domain validation pipeline, offline flash buffering, sequence deduplication, atomic bus linking, in-bus hardware panic button SOS pipeline, and downstream snapshot exposure. |
| **`VJIT Logo Asset`** | [`docs/specifications/assets/vjit-logo.png`](file:///c:/aditya/Bus%20tracker/docs/specifications/assets/vjit-logo.png) | **AVAILABLE (Visual Anchor)** | Official VJIT emblem (241×194 px, 1.242:1 aspect ratio) used as the visual anchor for campus branding tokens and authentication screens. |

---

## 4. Supporting Reference Material Audit

- **Word Documents (`.docx` / `.doc`)**: None present in the workspace. An exhaustive filesystem inspection confirmed zero specification documents exist in the repository.
- **Rule on Secondary Documents**: If supporting Word documents or draft notes are provided in the future, they must be registered separately as supporting reference material with their actual filenames, version dates, and clearly stated non-authoritative status. Under no circumstances may secondary documents silently replace `SW-MVP-1.0.pdf` or `HW-SPEC-1.0.pdf`.

---

## 5. Resolution Protocol

To unblock dependent tasks:
1. Obtain the official signed versions of `SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf`.
2. Commit them to `docs/spec/` or `docs/specifications/`.
3. Re-verify hashes and update this register before requesting authorization for task `RS-16` or Phase `P0`.
