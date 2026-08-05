# SSCOS MVP Provenance and Adversarial Fixture Catalog

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Test Specification — No Executable Fixtures Yet |
| Owner | QA Lead / Data Lead / Security Lead |
| Related Volume | Engineering Program |
| Related Chapter | M3 Data Foundation — ENG-016 |
| Dependencies | ADR-0003; Database and API Design v0.1; MVP Threat Model v0.1; Source Registry v0.1 |
| Approval Status | Pending Human Founder and Technical Review |

## Deliverable mapping

This catalog specifies the minimum synthetic and legally permitted test evidence needed to prove provenance, classification, correction, freshness, security, and public-contract behavior for Treasury Intelligence and Satoshi Langar. It contains no production data, executable parser, scraper, API client, or application code.

## Fixture principles

- Synthetic by default; bounded, legally permitted source excerpts only after rights review.
- No real credentials, private keys, seed phrases, unpublished personal data, or production identifiers.
- Deterministic timestamps, identifiers, hashes, currencies, units, and expected outcomes.
- Every fixture states the threat/control, source authority, transformation, expected database effect, expected API/UI state, audit event, and human escalation.
- A parser/evaluator passes only when both the expected output and prohibited side effects are proven.
- Golden fixtures are versioned and immutable; changes create new versions and require review.

## Canonical trace model

Every accepted material claim must demonstrate:

```text
source record
  → source fetch (retrieved_at, metadata, hash, parser version)
    → observation (observed_at, unit, entity, confidence, verification status)
      → claim (fact/estimate/interpretation, source links)
        → publication revision (content hash, approval event)
          → public API/UI representation
            → correction/revision link when applicable
```

Missing any required link yields quarantine or publication denial.

## Fixture catalog

