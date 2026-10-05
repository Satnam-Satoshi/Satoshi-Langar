# LTC official policy records

Added October 5, 2026. This read-only collector supports the founder-requested SEC/CFTC coverage with bounded, dated agency press-release records. It does not create political opinion, interpret legal effects, decide whether an allegation is true, or infer a ruling from a headline. Source collection is separate from edition acceptance and publication.

## Official source discovery

The [SEC press-release page](https://www.sec.gov/newsroom/press-releases) links its **Press Releases RSS Feed** to `https://www.sec.gov/news/pressreleases.rss`. The [CFTC RSS directory](https://www.cftc.gov/RSS/index.htm) links **General Press Releases** to `https://www.cftc.gov/RSS/RSSGP/rssgp.xml`. Those official pages were inspected on October 5, 2026. The two directly linked feeds are the complete, hard-coded request registry; no search result, third-party mirror, browser session, credential or workaround supplies records.

| Source ID | Fixed endpoint | Accepted record links |
| --- | --- | --- |
| `sec-press-releases` | [SEC press releases RSS](https://www.sec.gov/news/pressreleases.rss) | Exact `https://www.sec.gov` origin and `/newsroom/press-releases/YYYY-NNN-slug` path |
| `cftc-press-releases` | [CFTC general press releases RSS](https://www.cftc.gov/RSS/RSSGP/rssgp.xml) | Exact `https://www.cftc.gov` origin and `/PressRoom/PressReleases/NNNN-YY` path |

The existing SEC HTML availability source is a separate endpoint. Its previously recorded HTTP 403 remains valid historical evidence about that retrieval. The official RSS endpoint returned HTTP 200 in this check. A future 403 from either feed becomes `unavailable` with `errorCode: http_403` and an empty item list; the collector makes no retry, alternate-host request or bypass attempt.

## Acceptance boundaries

- One request to each fixed HTTPS feed per invocation, concurrently. Redirects are refused. The complete fetch and body read have a 15-second deadline and a 2,000,000-byte ceiling. Declared oversized lengths, streaming overflow, empty responses and invalid UTF-8 fail closed. Only RSS/XML response types are accepted.
- The RSS 2.0 channel must identify `Press Releases`, the exact agency home URL and, when present, the exact agency `xml:base`. Record links cannot contain credentials, ports, queries, fragments, escapes, whitespace or unrecognized paths. No linked article is fetched.
- The bounded XML reader checks nesting and duplicate required fields, caps depth and node count, accepts XML predefined/numeric entities and literal CDATA, and rejects declarations such as DTD/external entities, processing instructions and script elements. It never evaluates source text or imports descriptions, article bodies, source instructions or personal author metadata.
- Each retained record contains only a stable URL-derived ID, the agency's plain-text headline, the official article URL, its normalized RSS `pubDate` timestamp, and `classification: official-press-release`. Dates must include a recognized explicit offset, agree with their weekday, be possible calendar/time values and not be in the future. Normalizing `-0400` to UTC preserves the same instant. Neither retrieval time nor a future event mentioned in a title becomes the publication date.
- All feed records are validated before selection. A malformed, duplicate, future-dated or unrecognized record fails that whole source rather than silently hiding it. The two newest records within 30 elapsed days of collection are retained. Older records are omitted; a valid feed with no eligible records is `collected` with `items: []`. A recent retrieval does not make an old record breaking news.
- The body SHA-256 is over fetched bytes before decoding. A parse failure may retain that hash with no accepted records. Transport failures have a null hash. These hashes support integrity comparisons; they are not agency signatures, proof of authorship or independent verification.

Consumers must render titles and summaries as escaped text, such as React text children, with an explicit agency attribution. Never pass them to `dangerouslySetInnerHTML`. `policyRecordSummary(source, item)` provides deterministic original wording: the agency published a press release with the specified official RSS timestamp, and the headline/link are attributed to the agency. It does not paraphrase the underlying legal action. Classification as a press release does not classify its underlying content as a final rule, adopted proposal, court finding or proven allegation.

## Integration contract

The library at `scripts/lib/ltc-policy.mjs` exports:

```js
const snapshot = await collectPolicy({ now, fetcher }); // Both options are optional; injected for tests.
validatePolicySnapshot(snapshot, { now });             // Throws on invalid input; returns snapshot otherwise.
const summary = policyRecordSummary(source, item);     // Plain-text original attribution sentence.
```

The exact schema is:

```json
{
  "schemaVersion": 1,
  "collectedAt": "UTC timestamp at completion",
  "sources": [{
    "id": "fixed source ID",
    "title": "fixed source title",
    "url": "fixed feed URL",
    "status": "collected or unavailable",
    "checkedAt": "UTC retrieval/check timestamp",
    "sha256": "64 lowercase hex characters, or null",
    "errorCode": "allowlisted failure code, or null",
    "items": [{
      "id": "source ID plus URL digest prefix",
      "title": "plain-text agency headline",
      "url": "accepted official record URL",
      "publishedAt": "official RSS publication instant normalized to UTC",
      "classification": "official-press-release"
    }]
  }]
}
```

Validation requires both exact source identities once each, exact object keys, valid statuses/hashes/errors, bounded item counts, unique IDs/URLs, descending publication timestamps and valid date relationships. Snapshots older than 24 hours or dated in the future are rejected. Validation checks structure and the acceptance rules; it cannot authenticate arbitrary replacement headline text without the original response bytes. Collection provenance and the saved snapshot digest must remain part of the release evidence.

With Node 22, from the repository root:

```sh
node --test scripts/test-ltc-policy.mjs
node scripts/collect-ltc-policy.mjs --stdout
node scripts/collect-ltc-policy.mjs --output /private/tmp/ltc-policy-NEW-RUN.json
```

The output path must have an existing parent and must not already exist. Exclusive creation and mode `0600` preserve earlier evidence. There is no default public destination. Exit 0 means at least one feed was structurally collected; exit 2 means both are unavailable; exit 1 indicates CLI or validation failure. A successful collection can contain no eligible headlines and is not an edition freshness gate or publication claim. The CLI never edits an edition archive, publication policy, scheduler, website or deployment.

Offline tests cover official identities, time zones and original dates, sorting/history, XML entities and CDATA, malicious/malformed input, URL tricks, impossible/future dates, duplicate records, 403, redirects, content types, body limits, invalid UTF-8, abort handling, private error redaction and snapshot tampering.

## First private check

The snapshot collected at `2026-10-05T04:15:07.793Z` accepted both feeds and four records. SEC's selected records have official RSS timestamps `2026-10-01T16:16:07.000Z` and `2026-10-01T15:03:35.000Z`; CFTC's have `2026-10-01T13:06:31.000Z` and `2026-09-24T14:46:00.000Z`. They are dated official records, not four new announcements on October 5. The private snapshot is `work/ltc-flagship-2026-10-05/policy.json` under the shared workspace root, outside the app repository and public export. No edition or deployment was performed by this collector task.

## Agent governance

| Requirement | Scope for this work |
| --- | --- |
| Mission | Add bounded, factual SEC/CFTC public-record collection for daily LTC coverage. |
| Responsibilities | Validate source identities, URLs, dates, safe text and retrieval limits; test; preserve private evidence and document gaps. |
| Knowledge sources | Official SEC/CFTC source-directory pages and the two RSS endpoints above; repository governance and pipeline documentation. |
| Permissions | Read public feeds; create this library, CLI, tests and documentation; save a private snapshot. No credentials, money, transactions, political opinion, publication or deployment. |
| Escalation rules | Unsupported or malformed data stays unavailable. Feed identity/format changes require a reviewed code change; do not broaden hosts or infer missing facts. |
| Memory scope | These source boundaries, tests, hashes and dated private snapshot only; no persistent personal-data collection. |
| Audit trail | Deterministic normalized records with original publication time, retrieval timestamps, body hashes, explicit errors and an exclusively created snapshot. |
| Human owner | Satnam Satoshi founder. |
| Emergency stop | Stop invoking the collector. It installs no scheduler; any future integration must honor the existing publication pause switch before publishing. |
