# SSCOS M0–M1 Founder Decision Packet

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Ready for Founder Decision |
| Owner | CTO / Program Manager |
| Related Volume | Engineering Program |
| Related Chapter | M0 Program Approval and M1 Architecture Ready |
| Dependencies | Engineering Program v0.1; ADR-0001–0005; issues #7, #8, #15–#19 |
| Approval Status | Pending Amardeep Baba G Malhotra Approval |

## Purpose

This packet reduces the outstanding M0 and M1 decisions to explicit choices. It authorizes planning and review only. Approval of this packet does not authorize production application code, deployment, publication, treasury, custody, payments, transactions, production credentials, or a public release.

## Evidence reviewed

- GitHub repository `Satnam-Satoshi/Satoshi-Langar` is accessible and uses `main` as its default branch.
- Review branch `agent/sscos-institutional-baseline-v0-2` contains the engineering program and proposed ADRs.
- GitHub issues #7–#19 hold current milestone, blocker, integration, legal, and ownership work.
- SSCOS Drive root `1vOsG6oilBHObJuXxOLdSDLLaqeqWQZLt` retains its 18 top-level folders.
- Governed planning copies exist in the designated Drive folders.
- No evidence establishes approval for implementation or production action.

## Decision 1 — M0 program baseline

### Recommendation

**Approve with conditions** the SSCOS Engineering Program v0.1 as the controlling planning backlog for the first public release.

### Approved scope if selected

Only Satnam.x, Treasury Intelligence, Lunch Time Conversations, and Satoshi Langar are MVP product surfaces. Institutional support routes such as methodology, sources, corrections, accessibility, privacy, and terms do not constitute additional products. Everything else remains Phase 2.

### Conditions

1. No production code begins until M1–M3 are decided and a separate implementation authorization is recorded.
2. No production integration, deployment, publication, treasury, custody, payment, or transaction action is implied.
3. Native GitHub milestones and the `SSCOS Public MVP` Project must be created or their absence accepted as a temporary control exception.
4. Named human owners must be assigned before implementation authorization.
5. Legal, security, privacy, source-rights, and editorial gates remain mandatory.

### Founder decision

- [ ] Approve with listed conditions
- [ ] Approve with additional conditions written below
- [ ] Return for revision
- [ ] Reject

Additional conditions: ________________________________________________

## Decision 2 — ADR-0001: first public release scope

### Recommendation

**Approve.** A four-surface boundary provides a coherent release and prevents uncontrolled expansion. Any fifth surface requires an ADR and Founder decision.

- [ ] Approve
- [ ] Approve with conditions
- [ ] Return for revision
- [ ] Reject

## Decision 3 — ADR-0002: modular monolith

### Recommendation

**Approve for MVP planning.** One modular Next.js application and one managed PostgreSQL service minimize operational burden while preserving domain boundaries. Require automated boundary checks and public module interfaces before implementation.

- [ ] Approve
- [ ] Approve with conditions
- [ ] Return for revision
- [ ] Reject

## Decision 4 — ADR-0003: provenance-first PostgreSQL

### Recommendation

**Approve for MVP planning.** Immutable observations, claim/source mappings, publication revisions, approvals, and append-only corrections directly support institutional truth and auditability. Require no floating-point financial values and no silent deletion of published evidence.

- [ ] Approve
- [ ] Approve with conditions
- [ ] Return for revision
- [ ] Reject

## Decision 5 — ADR-0004: versioned read-only public API

### Recommendation

**Approve for MVP planning.** Public `/api/v1` routes should expose only bounded `GET` and `HEAD` operations. Ingestion, editorial approval, correction, and administration remain private, authenticated, separately routed, and audited.

- [ ] Approve
- [ ] Approve with conditions
- [ ] Return for revision
- [ ] Reject

## Decision 6 — ADR-0005: managed deployment target

### Recommendation

**Approve conditionally as a target architecture**, not as vendor or production authorization: Vercel for application delivery, Cloudflare for DNS/WAF, managed PostgreSQL/Supabase for persistence, and GitHub Actions for verification and promotion. Conditions are verified account ownership, MFA, environment separation, data-region review, backup/restore evidence, spending controls, and explicit production approval.

- [ ] Approve conditionally
- [ ] Return for vendor comparison
- [ ] Reject

## Decision 7 — temporary ownership model

### Recommendation

Until additional humans are named, Amardeep Baba G Malhotra may temporarily remain accountable owner for Founder, Publisher, Account Owner, Legal Escalation, Security Escalation, and Release Authority. The CTO may coordinate planning and preparation but cannot substitute for human approvals. Implementation roles must be named before implementation authorization.

- [ ] Approve temporary ownership model
- [ ] Assign named owners now
- [ ] Return for revision

Named assignments, if any: ___________________________________________

## Decision 8 — GitHub control exception

The current connected GitHub capability can manage repository content and issues but cannot create native Milestones or Projects. Choose one:

- [ ] Founder creates the native milestones and Project using the specification
- [ ] Approve a temporary exception: issues and governed backlog remain authoritative until tooling is available
- [ ] Provide a GitHub connection capable of Milestone and Project creation

The temporary exception, if chosen, expires before implementation authorization.

## Decision 9 — Buzz, Hermes, and noncritical integrations

### Recommendation

Keep Buzz, Hermes, Circle, Coinbase Developer Platform, Lightning payments, and all transaction-capable services outside the MVP critical path unless a new ADR proves necessity.

- [ ] Approve exclusion to Phase 2
- [ ] Identify an MVP-critical integration and rationale: ____________________

## M0 exit test

M0 is complete only when Decision 1 is recorded, the four-surface boundary is accepted, the ownership path is selected, the GitHub control path is selected, and no unresolved condition prevents formal M1 review.

## M1 review order after M0

1. ADR-0001 scope.
2. ADR-0002 application shape and repository boundaries.
3. ADR-0003 database, provenance, and corrections.
4. ADR-0004 public API and private mutation boundary.
5. Security threat model and agent permissions.
6. ADR-0005 integration, environment, deployment, backup, and rollback target.
7. Legal and compliance readiness conditions.

## Approval record

| Decision | Approver | Date | Conditions / Notes |
|---|---|---|---|
| Pending | Amardeep Baba G Malhotra | Pending | This packet grants no implementation or production authority. |
