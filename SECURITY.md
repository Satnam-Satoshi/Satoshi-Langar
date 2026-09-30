# Security Policy

Security is a constitutional requirement, not a feature added later.

## Public Alpha boundaries
- No private keys, seed phrases, exchange credentials, banking credentials, or production secrets belong in this repository.
- No AI agent receives treasury, signing, production-merge, or account-owner authority by default.
- Treasury Intelligence is read-only.
- Production publication and domain changes require Founder approval.

## Reporting a vulnerability
Do not publish exploit details in a public issue if doing so would materially increase risk. If GitHub shows a **Report a vulnerability** button on this repository's Security page, use that private reporting flow. Availability of that feature and a separate confidential contact have not yet been verified for this project.

If no private reporting option is available, open an issue containing only a request for a private reporting channel, without exploit details, secrets or affected people's identities. Wait for the human maintainer to provide and verify a confidential route before sending sensitive material. No response-time commitment is currently established.

Include affected component, reproduction conditions, potential impact, and any safe mitigation you have identified. Do not access data that is not yours, move funds, degrade service, or test against real users without authorization.

## Response principles
Preserve evidence, minimize blast radius, rotate compromised credentials, document decisions, communicate material impact accurately, and publish a post-incident record when safe.
