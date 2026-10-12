import { editorialSpecials, specialHref } from '../data/editorial-specials';
import styles from './AnniversarySpotlight.module.css';

export default function AnniversarySpotlight({ community = false }: { community?: boolean }) {
 const edition = editorialSpecials.find(item => item.slug === 'jack-mallers')!;
 const href = specialHref(edition.slug);
 const Heading = community ? 'h1' : 'h2';
 return <section className={styles.spotlight} aria-labelledby={community ? 'home-title' : 'anniversary-title'}>
  <div className={styles.copy}>
   <p className={styles.kicker}>The birthday spotlight / Litecoin at 15</p>
   <Heading id={community ? 'home-title' : 'anniversary-title'}>Before Strike,<br/>There Was<br/><em>a Spark.</em></Heading>
   <p className={styles.people}>Jack Mallers. Charlie Lee. An open table.</p>
   <p className={styles.dek}>{community ? 'Different convictions. A shared beginning. Meet the builders, follow the evidence, and bring your next question to the community.' : 'One Lightning payment opens a bigger story: Strike, El Salvador, Bitcoin socks at PubKey, and an invitation to build across the divide.'}</p>
   <div className={styles.actions}><a className={styles.primary} href={href}>Read the special ↗</a><a className={styles.secondary} href={`${href}#invitation`}>The open invitation →</a></div>
   <p className={styles.record}>{edition.sections.length} chapters · {edition.timeline.length} timeline moments · {edition.sources.length} sources<br/>Prepared October 12 · Anniversary October 13, 2026</p>
  </div>
  <a className={styles.art} href={href} aria-label={`Open ${edition.title}`}><img src="/magazine/jack-mallers/campaign.png" width="1080" height="1350" fetchPriority="high" alt="Original navy and copper cover for Before Strike, There Was a Spark, connecting Jack Mallers and Charlie Lee with an abstract glowing spark."/><span>THE INDEPENDENT SPECIAL <b>01 / OPEN THE STORY ↗</b></span></a>
  <nav className={styles.next} aria-label="Continue from the birthday spotlight"><span>KEEP THE CONVERSATION GOING</span><a href={`${href}#timeline`}>Trace the journey ↗</a><a href="/conversations/daily/">Read the latest daily ↗</a><a href="/join/?path=ltc">Bring a question or skill ↗</a></nav>
 </section>;
}
