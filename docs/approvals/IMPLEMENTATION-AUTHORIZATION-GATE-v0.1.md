# SSCOS MVP Implementation Authorization Gate

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Active Gate — NOT READY / NOT AUTHORIZED |
| Owner | CTO / Human Founder |
| Related Volume | Engineering Program |
| Related Chapter | Transition from M3 Preparation to M4 Implementation |
| Dependencies | M0–M3 decisions; issues #7–#24; approved owners and integration controls |
| Approval Status | No implementation authorization granted |

## Purpose

This gate defines the evidence required before production-application code or executable database/infrastructure implementation begins. It prevents planning completeness, issue closure, branch creation, document upload, vendor access, or an AI recommendation from being mistaken for human implementation authority.

## Current disposition

**NOT READY. NOT AUTHORIZED.** M0, M1, M2, and M3 decisions are not recorded; named human owners are incomplete; native GitHub program controls and critical integration verification are incomplete; legal/privacy review is unassigned; no implementation scope, branch, budget, environments, or test execution has been approved.

Planning, review, specification refinement, read-only verification, and approval-packet preparation may continue within prior authority. No production code, executable schema migration, infrastructure-as-code applying external changes, source ingestion, agent runtime, account configuration, deployment, publication, credential creation, or production testing is permitted.

## Gate structure

| Gate | Requirement | Authoritative evidence | Current state | Blocking owner |
|---|---|---|---|---|
| G0-01 | Four-surface MVP and Phase 2 exclusions approved | Founder decision on issue #7 / signed decision packet | Pending | Founder |
| G0-02 | Program backlog, milestone path, and change control approved | Engineering Program approval | Pending | Founder + CTO |
| G0-03 | Named human owners or approved temporary compensating model | Issue #15 / ownership register | Missing | Founder |
| G0-04 | GitHub milestones/Project or approved time-bounded exception | Issue #16 | Missing | Account Owner |
| G1-01 | ADR-0001 scope approved | Signed ADR decision | Pending | Founder |
| G1-02 | ADR-0002 modular architecture approved | Signed ADR decision | Pending | Founder + CTO |
| G1-03 | ADR-0003 provenance data architecture approved | Signed ADR decision | Pending | Founder + Data Lead |
| G1-04 | ADR-0004 read-only API boundary approved | Signed ADR decision | Pending | Founder + API Lead |
| G1-05 | ADR-0005 managed deployment target approved/conditioned | Signed ADR decision | Pending | Founder + Platform/Security Leads |
| G1-06 | Repository boundaries and required checks approved | Repository Specification disposition | Pending | Platform Lead |
| G1-07 | Threat model, risk appetite, exceptions, and release blockers approved | Issue #21 | Pending | Security Lead + Founder |
| G1-08 | Agent permissions, human owners, memory, audit, and stop controls approved | Agent charter dispositions | Pending | AI Systems Lead + Founder |
| G1-09 | Critical integration inventory verified for non-production implementation | Issue #17 / evidence record | Incomplete; GitHub/Drive only | Platform + Security Leads |
| G1-10 | Legal, privacy, source-rights, and publication jurisdiction owner/scope established | Issue #19 | Missing | Founder + Legal Owner |
| G2-01 | Four-surface information architecture approved | Experience Architecture disposition | Pending | Product Design Lead |
| G2-02 | Responsive wireframes and non-happy states approved | Review evidence | Pending | Design + Accessibility reviewers |
| G2-03 | Design tokens/component accessibility contracts approved | Design System disposition | Pending | Design Systems Lead |
| G2-04 | Publication/correction/takedown state machine approved | Issue #23 | Pending | Publisher + Editorial + Legal |
| G2-05 | Lunch Time Conversations content/rights model approved | Editorial and legal disposition | Pending | Editorial + Legal |
| G3-01 | Logical data relations, constraints, access, retention approved | Logical Data Constraints v0.1 | Pending | Data + Security + Legal |
| G3-02 | Source registry, authority classes, and admission workflow approved | Issue #20 | Pending | Research + Legal + Security + Editorial |
| G3-03 | OpenAPI public contract approved | Issue #24 | Pending | API + Data + Security |
| G3-04 | Provenance/adversarial fixture catalog and thresholds approved | Issue #22 | Pending | QA + Data + Security |
| G3-05 | Non-production data/fixture policy approved | Legal/Privacy disposition | Missing | Legal + Privacy + QA |
| G3-06 | Migration, contract compatibility, and rollback policy approved | Data/Platform review record | Pending | Data + Platform Leads |
| GI-01 | Exact first implementation increment defined | Implementation charter below | Missing | CTO + Product Owner |
| GI-02 | Branch/repository paths and files authorized | Founder authorization scope | Missing | Founder + CTO |
| GI-03 | Named implementers/reviewers and CODEOWNERS established | Repository evidence | Missing | Platform Lead |
| GI-04 | Allowed tools/dependencies and licensing review completed | Dependency decision record | Missing | Platform + Security + Legal |
| GI-05 | Non-production environments, credentials, budgets, and kill switches approved | Environment evidence | Missing | Account Owner + Platform/Security |
| GI-06 | Test commands, required fixtures, and acceptance thresholds approved | Test plan | Missing | QA Lead |
| GI-07 | Secrets/data prohibitions and escalation path acknowledged | Signed implementation checklist | Missing | All implementers/reviewers |
| GI-08 | Human Founder explicitly authorizes implementation with limits and expiry | Signed authorization record | Missing | Founder |

