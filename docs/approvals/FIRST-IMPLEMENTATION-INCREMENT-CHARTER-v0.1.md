# SSCOS First Implementation Increment Charter

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Authorization Candidate — NOT AUTHORIZED |
| Owner | CTO / Product Owner |
| Related Volume | Engineering Program |
| Related Chapter | GI-01 and GI-02 — Transition to M4 |
| Dependencies | M0–M3 approvals; Implementation Authorization Gate v0.1; Repository Specification v0.1; Dependency Policy v0.1; MVP Test Plan v0.1 |
| Approval Status | Pending Human Founder and Required Human Reviewers |

## Increment identity

| Field | Proposed value |
|---|---|
| Authorization ID | `SSCOS-IMP-001` |
| Increment name | Four-Surface Synthetic Vertical Skeleton |
| Milestone | M4 — MVP Build, Increment A |
| Priority | P0 |
| Estimated effort | 15 ideal engineering days plus human review |
| Required tools | Approved runtime/package manager; web framework; type/lint/format tools; unit/contract/browser/accessibility tools; secrets/dependency/license scanners; GitHub |
| Owner | Web Lead / Platform Lead |
| Reviewers | Product, Design, Accessibility, API, Data, QA, Security, Legal; Amardeep Baba G Malhotra final approver |

This is a proposed record only. Its existence, issue approval, branch creation, or partial gate completion does not authorize implementation.

## Objective

Create a non-production, synthetic-data vertical skeleton that proves the four approved public surfaces can share one accessible navigation shell, follow repository boundaries, render required trust states, validate the public OpenAPI contract, and pass foundational checks without reaching any production system.

## User-visible outcome

In an approved local or isolated preview environment, a reviewer can navigate:

- Satnam.x landing shell;
- Treasury Intelligence list/profile placeholders using synthetic provenance-aware records;
- Lunch Time Conversations archive/detail placeholders using synthetic approved-content states;
- Satoshi Langar latest/archive/detail placeholders using synthetic cited-claim states.

The increment demonstrates information architecture, design tokens, responsive/accessibility behavior, loading/empty/error/stale/corrected/withdrawn states, and read-only contract examples. It is not a public release.

## Authorized repository and branch

- Repository: `Satnam-Satoshi/Satoshi-Langar` only.
- Implementation branch: a new short-lived branch proposed as `agent/sscos-mvp-vertical-skeleton-001`.
- The current documentation branch is not the implementation branch.
- `main` is excluded. Merge and pull-request publication remain separately authorized actions.

The branch must not be created until `SSCOS-IMP-001` is explicitly approved.

## Proposed allowed paths

| Path | Allowed purpose |
|---|---|
| `app/` | Route composition for the four approved surfaces and shared legal/not-found states |
| `modules/satnam-x/` | Gateway presentation using synthetic inputs |
| `modules/treasury/` | Read-only synthetic list/profile/history presentation |
| `modules/conversations/` | Read-only synthetic archive/detail presentation |
| `modules/langar/` | Read-only synthetic latest/archive/detail presentation |
| `modules/provenance/` | Pure display/domain types for citations, confidence, freshness, corrections |
| `modules/shared/` | Deliberately shared presentation primitives only |
| `design-system/` | Approved tokens and accessible shell components |
| `contracts/` | Copy/validation configuration for approved OpenAPI and shared schemas |
| `tests/` | Authorized synthetic unit, contract, browser, and accessibility tests |
| `docs/implementation/SSCOS-IMP-001/` | Decision, dependency, test, evidence, and handoff records |
| Root configuration files | Only exact files enumerated in final authorization for approved toolchain/checks |

Any other path is denied unless the Founder amends this authorization record before work begins.

## Explicit exclusions

The increment may not create or configure:

- `db/`, executable migrations, database services, RLS policies, backups, or persistent business data;
- `jobs/`, crawlers, scrapers, schedulers, live source retrieval, or outbound source calls;
- agent runtimes, model/API calls, prompts executed against external services, or agent memory;
- Vercel, Supabase, Cloudflare, Sentry, analytics, production domains, DNS, hosting, infrastructure-as-code, or external service accounts;
- production/real credentials, tokens, secrets, identifiers, data, content, transcripts, participant information, or treasury observations;
- authentication, user accounts, payments, donations, wallets, custody, trading, personalized recommendations, alerts, or transaction functionality;
- publication, editorial mutation, approval execution, deployment, release, or automated correction;
- a fifth public surface or any Phase 2 product.

## Data classification and network policy

Only deterministic synthetic records specifically versioned under `tests/` or approved mock/example files may be used. Package acquisition, if separately approved, is limited to approved registries during environment preparation. Runtime outbound network access is denied. No production or institutional private data may be copied, transformed, cached, logged, or displayed.

## Work packages

| ID | Deliverable | Dependencies | Effort | Owner | Success criteria |
|---|---|---|---:|---|---|
| IMP-001A | Toolchain and repository checks | GI-03–06 | 3d | Platform Lead | Clean reproducible checks; exact dependency record; no production reachability |
| IMP-001B | Design tokens and accessible shell | Approved M2 | 3d | Web + Design | Keyboard/zoom/semantics/contrast foundations pass |
| IMP-001C | Four-surface route skeleton | IMP-001B | 4d | Web Lead | Approved route inventory only; responsive navigation and non-happy states |
| IMP-001D | Synthetic domain examples | Approved M3 contracts/fixtures | 2d | Web + Data | Exact precision/provenance/freshness/correction fields retained |
| IMP-001E | Verification and handoff evidence | IMP-001A–D | 3d | QA + Security | All authorized tests pass; prohibited-capability inventory clean; evidence bound to commit |

## Required checks

Formatting, type checking, linting, unit/property tests, OpenAPI/schema/example validation, route/capability inventory, browser smoke, keyboard/accessibility smoke, dependency/license audit, secrets scan, clean build, documentation-link validation, and a network/credential/data isolation check. Exact commands and versions must be added to the final authorization.

## Stop and escalation conditions

Stop immediately if work requires an unapproved path/dependency/network/service; encounters real credentials or personal/private/production data; adds a mutation route or Phase 2 capability; cannot reproduce a build; finds an incompatible license or critical/high reachable vulnerability; exceeds the approved time/cost budget; contradicts an approved ADR/contract; or lacks an assigned human reviewer. Record the event and await a revised authorization.

## Completion evidence

- Exact branch/commit and reviewed diff.
- Dependency admission records, lockfile, scan results, and SBOM where applicable.
- Commands, results, fixtures, environment fingerprint, and evidence index.
- Route/capability inventory proving only four surfaces and no prohibited capability.
- Accessibility and browser evidence for defined journeys.
- Security and data-isolation review.
- Documentation/contract reconciliation and known limitations.
- Signed human acceptance or rejection.

## Completion boundary

Completion means the non-production skeleton satisfies this charter. It does not permit merge, hosting, staging, production deployment, live data, publication, or release. Each requires a later separate human decision.

## Required human decisions

1. Approve or amend the objective, effort, paths, exclusions, branch name, data/network policy, tests, and stop conditions.
2. Name all owners/reviewers and approve exact tools/dependencies.
3. Confirm GI-01–GI-07 evidence and then record `SSCOS-IMP-001` authorization with expiry.
4. Keep merge, deployment, publication, and production authorization explicitly separate.

