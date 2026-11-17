# Read-only public artifacts to candidate Git plan

`src/github-candidate-plan.mjs` closes the local artifact-to-object-plan step. It does not upload, update refs, create deployments or approve publication. Network is off by default; even read-only provider access requires explicitly configured credentials where needed. All included tests use synthetic Git objects and fake SDK/HTTP services.

## API

```
createGitHubCandidatePlanBuilder({
  github, approvedInputs, trustedInputsSha256, clock,
  networkEnabled: false
}).build({registryBytes, artifacts:{pdf,reader,cover,promo}})
```

`github` is the fixed canonical repository read adapter configuration and fixed existing `agent/standalone-candidate` branch. No arbitrary endpoints or mutation callbacks are called. `approvedInputs` has exactly:

```
{
  baselineCommit, baselineTree, editionDate, revision,
  recordSha256, registrySha256,
  artifactDigests:{pdf,reader,cover,promo},
  commit:{author:{name,email,date},committer:{name,email,date},message},
  expiresAt
}
```

`candidatePlanInputsSha256(approvedInputs)` computes the canonical configuration digest. The matching `trustedInputsSha256` **must be independently retained and authenticated**; computing it from an untrusted request does not establish approval. The inputs bind exact public bytes and commit metadata, not private provenance, credentials, controller state or new semantic authority. Author/email metadata is public if a later separately authorized upload runs.

Input byte arrays are copied, strictly bounded and hash-checked before reading the provider. Registry <=1MB, each public artifact <=2MB, total <=8MB. Only the registry plus exactly four typed public artifacts are accepted. No path supplied by the caller is used as an upload destination.

## Actual baseline, planned candidate

The builder reads the exact current branch, pinned commit metadata and every complete nonrecursive baseline Git tree using the existing bounded raw-tree-hash-verifying reader. It rejects mismatched/truncated/unsafe trees, symlinks/submodules, malformed paths and excessive graph size/depth. Bounds match the existing complete candidate observer:2048 distinct tree reads,40000 expanded entries,20000 files, depth32,1024-byte full paths, provider blob metadata size bounds. Unchanged blob contents are not downloaded; raw tree hashes bind old path/mode/object IDs, while old size metadata remains provider asserted. REST commit metadata is not raw commit-byte or signed provenance verification.

The existing registry path must exist as a regular file. The only replacements/additions are:
- `content/ltc-pdf/issues.json`
- `public/magazine/daily/<date>/r<revision>/edition.pdf`
- the same directory's `reader.html`, `cover.png`, `promo.png`

All old tree entries remain unchanged except the registry pointer/content; existing edition files cannot be overwritten. Changed complete tree objects are rebuilt bottom-up in Git byte order; unchanged subtrees and already-existing content-addressed blobs are reused. The unsigned single-parent commit has fixed approved metadata and exact computed SHA. Unsupported metadata/normalization holds; there are no defaults to current author/email/time.

The generated plan is checked by `prepareGitObjectPlan` and the existing full data-only checker through a **local planned-object overlay**. Actual baseline reads remain real injected reads, but generated candidate responses are synthetic local representations and are never reported as provider observations. This validation preserves the ordered registry history, rejects drafts, verifies exact new record/artifact digests and fixed routes, and inspects the inert reader HTML profile. Renderer provenance stays private and is excluded. An independent expected hash does not authorize active HTML or historical rewrites.

A finite monotonic60-second/approval-expiry deadline is checked around each request and await; branch identity is reread at the end. This read-only snapshot is not a branch lock or provider CAS. Success returns `candidate-object-plan-prepared`, exact `plan`, derived `identity`/`key`, baseline observation summary, and bounded timestamps with `plannedOnly:true`, `candidateProviderObserved:false`, `publicationAllowed:false`, `previewAllowed:false`.

## Composition and limits

The returned `plan` is accepted directly by the existing dormant object transport. That transport separately reruns the planned checks, obtains scoped upload approval, persists per-effect intents, performs exact objects, then executes the checker against actual provider objects. The test suite exercises real builder → concrete Firestore journal → mocked object POST/readback → actual-provider-path checker; no services or credentials are used.

The builder does not convert the standalone editorial draft registry into a final approved edition or authenticate source/editorial review. Genuine final record projection, authentic input/approval loading, production GitHub serialization compatibility, initialized durable store/IAM, branch hooks, build/application review and later release gates remain separate prerequisites. No existing guard, default entrypoint or producer is changed.

Run `node --test test/github-candidate-plan.test.mjs`. Current9 tests cover deterministic actual-baseline construction, strict bytes/trust pins, unsafe/private inputs, clock drift/expiry, corrupted roots, author injection/future dates, active HTML/history rejection and the full synthetic object-chain composition.
