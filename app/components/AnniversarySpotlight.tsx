import { editorialSpecials, specialHref } from '../data/editorial-specials';
import styles from './AnniversarySpotlight.module.css';
export default function AnniversarySpotlight({ community = false }: { community?: boolean }) {
 const edition = editorialSpecials.find(item => item.slug === 'litvm-family')!;
 const href = specialHref(edition.slug); const Heading = community ? 'h1' : 'h2';
 return <section className={styles.spotlight} aria-labelledby={community ? 'home-title' : 'anniversary-title'}>
  <div className={styles.copy}>
   <p className={styles.kicker}>October 15, 2026 / The builders issue</p>
   <Heading id={community ? 'home-title' : 'anniversary-title'}>The Litecoin<br/>Family Is<br/><em>Building.</em></Heading>
   <p className={styles.people}>LitVM × Lester Labs × the community</p>
   <p className={styles.dek}>Meet the projects, follow the original conversation and explore the tools, games, data and ideas around Litecoin’s next chapter. One open table for builders, newcomers and Bitcoin readers.</p>
   <div className={styles.actions}><a className={styles.primary} href={href}>Read the builders special ↗</a><a className={styles.secondary} href={`${href}#project-guide`}>Meet the projects →</a></div>
   <p className={styles.record}>{edition.sections.length} chapters · 14 roster accounts · Public sourcebook<br/>Testnets, privacy, wrapped assets and a community invitation</p>
  </div>
  <a className={styles.art} href={href} aria-label={`Open ${edition.title}`}><img src="/magazine/litvm-family/cover.svg" width="1080" height="1350" fetchPriority="high" alt="Original silver and midnight-blue typographic cover, Fifteen Years. Still the People’s Money. LitVM × Lester Labs × the community. Litecoin’s birthday, October 13, 2026. Conceptual concentric signal rings."/><span>THE INDEPENDENT BUILDERS SPECIAL <b>OPEN THE CONVERSATION ↗</b></span></a>
  <nav className={styles.next} aria-label="Continue from the builders spotlight"><span>KEEP THE CONVERSATION GOING</span><a href="/conversations/specials/jack-mallers/">Jack Mallers × Charlie Lee ↗</a><a href="/conversations/daily/">Read the latest daily ↗</a><a href="/conversations/specials/charlie-84million/">Charlie Lee × 84 Million birthday special ↗</a></nav>
 </section>;
}
