import styles from './editorial-reading-map.module.css';

/** Navigation only: no unverified PDF observations become site data. */
export default function EditorialReadingMap({ sourcebookHref }: { sourcebookHref: string }) {
 const desks = [
  ['Market tape', 'Dated prices and observations. Not a live feed.', '/conversations/updates/'],
  ['Flows & funds', 'Read the guide: holdings and flows are different.', '/conversations/desks/bitcoin-products/'],
  ['Litecoin Register', 'Independent third-party tracker. Check dates and definitions.', 'https://litecoinregister.com/'],
  ['Morpho', 'Lending mechanics, collateral and risk. Start with the guide.', '/conversations/desks/morpho/'],
  ['Builders', 'Litecoin, MWEB, LitVM and the people behind the work.', '/conversations/litecoin/'],
  ['Policy', 'Follow official documents, not just the headline.', '/conversations/desks/sec-cftc/'],
  ['Sourcebook', 'Inspect this issue’s evidence, timestamps and coverage gaps.', sourcebookHref],
 ];
 return <section className={styles.map} aria-label="Magazine reading map">
  <header><p>LTC / The reading map</p><h2>Follow the story.<br/>Then follow the source.</h2><span>Choose a desk. Guides are background reading; observations retain their own dates.</span></header>
  <nav aria-label="Editorial desks and evidence">{desks.map(([title, detail, href], index) => <a key={title} href={href}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><div><h3>{title} <span aria-hidden="true">{href.startsWith('https:') ? '↗' : '→'}</span></h3><p>{detail}</p></div></a>)}</nav>
 </section>;
}
