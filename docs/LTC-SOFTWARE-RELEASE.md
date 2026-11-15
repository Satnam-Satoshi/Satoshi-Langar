# Cloud-only software releases

Implementation is prepared, not activated. Keep the existing scheduled publisher as the sole daily-content writer. The manual template in `ops/ltc-software-release-workflow.yml` does not run until reviewed and deliberately installed as `.github/workflows/ltc-software-release.yml` on main. Never promote the normal Git `dist` preview: it omits the standalone API functions.

## Verified baseline, November 12, 2026

The hosted Ubuntu daily workflow published on November 11, run 43072787553; run 43140434078 confirmed the existing issue rather than republishing. Both public domains have the four working APIs. Market and chain returned fresh responses, the register returned its dated record, and Morpho reported partial coverage. Runtime publication uses GitHub, Vercel and private cloud evidence, without Mac paths or Keychain access. Older setup/runbook statements that no cloud schedule exists are obsolete.

## Preparation and rendered QA

Use an exact Git commit in a cloud checkout, Node 22.23.2, pnpm 11.19.0 and Vercel CLI 65.9.0. Run the full check and `pnpm release:prepare`. The latter builds `.vercel/output` with static assets, security/redirect rules and all four Node function bundles. No Vercel project environment variables are required by those four service handlers. The default Next.js CSS merger was observed to reorder the same CSS modules across identical builds, changing filenames and linked HTML. `experimental.cssChunking: false` preserves import order and avoids that byte drift. Exact artifact pins remain enforced; repeated clean-build hashes must match before accepting the candidate.

The credential-free `site-visual-qa.yml` workflow installs pinned Playwright 1.56.1 on hosted Ubuntu, renders 16 representative route families at desktop, 390 and 320 pixels in Chromium and 390 pixels in WebKit, checks overflow/images/browser exceptions, and exercises both mobile menus including Back and close. It also runs the existing isolated auth-browser flows. All browser traffic is intercepted against the exact local export. API calls receive explicit unavailable fixtures; screenshots are not live-data proof. Screenshots and results are saved as `site-visual-qa-<exact-source-sha>` for 30 days. Human visual review remains necessary for taste and untested scroll positions. This removes a dependency on the user's Mac for repeatable regression evidence.

## Reviewed one-shot deployment

1. Complete design, collector and controller review together. Do not merge implementation changes into the accepted source branch and leave the old accepted digest in place: daily runs will correctly stop.
2. Coordinate the exact reviewed source commit and implementation acceptance with the existing release owner. Preserve historical acceptance, quarantine, recovery and cutover proof. Do not manufacture new acceptance or set a digest merely to silence a failure.
3. Run the manual workflow with `publish=false` to build the exact artifact and obtain its source, implementation, static-manifest and Build Output hashes. The supplied plan digest authorizes no production action.
4. Verify the exact commit has passed `site-visual-qa.yml`, inspect its screenshot artifact, and prepare a bounded one-shot review. It must name the exact source and accepted implementation, all changed paths, target project/team/domains, previous deployment/checkpoint/rollback manifest, both candidate artifact hashes, the visual QA run, approval time and expiration no more than 24 hours later, and explicitly permit confirmed-failure rollback while preserving daily publication. Require `expiryScope: "admission-and-first-promotion"` and `rollbackAfterExpiryWithinLease: true`: expiration prevents a new admission or promotion, but does not strand an already-promoted bad candidate by revoking its explicitly approved bounded rollback. Cleanup still requires the original live fence, unchanged candidate/previous deployment identity, and the existing lease timeout.
5. Keep that review in protected `LTC_SOFTWARE_RELEASE_REVIEW_JSON` with its canonical JSON SHA256 in `LTC_SOFTWARE_RELEASE_REVIEW_SHA256`. The closed `LTC_SOFTWARE_RELEASE_ENABLED` gate must be deliberately enabled only through the reviewed operational handoff. This implementation does not provision either value or change existing pins.
6. Dispatch `publish=true` on main as the existing owner. It uses `ltc-production`, the same `ltc-production-publication` concurrency group, existing cloud credentials and exact private resource variables. GitHub permissions are contents:read and actions:read; this path cannot push source changes. Existing Google revision-CAS website lease prevents collision with daily publication. It cannot steal expired leases or clear uncertainty.
7. The runner rebuilds without service credentials, validates exact review/QA/source/output, verifies the existing private and public baseline, archives source/static/functions/evidence, stages with `--prebuilt --prod --skip-domain`, checks all protected artifact bytes and all four JSON API handlers, then performs fenced promotion. A confirmed promotion followed by failed public-byte verification gets the existing separately fenced rollback. An uncertain effect is never replayed.

## Daily publication invariants

Software mode never invokes collectors, modifies source records, dispatches social posts, changes schedules, or updates acceptance configuration. It compares both source trees, including deletions and mode changes, against the exact reviewed file list. Daily source records and generated edition JSON/snapshots/daily graphics must remain unchanged.

The existing `latestRelease.verifiedAt` remains the original daily-content verification clock. `softwareVerifiedAt` separately records the new software deployment's verified time. The same semantics and bounded software context are written to the private release receipt and checkpoint. The checkpoint's source/deployment/manifests advance together so the next daily run can verify/restore the current software baseline. The original daily admission implementation is unchanged: software before today's issue does not consume today's issue, and software after today's issue does not permit another daily edition. Software mode is refused during first-proof or manual recovery gates.

## Failure and outstanding activation work

The template and new production mode require independent review, exact-head CI and real cloud browser results before activation. A successful static preview alone is insufficient. Do not disable deployment protection. Protected API checks distinguish a deployed JSON handler reporting unavailable upstream data from a missing function returning HTML/404.

If a run stops after any durable intent, retain its lease and original evidence. Inspect the exact outcome with the existing recovery owner; do not redispatch the approved write, clear a fence or turn an UNKNOWN into success. No automatic software recovery or replay is introduced. A fresh reviewed recovery may be needed before daily publication can resume.

Refreshing the existing cloud setup/runbook and installing the reviewed workflow on main remain operational handoff steps. The existing approved scheduled daily service remains unchanged until that handoff.
