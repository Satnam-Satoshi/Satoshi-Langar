# Satnam Satoshi Product Experience Benchmark

## Document control

| Field | Value |
|---|---|
| Version Number | 0.1 |
| Revision Date | 2026-08-05 |
| Status | Active Product Research Asset |
| Accountable Office | Office of Research |
| Related Product Organizations | Treasury Intelligence; Satnam.x Website; Open API; Developer Platform |
| Dependencies | Product Mode directive; Experience Architecture v0.1; OpenAPI v1 Draft |
| Approval Status | Research evidence; product decisions remain governed |

## Research question

Which evidence-backed interaction patterns from premium information and developer products should shape Satnam Satoshi’s public beta without copying their brands or visual identities?

## Primary-source observations

| Source | Observed principle | Product implication for Satnam Satoshi |
|---|---|---|
| [Linear — A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh) | Dense products should preserve information richness while allowing navigation and support elements to recede behind the primary task. | Treasury pages prioritize the evidence-bearing table and selected entity; global navigation remains quiet. |
| [Linear — UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh) | Consistent headers, navigation, and view controls improve scanning and orientation across workflows. | Every product uses one header grammar, one filter grammar, and one trust-status grammar. |
| [Vercel — Web Interface Guidelines](https://vercel.com/design/guidelines) | Inline help precedes tooltips; all states are designed; numbers use tabular alignment; status has redundant non-color cues; semantic HTML and accurate accessible names are foundational. | Freshness, confidence, classification, corrections, errors, and source unavailability are visible text—not hidden tooltips or color-only badges. Tables use tabular numerals and semantic markup. |
| [Notion — Views, filters, sorts and groups](https://www.notion.com/help/views-filters-and-sorts) | The same structured dataset can support multiple purposeful views, with explicit filter and sorting controls. | Treasury Intelligence starts with a canonical table and later permits separately named views; filters never change the underlying evidence. |
| [Notion — Intro to databases](https://www.notion.com/help/intro-to-databases) | Each database item can open into a detailed page while the collection provides overview and context; permissions distinguish content editing from structural control. | Entity rows link to evidence-rich entity profiles. Public read access remains structurally separate from editorial/data administration. |
| [Stripe — Dashboard basics](https://docs.stripe.com/dashboard/basics) | Product settings are grouped by personal, account, and product concerns, with role-differentiated access. | Future administration must separate product/editorial/data/security controls. The public beta exposes none of them. |
| [Stripe — Security](https://docs.stripe.com/security) | Trust is reinforced through explicit, maintained security posture rather than decorative claims. | Public trust copy points to methodology, sources, corrections, and governance evidence; it avoids unsupported “secure” or “verified” marketing language. |

## Adopted experience principles

1. **Evidence is the interface.** Source, observation date, retrieval date, authority, confidence, classification, and correction state accompany material claims.
2. **Density earns hierarchy.** The most decision-relevant content receives contrast; navigation and utilities recede.
3. **One dataset, purposeful views.** Table, change feed, and entity profile share canonical definitions rather than recomputing facts independently.
4. **No hidden trust state.** Stale, provisional, estimated, corrected, unavailable, and verified states are stated in words.
5. **Overview to evidence.** Users move from the directory to entity history to the exact source without losing context.
6. **Inline explanation first.** Classification and methodology are explained where encountered; long methodology remains available for depth.
7. **All states are designed.** Dense, sparse, empty, loading, error, stale, corrected, and source-unavailable states receive intentional layouts.
8. **Read-only means visibly read-only.** Public experiences contain no ambiguous edit, trade, account, alert, or transaction controls.
9. **Accessibility is structural.** Semantic tables, keyboard flow, focus visibility, accessible names, redundant cues, and stable skeletons are acceptance criteria.
10. **Brand restraint.** Satnam Satoshi looks institutional and distinct; benchmark products inform quality, not imitation.

## Rejected patterns

- Decorative KPI cards without traceable meaning.
- Ranking entities without comparable effective dates and ownership classifications.
- Hiding methodology, stale states, or source limitations behind generic information icons.
- Color-only confidence or gain/loss signals.
- Infinite filter complexity before the canonical data model is understood.
- Public dashboard controls that imply accounts, trading, custody, personalization, or execution.
- Marketing superlatives unsupported by auditable evidence.

## Product application: Treasury Intelligence directory

The initial production screen uses:

- a calm institutional header and one clear product title;
- a visible “data as of” line and methodology link;
- three meaningful filters only: asset, classification, and evidence state;
- a semantic entity table with exact assets, balances, classification, effective date, evidence state, and source count;
- an expandable evidence drawer that retains directory context;
- explicit disclaimers that values are research observations, not financial advice or transaction functionality;
- no market-price total, ranking, percentage change, or mNAV until methodologically comparable sources are approved.

## Validation checklist

- [ ] Primary task remains visually dominant at desktop and mobile widths.
- [ ] Every material number exposes effective date, classification, evidence state, and sources.
- [ ] Status meaning survives grayscale and screen-reader use.
- [ ] Filters are understandable without documentation and preserve canonical semantics.
- [ ] Dense/sparse/empty/error/stale/corrected states are all represented in design review.
- [ ] No benchmark brand’s distinctive visual identity is copied.
- [ ] Public/internal naming follows ADR-0006.

## Research conclusion

Premium institutional UX is not created by visual ornament. It emerges from consistent hierarchy, rigorous state design, fast orientation, disciplined density, accessible semantics, and evidence that remains visible at the moment a user evaluates a claim. Treasury Intelligence should lead Satnam Satoshi’s product system because its trust requirements force these qualities into reusable components for every later product.

