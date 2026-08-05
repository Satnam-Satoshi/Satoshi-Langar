# SSCOS Engineering Program — Build Mode

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft — Build Planning |
| Owner | CTO (execution); Amardeep Baba G Malhotra (Human Founder and final approver) |
| Related Volume | Engineering Program |
| Related Chapter | MVP Delivery |
| Dependencies | SSCOS Constitutional Baseline v0.2; Governance Metadata Standard v0.1 |
| Approval Status | Pending Human Founder Approval |

## Build-mode directive

Constitutional drafting is frozen unless a constitutional ambiguity blocks implementation planning. This program authorizes planning only. It does not authorize production application code, deployment, publication, custody, transactions, or treasury access.

## First public release

The MVP contains exactly four public surfaces:

1. **Satnam.x** — the public institutional gateway and navigation shell.
2. **Treasury Intelligence** — source-linked, read-only treasury observations and entity profiles.
3. **Lunch Time Conversations** — an editorial library of approved conversations, transcripts, and media metadata.
4. **Satoshi Langar MVP** — a free, source-linked daily intelligence brief and archive.

All other products, autonomous actions, payments, personalized advice, community accounts, agent APIs, trading, custody, onchain execution, and advanced dashboards are Phase 2.

## MVP success definition

The release is successful when an unauthenticated visitor can navigate the four surfaces; view accessible, responsive pages; inspect current and historical read-only content; trace every material Treasury Intelligence and Satoshi Langar claim to a source and freshness timestamp; find approved Lunch Time Conversations; and encounter no production secret, transaction capability, personalized recommendation, or unapproved publication path.

## Milestones

| ID | Milestone | Target window | Exit criteria |
|---|---|---|---|
| M0 | Program Approval | Week 0 | Founder approves MVP, backlog, ADRs, owners, and planning baseline. |
| M1 | Architecture Ready | Weeks 1–2 | Repository, data, API, security, UX, agent, and platform specifications approved. |
| M2 | Experience Ready | Weeks 3–4 | Four-surface IA, wireframes, design tokens, content model, and accessibility acceptance criteria approved. |
| M3 | Data Foundation Ready | Weeks 5–6 | Schemas, provenance rules, API contract, source registry, and test fixtures approved. |
| M4 | MVP Build Complete | Weeks 7–10 | Four surfaces implemented in a future authorized build phase; tests and content workflows pass. |
| M5 | Release Candidate | Weeks 11–12 | Security, accessibility, performance, editorial, rollback, and Founder release gates pass. |

## Sprint plan

| Sprint | Milestone | Goal | Planned outputs |
|---|---|---|---|
| Sprint 0 | M0 | Approve program | Scope, backlog, ADR disposition, owners, risks. |
| Sprint 1 | M1 | Lock interfaces | Repository spec, ADRs, logical architecture, security model. |
| Sprint 2 | M2 | Lock experience | IA, wireframes, design system, editorial content types. |
| Sprint 3 | M3 | Lock data contracts | Database, provenance, API, ingestion and validation specifications. |
| Sprint 4 | M4 | Future authorized build A | Satnam.x shell and Lunch Time Conversations vertical slice. |
| Sprint 5 | M4 | Future authorized build B | Treasury Intelligence and Satoshi Langar vertical slice. |
| Sprint 6 | M5 | Harden and release | QA, accessibility, security, observability, content rehearsal, rollback. |

## Prioritized engineering backlog

Effort uses ideal engineering days and includes design/review but not legal waiting time.

