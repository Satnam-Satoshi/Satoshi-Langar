# SSCOS MVP Threat Model

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed — Security Review Required |
| Owner | Security Lead |
| Related Volume | Engineering Program |
| Related Chapter | M1 Architecture Ready / ENG-005 |
| Dependencies | ADR-0001–0005; Platform Security and Deployment v0.1; MVP Agent Specifications; Source Registry v0.1 |
| Approval Status | Pending Human Founder and Security Lead Approval |

## Deliverable mapping

This threat model governs the four MVP surfaces and their shared content, data, agent, and deployment infrastructure. It defines release-blocking threats and the evidence required before implementation and release approvals. It authorizes no implementation, account configuration, security testing against external systems, deployment, or production action.

## Scope and non-scope

### In scope

- Satnam.x public gateway.
- Treasury Intelligence read-only pages and API.
- Lunch Time Conversations archive, approved transcripts, and media metadata.
- Satoshi Langar editions, citations, confidence, and corrections.
- Source intake, normalization, verification assistance, editorial approval, publication preparation, database, public API, CI/CD, DNS/edge, logs, backups, and administrative control plane.

### Explicitly out of MVP scope

Wallets, seed phrases, custody, trading, borrowing, lending, payments, subscriptions, personalized advice, public accounts, autonomous publication, agent-to-agent commerce, treasury execution, Circle, Coinbase transaction services, and Lightning payments.

Any appearance of an out-of-scope capability is a scope violation and release blocker.

## Security objectives

1. **Publication integrity:** only an approved immutable revision becomes public.
2. **Provenance integrity:** every material claim traces to governed source evidence and transformations.
3. **Authority integrity:** no agent, developer, source, or external system expands its own permissions.
4. **Confidentiality:** secrets, private drafts, security reports, personal data, and privileged metadata remain restricted.
5. **Availability and freshness:** outages and stale data are visible and safely degraded.
6. **Auditability:** material actions, decisions, corrections, and releases are attributable and tamper-evident.
7. **Recoverability:** approved data and releases can be restored or rolled back within declared objectives.
8. **Human control:** Amardeep Baba G Malhotra retains final release, publisher, account, and treasury authority.

## Protected assets

| Asset | Security need | Consequence of compromise |
|---|---|---|
| Domain and DNS control | Integrity, availability, recoverability | Traffic hijack, phishing, public outage |
| GitHub organization/repository | Integrity, confidentiality of controls, auditability | Supply-chain compromise, unauthorized code/docs |
| Deployment accounts and artifacts | Integrity, least privilege, rollback | Unauthorized public release or persistent compromise |
| Database and backups | Confidentiality, integrity, availability | False claims, evidence loss, private-draft exposure |
| Source registry and fetch evidence | Integrity, provenance | Poisoned or unverifiable intelligence |
| Publication revisions and approvals | Integrity, non-repudiation | Unauthorized or silently altered publication |
| Correction history | Integrity, availability | Hidden errors and institutional trust failure |
| Agent prompts, policies, tools, and identities | Integrity, least privilege | Prompt injection, unauthorized tools/actions |
| Credentials and recovery methods | Confidentiality, availability | Account takeover and lockout |
| Logs and security evidence | Integrity, confidentiality | Detection failure or sensitive-data leakage |
| Participant/media rights records | Confidentiality, integrity | Privacy, consent, and legal harm |

## Actors

- Anonymous visitor.
- Good-faith researcher or contributor.
- Malicious external attacker.
- Source publisher, compromised source, or poisoned upstream feed.
- Authorized human editor, developer, reviewer, account owner, or release operator.
- Compromised or malicious insider.
- Source Collection, Normalization, and Verification agents.
- GitHub, Drive, hosting, database, edge, observability, and AI vendors.
- Automated crawler, bot, denial-of-service actor, or dependency maintainer.

## Trust boundaries and data flow

```text
Untrusted Internet and source content
        │ TB-01 egress allowlist, fetch limits, content isolation
        ▼
Source intake ── TB-02 parser sandbox/schema validation ──► candidate observations
        │                                                    │
        │ immutable raw metadata/hash                        │ TB-03 provenance + confidence
        ▼                                                    ▼
Evidence store ◄──────────────────────────────────── verification findings
        │                                                    │
        └──────────── TB-04 human editorial approval ────────┘
                                      │
                                      ▼
                           immutable publication revision
                                      │ TB-05 release promotion
                                      ▼
GitHub artifact ── hosting/CDN/WAF ── public pages and read-only API ── visitor

Privileged admin plane ── TB-06 strong identity/least privilege ── approvals, corrections, release
Logs/backups/vendors ──── TB-07 redaction/encryption/retention ─── audit and recovery
```

Public request paths must not reach source intake, editorial mutation, agent control, deployment, secrets, or database administration.

## Control catalog

