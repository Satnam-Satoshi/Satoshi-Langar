# Cloud marketing renderer v1.1.0 — source-only distribution

Private preparation tool. No scheduler, network client, credentials, Buffer calls, publication authority or activation.

## Run
From this directory: `python3 -B -m unittest -v`.
With independently reviewed real metadata and separate evidence: `python3 renderer.py METADATA.json --evidence EVIDENCE.json --validate-only`, then use `--output-dir NEW_DIRECTORY` to render.
Dependencies: Python3, Pillow, Inkscape, DejaVu Sans regular/bold at standard Linux font paths. No installation performed by tool.

Bundled example metadata, evidence and extraction are explicitly SYNTHETIC UNIT TEST FIXTURES, not research. All identifiers, hashes and accounts there are placeholders. Never publish them or treat booleans as verified claims. Fixed test clock keeps regression fixtures reproducible; production CLI checks actual current date.

Renderer checks measured widths, XML escapes text, limits render subprocess to60seconds, reserves output exclusively, prevents overwriting, binds metadata to separately supplied hashed evidence, and always sets publishAllowed=false. New render visual QA remains pending. Integrity does not establish authenticity: trusted researcher/root must independently read actual sources and verify platform-specific account outbound links, exact story claims/stage and publication bindings.

Renderer 1.2.0 supports legacy_public_readback and canonical_daily_published_readback bindings. The nonpublishing adapter in scripts/cloud-newsroom-v2-marketing-adapter.mjs requires independently verified public daily-v2 artifact readback, trusted story outlines and source/tag evidence. It does not publish, host assets or schedule campaigns. No claim of unattended full marketing. Root alone owns canonical deduplication, source approval, Library retention, public hosting, scheduling and publication. Existing controls and posts are untouched.

No live source extraction, real publication/deployment receipts, account data, operational IDs or generated proof images are included. Generic LTC Magazine/Satnam Satoshi public branding is intentionally part of the template.

Cloud CI uses Ubuntu24.04 official distro packages: Inkscape, python3-pil and fonts-dejavu-core. Runtime versions are logged; this is not a fully hermetic image build. Set LTC_MARKETING_PYTHON to the Python with Pillow installed when running the actual PNG integration test. The suite performs real rendering and strict PNG admission rather than silently skipping unavailable dependencies.

Per-story tag relevance remains an independently reviewed editorial decision. Verified account ownership alone is not relevance or endorsement. Batches of two preserve pending stories; a prepared cover is neither hosted nor sent. The current daily publication gate admits only four edition artifacts, so separately reviewed public marketing-asset hosting and persistent campaign deduplication are still required.

## Nonproduction backlog and hosting proposal

The separate marketing-backlog module persists every accepted outline story and every requested platform pair. Batch size two limits work per step, not campaign coverage. Rendered, hosted and publicly confirmed are distinct states. GitHub storage uses its own per-issue file, a durable first-issue claim, blob-SHA CAS and exact readback. Missing known state and uncertain writes hold without retry. Limits are 500 stories and 1 MiB per issue; capacity holds never truncate history.

Preparation expires at the earliest publication/source/tag deadline, capped at 24 hours and shortened by any supplied policy expiry. Rendering and new post reservations recheck this deadline; a future sender must independently refresh editorial claims, relevant official account evidence and authority before sending. Hosting image readback alone is not editorial freshness. External intents survive restart and require reconciliation, never blind resend. No Buffer client, schedule or sending authority is implemented by this bookkeeping.

The separate marketing-hosting module proposes an append-only public manifest and exact derived PNG paths. It permits neither application/config changes nor edits to the daily four artifacts. Historical records remain immutable, with original dates. New records require fresh evidence and a short review window. This proposal is not wired into deployment admission or promotion, and has no production authority. Actual connector persistence, public hosting and sender integration remain unproven for these new modules. Trusted input authentication and cooperative single-writer ownership remain external obligations, not guarantees supplied by a hash.
