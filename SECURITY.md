# Security Policy

Security is a constitutional requirement, not a feature added later.

## Public Alpha boundaries
- No private keys, seed phrases, exchange credentials, banking credentials, or production secrets belong in this repository.
- No AI agent receives treasury, signing, production-merge, or account-owner authority by default.
- Treasury Intelligence is read-only.
- Production publication and domain changes require Founder approval.

## Reporting a vulnerability
Do not publish exploit details in a public issue if doing so would materially increase risk. Use the repository's private security-reporting channel when enabled, or contact the Human Founder through the project's verified public contact path.

Include affected component, reproduction conditions, potential impact, and any safe mitigation you have identified. Do not access data that is not yours, move funds, degrade service, or test against real users without authorization.

## Response principles
Preserve evidence, minimize blast radius, rotate compromised credentials, document decisions, communicate material impact accurately, and publish a post-incident record when safe.

## Treasury control review route

`/treasury/control` is a separate phase-1 review implementation with live public-chain reads and unsigned action preparation. Transaction submission remains disabled in source. Its outstanding security and signing gates are recorded in [the phase-1 report](docs/treasury/PHASE-1.md). Do not use downloaded transaction data with funds before completing those gates.
