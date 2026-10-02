# LTC editorial charter and founding-issue record

Updated October 1, 2026. **Editorial previews; human review pending.**

Lunch Time Conversations is Satnam Satoshi's original magazine. It aims to make Bitcoin, proof-of-work systems, institutional research, public policy, creative work and service understandable to a curious global community. It does not claim to be an audited institutional research service, a complete news wire or an affiliate of a cited organization.

## This issue

Seven new original articles live in `app/data/magazine.ts`, each with a desk, classification, reading-time estimate, takeaways, sections, primary/secondary source labels, source notes and a discussion prompt. The existing mNAV explainer remains at `/conversations/methodology/`. All articles disclose AI preparation and pending human editorial review. A four-minute label is an approximate reading-time estimate, not a scheduled broadcast.

| Article | Form | Evidence and limitations |
| --- | --- | --- |
| The quiet power of checking for yourself | Explainer | Bitcoin white paper and Bitcoin Core release notes; no live independently measured network telemetry. Community service examples are proposed practices. |
| Three clocks inside a Bitcoin fund | Explainer | iShares IBIT issuer materials and CoinShares Physical Bitcoin materials; no ETF flow series or cross-product equivalence. Fictional arithmetic is labeled. |
| Read the verb before the headline | Analysis | Federal Reserve release dated September 30, 2026 distinguishes final rules and a proposal; Congress.gov explains process. No forecast or direct Bitcoin-price inference. |
| Give the agent a job, not the keys | Field guide | Versioned MCP security guidance and BTCPay Server integration docs; future architecture is proposed, not activated. |
| A custody announcement begins the questions | Field guide | BitGo's December 13, 2025 issuer announcement is attributed separately from the OCC's December 12 conditional-approval record. No inference that the earlier notice disproves later completion, no current licensing certification and no product endorsement. |
| When the same coin appears twice | Analysis | Lite Strategy's September 29, 2026 announcement reports 832,716 LTC effective June 30, 2026. Historical issuer figure, not current holdings. Litecoin Register is secondary and states timing, forward-fill and overlap limits. |
| A global movement needs a local table | Field guide | SGPC context for Langar; gathering design is a proposal. No invented project event, host, kitchen activity, beneficiary testimony or completed reward. A separate events desk links organizer announcements. |
| What mNAV can—and cannot—tell us | Explainer | Strategy's July 23, 2026 definition change, dated source treatment and fictional arithmetic. No live company valuation or ranking. |

The manually researched source notes were checked October 1, 2026, independently of the collector. Third-party endpoints can change or fail between checks. Availability is not evidence that a claim has been independently verified. Exact links appear near the relevant sections and in each source notebook.

The morning and evening paths are curated reading lists within this single issue. They are **not** two scheduled editions and must not be represented as an active recurring service.

## Editorial states and ownership

1. **Prepared:** a scoped human or agent contributor produces an original draft and source record.
2. **Evidence checked:** a reviewer tests each material factual claim against its cited source, dates, units, identity and context; unresolved items remain visible.
3. **Editorially reviewed:** the named human editor reviews fairness, accuracy, conflicts, privacy, accessibility and rights, and records acceptance.
4. **Published:** an authorized publisher deploys an identified commit/edition. Public availability alone does not imply that the draft was editorially reviewed.
5. **Corrected:** preserve what changed, why, when, supporting evidence and the prior version reference.

The current public-review design intentionally shows prepared material as an **editorial preview**. No person is credited with a review they have not performed. The founder retains final publication authority under `AGENTS.md`. A human editor and backup must be appointed before promising a daily reviewed edition.

## Classification and evidence

- **Reported fact:** identify the actor, source, exact action and relevant date. A company statement is evidence of what the company reported; it is not automatically independent confirmation.
- **Estimate:** display inputs, units, formula, assumptions and uncertainty. Missing inputs remain missing; a retrieval timestamp never substitutes for a source-effective date.
- **Analysis:** state the inference, its limits and what might change it. Do not turn a regulator's forecast into an established outcome.
- **Opinion:** label it plainly and disclose the speaker's role and relevant conflicts.
- **Field guide:** distinguish proposed practice from implemented capability and legal/operational requirements that vary by jurisdiction.

Politics is covered through public records and fair, attributed analysis. A proposal, final rule, law, speech, allegation and adjudicated finding must not be conflated. No persuasive targeting, invented interviews or fabricated eyewitness reporting.

