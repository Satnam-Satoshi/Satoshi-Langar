import type { CSSProperties } from 'react';
import { birthday as issue, birthdaySources, birthdayPageHref, type BirthdayPage } from '../../../data/proof-of-birthday';
import BirthdayGraphic from './BirthdayGraphic';
import styles from './birthday.module.css';
export default function BirthdaySheet({ page: p, print = false }: { page: BirthdayPage; print?: boolean }) {
  const cover = p.page===1, back = p.page===84;
  return <article id={`birthday-page-${p.page}`} className={`${styles.sheet} ${cover?styles.cover:''} ${back?styles.back:''}`} data-birthday-page={p.page} data-design={p.design} data-density={[2,29,31,32,74].includes(p.page)?'compact':undefined} style={{'--accent':p.accent} as CSSProperties}>
    {cover ? <>
      <img className={styles.fullArt} src={p.art!.src} alt={p.art!.alt} width="1024" height="1536" fetchPriority="high"/>
      <div className={styles.coverTop}><span>LUNCH TIME CONVERSATIONS</span><strong>LTC</strong><span>THE LITECOIN ANNIVERSARY / VOL. 01</span></div>
      <div className={styles.coverTitle}><span>FIFTEEN YEARS. STILL MAKING BLOCKS.</span><h1>Proof of<br/><em>Birthday.</em></h1><p>Litecoin at 15.</p></div>
      <div className={styles.coverTeasers}><p><b>THE ORIGINALS</b>Charlie Lee, an open launch<br/>and a very persistent idea.</p><p><b>THE NEXT CHAPTER</b>Builders. Miners. Privacy.<br/>The institutional paper trail.</p></div>
      <div className={styles.coverBottom}><strong>84</strong><div>PAGES / FOR 84 MILLION LTC<br/>ADVANCE EDITION · OCTOBER 15, 2026<br/>RESEARCH THROUGH OCTOBER 4 · REVISION {issue.revision}</div><span>FOUNDER REVIEWED<br/>OCTOBER 4, 2026</span></div>
    </> : back ? <>
      <img className={styles.fullArt} src={p.art!.src} alt={p.art!.alt} width="1024" height="1536"/>
      <div className={styles.backCopy}><p className={styles.kicker}>THE BLOCK PARTY IS OPEN.</p><h1>Make a wish.<br/><em>Then make<br/>something useful.</em></h1><p>Read a source. Test a tool.<br/>Teach a newcomer. Share a meal.</p><a href="/join/?path=ltc">Join the Satnam Satoshi community →</a></div>
      <div className={styles.backBottom}><strong>LTC / MEDIA</strong><span>AN INDEPENDENT SATNAM SATOSHI PUBLICATION<br/>FREE TO READ. OPEN TO QUESTIONS.</span><b>84</b></div>
    </> : <>
      <div className={styles.running}><span>LTC / PROOF OF BIRTHDAY</span><span>{p.section}</span></div>
      <div className={styles.content}>
        {p.design==='opening'&&p.art&&<figure className={styles.openingArt}><img src={p.art.src} alt={p.art.alt} width="1536" height="1024"/><span aria-hidden="true">{String(p.page).padStart(2,'0')}</span></figure>}
        <header className={styles.pageHeader}><p className={styles.kicker}>{p.kicker}</p><h1>{p.title}</h1><p className={styles.dek}>{p.dek}</p></header>
        {p.quote&&<figure className={styles.quote}><blockquote>“{p.quote.text}”</blockquote><figcaption>{p.quote.person} / {p.quote.date} / <a href={birthdaySources.get(p.quote.sourceId)!.url}>Original record ↗</a></figcaption></figure>}
        {p.page===4 ? <>
          <div className={styles.milestones}>{issue.milestones.map(m=><a key={m.date} href={print?`#birthday-page-${m.page}`:birthdayPageHref(m.page)}><time>{m.date}</time><strong>{m.title}</strong><span>{m.detail}</span><small>READ PAGE {m.page} →</small></a>)}</div>
          <p className={styles.timelineNote}>{p.paragraphs[0]}</p><aside className={styles.takehome}><span>THE THREE CLOCKS</span>{p.takehome}</aside>
        </> : p.page===3 ? <>
          <div className={styles.eightyFour} aria-label="84 pages, represented by 84 squares">{Array.from({length:84},(_,i)=><span key={i} data-tone={i%14<7?'blue':'silver'}/>)}</div>
          <nav className={styles.chapterMap} aria-label="Chapter starts">{issue.chapters.map(chapter=><a key={chapter.start} href={print?`#birthday-page-${chapter.start}`:birthdayPageHref(chapter.start)}><span>{String(chapter.start).padStart(2,'0')}—{chapter.end}</span>{chapter.title} →</a>)}</nav>
        </> : p.sourcebook ? <>
          <div className={styles.sourceMotif} aria-hidden="true"><span>READ</span><i>↗</i><span>THE</span><i>↗</i><span>RECORD</span></div>
          <p className={styles.sourceIntro}>{p.paragraphs[0]}</p><ol className={styles.sourceGrid}>{p.sources.map(id=>{const s=birthdaySources.get(id)!;return <li key={id}><strong>{String(s.number).padStart(3,'0')}</strong><div><a href={s.url}>{s.title} ↗</a><small>{s.publisher} · {s.publishedDate??'Undated'}</small></div></li>})}</ol>
        </> : <>
          {p.design!=='opening'&&!p.quote&&<figure className={styles.visual}>{p.art?<img src={p.art.src} alt={p.art.alt} width="1536" height="1024"/>:<><BirthdayGraphic page={p}/><div className={styles.mobileGraphic} data-kind={p.diagram?.kind} role="img" aria-label={p.diagram?.caption??p.takehome}>{(p.diagram?.labels??['Read','Question','Verify','Contribute']).map((label,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><strong>{label}</strong></div>)}</div></>}<figcaption>{p.art?.caption??p.diagram?.caption}</figcaption></figure>}
          {p.quote&&<div className={styles.quoteMotif} aria-hidden="true"><span>{String(p.page).padStart(2,'0')}</span><div>{Array.from({length:15},(_,i)=><i key={i}/>)}</div><small>FIFTEEN YEARS OF QUESTIONS</small></div>}
          {p.table&&<div className={styles.tableWrap}><table><caption>{p.table.note}</caption><thead><tr>{p.table.headings.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{p.table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
          <div className={styles.body}>{p.paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div>
          {p.bullets.length>0&&<ul className={styles.notes}>{p.bullets.map((bullet,i)=><li key={i}>{bullet}</li>)}</ul>}
          {p.links&&<div className={styles.actionLinks}>{p.links.map(link=><a key={link.href} href={link.href}>{link.label} ↗</a>)}</div>}
          <aside className={styles.takehome}><span>THE TAKEAWAY</span>{p.takehome}</aside>
        </>}
      </div>
      <div className={styles.pageSources}>{p.sources.map(id=>{const source=birthdaySources.get(id)!;return <a key={id} href={source.url}>[{source.number}] {source.title}</a>;})}</div>
      <footer className={styles.folio}><span>OCT 04 RESEARCH / OCT 15 COVER<br/>FOUNDER-REVIEWED ADVANCE EDITION</span><span>{p.classification}</span><strong>{String(p.page).padStart(2,'0')}</strong></footer>
    </>}
  </article>;
}
