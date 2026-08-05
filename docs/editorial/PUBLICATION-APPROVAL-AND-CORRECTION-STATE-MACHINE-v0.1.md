# SSCOS Publication Approval and Correction State Machine

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed — Editorial and Legal Review Required |
| Owner | Editorial Lead / Publisher |
| Related Volume | Engineering Program |
| Related Chapter | M2 Experience Ready — ENG-010 |
| Dependencies | ADR-0003; MVP Threat Model; Source Registry; Fixture Catalog |
| Approval Status | Pending Amardeep Baba G Malhotra, Editorial, and Legal Approval |

## Deliverable mapping

This state machine governs Satoshi Langar editions, Lunch Time Conversations, and any editorial narrative attached to Treasury Intelligence. It makes publication, correction, withdrawal, and restoration decisions explicit and auditable. It authorizes no publication or implementation.

## Authority

Amardeep Baba G Malhotra is the Publisher and final publication authority during the founding phase. AI agents may collect, normalize, test, flag, and draft within approved permissions but may not approve, schedule, publish, correct, withdraw, restore, or override a human decision.

## State model

```text
IDEA
  → SOURCED_DRAFT
    → FACT_CHECK
      ├→ QUARANTINED ──→ SOURCED_DRAFT or REJECTED
      └→ EDITORIAL_REVIEW
           ├→ LEGAL_REVIEW_REQUIRED ──→ EDITORIAL_REVIEW or REJECTED
           └→ READY_FOR_PUBLISHER
                ├→ CHANGES_REQUESTED ──→ SOURCED_DRAFT
                ├→ REJECTED
                └→ APPROVED_REVISION
                     → SCHEDULED
                       → PUBLISHED
                         ├→ CORRECTION_REVIEW → CORRECTED_REVISION → PUBLISHED_CORRECTED
                         ├→ TAKEDOWN_REVIEW → WITHDRAWN
                         └→ ARCHIVED

WITHDRAWN → RESTORE_REVIEW → APPROVED_REVISION → SCHEDULED → PUBLISHED/PUBLISHED_CORRECTED
```

An approval binds the exact immutable revision hash. Any content change after approval creates a new revision and returns to the appropriate review state.

## State definitions

| State | Meaning | Entry evidence | Permitted next states | Public visibility |
|---|---|---|---|---|
| `IDEA` | Proposed topic or conversation | Owner, purpose, MVP mapping | `SOURCED_DRAFT`, `REJECTED` | None |
| `SOURCED_DRAFT` | Draft with candidate claims and source links | Draft revision, claim/source map | `FACT_CHECK`, `REJECTED` | None |
| `FACT_CHECK` | Factual, numerical, provenance, freshness, and classification review | Named fact checker; fixture findings | `QUARANTINED`, `EDITORIAL_REVIEW`, `SOURCED_DRAFT` | None |
| `QUARANTINED` | Conflict, weak authority, stale source, rights issue, schema failure, or security concern | Reason code, evidence, owner | `SOURCED_DRAFT`, `REJECTED` | None |
| `EDITORIAL_REVIEW` | Clarity, context, tone, disclaimer, accessibility, and mission review | Named editor; complete claims | `LEGAL_REVIEW_REQUIRED`, `READY_FOR_PUBLISHER`, `SOURCED_DRAFT`, `REJECTED` | None |
| `LEGAL_REVIEW_REQUIRED` | Legal, licensing, privacy, consent, defamation, advice, or takedown review | Trigger and named reviewer | `EDITORIAL_REVIEW`, `REJECTED` | None |
| `READY_FOR_PUBLISHER` | Immutable revision satisfies required reviews | Revision hash, complete checklist | `APPROVED_REVISION`, `CHANGES_REQUESTED`, `REJECTED` | None |
| `CHANGES_REQUESTED` | Publisher requires a new revision | Human decision and instructions | `SOURCED_DRAFT` | None |
| `APPROVED_REVISION` | Publisher approved one exact revision | Publisher identity, timestamp, hash, conditions | `SCHEDULED`; approval may be revoked before publication | None |
| `SCHEDULED` | Approved revision assigned a release time/channel | Schedule, environment, release owner | `PUBLISHED`, `APPROVED_REVISION` | None until release |
| `PUBLISHED` | Approved revision is public | Release event, public URL, artifact/commit/schema hashes | `CORRECTION_REVIEW`, `TAKEDOWN_REVIEW`, `ARCHIVED` | Public |
| `CORRECTION_REVIEW` | Possible error assessed against original evidence | Correction case, severity, affected claims | `CORRECTED_REVISION`, `PUBLISHED`, `TAKEDOWN_REVIEW` | Original remains with notice when appropriate |
| `CORRECTED_REVISION` | Replacement/addendum approved with explicit link to original | New hash, correction record, publisher approval | `PUBLISHED_CORRECTED` | Not public until release |
| `PUBLISHED_CORRECTED` | Corrected revision and correction notice are public | Release event and bidirectional links | `CORRECTION_REVIEW`, `TAKEDOWN_REVIEW`, `ARCHIVED` | Public with correction marker |
| `TAKEDOWN_REVIEW` | Rights, safety, privacy, legal, or severe-integrity issue assessed | Trigger, severity, legal/editorial owner | `WITHDRAWN`, prior public state | Public status determined by emergency policy |
| `WITHDRAWN` | Content removed from normal access under approved decision | Publisher/legal decision, reason class, evidence-retention rule | `RESTORE_REVIEW`, `ARCHIVED` | Tombstone or legally required response |
| `RESTORE_REVIEW` | Proposed restoration with new evidence/rights | Complete re-review packet | `APPROVED_REVISION`, `WITHDRAWN` | Withdrawn state remains |
| `ARCHIVED` | No longer current but retained as an institutional record | Archive decision and retention policy | `CORRECTION_REVIEW` when material | Public or internal per policy |
| `REJECTED` | Proposal/revision will not proceed | Human decision and reason class | New `IDEA` only | None |

