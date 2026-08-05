# ADR-0004: Versioned Read-Only Public API

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed |
| Owner | API Lead |
| Related Volume | Engineering Program |
| Related Chapter | API Architecture |
| Dependencies | ADR-0002; ADR-0003 |
| Approval Status | Pending Amardeep Baba G Malhotra Approval |

## Problem

The web experience needs stable data contracts without exposing mutation, custody, payment, or administrative capabilities.

## Options considered

1. Server-render all data without an explicit API contract.
2. Public GraphQL.
3. Versioned REST-style JSON endpoints for approved read models, with administrative writes isolated from public routing.

## Decision

Choose option 3 for the MVP. Publish only `GET` and `HEAD` endpoints under `/api/v1`; keep ingestion and editorial mutations private and separately authorized.

## Reasoning

The surface is simple to document, cache, test, rate-limit, and audit.

## Benefits

Predictable contracts, safe caching, low client complexity, and explicit versioning.

## Tradeoffs

Less flexible querying and possible endpoint growth.

## Future Review Date

2027-02-05.
