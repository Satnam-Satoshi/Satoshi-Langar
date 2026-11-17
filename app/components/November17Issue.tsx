import { november17Chapters as chapters, november17Sources as sources, type November17Chapter } from '../data/november17';
import s from './November17Issue.module.css';

const routes = [
  { label: 'The market', ids: ['market', 'flows', 'ibit'], intro: 'A green session is not a green month.' },
  { label: 'Bitcoin capital', ids: ['bitcoin-products', 'bitcoin-treasuries', 'strategy', 'strive'], intro: 'The filing resets the ledger.' },
  { label: 'Litecoin capital', ids: ['register', 'litecoin-products', 'litecoin-treasuries', 'mweb'], intro: 'One network. Different kinds of holdings.' },
  { label: 'Credit & reserves', ids: ['morpho-ltc', 'morpho-btc', 'morpho-risk', 'circle'], intro: 'Read the market before the rate.' },
  { label: 'Policy & builders', ids: ['policy', 'builders', 'foundation', 'lightning'], intro: 'A release is a dated claim.' },
  { label: 'The wider lens', ids: ['timechain', 'wider-set', 'mnav'], intro: 'Leave the gaps visible.' },
];

function ClockArt() {
  return <figure className={s.clock}><svg viewBox="0 0 540 540" role="img" aria-label="Editorial illustration of a filing clock. Three hands represent the reporting date, filing date and reading date, not live market time.">
    <circle cx="270" cy="270" r="236" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="270" cy="270" r="200" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 9"/>
    {Array.from({length:12},(_,i)=><line key={i} x1="270" y1="43" x2="270" y2="65" transform={`rotate(${i*30} 270 270)`} stroke="currentColor" strokeWidth={i%3===0?5:2}/>)}
    <path d="M270 270L270 112M270 270L408 350" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="square"/>
    <path d="M270 270L135 366" fill="none" stroke="#fff5e4" strokeWidth="5"/>
    <circle cx="270" cy="270" r="18" fill="currentColor"/>
    <text x="270" y="218" textAnchor="middle" fontFamily="Georgia,serif" fontSize="21" letterSpacing="5">THE FILING</text>
    <text x="270" y="312" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="69" fontWeight="900">17</text>
    <text x="270" y="410" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="13" letterSpacing="4">NOVEMBER / 2026</text>
  </svg><figcaption>Report date ≠ filing date ≠ today</figcaption></figure>;
}

