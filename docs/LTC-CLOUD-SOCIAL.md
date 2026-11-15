# Daily news-specific cloud social job — inactive acceptance packet

Prepared October30,2026 America/New_York. **Cloud social publication remains inactive.** The existing LTC Publisher and its canonical ledger remain authoritative until a coordinated accepted transfer. No Buffer post, draft, schedule or account was changed by this implementation.

## Responsibility and limits

Mission: market verified daily readings with useful source-specific invitations, not generic repeated welcome copy. Responsibility: fixed official Buffer transport, dated deterministic plans, durable reservations and supported readback. Human owner: Satnam Satoshi founder. Sources: AGENTS.md, the current LTC publishing skill and canonical operating plan/directive/handoff/publication state, published editions and source desk, official Buffer MCP and MCP HTTP specifications. Permissions: isolated code/tests/private plans; no live posting, new scopes, account changes, ads, financial activity or protected merge. Escalate missing identity, changed schemas, pause, duplicate/cap conflict or uncertain delivery. Memory: minimal private reservations, source/media hashes and returned IDs. Emergency stop: both the unconditional cloud-social acceptance gate and private ledger pause. No replies, DMs, likes, follows, deletes, generic GraphQL or personal-account publishing.

The October30 canonical ledger records eight already scheduled owner campaign posts across October30–November1. They must be reconciled and imported; this code never replaces or reschedules them. Limits remain four X/two Instagram total posts per NewYork date, at most one routine invitation per platform and two distinct source-specific policy/builder updates on X. Existing owner reservations count toward the total. Routine copy defaults to no mentions/cashtags; it never manufactures an unverified handle. Older campaign texts and their permissions are not rewritten.

## Transport and read-only acceptance

`cloud-ltc-social.mjs` uses only `https://mcp.buffer.com/mcp` and protected-environment `LTC_BUFFER_API_KEY`. It does not read desktop OAuth, browser sessions, credential files or alternate endpoints. The approved new key is an independent cloud recipient; encrypted provisioning does not prove its account/schema compatibility.

The client implements JSON-RPC initialize/initialized, negotiated MCP HTTP headers/session IDs, bounded JSON or streaming SSE, tools/list pagination, response-ID checks and timeouts. HTTP429 retains Retry-After; no request is automatically replayed. Session loss/ambiguous writes hold. Incoming instructions are data, not executable authority.

Only six methods are available: get_account, list_channels, list_posts, get_post, create_post and edit_post. Schemas are discovered before any call. Arguments are checked against the actual schema; unsupported constraints fail closed. Writes additionally require explicit opt-in and accepted schema hashes. Generic tools/GraphQL, unknown post IDs, unrelated organizations/channels, immediate sharing and arbitrary metadata edits are rejected.

Organization and channels are fixed:

- organization `6ac43ae95e79770297e9d2be`;
- X `6ac43ee86a5c39ccb6286633`;
- Instagram `6ac45c816a5c39ccb6296dc8`.

No API-key organizational scoping is assumed: Buffer documents account-wide reach, so this client enforces its own narrower allowlist. Identity, connected service and complete queue pagination must verify before admitted work. Unknown response shapes are retained privately with an unverified status; they are not guessed into acceptance.

Read-only command:

```sh
node scripts/cloud-ltc-social.mjs --probe --receipt /absolute/private/new-buffer-probe.json
```

The new acceptance-probe job in the inactive ops/main-update template can run this with protected credentials before publication gates open. It also probes the exact selected Google folder without inventing a production document ID. Google token refresh is the only authorization POST; no Drive resource is created by that probe. A disabled API, denied scope/file access and unproved ownership are distinct safe results. The job publishes only protocol shapes, schema hashes and access booleans, never raw account/post data or keys. Raw receipts are not uploaded to public-repository artifacts.

## Real daily input and plan

The real run path reads the accepted website private checkpoint, current public edition JSON, source-desk bytes at its immutable GitHub commit and the dated public graphic manifest. Raw SHA256 must match the website's bound publication provenance. The published edition must be today's NewYork edition with a completed, current-date public verification; stale local files are insufficient. The current PNG is fetched and checked against its signature/hash before a new draft is sent.

