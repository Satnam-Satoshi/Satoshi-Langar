# SSCOS Database and API Design

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | Data Lead and API Lead |
| Related Volume | Engineering Program |
| Related Chapter | Data and API Architecture |
| Dependencies | ADR-0003; ADR-0004 |
| Approval Status | Pending Human Founder Approval |

## Logical database model

| Table | Purpose | Key relationships |
|---|---|---|
| `sources` | Approved source identity, terms, method, cadence, status | one-to-many `source_fetches` |
| `source_fetches` | Immutable retrieval event, timestamp, hash, parser, result | source; observations |
| `entities` | Canonical organizations, governments, products, networks | aliases; observations |
| `entity_aliases` | Source-specific names mapped to entities | entity |
| `assets` | BTC, LTC, XLM and approved identifiers | observations |
| `observations` | Immutable sourced facts or measurements | source fetch, entity, asset |
| `claims` | Human-readable fact, estimate, or interpretation | claim sources; publications |
| `claim_sources` | Many-to-many source support with relevance | claim; source/fetch |
| `treasury_snapshots` | Time-bounded beneficial-holding observations | entity, asset, observation |
| `publications` | Langar edition or conversation record | revisions; claims |
| `publication_revisions` | Immutable approved content version | publication; approval |
| `publication_claims` | Ordered claims within a revision | revision; claim |
| `conversations` | LTC metadata, guests, transcript status, media link | publication/revision |
| `corrections` | Append-only correction linked to prior record | claim or revision |
| `approval_events` | Human editorial and release decisions | actor; target revision |
| `audit_events` | Security and operational events without sensitive payloads | actor, request/job/release |

Every quantitative or material observation requires `observed_at`, `retrieved_at`, `source_id`, `source_fetch_id`, `parser_version`, `confidence`, `verification_status`, and content hash where permitted. Monetary values use fixed-precision numeric plus currency; asset amounts use sufficient fixed precision and never floating point. All timestamps are UTC with display timezone explicit.

## Integrity and lifecycle

- Immutable observations, fetches, approved revisions, approvals, and corrections.
- Soft retirement for sources and entities; no silent deletion of published evidence.
- Row-level security denies anonymous table access; public reads use curated views or server endpoints.
- Migrations are forward-reviewed, reversible where practical, tested against sanitized fixtures, and backed up before production application.
- Personal data is excluded from MVP unless necessary for public speaker/byline identity and approved editorial use.

## Public API

Base path: `/api/v1`. JSON uses UTF-8, ISO-8601 timestamps, stable string IDs, explicit `data_freshness`, `sources`, and `corrections` links where material.

| Method and path | Purpose | Primary response |
|---|---|---|
| `GET /health` | Bounded public service health | status and version only |
| `GET /treasury/entities` | Paginated entity directory | entity summaries and latest verified snapshot |
| `GET /treasury/entities/{id}` | Entity profile | holdings history, provenance, confidence |
| `GET /treasury/changes` | Recent verified changes | change records, filters, sources |
| `GET /conversations` | Approved LTC archive | metadata, guests, date, media/transcript availability |
| `GET /conversations/{slug}` | Approved conversation | metadata and approved transcript/body |
| `GET /langar/editions` | Published brief archive | edition summaries and correction state |
| `GET /langar/editions/{date}` | One approved edition | sections, claims, sources, confidence |
| `GET /sources/{id}` | Public source methodology | title, authority, retrieval policy, status |

No public mutation endpoints exist in the MVP. Admin, ingestion, approval, correction, and release operations remain private, authenticated, separately routed, fully audited, and out of public API documentation.

## Contract rules

Cursor pagination; bounded page sizes; allowlisted filters; deterministic sorting; ETags; documented cache controls; `429` with retry guidance; problem-details error bodies; request correlation IDs; no stack traces or secrets. Breaking changes require `/api/v2`; additive fields are backward compatible. OpenAPI is canonical and contract tests block incompatible changes.

## Success criteria

Representative fixtures prove provenance from source fetch through observation and claim to publication; corrections remain linked; API responses expose freshness and sources; anonymous access cannot query base tables or mutate state; and the four surfaces need no undocumented endpoint.
