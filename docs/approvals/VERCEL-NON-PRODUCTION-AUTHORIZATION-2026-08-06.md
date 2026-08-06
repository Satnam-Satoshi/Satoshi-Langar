# Satnam Satoshi Vercel Non-Production Authorization

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-06 |
| Status | Active Founder Authorization Record |
| Owner and Final Approver | Amardeep Baba G Malhotra |
| Accountable Office | Office of the CTO |
| Related Products | Satnam.x; Treasury Intelligence; Lunch Time Conversations; Satoshi Langar |
| Dependencies | Vercel Connection Verification 2026-08-06; ADR-0005 |
| Approval Status | Approved only for read-only verification and non-production preparation |

## Authorization

Amardeep Baba G Malhotra authorizes the CTO Office to use the connected Vercel integration for the Satnam Satoshi Foundation project and the `Satnam-Satoshi/Satoshi-Langar` repository for:

- read-only account, team, project, deployment, domain, role, environment, and configuration inventory;
- architecture and implementation-readiness analysis;
- documentation of preview, staging, production, security, cost, recovery, and promotion controls; and
- preparation of a non-production project or preview-environment proposal for separate approval.

## Excluded actions

This authorization does not permit:

- creating or deploying a Vercel project;
- linking or changing a domain;
- adding, reading, rotating, or exposing credential values;
- changing billing, team membership, roles, security controls, or environment variables;
- promoting a deployment to production;
- publishing a public release; or
- enabling automatic production deployment.

Each excluded action remains subject to the existing Founder approval gates.

## Current verification result

The Vercel plugin was explicitly invoked in the 2026-08-06 session, but it exposed no callable Vercel resource operations to the CTO Office. Therefore:

| Connected | Project identified | Configured | Verified | Production Ready |
|---|---|---|---|---|
| Founder-reported; technical confirmation unavailable | No | No | No | No |

No Vercel project name, project ID, team, domain, deployment, or production status may be inferred until the connector returns read-only account evidence.
