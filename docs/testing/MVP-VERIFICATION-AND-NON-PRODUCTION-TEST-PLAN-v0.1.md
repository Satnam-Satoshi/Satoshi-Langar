# SSCOS MVP Verification and Non-Production Test Plan

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed Test Specification — No Test Execution Authorized |
| Owner | QA Lead |
| Related Volume | Engineering Program |
| Related Chapter | ENG-016 / GI-06 — M3 and Implementation Readiness |
| Dependencies | Engineering Program v0.1; Repository Specification v0.1; Experience Architecture v0.1; OpenAPI v1 Draft; Threat Model v0.1; Fixture Catalog v0.1; Publication State Machine v0.1; Logical Data Constraints v0.1 |
| Approval Status | Pending Human Founder, QA, Product, Security, Data, Editorial, Accessibility, and Legal Approval |

## Deliverable mapping

This plan defines the evidence required to accept the four-surface MVP and its shared platform. It contains no test code, external scanning authorization, production target, credential, or live data. Initial execution is restricted to an explicitly authorized local or preview environment using synthetic fixtures.

## Test principles

- Requirements, risks, contracts, and controls each map to named tests and evidence.
- Test both required outcomes and prohibited capabilities.
- Synthetic, deterministic fixtures are the default; real content requires rights/privacy approval.
- The test environment must be isolated from production identities, data, domains, and write authority.
- A passing average cannot offset a release-blocking failure.
- Flaky tests are failures until quarantined through a time-bounded, owned exception; release gates cannot depend on quarantined coverage.
- Human editorial, legal, accessibility, security, rollback, and Founder decisions cannot be replaced by automated scores.

## Verification layers

| Layer | Purpose | Required evidence | Owner |
|---|---|---|---|
| Static | Format, types, lint, secret/config/SAST checks | Machine report tied to commit | Engineering + Security |
| Unit/property | Domain rules, precision, time, states, normalization | Deterministic results and coverage of boundaries | Module owners |
| Contract | OpenAPI/schema/error/pagination/cache compatibility | Contract report; mutation verbs denied | API + Data |
| Data/policy | Constraints, RLS/access, append-only evidence, migrations | Positive/negative policy tests; forward/repair evidence | Data + Security |
| Integration | Module interfaces, jobs, audit, error/degraded behavior | Synthetic end-to-end trace and failure injection | Engineering + QA |
| UI/component | Semantics, states, tokens, keyboard and screen reader behavior | Component evidence and manual checks | Design + Accessibility |
| Browser E2E | Four-surface journeys across supported viewports | Screenshots/logs/video where useful | QA |
| Security/abuse | Authorization, injection, XSS, SSRF, limits, supply chain | Threat-control matrix and findings | Security |
| Performance/resilience | Budgets, rate limits, stale/outage, recovery | Repeatable workload/config and measurements | Platform + QA |
| Editorial/release | Approval hash, correction, takedown, rollback | Signed rehearsal record | Editorial + Platform + Founder |

## Four-surface acceptance matrix

| Surface | P0 journey | Required states | Success criteria |
|---|---|---|---|
| Satnam.x | Visitor understands mission and reaches each MVP surface | normal, empty highlight, partial outage, legal/footer, 404 | Four surfaces discoverable by keyboard and assistive technology; no fifth product, account, payment, wallet, trade, or personalized-advice path |
| Treasury Intelligence | Visitor lists entities, filters, opens profile/history, and inspects evidence | verified, provisional/estimated, stale, corrected, unavailable, empty, invalid filter | Values retain exact amount/unit/asset/classification/as-of/freshness; ownership classes do not double count; every material item exposes qualifying sources and disclaimer |
| Lunch Time Conversations | Visitor browses/searches archive and opens an approved entry | transcript/media available/unavailable, rights-limited, corrected, withdrawn/tombstone, empty search | Only approved revision is visible; participants/date/media/transcript/rights state are accurate; correction and takedown behavior matches policy |
| Satoshi Langar | Visitor reads latest brief, archive, and a dated issue | current, stale source, corrected claim, delayed/missing issue, withdrawn | Every material claim has category, evidence, freshness/confidence where applicable; no unapproved draft or silent correction appears |

## Shared mandatory scenarios

1. Navigate all pages at 320 px and wider, 200% zoom, keyboard-only, and representative screen-reader flows.
2. Validate headings, landmarks, names/roles/values, focus order/visibility, error association, contrast, reduced motion, media alternatives, and no color-only meaning against WCAG 2.2 AA.
3. Prove anonymous and agent identities cannot mutate public, editorial, approval, release, policy, or credential state.
4. Prove every public material claim traverses source → fetch → observation → claim → sealed revision → human approval → released read model.
5. Change a sealed revision hash and verify prior approval becomes unusable.
6. Execute C1/C2/C3 correction, withdrawal, takedown, and restoration scenarios with append-only history.
7. Inject stale, conflicting, malformed, duplicated, oversized, prompt-injected, redirected, unavailable, and schema-drift source fixtures; verify quarantine or explicit degraded state.
8. Verify safe errors contain correlation identifiers but no secrets, stack traces, private drafts, internal IDs, or vendor topology.
9. Inventory routes, methods, capabilities, dependencies, and outbound domains; reject mutation routes, unapproved sources, Phase 2 surfaces, telemetry, wallets, payments, custody, trading, and accounts.
10. Verify logs/audit evidence are complete, redacted, ordered, attributable, and resistant to ordinary application mutation.