function DataTable({chapter}: {chapter:November17Chapter}) {
  return <div className={s.tableScroll} role="region" aria-label={`${chapter.kicker} data table`} tabIndex={0}>
    <table><caption>{chapter.dek}</caption><thead><tr>{chapter.headers.map((h,i)=><th scope="col" key={`${h}-${i}`}>{h}</th>)}</tr></thead>
      <tbody>{chapter.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function RegisterChart() {
  const chart=chapters.find(c=>c.id==='register')!;
  const max=10861881;
  return <figure className={s.registerChart}><figcaption>Mixed-date tracker categories · LTC · November 17 retrieval</figcaption>
    {chart.rows.map(([name,value])=><div className={s.chartRow} key={name}><div><span>{name}</span><strong>{value}</strong></div><div className={s.track}><span style={{width:`${Number(value.replaceAll(',',''))/max*100}%`}}/></div></div>)}
    <p>Common linear scale. Category totals are not additive proof of beneficial ownership; overlap may exist.</p>
  </figure>;
}

function FlowGraphic() {
  return <figure className={s.flowGraphic}><figcaption>One complete session. Three different windows.</figcaption><div>
    <article><span>November 16</span><strong>+$7.9M</strong><small>1 complete session</small></article>
    <article><span>November 10–16</span><strong>−$856.4M</strong><small>5 final sessions / 7 calendar days</small></article>
    <article><span>October 18–November 16</span><strong>−$2.2403B</strong><small>21 final sessions / 30 calendar days</small></article>
  </div><p>Comparable U.S. Bitcoin ETF universe. November 17 was incomplete at the editorial cutoff and is excluded. Source: Farside.</p></figure>;
}

function Chapter({chapter,index}: {chapter:November17Chapter;index:number}) {
  const table=<DataTable chapter={chapter}/>;
  return <article className={s.chapter} id={chapter.id}>
    <header className={s.chapterHead}><span className={s.number}>{String(index+1).padStart(2,'0')}</span><p className={s.kicker}>{chapter.kicker}</p><h3>{chapter.title}</h3><p className={s.dek}>{chapter.dek}</p>
      <a className={s.up} href="#reading-map">↑ Reading map</a>
    </header>
    <div className={s.chapterBody}>
      {chapter.hero && chapter.id!=='flows' && <p className={s.heroNumber}>{chapter.hero}</p>}
      {chapter.id==='flows' && <FlowGraphic/>}
      {chapter.id==='register' && <RegisterChart/>}
      {chapter.paragraphs.map((p,i)=><p className={s.bodyCopy} key={i}>{p}</p>)}
      {chapter.identities && <div className={s.identities}>{chapter.identities.map(x=><details key={x.label}><summary>{x.label} · exact on-chain identifiers</summary><dl><dt>Market ID</dt><dd><code>{x.market}</code></dd><dt>Oracle</dt><dd><code>{x.oracle}</code></dd><dt>Collateral</dt><dd><code>{x.collateral}</code></dd></dl></details>)}<p>Loan token · USDC on Base<br/><code>0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</code></p></div>}
      {chapter.rows.length>15?<details className={s.fullTable}><summary>Open all {chapter.rows.length} ranked entries <span aria-hidden="true">+</span></summary>{table}</details>:table}
      {chapter.sources.length>0?<nav className={s.sources} aria-label={`Sources for ${chapter.kicker}`}>{chapter.sources.map(i=><a key={i} href={sources[i].url}>{sources[i].label} ↗</a>)}</nav>:<p className={s.note}>These dated spot observations are carried from the November 17 edition. A separately linked quote-provider record is not present in its public sourcebook; they are not live prices.</p>}
      <nav className={s.chapterNext} aria-label={`Continue after ${chapter.kicker}`}><a href={index+1<chapters.length?`#${chapters[index+1].id}`:'#sourcebook'}>Next: {index+1<chapters.length?chapters[index+1].kicker:'Sourcebook'} <span aria-hidden="true">→</span></a></nav>
    </div>
  </article>;
}

export default function November17Issue() {
  return <main className={s.issue} id="issue-top">
    <nav className={s.topNav} aria-label="Issue navigation"><a href="/conversations/">LTC / Magazine</a><a href="/conversations/archive/">All issues ↗</a><a href="#reading-map">Inside this issue ↓</a></nav>
    <header className={s.hero}><div><p className={s.kicker}>Satnam Satoshi Project / Daily edition / 17.11.2026</p><p className={s.masthead}>LUNCH TIME<br/>CONVERSATIONS</p><h1>The filing<br/><em>clock.</em></h1><p className={s.heroDek}>Strategy and Strive reset the Bitcoin ledger. A Bank of America filing names IBIT. The date changes what the headline means.</p><a className={s.heroCta} href="#opening">Read the opening note <span aria-hidden="true">↘</span></a></div><ClockArt/></header>
    <div className={s.ticker}><span>Bitcoin · Litecoin · Nakamoto standard</span><span>Cutoff ≈ 09:15 ET / November 17, 2026</span><span>Dated observations, not live quotes</span></div>
    <section className={s.opening} id="opening"><div><p className={s.kicker}>The editor’s note / LTC Research Desk</p><h2>Read the filing.<br/><em>Respect the date.</em></h2></div><div><p className={s.lead}>Fund collateral, corporate treasuries, exchange custody, wrapped reserves, miner reserves and MWEB belong in different ledgers.</p><p>This issue gives filings precedence over lagging trackers and leaves conflicts visible. Strategy reported 850,849 BTC as of November 15; Strive reported 43,404 BTC as of November 13. Both filed on November 16. A retrieval today does not make either balance a live reading.</p><p>Bank of America’s three IBIT manager rows total 14,479,277 shares and $685,448,973 as of September 30. That is a reported position, not proof of a new purchase or whose capital it represents.</p><a href="#ibit">Follow the attribution question →</a></div></section>
    <section className={s.timeLine} aria-label="Reporting date versus filing date"><div><span>30 SEP</span><h3>The measurement</h3><p>IBIT and Bank of America’s 13F reporting date.</p></div><div><span>13–15 NOV</span><h3>The holdings dates</h3><p>Strive’s and Strategy’s respective issuer totals.</p></div><div><span>16 NOV</span><h3>The filing day</h3><p>New disclosures arrive. Complete ETF flow row closes.</p></div><div><span>17 NOV</span><h3>The reading</h3><p>This edition compares the clocks, not just the numbers.</p></div></section>
    <nav className={s.readingMap} id="reading-map" aria-label="Issue reading map"><div><p className={s.kicker}>Six routes through the evidence</p><h2>Follow your<br/><em>question.</em></h2><p>Read the edition in sequence or jump into a desk. The full tables and source links live alongside each story.</p></div><ol>{routes.map((r,i)=><li key={r.label}><a href={`#${r.ids[0]}`}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{r.label}</strong><p>{r.intro}</p></div><b aria-hidden="true">↗</b></a></li>)}</ol></nav>
    {routes.map((r,i)=><section key={r.label} aria-labelledby={`group-${i}`}><div className={s.groupBanner}><p className={s.kicker}>Desk {String(i+1).padStart(2,'0')}</p><h2 id={`group-${i}`}>{r.label}</h2><p>{r.intro}</p><nav aria-label={`${r.label} chapters`}>{r.ids.map(id=><a key={id} href={`#${id}`}>{chapters.find(c=>c.id===id)!.kicker}</a>)}</nav></div>{r.ids.map(id=><Chapter key={id} chapter={chapters.find(c=>c.id===id)!} index={chapters.findIndex(c=>c.id===id)}/>)}</section>)}
    <aside className={s.house}><div><p className={s.kicker}>House promotion / Not paid / No affiliation implied</p><h2>Builders deserve<br/>a clean stage.</h2><p>Follow the sources. Read release notes. Distinguish testnet, mainnet, audit scope and real usage. Sponsor inventory cannot buy rank, erase a conflict or change a conclusion.</p></div><div className={s.houseLinks}><a href="/conversations/litecoin/">Explore Litecoin <span>↗</span></a><a href="/conversations/specials/2026-11-16-ecosystem/">One family. Many frontiers. <span>↗</span></a><a href="/conversations/specials/litecoin-to-the-moon/">Litecoin to the Moon <span>↗</span></a></div></aside>
    <section className={s.sourcebook} id="sourcebook"><p className={s.kicker}>The sourcebook</p><h2>Check the source.<br/><em>Check the clock.</em></h2><p className={s.sourceIntro}>Web edition of the November 17 reporting, preserving its original editorial cutoff. Figures retain their reporting dates and coverage limits. Internal publication notes are excluded; no new market observation is implied by this web presentation.</p><ol>{sources.filter((_,i)=>i!==26).map(x=><li key={x.url}><a href={x.url}>{x.label} <span aria-hidden="true">↗</span></a></li>)}</ol><p className={s.note}>This is independent, AI-assisted research and education, not financial advice, a trade instruction or an assurance of market availability. Issuer reports, trackers and protocol interfaces have different scopes. No custody, transaction or return promise is created by this publication.</p></section>
    <footer className={s.footer}><p className={s.kicker}>The conversation continues</p><h2>Follow the coins.<br/><em>Build with care.</em></h2><div><a href="/conversations/editions/2026-11-16/">← Previous issue: The Next Build</a><a href="/conversations/start/">Open Money School →</a><a href="/conversations/community/">Join the community →</a><a href="#issue-top">Back to the cover ↑</a></div><p>Bitcoin as a reserve standard. Litecoin as a complementary proof-of-work rail. Seva as the measure of contribution.</p></footer>
  </main>;
}
