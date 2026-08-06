# Satnam Satoshi Vercel Team and Project Inventory

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-06 |
| Status | Verified Read-Only Inventory |
| Accountable Office | Office of Operations |
| Technical Owner | Office of the CTO |
| Human Account Owner and Final Approver | Amardeep Baba G Malhotra |
| Related Products | Satnam.x; Treasury Intelligence; Lunch Time Conversations; Satoshi Langar |
| Dependencies | Vercel Non-Production Authorization 2026-08-06; ADR-0005 |
| Approval Status | Evidence only; no deployment or production authorization |

## Executive result

The CTO Office authenticated to the Vercel dashboard on 2026-08-06 and completed a read-only inventory. The Vercel connection is technically verified for viewing the current team and project configuration.

## Verified team

| Field | Verified value |
|---|---|
| Team name | Baba G's projects |
| Team URL namespace | `baba-g-s-projects` |
| Projects visible | 1 |
| Data preference | Project page reports data sharing disabled globally at team level |
| Production authorization | Not granted |

The Vercel team ID was observed for verification but is intentionally omitted from this public repository record because it is unnecessary for product review.

## Verified project inventory

| Project | Vercel route | Observed state | Repository state | Production readiness |
|---|---|---|---|---|
| `https-github-com-satnam-satoshi-satoshi-langar` | `/baba-g-s-projects/https-github-com-satnam-satoshi-satoshi-langar` | Existing project; production checklist shows 1 of 5 complete; a prior deployment is listed | Project overview presents “Connect Git Repository”; canonical `Satnam-Satoshi/Satoshi-Langar` linkage is therefore not verified | No |

The project ID was observed for verification but is intentionally omitted from this public repository record. The dashboard also displayed a generated `vercel.app` deployment URL and a prior source reference involving a differently named GitHub repository. These observations require cleanup review before canonical repository linkage can be approved.

## Integration status matrix

| Integration | Connected | Configured | Verified | Production Ready | Blocked |
|---|---|---|---|---|---|
| Vercel | Yes | Partial | Yes — team/project inventory only | No | Canonical repository linkage, environment separation, roles/MFA/recovery, billing controls, domains, rollback, and Founder deployment approval remain open |

## Risks

1. The Vercel project name is URL-derived and does not meet the intended Satnam Satoshi naming standard.
2. The canonical GitHub repository connection is not verified and the overview offers a connection action.
3. A prior deployment exists, but its provenance and content have not been approved as an SSCOS release.
4. Preview, staging, and production separation is not evidenced.
5. Domain, environment-variable names, roles, MFA, recovery, billing alerts, logs, and rollback controls remain unverified.

## Recommended next action

Prepare a non-production Vercel remediation proposal covering project naming, canonical GitHub linkage, preview-only deployment controls, environment separation, domain isolation, secrets governance, observability, cost limits, and rollback. Do not apply the proposal until Amardeep Baba G Malhotra explicitly approves the specific Vercel mutations.

## Actions not performed

No project, deployment, domain, repository connection, environment variable, billing setting, team role, data preference, analytics setting, or security control was created or changed during verification.