| ID | Work item | Priority | Dependencies | Effort | Required tools | Owner | Milestone | Success criteria |
|---|---|---|---|---:|---|---|---|---|
| ENG-001 | Approve MVP boundary and exclusions | P0 | Constitution v0.2 | 1d | GitHub, Drive | Founder + CTO | M0 | Written approval names only four MVP surfaces and Phase 2 exclusions. |
| ENG-002 | Establish GitHub milestones and project board | P0 | ENG-001 | 1d | GitHub Projects | CTO | M0 | Six milestones and one board with required fields exist. |
| ENG-003 | Approve architecture ADR set | P0 | ENG-001 | 2d | GitHub, Drive | CTO + Founder | M1 | ADR-0001–0005 receive recorded decisions. |
| ENG-004 | Adopt repository specification | P0 | ENG-003 | 2d | GitHub | Platform Lead | M1 | Boundaries, ownership, branching, reviews, and directory map approved. |
| ENG-005 | Define threat model and security controls | P0 | ENG-003 | 4d | Threat-modeling worksheet, GitHub | Security Lead | M1 | Assets, actors, threats, mitigations, and release gates reviewed. |
| ENG-006 | Define deployment and rollback architecture | P0 | ENG-003, ENG-005 | 3d | Vercel, Cloudflare, GitHub Actions | Platform Lead | M1 | Preview/staging/production promotion and rollback are explicit and gated. |
| ENG-007 | Approve website information architecture | P0 | ENG-001 | 3d | Figma or wireframe tool, Drive | Product Design Lead | M2 | Every MVP route maps to one of four surfaces; Phase 2 routes absent. |
| ENG-008 | Validate responsive wireframes | P0 | ENG-007 | 5d | Figma, accessibility tools | Product Design Lead | M2 | Desktop/mobile states and empty/error/stale states pass review. |
| ENG-009 | Approve design system v0.1 | P1 | ENG-007 | 4d | Figma, Storybook (future) | Design Systems Lead | M2 | Tokens and accessible component inventory cover all wireframes. |
| ENG-010 | Define editorial content workflow | P0 | ENG-001, ENG-007 | 3d | Drive, GitHub | Editorial Lead | M2 | Draft, review, approval, correction, archive, and takedown states defined. |
| ENG-011 | Approve logical database schema | P0 | ENG-003, ENG-010 | 5d | PostgreSQL modeling tool | Data Lead | M3 | Entities, sources, claims, observations, publications, conversations, and audits are normalized. |
| ENG-012 | Approve provenance and correction model | P0 | ENG-010, ENG-011 | 3d | PostgreSQL, GitHub | Data Lead + Editorial Lead | M3 | Every material claim supports sources, confidence, freshness, and corrections. |
| ENG-013 | Approve public API contract | P0 | ENG-011, ENG-012 | 5d | OpenAPI, contract test tool | API Lead | M3 | Read-only endpoints, errors, pagination, caching, and versioning are specified. |
| ENG-014 | Define source registry and ingestion policy | P0 | ENG-005, ENG-012 | 4d | Source registry, scheduler design | Data Lead | M3 | Allowlist, terms, freshness, rate limits, quarantine, and replay are defined. |
| ENG-015 | Charter collection and verification agents | P0 | ENG-005, ENG-014 | 4d | Agent charter template, audit store | AI Systems Lead | M3 | Each agent has permissions, escalation, memory, audit, owner, and stop control. |
| ENG-016 | Create test strategy and fixtures | P0 | ENG-008, ENG-011, ENG-013 | 5d | Unit, integration, E2E, accessibility tools | QA Lead | M3 | Test pyramid, fixtures, acceptance suite, and release thresholds approved. |
| ENG-017 | Build Satnam.x shell | P0 | ENG-004, ENG-008, ENG-009 | 8d | Next.js, TypeScript, design system | Web Lead | M4 | Navigation, mission, four-surface discovery, legal footer, and accessibility pass. |
| ENG-018 | Build Lunch Time Conversations | P0 | ENG-010, ENG-017 | 8d | Next.js, content pipeline | Web + Editorial Leads | M4 | Approved entries, transcript/media metadata, search and archive work without accounts. |
| ENG-019 | Build Treasury Intelligence | P0 | ENG-011–014, ENG-017 | 15d | Next.js, Postgres, OpenAPI | Data + Web Leads | M4 | Entity list/profile, observations, provenance, freshness, filters, and disclaimers pass. |
| ENG-020 | Build Satoshi Langar MVP | P0 | ENG-010–014, ENG-017 | 12d | Next.js, Postgres, editorial workflow | Web + Editorial Leads | M4 | Free daily brief, archive, citations, confidence, and corrections pass. |
| ENG-021 | Implement observability and audit | P0 | ENG-006, ENG-013–020 | 6d | Sentry, structured logs, uptime monitor | Platform Lead | M4 | Request, job, content, security, and release events are traceable without sensitive leakage. |
| ENG-022 | Accessibility and performance hardening | P0 | ENG-017–020 | 6d | axe, Lighthouse, browser testing | QA + Web Leads | M5 | WCAG 2.2 AA acceptance and agreed performance budgets pass. |
| ENG-023 | Security verification | P0 | ENG-005, ENG-017–021 | 5d | SAST, dependency scan, DAST, secrets scan | Security Lead | M5 | No open critical/high findings; exceptions are Founder-approved and time-bound. |
| ENG-024 | Content rehearsal and correction drill | P0 | ENG-010, ENG-018–020 | 3d | Staging, editorial checklist | Editorial Lead | M5 | Publish, correction, stale-data, takedown, and restore rehearsals succeed. |
| ENG-025 | Release and rollback rehearsal | P0 | ENG-006, ENG-021–024 | 3d | GitHub Actions, Vercel, Cloudflare | Platform Lead | M5 | Promotion, health verification, rollback, and incident communication meet targets. |
| ENG-026 | Founder go/no-go review | P0 | ENG-022–025 | 1d | Drive approval record, GitHub | Founder | M5 | Explicit release decision recorded; no implied approval. |
| ENG-201 | Phase 2 product discovery | P2 | Public MVP evidence | TBD | Research tools | Product Lead | Phase 2 | Founder authorizes scope after MVP learning review. |

## Ownership model

Named people may be assigned later. Until then, role owners are accountable placeholders; the CTO coordinates execution and the Human Founder retains final approval. No agent may own a release gate, credential, treasury permission, or emergency decision without a named human owner.

## Project board specification

Create one GitHub Project named **SSCOS Public MVP** with views: Backlog, Current Sprint, Roadmap, and Release Gate. Required fields: Priority, Product Surface, Workstream, Sprint, Milestone, Effort (days), Owner, Status, Dependency IDs, Risk, and Success Criteria. Status values: Intake, Ready, In Progress, In Review, Blocked, Done. Product Surface values: Shared Platform, Satnam.x, Treasury Intelligence, Lunch Time Conversations, Satoshi Langar, Phase 2.

## Change policy

Any proposal that adds a fifth public surface to the first release requires Founder approval and an ADR updating the MVP boundary. Product code work remains prohibited until M0 and M1 are approved and a separate build authorization is recorded.
