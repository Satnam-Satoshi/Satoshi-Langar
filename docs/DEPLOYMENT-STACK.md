# Satnam Satoshi Production Stack

## Operating principle

The hosted system performs scheduled research, collection, verification, report generation, delivery, and paid data access. Humans retain control of credentials, production approvals, treasury wallets, billing accounts, and any future transaction permissions.

## Core stack

### Source control and engineering

- GitHub repository: `Satnam-Satoshi/Satoshi-Langar`
- protected production branch: `main`
- GitHub Actions for type checking and production builds
- pull requests for material application and methodology changes

### Application and hosting

- Next.js and TypeScript
- Vercel production and preview deployments
- Vercel Cron for daily scheduled report runs
- Vercel environment variables for server-only credentials
- Vercel deployment logs and function logs

### Database and identity

Recommended initial provider: Supabase.

Planned services:

- Postgres for sources, observations, holdings, flows, report runs, corrections, subscriptions, payments, and audit events
- Supabase Auth for subscriber accounts
- Row Level Security for subscriber and administrative records
- object storage for generated reports only if source and privacy requirements allow it

A managed Postgres provider may be substituted without changing the normalized schema.

### Email

Recommended initial provider: Resend.

Responsibilities:

- transactional daily report delivery
- verification and subscription messages
- bounce and suppression handling
- delivery event logging

The sender domain must be authenticated before public launch.

### Background jobs and reliability

Initial scheduling uses Vercel Cron.

Add a durable queue when collectors and report generation exceed a single request lifecycle. Queue tasks should be idempotent and keyed by report date, source ID, and parser version.

### Monitoring

Recommended controls:

- public health endpoint without secrets or sensitive data
- application error tracking
- cron success/failure alerts
- source freshness alarms
- parser schema-drift alarms
- database backup monitoring
- report publication and email-delivery audit events

### Payments

Human subscriptions:

- conventional subscription billing provider
- invoices, cancellations, refunds, and tax records

Agent-to-agent access:

- x402 on Base Sepolia during development
- dedicated operational payment address
- production settlement disabled until security, tax, accounting, and legal review

Treasury, donation, operational-revenue, and experimental-agent wallets remain segregated.

### Data sources

- Bitcoin Laws
- Bitbo treasury changes
- mNAV
- Litecoin Register
- official ETF and issuer sources
- SEC, CFTC, Congress, and other primary government sources
- Bitcoin Core and Litecoin Core repositories
- Stellar developer and ecosystem sources
- Morpho GraphQL API

Source rights and permitted redistribution must be reviewed before paid publication or API resale.

## Deployment flow

1. A contributor creates a branch or commits an approved change.
2. GitHub Actions performs type checking and a Next.js production build.
3. Vercel creates a preview deployment for non-production branches.
4. A commit on `main` creates a production deployment.
5. Vercel registers cron definitions from `vercel.json`.
6. At 08:00 America/New_York, the cron route starts the report workflow.
7. Collectors retrieve allowlisted sources and write provenance records.
8. Verification quarantines conflicts and incomplete claims.
9. The publication gate determines whether the report may be released.
10. Approved reports are stored, emailed, and exposed through entitled web/API access.
11. Monitoring records job, publication, and delivery outcomes.

## Required Vercel settings

The account owner must complete these one-time dashboard actions:

- import the GitHub repository as a Vercel project
- set `main` as the production branch
- confirm the Next.js framework preset and repository root
- create a server-only `CRON_SECRET`
- add database, email, monitoring, and payment environment variables as each service is connected
- redeploy after environment-variable changes
- connect a custom domain only after ownership and DNS access are confirmed

Never commit production secrets to GitHub or paste wallet seed phrases, private keys, database service-role keys, or payment credentials into issues or documentation.

## Environment variable groups

### Required for cron activation

- `CRON_SECRET`

### Database

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Email

- `RESEND_API_KEY`
- `EMAIL_FROM`

### Editorial AI

- `OPENAI_API_KEY`

### Monitoring

- provider-specific server DSN or token

### Payment sandbox

- Coinbase developer credentials
- x402 payment address
- network identifier set to Base Sepolia

## Autonomy boundaries

The hosted project can autonomously:

- collect scheduled public data
- normalize and compare observations
- produce drafts and verified reports
- deliver reports to subscribers
- meter authorized API access
- alert administrators to failures and discrepancies

The hosted project cannot autonomously:

- reveal or recover account credentials
- change Vercel ownership or billing without account-owner authorization
- move treasury or donation assets
- execute trades or lending transactions in Phase 1
- ignore source terms, legal restrictions, or publication controls
- guarantee continuous service when upstream providers fail
