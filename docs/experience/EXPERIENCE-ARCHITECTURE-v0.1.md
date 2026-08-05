# SSCOS Website Information Architecture, Wireframes, and Design System

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Working Draft |
| Owner | Product Design Lead |
| Related Volume | Engineering Program |
| Related Chapter | Public Experience |
| Dependencies | ADR-0001; MVP Definition |
| Approval Status | Pending Human Founder Approval |

## Information architecture

```text
/
├── /treasury
│   ├── /entities
│   ├── /entities/{slug}
│   └── /changes
├── /conversations
│   └── /{slug}
├── /langar
│   └── /{yyyy-mm-dd}
├── /about
├── /methodology
├── /sources
├── /corrections
├── /accessibility
├── /privacy
└── /terms
```

The global header exposes Satnam.x, Treasury, Conversations, and Satoshi Langar. Methodology, sources, corrections, privacy, terms, and accessibility are institutional support routes, not additional products.

## Page contracts

- **Satnam.x home:** mission, four-surface orientation, latest approved highlights, trust/provenance explanation, and no speculative dashboard.
- **Treasury directory:** search/filter verified public entities; freshness and methodology visible; custody and beneficial ownership distinguished.
- **Treasury entity:** current verified position, history, source trail, confidence, update time, and corrections.
- **Conversations archive/detail:** approved title, date, participants, summary, media, transcript status, topics, and accessibility information.
- **Langar archive/detail:** daily edition, section navigation, claim confidence, sources, stale markers, and correction history.

## Low-fidelity wireframes

```text
DESKTOP
┌ Satnam.x ─ Treasury ─ Conversations ─ Satoshi Langar ─ About ┐
│ Mission statement + one primary orientation action             │
│ [Treasury latest] [Newest conversation] [Today's Langar]       │
│ How evidence works: source → verification → publication         │
└ Methodology · Sources · Corrections · Privacy · Accessibility ─┘

MOBILE
┌ Satnam.x                                     [Menu] ┐
│ Mission                                                │
│ [Explore Treasury]                                     │
│ Latest Treasury update                                 │
│ Newest Conversation                                    │
│ Today's Satoshi Langar                                 │
└ Trust links and legal footer ──────────────────────────┘
```

All data pages include loading, empty, stale, error, corrected, and source-unavailable states. A stale state never silently presents old data as current.

## Design system v0.1

### Principles

Calm institutional clarity; evidence before decoration; readable density; progressive disclosure; visible system status; keyboard-first operation; and no color-only meaning.

### Tokens

- Typography: one highly legible sans family for interface; optional restrained serif for editorial display only.
- Type scale: 14, 16, 20, 24, 32, 48 px with minimum 16 px body on public pages.
- Spacing: 4 px base; 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 4 and 8 px; avoid decorative pill saturation.
- Color roles: canvas, surface, text, muted text, border, action, focus, success, warning, error, and provenance confidence. Every pair meets WCAG 2.2 AA.
- Motion: functional, reduced-motion aware, 150–250 ms, no essential information in animation.

### MVP components

Header, footer, skip link, breadcrumb, button, text link, input, select, checkbox, tabs, table, pagination, card, notice, stale-data banner, confidence label, source citation, correction marker, transcript block, empty state, error state, skeleton, and disclosure. Each component requires keyboard behavior, accessible name, focus state, contrast, responsive rules, and content guidance.

## Acceptance criteria

Four surfaces are recognizable but visually unified; navigation works at 320 px and above; content remains usable at 200% zoom; keyboard and screen-reader flows are complete; no essential information depends on color; every material data view exposes freshness and provenance; and Phase 2 calls-to-action are absent.
