# Dormant platform policy, checked 2026-11-17

Pure `validateMarketingPlatformRequest({policy,expectedPolicySha256,now,post,accountLimits,publishedEvidence})` returns held or dormant-request-validated. It has no HTTP, secret, account lookup, draft-save or schedule path. Every result has executeAllowed:false. Prepared input saveToDraft:true is NOT an actual saved draft. The policy deliberately permits only routine invitations in this phase, at most one per platform per America/New_York date. The documented two-distinct-policy-update X allowance is retained in the pinned definition but is not implemented as an automatic action class.

Exports: MARKETING_POLICY_DEFINITION, marketingPolicyCanonical, validateMarketingPlatformRequest. Policy exact `{definition,checkedAt,expiresAt}` must match the fixed definition and externally provided SHA256 of canonical bytes. Its validity is at most7days; this is a conservative local review window, not a vendor guarantee. Definition freezes official source URLs/checkdate and technical caps separately from restrictive campaign controls. A hash supplied by the same untrusted producer is not independent authorization.

Post fields: platform (`twitter` or `instagram`), channelId, caption, storyUrl, mediaUrl, mediaAlt, growthUrl (null or exact canonical RSS/subscribe URL), dueAt, verifiedHashtags, campaignKind (`routine` only), storyId. All are exact-schema. Media is one canonical public PNG; alt is nonempty bounded printable ASCII and bound to evidence. Fixed AI-assisted/disclosure true is appropriate only after independent original-AI-graphic render review. No user tags or mentions.

Caption grammar is deliberately restricted: printable ASCII plus LF; exactly one whitespace-delimited bound story URL and optionally one bound growth URL, no duplicates or other URL-like words. Each allowed URL counts23 on X; all remaining accepted ASCII characters count1. Instagram counts UTF16 units and each LF counts2, max2196. No unsupported Unicode/CR/tab or arbitrary URL counting approximation. Hashtags are up to3 exact unique independently verified ASCII tokens. This can conservatively hold ambiguous punctuation/domain-like text. Growth `/subscribe/` requires independent live opt-in proof upstream, not merely an allowed URL. RSS needs real feed evidence.

accountLimits exact: channelId,platform,observedAt,expiresAt (max60seconds),enabled,accountPublishingRemaining,requestWindows (exact windows900/86400/2592000, each remaining/resetAt),campaignDate,routineCount,policyStoryIds,observationSha256. These values must come from independently authenticated current observations and canonical history, including existing scheduled/reserved slots. Unknown account posting allowance or request quota holds. Request budgets are NOT posting permissions; no plan or premium account inferred. No quota reservation occurs here.

publishedEvidence exact: channelId,storyId,storyUrl,mediaUrl,mediaAltSha256,growthUrl,captionSha256,mediaSha256,verifiedHashtagsSha256,dueAt,observedAt,expiresAt (max60seconds),bothDomainsVerified,publicMediaVerified. Hashes bind exact strings/canonical hashtag array. Claimed flags are not authentication: output explicitly authenticationVerified:false, quotaReserved:false, schedulingAuthorized:false. Trusted runtime loaders remain mandatory; no arbitrary assertion should enter them.

Current Buffer request input includes needsApproval:false, saveToDraft:true, mode customScheduled, schedulingType automatic, aiAssisted:true, exact dueAt. IG metadata is type post/shouldShareToFeed true/isAiGenerated true; X metadata is isAiGenerated true. Image alt text resides in `assets[].image.metadata.altText`, NOT image.altText.

Official references reviewed:
- https://developers.buffer.com/guides/character-limits.html (IG2196; X280 standard; counting rules)
- https://developers.buffer.com/types/CreatePostInput.html (required schema fields; draft is not scheduling)
- https://developers.buffer.com/types/InstagramPostMetadataInput.html
- https://developers.buffer.com/types/TwitterPostMetadataInput.html
- https://developers.buffer.com/types/ImageAssetInput.html and https://developers.buffer.com/types/ImageMetadataInput.html
- https://developers.buffer.com/guides/api-limits.html (shared request windows, actual headers required)
- https://developers.buffer.com/guides/hosting-media.html (stable public media, no upload API)
- https://docs.x.com/fundamentals/counting-characters (weighted URL handling; general Unicode needs proper implementation)

Meta's direct publishing limits have conflicting general100/carousel50 daily statements; do not infer an account's remaining quota. Direct Meta JPEG constraints are not identical to Buffer's documented PNG input support. Existing campaign policy remains stricter than technical maxima. No account writes or plan changes were performed or authorized by this module.

## Separate action-specific quota proposal

New `validateMarketingPlatformActionRequest({...existingArgs,action,quotaPolicy,expectedQuotaPolicySha256})` preserves the original validator's strict numeric-capacity behavior. The new entrypoint accepts only `create-draft` or `create-scheduled-post`. It requires independently pinned exact quotaPolicy `{action,quotaMode,reference,checkedAt,expiresAt,evidenceSha256}` valid for at most60seconds. `create-draft` requires private-draft-not-applicable; `create-scheduled-post` requires provider-enforced-scheduling. It accepts accountPublishingRemaining:null only, explicitly returning accountCapacityKnown:false. Neither mode manufactures an account quota observation.

All original current request windows, account/channel observation, restrictive one-routine-per-platform/NYdate, canonical content/media evidence and policy gates remain. The prepared input sets saveToDraft:true only for create-draft; scheduled proposals set false. Every output remains executeAllowed:false/schedulingAuthorized:false. The concrete executor must independently bind exact action, quota-policy digest, final request bytes and action-time approval, retain provider typed-limit rejection as a known rejected result, and reconcile uncertain results without blind retry. Policy evidence is not itself an execution approval.

This alternative is grounded in Buffer's CreatePostInput documentation that private drafts skip posting-limit checks, and its documented LimitReachedError/MutationError handling for provider enforcement. It is not a guarantee that an accepted scheduled post will publish. Missing limit telemetry does not imply capacity; no new Meta authentication or account upgrade is inferred.
