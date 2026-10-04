import type { LtcEdition } from '../data/editions';
import styles from './ltc-coverage.module.css';

const statusLabels: Record<string, string> = {
  'sampled-observations': 'Dated observations',
  'dated-upstream-record': 'Dated software record',
  'reference-only': 'Reference context',
  'not-monitored': 'No daily observation',
  'edition-design': 'Edition page',
};

export default function LtcCoverage({ edition }: { edition: LtcEdition }) {
  if (!edition.coverage) return <aside className={styles.legacy}><p>The complete reading map was introduced after this edition. Its original saved record remains unchanged.</p><a href="/conversations/desks/">Explore today’s 29-section reading map →</a></aside>;
  const coverage = edition.coverage;
  return <section className={styles.coverage} id="all-sections" aria-labelledby="all-sections-title">
    <header className={styles.heading}><div><p className={styles.kicker}>The complete issue / 29 sections</p><h2 id="all-sections-title">Every page.<br/><em>Nothing hidden.</em></h2></div><p>Markets, builders, public policy and the communities behind them. Open a section for the context saved with this issue. A reference is not a fresh measurement; unavailable numbers stay unavailable.</p></header>
    <div className={styles.legend}><span>01–29 / the original reading sequence</span><a href="/conversations/desks/">Browse the current desk guides ↗</a></div>
    <div>{coverage.pages.map(page => <details className={styles.entry} key={page.page} id={`coverage-page-${page.page}`}>
      <summary><span className={styles.number}>{String(page.page).padStart(2, '0')}</span><span className={styles.title}>{page.title}</span><span className={styles.status}>{statusLabels[page.status] ?? page.status.replaceAll('-', ' ')}</span><span className={styles.plus} aria-hidden="true">+</span></summary>
      <div className={styles.expanded}><p className={styles.summary}>{page.summary}</p>
        {page.context && <><p className={styles.date}>Saved educational context · reviewed {page.context.reviewedAt} · AI-prepared, independent human review pending</p>{page.context.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {page.context.sections.map(section => <section className={styles.section} key={section.heading}><h3>{section.heading}</h3>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className={styles.citations}>{section.sourceIds.map(id => { const source = page.sources.find(item => item.id === id); return source ? <a key={id} href={source.url}>{source.label} ↗</a> : null; })}</div></section>)}
          <aside className={styles.checklist}><h3>What to look for</h3><ul>{page.context.checks.map(check => <li key={check}>{check}</li>)}</ul><p>{page.context.limits}</p></aside>
        </>}
        {!!page.sourceChecks?.length && <div className={styles.checks}><h3>Source checks saved with this issue</h3>{page.sourceChecks.map(check => <p key={check.id}><a href={`#source-${check.id}`}>{edition.sources.find(source => source.id === check.id)?.title ?? check.id}</a> · {check.status.replaceAll('-', ' ')} · checked {check.checkedAt}<br/><small>Effective {check.sourceAsOf ?? 'date not established'} · {check.freshness.replaceAll('-', ' ')}{check.metricLabels.length ? ` · ${check.metricLabels.join('; ')}` : ' · No parsed observation'}</small></p>)}</div>}
        {!!page.sources.length && <details className={styles.references}><summary>Reference shelf · {page.sources.length} sources</summary><ul>{page.sources.map(source => <li key={source.id}><a href={source.url}>{source.label} ↗</a><small>{source.kind} · citation link, not a daily collection claim</small></li>)}</ul></details>}
        <a className={styles.visit} href={page.href}>{page.deskId ? 'Visit the current desk guide' : `Go to ${page.title.toLowerCase()}`} →</a>
      </div>
    </details>)}</div>
    <p className={styles.footnote}>This record preserves the guide text and evidence status at publication. Later guide edits do not rewrite this edition. The sourcebook identifies the measurements actually collected. <a href="/conversations/reference/">The original design’s 26-source notebook remains available.</a></p>
  </section>;
}
