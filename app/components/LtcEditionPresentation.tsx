import { editionDateHref, formatEditionDate, type LtcEdition } from '../data/editions';
import styles from './ltc-edition-presentation.module.css';
import flagship from './ltc-flagship.module.css';

type Motif = 'orbits' | 'timechain' | 'signal' | 'constellation' | 'ledger' | 'horizon' | 'weave';

/** Saved seeds change composition without browser randomness or external assets. */
export function LtcEditionArtwork({ motif, seed, decorative = false }: { motif: Motif; seed: string; decorative?: boolean }) {
  const number = Number.parseInt(seed.slice(0, 8), 16) || 0;
  const phase = number % 31;
  const angle = number % 18 - 9;
  const circles = Array.from({ length: 18 }, (_, index) => index);
  const points = Array.from({ length: 21 }, (_, index) => {
    const radians = index * 2.39996 + phase / 13;
    const radius = 40 + Math.sqrt(index) * 43;
    return [300 + Math.cos(radians) * radius, 277 + Math.sin(radians) * radius];
  });
  const descriptions: Record<Motif, string> = {
    orbits: 'Intersecting orbital ellipses around a shared center',
    timechain: 'An ascending chain of open geometric blocks',
    signal: 'Flowing signal lines meeting a vertical reference line',
    constellation: 'Twenty-one points connected into an open constellation',
    ledger: 'Layered sheets with ruled lines and a continuous thread',
    horizon: 'A rising circular form above a layered open horizon',
    weave: 'Crossing curved threads forming a shared woven surface',
  };
  return <svg className={styles.artwork} viewBox="0 0 600 560" role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : `${descriptions[motif]}. Original generative illustration; not a data chart.`}>
    <g className={styles.artGuide}><path d="M38 34h20M48 24v20M542 34h20M552 24v20M38 526h20M48 516v20M542 526h20M552 516v20"/><path d="M48 490H552" strokeDasharray="2 8"/></g>
    {motif === 'orbits' && <g fill="none" className={styles.artPrimary} transform={`rotate(${angle} 300 280)`}>{circles.map(index => <ellipse key={index} cx="283" cy="276" rx={40 + index * 9} ry={184 + phase / 3} transform={`rotate(${index * 10} 283 276)`}/>)}<g className={styles.artSecondary}>{circles.slice(0, 12).map(index => <ellipse key={index} cx="445" cy="183" rx={12 + index * 6} ry="79" transform={`rotate(${index * 15} 445 183)`}/>)}</g><circle cx="283" cy="276" r="9" className={styles.artFill}/></g>}
    {motif === 'timechain' && <g fill="none" className={styles.artPrimary}><path d="M108 428L240 333L356 239L476 129" className={styles.artSecondary} strokeWidth="2"/>{[0, 1, 2, 3].map(index => { const x = 63 + index * 116; const y = 357 - index * 85; const depth = 23 + (phase % 9); return <g key={index}><path d={`M${x} ${y}l83 -36l${depth} ${depth}v82l-83 36l-${depth} -${depth}z M${x} ${y}v82l83 -36v-82 M${x + 83} ${y - 36}l${depth} ${depth} M${x + 83} ${y + 46}l${depth} ${depth}`}/>{[0, 1, 2, 3, 4].map(line => <path key={line} d={`M${x + 8} ${y + 18 + line * 10}l66 -28`} opacity={.22 + line * .12}/>)}<circle cx={x + 38} cy={y + 18} r="5" className={styles.artFill}/></g>; })}<path d="M86 464H501" strokeDasharray="2 9"/><circle cx="513" cy="464" r="5" className={styles.artFill}/></g>}
    {motif === 'signal' && <g fill="none" className={styles.artPrimary}>{Array.from({ length: 29 }, (_, index) => { const y = 103 + index * 10; const amplitude = 50 + Math.sin(index / 6) * 80 + phase; return <path key={index} d={`M58 ${y}C168 ${y - amplitude},195 ${y + amplitude},298 ${y}S427 ${y - amplitude},545 ${y + 12}`} opacity={.42 + (index % 5) * .12}/>; })}<path d={`M${302 + phase} 51V469`} className={styles.artSecondary}/><circle cx={302 + phase} cy="276" r="47" className={styles.artSecondary}/><circle cx={302 + phase} cy="276" r="7" className={styles.artFill}/></g>}
    {motif === 'constellation' && <g fill="none" className={styles.artPrimary}><circle cx="300" cy="277" r="213" className={styles.artGuide}/><circle cx="300" cy="277" r="158" strokeDasharray="2 8" opacity=".3"/>{points.map(([x, y], index) => { const other = points[(index + 5) % points.length]; return <g key={index}><path d={`M${x.toFixed(2)} ${y.toFixed(2)}L${other[0].toFixed(2)} ${other[1].toFixed(2)}`} opacity=".35"/><circle cx={x.toFixed(2)} cy={y.toFixed(2)} r={index % 5 === 0 ? 7 : 3} className={index % 5 === 0 ? styles.artFill : styles.artSecondary}/></g>; })}<circle cx="300" cy="277" r="39" className={styles.artSecondary}/></g>}
    {motif === 'ledger' && <g fill="none" className={styles.artPrimary} transform={`rotate(${angle - 6} 300 280)`}>{Array.from({ length: 7 }, (_, index) => <g key={index} transform={`translate(${index * 16} ${-index * 14})`}><path d="M119 179L351 135L409 386L177 430Z" opacity={.4 + index * .08}/>{[0, 1, 2, 3].map(line => <path key={line} d={`M${146 + line * 9} ${208 + line * 40}l165 -32`} opacity=".25"/>)}</g>)}<path d="M84 402C85 161 531 370 487 118" className={styles.artSecondary} strokeWidth="2"/><circle cx="487" cy="118" r="7" className={styles.artFill}/></g>}
    {motif === 'horizon' && <g fill="none" className={styles.artPrimary}>{Array.from({ length: 13 }, (_, index) => <circle key={index} cx={300 + phase} cy="230" r={24 + index * 10} opacity={.28 + index * .05}/>)}{Array.from({ length: 17 }, (_, index) => <path key={index} d={`M51 ${313 + index * 8}Q190 ${230 + index * 12},300 ${320 + index * 7}T549 ${309 + index * 8}`} className={index % 4 === 0 ? styles.artSecondary : undefined}/>)}<path d="M300 52V99" className={styles.artSecondary}/><circle cx="300" cy="48" r="5" className={styles.artFill}/></g>}
    {motif === 'weave' && <g fill="none" className={styles.artPrimary} transform={`rotate(${angle} 300 280)`}>{Array.from({ length: 23 }, (_, index) => <path key={`a-${index}`} d={`M${64 + index * 20} 99Q${510 - index * 10} ${150 + phase},${70 + index * 20} 452`} opacity=".78"/>)}<g className={styles.artSecondary}>{Array.from({ length: 19 }, (_, index) => <path key={`b-${index}`} d={`M70 ${110 + index * 19}Q${245 + phase} ${40 + index * 22},526 ${112 + index * 19}`} opacity=".64"/>)}</g><circle cx="300" cy="280" r="15" className={styles.artFill}/></g>}
  </svg>;
}

