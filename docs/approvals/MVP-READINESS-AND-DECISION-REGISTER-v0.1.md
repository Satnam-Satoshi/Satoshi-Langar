# SSCOS MVP Readiness and Decision Register

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Active Review Register — NOT APPROVED / NO IMPLEMENTATION AUTHORITY |
| Owner | CTO / Documentation Officer |
| Related Volume | Engineering Program |
| Related Chapter | M0–M3 Review and GI-01–GI-08 Authorization |
| Dependencies | Controlled SSCOS baseline, engineering program, issues #7–#32, implementation authorization gate |
| Approval Status | No milestone or implementation approval recorded |

## Purpose and authority boundary

This register is the single review index for moving the four-surface SSCOS MVP from preparation toward a possible first implementation increment. It maps decisions to authoritative evidence and required human owners. It does not replace the underlying documents or approval records.

`Prepared` means a reviewable draft/evidence path exists. `Passed` requires a recorded human decision naming exact version, approver, date, scope, conditions, and review/expiry. Issue closure, repository access, branch/file creation, Drive upload, an AI recommendation, or this register never constitutes approval.

## Current executive disposition

- MVP scope: four surfaces only—Satnam.x, Treasury Intelligence, Lunch Time Conversations, and Satoshi Langar.
- Preparation evidence: substantial and indexed below.
- Human approvals: none verified in the current record.
- Named specialist owners: incomplete.
- Implementation candidate: `SSCOS-IMP-001`, proposed but not authorized.
- Implementation, test execution, account configuration, merge, deployment, publication, and production: prohibited until their respective exact gates pass.

## Decision sequence

```text
A. Founder M0 scope/program decision
  → B. Assign accountable human owners
    → C. M1 architecture/security/platform decisions
      → D. M2 experience/editorial/legal decisions
        → E. M3 data/API/source/QA decisions
          → F. Configure and verify GI-03–GI-07 controls under separate authority
            → G. Founder GI-08 decision for SSCOS-IMP-001
              → H. Create implementation branch and begin only the authorized increment
```

No later stage can make an earlier stage pass retroactively.

## M0 — Program approval

| Decision | Priority | Evidence / issue | Owner | Current state | Pass evidence |
|---|---|---|---|---|---|
| Four-surface boundary and Phase 2 exclusions | P0 | Engineering Program; ADR-0001; issue #7 | Founder | Prepared; pending | Signed decision naming exact four surfaces/exclusions |
| Backlog, milestone path, change policy | P0 | Engineering Program; issue #7 | Founder + CTO | Prepared; pending | Approved program version and conditions |
| GitHub Milestones/Project control | P0 | Project/Milestone Spec; issue #16 | Account Owner | Spec prepared; native controls missing | Native evidence or expiring Founder-approved exception |
| Named human ownership | P0 | Issues #15 and #31 | Founder | Missing assignments | Primary/backup humans, verified identities, scope/review dates |

M0 cannot pass while ownership and program-control disposition are missing.

## M1 — Architecture, platform, security, and agents

| Decision | Priority | Evidence / issue | Required owner(s) | Current state | Pass evidence |
|---|---|---|---|---|---|
| ADR-0001 MVP boundary | P0 | ADR-0001 / issue #8 | Founder + CTO | Prepared; pending | Signed ADR decision |
| ADR-0002 modular monolith | P0 | ADR-0002 / issue #8 | CTO + Platform | Prepared; pending | Signed ADR decision |
| ADR-0003 provenance-first data | P0 | ADR-0003 / issue #8 | Data + Editorial | Prepared; pending | Signed ADR decision |
| ADR-0004 read-only public API | P0 | ADR-0004 / issue #8 | API + Security | Prepared; pending | Signed ADR decision |
| ADR-0005 managed edge deployment | P0 | ADR-0005 / issue #8 | Platform + Security + Founder | Prepared; pending | Signed/conditional ADR decision |
| Repository boundaries | P0 | Repository Specification / issue #8 | Platform | Prepared; pending | Approved path/review/check policy |
| Threat model/risk appetite | P0 | Threat Model / issue #21 | Security + Founder | Prepared; pending | Named control owners, exceptions, release blockers |
| Agent permissions/stops | P0 | Agent Specifications / issue #8 | AI Systems + Data/Editorial + Founder | Prepared; pending | Human owners, least privilege, audit and stop controls |
| Platform/deployment/rollback | P0 | Platform Security & Deployment / issue #8 | Platform + Security | Prepared; pending | Environment/promotion/rollback decision |
| Integration status | P0 | Integration Record / issue #17 | Account + Platform + Security | GitHub/Drive documentation verified; others unverified | Critical service ownership/control evidence or explicit deferral |
| Supply-chain policy | P0 | Dependency Policy / issue #27 | Platform + Security + Legal | Prepared; pending | License, admission, scanner, exception, SBOM decisions |

