import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { birthday as issue, birthdayBase, birthdayPageHref, birthdaySources } from '../../../../data/proof-of-birthday';
import BirthdaySheet from '../BirthdaySheet';
import styles from '../birthday.module.css';
export function generateStaticParams() { return issue.pages.map(page => ({ page: String(page.page) })); }
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params; const entry = issue.pages.find(item => String(item.page) === page);
  return { title: `${entry?.title ?? 'Page'} · ${page}/84 · Proof of Birthday`, description: entry?.dek };
}
export default async function Reader({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params; const entry = issue.pages.find(item => String(item.page) === page);
  if (!entry) notFound();
  const previous = issue.pages.find(item => item.page === entry.page - 1), next = issue.pages.find(item => item.page === entry.page + 1);
  return <main className={styles.reader}>
    <nav className={styles.toolbar} aria-label="Anniversary reader"><a href={`${birthdayBase}#contents`}>← Contents</a><a href="/conversations/specials/proof-of-birthday/4/">Milestone timeline</a><span>Proof of Birthday / {entry.page} of 84</span><a href={issue.pdf} download>Print PDF ↓</a><details><summary>Jump to a page</summary><nav className={styles.jump} aria-label="Jump to birthday page">{issue.pages.map(item => <a key={item.page} href={birthdayPageHref(item.page)} aria-current={entry.page === item.page ? 'page' : undefined}>{String(item.page).padStart(2,'0')} / {item.title}</a>)}</nav></details><a href={`${birthdayBase}print/`}>All pages</a></nav>
    <BirthdaySheet page={entry}/>
    <nav className={styles.pager} aria-label="Previous and next birthday page"><a href={previous ? birthdayPageHref(previous.page) : birthdayBase} rel={previous?'prev':undefined}><span>{previous ? `← Page ${previous.page}` : '← The collection'}</span>{previous?.title ?? 'About this edition'}</a><a href={next ? birthdayPageHref(next.page) : `${birthdayBase}#contents`} rel={next?'next':undefined}><span>{next ? `Page ${next.page} →` : 'Keep reading →'}</span>{next?.title ?? 'Return to the contents'}</a></nav>
    {entry.sources.length>0&&<details className={styles.sourceDetails}><summary>Inspect source dates and evidence ({entry.sources.length})</summary><ol>{entry.sources.map(id=>{const source=birthdaySources.get(id)!;return <li key={id}><a href={source.url}>[{source.number}] {source.title} ↗</a><small>{source.publisher} · Record date: {source.publishedDate??'not supplied'} · Checked {source.checkedDate}</small></li>;})}</ol></details>}
    <p className={styles.readerNote}>Revision 2 / Advance edition prepared October 4, 2026. Network anniversary October 13; planned cover date October 15. AI-prepared, independent human editorial review pending. Original conceptual art does not depict verified events. <a href="/conversations/litecoin/research/2026-10-04/">Visit the companion reading room</a>.</p>
  </main>;
}