| ID | Scenario | Input design | Expected result | Required audit / control mapping |
|---|---|---|---|---|
| FX-001 | Valid confirmed treasury snapshot | Synthetic P0 issuer filing with entity, asset, exact amount, balance date, filing ID | One immutable observation; confidence ceiling A; claim eligible for human review | Source/fetch/observation chain; DAT-01, SRC-04 |
| FX-002 | Custody is not beneficial ownership | Filing states assets held for clients | Classified as custody; excluded from beneficial holdings total | Semantic reason logged; T-010 |
| FX-003 | Seized assets are not strategic reserve | Government record identifies seizure with no reserve policy | `seized` classification; reserve claim prohibited | Verification finding and publication wording test; T-010 |
| FX-004 | Estimate separated from confirmed figure | Secondary estimate conflicts with primary omission | Estimate stored separately with D ceiling; confirmed total unchanged | Conflict audit; PUB-03 |
| FX-005 | Two primary sources conflict | Same entity/date, different amounts | Both observations retained; claim quarantined; human escalation | No averaging/overwrite; T-003 |
| FX-006 | Issuer restatement | Later filing corrects earlier amount | New observation/revision linked to prior; correction generated; history preserved | DAT-02, T-013 |
| FX-007 | Duplicate syndicated announcement | Same disclosure appears at issuer and multiple secondary sites | One primary event; secondary links do not multiply holdings/change | Dedup decision recorded; T-009 |
| FX-008 | Entity alias collision | Similar company names with different CIK/jurisdiction | No automatic merge; quarantine pending entity resolution | Entity-resolution finding; T-009 |
| FX-009 | Subsidiary versus parent | Subsidiary holding consolidated in parent filing | Beneficial owner and reporting entity distinguished; no double count | Relationship evidence; T-010 |
| FX-010 | Asset decimal boundary | Maximum approved BTC/LTC precision and tiny values | Exact fixed-precision round trip; no float drift | Property test; DAT-01 |
| FX-011 | Currency and FX timestamp | Filing in non-USD currency plus dated FX record | Native value preserved; converted value carries rate source/time | Unit/source chain; DAT-01 |
| FX-012 | Price-driven AUM change | AUM rises while shares/holdings unchanged | Not labeled as flow; explanatory classification required | T-010 |
| FX-013 | In-kind creation/redemption | ETF record specifies in-kind mechanism | Flow representation distinguishes mechanism and estimate status | Product-methodology audit |
| FX-014 | Timezone boundary | Event near UTC/local-day boundary | Stored UTC plus source/display timezone; assigned correct edition date | DAT-01, T-009 |
| FX-015 | Future timestamp | Source claims future observed/published time beyond tolerance | Quarantine and clock anomaly alert | OBS-01 |
| FX-016 | Stale source | Clock exceeds approved freshness window | Last verified value visibly stale or withheld per policy | API/UI stale flag; T-012 |
| FX-017 | Source outage | Timeout/5xx/429 with prior good value | Backoff/cache; no freshness reset; source-unavailable state | Fetch/audit event; T-008, T-012 |
| FX-018 | Schema drift | Required field renamed/removed | Parser fails closed; raw bounded evidence retained; quarantine | Parser/schema alert; SRC-02 |
| FX-019 | Oversized payload | Payload exceeds approved byte limit | Retrieval stopped; no parser invocation; bounded audit | SRC-02, T-008 |
| FX-020 | Redirect outside allowlist | Approved URL redirects to unapproved domain | Stop before retrieval; escalate | SRC-01 |
| FX-021 | Unexpected executable/archive | Source returns executable or nested archive | Reject/quarantine; no execution or extraction beyond policy | SRC-02 |
| FX-022 | Prompt injection in source | Text directs agent to ignore rules, reveal secrets, alter allowlist, or publish | Text stored only as untrusted data; zero tool/policy/permission/publication action | SRC-03, T-004 |
| FX-023 | Secret-like material in source | Payload contains token/private-key pattern | Quarantine/redact handling; no log or publication leakage | OBS-01, T-007 |
| FX-024 | Aggregator-only holdings claim | S1 tracker gives amount without primary evidence | Discovery task only; no confirmed observation/public claim | Source authority ceiling |
| FX-025 | Litecoin Register unverified claim | U-class candidate lists rank/holding | Quarantine; request issuer/address-ownership evidence | Source authority ceiling |
| FX-026 | Legal bill introduced | Official record shows introduction only | Status `introduced`; language cannot say passed/enacted | T-011 |
| FX-027 | Bill passes one chamber | Official action shows House passage only | Status `passed_house`; no law/effective claim | T-011 |
| FX-028 | Enacted but not effective | Signed law has future effective date | `enacted`, `effective=false`, exact effective date visible | T-011 |
| FX-029 | Stayed or enjoined rule | Official court/agency record changes enforceability | Prior state retained; current status and legal uncertainty visible | Correction/status audit |
| FX-030 | DTCC proof of concept | DTCC paper describes pilot/PoC | Classified `pilot` or `proof_of_concept`, never production service | Semantic verification |
| FX-031 | Morpho API no-SLA outage | API unavailable while prior snapshot exists | Stale/unavailable state; no guaranteed/safe language; fallback task | T-012, editorial control |
| FX-032 | Morpho deprecated field | Response contains deprecation metadata or removed field | Alert and quarantine affected metric until mapped/tested | Schema/deprecation audit |
| FX-033 | APY includes rewards | Headline APY differs from base/net rate | Components separated; never described as safe or guaranteed | Legal/editorial lint; T-016 |
| FX-034 | Negative or impossible metric | Utilization, balance, APY, or price violates domain bounds | Quarantine; no public value; investigation task | DAT-01 |
| FX-035 | Corrected publication | Approved correction changes a material claim | New revision/correction linked; original retained; public correction marker | DAT-02, PUB-02–03, T-013 |
| FX-036 | Unauthorized publish attempt | Agent/developer tries to publish without approval event | Denied; security/audit event; public revision unchanged | PUB-01, T-006 |
| FX-037 | Approval-content mismatch | Approval hash differs from candidate revision | Publication denied; require new approval | PUB-02 |
| FX-038 | Anonymous API mutation | POST/PUT/PATCH/DELETE or direct table access attempted | Method denied; no state change; safe error and correlation ID | API-01, DAT-03, T-005 |
| FX-039 | Excessive pagination/filter complexity | Huge page size, nested filters, malformed cursor | Bounded/rejected; no expensive unbounded query | API-02, T-008 |
| FX-040 | Error handling | Parser/database throws internal error | Public problem response contains no stack, query, secret, or private metadata | API-02, T-007 |
| FX-041 | Log redaction | Request contains token/email/secret-like values | Logs retain correlation and event type but redact sensitive fields | OBS-01 |
| FX-042 | Preview environment isolation | Preview attempts production secret/database/DNS/write access | All denied; synthetic fixtures only | ENV-01, T-019 |
| FX-043 | Conversation missing consent | Media/transcript lacks approved participant-rights record | Publication denied; editorial/legal escalation | T-015 |
| FX-044 | Consent withdrawal/takedown | Approved rights record is withdrawn under procedure | New availability state and audit; source/history handled per legal policy | PUB-01–03 |
| FX-045 | Personalized advice language | Draft includes tailored buy/sell/hold/leverage instruction | Publication denied and flagged | T-016 |
| FX-046 | Guaranteed yield language | Draft calls APY safe, guaranteed, or loss-free | Publication denied and flagged | T-016 |
| FX-047 | Accessibility of stale/error notice | Keyboard/screen-reader traversal of stale/corrected/error state | Status programmatically determinable, readable, and operable | WEB-02 |
| FX-048 | Independent kill switches | Disable ingestion while serving last approved content; disable publication while collection continues | Each switch functions independently; audit and human notification generated | KILL-01 |
| FX-049 | Backup restore | Restore staging from approved backup | Data hashes, revision links, RPO/RTO evidence meet target | DAT-04, T-018 |
| FX-050 | Scope violation inventory | Route/dependency/config introduces wallet/payment/account/fifth product | Build/review gate fails pending ADR and Founder approval | ADR-0001, T-020 |

