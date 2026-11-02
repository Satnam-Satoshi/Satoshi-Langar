import publicationExclusionConfig from '../../config/ltc-publication-exclusions.json';
import { sourceDeskReadMore } from '../../scripts/lib/ltc-source-desk-links.mjs';
import sourceDesk from '../../content/ltc-newsroom-selections/latest.json';
import { latestLtcEdition, editionDateHref, formatEditionDate } from '../data/editions';
import s from './CommunityEditionFront.module.css';

const routes = [
  { number: '01', title: 'Understand the basics', text: 'Wallets, keys and your first safe steps.', href: '/conversations/start/', label: 'Start learning' },
  { number: '02', title: 'Follow the builders', text: 'Find projects. Check what is actually live.', href: '/conversations/community/', label: 'Meet the Litecoin family' },
  { number: '03', title: 'Read the numbers', text: 'Treasuries, custody and dated disclosures.', href: '/conversations/litecoin-distribution/', label: 'Open the distribution desk' },
  { number: '04', title: 'Bring something useful', text: 'A question, a source or a skill to share.', href: '/join/?path=ltc', label: 'Find your place' },
];

export default function CommunityEditionFront({ community = false }: { community?: boolean }) {
  const issue = latestLtcEdition;
  const titleId = community ? 'home-title' : 'frontpage-title';
  const Title = community ? 'h1' : 'h2';
  const checked = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' }).format(new Date(sourceDesk.checkedAt));
  return <section className={s.front} aria-labelledby={titleId}>
    <div className={s.mastline}><span>Independent media. Shared curiosity.</span><a href="/conversations/about/">How we report ↗</a></div>
    <div className={s.intro}>
      <p className={s.kicker}>Bitcoin roots · The Litecoin family · An open table</p>
      <Title id={titleId}>Follow the work.<br/><em>Find your people.</em></Title>
      <p className={s.dek}>The networks, the builders and the world around open money. Read the evidence. Learn something useful. Help shape what comes next.</p>
      <div className={s.actions}><a className={s.primary} href={issue ? editionDateHref(issue.date) : '/conversations/archive/'}>Read the latest issue ↗</a><a href="/conversations/#source-desk">Scan the source desk →</a></div>
      {issue && <a className={s.issue} href={editionDateHref(issue.date)}><span>Latest published issue <time dateTime={issue.date}>{formatEditionDate(issue.date)}</time></span><strong>{issue.title}</strong><span>Open the magazine &amp; sourcebook ↗</span></a>}
      <p className={s.note}>Free to read. No wallet required. AI-assisted reporting with human ownership, original source dates and visible corrections.</p>
    </div>
    <aside className={s.feature} aria-label="Special edition and source headlines">
      <a className={s.special} href="/conversations/specials/litecoin-to-the-moon/"><img src="/magazine/litecoin-to-the-moon/cover.svg" width="1086" height="1448" alt="Original orbital artwork for Litecoin to the Moon; an editorial illustration, not a price chart."/><div><p className={s.kicker}>The special edition / October 30</p><h3>Litecoin to<br/><em>the Moon.</em></h3><p>Canton, cLTC, LitVM and the road to Rome. Different rails. Better questions.</p><span>Read the special ↗</span></div></a>
      <div className={s.desk}><p className={s.kicker}>From the source desk · Checked {checked}</p>{sourceDesk.stories.slice(0, 2).map(story => <article key={story.id}><p>{story.desk}</p><h3><a href={sourceDeskReadMore(story, publicationExclusionConfig).href} aria-label={sourceDeskReadMore(story, publicationExclusionConfig).label ? `${sourceDeskReadMore(story, publicationExclusionConfig).label}: ${story.title}` : undefined}>{story.title} ↗</a></h3><span>{story.classification} · {'dateKind' in story && story.dateKind === 'observed' ? 'Observed' : 'Published'} <time dateTime={story.publishedAt}>{story.publishedAt}</time></span></article>)}</div>
    </aside>
    <nav className={s.routes} aria-label="Choose your way into the community">{routes.map(route => <a href={route.href} key={route.number}><span className={s.routeNumber}>{route.number} / A WAY IN</span><strong>{route.title}</strong><p>{route.text}</p><span className={s.routeLink}>{route.label} ↗</span></a>)}</nav>
    <div className={s.foot}><span>{community ? 'A community, built through useful work.' : 'One table. Different questions.'}</span><a href="/conversations/feed.xml">Follow the daily feed ↗</a><a href="/donate/">Help keep the commons open →</a></div>
  </section>;
}