Plans use actual edition feature titles and original source/event/check dates. They retain classification such as non-binding LOI and distinguish observed from published dates. Updates older than seven days, unverified dates, financial quotes/metrics and already-reserved source events are skipped. No “breaking” labels, independent findings or deadline calculations are invented. Missing eligible material remains a gap, not filler. Headline summaries explicitly direct readers to the original and its limits.

The planner creates one issue-specific invitation per available platform slot and up to two distinct policy/builder updates on X, reduced by existing reservations and passed windows. It preserves America/New_York daylight-saving offsets. Late runs skip passed slots rather than backdating a post. The daily original news-map PNG contains real story titles and source dates; no private Drive URL is used as public media.

Private planning command:

```sh
node scripts/cloud-ltc-social.mjs --plan --input /absolute/private/verified-input-packet.json --receipt /absolute/private/new-plan.json
```

The packet contains edition/sourceDesk objects, their exact optional `editionRaw`/`sourceDeskRaw` JSON strings, the bound releaseProof, graphic metadata and canonicalLedger. `loadAcceptedSocialInputs` builds this from real cloud state for the future admitted job. A private plan is neither a Buffer draft nor a scheduled post.

## Durable ledger and effects

Use a separately provisioned private Google Doc with explicit config `ledgerKey:"social"`. Website configuration still defaults strictly to `website`; arbitrary namespaces fail. Existing website state cannot be overwritten with a social envelope. Social migration imports known IDs and reservations into a paused ledger, and requires explicit readback IDs for pending entries. No local canonical ledger is mutated. Pause/cutover ownership and the canonical snapshot hash must be accepted before acquiring the cloud social lease.

CAS reservation precedes every create. The durable status changes to create-uncertain before the API call; a timeout never triggers another create. Returned IDs are captured before content verification. Only verified private drafts become draft records. Scheduling edits that same ID using a future customScheduled timestamp and a real allowed-action string supplied from the accepted readback settings; it does not create another post. Unknown create without an ID requires explicit review. Known schedule uncertainty reconciles only via get_post. No lease is stolen after expiry.

The actual entry point is wired behind `assertCloudSocialAcceptance()`, which unconditionally rejects publication today:

```sh
node scripts/cloud-ltc-social.mjs --publish --state-config /absolute/private/social-state.json --website-state-config /absolute/private/website-state.json --settings /absolute/private/reviewed-buffer-settings.json --receipt /absolute/private/new-social-receipt.json
```

Settings contain only acceptedSchemaHashes, observed Instagram service metadata and the observed editAction. They cannot supply credentials or change endpoints/channels. Key material is environment-only. Instagram settings and schema compatibility require real cloud private-draft acceptance, not guesses from mocks. Scheduled and Buffer-reported sent states are separate from independently verified public delivery; the job does not mark a scheduling response publicly published.

The social ledger warns at500KB and stops at850KB. It never expires uncertain posts or discards history. Proof-backed social archival/rotation is not integrated yet; the early capacity warning and retained timestamp must be acted on before that limit. Website ledger compaction is separate and already implemented. The warning is not a claim of an unlimited archive.

## Remaining acceptance

1. Read the real protected Buffer endpoint with the independently approved key; review actual schemas/output shapes, exact account/channels, permissions and quotas. Credentials being stored is not this proof.
2. Finish the selected Google folder/Docs API/Picker access, provision the exact separate social ledger and migrate/reconcile all canonical reservations, including the eight owner campaign posts. Do not infer a document ID or broaden Drive scope.
3. Run one explicitly controlled private cloud draft/readback and same-ID scheduling acceptance under reviewed reservation/ownership controls. Verify media, alt text, required AI disclosure, quota behavior, uncertain outcomes and public delivery before routine activation. Existing desktop delivery checkpoints do not establish the new cloud identity.
4. Review exact implementation/digests, capacity/retention and the protected main workflow. Transfer the single social writer only after reconciliation and cutover approval. The website and social gates remain closed; there is no duplicate recurring writer installed here.

## Primary references

[Buffer MCP tools and constraints](https://developers.buffer.com/guides/integrations/mcp.html/), [official API-key header configuration](https://developers.buffer.com/guides/integrations/other-ai-tools.html), [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) and [initialization lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle). Documentation establishes the supported protocol; mocks do not prove live authorization or posting.
