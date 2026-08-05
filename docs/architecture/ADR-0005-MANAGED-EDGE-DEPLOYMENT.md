# ADR-0005: Managed Edge and Database Deployment

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Proposed |
| Owner | Platform Lead |
| Related Volume | Engineering Program |
| Related Chapter | DevOps and Deployment |
| Dependencies | ADR-0002–0004; Security Model v0.1 |
| Approval Status | Pending Amardeep Baba G Malhotra Approval |

## Problem

The MVP needs reliable previews, controlled promotion, global delivery, managed persistence, and rapid rollback without a large operations team.

## Options considered

1. Self-managed infrastructure.
2. Single hosting vendor without an independent security/DNS layer.
3. Vercel for application delivery, Cloudflare for DNS/WAF, managed PostgreSQL/Supabase for data, and GitHub Actions for verified promotion.

## Decision

Select option 3 as the target architecture, subject to vendor-account, privacy, security, cost, and data-residency approval. Production deployment remains disabled.

## Reasoning

Managed services reduce undifferentiated operations while preserving explicit control points and backups.

## Benefits

Preview environments, managed TLS, WAF/rate limiting, database backups, and fast rollback.

## Tradeoffs

Vendor dependency, recurring cost, and configuration drift risk.

## Future Review Date

2027-02-05.