| Control ID | Control | Required evidence |
|---|---|---|
| IAM-01 | Phishing-resistant MFA for privileged human accounts | Account screenshots/export or provider audit evidence; recovery review |
| IAM-02 | Named owner, backup, least privilege, quarterly access review | Access register and signed review record |
| IAM-03 | Separate non-human identities by environment and function | Role matrix and denied cross-function tests |
| SRC-01 | Versioned egress allowlist and approved source registry | Registry approval and blocked-domain test |
| SRC-02 | Payload type/size/time limits, redirect bounds, safe download handling | Adversarial fetch fixtures and sandbox test |
| SRC-03 | Retrieved content is always data, never instruction | Prompt-injection evaluation with zero tool/policy changes |
| SRC-04 | Immutable fetch metadata and content hash where permitted | Database/fixture trace from source to fetch |
| DAT-01 | Fixed-precision values, UTC timestamps, explicit units/currency | Property and boundary tests |
| DAT-02 | Immutable observations/revisions; append-only corrections | Mutation-denial and correction-link tests |
| DAT-03 | Base tables denied to anonymous clients; curated public reads only | Row-level and endpoint authorization tests |
| DAT-04 | Backup, restore, portability, retention, and deletion procedures | Timed staging restore and export evidence |
| PUB-01 | Named human approval required for every public revision | Attempted agent/developer publish denied; approval audit exists |
| PUB-02 | Publication artifact binds content hash, source version, schema, commit, and approver | Release manifest verification |
| PUB-03 | Stale, corrected, quarantined, and unavailable states are explicit | UI/API acceptance tests |
| API-01 | MVP public API exposes bounded `GET`/`HEAD` only | OpenAPI and route inventory test; mutation verbs rejected |
| API-02 | Input validation, cursor bounds, rate limits, safe errors, correlation IDs | Contract, fuzz, and abuse tests |
| WEB-01 | Contextual output encoding, CSP, secure headers, no unsafe active content | Browser security test and header evidence |
| WEB-02 | Accessible security and status messaging | Keyboard/screen-reader verification for stale/error/correction states |
| SDLC-01 | Protected branch, CODEOWNERS, required checks, pinned CI dependencies | Repository settings evidence and negative merge test |
| SDLC-02 | Dependency, SAST, secrets, license, and configuration scans | Passing reports with documented exception policy |
| ENV-01 | Local/preview/staging/production isolation | Environment and credential inventory; preview secret-denial test |
| REL-01 | Build once, immutable artifact, manual production gate, rollback target | Signed release rehearsal and rollback evidence |
| OBS-01 | Structured redacted logs, security alerts, source/job freshness monitoring | Synthetic alerts and sensitive-data leak tests |
| IR-01 | Incident severity, contacts, containment, evidence preservation, communication | Tabletop exercise and timed response record |
| KILL-01 | Independent ingestion and publication kill switches | Staging exercise proves each works without the other |
| VEN-01 | Vendor ownership, MFA, roles, regions, subprocessors, billing, recovery, exit | Completed integration evidence checklist |

## Threat register

Risk uses Likelihood (L) and Impact (I) from 1–5; inherent score is L×I. Scores 15–25 are Critical, 10–14 High, 5–9 Medium, 1–4 Low. Residual risk is unproven until controls are tested.

