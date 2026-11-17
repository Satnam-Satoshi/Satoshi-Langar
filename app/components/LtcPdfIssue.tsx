import styles from './LtcPdfIssue.module.css';
import { pdfIssue, type PdfIssue } from '../data/pdf-issue';
import { formatEditionDate } from '../data/editions';
export default function LtcPdfIssue({ full = false, issue = pdfIssue }: { full?: boolean; issue?: PdfIssue }) {
  const dateLabel = formatEditionDate(issue.date);
  return <section className={styles.issue} aria-label={`${dateLabel} daily edition`}>
    <a className={styles.cover} href={full && !issue.webEdition ? issue.pdf : issue.page}><img src={issue.cover} width="675" height="900" alt={`LTC Magazine: ${issue.title}, ${dateLabel}`} loading="lazy"/></a>
    <div><p className={styles.kicker}>LTC DAILY · <time dateTime={issue.date}>{dateLabel.toUpperCase()}</time> · {issue.webEdition ? 'WEB EDITION' : 'PDF EDITION'}</p>
    {full ? <h1>{issue.title}</h1> : <h2>{issue.title}</h2>}
    <p className={styles.dek}>{issue.dek}</p><p>ETF flows, fund filings, builders and treasury desks. {issue.webEdition ? 'Read the connected editorial edition, with original graphics, tables, source dates and coverage notes.' : `Read the ${issue.pages}-page edition with its original sources, dates and coverage notes.`}</p>
    <nav className={styles.actions} aria-label={`Read the ${dateLabel} edition`}><a href={full && !issue.webEdition ? issue.pdf : issue.page}>{full && !issue.webEdition ? 'Open the PDF' : 'Read the edition'} ↗</a>{!issue.webEdition && <a href={issue.pdf} download>Download PDF · {issue.size} ↓</a>}</nav>
    {full && !issue.webEdition && <><p className={styles.note}>{issue.publicDerivative ? 'Public web derivative · v1.0-public. Editorial reporting and source dates are unchanged; private publication-workflow details and obsolete release-status text have been removed. The original emailed edition is retained separately.' : 'Canonical daily edition · v1.0. This is the unchanged original PDF. Publication-status notes inside describe the situation when prepared.'} Prepared {dateLabel}.</p><p className={styles.note}>General education and research, not individualized investment advice. Sources and dated observations appear inside the PDF.</p><a href="/conversations/archive/">Browse the issue archive →</a></>}
    </div></section>;
}