## M2 — Experience, accessibility, editorial, and legal

| Decision | Priority | Evidence / issue | Required owner(s) | Current state | Pass evidence |
|---|---|---|---|---|---|
| Four-surface information architecture | P0 | Experience Architecture / issue #9 | Product Design | Prepared; pending | Approved route/content map with Phase 2 absent |
| Responsive wireframes/non-happy states | P0 | Experience Architecture / issue #9 | Design + Accessibility | Prepared; pending | Desktop/mobile/zoom/keyboard/state review |
| Design system and accessibility contracts | P1 | Experience Architecture / issue #9 | Design Systems + Accessibility | Prepared; pending | Tokens/components/contrast/semantics decision |
| Publication/correction/takedown lifecycle | P0 | State Machine / issue #23 | Publisher + Editorial + Legal + Security | Prepared; pending | Exact states/guards/roles/emergency policy approved |
| Content/media rights and jurisdiction | P0 | Issue #19 plus state machine/source policy | Legal/Privacy + Editorial | Owner/scope missing | Written jurisdiction, rights, consent, privacy, retention policy |

## M3 — Data, research, API, provenance, and QA

| Decision | Priority | Evidence / issue | Required owner(s) | Current state | Pass evidence |
|---|---|---|---|---|---|
| Logical model and access controls | P0 | Data Constraints / issue #25 | Data + Security + Legal | Prepared; pending | Invariants, relations, access, retention, migration gates approved |
| Source registry/admission/freshness | P0 | Source Registry / issue #20 | Research + Legal + Security + Editorial | Prepared; pending | Source classes/rights/security/claim limits approved |
| Public API v1 | P0 | OpenAPI / issue #24 | API + Data + Security | Parsed; pending approval | Paths/schemas/errors/pagination/read-only boundary approved |
| Provenance/adversarial fixtures | P0 | Fixture Catalog / issue #22 | QA + Data + Security | Prepared; pending | Catalog, thresholds, rights, owners approved |
| Full MVP verification plan | P0 | Test Plan / issue #28 | QA + Product + Security + Accessibility + Legal | Prepared; pending | Tools, commands, environments, journeys, thresholds approved |
| Data/fixture privacy and rights | P0 | Issues #19, #22, #25, #28 | Legal + Privacy + QA | Missing disposition | Written allowed data, retention, evidence and deletion/hold rules |
| Migration/compatibility/repair policy | P0 | Data Constraints; DB/API Design | Data + Platform | Logical policy prepared; executable work prohibited | Approved versioning, disposable-test, rollback/repair evidence plan |

## Implementation readiness — GI-01 through GI-08