| ID | Category | Threat / abuse case | L | I | Inherent | Required controls | Required test/evidence | Release disposition |
|---|---|---|---:|---:|---:|---|---|---|
| T-001 | Spoofing | Attacker takes over Founder, GitHub, DNS, hosting, database, or email identity | 3 | 5 | 15 | IAM-01–03, VEN-01, IR-01 | MFA/recovery/access evidence; account-takeover tabletop | Block until verified |
| T-002 | Tampering | Repository, dependency, workflow, or build artifact is modified outside review | 3 | 5 | 15 | SDLC-01–02, PUB-02, REL-01 | Negative merge test; pinned action audit; artifact hash check | Block on critical/high finding |
| T-003 | Tampering | Compromised source injects false holdings, legal status, or network data | 4 | 5 | 20 | SRC-01–04, DAT-01–02, PUB-01–03 | Conflicting-primary and poisoned-source fixtures quarantine | Block if auto-confirmed |
| T-004 | Elevation | Retrieved content instructs an agent to reveal secrets, change policy, call tools, or publish | 5 | 5 | 25 | SRC-02–03, IAM-03, PUB-01, KILL-01 | Prompt-injection suite; zero unauthorized side effects | Block on any escape |
| T-005 | Elevation | Public route reaches editorial/admin/database mutation | 3 | 5 | 15 | DAT-03, API-01–02, ENV-01 | Anonymous mutation and direct-table tests all denied | Block on any write path |
| T-006 | Repudiation | Publication or correction cannot be attributed to a human approval and exact revision | 3 | 5 | 15 | DAT-02, PUB-01–02, OBS-01 | End-to-end evidence chain and tamper attempt | Block if chain incomplete |
| T-007 | Information disclosure | Secret, private draft, participant data, stack trace, or privileged metadata leaks | 3 | 5 | 15 | IAM-03, DAT-03–04, API-02, OBS-01, ENV-01 | Secrets scan, error tests, log redaction, preview isolation | Block on confirmed leak |
| T-008 | Denial of service | Traffic flood, expensive filters, oversized payloads, or abusive polling exhausts service | 4 | 4 | 16 | SRC-02, API-02, WEB-01, VEN-01 | Rate/complexity/load tests; graceful `429` and degraded state | Block if common abuse causes outage |
| T-009 | Integrity | Floating point, unit, timezone, duplicate, or entity-resolution error creates false numbers | 4 | 5 | 20 | DAT-01–02, PUB-03 | Boundary/property fixtures and independent calculations | Block on headline mismatch |
| T-010 | Integrity | Custody, seized assets, estimates, or price-driven AUM is mislabeled as beneficial holdings/flows | 4 | 5 | 20 | SRC-04, DAT-01–02, PUB-03 | Semantic fixtures require explicit classification | Block if conflated |
| T-011 | Integrity | Legal proposal or commentary is mislabeled as enacted/final law | 4 | 5 | 20 | SRC-01–04, PUB-03 | Legislative lifecycle fixtures and primary-action check | Block if status overstated |
| T-012 | Availability | Source/API outage silently serves stale data as current | 4 | 4 | 16 | PUB-03, OBS-01, KILL-01 | Clock-controlled stale/outage tests | Block if freshness hidden |
| T-013 | Tampering | Correction is deleted, suppressed, detached, or prior publication silently overwritten | 3 | 5 | 15 | DAT-02, PUB-02–03, OBS-01 | Append-only and revision-history tests | Block on destructive correction path |
| T-014 | Supply chain | Malicious package or CI action compromises build or credentials | 3 | 5 | 15 | SDLC-02, ENV-01, REL-01 | Dependency provenance, lockfile, pinned actions, secret-denial | Block on unresolved critical/high |
| T-015 | Privacy | Conversation media/transcript is published without consent or approved rights | 2 | 5 | 10 | PUB-01–02, VEN-01, Legal gate | Missing/withdrawn-consent fixture denies publication | Block without rights record |
| T-016 | Abuse | Website content is interpreted as personalized financial advice or guaranteed yield | 3 | 4 | 12 | Editorial/legal policy, PUB-01–03 | Content lint and human review fixtures | Block on prohibited language |
| T-017 | Insider | One human or compromised agent can collect, approve, publish, and deploy | 3 | 5 | 15 | IAM-02–03, PUB-01, REL-01 | Separation-of-duty tests and access review | Block absent compensating Founder control |
| T-018 | Recovery | Backup is unavailable, corrupted, unportable, or cannot restore within objective | 2 | 5 | 10 | DAT-04, REL-01, IR-01 | Timed staging restore and integrity comparison | Block before release |
| T-019 | Configuration | Preview/staging uses production credentials, data, domain, or write authority | 3 | 5 | 15 | ENV-01, SDLC-02 | Environment inventory and canary secret-denial test | Block on crossover |
| T-020 | Scope | Wallet, payment, account, transaction, or fifth public surface enters MVP unnoticed | 3 | 5 | 15 | ADR-0001, repository review, API-01 | Route/dependency/capability inventory | Block until new ADR/approval |

## Agent-specific constraints

- Collection identity may read approved sources and append fetch results only.
- Normalization identity may read fetches and append candidate observations only.
- Verification identity may read evidence and append findings only.
- No agent identity may approve, publish, deploy, change allowlists, alter prompts/policies, manage credentials, access production administration, or call transaction-capable tools.
- Agent memory is run-scoped except governed evidence and audit records.
- Emergency stop disables scheduling/worker identity, preserves evidence, and routes pending work to humans.

## Release-blocking security gates

- [ ] No unresolved Critical or High finding without explicit Founder-approved, time-bounded exception.
- [ ] All Critical threats have passing tests and named human control owners.
- [ ] Privileged MFA, recovery, access, and environment separation are verified.
- [ ] Public API and database anonymous mutation attempts are denied.
- [ ] Prompt-injection and source-poisoning suites produce quarantine with zero side effects.
- [ ] Publication requires a human approval bound to an immutable revision.
- [ ] Stale, correction, unavailable-source, and quarantined states are visible in UI and API.
- [ ] Ingestion and publication kill switches are independently demonstrated.
- [ ] Staging backup restore and application rollback satisfy declared objectives.
- [ ] Consent/media rights and legal publication checklist pass.
- [ ] Founder records explicit release decision.

## Required human decisions

1. Name Security Lead and backup.
2. Approve risk scale, risk appetite, and exception authority.
3. Decide the minimum separation-of-duties model if initial staffing is limited.
4. Approve the release-blocking threat set and required evidence.
5. Authorize only non-production security verification after M1; external scanning and production testing remain separately gated.

## Future review

Review before implementation authorization, after any new integration or public capability, after a material incident, before every production release, and no later than 2026-11-05.
