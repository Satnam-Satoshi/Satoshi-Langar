# Satnam.x Version 1

Satnam.x is the public website of the Satnam Satoshi Foundation: an open-source humanitarian institution focused on service, education, evidence-led Treasury Intelligence, and responsible human–AI collaboration.

## Version 1 surfaces

- Home — mission, public products, latest-report state, and participation
- Treasury Intelligence — read-only evidence and classification model
- Lunch Time Conversations — newspaper, editorial, video, and research archive
- Satoshi Langar — mission, Proof of Seva, pilot, volunteering, and roadmap
- Community — contribution pathways for developers, designers, researchers, writers, and volunteers
- Open Source — architecture, roadmap, issues, and contributor model
- About — mission, Founder, Constitution, governance, and transparency

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- shadcn/ui-owned component primitives backed by Radix
- Framer Motion available for restrained, reduced-motion-safe interaction
- Vercel Preview deployment target
- Supabase/PostgreSQL architecture prepared but not connected in this increment

## Local verification

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm dev
```

The build uses Next.js webpack mode for compatibility with constrained local and CI environments. All public content routes are statically generated; existing API routes remain server-rendered.

## Release boundary

This repository may create Vercel Preview deployments from review branches. Production merge, production-domain publication, financial integration, wallets, custody, and transactions require explicit Founder approval from Amardeep Baba G Malhotra.

Treasury Intelligence is research-only and read-only. It does not custody assets, execute trades, or provide individualized financial, legal, tax, accounting, or fiduciary advice.
