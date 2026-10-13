import { editorialSpecials, specialHref } from '../data/editorial-specials';
import styles from './AnniversarySpotlight.module.css';
export default function AnniversarySpotlight({ community = false }: { community?: boolean }) {
 const edition = editorialSpecials.find(item => item.slug === 'charlie-84million')!;
 const href = specialHref(edition.slug); const Heading = community ? 'h1' : 'h2';
 return <section className={styles.spotlight} aria-labelledby={community ? 'home-title' : 'anniversary-title'}>
  <div className={styles.copy}>
   <p className={styles.kicker}>October 13, 2026 / The birthday conversation</p>
   <Heading id={community ? 'home-title' : 'anniversary-title'}>Fifteen Years.<br/>Still the<br/><em>People’s Money.</em></Heading>
   <p className={styles.people}>Charlie Lee × 84 Million</p>
   <p className={styles.dek}>One conversation. Many ways in. Open our independent reading guide, follow the timestamped watch map, and bring your question to the next chapter of Litecoin.</p>
   <div className={styles.actions}><a className={styles.primary} href={href}>Read the birthday special ↗</a><a className={styles.secondary} href={`${href}#watch-map`}>Watch by topic →</a></div>
   <p className={styles.record}>{edition.sections.length} chapters · {edition.interview?.chapters.length} watch markers · Original show 1:08:21<br/>AI, payments, institutions, LitVM, MWEB and community</p>
  </div>
  <a className={styles.art} href={href} aria-label={`Open ${edition.title}`}><img src="/magazine/charlie-84million/campaign.png" width="1080" height="1350" fetchPriority="high" alt="Original silver and midnight-blue typographic cover, Fifteen Years. Still the People’s Money. Charlie Lee × 84 Million. Litecoin’s birthday, October 13, 2026. Conceptual concentric signal rings."/><span>THE INDEPENDENT BIRTHDAY SPECIAL <b>OPEN THE CONVERSATION ↗</b></span></a>
  <nav className={styles.next} aria-label="Continue from the birthday spotlight"><span>KEEP THE CONVERSATION GOING</span><a href="/conversations/specials/jack-mallers/">Jack Mallers × Charlie Lee ↗</a><a href="/conversations/daily/">Read the latest daily ↗</a><a href={`${href}#invitation`}>Bring your question ↗</a></nav>
 </section>;
}
