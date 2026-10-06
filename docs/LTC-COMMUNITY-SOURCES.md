# Litecoin community source desk

Added October 5, 2026 for the founder-requested daily Litecoin community coverage. This collector reads two fixed public sources. It does not post to a social account, scrape X, import article bodies, install a wallet, send a notification, publish an edition or add a scheduler.

## Source discovery and limits

| Source | Exact request | What may be retained |
| --- | --- | --- |
| Litecoin Foundation news | `https://litecoin.com/news/rss.xml` | At most one plain-text Foundation headline, original RSS publication time and official article link |
| Litecoin Foundation Nexus releases | `https://api.github.com/repos/litecoin-foundation/nexus/releases?per_page=10` | At most one stable release version, original GitHub `published_at` time and exact repository release link |

The [official Foundation news index](https://litecoin.com/news) was inspected October 5. The RSS endpoint on that same official host reported an RSS response type in the web lookup, but the direct public request returned HTTP 403. **Its live RSS structure has not yet been accepted by this collector.** It remains unavailable until its exact source identity and parser gates succeed on a later bounded attempt. The conservative channel-link requirement is `https://litecoin.com/news`; a different format requires review, not an automatic relaxation. The separately viewed news index currently lists a May 28, 2026 article first. Neither that listing nor a fresh request makes it October news.

The [Foundation website](https://litecoin.com/) links the [Foundation's GitHub organization](https://github.com/litecoin-foundation), which lists [Nexus](https://github.com/litecoin-foundation/nexus). The public GitHub release API is this project's own release stream. It is a second independent source within this collector, not a mirror or a way around the Foundation website's failed request. Litecoin Core releases remain in the existing base collector and are not fetched again here.

The request registry is fixed in `scripts/lib/ltc-community.mjs`. No URL in a feed can cause a network request. Each normal invocation performs one unauthenticated request per source, with no retries, pagination, redirect following, alternative host, proxy, cookie, token or browser session. HTTP 403 and HTTP 429 remain explicit failures. Each source has a 15-second deadline including body reading and a 2,000,000-byte limit. Responses must have the expected XML/JSON content type and valid UTF-8. Private transport details are reduced to allowlisted error codes.

## What counts as an accepted item

- RSS records must have one title, link and publication date. The XML reader checks balanced structure, depth, node count and duplicate required fields; it rejects DTD/external entities, processing instructions and active markup. Descriptions and article bodies are never imported. Source content is data, never an instruction.
- Accepted article links use the exact HTTPS `litecoin.com` origin and `/news/lowercase-slug` path. Queries, fragments, ports, credentials, escaped paths and lookalike hosts fail. RSS dates must be possible calendar/time values, have an explicit accepted time zone, agree with their weekday and not be future-dated.
- Nexus records require a positive release ID, exact `litecoin-foundation/nexus` API record and HTML release URLs, a matching stable semantic version tag, explicit boolean draft/prerelease flags and a nonfuture UTC `published_at`. Drafts and prereleases are excluded. The displayed title is deterministically `Nexus vX.Y.Z`, not copied marketing text. Release notes, names, asset lists, author metadata and download links are not imported; no release is installed or endorsed.
- Records older than 90 elapsed days are omitted. Selection takes at most one newest record from each source, with a maximum 25-word headline. All candidate RSS entries are validated before selection, so a malformed or future record fails that source rather than being silently hidden. An available feed with no eligible records has status `collected` and contributes no item.
- Item publication time stays distinct from source check time and collection time. A daily check can legitimately yield the same August release. Render it as a dated source record, never as “today's news,” a fresh software release, independent verification or an investment recommendation.

This is a small official-source desk, not an exhaustive view of the Litecoin community. Foundation press material is first-party communication, not independent reporting. Topic coverage, source reachability and a new request timestamp do not validate financial metrics or imply all community news has been captured. No numbers, market rates, network statistics or human opinions are derived here.

## Integration contract

```js
import {
  collectCommunity,
  validateCommunitySnapshot,
} from './scripts/lib/ltc-community.mjs';

const snapshot = await collectCommunity();
validateCommunitySnapshot(snapshot, { now: new Date().toISOString() });
```

The strict schema is:

```json
{
  "schemaVersion": 1,
  "collectedAt": "UTC timestamp at collection completion",
  "sourceStatus": [{
    "id": "fixed source ID",
    "sourceName": "fixed source display name",
    "url": "fixed request URL",
    "status": "collected or unavailable",
    "checkedAt": "actual UTC check timestamp, or null when explicitly deferred",
    "sha256": "raw response-byte SHA-256, or null",
    "errorCode": "allowlisted code, or null on success"
  }],
  "items": [{
    "id": "source ID and URL-derived digest prefix",
    "sourceId": "fixed source ID",
    "sourceName": "fixed source display name",
    "title": "attributed headline or deterministic Nexus version title",
    "url": "accepted official article/release URL",
    "publishedAt": "original source publication instant normalized to UTC",
    "summaryClassification": "official-foundation-headline or official-software-release"
  }]
}
```

Validation rejects extra fields, substituted source identities, inconsistent source state, duplicate item IDs/URLs, unknown classifications, bad dates and snapshots older than 24 hours or in the future. Items must refer to successfully collected sources, and their dates cannot be later than that source's check. Items are globally ordered newest first. A retained body hash is an integrity check, not an issuer signature or proof that a source's claims are true. Accepted provenance still requires the actual raw bytes and retrieval receipt.

Consumers must render text through escaped text children, not raw HTML. Display `publishedAt` next to every item. Show `checkedAt` separately and render a null value as “Not requested in this run.” Label source failures and empty results honestly. The Foundation's `deferred_by_operator` record is not a successful request or a newly observed 403. It exists only to avoid a repeat attempt after a failure already observed during the same work session.

## Collection and evidence

From the repository root using Node 22:

```sh
node --test scripts/test-ltc-community.mjs
node scripts/collect-ltc-community.mjs --stdout
node scripts/collect-ltc-community.mjs --output /PRIVATE/EXISTING-PARENT/new-snapshot.json --evidence-dir /PRIVATE/EXISTING-PARENT/new-evidence
```

Optional `--defer-foundation` skips the Foundation request explicitly. Omit it on a normal later daily run to make the one permitted attempt. There is no generic configurable-source or arbitrary-URL option.

Output files use exclusive creation and mode `0600`. The evidence directory must be new, outside the application directory and have an existing parent; it is created mode `0700`. For each fetched, bounded successful response, the collector preserves the original body and a receipt containing source ID, actual check time, byte count and SHA-256. Even a parsing failure preserves those bounded bytes. HTTP failures have no imported body. A raw-evidence write failure aborts the run rather than pretending provenance was saved. The resulting snapshot is also preserved in the evidence directory.

Exit 0 means at least one source was structurally collected. Exit 2 means neither source was collected. Exit 1 means CLI, persistence or snapshot validation failed. A source may be collected with no retained item. None of these exit codes means a website update happened. The collector has no deployment, Git push, credentials, email or wallet operations.

`content/ltc-community/latest.json` is the website input, copied only after a verified fresh collection. It is separate from immutable daily editions. A future publishing integration must explicitly collect/validate it, archive the old snapshot privately, include it within the accepted release guard, and honor publication pauses and source/implementation review. This module alone does not update a heartbeat or change its authorized file list. Rebuilding from an archived snapshot must validate it against its recorded collection/publication clock while preserving the original visible dates; new publication must satisfy current freshness gates.

## First checked snapshot

At **2026-10-05T17:04:14.891Z**, a fresh Nexus request was collected and saved with its raw bytes. The selected stable release is **Nexus v1.3.3**, originally published **2026-08-05T18:21:31.000Z**. This is dated release context, not a new October 5 release. Body SHA-256: `6d3b0e9a988e9dc71c82f4d62fff245d6048dc4920482240aa68e444c0998eec`.

The Foundation request was explicitly deferred because discovery had already observed its HTTP 403; its `checkedAt` is null. No retry, workaround or invented article entered the source snapshot. Private evidence is under the shared workspace's `work/ltc-specials-2026-10-05/community/`, outside the application repository. The snapshot was validated and copied to `content/ltc-community/latest.json`; publication is a separate parent release task.

Eleven offline tests cover exact source identity, original publication dates, quote bounds, 90-day selection, invalid/future dates, hostile XML and URLs, stable-release eligibility, 403/429/no-retry behavior, explicit deferral, transport/body limits, evidence failures and snapshot tampering.

## Agent governance

| Requirement | Scope |
| --- | --- |
| Mission | Create a bounded official Litecoin community source desk for LTC Media. |
| Responsibilities | Source discovery, parsing, dates, limits, testing, explicit failures and private raw evidence. |
| Knowledge sources | Official Litecoin/Foundation site, Foundation-owned GitHub organization and Nexus release API; repository governance and policy collector patterns. |
| Permissions | Public read-only collection and new library/CLI/test/docs/snapshot files assigned by the parent task. No deployment or account changes. |
| Escalation rules | Unavailable sources remain unavailable; source or parser identity changes need review. Never infer missing news or evade restrictions. |
| Memory scope | Dated source records, method documentation and private public-response evidence; no member or credential data. |
| Audit trail | Source dates, check dates, body hashes, explicit errors and exclusively saved private response bytes. |
| Human owner | Satnam Satoshi founder. |
| Emergency stop | Stop invoking the collector; any scheduler integration must obey the existing publication pause. |

## Community Wire and saved checks · October 5, 2026

The illustrated Community Wire links the founder-requested 13 public account names to relevant project references. It is a reading directory, not a claim of current ownership verification for every handle, completed follows, endorsement or an active X reader. Four separately researched historical selections cover LitVM privacy plans (August 26), Nexus gift cards (May 28), LiteForge testnet guide (April 17) and the Foundation’s June 29, 2025 Summit recap. They retain original dates and limitations. See app/data/community-wire.ts for exact citations. These selections are implementation, not automatic daily headlines.

The new archive CLI and record pages preserve each accepted two-source check and its gaps. The October 5 evening Foundation request failed exact feed identity; its response hash is retained, and no record from that feed was accepted. Nexus still supplied the original August 5 release. This does not add a source, relax parsing, or refresh old source dates. Read LTC-LIVING-NEWSROOM.md for the reader journey, editorial roles and search roadmap.
