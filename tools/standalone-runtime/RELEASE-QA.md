# Dormant standalone release QA

Mission: collect bounded, read-only deployment identity and immutable byte observations. Human approval, source-review authority and provider mutations are outside this module. Emergency stop and deployment authorization remain coordinator responsibilities. There is no publish, promote, upload, alias mutation, bypass-token or credential-management method. No network occurs on import or with the default `networkEnabled:false`.

`createReleaseQa({plan,vercel,read,clock,networkEnabled:false,timeoutMs:10000})` exposes `verifyPreview()`, `verifyPublic()` and `reconcileProduction()`. `vercel` contains only the dependencies/configuration needed by the existing standalone `createVercelReadOnly`: injected GET transport, secret-reference resolver and reference. Plan project/team/branch override any conflicting adapter configuration. No secrets or raw provider metadata are returned or logged.

## Independently trusted plan

The coordinator supplies and retains the plan, not an untrusted producer approval flag:

- Exact `deploymentId`, `expectedBaselineDeploymentId`, independently trusted `baselineSourceCommit` and `baselineBranch`, `projectId`, `teamId`, `branch`, 40-hex `sourceCommit`, one `previewHostname` ending in `.vercel.app`.
- `domains` exactly `['ltcmagazine.org','satnamsatoshi.com']`.
- Edition date, revision, title and canonical `/conversations/editions/YYYY-MM-DD[-rN]/` route.
- Exactly four `{role,path,sha256,bytes,mimeType}` artifact entries, roles pdf/reader/cover/promo. Paths derive from `/magazine/daily/YYYY-MM-DD/rN/` and `edition.pdf`, `reader.html`, `cover.png`, `promo.png`. This narrow profile deliberately rejects unsupported image formats/projections rather than silently broadening acceptance.
- `expiresAt` plus independently reviewed `evidence` entries `{id,sha256,retrievedAt,expiresAt}`. Every timestamp is exact UTC milliseconds. Earliest deadline wins. Hashes and timestamps do not establish semantic truth; upstream review/policy must establish them.

The factory snapshots the plan. Manifest digest is SHA256 of canonical sorted-key JSON of the exact artifact array; array order is part of the binding. Plan and evidence digests bind their exact canonical values. No renderer DRAFT artifact becomes approved by passing byte QA.

## HTTP transport boundary

`read({url,maxBytes,signal,redirect:'error',headers:{'Accept-Encoding':'identity'}})` must be an independently trusted bounded read-only transport. It must disable redirects and stream-cap before allocating a whole response, honor abort/timeouts, and must not forward preview credentials to public hosts. This module supplies no bypass headers. Return `{url,status,redirected:false,headers,body:Uint8Array}` with actual raw identity bytes; headers may be a Headers object or lowercase-key object. URL must match exactly, status 200, MIME correct, no nonidentity content encoding, content length if present exact. Body strings, truncation, oversize and redirects fail. A caller that fabricates transport output is outside the trust boundary.

All four artifacts require exact observed length and SHA. PDF and PNG signatures and basic reader document framing are checked, but this is not PDF/image decoding or HTML sanitization. Incoming reader bytes are never executed or rendered here. The immutable manifest must come from separately validated artifacts.

Edition HTML uses a portable copy of the reviewed `cloud-newsroom-v2-http-qa.mjs` quote-aware start-tag tokenizer. It skips comments and raw-text contexts, rejects duplicate attributes/template/base/noscript interpretation, and requires one exact canonical link, one plain escaped H1 title, the exact `time` date, and an actual same-origin PDF anchor. Ordinary relative exported links such as `../../../magazine/...` are resolved against the exact edition URL and must land on the exact expected artifact path. Schemes, network-relative links, entities, percent encoding, query strings and fragments are rejected. Reader presence requires either an exact resolved reader artifact anchor or the real export’s single `article[data-trusted-daily-reader="ltc-inert-html-v1"]` bound through aria-labelledby to the edition’s reader H2 ID; raw reader bytes are independently fetched and hash-checked in either case. This marker proves only structural presence, not the displayed story body: domain observations explicitly separate `readerArtifactBytesVerified:true` from `readerMarkerObserved`, and always set `renderedContentEquivalence:false` and `visualQaVerified:false`. Even an empty/forged body with the expected marker and H2 cannot gain semantic or visual equivalence authority. Separately reviewed build code, artifact admission and rendered-reader review remain prerequisites. It is a conservative markup profile, not a browser DOM or sanitizer. Nested H1 formatting and unsupported reader links hold for review rather than false-pass. No arbitrary marker substring is treated as a link.

## Receipt and sequence

Preview requires provider-observed READY, exact project/team/repository/branch/commit, nonproduction target, and sanitized API deploymentHostname exactly equal to the trusted preview hostname before any preview HTTP read. Before finalizing preview, a separately configured instance of the actual read-only Vercel adapter checks the baseline deployment against its own exact source commit and branch, requiring READY production and both domains listed. The timestamped baseline observation and provider-response digest are included, with a 120-second TTL that caps the preview receipt. Missing trusted baseline source/branch holds new preview/public receipts; read-only production reconciliation remains available. A successful fresh preview is retained privately in this instance. Ordinary public QA requires that preview to remain fresh, a production API observation listing both exact domains, then independent four-artifact and edition readbacks on **both** public hosts.

Receipt fields include candidateDeploymentId, sourceCommit, projectId, expectedBaselineDeploymentId, manifestSha256, planSha256, evidenceSha256, phase, checkedAt, expiresAt, fresh, providerResponseSha256 and domainObservations containing each artifact hash/length/MIME plus edition HTML hash. Expiry is the earlier of all evidence/plan deadlines and checkedAt+120 seconds. Freshness is checked before and after reads. No stale artifact is relabeled fresh.

Every result retains `publicationVerified:false`, `promotionAllowed:false`, `mutationPerformed:false`, `atomic:false`. These observations are not authorization. A future provider must use an independently trusted `loadVerifiedQa` path and exact receipt binding, never caller-supplied booleans.

`reconcileProduction()` can run read-only after expiry or restart without a preview receipt. It reports exact current observations and `reconciliationOnly:true`, with `fresh:false` and a past expiry when source evidence has expired. It cannot authorize a new promotion, retry an uncertain mutation, claim novelty, or refresh stale research. API read errors retain the existing read-only adapter's session hold; callers must review before a new session.

## Deliberate remaining gaps

- Baseline observation is actual API readback but sequential/nonatomic. A production mutation gate must independently verify current baseline immediately before a change. Baseline branches must fit the existing read-only adapter’s reviewed `agent/…` profile; unsupported branches hold rather than broadening that adapter.
- Alias/API/HTTP reads are sequential, not atomic and not a provider-level fencing guarantee.
- No durable receipt archive, approval loader, production wiring, source semantic approval, image/PDF visual QA, or network implementation is introduced.

Tests include exact relevant markup from the actual portable November 16 revision 2 export. Setting `LTC_RELEASE_QA_EXPORTED_FIXTURE` to that local full exported HTML additionally exercises the full document; the full-export test was run successfully, not skipped. Tests otherwise use synthetic exact bytes and actual existing read-only adapter logic over mocked GET/HTTP responses. They check all four artifacts, both domains, spoofing, redirect/MIME/length errors, stale/future timestamps, proof expiry, readonly reconciliation and disabled zero-call behavior. No real service request or mutation was performed.
