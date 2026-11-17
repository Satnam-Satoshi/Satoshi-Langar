# Dormant exact deployment promotion composition

This separate adapter does not change the held promotion method in vercel-release.mjs. `createVercelPromotion({plan,vercel,read,journal,loadApproval,clock,networkEnabled:false,promotionEnabled:false}).advance()` is default-disabled, and was exercised only with synthetic HTTP/approval/state fixtures. No real provider mutation, token, OAuth, schedule, runtime configuration or production guard changed.

The independently configured immutable `plan` is the actual createReleaseQa plan, including exact deployment/project/team/source/branch, four-artifact manifest, both canonical domains, expected baseline deployment/source/branch, source observation deadlines and edition identity. Its canonical digest and artifact digest enter the approval and journal identity. No caller-supplied verified:true/QA boolean is accepted. The module directly instantiates and invokes the actual createReleaseQa implementation and existing Vercel read-only adapter with independently injected HTTP.

`loadApproval({action:'promote-exact-deployment',identity,key})` must load an authenticated owner decision with exact identity, action, bounded reference, notBefore and expiresAt. Identity includes projectId,teamId,canonicalrepository,branch,candidateDeploymentId,sourceCommit,manifestSha256,planSha256,expectedBaselineDeploymentId and exact domains. The callback's authenticity/ownership remains an external trust boundary, not a cryptographic property of passing JSON.

## Sequence and journal

1. Read independently initialized durable canonical journal. Exact schema is `{version,record}`: null only at0; attempting only at1; acknowledged only at2. Non-null records have exact key,identity,phase,approvalReference,previewQaSha256. Missing or malformed history HOLDs.
2. Obtain exact approval; perform actual preview four-artifact/edition/provider-hostname checks and actual baseline READY/source/branch/both-alias observation. Check earliest source/QA/approval deadline.
3. Resolve approved token in memory; persist promotion intent with CAS then actual readback before any POST.
4. Repeat actual preview+baseline checks after intent. Recheck deadlines immediately before action. If anything changes, retain intent and HOLD without retry.
5. One POST to `https://api.vercel.com/v10/projects/{projectId}/promote/{deploymentId}?teamId={teamId}`, no body/settings/alias override. Only documented201/202 is acknowledgment, not publication. Persist acknowledgment via CAS/readback.
6. Invoke actual read-only production reconciliation: exact provider identity plus both domains' four immutable artifact bytes and edition HTML. Return observed results with publicationVerified:false. Stale source evidence is explicitly labeled; it never becomes fresh publication authority.

Any existing attempting/acknowledged phase is reconciliation-only, even after approval/source expiry. Unknown network/durable outcomes never repeat POST. An interrupted intent before any actual request can therefore require manual resolution; safety takes precedence over automatic progress. Acknowledged resumes do not rewrite the journal. Source expiry never prevents observing a possibly already completed effect, but never authorizes a new effect.

## Remaining guarantees and limits

The durable read/cas journal implementation, canonical initialization/history migration, real owner approval source, plan/evidence authenticity, protected preview HTTP authorization, secret resolver and production activation remain externally reviewed configuration. No empty ledger is implicitly created. The private full QA receipt is returned but not automatically archived; archival policy/durable evidence retention is a separate prerequisite to an operational workflow.

This is cooperative coordination, **not provider-side fencing**: aliases can change between final baseline GET and POST, external writers may exist, and Vercel mutable build/environment settings are not pinned by Git SHA. No settings/bypass/control changes are made. In-flight abort cannot establish that a POST had no effect. Read-only nested QA may finish within its own timeout after outer timeout; no late promotion is initiated afterward. Post-promotion verification reports observed bytes, not ongoing monitoring, whole-ecosystem completeness or general autonomy.

Official requestPromote schema independently read November17,2026 from https://openapi.vercel.sh and https://vercel.com/openapi.json: POST v10 project/deployment promotion, no request body,201/202, no rebuild. No real provider compatibility proof is claimed.

Run Node22 `node --test tools/standalone-runtime/test/vercel-promotion.test.mjs`: seven synthetic full-composition tests include success, default-off, both-domain bytes, baseline drift before/after intent, expiry, uncertain restart, and strict journal history. Existing preview adapter remains unchanged.

### Application review boundary

The themed-reader marker is only an observed marker, not rendered-content equivalence. QA explicitly reports renderedContentEquivalence:false and visualQaVerified:false. Neither those markers nor exact raw artifact bytes prove whole application correctness. The independently authenticated owner/review process supplying loadApproval must separately examine and bind the actual application source/build and immutable artifact manifest, including content and visual QA where required. That external application review/admission is not implemented or inferred here; adding an arbitrary reviewed:true boolean would not close it. The sourceCommit, manifestSha256 and planSha256 in exact approval identity prevent substitution of that reviewed candidate but do not prove that a review occurred.
