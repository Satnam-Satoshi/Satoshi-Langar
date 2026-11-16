# New cloud newsroom v2: isolated build, not an activated publisher

Status: engineering prototype. No scheduled production run, cloud production credential, global writer fence, editorial generation service or new publication has been established. A successful research test proves only the specific tested read-only cloud execution, not autonomous publishing.

## Source of truth and generation

Start from the exact live site source `fd45e107ac37e537195b7311baeba8cd40b2f035`, not `config/ltc-cloud-source.json`'s historical branch. The new nonproduction branch is `agent/cloud-newsroom-v2-20261116`. Existing configuration, F33 retirement/admission artifacts, ledger, old workflows and publisher pause remain untouched.

The new research registry contains 43 reviewed public URLs drawn from the current site's primary-source records. This is bounded coverage, not a promise to scan every project or social post. Reference retrieval and changed hashes are candidates, not verified new announcements. A failed source remains an explicit coverage gap. Every source retains publication/event/effective dates separately from retrieval time.

The isolated CI proof has read-only repository permission, no schedule, no production or editorial secrets, no checkout credentials, no deploy step, no dependency install, no source-writing collector and no old publisher imports. It tests deterministic modules and performs bounded source retrieval. Redirects require review, allowed source hosts are pinned, downloads are size/time limited, and outputs are created only in a new runner temporary directory. Evidence artifacts include URL, status, byte count and digest, not invented extracted metrics.

## One edition, one workflow

The existing canonical daily magazine producer must hand off one immutable manifest containing NY edition date, edition ID/revision, primary evidence, source snapshot hashes, final HTML/PDF/cover/promotional artifact hashes, review/coverage status and production base. The website publisher consumes this manifest; it must not make a second daily issue or independently email/post to social channels. Same-date + same-artifact is a no-op; a different artifact for a published date requires an explicit correction revision, never silent replacement. Website, PDF, email and promotion use the same accepted artifact identity.

Fresh visual treatment means rotating reviewed layouts, palettes, diagrams and chart slots driven by typed manifest data. It does not mean giving a daily model permission to rewrite TSX, security settings, claim publication dates, or historical editions. Unknown/stale metrics stay unavailable. Historic web records remain source-dated and linked to the new current issue rather than redated.

## Proposed cloud execution boundaries

1. **Research job:** scheduled cloud runner, no production authority. Fetch an explicit primary-source registry and discovery queue, parse with pinned adapters, preserve raw evidence privately, distinguish novelty and availability. Article verification must read primary content, not search snippets.
2. **Canonical editorial producer:** one accepted daily manifest shared with the existing magazine/email process. Human-sensitive/high-impact claims remain approval-bound. Coverage gaps and unsupported material withhold the affected claim.
3. **Build/QA:** exact reviewed source commit and implementation digest; only typed current-issue data may change. Build twice deterministically, hash immutable artifacts, run unit/source tests, all-route link checks, desktop/mobile/WebKit and accessible chart tests. No deployment credentials.
4. **Promotion gateway:** sole authorized production mutation authority. Atomically claim the new ledger's NY date+artifact identity and a global lease/fence; verify every previous automated writer excluded, exact current deployment on both domains and candidate QA. Record intent before effect. Stage prebuilt output without aliases, verify exact public bytes/API behavior, then promote that same deployment.
5. **Reconciliation:** after uncertain provider results, query actual deployment and domain state before any retry. Never blindly redeploy, email, post or rollback. Write immutable success/failure receipt and release the owned lease. Alert root on gaps/holds; no claim of success without both domains and artifact hashes verified.

## Single-writer truth

GitHub concurrency is scoped to participating workflows in one repository. It does not exclude a Mac CLI, another repository, a human dashboard promotion, or an uncoordinated integration. An expected-live read is a TOCTOU check, not provider-side compare-and-swap.

Strong single-writer safety requires either exclusive mutation authority (a dedicated cloud identity with legacy/manual production authority removed) OR an obligatory fencing gateway used by every writer. An atomic ledger lease that the provider does not enforce cannot by itself fence a stale credential. No such provider-enforced promotion CAS has been verified here. Until this boundary is established, publication must remain disabled; do not label conditional cooperation a guaranteed lock.

Inventory all scheduled/manual workflows, webhooks, Git deployments and local automation. Disable/withhold old writers, verify no queued/running work, retain immutable old records, and keep emergency stop. Revoking or narrowing credentials/settings is a separate concrete owner-approved security change, not an automatic prototype step. Existing Git ignore and security protections must stay intact.

## Minimum permissions and activation approvals

- Durable source branch: repository contents write to the named nonproduction branch for reviewed code/artifacts. No main merge, broad administration or production enablement is implied.
- Research runtime: repository contents read, public HTTPS reads, private evidence-artifact write; no Vercel, email, social, wallet or financial transaction credentials.
- New ledger: narrow atomic insert/update on the new publisher namespace, immutable receipts, TTL/lease owner/fence checks. No access to mutate the legacy ledger. Provider and actual CAS semantics remain to be selected and tested.
- Production identity: only the existing Vercel project and required deployment-read/create/promote operations, short lifetime where supported. Standard Vercel team tokens may be broader than one project: verify actual scope before approval. Do not export/reuse the Mac's personal OAuth credential or mistake Vercel-to-backend OIDC/Deployment Protection trusted access for permission to create/promote deployments.
- Repository environment/branch settings, secret creation, identity-role changes and disabling old credential paths require owner approval with material scope specified. Cloud schedule activation requires the canonical daily producer agreement and first end-to-end cloud proof.

## Required proof before enabling daily publication

Run from a clean cloud runner with no Mac mounts, shell or login; prove remote source identity and all package pins. Demonstrate: successful canonical manifest ingestion; source outage/stale/future date rejection; duplicate date no-op; concurrent claim exclusion; lease expiry/stale owner rejection; domain drift abort; staged build integrity; protected preview access without policy changes; exact promotion and both-domain readback; uncertain-result reconciliation without duplicate effects; emergency stop; no email/social duplicate. A read-only scan alone does not satisfy these gates.

## Official reference points checked November 16

- GitHub schedule/default-branch and delay limits: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub deployment environments/concurrency: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- GitHub OIDC security: https://docs.github.com/en/actions/reference/security/oidc
- Vercel OIDC (outbound federation, not assumed publishing authorization): https://vercel.com/docs/oidc

The prototype may be built and tested without any of the missing production permissions. Activation remains an explicit future step, not an implied outcome of committing these files.
