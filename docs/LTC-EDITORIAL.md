# LTC Media editorial charter

Updated October 2, 2026. Owner: the human founder of Satnam Satoshi. The founder requested the daily website publication workflow in this chat; this charter defines its bounded scope.

**Lunch Time Conversations is the magazine of LTC Media, a Satnam Satoshi media project.** We explain Bitcoin, proof-of-work systems, public policy, institutional research, builders and service through original work that readers can inspect. We welcome a first-time learner and an experienced Bitcoin reader at the same table.

LTC Media is a project name. It does not establish an incorporated media company, a registered charity, a legal trust, an audited research service or a partnership with a cited publisher. AI Satoshi Ma is the AI editorial lead, coordinating bounded research, drafting and checks. The human founder retains ownership, mission, publication policy and final authority. A human editor and backup have not yet been appointed; no review is credited to an invented person.

## A Nakamoto standard with a human purpose

For this project, the Nakamoto standard means understandable rules, verifiable evidence, open participation and individual sovereignty. Bitcoin's proof of work anchors our coverage. This is an editorial commitment, not a new protocol specification or an endorsement by Bitcoin's creators.

Seva makes knowledge useful to other people. Explain tradeoffs plainly, respect readers' agency, and welcome informed disagreement. Newcomers must be able to read, learn and prepare a contribution without a wallet, payment or account. Technical depth remains available through sources, methodology and the advanced courses.

## Publication authority: two distinct lanes

### Automatic daily factual briefing

The founder authorizes daily website publication of a **source-bound factual briefing** after the implemented acceptance gates pass. This lane uses approved public sources, source-specific parsers and original deterministic summaries of accepted observations. It may state an issuer-reported quantity and effective date, identify a verified software release, show an approved public-record reference, and describe collection coverage or gaps.

An edition must show its issue date, collection time, source-effective dates, source links, classifications, missing or stale sections and AI/automation authorship. A new collection is not evidence of a new event. Reused historical facts retain their original dates. Retrieved pages with no validated extraction are reference links, not verified numerical observations. A source title is not proof of every claim in the page.

This authority does not extend to unrestricted autonomous news interpretation. An agent must not infer ETF flows from a holdings change, compute a live company mNAV without the required comparable inputs, invent a current event to fill a section, or silently turn a failed source into zero. A failed acceptance gate withholds the affected material or release according to the pipeline's tested rules. The last verified edition remains accessible; a failure must not relabel it as a fresh successful edition.

The bounded-daily-v1 policy in `config/ltc-publication.json` controls this lane. Acceptance requires the configured eight-source registry and source-specific parser checks, a snapshot no older than 24 hours, no future data, and at least one parsed primary-source observation effective within four calendar days. Currently the numerical/technical observations come from iShares IBIT and the official Bitcoin Core, Litecoin Core and LND release records; the other four sources are availability-only references. These checks do not create a complete market feed.

See [LTC-PIPELINE.md](LTC-PIPELINE.md) for exact schemas, commands and storage. The schedule targets **10:00 America/New_York daily**, through the existing Codex automation when its host is available. It is not an always-on cloud service or an uptime guarantee. A missed, stale or failed run keeps the prior dated edition; no separate morning and evening editions are promised. The release handoff records actual scheduler activation and the last verified deployment.

Only one initial edition is admitted per local calendar day; a repeat run is a no-op. The scheduled lane does not create correction revisions autonomously. The correction command requires an explicit revision number, a reason and an earlier edition; material corrections still need the human decision described below.

### Original features, analysis and opinion

Explain the inference, relevant uncertainty and who is speaking. AI-prepared features may be made available as clearly marked editorial previews under the founder's website-review authorization. They remain **human editorial review pending** until a real human editor records acceptance. Automated checks and publication do not confer independent human review.

Fresh political interpretation, allegations about people or organizations, interviews, investment theses, sponsored material, legal-status claims, translations of sensitive cultural context and substantial corrections require human editorial review before being presented as reviewed reporting. The pipeline must never invent that approval. A daily factual update cannot silently republish or change this material.

## Classification and evidence

| Classification | What the reader needs |
| --- | --- |
| Reported fact | Actor, exact action, source, event/effective date and collection date. An issuer statement is attributed evidence of what it reported. |
| Estimate | Inputs, units, formula, assumptions and uncertainty. Missing inputs remain missing. |
| Analysis | The reasoning, its limits, plausible alternatives and what could change the conclusion. |
| Opinion | A clear label, speaker's role and relevant conflicts. |
| Field guide | A separation between proposed practice, implemented capability and jurisdiction-dependent requirements. |
| Source availability | Whether a record could be retrieved. This is not independent validation of its claims or metrics. |

Use underlying records first: agency documents, filings, issuer product documents, protocol specifications, versioned software releases and accountable organizer records. Verify identity, units, effective dates and the intended parser before admitting a number. Keep raw or hashed evidence as specified by the pipeline; preserve the same provenance in the archive. Financial figures must not outgrow their source's scope.