## API and data acceptance

- OpenAPI parses and every documented example validates against its schema.
- Route inventory equals the approved contract; only bounded `GET`/`HEAD` public operations exist.
- Invalid cursors, filters, identifiers, encodings, sizes, and content negotiation fail safely and consistently.
- Deterministic cursor ordering has no duplicate/omitted items during fixed-fixture pagination.
- Decimal strings, precision, units, currencies, classifications, UTC/source time, and cutoff rules survive round trips exactly.
- Anonymous base-table reads and all public writes are denied.
- Append-only records reject update/delete; corrections create linked new records.
- Migration verification proves forward application, compatibility, idempotence where required, and a documented rollback/forward-repair path on a disposable database.
- Public read models contain released fields only and exclude raw fetches, rights evidence, private drafts, prompts, findings, credentials, and security metadata.

## Security acceptance

Every Critical threat in the threat model requires a passing control test and named human owner. Confirmed unauthorized write, secret/private-data disclosure, publication without exact human approval, production/preview credential crossover, headline-value integrity error, destructive correction, unapproved outbound domain, or Phase 2 capability is an unconditional release blocker.

External penetration testing, scans against vendor or public endpoints, denial-of-service testing, and production security testing require separate written authorization identifying targets, windows, limits, contacts, and stop conditions.

## Performance and reliability budgets

Proposed release thresholds, subject to approved workload and environment:

| Measure | Threshold |
|---|---|
| Cached public page response | p95 under 1 second at edge-equivalent test point |
| Uncached API response | p95 under 800 ms under agreed representative load |
| Layout stability | No material unexpected shift in critical journeys; numeric budget approved before execution |
| Availability design | Evidence supports 99.9% monthly public-read objective |
| Recovery | Staging-equivalent RPO ≤24h and RTO ≤4h demonstrated |
| Accessibility | Zero known WCAG 2.2 A/AA failures in MVP journeys |
| Security | Zero unresolved critical/high release-blocking findings; exceptions explicit and unexpired |
| Provenance | 100% material public claims linked to qualifying evidence |

## Browser and device scope

Before execution, Product and QA must approve supported versions for current evergreen Chrome, Safari, Firefox, and Edge; iOS Safari and Android Chrome; keyboard-only navigation; and at least one screen-reader/browser combination on macOS and one on Windows or mobile. Unsupported behavior must degrade safely and remain readable.

## Test data and environments

- Local and preview use synthetic fixtures only unless a rights-approved bounded fixture is explicitly listed.
- No production identifier, credential, domain, account, analytics destination, or write-capable integration is reachable.
- Each run records commit, contract/schema/fixture versions, environment fingerprint, tool versions, seed, start/end time, actor, and result.
- Test artifacts must not contain secrets, personal data, prohibited source content, or unnecessarily persistent browser/media captures.
- Clock, network failure, source availability, and rate limits are controllable for deterministic failure tests.

## Entry criteria for first test implementation

- M0–M3 relevant specifications approved.
- GI-01–GI-08 authorization gate satisfied for the exact test increment.
- Named QA, Security, Data, Accessibility, Product, Editorial, Platform, and Legal reviewers or approved compensating controls.
- Exact tools/versions/licenses and non-production environment approved.
- Test IDs, requirements, fixtures, commands, evidence paths, thresholds, timeout/resource budgets, and stop conditions recorded.
- No external or production target included.

## Exit and release criteria

- Every P0 test passes on the release candidate; no unexplained skip, flake, or retry-only pass.
- All four surface journeys and prohibited-capability tests pass.
- Critical threat and provenance-control coverage is complete.
- Accessibility manual and automated reviews pass.
- Performance/recovery thresholds pass in an approved representative environment.
- Editorial correction/takedown and platform rollback rehearsals are signed.
- Findings and exceptions have owners, dispositions, expiries, and Founder acceptance where required.
- Evidence is bound to the exact commit, artifact, schemas, contracts, content revision, environment, and approvers.
- Founder records a separate release go/no-go; test success alone cannot publish or deploy.

## Required human decisions

1. Name reviewers and approve supported browsers/assistive technologies.
2. Approve exact tools, versions, thresholds, environments, data/fixture rights, and evidence retention.
3. Approve external-testing boundaries separately, if later required.
4. Authorize test implementation and execution only through the bounded implementation gate.