## Roles and separation of duties

| Role | May do | May not do |
|---|---|---|
| Researcher / Collection Agent | Nominate sources, collect approved evidence | Approve claims or publish |
| Normalization Agent | Produce candidate structured observations | Change source authority or verification status |
| Verification Assistant | Run checks and recommend quarantine | Confirm final claim, approve, or publish |
| Fact Checker | Decide factual disposition within policy | Approve legal exceptions or public release |
| Editor | Decide editorial readiness and request changes | Substitute for Publisher or Legal reviewer |
| Legal Reviewer | Decide scoped legal/rights conditions | Approve technical release or alter evidence |
| Publisher | Approve/reject exact revisions, corrections, withdrawal, restoration | Approve a mutable draft or delegate silently |
| Release Operator | Release only an approved hash to an approved channel | Modify content, approve, or bypass schedule/gates |
| Security Lead | Stop ingestion/publication and preserve evidence during incident | Rewrite editorial content or restore without approval |

When staffing prevents full separation, the Founder may approve a documented temporary compensating control. No agent may fill a missing human role.

## Mandatory transition record

Every state transition records:

- publication and revision IDs;
- prior and next state;
- exact revision/content hash;
- actor identity and human/agent/service type;
- authority/role used;
- UTC timestamp and request/correlation ID;
- reason code and notes;
- source registry, parser, policy, schema, and prompt/model versions where relevant;
- required checklist results;
- conditions, expiry, and linked exception;
- affected claims, sources, corrections, rights, and public URLs;
- audit-event ID.

Transition records are append-only. A rejected transition is also logged without exposing sensitive details publicly.

## Transition guards

| Transition | Required guard |
|---|---|
| `SOURCED_DRAFT → FACT_CHECK` | Every material claim has source link, category, as-of time, and candidate confidence |
| `FACT_CHECK → EDITORIAL_REVIEW` | No unresolved conflict; arithmetic, units, entity resolution, freshness, authority, and duplicates pass |
| `EDITORIAL_REVIEW → READY_FOR_PUBLISHER` | Required legal triggers resolved; disclaimers, accessibility, consent/rights, and prohibited-language checks pass |
| `READY_FOR_PUBLISHER → APPROVED_REVISION` | Named Publisher approves exact immutable hash and conditions |
| `APPROVED_REVISION → SCHEDULED` | Approval remains valid; release environment/channel and rollback target are identified |
| `SCHEDULED → PUBLISHED` | Artifact hash matches approval; release gate and publication kill switch are healthy |
| `CORRECTION_REVIEW → CORRECTED_REVISION` | Correction severity, affected claims, replacement text/data, and historical link are approved |
| `CORRECTED_REVISION → PUBLISHED_CORRECTED` | Exact corrected hash approved; notice and bidirectional links verified |
| `TAKEDOWN_REVIEW → WITHDRAWN` | Authorized Publisher/legal decision or emergency safety authority; evidence preserved |
| `RESTORE_REVIEW → APPROVED_REVISION` | All original blockers resolved; full approval rerun; new immutable hash |

## Legal-review triggers

Mandatory legal review is triggered by personalized-finance risk; yield/safety claims; unclear data or media license; participant consent; privacy/personal data; defamation or disputed allegation; embargo or confidential material; court/order interpretation; takedown request; regulated product description; sanctions concerns; or any jurisdiction beyond the approved publication scope.

## Correction severity

| Severity | Example | Target response | Required authority |
|---|---|---|---|
| C1 Critical | Wrong entity/asset/holding, material legal status, fabricated/compromised source, privacy/safety harm | Immediate publication stop or prominent notice; urgent review | Publisher + Security/Legal as applicable |
| C2 Major | Material number, classification, attribution, or interpretation | Prompt correction with visible notice | Publisher + Editor/Fact Checker |
| C3 Minor | Non-material typo, formatting, link repair not changing claim | Logged correction or maintenance revision per policy | Editor; Publisher rules determine notice |

No correction silently overwrites an approved public revision.

## Emergency controls

- Publication kill switch prevents new releases without disabling public access to the last approved safe revision.
- Ingestion kill switch stops source collection without altering approved public content.
- A C1 event may place an immediate safety notice or temporary withdrawal under preapproved emergency authority, followed by formal review.
- Emergency action preserves evidence, notifies the Founder and named owners, and cannot restore publication automatically.

## Acceptance criteria

- An agent/developer cannot transition to `APPROVED_REVISION`, `SCHEDULED`, `PUBLISHED`, `CORRECTED_REVISION`, `PUBLISHED_CORRECTED`, `WITHDRAWN`, or restored states.
- A revision hash change invalidates prior approval.
- Quarantined and rejected material cannot appear in public API/UI responses.
- Every public record maps to one approved revision and release event.
- Every correction is bidirectionally linked and the original record remains auditable.
- Consent withdrawal and legally approved takedown paths are testable.
- State/error/correction notices meet accessibility requirements.
- Kill switches operate independently and are audited.
- No state transition implies production release authorization beyond the specific approved publication artifact.

## Required human decisions

1. Approve the state names, transition guards, and correction severities.
2. Name Publisher backup, Editorial Lead, Fact Checker, Legal Reviewer, Release Operator, and Security Lead.
3. Approve temporary separation-of-duties compensating controls, if needed.
4. Approve legal-review triggers and emergency authority.
5. Authorize implementation of this workflow only after M1–M3 and separate implementation approval.
