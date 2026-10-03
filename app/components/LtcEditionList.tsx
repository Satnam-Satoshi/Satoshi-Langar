import type { PublicationDay } from '../data/edition-calendar';
import { editionDateHref, editionHref, formatEditionDate, type LtcEdition } from '../data/editions';
import { LtcEditionCover } from './LtcEditionPresentation';
import styles from '../conversations/magazine.module.css';

export default function LtcEditionList({ days }: { days: PublicationDay<LtcEdition>[] }) {
  return <ol className={`${styles.archiveList} ${styles.editionArchive}`}>{days.map(({ date, latest, revisions }) => <li key={date}>
    <div><p><time dateTime={date}>{formatEditionDate(date)}</time></p><p>{latest.briefs.length} source briefs</p><p>{revisions.length > 1 ? `${revisions.length} saved versions` : 'First edition'}</p><a href={editionDateHref(date)} aria-label={`Open the ${formatEditionDate(date)} magazine cover`} style={{ textDecoration: 'none' }}><LtcEditionCover edition={latest} mode="thumbnail"/></a></div>
    <div><p className={styles.kicker}>{latest.classification}</p><h2><a className={styles.headlineLink} href={editionDateHref(date)}>{latest.title}</a></h2><p>{latest.dek}</p><a className={styles.readLink} href={editionDateHref(date)}>Read this day’s edition</a><p className={styles.revisionNote}>AI-prepared · Human editorial review not recorded.</p>{revisions.length > 1 && <details className={styles.revisionHistory}><summary>Corrections & saved versions</summary><ul>{revisions.map(edition => <li key={edition.id}><a href={editionHref(edition.id)}>Revision {edition.revision}{edition.id === latest.id ? ' · latest' : ''}</a>{edition.corrections.map(correction => <p key={correction.correctsEditionId}>{correction.reason}</p>)}</li>)}</ul></details>}</div>
  </li>)}</ol>;
}