## Source hierarchy and rights

Use underlying records first: agency documents, filings, issuer product documents, protocol specifications, versioned software releases and accountable organizer records. Secondary reporting is useful for discovery and context, with attribution and independent checks for material claims.

Bitcoin Magazine is an external reading link, not a mirrored feed. Litecoin Register is secondary community research, not a complete verified institutional dataset. BitGo's blog is issuer material, not independent validation. None is presented as a partner. No outside publication's stories, branding, photographs or full text are republished here.

Write original explanations. Keep quotations brief and necessary. Link to source material. Review source terms and reuse rights before expanding automated data redistribution. Religious and cultural context should be handled respectfully; SGPC context does not imply endorsement or give this project ownership of Langar tradition.

## Community and global events

Before listing a dated organizer announcement, verify the organizer source, calendar dates and venue/location; preserve the source-check date. Before arranging attendance, separately confirm session time zones, accessibility, access/costs and cancellation/contact details. Do not imply that a directory entry completes those checks. Distinguish project events from independent events. Do not fabricate coverage to fill a daily issue.

Service stories need consent and accountable verification. Do not require publication of a recipient's identity, image, wallet or private circumstances as proof of service. AI may assist drafts and translations; people remain responsible for physical operations and editorial decisions.

## Archive and feed

`/conversations/archive/` lists actual prepared pieces. `/conversations/feed.xml` is a static RSS feed explicitly titled **LTC — editorial previews**. Each item is labeled editorial preview and discloses AI preparation and review pending. It does not fabricate a publication time; the issue's source-check date is descriptive text. Item GUIDs identify the preview version and do not claim editorial approval.

The feed uses the currently documented HTTPS site as its canonical base. When an approved canonical address changes, update and test feed links deliberately. An IPFS copy still points readers to that canonical site in RSS. Portable HTML links are separately rewritten by the site's exporter.

Source content is currently typed TypeScript plus the existing TSX method note. `docs/PUBLICATION-PROVENANCE.md` describes the broader **target** of canonical Markdown, PDFs, manifest hashes and immutable archives. Those outputs are not implemented by this revision. Git preserves code history; it is not a substitute for the planned publication manifest.

## Corrections and conflicts

The site links the repository's public issue form for source suggestions and corrections. Contributors must omit confidential records and personal financial details. A future private reporting channel requires an explicit privacy/retention policy. Sponsors, holdings and affiliations relevant to a report should be disclosed; no sponsorship buys a conclusion. No sponsor relationships or paid placements are asserted in this issue.

## Before daily publication is activated

Appoint a human editor and backup; adopt a schedule and time zone; authorize the publication boundary; implement a candidate-edition audit record; add source-specific acceptance tests and revision history; test missing/stale data behavior; review legal/source rights as appropriate; publish correction and pause procedures. Agent drafting may be automated separately from approval and deployment. None of these future gates is satisfied by simply setting a timer.

## Global-events desk: October 1 source check

`/conversations/events/` contains three organizer-announced upcoming events verified directly against their official sites: [Plan ₿ Forum](https://planb.lugano.ch/planb-forum/) (October 23–24, 2026; Lugano, Switzerland); [Bitcoin Amsterdam](https://www.bitcoin.amsterdam/) (November 5–6, 2026; SugarFactory in Halfweg, Netherlands); and [Bitcoin Korea Conference](https://www.bitcoinkoreaconference.com/en) (November 7–8, 2026; Seoul, with different day-specific venues). Dates are local calendar dates, not fabricated session timestamps. Every entry states **organizer announced, attendance not arranged**.

Official Africa Bitcoin Conference and Dakar Bitcoin Days pages appeared in search, but direct page retrieval could not be completed during this check. They are undated organizer-directory references, not confirmed event entries. No registration, ticket purchase, outreach, travel, sponsorship or partnership occurred. Recheck all entries before extending the calendar or making attendance arrangements.

Material facts in the seven articles were checked against the cited primary records during October 1 research: white paper and Bitcoin Core release notes; iShares/CoinShares issuer notes; the Federal Reserve September 30 release and Congress.gov process guide; MCP/BTCPay technical documentation; BitGo's dated issuer statement and OCC's earlier conditional-approval release; Lite Strategy's dated results announcement; and SGPC context. Litecoin Register is explicitly a secondary source for its own methodology warnings. Research verification is not a completed human editorial sign-off.
