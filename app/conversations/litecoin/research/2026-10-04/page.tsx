import institutional from '../../../../../content/specials/institutional-snapshot-2026-10-04.json';
import type { Metadata } from 'next';
import record from '../../../../../content/specials/litecoin-research-2026-10-04-r1.json';
import styles from './research.module.css';

export const metadata: Metadata = {
  title: 'The Litecoin reading room · Community, builders & LTCN',
  description: record.description,
};
const sourceById = new Map(record.sources.map(source => [source.id, source]));
function Sources({ ids }: { ids: string[] }) {
  return <div className={styles.citations}>{ids.map(id => {
    const source = sourceById.get(id)!;
    return <a key={id} href={source.url}>{source.title} ↗</a>;
  })}</div>;
}
export default function LitecoinReadingRoom() {
  return <main className={styles.page}>
    <div className={styles.runningHead}><a href="/conversations/litecoin/">LTC Media / Litecoin fieldbook</a><span>Research companion · October 4, 2026</span></div>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>The Litecoin reading room / 01</p><h1>People.<br/>Projects.<br/><em>Paper trail.</em></h1><p className={styles.dek}>{record.description}</p><a className={styles.button} href="#reading-room">Find your starting point ↓</a></div>
      <figure><img src="/magazine/litecoin-15/community.jpg" width="1536" height="1024" fetchPriority="high" alt="Conceptual illustration of a world map and people gathered around a working table."/><figcaption>Open work, shared knowledge. Original AI conceptual artwork; not a photograph of the people profiled.</figcaption><div className={styles.stamp} aria-hidden="true">THE WORK<br/>BEHIND<br/><strong>Ł</strong></div></figure>
    </header>
    <div className={styles.intro}><p>Good community journalism follows people into the work—and follows a number back to its record. This room connects the anniversary story to the places where that work can be inspected.</p><p className={styles.small}>{record.status}. An independent LTC Media publication by Satnam Satoshi; no affiliation or endorsement by the people, projects or issuers listed. This dated companion does not revise the archived 84-page advance edition.</p></div>
    <nav className={styles.contents} id="reading-room" aria-label="Reading room contents">
      <a href="#people"><span>01 / THE COMMUNITY</span>Meet the reading list ↘</a>
      <a href="#projects"><span>02 / OPEN WORK</span>Follow the builders ↘</a>
      <a href="#research"><span>03 / THE SOURCE LENS</span>Read the evidence ↘</a>
      <a href="#ltcn"><span>04 / INSTITUTIONAL DESK</span>The LTCN paper trail ↘</a>
    </nav>
    <section id="people" className={styles.section}>
      <div className={styles.sectionHead}><span>01 / THE COMMUNITY</span><span>People to read. Claims to check.</span></div>
      <h2>Start with a person.<br/><em>Follow the work.</em></h2>
      <p className={styles.sectionDek}>Five community and developer links supplied for the anniversary research. Verified project records sit beside each readable profile; unavailable social timelines are labeled.</p>
      <div className={styles.people}>{record.people.map((person, index) => <article key={person.id}>
        <div className={styles.personTop}><span>{String(index + 1).padStart(2, '0')}</span><p>{person.focus}</p></div>
        <h3>{person.name}</h3><p>{person.summary}</p><aside><strong>A question to carry</strong>{person.question}</aside><Sources ids={person.sourceIds}/>
      </article>)}</div>
      <p className={styles.small}>X returned no readable current timeline for these five links. Profile links are not reproduced posts, interviews, staff appointments or a live feed. No social tracking script loads here.</p>
    </section>
    <section id="projects" className={`${styles.section} ${styles.dark}`}>
      <div className={styles.sectionHead}><span>02 / OPEN WORK</span><span>From the interface to the code</span></div>
      <h2>A useful idea<br/><em>leaves a trail.</em></h2>
      <div className={styles.projectGrid}>{record.projects.map((project, index) => <article key={project.name}>
        <span className={styles.projectNumber}>{String(index + 1).padStart(2, '0')}</span><p className={styles.eyebrow}>{project.title}</p><h3>{project.name}</h3><p>{project.summary}</p><small>{project.stage}</small><Sources ids={project.sourceIds}/>
      </article>)}</div>
    </section>
    <section id="research" className={styles.section}>
      <div className={styles.sectionHead}><span>03 / THE SOURCE LENS</span><span>A guide to reading, not a ranking</span></div>
      <h2>Different sources.<br/><em>Different jobs.</em></h2>
      <div className={styles.reading}>{record.reading.map(item => <article key={item.id}><p className={styles.eyebrow}>{item.kicker}</p><h3>{item.title}</h3><p>{item.body}</p><Sources ids={item.sourceIds}/></article>)}</div>
      <figure className={styles.evidenceFlow}><figcaption>How a number earns its place in LTC Media</figcaption><ol><li><strong>Discover</strong><span>A tracker, article or post points to a claim.</span></li><li><strong>Trace</strong><span>Find the issuer record or original technical evidence.</span></li><li><strong>Date</strong><span>Separate the observation date from publication and our check.</span></li><li><strong>Reconcile</strong><span>Check units, scope, overlap and conflicting observations.</span></li></ol><p>A change in holdings is not, by itself, an ETF flow. An aggregated balance is not automatically a count of distinct coins.</p></figure>
    </section>
    <section id="ltcn" className={styles.section}>
      <div className={styles.sectionHead}><span>04 / GRAYSCALE LTCN</span><span>Selected primary records · Checked October 4, 2026</span></div>
      <div className={styles.institutionalHeading}><h2>The ticker.<br/><em>The structure.<br/>The record.</em></h2><div><p className={styles.dek}>{record.ltcn.intro}</p><p className={styles.status}>{record.ltcn.status}</p><Sources ids={record.ltcn.statusSourceIds}/></div></div>
      <ol className={styles.timeline}>{record.ltcn.timeline.map(item => <li key={item.date + item.title}><time dateTime={item.date}>{item.date}</time><div><span className={styles.eyebrow}>{item.classification}</span><h3>{item.title}</h3><p>{item.summary}</p><Sources ids={item.sourceIds}/></div></li>)}</ol>
      <div className={styles.clocks}><h3>Keep three clocks on the desk.</h3><div><p><strong>Period end</strong>The date a reported balance or financial statement describes.</p><p><strong>Filing date</strong>When the document entered the public record.</p><p><strong>Market observation</strong>The timestamp of a price or NAV observation, with its own source.</p></div></div>
      <p className={styles.small}>{record.ltcn.limitations}</p>
    </section>
    <section className={styles.sourceShelf} id="sources"><p className={styles.eyebrow}>THE RESEARCH NOTEBOOK</p><h2>Read beside the source.</h2><details><summary>Inspect {record.sources.length} source records <span>+</span></summary><ol>{record.sources.map(source => <li key={source.id}><a href={source.url}>{source.title} ↗</a><p>{source.classification} · {source.publishedAt ? `Record date: ${source.publishedAt}` : 'No publication date assigned'} · Checked {source.checkedAt}</p><p>{source.note}</p></li>)}</ol></details></section>
    <footer className={styles.closing}><p className={styles.eyebrow}>KEEP READING / KEEP CONTRIBUTING</p><h2>A good next question<br/><em>is a contribution.</em></h2><div><a href="/conversations/specials/litecoin-at-15/">Read the 84-page special →</a><a href="/conversations/litecoin/">Explore the Litecoin fieldbook →</a><a href="/join/?path=ltc">Bring a source or correction →</a></div><p>Read freely. No account, wallet or purchase is required.</p></footer>
  <section className={styles.institutional} id="institutional-snapshot"><p className={styles.kicker}>The institutional evidence desk / October 4, 2026</p><h2>Different claims.<br/>Different clocks.</h2><p>Fidelity’s Litecoin service support, Grayscale’s dated product fields and selected Litecoin Register observations belong in different categories. These records do not form an additive total or a fund-flow measure.</p><p><a href="/conversations/specials/proof-of-birthday/63/">Read the snapshot in the magazine →</a></p><div className={styles.institutionGrid}>{institutional.rows.map(row=><article key={row.name}><p className={styles.kicker}>{row.category.replaceAll('_',' ')}</p><h3>{row.name}</h3><p className={styles.quantity}>{row.primary.quantityLtc?`${row.name.startsWith('Grayscale')?'≈ ':''}${Number(row.primary.quantityLtc).toLocaleString('en-US',{maximumFractionDigits:row.name.startsWith('Grayscale')?0:6})} LTC`:'Quantity not admitted / unavailable'}</p><p>Source effective date: <strong>{row.primary.asOfDate??'Not supplied / no within-cutoff balance admitted'}</strong></p>{row.tracker&&<p>Register: {row.tracker.quantityLtc.toLocaleString('en-US')} LTC · {row.tracker.asOfDate}</p>}<p>{row.name.startsWith('Canary')?'The issuer holdings table is dated October 5, after this edition’s cutoff. The October 4 tracker number is not treated as independently corroborated.':row.name.startsWith('CoinShares')?'The August 31 reserve-service record is stale and carries a warning flag. It is not a live reconciled proof of reserves.':row.name.startsWith('Luxxfolio')?'The issuer endpoint returned September 28. The later, higher Register quantity remains unreconciled; no average or inferred flow is used.':row.name.startsWith('Grayscale')?'Approximate calculation: 24,252,100 shares × 0.08067013 LTC per share. The rounded inputs are dated October 2; the tracker displays October 4. This does not verify a completed ETF conversion.':row.name.startsWith('Fidelity')?'Official help verifies LTC trading, custody and main-network deposits, subject to availability. No proprietary treasury, Litecoin ETF or aggregate client balance is established.':row.name.startsWith('Lite Strategy')?'The July 17 balance was published July 30. A September 29 release separately reports 832,716 LTC at June 30. Publication and balance dates differ; neither is an October 4 holding.':'Issuer-reported cold-storage quantity dated October 4. One ISIN can have several venue tickers; they are not separate reserve pools.'}</p><div>{row.primary.sourceIds.map(id=>{const source=institutional.sources.find(s=>s.id===id)!;return <a key={id} href={source.url}>{source.publisher} source ↗</a>})}</div></article>)}</div><details><summary>Inspect all {institutional.sources.length} snapshot sources</summary><ol>{institutional.sources.map(source=><li key={source.id}><a href={source.url}>{source.title} ↗</a><p>{source.publisher} · {source.classification.replaceAll('_',' ')} · Published {source.publishedDate??'date not supplied'} · Checked {source.checkedDate}</p></li>)}</ol></details></section></main>;
}
