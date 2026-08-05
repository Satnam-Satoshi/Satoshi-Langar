# Satnam Satoshi Product Trust Architecture

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Product Architecture Improvement |
| Accountable Office | Office of the CTO |
| Related Product Organizations | All public products; Open API; Developer Platform |
| Dependencies | ADR-0003; ADR-0004; Logical Data Constraints v0.1; Publication State Machine v0.1; OpenAPI v1 Draft |
| Approval Status | Pending architecture and product review; no implementation authority |

## Outcome

Create one reusable trust layer that turns provenance, freshness, confidence, classification, approval, and correction data into consistent public product behavior. This prevents every product from inventing its own trust language and makes public beta readiness measurable.

## Product questions answered

- **Public experience:** users can evaluate material claims without leaving their context.
- **Trust:** evidence and limitations are visible before action or interpretation.
- **Transparency:** each displayed state maps to canonical data and policy.
- **Treasury Intelligence:** ownership, custody, estimate, seized, and strategic-reserve classifications remain explicit.
- **Proof of Seva:** future contribution evidence can use the same provenance and human-verification pattern without implying financial value.
- **Community participation:** contributors receive stable contracts for evidence-bearing content.
- **Operations:** one shared implementation and acceptance model replaces product-specific trust logic.

## Architecture

```text
Canonical source/fetch/observation/claim records
                 │
                 ▼
       Trust Projection Service
  ┌──────────┬───────────┬────────────┐
  │freshness │ confidence│classification│
  │evidence  │ correction│approval      │
  └──────────┴───────────┴────────────┘
                 │
        versioned TrustEnvelope
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
 Public API   Web UI     Media/export
     │           │           │
 contract     shared       citation &
 validation  components    correction blocks
```

The projection is read-only. It does not approve claims, modify source records, publish, correct, or deploy.

## Canonical `TrustEnvelope`

| Field | Purpose | Required behavior |
|---|---|---|
| `subject_id` | Stable referenced claim/observation/publication | Opaque, immutable identity |
| `subject_type` | Claim, treasury snapshot, edition, conversation, contribution | Governed enumeration |
| `effective_at` | When the claim/value applies | UTC plus source timezone/cutoff where material |
| `retrieved_at` | When supporting evidence was obtained | Never substituted for effective time |
| `freshness` | Current, stale, or source unavailable | Text label and approved explanation |
| `verification_status` | Verified, provisional, estimated | Quarantined/rejected never public |
| `confidence` | A–D with governed meaning | Never color-only; Q never public |
| `classification` | Domain-specific meaning | Treasury classification mandatory for holdings |
| `sources` | Qualifying evidence links | At least one for material public claims |
| `correction_state` | None, corrected, withdrawn/tombstone | Links bidirectionally to public notice where applicable |
| `approved_revision` | Exact public content hash/version | A changed hash invalidates release approval |
| `methodology_ref` | Definition/calculation/cutoff policy | Contextual link, versioned |
| `generated_at` | Projection time | Not presented as evidence effective time |

## Shared product components

| Component | Public responsibility | Products |
|---|---|---|
| Trust summary line | State effective time, evidence state, classification, and source count | Treasury, Langar, newspaper, API examples |
| Evidence drawer | Show source titles, authority, published/retrieved times, and support role | Treasury, Langar, conversations, Proof of Seva |
| Freshness banner | Explain stale/source-unavailable state without hiding last verified data | Treasury, Langar, API docs |
| Classification explainer | Distinguish beneficial ownership, custody, seized, reserve, and estimate | Treasury |
| Confidence definition | Provide stable plain-language meaning and methodology | All evidence-bearing products |
| Correction marker | Link current representation to correction and prior version | Treasury, conversations, newspaper, Langar |
| Methodology link | Keep calculation and inclusion rules one action away | Treasury, Open API, Developer Platform |
| Trust receipt | Portable citation/evidence summary for future verified contribution | Proof of Seva, Developer Platform |

## Product-specific projections

- **Treasury Intelligence:** `TrustEnvelope` attaches to every snapshot and change; classification and effective date are mandatory.
- **Lunch Time Conversations:** envelope covers approved revision, participant/media rights state, transcript availability, and corrections; private rights evidence is excluded.
- **Daily Newspaper / Satoshi Langar:** each material claim exposes category, source links, as-of time, confidence, and correction state.
- **Satnam.x:** highlights inherit envelopes from source products rather than copying content into an independent trust state.
- **Open API / Developer Platform:** schemas, examples, cache/ETag behavior, and error states expose the same fields and definitions.
- **Proof of Seva:** future service claims may use identity-minimized evidence and human verification; this architecture does not establish rewards, identity, or launch authority.

## Failure behavior

| Condition | Public behavior |
|---|---|
| Missing qualifying evidence | Do not publish the material claim |
| Stale | Show last verified value only if policy permits, with timestamp and warning |
| Source unavailable | Preserve prior evidence state; disclose unavailability; never silently substitute weaker evidence |
| Conflicting primary sources | Quarantine; do not average or select the convenient value |
| Corrected | Show current corrected value and persistent correction link |
| Withdrawn | Show approved tombstone; do not leak restricted rationale |
| Unknown enum/state | Fail closed; do not coerce to verified/current |

## Interfaces and versioning

- OpenAPI schemas are canonical for public representation.
- UI components accept `TrustEnvelope` rather than unstructured labels.
- Media/export templates receive an approved bounded projection, never raw internal evidence.
- Additive compatible fields advance the envelope minor version; meaning/state changes require a new major version and ADR review.
- Product analytics must not infer trust from clicks or engagement.

## Acceptance criteria

- One synthetic evidence chain renders consistently in Treasury, Langar, API, and media contexts.
- Effective, retrieved, and generated times cannot be confused.
- Status meaning survives keyboard, screen-reader, grayscale, narrow-width, and export/PDF contexts.
- A changed revision hash cannot reuse approval.
- Missing/conflicting/quarantined evidence never renders as verified.
- Product teams cannot introduce new trust terms without updating the governed enumeration and tests.
- Naming remains public-facing Satnam Satoshi; SSCOS appears only in appropriate governance/engineering contexts.

## Implementation boundary

This architecture prepares shared contracts and component behavior. Code, schema changes, migrations, live data, external sources, deployment, publication, and production remain subject to their explicit authorization gates.

