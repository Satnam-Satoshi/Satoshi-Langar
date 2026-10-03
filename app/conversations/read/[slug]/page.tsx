import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { magazineArticles, magazineIssue, articleHref } from '../../../data/magazine';
import styles from '../../magazine.module.css';
export function generateStaticParams() { return magazineArticles.map(article => ({ slug: article.slug })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = magazineArticles.find(item => item.slug === slug);
  return article ? { title: `LTC · ${article.title}`, description: article.dek } : {};
}
export default async function MagazineArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = magazineArticles.find(item => item.slug === slug);
  if (!article) notFound();
  const index = magazineArticles.indexOf(article);
  const next = [magazineArticles[(index + 1) % magazineArticles.length], magazineArticles[(index + 2) % magazineArticles.length]];
  return <main className={styles.paper}>
    <nav className={styles.articleNav} aria-label="Magazine navigation"><a className={styles.articleBrand} href="/conversations/" aria-label="LTC magazine home">LTC</a><a href="/conversations/">The reading room</a><a href="/conversations/archive/">Archive →</a></nav>
    <header className={styles.articleHeader}><p className={styles.kicker}>{article.desk} · {article.classification}</p><h1>{article.title}</h1><p className={styles.dek}>{article.dek}</p><div className={styles.articleMeta}><span>{magazineIssue.byline}</span><span>Sources checked {article.sourceCheckedDate ?? magazineIssue.date}</span><span>{article.minutes} minute read</span><span><strong>{magazineIssue.status} · {magazineIssue.review}</strong></span></div></header>
    <div className={styles.articleLayout}><article className={styles.articleBody} aria-label={article.title}>{article.sections.map((section, number) => <section id={`section-${number + 1}`} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph.slice(0, 60)}>{paragraph}</p>)}{section.sourceIds && <p className={styles.sectionSources}>Source notes: {section.sourceIds.map((id, sourceIndex) => { const source = article.sources.find(item => item.id === id)!; return <span key={id}>{sourceIndex > 0 && ' · '}<a href={source.url}>{source.label}</a></span>; })}</p>}</section>)}</article><aside className={styles.articleAside} aria-label="Reading guide"><div><h2>Keep this thought</h2><p>{article.takeaway}</p></div><div><h2>In this story</h2><ol>{article.sections.map((section, number) => <li key={section.heading}><a href={`#section-${number + 1}`}>{section.heading}</a></li>)}</ol></div></aside></div>
    <section className={styles.sourceNotebook} aria-labelledby="source-notebook"><h2 id="source-notebook">The source notebook</h2><p className={styles.meta}>Checked {article.sourceCheckedDate ?? magazineIssue.date}.{article.sourceCheckedAt && ` Retrieval record: ${article.sourceCheckedAt}.`} Source availability and facts can change. Source-specific dates and qualifications are part of the article.</p><ol>{article.sources.map(source => <li key={source.id}><span>{source.kind}</span><a href={source.url}>{source.label} ↗</a><p>{source.note}</p></li>)}</ol></section>
    <aside className={styles.tableQuestion} aria-label="A question for the table"><h2>Pass the<br/>question.</h2><div><p>{article.question}</p><small>A conversation prompt, not a recommendation to buy, sell or move funds.</small></div></aside>
    <footer className={styles.articleFoot}><p><strong>Editorial note.</strong> Original AI-prepared {article.classification.toLowerCase()} for founder and community review. No human reporter, interview or completed editorial sign-off is claimed. The project’s future practices are proposals unless explicitly described as implemented.</p><p><a href="/conversations/methodology/#editorial-standard">Read our editorial compact</a> · <a href="https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/new?title=LTC%20source%20or%20correction">Suggest a correction</a> · <a href="/join/">Join the newsroom</a></p><p className={styles.small}>General, impersonal education and research. Not individualized investment, legal or tax advice. No affiliation or endorsement by cited organizations is implied. Public correction submissions should contain no confidential or personal financial information.</p></footer>
    <section className={styles.nextReads} aria-label="Continue reading">{next.map(story => <article key={story.slug}><p className={styles.kicker}>{story.desk}</p><h3><a className={styles.headlineLink} href={articleHref(story.slug)}>{story.title}</a></h3><a className={styles.readLink} href={articleHref(story.slug)}>Continue reading</a></article>)}</section>
  </main>;
}
