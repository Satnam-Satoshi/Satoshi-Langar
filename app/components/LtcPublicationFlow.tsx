import LtcPdfIssue, { pdfIssue } from './LtcPdfIssue';
import { latestLtcEdition, ltcPublicationDays, editionDateHref, formatEditionDate } from '../data/editions';
import { editorialSpecials, specialHref, specialArtwork } from '../data/editorial-specials';
import { LtcEditionCover } from './LtcEditionPresentation';
import styles from './LtcPublicationFlow.module.css';

export function LtcCurrentIssueBanner() {
  return <nav className={styles.currentBar} aria-label="Current daily issue"><a href={pdfIssue.page}><span>LATEST DAILY · <time dateTime={pdfIssue.date}>{formatEditionDate(pdfIssue.date)}</time></span><strong>{pdfIssue.title}</strong><b>Read this issue ↗</b></a><div><a href="#special-editions">Special editions ↓</a><a href="/conversations/archive/">Past issues ↗</a></div></nav>;
}
export function LtcCurrentIssueFeature() { return <LtcPdfIssue/>; }

export function LtcPublicationShelf() {
  const previous = ltcPublicationDays.slice(0, 4);
  return <section className={styles.library} id="special-editions" aria-labelledby="special-editions-title"><div className={styles.heading}><div><p className={styles.kicker}>A different shelf / The longer read</p><h2 id="special-editions-title">The special editions.</h2></div><a href="/conversations/archive/">Open the complete library ↗</a></div><div className={styles.specials}>
    <article><a className={styles.specialCover} href="/conversations/specials/proof-of-birthday/" aria-label="Read Proof of Birthday"><img src="/magazine/proof-of-birthday/cover.jpg" width="1024" height="1536" loading="lazy" alt="Silver birthday candles on an open ledger, original Proof of Birthday cover art."/><span>LTC / THE ANNIVERSARY SPECIAL<strong>Proof of<br/><em>Birthday.</em></strong></span></a><h3><a href="/conversations/specials/proof-of-birthday/">84 pages. Fifteen years.</a></h3><p>Litecoin’s people, milestones and institutional story.</p><small>Advance edition · Research through October 4<br/>Planned cover October 15 · Founder reviewed October 4</small></article>
    {editorialSpecials.map(s=><article key={s.id}><a className={styles.specialCover} href={specialHref(s.slug)} aria-label={`Read ${s.subject}: ${s.title}`}><img src={specialArtwork(s.slug)} width="1086" height="1448" loading="lazy" alt={`Original conceptual cover art for ${s.title}.`}/><span>LTC / THE COLLECTOR’S READ<strong>{s.title}</strong></span></a><h3><a href={specialHref(s.slug)}>{s.subject}</a></h3><p>{s.dek}</p><small>{s.sections.length} chapters · AI-prepared feature<br/>Research through {s.researchThrough}</small></article>)}
  </div><div className={styles.history}><div><p className={styles.kicker}>The daily archive / Previous publication days</p><h3>Yesterday stays on the record.</h3><p>Earlier editions retain their original dates and evidence. Special features stay on their own shelf.</p></div><nav aria-label="Previous daily editions">{previous.map(day=><a key={day.date} href={editionDateHref(day.date)}><time dateTime={day.date}>{formatEditionDate(day.date)}</time><strong>{day.latest.title}</strong><span>Read ↗</span></a>)}<a href="/conversations/archive/"><strong>All dates, calendars &amp; saved revisions</strong><span>Open archive ↗</span></a></nav></div></section>;
}
