# SSCOS DevOps Architecture, Security Model, and Deployment Strategy

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | Platform Lead and Security Lead |
| Related Volume | Engineering Program |
| Related Chapter | Platform Operations |
| Dependencies | ADR-0002; ADR-0005; Repository Specification |
| Approval Status | Pending Human Founder Approval |

## Target architecture

GitHub is the source repository; GitHub Actions is the verification and controlled-promotion plane; Vercel hosts preview, staging, and production application environments; Cloudflare provides DNS, TLS policy, WAF, rate limiting, and edge protection; managed PostgreSQL/Supabase provides isolated staging and production data services; and Sentry plus structured logs provide bounded observability. Vendor connections are targets, not current production authorization.

## Environments

| Environment | Data | Access | Promotion |
|---|---|---|---|
| Local | Synthetic only | Developer | None |
| Preview | Synthetic/sanitized fixtures | PR reviewers | Automatic after checks; never production credentials |
| Staging | Non-production representative data | Named team and Founder | Signed release candidate from `main` |
| Production | Approved public content and governed operational records | Public read; tightly restricted admin | Manual Founder go/no-go plus Platform Lead execution |

## Security model

### Protected assets

Source integrity, publication integrity, user trust, editorial drafts, API and database credentials, DNS/domain control, deployment authority, logs, backups, and availability. No treasury keys or seed phrases belong in the MVP system.

### Primary threats

Account takeover; malicious or compromised dependency; secret leakage; source poisoning; prompt injection in retrieved content; unauthorized publication; database exposure; cross-site attacks; denial of service; correction suppression; audit tampering; and configuration drift.

### Mandatory controls

Phishing-resistant MFA for privileged humans; least-privilege service identities; separate environments and credentials; protected branches and CODEOWNERS; pinned/verified CI actions; dependency, SAST, secrets, and container/configuration scanning; server-side validation; parameterized queries; CSP and secure headers; WAF and rate limits; encrypted transport and storage; append-only approval/correction/audit evidence; log redaction; daily managed backups with restore tests; incident runbooks; quarterly access review; and credential rotation after personnel or incident changes.

Retrieved content is untrusted data, never instructions. Agents cannot access deployment or database-administration credentials. Public API routes are read-only and cannot reach mutation commands. Editorial approval and production promotion require separate human roles where staffing permits.

## CI/CD gates

Pull request: format, types, lint, unit, contract, migration, security scans, build, E2E smoke, accessibility smoke. Merge: required human review and passing checks. Staging: immutable artifact plus database compatibility check. Production: release notes, backup confirmation, security/accessibility/performance evidence, content approval, monitoring ready, rollback target identified, and explicit Founder go/no-go.

## Deployment and rollback

Use build-once/promote semantics where supported. Tag releases semantically and record commit, schema, contracts, content revision, approver, and environment. Apply backward-compatible expand/migrate/contract database changes. Prefer immediate application rollback for regressions; use forward repair for migrations unless a tested safe reversal exists. Cloudflare or application kill switches can disable affected routes while preserving the institutional notice page.

## Service objectives and observability

Initial targets: 99.9% monthly public-read availability; p95 cached page response under 1 second at the edge; p95 uncached API response under 800 ms under agreed load; critical incident acknowledgement within 15 minutes during staffed release windows; recovery point objective 24 hours and recovery time objective 4 hours until improved by evidence. Monitor uptime, error rate, latency, job freshness, source failures, publication events, corrections, security events, database saturation, and cache behavior.

## Success criteria

No production secret reaches preview; compromised retrieved content cannot issue instructions; one controlled action disables ingestion and another disables public publication; a staging restore and application rollback are demonstrated; critical alerts reach a named human; audit evidence identifies every release and approval; and production remains disabled until explicit authorization.
