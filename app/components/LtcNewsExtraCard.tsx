import { octoberSixExtra as extra, newsExtraHref } from '../data/news-extra';
import styles from '../conversations/extras/extra.module.css';

export default function LtcNewsExtraCard() {
  return <aside className={styles.extraCard} id="october-6-extra" aria-labelledby="october-6-extra-title">
    <a className={styles.cardArt} href={newsExtraHref} aria-label="Read the October 6 news extra"><img src={extra.cover} width="1086" height="1448" alt={extra.coverAlt} loading="lazy"/></a>
    <div><p className={styles.kicker}>October 6, 2026 / News extra</p><h2 id="october-6-extra-title"><a href={newsExtraHref}>Great Scott.<br/><em>Litecoin meets DeLorean.</em></a></h2><p>A new partnership. A deeper look at LitVM, Luxxfolio, Lite Strategy and the institutional record.</p><a className={styles.button} href={newsExtraHref}>Read the illustrated news extra ↗</a><small>Separately dated reporting · The morning issue’s data is preserved.</small></div>
  </aside>;
}
