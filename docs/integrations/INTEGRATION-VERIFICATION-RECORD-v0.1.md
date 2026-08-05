# SSCOS Integration Verification Record

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Active Evidence Record |
| Owner | Platform Lead / Security Lead (temporarily coordinated by CTO) |
| Related Volume | Engineering Program |
| Related Chapter | M1 Integration Verification |
| Dependencies | Issue #17; Platform Security and Deployment v0.1 |
| Approval Status | Evidence only; no production authorization |

## Verification vocabulary

- **Connected:** an authenticated or intentionally public path is observable.
- **Configured:** required non-production settings, ownership, roles, recovery, and environments are established.
- **Verified:** current evidence confirms the required connection and control claims.
- **Production Ready:** security, legal, operational, cost, recovery, and Founder release gates have passed.
- **Blocked:** a missing definition, authority, account, credential, evidence, or decision prevents progress.

No status may be inferred from a prior conversation, brand mention, planned vendor, or visible public endpoint alone.

## Evidence register

| ID | Integration | Claim tested | Evidence | Result | Limitations | Next test | Owner |
|---|---|---|---|---|---|---|---|
| INT-E001 | GitHub | Repository connection | Connected GitHub app returned repository ID `1181242402`, default branch `main`, public visibility, and admin/maintain/push/pull/triage permissions | Connected and verified for repository content/issues | Native Milestone/Project operations unavailable; branch protection, MFA, recovery, Actions, billing, and production promotion not verified | Account-owner control review and native project setup | Account Owner + Security Lead |
| INT-E002 | GitHub | Documentation branch writes | Files on `agent/sscos-institutional-baseline-v0-2` were written and read back | Verified for review-branch documentation | No merge or deploy authority tested or implied | Branch protection and CODEOWNERS evidence | Platform Lead |
| INT-E003 | Google Drive | Institutional root continuity | Root ID `1vOsG6oilBHObJuXxOLdSDLLaqeqWQZLt` listed 18 expected top-level folders | Connected and verified | Sharing, recovery, retention, MFA, and account succession not verified | Account and sharing-control review | Account Owner + Documentation Officer |
| INT-E004 | Google Drive | Controlled filing | Governed documents uploaded to designated folders and read back through folder listings | Configured and verified for current document workflow | Cross-system hash reconciliation is manual | Add version/hash reconciliation procedure | Documentation Officer |
| INT-E005 | Canva | Current callable connection | No callable Canva capability or current evidence available in this operating session | Unverified | A prior report is not sufficient evidence | Verify account, templates, ownership, rights, export settings | Design Lead |
| INT-E006 | Vercel | MVP hosting account | No current evidence | Blocked for verification | Account/team/MFA/environments/billing/domains unknown | Read-only account inventory | Platform Lead |
| INT-E007 | Supabase | Managed database account | No current evidence | Blocked for verification | Project ownership, region, environments, backups, RLS, billing unknown | Read-only project/control inventory | Data + Security Leads |
| INT-E008 | Cloudflare | DNS/security account | No current evidence | Blocked for verification | Zone, registrar, MFA, WAF, recovery, billing unknown | Read-only zone/control inventory | Account Owner + Security Lead |
| INT-E009 | OpenAI | Production API project | Codex planning capability does not prove an SSCOS production API project | Unverified | Owner, keys, budgets, data settings, models, evals unknown | Define and verify non-production API project after approval | AI Systems + Security Leads |
| INT-E010 | Buzz | Product/integration identity | No approved definition | Blocked | Vendor, mission, data, account, and scope unknown | Founder definition or Phase 2 exclusion | Founder + CTO |
| INT-E011 | Hermes | Product/integration identity | No approved definition | Blocked | Vendor, mission, data, account, and scope unknown | Founder definition or Phase 2 exclusion | Founder + CTO |
| INT-E012 | Circle | MVP necessity | ADR-0001 excludes payments and transaction services | Phase 2 by recommendation | No account/control verification performed | Revisit only through approved ADR | Treasury Approver |
| INT-E013 | Coinbase Developer Platform | MVP necessity | ADR-0001 excludes transaction-capable services | Phase 2 by recommendation | No account/control verification performed | Revisit only through approved ADR | Treasury Approver |
| INT-E014 | Bitcoin/Litecoin/Stellar | Research connectivity | Public networks exist; no SSCOS provider or node configuration is approved | Unverified integration; research-only target | Provider trust, node ownership, rate limits, data lineage unknown | Source-provider comparison under source registry | Research + Data Leads |
| INT-E015 | Lightning | MVP necessity | Payments are outside ADR-0001 MVP boundary | Phase 2 by recommendation | No wallet/node/account verification | Revisit only through approved ADR | Treasury Approver |

## Required evidence checklist for any critical-path service

- [ ] Legal account owner and operational owner.
- [ ] Phishing-resistant MFA and recovery method.
- [ ] Role/permission inventory and least privilege.
- [ ] Separate preview, staging, and production environments where applicable.
- [ ] Data categories, region, retention, subprocessors, and export/delete path.
- [ ] Billing owner, budgets, alerts, and spending limits.
- [ ] Credential creation, storage, rotation, revocation, and incident procedure.
- [ ] Backup, restore, portability, and vendor-exit evidence.
- [ ] Logs, alerts, availability expectations, and escalation contacts.
- [ ] Terms, licensing, privacy, and security review.
- [ ] Explicit Founder production authorization.

## Current disposition

GitHub and Google Drive are sufficient for controlled planning and documentation. No other integration is verified or production ready. Vercel, Supabase, and Cloudflare are the next architecture-critical verification targets, but only read-only inventories are appropriate before M1 approval. Transaction-capable platforms remain Phase 2 by recommendation.

## Success criteria

Issue #17 may close only when every MVP-critical integration has evidence for ownership, MFA, roles, environments, recovery, billing, data controls, and production gate; noncritical integrations are explicitly deferred; and no `Verified` or `Production Ready` status depends on assumption.