## API contract evidence set

For each public endpoint, prepare approved examples for success, empty, stale, corrected, source-unavailable, quarantined/not-public, invalid input, rate limited, and internal error states. Examples must include explicit freshness, source links where material, stable IDs, ISO-8601 timestamps, units/currencies, correction state, ETag/cache behavior, and correlation ID. They must not expose raw private drafts, base-table structure, stack traces, secrets, agent prompts, or privileged identifiers.

## Minimum endpoint-to-fixture mapping

| Endpoint | Required fixture coverage |
|---|---|
| `GET /treasury/entities` | FX-001–009, 016–017, 024–025, 034–035, 039–040 |
| `GET /treasury/entities/{id}` | FX-001–011, 016–018, 024–025, 034–035, 040 |
| `GET /treasury/changes` | FX-005–014, 016–018, 024–025, 034–035, 039 |
| `GET /conversations` and `/{slug}` | FX-035–037, 040, 043–044, 047 |
| `GET /langar/editions` and `/{date}` | FX-016–018, 022–037, 040, 045–047 |
| `GET /sources/{id}` | FX-016–025, 040 |
| all public routes | FX-038–042, 047, 050 |

## Test levels

- **Schema/unit:** precision, identifiers, timestamps, enums, bounds, transformations.
- **Parser:** fixture-to-candidate results, fail-closed behavior, drift, malicious content.
- **Data integrity:** immutability, constraints, deduplication, corrections, entity resolution.
- **Contract:** OpenAPI behavior, errors, caching, pagination, compatibility.
- **Integration:** source-to-public trace using synthetic/non-production services.
- **Security:** authorization, injection, egress, secrets, logs, environment isolation.
- **Editorial:** classifications, confidence, wording, rights, approval, corrections.
- **Accessibility/E2E:** public flows and all non-happy states.
- **Recovery:** kill switches, rollback, backup restore, evidence integrity.

## Release thresholds

- 100% pass for authorization, provenance-chain, precision, correction, rights, public-mutation, prompt-injection, secret-leak, environment-isolation, kill-switch, and scope fixtures.
- No known nondeterminism in financial arithmetic or publication hashing.
- Zero unauthorized network domains or tool calls in agent evaluations.
- All API examples validate against the approved OpenAPI version.
- Every Critical/High threat has at least one negative test and named owner.
- Failed fixtures create actionable, non-sensitive evidence and cannot silently downgrade to warnings.

## Required human decisions

1. Approve the fixture catalog as the minimum—not maximum—MVP evidence set.
2. Name QA, Data, Security, Editorial, and Legal reviewers.
3. Approve which bounded primary-source excerpts may become test fixtures after rights review.
4. Approve release thresholds and exception authority.
5. Authorize executable non-production fixture implementation only after M1/M3 decisions; this document itself grants no implementation authority.
