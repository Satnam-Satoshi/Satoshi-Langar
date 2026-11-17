# Inert desk review rendering

Preparation-only local HTML, not wired to any route, publisher, schedule or deployment.

`renderDeskPreview(input, {syntheticFixture:false})` calls `compileDeskCoverage(input)` directly to recompute source freshness and gaps from independently pinned raw evidence at the injected clock. It does not accept a trusted `status`/`current` flag or infer freshness from an edition CTA. Inputs retain the coverage adapter's trust contract and source-policy requirements.

Output has a single HTML string, bounded display summary, `publicationAuthorized:false`, `wholeSiteFreshnessVerified:false`, `effects:[]`. No IO is performed by the renderer. An adapter may save this outside the repo for local review, but this function has no upload or publishing capability.

Safety and truthfulness:
- Fixed orange editorial CSS only; no candidate CSS/HTML/scripts/URLs. Every payload/key/label is HTML escaped.
- No scripts, tracking, images, forms or external assets. Restrictive CSP; source references navigate only on an explicit click and come from exact independently pinned registry URLs. No payload-authored URL becomes a link.
- Prepared preview notice always visible. Current source checks, stale evidence, historical record and unverified gaps are distinct. Reported publication receipts are explicitly not render verification. Historical dates remain original.
- Null is displayed as `Unavailable (null)`; zero remains `0`.
- All registry desks and source gaps remain visible. All retained revision identities/dates/statuses remain in a separate archive list. At most20records have full payload cards. Payload recursion/text/item budgets are explicit and announced; HTML has a512KiB hard cap. No silently hidden stale history behind a newer value.
- Semantic headings, labelled articles/sections, time elements, lists, native details, skip link, keyboard focus styles, responsive single-column layout below600px and AA normal-text color-contrast checks.

`synthetic-fixture.mjs` is test data only. It uses actual registry source identities but invents observations; it is not reporting. Set `syntheticFixture:true` for a prominent fixed SYNTHETIC TEST FIXTURE label. Do not publish it.

Run `node --test tools/desk-rendering/test-desk-rendering.mjs`.

Visual QA limitation: local fixture saved outside repo at `/tmp/ltc-desk-visual-20261117/preview.html`. Installed Chromium headless screenshot attempts failed with `socket() failed: Operation not permitted`. Available browser tool rejects `file:` URLs by protocol policy. No screenshot or desktop/mobile visual pass is claimed. Static responsive/semantic/contrast checks passed; a permitted browser render, keyboard and screen-reader review remain outstanding. This is not a full WCAG conformance claim.

Additional non-browser MuPDF wide/narrow document-flow smoke inspection preserved readable disclaimers, dates and null/zero distinctions. Its limited modern CSS and details/summary fidelity does not resolve the outstanding browser responsive visual/accessibility checks. No browser visual pass is claimed.
