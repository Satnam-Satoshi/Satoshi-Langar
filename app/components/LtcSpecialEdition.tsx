import { birthday as issue, birthdayBase, birthdayPageHref } from '../data/proof-of-birthday';
import styles from './LtcSpecialEdition.module.css';

export default function LtcSpecialEdition({ month }: { month?: string }) {
  if (month && !issue.preparedAt.startsWith(month)) return null;
  return <section className={styles.collection} aria-labelledby="special-archive" data-special-edition={issue.id}>
    <div className={styles.sectionHead}><h2 id="special-archive">The special editions</h2><p>A place on the shelf. A story to keep.</p></div>
    <article className={styles.card}>
      <a href={birthdayBase} className={styles.cover} aria-label="Open Proof of Birthday, the 84-page Litecoin special">
        <img src={issue.pages[0].art!.src} alt="A sculptural silver 15 birthday candle on an open ledger." width="1024" height="1536" loading="lazy"/>
        <div aria-hidden="true"><span>LTC / THE ANNIVERSARY EDITION</span><strong>Proof of<br/><em>Birthday.</em></strong><small>84 PAGES / LITECOIN AT 15</small></div>
      </a>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Special issue / 84 pages / Revision {issue.revision}</p>
        <h3><a href={birthdayBase}>Fifteen years.<br/><em>Still making blocks.</em></a></h3>
        <p>Proof of Birthday follows Litecoin from an open launch to a global community: Charlie Lee, the Foundation, merged mining, privacy builders and the institutional paper trail.</p>
        <p className={styles.review}>Founder reviewed <time dateTime={issue.review.reviewedOn}>October 4, 2026</time></p>
        <div className={styles.actions}><a href={birthdayPageHref(1)}>Read the magazine <span aria-hidden="true">↗</span></a><a href={`${birthdayBase}#contents`}>Explore the index →</a><a href={issue.pdf} download>Download the PDF ↓</a></div>
        <p className={styles.dates}>Prepared October 4, 2026 · Research through October 4 · Advance cover date October 15 · Network anniversary October 13. AI-prepared; source-specific limitations remain visible.</p>
      </div>
    </article>
  </section>;
}
