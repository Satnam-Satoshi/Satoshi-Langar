# Dormant direct GitHub source reader

`createGitHubReadOnly({fetch, branch, networkEnabled:false, resolveSecret?, secretReference?, timeoutMs:10000})` exposes only `readBranch()`, `readCommit(sha)`, `readTree(sha)`, `readBlob(sha)` for the canonical Satnam-Satoshi/Satoshi-Langar repository. The branch is independently configured once at construction, not supplied by a model per request. It is a read scope, not approval to build or publish that branch. Full lowercase 40-character object IDs are required. No caller URLs, mutation methods, ref updates, connector imports, ambient credentials, retries or schedules exist.

Defaults perform no network or secret lookup. Explicitly enabled reads use injected standard fetch, fixed official HTTPS origin, GET, manual redirects, exact response URL, a 10-second total secret/request/stream deadline, bounded streaming bytes, quota checks and fail-closed instance latching. Optional direct credentials resolve only in memory from an independently approved secret reference. Public unauthenticated reads need no token. Token grants should be GitHub repository Contents:read only; code scope does not narrow a broad token. No real token or provider request has been tested here.

Blob responses have strict base64/size checks, actual Git blob SHA-1 header+bytes validation and additional content SHA-256. Nonrecursive tree responses must be untruncated and contain safe unique immediate paths/modes; canonical Git tree bytes are reconstructed and hashed. Symlinks/submodules are deliberately held. A tree read does not mean recursive inventory completion. The caller must walk every subtree and independently bound the aggregate inventory before admission.

Commit REST JSON is identity-bound to the requested SHA and canonical repository URL, with bounded parent/tree fields, **not** a reconstruction of raw signed commit bytes. `objectBytesVerified:false` is explicit for commits and mutable branch observations. A separate actual Git-object observer remains needed where cryptographic commit verification is required. Branch reads are snapshots, not locks. Neither object hashes nor authenticated API responses grant editorial, security, deployment or public-readback approval.

No mutation adapter is included. GitHub REST reference updates are not advertised as a hard expected-old-SHA compare-and-swap or an exclusive writer fence. Those unresolved workflow guarantees must not be inferred from this read-only interface.

Official REST contracts consulted November 17, 2026:
- https://docs.github.com/en/rest/git/refs#get-a-reference
- https://docs.github.com/en/rest/git/commits
- https://docs.github.com/en/rest/git/trees
- https://docs.github.com/en/rest/git/blobs

API version header follows current official examples (`2026-03-10`). Tests use synthetic fetch response/stream fixtures only, not live GitHub compatibility. Run `node --test tools/standalone-runtime/test/github-readonly.test.mjs` under Node22. Collector diagnostic tests use synthetic transports only; no actual Core/source rerun was performed.
