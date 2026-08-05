# SSCOS Logical Data Constraints and Access Policy

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Logical Specification — No Migration Authorized |
| Owner | Data Lead / Security Lead |
| Related Volume | Engineering Program |
| Related Chapter | M3 Data Foundation — ENG-011 / ENG-012 |
| Dependencies | ADR-0003; Database and API Design v0.1; OpenAPI v1 Draft; Publication State Machine; Threat Model; Fixture Catalog |
| Approval Status | Pending Human Founder, Data, Security, Editorial, and Legal Approval |

## Deliverable mapping

This specification converts the MVP database model into testable logical constraints and access policies. It supports Treasury Intelligence, Lunch Time Conversations, and Satoshi Langar. It contains no executable SQL, migration, database connection, credential, or production authorization.

## Global invariants

1. All durable records use stable opaque identifiers; public IDs do not reveal sequence, vendor, tenant, or database topology.
2. All timestamps are timezone-aware UTC. Source/display timezone and cutoff are retained separately where material.
3. Asset and monetary quantities use fixed-precision decimals represented externally as strings; binary floating point is prohibited.
4. Units, currencies, assets, classifications, authority classes, confidence, and verification states are explicit enumerations or governed references.
5. Every material observation links to exactly one admitted source fetch; every public material claim links to one or more evidence records.
6. Fetches, observations, approved publication revisions, approvals, transitions, corrections, release events, and audit events are append-only.
7. A correction never overwrites or deletes the affected observation, claim, revision, approval, or release event.
8. Quarantined, rejected, unapproved, withdrawn-without-public-tombstone, and private-draft records are unavailable to anonymous/public data paths.
9. Human approval binds the exact publication revision hash. A changed hash invalidates the approval for release.
10. Public data is served only through curated read models or server endpoints; anonymous direct table access is denied.
11. No MVP table stores wallet secrets, seed phrases, private keys, trading instructions, portfolio profiles, payment credentials, or production secrets.
12. Retention/deletion actions follow approved policy and are audited; evidence subject to legal hold cannot be destroyed.

## Type and identifier policy

| Concept | Logical representation | Constraint |
|---|---|---|
| Internal/public ID | Opaque prefixed identifier or UUID-compatible value | Unique, immutable, non-semantic; public pattern defined by contract |
| UTC timestamp | Timezone-aware instant | Required where event occurs; reject impossible/future values beyond approved tolerance |
| Local/source time | Local timestamp plus IANA timezone and cutoff rule | Never used without corresponding UTC normalization |
| Asset amount | Fixed precision up to 38 significant digits / 18 fractional digits | Explicit asset; domain bounds; external decimal string |
| Monetary amount | Fixed precision plus ISO currency and valuation timestamp | No implied currency or live conversion |
| Hash | Algorithm-qualified lowercase digest | Exact length/format; content canonicalization version retained |
| URL | Canonical HTTPS URL unless approved exception | Length bound; private credentials/query secrets prohibited |
| Text | Unicode normalized UTF-8 | Length/content policy by field; active content treated as untrusted |
| Status/classification | Governed enum/reference | Unknown values fail closed or quarantine; never silently coerced |

## Core relation constraints

