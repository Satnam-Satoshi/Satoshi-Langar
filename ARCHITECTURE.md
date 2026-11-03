# Architecture and independence

Satnam Satoshi begins with a portable public home and a reviewable contribution process. The long-term community operating system grows from that foundation; the entire proposed platform is not implemented today.

## Current layers

| Layer | What exists | Limits / next evidence |
|---|---|---|
| Public community site | Next.js-authored content exported as static HTML/CSS with allowlisted local enhancements in PR #52; HTTPS and an IPFS review copy | Main still has earlier app code; static release merge and founder acceptance remain separate |
| Source and public decisions | This GitHub repository, issues, PRs and Markdown | Need independent source and issue export/restore |
| Contribution planning | Local, downloadable personal drafts and program starter kits | No submission or membership claim; no backend storage |
| Contribution intake | Visitor-reviewed GitHub drafts and templates | Requires a GitHub account to post; private intake and backup stewardship remain open |
| Optional community identity | Supabase OAuth/PKCE adapter, inactive by default | Provider activation, private contact and real end-to-end testing pending |
| Agent participation | Human-governed task rules and a contribution brief | No public registry API or autonomous production executor |
| Private records | Separately access-controlled project records | Never required to understand a public starter task; complete remote restore remains to be verified |
| Research prototypes | Separate Treasury and editorial work | Not community identity, custody or financial execution |

The public static site does not require a database, model provider, wallet connection or payment to read. This repository's older application source and historical deployment plans should not be confused with the current static review artifact. [Status and source evidence](docs/STATUS.md) · [Developer setup](docs/DEVELOPMENT.md)

## No irreplaceable provider

This is an engineering goal with acceptance evidence, not a claim of zero dependencies.

- Publish source and content in standard, reusable formats.
- Preserve issue, decision and attribution records beyond a Git clone.
- Maintain public release copies independently; IPFS persistence needs maintained availability.
- Restore a release on another host and document the result.
- Give human stewards recovery instructions and revocable access.
- Test a manual contribution path when an AI or hosting service is unavailable.

GitHub, Vercel, gateways, storage and account owners remain current dependencies. Public federation, portable identity and optional Bitcoin/Lightning tools are future evaluations with privacy, moderation, custody and recovery tradeoffs. Do not add a protocol solely to call the project decentralized.

## Boundaries between systems

Service-recipient records must not go into Git, public issues or immutable public storage. Research data must carry source, retrieval time and limits. Financial prototypes stay separate from learning, joining and volunteering. A typed wallet address is not identity authentication or permission to act.

Any future subsystem should document its purpose, human owner, inputs, outputs, interfaces, dependencies, permissions, data retention, stop mechanism and evidence of success. Record material choices with the [ADR template](docs/ADR-TEMPLATE.md), and link the accepted decision from the [public log](docs/DECISIONS.md).
