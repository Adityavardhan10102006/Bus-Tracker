# Project-Owner Approval Record — UI-SPEC-1.0

**Project:** College Bus Tracker — Vidya Jyothi Institute of Technology (VJIT)  
**Decision ID:** `APR-UI-001`  
**Document:** [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md)  
**Decision:** Approved for provisional UI design baseline only  
**Approval scope:** Design and documentation  
**Implementation authorization:** Not granted  
**Phase P0 status:** **LOCKED**  
**Conflict C-06 status:** **OPEN / UNRESOLVED**  
**Missing authoritative specifications:** **UNRESOLVED (BLK-01 & BLK-02)**  
**Recorded Date:** 2026-10-21  

---

## 1. Decision

The project owner approves `UI-SPEC-1.0` as the provisional UI design baseline for the College Bus Tracker project.

This approval permits the project team to use the specification as the reference for subsequent UI planning, screen inventories, design reviews, and identification of unresolved interface requirements.

This approval does not authorize application implementation, commencement of Phase P0, advancement to any subsequent phase, or changes to the governing master plan.

---

## 2. Approved Design Direction

The provisional UI baseline adopts the following direction:

- **Institutional branding:** Use the supplied Vidya Jyothi Institute of Technology (VJIT) logo as the visual reference. Proposed colors remain subject to verification against official brand specifications and accessibility requirements.
- **Student and faculty application:** A map-first mobile experience for exploring available buses, routes, and stops, with arrival estimates and tracking freshness clearly communicated.
- **Transport administrator console:** A web-based interface for fleet visibility and authorized transport-management functions.
- **Separate driver application:** Excluded from the proposed application-surface design scope.
- **Design principles:** Clean and practical layouts, consistent components, readable typography, clear visual hierarchy, accessible interactions, and explicit loading, empty, offline, stale-data, and error states.
- **Tracking integrity:** The UI must not present stale location data as live or invent unsupported arrival estimates.

These items establish the provisional design direction. They do not override existing business requirements or authorize unapproved operational workflows.

---

## 3. Governing Documents and Change Control

`AG-MASTER-1.0-v2-College-Bus-Tracker.md` remains the governing project plan. `AGENTS.md` and all existing security, testing, documentation, anti-mock, and approval requirements remain in force.

This approval does not amend, supersede, or waive any provision of those documents.

Any discrepancy between UI-SPEC-1.0 and the governing documents must be recorded and resolved through the established project decision process. Proposed UI behavior must not be represented as an approved business requirement unless the governing documents or an explicit project-owner decision support it.

---

## 4. Conflict C-06 — Remains Open

The removal of the separate driver application creates unresolved requirements concerning existing driver-related workflows, including:

- Trip dispatch and trip-status management.
- Passenger boarding and attendance.
- GPS tracking and fallback behavior.
- Pre-trip vehicle checks and vehicle issue reporting.
- Emergency SOS and other safety-related operations.
- Any related driver-facing requirements in the governing plan, including Phase P3.

**Conflict C-06 is not resolved by this approval.**

The project team must preserve the underlying operational, safety, attendance, and tracking requirements until approved alternatives are documented. It must not assume that drivers will use the student/faculty application or that hardware-only tracking is sufficient.

Any proposed alternative must be documented with its implications, dependencies, risks, and required owner decisions. The governing master plan must not be changed without explicit authorization.

---

## 5. Missing Authoritative Specifications — Remain Unresolved

The reported absence of `SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf` remains an outstanding blocker.

This approval does not waive the requirement to obtain and review those authoritative documents. Supporting Word documents must not be treated as substitutes.

The project team must continue to identify specification-dependent decisions and prevent unsupported assumptions from becoming implementation requirements. Any research task that depends on a missing document must retain its appropriate blocked or pending status.

---

## 6. Phase and Implementation Restrictions

Phase P0 remains **LOCKED**.

The following activities are not authorized by this approval:

- Creating or modifying application code.
- Implementing UI screens or interactions.
- Installing dependencies or making implementation-related environment changes.
- Advancing to Phase P0 or any later phase.
- Marking Conflict C-06 resolved.
- Treating either missing authoritative specification as supplied or approved.
- Modifying the governing master plan to remove unresolved requirements.

Documentation-only work that is already permitted by the governing plan may continue, provided it does not bypass existing gates or imply implementation approval.

---

## 7. Permitted Follow-Up Work

Subject to existing project rules, the team may:

1. Record this approval in the prescribed decision or approval register.
2. Cross-reference the approval from UI-SPEC-1.0 and relevant status records.
3. Continue non-implementation design planning based on the provisional UI baseline.
4. Maintain a list of conflicts, assumptions, dependencies, and outstanding decisions.
5. Prepare alternatives for Conflict C-06 for explicit project-owner review.
6. Track the missing authoritative specifications as unresolved blockers.

No follow-up record may silently convert a proposal into an approved requirement.

---

## 8. Conditions for Reconsidering Implementation

Implementation authorization requires a separate explicit project-owner decision and satisfaction of the applicable master-plan gates.

Before implementation is considered, the team must at minimum:

- Obtain and review the missing authoritative specifications, or secure a formally documented resolution under the project's governing change-control process.
- Resolve or formally disposition Conflict C-06 and its affected workflows.
- Verify that the proposed UI baseline does not contradict approved requirements.
- Complete all applicable research, security, readiness, and approval prerequisites defined by the governing plan.

Meeting these conditions does not automatically authorize implementation; the required explicit approval must still be obtained.

---

## 9. Approval Statement

The project owner accepts UI-SPEC-1.0 as the **provisional UI design baseline only**.

All other requirements, blockers, conflicts, and phase restrictions remain in effect unless changed through a separate, explicit, documented decision.

- **Decision record status:** Approved for provisional design planning; implementation not authorized.
- **Project-owner identity:** Project Owner (Recorded per project documentation conventions).
- **Approval date:** 2026-10-21.
- **Next review:** After review of the missing authoritative specifications and disposition of Conflict C-06.