| Relation | Required fields | Uniqueness / identity | Integrity and lifecycle | Public exposure |
|---|---|---|---|---|
| `sources` | source ID, owner, canonical URL, authority class, status, allowable/prohibited claims, review state | source ID; canonical owner+URL among active records | Versioned; retirement instead of destructive delete; activation requires approvals | Curated public methodology subset only |
| `source_fetches` | source, requested/retrieved times, result, HTTP metadata, parser version, content hash where permitted | fetch ID; optional source+content hash+retrieval window dedup key | Append-only; bounded raw reference; failed/blocked attempts retained as events | Never directly public |
| `assets` | asset ID, symbol, name, precision, network/reference | asset ID; canonical symbol within namespace | Approved assets BTC/LTC/XLM for MVP; new asset requires review | Curated reference data |
| `entities` | entity ID, canonical name, type, jurisdiction, status | entity ID; canonical identity key where reliable | Merge/split requires reviewed event; no silent reassignment | Approved summary/profile only |
| `entity_aliases` | entity, alias, source/jurisdiction context, validity | alias+context+validity non-overlap | Ambiguity blocks automatic resolution | Not independently public |
| `entity_relationships` | from/to entity, relationship type, validity, source evidence | directed relationship+validity | Supports parent/subsidiary/custodian/beneficial-owner distinctions; cycle rules by type | Curated when relevant |
| `observations` | fetch, entity/subject, type, observed time, value/unit, confidence, verification status | observation ID; dedup signature does not erase distinct primary evidence | Append-only; quarantine allowed; changes create new observations | Only through verified claims/read models |
| `treasury_snapshots` | observation, entity, asset, amount, classification, effective time | snapshot ID; one normalized projection per observation/classification | Classification required: beneficial, custody, seized, strategic reserve, or estimate; no double counting | Verified/provisional/estimated states per policy |
| `claims` | claim ID, text, category, as-of, confidence, verification status | claim ID; content hash within revision context | Fact/estimate/interpretation required; Q never public | Only in approved publication/read model |
| `claim_evidence` | claim, source/fetch/observation, relevance, support type | claim+evidence+support type | At least one qualifying evidence link for material public claim; conflicting link blocks approval | Source link subset public |
| `publications` | publication ID, type, slug/date identity, lifecycle status | publication ID; type+slug/date unique among active identities | Stable container; content exists only in revisions | Approved container metadata |
| `publication_revisions` | publication, sequence, content hash, schema/editorial versions, created by/time | publication+sequence; content hash immutable | Append-only; exact revision approved/released | Only released revisions |
| `publication_claims` | revision, claim, section/order | revision+claim; revision+section+order | Order unique; cannot attach quarantined/unapproved claims | Included through released revision |
| `conversations` | publication, participants, event/recorded date, transcript/media/rights status | one conversation record per publication | Rights/consent state guards publication; participant identity minimal and approved | Released fields only |
| `approval_events` | target revision, decision, human actor, role, timestamp, hash, conditions | approval event ID; only one active Publisher approval per exact revision/channel | Append-only; agent/service cannot be Publisher approver | Public decision metadata may be minimized |
| `publication_transitions` | publication/revision, from/to state, actor, reason, timestamp, audit link | transition ID | Must match approved state machine; append-only; invalid transitions denied and audited | Current public state only |
| `corrections` | correction ID, affected claim/revision, severity, summary, replacement link, decision/release times | correction ID; unique correction sequence per affected target | Append-only; bidirectional links; C1/C2 Publisher approval | Public notice for released corrections |
| `release_events` | revision, channel/environment, artifact/commit/schema hashes, approver/operator, timestamp | release ID; environment+artifact idempotency key | Only exact approved hash; rollback/withdraw events appended | Public version metadata subset |
| `audit_events` | actor, action, target, outcome, timestamp, correlation ID, safe metadata | audit ID; correlation/event uniqueness as appropriate | Append-only/tamper-evident; sensitive payload prohibited | Never public except aggregated transparency report |
| `rights_records` | subject/work, right/consent type, grantor, scope, status, evidence reference, validity | rights ID; subject+scope+validity rules | Private/restricted; withdrawal supersedes grant without deleting evidence | Public availability state only |

## Referential rules

- A source fetch cannot reference a retired/nonexistent source without retaining the historical source version.
- An observation cannot exist without a source fetch, except an explicitly modeled deterministic calculation whose inputs all have evidence links and a calculation version.
- A treasury snapshot cannot exist without its governing observation and canonical entity/asset.
- A material claim cannot enter `READY_FOR_PUBLISHER` without qualifying claim evidence and a complete freshness evaluation.
- A publication claim cannot attach to a revision after the revision hash is sealed.
- An approval event cannot target a mutable or mismatched revision hash.
- A release event cannot exist without a valid Publisher approval for the exact revision/channel and all guards.
- A correction cannot target a missing claim/revision and cannot remove the original evidence chain.
- A public conversation revision cannot release without effective rights/consent or an approved legal exception.

## Enumeration controls

| Domain | Approved MVP values / rule |
|---|---|
| Authority | `P0`, `P1`, `S1`, `S2`, `U`; `U` and uncorroborated S1/S2 cannot confirm material claims |
| Confidence | `A`, `B`, `C`, `D`, `Q`; `Q` never public |
| Claim category | `fact`, `estimate`, `interpretation` |
| Treasury classification | `beneficial_holding`, `custody`, `seized`, `strategic_reserve`, `estimate` |
| Verification | `candidate`, `provisional`, `verified`, `estimated`, `quarantined`, `rejected` |
| Freshness | `current`, `stale`, `source_unavailable` |
| Correction | `C1`, `C2`, `C3` |
| Publication state | Exact states in Publication State Machine v0.1; no free-form transition |
| Actor type | `human`, `agent`, `service`; approval policy checks role and human type |

## Access-policy matrix

`Append` means creation of a new immutable record; it does not allow update/delete.

