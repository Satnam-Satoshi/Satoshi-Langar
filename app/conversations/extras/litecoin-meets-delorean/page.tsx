import type { Metadata } from 'next';
import { octoberSixExtra as extra, newsExtraHref } from '../../../data/news-extra';
import styles from '../extra.module.css';

export const metadata: Metadata = {
  title: extra.title,
  description: extra.dek,
  alternates: { canonical: `https://ltcmagazine.org${newsExtraHref}` },
  openGraph: { title: extra.title, description: extra.dek, images: [{ url: `https://ltcmagazine.org${extra.cover}`, width: 1086, height: 1448, alt: extra.coverAlt }] },
};

const lanes = [
  ['01', 'Payments', 'DeLorean', 'Planned LTC acceptance when vehicles become available.'],
  ['02', 'Applications', 'LitVM', 'Testnet today; a phased settlement roadmap.'],
  ['03', 'Companies', 'LUXX / LITS', 'Operating businesses and managed corporate treasuries.'],
  ['04', 'Products', 'LTCC / LTCN / LITE', 'Different securities, structures and measurement dates.'],
];

function SourceLinks({ ids }: { ids: string[] }) {
  return ids.length ? <div className={styles.citations}><span>Read the record</span>{ids.map(id => <a href={`#source-${id}`} key={id}>{extra.sources.find(s => s.id === id)?.title} ↗</a>)}</div> : null;
}

