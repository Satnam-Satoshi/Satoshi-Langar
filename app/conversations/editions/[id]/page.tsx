import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ltcEditions, ltcPublicationDays, formatEditionDate, editionHref, editionDateHref, archiveMonthHref } from '../../../data/editions';
import { LtcEditionCover, LtcEditionBackPage, orderedEditionBriefs } from '../../../components/LtcEditionPresentation';
import LtcVisualExplainer from '../../../components/LtcVisualExplainer';
import styles from '../../issue.module.css';
import LtcCoverage from '../../../components/LtcCoverage';

export const dynamicParams = false;
export function generateStaticParams() { return [...ltcEditions.map(edition => ({ id: edition.id })), ...ltcPublicationDays.map(day => ({ id: day.date }))]; }
function findEdition(id: string) { return ltcPublicationDays.find(day => day.date === id)?.latest ?? ltcEditions.find(edition => edition.id === id); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const edition = findEdition(id);
  return edition ? { title: `LTC · ${formatEditionDate(edition.date)} · ${edition.title}`, description: edition.dek } : {};
}
function collectedDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(value));
}
function numberLabel(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return value;
  const [integer, decimal] = value.split('.');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimal ? `.${decimal}` : '');
}

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const edition = findEdition(id);
  if (!edition) notFound();
  const briefs = orderedEditionBriefs(edition);
  const dayIndex = ltcPublicationDays.findIndex(day => day.date === edition.date);
  const day = ltcPublicationDays[dayIndex];
  const previous = ltcPublicationDays[dayIndex + 1];
  const following = ltcPublicationDays[dayIndex - 1];
  const newer = ltcEditions.filter(item => item.date === edition.date && item.revision > edition.revision);
  const readingMinutes = Math.max(1, Math.ceil(briefs.flatMap(brief => brief.paragraphs).join(' ').split(/\s+/).length / 180));
  const collected = edition.sources.filter(source => source.status === 'collected').length;
  const unavailable = edition.sources.filter(source => source.status === 'unavailable').length;
  return <main className={styles.issue} data-reader-layout={edition.presentation?.artDirection?.layout ?? ['folio','atlas','dispatch'][Number(edition.date.slice(-2)) % 3]} data-reader-palette={edition.presentation?.cover.palette ?? 'ember'}>
    <div className={styles.issueLine}><span>The daily edition</span><span><time dateTime={edition.date}>{formatEditionDate(edition.date)}</time> · R{edition.revision}</span></div>
    <div className={styles.jacket} id="front-cover"><LtcEditionCover edition={edition}/></div>

    <nav className={styles.readerBar} aria-label="Issue contents"><a className={styles.readerBrand} href="#edition-record">LTC <span>/{edition.date.slice(5).replace('-', '.')}</span></a><ol className={styles.contentsRail}>{briefs.map((brief, index) => <li key={brief.id}><a href={`#${brief.id}`} title={brief.headline} aria-label={`Section ${index + 1}: ${brief.headline}`}>{String(index + 1).padStart(2, '0')}</a></li>)}</ol><div className={styles.readerLinks}>{edition.coverage && <a href="#all-sections">29 sections</a>}<a href="#sourcebook">Sources</a><a href="#back-page">Back page</a><a href="/conversations/archive/">Archive ↗</a></div></nav>

    <section className={styles.opening} id="edition-record" aria-labelledby="opening-title">
      <header><p className={styles.eyebrow}>The daily record / {formatEditionDate(edition.date)}</p><h2 id="opening-title">A little context.<br/><em>A clearer view.</em></h2><p className={styles.openingDek}>{edition.dek}</p><div className={styles.byline}><span>{edition.byline}</span><span>{edition.coverage ? `Daily briefing: about ${readingMinutes} minutes · desk library below` : `About ${readingMinutes} minutes to read`}</span></div><p className={styles.reviewNote}>{edition.humanReview}. This is an automated source briefing. The dates belong to the records; the questions belong to all of us.</p>{newer.length > 0 && <p className={styles.updateNotice}>There is a later version of this day’s record: <a href={editionHref(newer[0].id)}>read revision {newer[0].revision}</a>. This earlier version remains available.</p>}</header>
      <aside className={styles.openingContents} aria-label="Reading order"><p className={styles.eyebrow}>Inside this edition</p><ol>{briefs.map((brief, index) => <li key={brief.id}><span>{String(index + 1).padStart(2, '0')}</span><a href={`#${brief.id}`}>{brief.headline}<small>{brief.desk}</small></a></li>)}</ol>{edition.coverage && <a className={styles.textLink} href="#all-sections">All 29 sections & desk context →</a>}<a className={styles.textLink} href="#coverage">What the sources do not establish →</a></aside>
    </section>

    <div className={styles.readingRule}><span>Read the record</span><span>Keep the source date</span><span>Question the inference</span></div>
    <article className={styles.stories} aria-label="Daily source briefing">{briefs.map((brief, index) => {
      const source = edition.sources.find(item => brief.sourceIds.includes(item.id) && item.observations?.length);
      const observation = source?.observations?.[0];
      return <section className={styles.spread} id={brief.id} key={brief.id} data-treatment={index % 3 === 1 ? 'tint' : 'paper'} data-composition={(index + (edition.presentation?.artDirection?.spreadOffset ?? Number(edition.date.slice(-2)) % 3)) % 3}>
        <header className={styles.spreadHeader}><span className={styles.sectionNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><p className={styles.eyebrow}>{brief.desk}</p><h2>{brief.headline}</h2><p className={styles.effectiveDate}>Source-effective date<br/><time dateTime={brief.effectiveAt}>{brief.effectiveAt}</time></p></header>
        <div className={styles.spreadBody}>{brief.paragraphs.map((paragraph, paragraphIndex) => <p className={paragraphIndex === 0 ? styles.leadParagraph : undefined} key={paragraph}>{paragraph}</p>)}<p className={styles.evidenceLinks}><span>Follow the evidence</span>{brief.sourceIds.map(sourceId => { const cited = edition.sources.find(item => item.id === sourceId)!; return <a key={sourceId} href={`#source-${sourceId}`}>{cited.title} ↗</a>; })}</p></div>
        <div className={styles.storyDiagram}><LtcVisualExplainer deskId={brief.sourceIds.some(id=>id.startsWith('coinbase-'))?'market-opening':brief.sourceIds.some(id=>id.includes('ibit'))?'bitcoin-etf-flows':brief.sourceIds.some(id=>id.includes('lnd'))?'lightning':'bitcoin-core'} compact/></div>
        {observation && <aside className={styles.recordCard} aria-label={`${observation.label} source record`}><p className={styles.eyebrow}>From the cited record</p><strong>{numberLabel(observation.value)} <span>{observation.unit}</span></strong><p>{observation.label}</p><small>{observation.classification.replaceAll('-', ' ')} · {observation.effectiveAt}{source?.id.startsWith('coinbase-') ? ' · A sampled venue last trade, not a live or global price.' : ''}</small></aside>}
        <footer className={styles.folio}><span>LTC / {edition.date}</span><span>{String(index + 1).padStart(2, '0')} / {String(briefs.length).padStart(2, '0')}</span></footer>
      </section>;
    })}</article>

    <LtcCoverage edition={edition}/>

    <section className={styles.sourcebook} id="sourcebook" aria-labelledby="sourcebook-title"><header className={styles.deskHeading}><div><p className={styles.eyebrow}>The sourcebook</p><h2 id="sourcebook-title">There is a record<br/>behind the reading.</h2></div><p>Each source keeps its own clock. Open any entry to inspect the observation, collection time and evidence record.</p></header><div className={styles.sourceOverview}><span><strong>{String(edition.sources.length).padStart(2, '0')}</strong> Public sources</span><span><strong>{String(collected).padStart(2, '0')}</strong> With parsed observations</span><span><strong>{String(unavailable).padStart(2, '0')}</strong> Unavailable at collection</span></div>
      <div className={styles.sourceEntries}>{edition.sources.map((source, index) => <details className={styles.sourceEntry} id={`source-${source.id}`} key={source.id}><summary><span className={styles.sourceNumber}>{String(index + 1).padStart(2, '0')}</span><span className={styles.sourceName}>{source.title}<small>{source.kind} source · {source.sourceAsOf ?? 'No source-effective date established'}</small></span><span className={styles.sourceStatus} data-unavailable={source.status === 'unavailable'}>{source.status.replaceAll('-', ' ')}</span><span className={styles.expand} aria-hidden="true">+</span></summary><div className={styles.sourceExpanded}><div><a className={styles.textLink} href={source.url}>Open the original source ↗</a><p>Collected {collectedDate(source.checkedAt)} · America/New_York.<br/>Freshness at edition preparation: {source.freshness.replaceAll('-', ' ')}.</p>{source.observations?.length ? <ul className={styles.observationList}>{source.observations.map(item => <li key={item.metric}><strong>{item.label}</strong><span>{item.value} {item.unit}</span><small>Effective {item.effectiveAt} · {item.classification.replaceAll('-', ' ')}</small></li>)}</ul> : <p>{source.status === 'unavailable' ? `Collection unavailable${source.httpStatus ? ` (HTTP ${source.httpStatus})` : ''}. No observation is reported.` : 'The page was retrieved as a reference. No numerical metrics were validated from it.'}</p>}</div><dl><dt>Parser</dt><dd><code>{source.parserVersion}</code></dd><dt>Checked UTC</dt><dd><code>{source.checkedAt}</code></dd><dt>Source SHA-256</dt><dd><code>{source.sourceSha256 ?? 'No retrieved source hash'}</code></dd>{source.errorCode && <><dt>Failure</dt><dd><code>{source.errorCode}</code></dd></>}</dl></div></details>)}</div>
      <div className={styles.sourceFoot}><p>“Collected” means source observations were parsed. “Reference retrieved” records availability only. Hashes identify retrieved bytes; they do not certify a publisher’s claims. These are not independently audited metrics.</p><a href={`/data/ltc-editions/${edition.id}.json`}>Download the edition record ↗</a></div>
    </section>

    <section className={styles.coverage} id="coverage" aria-labelledby="coverage-title"><div><span className={styles.openCircle} aria-hidden="true"/><p className={styles.eyebrow}>Leave room for what is missing</p><h2 id="coverage-title">The limits belong<br/>in the story.</h2><p>A dated upstream release can remain the latest returned record for months. Its original date stays attached. A missing observation never becomes zero.</p></div><div><h3>What this edition does not establish</h3><ul>{edition.coverageGaps.map(gap => <li key={gap}>{gap}</li>)}</ul></div></section>

    <section className={styles.publicationRecord} id="corrections" aria-labelledby="corrections-title"><header><p className={styles.eyebrow}>Keep the earlier pages</p><h2 id="corrections-title">Updates & publication record</h2></header><div className={styles.recordColumns}><div>{edition.corrections.length ? <ul className={styles.updateList}>{edition.corrections.map(correction => <li key={correction.correctsEditionId}><a href={editionHref(correction.correctsEditionId)}>{correction.correctsEditionId}</a><p>{correction.reason}</p></li>)}</ul> : <p>No update or correction note is recorded for this revision. Changes become a new saved version; earlier editions remain visible.</p>}<p><a href={editionDateHref(edition.date)}>Permanent page for {formatEditionDate(edition.date)}</a><br/><a href={editionHref(edition.id)}>Link to this exact revision</a></p><p>The date page shows the latest accepted revision for this day. Exact revision links preserve the earlier record.</p></div><div><h3>Saved versions</h3><ul className={styles.versions}>{day.revisions.map(record => <li key={record.id}><a href={editionHref(record.id)}>Revision {record.revision} →</a><span>{record.id === edition.id ? 'Reading now' : ''}{record.id === day.latest.id ? `${record.id === edition.id ? ' · ' : ''}Latest for this date` : ''}</span></li>)}</ul><details className={styles.releaseDetails}><summary>Publication method & timestamps</summary><p>Edition date: {edition.date} in {edition.timezone}. Preparation: {edition.preparedAt}. Release record: {edition.publishedAt}. The publishing process records this timestamp; it is not independently certified.</p><p>Publication follows a source-bound automated briefing policy. Material analysis, opinion and other editorial previews remain labeled for human review. <a href="/conversations/about/">Read the newsroom policy</a>.</p></details></div></div><p className={styles.legalNote}>General education and research, not individualized investment advice. No affiliation with cited organizations is implied. <a href="https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/new?title=LTC%20source%20or%20correction">Report a correction with evidence</a>. Public submissions must not contain confidential information.</p></section>

    <nav className={styles.dayNavigation} aria-label="Browse publication days"><div>{previous ? <a href={editionDateHref(previous.date)}><span>← Previous published day</span><strong>{formatEditionDate(previous.date)}</strong></a> : <p><span>The archive begins here</span><strong>{formatEditionDate(edition.date)}</strong></p>}</div><a href={archiveMonthHref(edition.date.slice(0, 7))}>Choose a date</a><div>{following ? <a href={editionDateHref(following.date)}><span>Next published day →</span><strong>{formatEditionDate(following.date)}</strong></a> : <p><span>Latest published day</span><strong>{formatEditionDate(edition.date)}</strong></p>}</div></nav>
    <LtcEditionBackPage edition={edition}/>
  </main>;
}
