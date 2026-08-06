# Satnam.x Executive Build Report — Day 3

| Field | Value |
|---|---|
| Version | 1.0-day-3 |
| Revision date | 2026-08-06 |
| Status | Preview candidate |
| Owner | Office of Product and Design |
| Final approver | Amardeep Baba G Malhotra |
| Deliverable | Satnam.x Version 1 public website |

## Outcome

The homepage hero was redesigned around a calm visual metaphor for shared service and public evidence. The previous operational status card was replaced by an open circular record connecting need, consent, and evidence. Typography, focus visibility, visual hierarchy, motion restraint, and the mobile first viewport were refined.

A bespoke Satnam Satoshi social-preview image was created and connected to Open Graph and X metadata. It uses the site's forest, ivory, and restrained gold palette without cryptocurrency imagery or promotional language.

## Experience improvements

- Stronger first-viewport storytelling and more memorable institutional identity.
- Reduced card-heavy dashboard language in the hero.
- Clearer Proof of Seva accessibility semantics.
- Visible global keyboard focus treatment.
- Motion respects reduced-motion preferences.
- Desktop and mobile screenshots verified visually.

## Quality evidence

Lighthouse was run against the local production build:

| Category | Score |
|---|---:|
| Performance | 96 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

- Largest Contentful Paint: 2.7 s in the throttled Lighthouse run.
- Cumulative Layout Shift: 0.
- Total Blocking Time: 10 ms.
- Production build and TypeScript validation passed.

## Preview

- Founder-review preview: https://https-github-com-satnam-satoshi-satoshi-langar-a4n9npmq6.vercel.app
- Status: ready and verified through the authenticated Vercel health endpoint.
- Environment: preview; no production deployment or domain promotion performed.
- Scheduled automation was disabled only in the uploaded preview package because the Hobby plan does not support the repository's twice-daily cron expression. The tracked production configuration was preserved.

## Progress

Version 1 completion is estimated at 49%. The experience foundation is approaching Founder Review quality; the remaining work is concentrated in the Treasury Intelligence product, publication archive, contribution workflows, source-backed content, and preview deployment verification.

## Risks and gates

- Vercel preview creation awaits secure session authorization.
- The existing Vercel project's Git link references a legacy repository; preview deployment must remain isolated and manual until corrected.
- Public release, production-domain publication, legal copy, and treasury data policy require Founder approval.
