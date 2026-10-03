import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ltcPublicationMonths, archiveMonthHref } from '../../../data/editions';
import { formatPublicationMonth } from '../../../data/edition-calendar';
import LtcEditionCalendar from '../../../components/LtcEditionCalendar';
import LtcEditionList from '../../../components/LtcEditionList';
import styles from '../../magazine.module.css';

export const dynamicParams = false;
export function generateStaticParams() { return ltcPublicationMonths.map(({ month }) => ({ month })); }
export async function generateMetadata({ params }: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const { month } = await params;
  return ltcPublicationMonths.some(item => item.month === month) ? { title: `LTC · ${formatPublicationMonth(month)} · Publication calendar`, description: 'Choose a day to read its LTC edition, sources and correction history.' } : {};
}

export default async function MonthArchivePage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const index = ltcPublicationMonths.findIndex(item => item.month === month);
  if (index < 0) notFound();
  const { days } = ltcPublicationMonths[index];
  const earlier = ltcPublicationMonths[index + 1];
  const later = ltcPublicationMonths[index - 1];
  return <main className={styles.paper}>
    <nav className={styles.articleNav} aria-label="Magazine navigation"><a className={styles.articleBrand} href="/conversations/" aria-label="LTC magazine home">LTC</a><a href="/conversations/archive/">All publication months →</a><a href="/conversations/feed.xml">RSS feed</a></nav>
    <header className={styles.articleHeader}><p className={styles.kicker}>The daily publication calendar</p><h1>{formatPublicationMonth(month)}</h1><p className={styles.dek}>A day’s record, kept in its place.</p><p className={styles.meta}>{days.length} published {days.length === 1 ? 'day' : 'days'} · Publication dates use America/New_York · Source-effective dates remain inside each issue.</p></header>
    <div className={styles.monthLayout}><LtcEditionCalendar month={month} days={days} /><section className={styles.monthNote} aria-labelledby="calendar-guide"><p className={styles.kicker}>Make it a daily habit</p><h2 id="calendar-guide">Read the day.<br/>Keep the context.</h2><p>Choose a marked date for its latest accepted edition. Each day keeps its sourcebook and missing coverage. A correction adds a version to that day; it never creates another publication day.</p><p>Daily target: 10 a.m. New York time. A missed or withheld publication leaves a gap. We do not invent an issue to fill the calendar.</p><a className={styles.readLink} href="/conversations/">Return to the latest edition</a></section></div>
    <nav className={styles.dayNavigation} aria-label="Browse publication months"><div>{earlier && <a href={archiveMonthHref(earlier.month)}>← {formatPublicationMonth(earlier.month)}</a>}</div><a href="/conversations/archive/">All months</a><div>{later && <a href={archiveMonthHref(later.month)}>{formatPublicationMonth(later.month)} →</a>}</div></nav>
    <section aria-labelledby="month-editions"><div className={styles.sectionHead}><h2 id="month-editions">Published this month</h2><p>Newest day first</p></div><LtcEditionList days={days} /></section>
  </main>;
}