function jacket(edition: LtcEdition) {
  return edition.presentation?.cover ?? { theme: 'Original source edition', palette: 'ember' as const, motif: 'orbits' as const, title: 'The daily record.', subtitle: 'An archived source briefing, kept with its original evidence and publication date.', kicker: 'The founding archive', seed: '0000000000000000' };
}

export function LtcEditionCover({ edition, mode = 'edition' }: { edition: LtcEdition; mode?: 'home' | 'edition' | 'thumbnail' }) {
  const cover = jacket(edition);
  const legacy = !edition.presentation;
  const art = edition.presentation?.artDirection;
  const sampledPrices = edition.sources.filter(source => ['coinbase-btc-usd', 'coinbase-ltc-usd'].includes(source.id) && source.status === 'collected' && source.freshness !== 'stale');
  const label = `${formatEditionDate(edition.date)} · ${cover.title}`;
  if (art?.version === 2) {
    const Heading = mode === 'thumbnail' ? 'p' : mode === 'edition' ? 'h1' : 'h2';
    return <section className={flagship.cover} data-cover-mode={mode} data-layout={art.layout} data-edition-date={edition.date} aria-label={`${label} · Proof of Work daily magazine`}>
      <img className={flagship.coverArt} src={`/magazine/${art.coverAsset}`} width={art.coverAsset.startsWith('daily/')?1086:1536} height={art.coverAsset.startsWith('daily/')?1448:1024} alt={mode==='thumbnail'?'':'Original conceptual cover illustration in Litecoin blue, silver and Bitcoin orange; not a documentary photograph or data chart.'} loading={mode==='thumbnail'?'lazy':'eager'}/>
      <div className={flagship.coverShade}/>
      <div className={flagship.coverTop}><strong>LTC<span>MAGAZINE</span></strong><p>Lunch Time Conversations<br/><time dateTime={edition.date}>{formatEditionDate(edition.date)}</time></p></div>
      <div className={flagship.coverType}><span className={flagship.coverSeries}>THE PROOF OF WORK EDITION</span><Heading>{cover.title}</Heading><p>{cover.subtitle}</p></div>
      <div className={flagship.coverTeasers}><span>BITCOIN × LITECOIN<br/><b>Read the networks.</b></span><span>PEOPLE × POSSIBILITY<br/><b>Build the conversation.</b></span></div>
      {mode!=='thumbnail'&&<a className={flagship.coverStart} href={mode==='home'?editionDateHref(edition.date):'#edition-record'}>{mode==='home'?'Read this issue':'Turn the page'} <span>↗</span></a>}
      <footer className={flagship.coverBottom}><span>OPEN MONEY. OPEN MINDS.</span><span>DAILY / {edition.date.slice(5).replace('-','.')} / R{edition.revision}</span></footer>
    </section>;
  }
  if (mode === 'thumbnail') return <div className={styles.thumbnail} data-palette={cover.palette} data-motif={cover.motif} data-layout={art?.layout} data-presentation={legacy ? 'legacy' : 'archived'} aria-label={`${label}${legacy ? ' · Legacy archive jacket' : ' · Saved cover'}`}><div><span>LTC</span><time dateTime={edition.date}>{edition.date}</time></div><>{art?<img className={styles.coverPhoto} src={`/magazine/${art.coverAsset}`} width="1536" height="1024" alt="Original conceptual editorial artwork" loading="lazy"/>:<LtcEditionArtwork motif={cover.motif} seed={cover.seed} decorative/>}</><p>{cover.title}</p><small>{legacy ? 'Legacy archive jacket' : cover.theme}</small></div>;
  const Heading = mode === 'edition' ? 'h1' : 'h2';
  return <section className={styles.cover} data-palette={cover.palette} data-motif={cover.motif} data-layout={art?.layout} data-presentation={legacy ? 'legacy' : 'archived'} data-edition-date={edition.date} aria-label={`${formatEditionDate(edition.date)} magazine cover`}>
    <div className={styles.coverMasthead}><div><span className={styles.monogram}>LTC</span><span>Lunch Time<br/>Conversations</span></div><p><time dateTime={edition.date}>{formatEditionDate(edition.date)}</time><span>Daily source edition / R{edition.revision}</span></p></div>
    <div className={styles.coverCopy}><p className={styles.eyebrow}>{cover.kicker}</p><Heading className={styles.title}>{cover.title}</Heading><p className={styles.subtitle}>{cover.subtitle}</p>{sampledPrices.length > 0 && <div className={styles.marketNote}><p>Coinbase Exchange samples, not live or global prices.</p>{sampledPrices.map(source => <p key={source.id}>{source.id === 'coinbase-btc-usd' ? 'BTC/USD' : 'LTC/USD'} source time: <time dateTime={source.sourceAsOf ?? undefined}>{source.sourceAsOf} (UTC)</time></p>)}</div>}<a className={styles.coverAction} href={mode === 'home' ? editionDateHref(edition.date) : '#edition-record'}>{mode === 'home' ? 'Open this edition' : 'Begin the daily record'} <span aria-hidden="true">↗</span></a><p className={styles.byline}>AI-prepared · Sources & coverage limits inside</p></div>
    <div className={styles.visual}>{art?<img className={styles.coverPhoto} src={`/magazine/${art.coverAsset}`} width="1536" height="1024" alt="Original AI-generated conceptual editorial art, not a photograph or data chart"/>:<LtcEditionArtwork motif={cover.motif} seed={cover.seed}/>}<p>{cover.theme}{art?' / Original conceptual art':''}</p></div>
    <footer className={styles.coverFooter}><span>Bitcoin / Proof of work / Human + AI</span><span>{legacy ? 'Legacy jacket · No original cover was saved' : art?'Original AI artwork & composition · Saved with this edition':'Original generative cover · Saved with this edition'}</span></footer>
  </section>;
}