| Gate | Evidence / issue | Current state | Blocking evidence |
|---|---|---|---|
| GI-01 Exact increment | `SSCOS-IMP-001` Charter / #29 | Prepared; pending | Founder/Product/technical approval |
| GI-02 Branch and path scope | `SSCOS-IMP-001` Charter / #29 | Proposed only | Exact authorization and branch creation authority |
| GI-03 Owners/CODEOWNERS/reviews | Ownership Controls / #31 | Spec prepared; not configured | Named humans, verified GitHub identities, settings evidence |
| GI-04 Dependencies/licensing | Dependency Policy / #27 | Policy prepared | Exact versioned inventory and human dispositions |
| GI-05 Environments/credentials/budgets/stops | Environment Readiness / #30 | Local unverified; preview blocked | Inventory, isolation, owners, cost and stop evidence |
| GI-06 Tests/fixtures/thresholds | Test Plan / #28 | Spec prepared | Exact commands/tools/versions/environment and approvals |
| GI-07 Acknowledgement/escalation | Safety Acknowledgement / #32 | Unsigned | Named channels/owners and every participant signature |
| GI-08 Founder implementation authorization | Authorization Gate / #26 | Missing by design | Exact signed `SSCOS-IMP-001` decision with date/expiry/conditions |

## Minimum Founder decision record

For each decision, record:

| Field | Required content |
|---|---|
| Decision ID | Unique stable identifier |
| Artifact/version | Exact controlled document or ADR version |
| Decision | Approved, Approved with Conditions, Rejected, or Returned for Revision |
| Scope | Exact deliverables/surfaces/environments affected |
| Conditions/exclusions | Explicit boundaries and unmet prerequisites |
| Approver(s) | Named humans and roles; Founder final where required |
| Decision time | UTC timestamp |
| Effective/expiry/review | Start, expiry or next-review condition |
| Evidence | GitHub/Drive decision link and immutable hash/version where applicable |
| Downstream effects | Gates/issues unblocked, unchanged, or newly blocked |

Approval of an architecture/specification does not authorize configuration or implementation. Approval of `SSCOS-IMP-001` does not authorize merge, preview hosting, deployment, publication, live integrations, production, or release unless those are explicitly and separately named.

## Recommended review agenda

### Founder session 1 — 60 minutes

1. Confirm four-surface boundary and Phase 2 exclusions.
2. Approve/return the engineering program and change policy.
3. Assign role owners or an expiring Founder-held compensating model.
4. Decide native GitHub program controls or time-bounded exception.
5. Record M0 outcome; stop if not approved.

### Specialist review sessions

- Architecture/Platform/Security: M1 decisions and integration constraints.
- Product/Design/Accessibility/Editorial/Legal: M2 decisions.
- Data/API/Research/QA/Security/Legal: M3 decisions.

Each specialist may approve, condition, reject, or return artifacts, but cannot grant Founder implementation authority.

### Founder session 2 — after all evidence passes

1. Audit each G0–G3 and GI-01–GI-07 row.
2. Decide exact tools, participants, local/preview scope, time/cost limit, and expiry.
3. Approve, condition, reject, or return `SSCOS-IMP-001`.
4. Record merge/deployment/publication/production as explicitly not authorized unless separately decided.

## Current blockers and owners

| Blocker | Owner | Resolution evidence |
|---|---|---|
| M0 decision absent | Founder | Signed issue #7/decision record |
| Specialist roles unassigned | Founder | Issue #15/#31 role register |
| Native GitHub program controls absent | Account Owner | Issue #16 evidence/exception |
| Legal/privacy/jurisdiction scope absent | Founder + Legal/Privacy | Issue #19 disposition |
| Critical integrations unverified | Account + Platform + Security | Issue #17 control evidence |
| Exact dependencies/tools absent | Platform + Security + Legal | Issue #27 inventory decisions |
| Environment unverified | Account + Platform + Security | Issue #30 passed matrix |
| Safety acknowledgements unsigned | All participants | Issue #32 signatures |

## Audit conclusion

The SSCOS program is **prepared for ordered human review**, not implementation. The authoritative next action is M0 Founder decision and human ownership assignment. Until all relevant rows are Passed with evidence and GI-08 is explicitly recorded, the implementation branch must not be created and no code, executable tests, account configuration, credentials, merge, deployment, publication, or production action is authorized.