| Identity | Source registry | Fetches | Observations | Claims/drafts | Approvals/transitions | Releases/corrections | Base-table public read |
|---|---|---|---|---|---|---|---|
| Anonymous/public | No direct access | None | None | None | None | None | Denied; curated API/read models only |
| Source Collection Agent | Read active allowlist subset | Append own run results | None | None | None | None | Denied |
| Normalization Agent | Read approved schema subset | Read admitted fetches | Append candidate observations | None | None | None | Denied |
| Verification Assistant | Read approved metadata | Read | Read; append findings only | Read candidates; no final status/approval | None | None | Denied |
| Researcher | Propose; approved human workflow | Read permitted evidence | Propose/review | Draft candidate claims | None | None | Denied |
| Fact Checker | Read | Read | Review/disposition within policy | Review and request revision | Append non-public review transition where authorized | None | Denied |
| Editor | Read | Read summaries | Read verified | Create revisions/request changes | Editorial transitions only | None | Denied |
| Legal Reviewer | Read rights/terms subset | Read necessary evidence | Read necessary evidence | Review triggered revisions | Legal review disposition only | Takedown recommendation | Denied |
| Publisher | Read | Read evidence | Read verified | Read sealed revision | Approve/reject exact revision; withdrawal/restoration authority | Approve correction/release decision, not execute deployment | Denied |
| Release Operator | Read released metadata | None | None | Read approved sealed revision | Cannot approve | Append release event for exact approved artifact/channel | Denied |
| Security Lead | Read controls | Read security metadata | Quarantine/stop via governed control | Read incident-scoped data | Emergency stop; cannot editorially approve | Emergency containment; restoration requires approval | Denied |
| Database migration identity | Schema operation in approved environment only | No business mutation outside migration plan | Same | Same | None | None | Denied |

All permissions deny by default, are environment-specific, and require named human ownership. No agent can grant roles, alter policies, approve, publish, deploy, or manage credentials.

## Public read-model rules

- Include only released/approved records allowed by the OpenAPI contract.
- Exclude private drafts, raw fetch content, rights evidence, prompts, internal findings, credentials, base-table identifiers, and security metadata.
- Return explicit freshness, confidence, source links, correction state, units, and timestamps where material.
- Never expose `Q`, rejected, unapproved, or unresolved-conflict records.
- Withdrawn content returns the approved tombstone/`410` behavior without leaking restricted rationale.
- Cache keys include contract version, public read-model version, and released revision/hash where appropriate.

## Index and query design requirements

- Every foreign/reference key used for integrity and common joins has an index plan.
- Public lists use deterministic compound ordering plus stable cursor components; offset-only pagination is not the canonical public contract.
- Source/entity/date/filter indexes are justified by approved query patterns, not speculative dashboards.
- Append-only event tables support target+time and correlation ID lookups.
- Unique/idempotency keys prevent duplicate release events, repeated fetch ingestion, and duplicate correction application without destroying distinct evidence.
- No user-controlled field selects arbitrary columns, sort expressions, or unbounded relationship depth.

## Retention and disposition classes

| Class | Examples | Proposed rule pending Legal approval |
|---|---|---|
| Institutional evidence | Approvals, releases, corrections, ADR-linked audit | Long-term/indefinite institutional record; legal hold capable |
| Provenance evidence | Fetch metadata, hashes, observations, claim links | Retain while supporting public record plus approved archival period |
| Bounded raw fixture/content | Legally permitted excerpts or file references | Minimum necessary; source/license-specific duration |
| Draft/editorial | Rejected and superseded drafts | Restricted retention according to legal/editorial policy |
| Rights/consent | Releases, grants, withdrawals | Restricted; retain for rights defense and obligations |
| Operational logs | Request/job/security logs | Shortest useful period by risk; redacted; security exceptions documented |

No exact duration is approved until Legal, Security, and Privacy owners decide it.

## Migration and schema-change gate

Before executable schema work: approved logical version; data classification; threat/control mapping; forward and rollback/repair plan; fixture coverage; access-policy tests; performance plan; backup/restore plan; compatibility with OpenAPI and state machine; named reviewers; non-production environment; and separate implementation authorization.

Every schema change records version, rationale, ADR if material, dependencies, affected contracts, data transformation, reversibility, test evidence, approvers, and next review. Destructive production migrations require separate explicit approval and verified backup/restore evidence.

## Acceptance criteria

- All global invariants map to at least one constraint or test fixture.
- A complete synthetic chain can prove source → fetch → observation → claim → revision → approval → release → correction.
- Anonymous/direct base-table access and public mutation are denied.
- Agents cannot approve, publish, deploy, change allowlists/policies, or grant permissions.
- Financial precision, units, ownership classification, legal state, freshness, and corrections cannot be silently lost.
- A changed publication hash cannot reuse an old approval.
- Public read models match OpenAPI and exclude restricted states/fields.
- Schema/version changes cannot proceed without compatibility and migration evidence.

## Required human decisions

1. Approve global invariants, core relations, and enumeration policy.
2. Name Data, Security, Editorial, Privacy, and Legal reviewers.
3. Approve retention/disposition rules and data jurisdictions.
4. Approve the minimum initial separation-of-duties/access model.
5. Authorize executable schema/migration work only after M1–M3 and separate implementation approval.
