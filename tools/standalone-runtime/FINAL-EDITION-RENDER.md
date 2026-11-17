# Separate final-candidate rendering (dormant)

This is not a draft flag toggle, publication approval, or live newsroom. The existing draft renderer and default disabled entrypoint are unchanged. A separately typed final-render input is recomputed from retained source bytes and an authenticated source-review signature, then requires a second signature with the narrower `render-final-candidate` purpose. It produces a final **candidate**, always `publicationAllowed:false` and `publicationExecuted:false`.

## API

`prepareFinalEditorialReview({preparation,clock})` takes:

- `preparation.issue`: exact `{id,date,title,dek}`.
- `preparation.sourceReview`: exact `{trustPolicy,signedReview,configuration,reviewEnvelope,collection}`, consumed by the existing `createSignedReviewAuthority` and retained `prepareEditorialFromCollection` path. Raw supplied `reviews` Maps or a `prepared:true` claim are not accepted.

It returns `final-editorial-review-material` with exact editorial input and SHA256, collection/source-commit/signed-source-review digests, original issue, all collection gaps and the earliest source/signature/evidence deadline. Missing source review, substituted bytes, binding gaps or unassigned/unsupported factual claims hold. Unavailable source coverage remains explicitly present in the generated gap sections and signed input; it is not silently dropped or called ecosystem-complete.

`finalEditionCanonical(value)` provides bounded canonical JSON. `finalEditionDecisionBytes(decision)` returns domain-separated signing bytes (`LTC-STANDALONE-FINAL-RENDER-V1` followed by canonical JSON); it never signs.

Final trust policy exact fields:
`schemaVersion:1,purpose:'render-final-candidate',sourceCommit,keySha256,publicKeySpkiBase64,reviewerReference,notBefore,expiresAt,revoked:false`.

Final decision exact fields:
`schemaVersion:1,purpose:'render-final-candidate',sourceCommit,keySha256,reviewerReference,issue,rendererInputSha256,collectionSha256,sourceReviewPayloadSha256,issuedAt,expiresAt,gapsDisposition:'retain-all-explicit-gaps'`.

`prepareFinalEditionArtifacts({preparation,decisionBytes,signatureBase64,trustedReviewer,workRoot,clock,executeEnabled:false})` verifies canonical exact decision bytes (duplicate/noncanonical JSON rejected), an Ed25519 signature under the independently pinned enrolled public key, both signature scopes/deadlines, and exact title/dek/story/fact/date/gap structure. It recomputes the retained source pipeline itself before rendering. The final signature authorizes rendering the exact already source-reviewed structure; it does not independently establish factual truth, authorize publishing, or substitute for the source-review signature.

No key enrollment, reviewer identity discovery, private key, signature service or genuine editorial approval is provisioned here. Caller-provided trust configuration is not self-authenticating. Deployments must obtain trust policies independently with revocation/review procedures. A fixture key never represents the owner.

## Actual local artifacts

New `renderer/final_render.py` renders a separate typed envelope. It imports only the reviewed local draft module's input-validation/font constants and wrapping helper, not the draft rendering function. The Python CLI alone is not an authorization boundary and has no signing/provider capability. The Node wrapper owns signature and expiry validation.

Outputs: `edition.pdf`, inert `reader.html`, `cover.png` (1080×1350), `promo.png` (1200×630), and private `render-manifest.json`. The manifest records actual page count, exact four artifact hashes/lengths, signed decision digest, Python/ReportLab/Pillow versions, font hash and both Python implementation hashes. The four public-role artifacts exclude this private provenance sidecar. Returned paths/bytes/hashes and pages are verified from actual local files; bounded O_NOFOLLOW reads reject symlinks and concurrent file changes. Basic PDF/PNG signatures are not a complete file-format or visual audit.

The final pages explicitly say “FINAL EDITION CANDIDATE - NOT PUBLISHED”. Historical event/as-of/retrieval dates, limitations and all coverage gaps are retained. HTML escapes text and is exercised through both the portable inert reader inspector and the actual application's verified-reader parser when repository source is present. The latter is intentionally unavailable in the isolated portable image, where the inert-profile test remains mandatory. Font-unsupported content holds rather than silently replacing characters.

Source/decision expiry is rechecked before rendering and after artifact readback. If it expires during work, bytes are retained as `final-candidate-artifacts-stale`, with no retry or publication authority. Exact artifact-specific admission, visual/content QA, release authorization, source-to-container provenance and verified public readback remain separate requirements. Local implementation files and fonts must be pinned by the deployment's reviewed build; recording hashes does not authenticate that build.

## Synthetic lifecycle fixture

`smoke/final-editorial-fixture.mjs` exports `createSyntheticFinalEditorialFixture({synthetic:true})`. It uses mock retained HTML and generated ephemeral test keys only. It returns preparation, both test-enrollment inputs, final trust policy, material, decision bytes/signature and `signDecision(material,patch)` for explicit tests. Fixture capture is 14:08 UTC, source review 14:09, final render decision 14:09:30, clock 14:10 and expiry 14:11 on November 17, 2026. The original fact is historical (2020-01-01), not recast as fresh news. Title/dek say “Synthetic lifecycle exercise” and explain that neither news nor owner approval is real.

Tests run actual local ReportLab/Pillow rendering, byte hashes, historical dates, explicit gaps and parser compatibility; missing/revoked source/final signatures, substituted title/dek/evidence, duplicate JSON and expiry hold. No cloud/model/Buffer calls, credentials, source retrieval from the Internet or publication occur.
