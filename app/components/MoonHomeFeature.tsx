import { editorialSpecials, specialArtwork, specialHref } from '../data/editorial-specials';
import { editionDateHref, latestLtcEdition } from '../data/editions';
import styles from './MoonHomeFeature.module.css';

export default function MoonHomeFeature({ primaryHeading = false }: { primaryHeading?: boolean }) {
  const moon = editorialSpecials.find(special => special.slug === 'litecoin-to-the-moon')!;
  const Heading = primaryHeading ? 'h1' : 'h2';
  return <section id="featured-moon" className={styles.feature} data-primary-feature="litecoin-to-the-moon" aria-labelledby="featured-moon-title">
    <div className={styles.copy}>
      <p className={styles.kicker}>The main feature / LTC Magazine</p>
      <Heading id="featured-moon-title">Litecoin to<br/>the <em>Moon.</em></Heading>
      <p className={styles.dek}>{moon.dek}</p>
      <nav className={styles.actions} aria-label="Read our featured Moon edition">
        <a className={styles.read} href={specialHref(moon.slug)}>Read the featured edition ↗</a>
        <a href={`${specialHref(moon.slug)}#contents`}>Explore the chapters →</a>
      </nav>
      <p className={styles.note}>Source-linked special · Updated <time dateTime={moon.researchThrough}>November 12, 2026</time> · An editorial theme, not a price forecast.</p>
      {latestLtcEdition && <a className={styles.daily} href={editionDateHref(latestLtcEdition.date)}>Also in the daily newsroom: <strong>{latestLtcEdition.title}</strong> ↗</a>}
    </div>
    <a className={styles.cover} href={specialHref(moon.slug)} aria-label="Open Litecoin to the Moon">
      <img src={specialArtwork(moon.slug)} width="1122" height="1402" fetchPriority="high" alt="Litecoin to the Moon magazine cover: a silver lunar Litecoin, cream headline and orange accents."/>
    </a>
  </section>;
}
