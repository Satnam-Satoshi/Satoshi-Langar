# ADR-0003: Provenance-First PostgreSQL Data Model

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed |
| Owner | Data Lead |
| Related Volume | Engineering Program |
| Related Chapter | Data Architecture |
| Dependencies | ADR-0001; ADR-0002 |
| Approval Status | Pending Amardeep Baba G Malhotra Approval |

## Problem

Treasury and editorial claims must remain traceable, correctable, and reproducible.

## Options considered

1. Store rendered pages only.
2. Use a document database for all content.
3. Use normalized PostgreSQL records with immutable observations, source links, claim mappings, revisions, and append-only corrections.

## Decision

Choose option 3. Publications reference claims; claims reference one or more sources and observations. Corrections append new records and never erase the historical publication record.

## Reasoning

Relational constraints and explicit provenance directly support SSCOS truth, audit, and correction duties.

## Benefits

Traceability, reproducibility, consistent APIs, and safer editorial correction.

## Tradeoffs

Higher modeling discipline and more joins than page-oriented storage.

## Future Review Date

2027-02-05.