export function LtcEditionBackPage({ edition }: { edition: LtcEdition }) {
  const cover = jacket(edition);
  const page = edition.presentation?.backPage;
  const art = edition.presentation?.artDirection;
  return <section id="back-page" className={styles.backPage} data-palette={cover.palette} data-motif={cover.motif} data-presentation={page ? 'archived' : 'legacy'} aria-labelledby="back-page-title">
    <div className={styles.backMasthead}><span>LTC / The back page</span><time dateTime={edition.date}>{formatEditionDate(edition.date)}</time></div>
    <div className={styles.backContent}><div><p className={styles.eyebrow}>{page ? 'A question to carry with you' : 'From the archive'}</p><h2 id="back-page-title">{page?.title ?? 'Keep the record. Continue the conversation.'}</h2><p className={styles.question}>{page?.prompt ?? 'This original source edition predates saved daily covers and closing pages. Its source record and publication date remain unchanged.'}</p>{page && <div className={styles.practice}><span>Try this</span><p>{page.practice}</p></div>}<p className={styles.closing}>{page?.closingLine ?? 'Return to the evidence whenever you return to the story.'}</p></div><div className={styles.backVisual}>{art?<img className={styles.coverPhoto} src={`/magazine/${art.backAsset}`} width="1536" height="1024" alt="Original AI-generated conceptual closing illustration" loading="lazy"/>:<LtcEditionArtwork motif={cover.motif} seed={cover.seed} decorative/>}<span>Read slowly.<br/>Think freely.<br/>Build together.</span></div></div>
    <nav className={styles.backLinks} aria-label="After this edition"><a href="/conversations/archive/">Choose another day →</a><a href="/join/?path=ltc">Bring something to the table →</a><a href="/conversations/feed.xml">Follow the daily record ↗</a></nav><p className={styles.backNote}>{page ? 'Original editorial reflection, prepared by AI and saved with this edition. It is not an additional news claim.' : 'Consistent archive presentation. No new dated closing-page content is attributed to this earlier edition.'}</p>
  </section>;
}

export function orderedEditionBriefs(edition: LtcEdition) {
  const order = edition.presentation?.readingOrder ?? [];
  const ordered = order.map(id => edition.briefs.find(brief => brief.id === id)).filter((brief): brief is LtcEdition['briefs'][number] => Boolean(brief));
  return [...ordered, ...edition.briefs.filter(brief => !order.includes(brief.id))];
}
