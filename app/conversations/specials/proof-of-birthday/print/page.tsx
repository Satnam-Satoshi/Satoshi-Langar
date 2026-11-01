import { birthday as issue, birthdayBase } from '../../../../data/proof-of-birthday';
import BirthdaySheet from '../BirthdaySheet';
import styles from '../birthday.module.css';
export const metadata = { title: 'Proof of Birthday · Complete 84-page edition', robots: { index: false, follow: true } };
export default function PrintBook() { return <main className={styles.printBook} data-birthday-print><nav className={styles.printNotice}><a href={birthdayBase}>← Return to the edition</a> · <a href={issue.pdf} download>Download the checked print PDF ↓</a><p>All 84 pages in reading order. This screen and the print PDF share the same artwork, type and page compositions. On phones, text expands for comfortable reading.</p></nav>{issue.pages.map(page=><BirthdaySheet key={page.page} page={page} print/>)}</main>; }
