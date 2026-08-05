# SSCOS Repository Specification

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | Platform Lead |
| Related Volume | Engineering Program |
| Related Chapter | Repository Architecture |
| Dependencies | ADR-0001; ADR-0002 |
| Approval Status | Pending Human Founder Approval |

## Scope

`Satnam-Satoshi/Satoshi-Langar` remains the only authorized MVP repository. Do not create parallel application repositories without an ADR and Founder approval.

## Target structure

```text
app/                    route composition only
modules/
  satnam-x/             gateway domain
  treasury/             treasury read models and UI
  conversations/        Lunch Time Conversations domain
  langar/               daily brief domain
  provenance/           claims, sources, confidence, corrections
  shared/               deliberately shared primitives
db/                     migrations, policies, seeds, test fixtures
contracts/              OpenAPI and shared schemas
jobs/                   allowlisted ingestion and verification jobs
design-system/          tokens, components, accessibility contracts
tests/                  contract, integration, E2E, accessibility
docs/                   governed architecture and operations
```

## Boundaries

Modules may depend on `shared` and `provenance`; cross-product imports require an explicit public module interface. Route handlers do not contain domain logic. Database access occurs through domain repositories. Public request paths cannot invoke ingestion, editorial mutation, or privileged administration.

## Branching and review

Use short-lived `agent/` or `feature/` branches. Protect `main`; require pull request review, passing checks, resolved conversations, and current branch. Require CODEOWNERS for security, database, contracts, workflows, and governance files. Production promotion is a separate approval from merge.

## Required checks

Formatting, type checking, linting, unit tests, contract tests, migration validation, dependency audit, secrets scan, build, E2E smoke, accessibility smoke, and documentation-link validation.

## Ownership

| Area | Accountable owner |
|---|---|
| Constitution/governance | Human Founder |
| Architecture and contracts | CTO |
| Workflows, environments, releases | Platform Lead |
| Database and ingestion | Data Lead |
| Web and design system | Web Lead |
| Content and corrections | Editorial Lead |
| Security policy and incidents | Security Lead |

## Success criteria

The repository can enforce domain boundaries, verify every change, reproduce a release from a commit, trace schema and contract versions, and prevent one person or agent from silently merging and deploying a material change.