No gate may be inferred as passed. Evidence must identify the exact version, approver, date, conditions, and affected deliverable.

## First implementation increment recommendation

When G0–G3 are satisfied, the CTO recommends a bounded **non-production vertical skeleton** rather than the entire MVP at once:

1. Repository checks and module boundaries.
2. Shared design tokens and accessible shell primitives.
3. Satnam.x route shell with four-surface navigation using synthetic content only.
4. OpenAPI contract validation and generated/mock examples only.
5. Logical schema expressed as reviewed non-production migrations only after separate data authorization.
6. Synthetic fixtures for publication authorization, provenance, stale data, corrections, and public-write denial.

This increment explicitly excludes live source collection, external API credentials, real treasury data, agent runtimes, public deployment, production domains, analytics, accounts, payments, wallets, and editorial publication.

## Required implementation authorization fields

An authorization is valid only when all fields are recorded:

| Field | Required value |
|---|---|
| Authorization ID | Unique controlled identifier |
| Authorized by | Amardeep Baba G Malhotra, Human Founder |
| Decision date / expiry | UTC date/time; expiry or review condition |
| Exact objective | Named bounded increment and user-visible/non-visible outcome |
| Repository / branch | Exact repository and new implementation branch |
| Allowed paths | Explicit file/directory scope |
| Prohibited paths/actions | Production, secrets, integrations, deployments, data and other exclusions |
| Approved tools/dependencies | Versions/license/security constraints |
| Data classification | Synthetic/non-production inputs only unless separately approved |
| Environments | Local/preview/staging explicitly allowed; production denied unless separately authorized |
| Human owners/reviewers | Implementer, reviewer, Security, QA, Product, Data as applicable |
| Required tests | Exact validation and acceptance thresholds |
| Stop/escalation conditions | Security, scope, data, cost, legal, dependency, or evidence triggers |
| Completion evidence | Diff, test output, review, documentation, and audit record |
| Merge authority | Separate from implementation; explicit decision required |
| Deployment authority | Separate from merge; production remains separately gated |

## Authorization decision form

### Current recommendation

Do **not** authorize implementation yet. First record M0 and review M1–M3. When ready, use an exact statement such as:

> I, Amardeep Baba G Malhotra, authorize SSCOS implementation authorization [ID] for the bounded non-production increment and exact repository paths stated in the approved authorization record. This authorization does not permit merge, production deployment, publication, live source ingestion, production credentials, payments, wallets, custody, trading, or treasury actions. All required human reviews and tests remain mandatory.

Generic statements such as “proceed,” “build it,” issue closure, or document approval do not satisfy this gate unless they explicitly reference the controlled authorization ID and scope.

## Start-of-implementation checklist

- [ ] All G0–G3 gates show Passed with evidence.
- [ ] GI-01–GI-08 are complete.
- [ ] Working tree/repository status inspected; unrelated user changes protected.
- [ ] New implementation branch exists and is not `main`.
- [ ] No production credentials/data are present or reachable.
- [ ] Allowed paths and prohibited actions are visible to implementers.
- [ ] Tests and stop conditions are executable in the approved non-production environment.
- [ ] Human reviewers acknowledge assignments.
- [ ] Audit event records implementation start.

If any item is false or unverified, implementation does not start.

## Completion and handoff gate for an increment

Implementation completion requires approved scope satisfied, diff reviewed, all required tests passing, security/rights findings resolved, documentation and contracts synchronized, no prohibited capability introduced, no production action performed, and a human acceptance record. Merge, deployment, publication, and release each require their own later authorization.

## Audit status

As of 2026-08-05, this gate is intentionally red: planning artifacts are substantial, but human decisions and external control evidence are missing. The correct institutional action is continued preparation and explicit approval—not implementation by assumption.