Politics is covered through public records and fair attribution. A proposal, final rule, law, speech, allegation and adjudicated finding must not be conflated. We do not personalize partisan persuasion, fabricate interviews, claim eyewitness reporting we did not perform, or manufacture false balance around established evidence.

## Rights, affiliations and sponsorship

Write original explanations and use brief, necessary quotations. Link to source material. Check reuse rights before adding automated redistribution. Reader links do not establish an affiliation or a partner feed.

Bitcoin Magazine is external journalism and opinion, not a mirrored feed. Litecoin Register is secondary community research, not a complete verified institutional dataset. BitGo's resources are issuer material, not independent validation or an endorsement. Do not reproduce their stories, distinctive branding or photographs without appropriate rights.

Relevant sponsorships, holdings and affiliations should be disclosed. Sponsorship cannot buy a conclusion; paid placements must be distinguishable from editorial work. No sponsors or partners are asserted by this charter. Cultural context should be handled respectfully: references to Langar do not claim ownership of the tradition or an institution's endorsement.

## Editorial states and audit record

1. **Prepared:** a human or agent creates a candidate with identified evidence and scope.
2. **Checks passed / withheld:** the implemented evidence and release checks record their actual result. A pass applies only to those checks; it is not human editorial approval.
3. **Human reviewed:** only when an accountable person records what they reviewed, when, and their decision. This state is separate from the automatic factual lane.
4. **Published:** the release record identifies the edition, source, artifact and deployment. It preserves any preview or automation label.
5. **Corrected:** the record explains what changed, why, when, and the prior edition or revision reference.
6. **Paused:** further automated publication is stopped; the last verified edition and its original dates remain available.

The distinct agent responsibilities and permission limits are in [LTC-AGENTS.md](LTC-AGENTS.md). Several roles may run in one process or agent session; role separation is not a claim of independently staffed desks or independent verification.

## Corrections, pitches and privacy

The public newsroom at `/conversations/about/` offers prepared GitHub drafts for corrections and source/story proposals. Opening a draft does not submit it; submitting requires a GitHub account and makes the issue public. Guests can first prepare a local contribution plan at `/join/?path=ltc`.

A useful correction includes the article or edition URL, the disputed claim, a dated primary source and the proposed change. Do not post confidential records, private contact details, recipient identities, account balances, recovery words or keys. Sensitive security issues should use the repository's security guidance. A future private editorial inbox needs a real monitored owner and a published retention policy; no inbox is invented here.

Correct factual errors promptly and visibly. Material corrections require an accountable human decision on wording and prominence; automated publication must not erase the original audit record. Typos and broken-link repairs still leave a revision trail. Notify the founder of a material source-method change, a sustained new collection failure, a release failure or a decision requiring human authority. Routine healthy runs do not need repetitive notifications.

## Community, service and global events

Service stories require consent and accountable verification. A recipient's identity, image, wallet or private circumstances must never be required as public proof of service. AI can assist logistics, drafts and translations; people remain responsible for physical operations, food safety and consent. No agent awards money or verifies a physical meal merely by generating a record.

Before listing a dated event, check the organizer's own record, calendar dates and location, and preserve the check date. Attendance arrangements need separate confirmation of time zones, access, cost, accessibility and cancellations. Directory links are not completed checks. Distinguish Satnam Satoshi events from independent events; do not invent hosts, gatherings or community size.

Contributions can improve a lesson, check one source, repair an accessibility issue, translate a reviewed passage or propose a local reading table. Public proposals are reviewed as capacity permits. No assignment, reply time, reward or financial outcome is promised.

## Archive and reader access

The magazine, dated archive and RSS feed use the same edition record where implemented. Retain issue dates and stable identifiers; do not use retrieval time as a fabricated event time. Founding features retain their preview labels and source-check date. Changing the canonical domain requires an intentional, tested update; satnam.x publication is still deferred separately.

RSS is an open subscription format. It does not create a mailing-list account or imply that the user subscribed merely by opening the feed. A reader can paste the feed URL into a feed reader. Reading and guest contribution planning stay available without signing in. Social accounts and account recovery remain separate owner tasks; no inactive channel is presented as live.

## Emergency stop and restart

The human founder may pause publication at any time. Operators should set `paused: true` in `config/ltc-publication.json`, pause the active scheduler, retain candidate/evidence files, record the reason and verify that no later release is promoted. The edition preparer must exit without writing a new release while paused. Never delete the archive to hide a failed run. Restore the last verified static artifact if a harmful release reached production, keeping the correction record.

Restart only after the blocking condition is understood, the relevant tests pass and the human owner approves any changed publication boundary. A parser repair within the existing boundary still requires fixture checks and a reviewed diff; a new source, financial calculation, privilege or category of autonomous claim needs explicit owner review. Wallets, money, donation addresses, protected-branch merges, domain records and account credentials remain outside the editorial agent mandate.

## Founding feature archive: October 1, 2026

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
