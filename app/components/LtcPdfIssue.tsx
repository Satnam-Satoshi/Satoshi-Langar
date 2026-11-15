import styles from './LtcPdfIssue.module.css';
export const pdfIssue = { date: '2026-11-15', title: 'The Evidence Issue', page: '/conversations/editions/2026-11-15/', pdf: '/magazine/daily/LTC-2026-11-15-v1.0.pdf', cover: '/magazine/daily/LTC-2026-11-15-v1.0-cover.png' };
export default function LtcPdfIssue({ full = false }: { full?: boolean }) {
  return <section className={styles.issue} aria-label="November 15 daily PDF edition">
    <a className={styles.cover} href={full ? pdfIssue.pdf : pdfIssue.page}><img src={pdfIssue.cover} width="675" height="900" alt="LTC Magazine: The Evidence Issue, November 15, 2026" loading="lazy"/></a>
    <div><p className={styles.kicker}>LTC DAILY · <time dateTime={pdfIssue.date}>NOVEMBER 15, 2026</time> · PDF EDITION</p>
    {full ? <h1>{pdfIssue.title}</h1> : <h2>{pdfIssue.title}</h2>}
    <p className={styles.dek}>Capital. Code. Clear distinctions.</p><p>ETF flows, fund filings, builders and treasury desks. Read the same 28-page edition delivered by email, with its original sources, dates and coverage notes.</p>
    <nav className={styles.actions} aria-label="Read the November 15 edition"><a href={full ? pdfIssue.pdf : pdfIssue.page}>{full ? 'Open the PDF' : 'Read the edition'} ↗</a><a href={pdfIssue.pdf} download>Download PDF · 130 KB ↓</a></nav>
    {full && <><p className={styles.note}>Original emailed edition · v1.0 · Prepared November 15, 2026. This is the unchanged PDF, not a separately generated website edition. Publication-status notes inside the PDF describe the situation when it was prepared, not the current availability of this page.</p><p className={styles.note}>General education and research, not individualized investment advice. Sources and dated observations appear inside the PDF.</p><a href="/conversations/archive/">Browse the issue archive →</a></>}
    </div></section>;
}
