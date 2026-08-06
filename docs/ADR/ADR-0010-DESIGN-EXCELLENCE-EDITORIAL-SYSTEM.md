# ADR-0010 — Trust-First Editorial Product System

| Field | Value |
|---|---|
| Version | 1.0 |
| Revision date | 2026-08-06 |
| Status | Accepted for Version 1 preview |
| Owner | Office of Product and Design |
| Related deliverable | Satnam.x Version 1 |
| Dependencies | Design system, accessibility standard, evidence model |
| Approval status | Implementation authorized; public release pending Founder approval |

## Problem

The homepage established a calm institutional identity, but secondary pages used repeated card grids and preparation language. The result communicated architecture more strongly than public value and created an uneven experience across Satnam.x.

## Options considered

1. Continue extending the existing card-grid system.
2. Adopt a dense dashboard pattern resembling financial terminals.
3. Establish a reusable editorial system combining large questions, visible evidence states, restrained data surfaces, and progressive disclosure.

## Decision

Adopt the editorial system. Product pages will use numbered narrative chapters, large typographic questions, bounded evidence components, explicit readiness states, and minimal high-signal calls to action. Dense data views may appear only after verified data is available.

## Reasoning

Public trust depends on understanding what a system knows, how it knows it, and what remains unverified. A restrained editorial hierarchy supports this better than either promotional cards or premature terminal density.

## Benefits

- Consistent institutional character across products.
- Clear separation between verified evidence and future capability.
- Better mobile reading order and accessibility.
- Reusable primitives for confidence, provenance, readiness, and corrections.
- Space for future datasets without fabricating present-day activity.

## Tradeoffs

- Less information is visible above the fold.
- Data density is deferred until ingestion and reconciliation are operational.
- Each product requires careful editorial sequencing rather than template duplication.

## Future review date

Review after the Treasury Intelligence data pipeline and first publication dataset are verified, or before Version 1 Founder acceptance—whichever comes first.
