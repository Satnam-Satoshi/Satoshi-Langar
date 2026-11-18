import styles from './LtcPdfIssue.module.css';
import { pdfIssue, type PdfIssue } from '../data/pdf-issue';
import { formatEditionDate } from '../data/editions';
export default function LtcPdfIssue({ full = false, issue = pdfIssue }: { full?: boolean; issue?: PdfIssue }) {
  const dateLabel = formatEditionDate(issue.date);
  return <section className={styles.issue} aria-label={`${dateLabel} daily PDF edition`}>
    <a className={styles.cover} href={full ? issue.pdf : issue.page}><img src={issue.cover} width="675" height="900" alt={`LTC Magazine: ${issue.title}, ${dateLabel}`} loading="lazy"/></a>
    <div><p className={styles.kicker}>LTC DAILY · <time dateTime={issue.date}>{dateLabel.toUpperCase()}</time> · PDF EDITION</p>
    {full ? <h1>{issue.title}</h1> : <h2>{issue.title}</h2>}
    <p className={styles.dek}>{issue.dek}</p><p>ETF flows, fund filings, builders and treasury desks. Read the canonical {issue.pages}-page edition used for email and the website, with its original sources, dates and coverage notes.</p>
    <nav className={styles.actions} aria-label={`Read the ${dateLabel} edition`}><a href={full ? issue.pdf : issue.page}>{full ? 'Open the PDF' : 'Read the edition'} ↗</a><a href={issue.pdf} download>Download PDF · {issue.size} ↓</a></nav>
    {full && <><p className={styles.note}>Canonical daily edition · v1.0 · Prepared {dateLabel}. This is the unchanged PDF, not a separately generated website edition. Publication-status notes inside the PDF describe the situation when it was prepared, not the current availability of this page.</p><p className={styles.note}>General education and research, not individualized investment advice. Sources and dated observations appear inside the PDF.</p><a href="/conversations/archive/">Browse the issue archive →</a></>}
    </div></section>;
}
