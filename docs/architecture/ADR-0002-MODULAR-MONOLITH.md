# ADR-0002: Modular Monolith for the MVP

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed |
| Owner | CTO |
| Related Volume | Engineering Program |
| Related Chapter | Application Architecture |
| Dependencies | ADR-0001 |
| Approval Status | Pending Amardeep Baba G Malhotra Approval |

## Problem

The MVP needs clear product boundaries without the operational burden of multiple distributed services.

## Options considered

1. Microservices per public surface.
2. Independent websites and repositories.
3. One modular Next.js application with enforced domain boundaries and one PostgreSQL service.

## Decision

Choose option 3. Use one deployable web application, domain modules for the four surfaces, a shared read-only public API boundary, background ingestion jobs, and PostgreSQL. Keep module interfaces extractable.

## Reasoning

The team can ship and operate one coherent release while avoiding duplicated governance, authentication, design, and deployment systems.

## Benefits

Lower operating cost, simpler releases, atomic schema changes, shared accessibility and design controls.

## Tradeoffs

Module discipline is essential; scaling and fault isolation are coarser than microservices.

## Future Review Date

2027-02-05 or when independently scaling a module is evidence-backed.