function StoryVisual({ kind }: { kind: string }) {
  if (kind === 'announcement') return <div className={styles.productStrip}>{[['01 / PAYMENTS','A future checkout','LTC acceptance for upcoming EVs when available.'],['02 / TREASURY','A strategy discussion','Cooperation is announced; a purchased amount is not verified.'],['03 / REACH','Two communities','Existing Web2 contacts meet Litecoin ecosystem connections.']].map(([label,title,copy])=><div key={label}><p className={styles.kicker}>{label}</p><h3>{title}</h3><p>{copy}</p></div>)}</div>;
  if (kind === 'litvm') return <figure className={styles.blueprint}><figcaption>LitVM’s published settlement roadmap <small>Conceptual sequence · Completion of these stages is not verified here</small></figcaption><ol>{[['01','Ethereum','Initial settlement'],['02','Litecoin anchoring','State commitments + proof hashes'],['03','Litecoin settlement','Planned authoritative settlement after client upgrade']].map(([n,title,copy])=><li key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol><p>Execution, settlement and bridge security answer different questions. The current FAQ still places mainnet after the token-generation event and security audits.</p></figure>;
  if (kind === 'collective') return <figure className={styles.collective}><div><span>LitVM</span><span>Litecoin Foundation</span><span>Luxxfolio</span></div><figcaption>Three named founding members of the Litecoin Vanguard Collective<br/><small>LitVM announcement · April 24, 2026 · Participation is not ownership.</small></figcaption></figure>;
  if (kind === 'proposal') return <div className={styles.proposal}><span className={styles.largeWord}>PROPOSED.</span><ol><li><b>October 4</b><span>Non-binding letter of intent</span></li><li><b>October 5</b><span>Issuer announcement</span></li><li><b>Next gates</b><span>Terms, custody, allocation and required approvals</span></li></ol><p>Agreement to explore ≠ a launched program or earned revenue.</p></div>;
  if (kind === 'chronology') return <figure className={styles.chronology}><figcaption>Two clocks. Keep both.</figcaption><div><p><span>BALANCE DATE</span><strong>June 30</strong><b>832,716 LTC</b><small>Published September 29</small></p><p><span>BALANCE DATE</span><strong>July 17</strong><b>819,070 LTC</b><small>Published July 30 · Preliminary</small></p></div><p>The newer publication does not necessarily contain the newer measurement.</p></figure>;
  if (kind === 'products') return <div className={styles.productStrip}>{[['Company share','A business and its balance sheet'],['Trust / ETP security','The rights in the product documents'],['Custodied spot LTC','Customer access to the asset']].map(([title,copy])=><div key={title}><h3>{title}</h3><p>{copy}</p></div>)}</div>;
  if (kind === 'register') return <><p className={styles.tableHint}>Read across: the Register record → the issuer evidence → the limitation. Swipe horizontally on smaller screens.</p><div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Scrollable dated institutional comparison"><table><caption>Selected Litecoin Register entries, checked October 6, 2026. LTC amounts are dated observations, not live balances.</caption><thead><tr><th scope="col">Entity / structure</th><th scope="col">Register record</th><th scope="col">Primary-source comparison</th><th scope="col">What to keep in mind</th></tr></thead><tbody>{extra.registerRows.map(row=><tr key={row.name}><th scope="row">{row.name}<small>{row.kind}</small></th><td><strong>{row.register}</strong><small>{row.registerDate ?? 'No amount assigned'}</small></td><td>{row.primary}<small>{row.effective ?? 'No total established'}</small></td><td>{row.finding}<SourceLinks ids={row.sources}/></td></tr>)}</tbody></table></div><p className={styles.license}>{extra.registerDataset.attribution} <a href={extra.registerDataset.license}>License ↗</a> · <a href={extra.registerDataset.url}>Original dataset ↗</a></p></>;
  if (kind === 'questions') return <div className={styles.questionGrid}>{[['PAYMENTS','Can a customer use it?'],['BUILDERS','What is actually deployed?'],['TREASURIES','When was it measured?'],['PRODUCTS','What does the investor own?']].map(([label,q])=><div key={label}><span>{label}</span><h3>{q}</h3></div>)}</div>;
  return null;
}

export default function NewsExtraPage() {
  const checked = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(extra.preparedAt));
  return <main className={styles.extra}>
    <div className={styles.topline}><a href="/conversations/">LTC / The newsroom ↗</a><span>October 6, 2026 · News extra · R2</span></div>
    <header className={styles.hero}>
      <div className={styles.heroText}><p className={styles.kicker}>The open-money road trip</p><h1>Great<br/><em>Scott.</em></h1><h2>Litecoin meets<br/>DeLorean.</h2><p className={styles.dek}>{extra.dek}</p><a className={styles.button} href="#contents">Inside the extra ↓</a><p className={styles.byline}>{extra.byline}<br/>Updated {checked} New York time</p></div>
      <figure className={styles.cover}><img src={extra.cover} width="1086" height="1448" alt={extra.coverAlt} fetchPriority="high"/><figcaption>Original editorial concept art / A possible road, not a product rendering.</figcaption></figure>
    </header>
    <aside className={styles.opening} aria-label="Editorial update"><div><p className={styles.kicker}>What changed / R2</p><h2>Three connections.<br/><em>A clearer record.</em></h2></div><p>{extra.updateNote}</p></aside>
    <nav className={styles.contents} id="contents" aria-label="News extra contents"><p className={styles.kicker}>Eight stops. One bigger picture.</p><ol>{extra.sections.map(s=><li key={s.id}><a href={`#${s.id}`}><span>{s.number}</span>{s.label.split(' · ')[0]} ↘</a></li>)}</ol><div><a href="#sources">Sourcebook ↘</a><a href="/conversations/editions/2026-10-06/">The October 6 daily issue ↗</a><a href="/conversations/archive/">All issues ↗</a></div></nav>
    <section className={styles.opening} aria-labelledby="four-doors"><div><p className={styles.kicker}>The editor’s map</p><h2 id="four-doors">Four doors into<br/><em>the same conversation.</em></h2></div><p>A car announcement, an application network, a corporate treasury and a listed product each tell a different Litecoin story. This extra connects them while keeping their evidence—and their responsibilities—separate.</p></section>
    <div className={styles.lanes}>{lanes.map(([n,title,name,copy])=><div key={n}><span>{n}</span><h3>{title}</h3><strong>{name}</strong><p>{copy}</p></div>)}</div>
    <article>{extra.sections.map(s=><section className={styles.chapter} id={s.id} key={s.id}><div className={styles.chapterRule}><span>{s.number} / LTC NEWS EXTRA</span><a href="#contents">Contents ↑</a></div><header><p className={styles.kicker}>{s.label}</p><h2>{s.title}</h2><p className={styles.standfirst}>{s.standfirst}</p></header><div className={styles.prose}>{s.paragraphs.map((p,i)=><div key={`${s.id}-${i}`}><p>{p.text}</p><SourceLinks ids={p.sources}/></div>)}</div><StoryVisual kind={s.visual}/></section>)}</article>
    <section className={styles.sourcebook} id="sources" aria-labelledby="sourcebook-title"><p className={styles.kicker}>The evidence stays with the story</p><h2 id="sourcebook-title">Open the sourcebook.</h2><p>{extra.review} Original publication dates are shown when established; an undated page’s October 6 check is not a new announcement.</p><p>{extra.spaceMethod}</p><ol>{extra.sources.map((s,i)=><li id={`source-${s.id}`} key={s.id}><span>{String(i+1).padStart(2,'0')}</span><div><a href={s.url}>{s.title} ↗</a><small>{s.publisher} · {s.published ? `Published ${s.published}` : 'Undated page / dataset'} · Checked October 6, 2026</small><p>{s.note}</p></div></li>)}</ol><details><summary>Saved record &amp; data provenance</summary><p><a href="/data/ltc-extras/2026-10-06-delorean-r2.json">Download the updated R2 record (JSON) ↗</a></p><p>Register source SHA-256: <code>{extra.registerDataset.sha256}</code></p><p><a href="/data/ltc-extras/2026-10-06-delorean-r1.json">Read the original R1 record ↗</a>. This update preserves the earlier evidence and introduces no automatic market-data adapter.</p></details></section>
    <footer className={styles.backpage}><p className={styles.kicker}>The last page / The next good question</p><span aria-hidden="true" className={styles.backMark}>Ł</span><h2>The future needs<br/><em>good footnotes.</em></h2><p>Bring curiosity. Keep the date.<br/>Ask what happened—and what is still a plan.</p><div><a className={styles.button} href="/conversations/editions/2026-10-06/">Read the October 6 daily →</a><a href="/conversations/archive/">Every issue &amp; special ↗</a><a href="/conversations/community/">Meet the community’s sources ↗</a></div><small>Independent LTC Media coverage · No issuer affiliation or endorsement implied.</small></footer>
  </main>;
}
