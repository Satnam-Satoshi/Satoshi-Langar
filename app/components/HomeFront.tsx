import MoonHomeFeature from './MoonHomeFeature';
import publicationExclusionConfig from '../../config/ltc-publication-exclusions.json';
import sourceDesk from '../../content/ltc-newsroom-selections/latest.json';
import { sourceDeskReadMore } from '../../scripts/lib/ltc-source-desk-links.mjs';
import { editionDateHref, formatEditionDate, latestLtcEdition } from '../data/editions';
import styles from './HomeFront.module.css';
import { CommunityJourney, RegisterInvitation } from './CommunityJourney';
import { LtcEditionCover } from './LtcEditionPresentation';

const checkedDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'America/New_York',
}).format(new Date(sourceDesk.checkedAt));

export default function HomeFront() {
  const issue = latestLtcEdition;
  const issueHref = issue ? editionDateHref(issue.date) : '/conversations/archive/';

  return <div className={styles.front}>
    <MoonHomeFeature primaryHeading/>
    <div className={styles.lead}>
      <section className={styles.community} aria-labelledby="home-title">
        <p className={styles.kicker}>Satnam Satoshi / Community</p>
        <h2 id="home-title">Many hands.<br/><em>A more open world.</em></h2>
        <p>Learn how Bitcoin and Litecoin work, follow the people building with them, and bring what you know to an open table.</p>
        <nav className={styles.communityLinks} aria-label="Start with Satnam Satoshi">
          <a className={styles.start} href="/conversations/start/">Start learning <span aria-hidden="true">↗</span></a>
          <a href="/join/">Contribute <span aria-hidden="true">→</span></a>
          <a className={styles.issueJump} href="#home-latest-issue">{issue ? 'Latest issue' : 'Daily archive'} <span aria-hidden="true">↓</span></a>
        </nav><p className={styles.welcome}>Free to learn. No wallet or purchase required.</p>
      </section>
      <figure className={styles.communityArt}><img src="/home/open-table-network.jpg" width="1536" height="1024" alt="Conceptual illustration of people sharing an open table, with Bitcoin and Litecoin motifs."/><figcaption>Rooted in seva. Open to everyone.<small>Community concept artwork, not an operating kitchen.</small></figcaption></figure>
    </div>
    <CommunityJourney/><RegisterInvitation/>
      <section className={styles.magazine} id="home-latest-issue" aria-labelledby="home-issue-title">
        <div className={styles.issueMasthead}>
          <a href="/conversations/">LTC <strong>Magazine</strong></a>
          <span>Independent editorial</span>
        </div>
        <div className={styles.issueLead}>
          <div className={styles.issueCopy}>
            <p className={styles.kicker}>{issue ? <>Latest published issue · <time dateTime={issue.date}>{formatEditionDate(issue.date)}</time></> : 'Publication archive'}</p>
            <h2 id="home-issue-title">{issue?.title ?? 'The daily archive'}</h2>
            {issue && <p>{issue.dek}</p>}
            <nav aria-label={issue ? 'Current daily issue' : 'Daily archive'}>
              <a className={styles.read} href={issueHref}>{issue ? 'Read the issue' : 'Browse past issues'} <span aria-hidden="true">↗</span></a>
            </nav>
          </div>
          {issue && <a className={styles.issueArt} href={issueHref} aria-label={`Read ${issue.title}`}><LtcEditionCover edition={issue} mode="thumbnail"/></a>}
        </div>
        <nav className={styles.magazineLinks} aria-label="Explore LTC Magazine">
          <a href="#home-source-desk">Source desk <span aria-hidden="true">↓</span></a>
          {issue?.date === '2026-11-09' && <a href="/magazine/daily/2026-11-09/full-reader.html">Complete editorial reader →</a>}
          <a href="/conversations/archive/">Past issues <span aria-hidden="true">↗</span></a>
          <a href="/conversations/feed.xml">RSS <span aria-hidden="true">↗</span></a>
        </nav>
      </section>
    <div className={styles.reading}>
      <section className={styles.desk} id="home-source-desk" aria-labelledby="home-source-title">
        <header className={styles.deskHeader}>
          <div>
            <p className={styles.kicker}>LTC Magazine / Checked <time dateTime={sourceDesk.checkedAt}>{checkedDate}</time></p>
            <h2 id="home-source-title">From the source desk</h2>
          </div>
          <a href="/conversations/#source-desk">Open the newsroom <span aria-hidden="true">↗</span></a>
        </header>
        {sourceDesk.stories.length ? <ul className={styles.stories}>
          {sourceDesk.stories.slice(0, 3).map(story => {
            const link = sourceDeskReadMore(story, publicationExclusionConfig);
            const dateLabel = 'dateKind' in story && story.dateKind === 'observed' ? 'Observed' : 'Published';
            return <li key={story.id}>
              <p className={styles.kicker}>{story.desk}</p>
              <h3><a href={link.href} aria-label={link.label ? `${link.label}: ${story.title}` : undefined}>{story.title} <span aria-hidden="true">↗</span></a></h3>
              <p className={styles.sourceMeta}>{story.classification} · {dateLabel} <time dateTime={story.publishedAt}>{story.publishedAt.slice(0, 10)}</time></p>
            </li>;
          })}
        </ul> : <p className={styles.emptyDesk}>No stories are listed in this source desk snapshot. Browse the newsroom for earlier reporting.</p>}
      </section>
      <aside className={styles.special} aria-labelledby="home-special-title">
        <img src="/magazine/litecoin-to-the-moon/cover-r2.png" width="1086" height="1448" loading="lazy" alt=""/>
        <div>
          <p className={styles.kicker}>Special edition / Updated <time dateTime="2026-11-12">November 12, 2026</time></p>
          <h2 id="home-special-title"><a href="/conversations/specials/litecoin-to-the-moon/">Litecoin to the Moon <span aria-hidden="true">↗</span></a></h2>
          <p>Canton, cLTC, LitVM and the builders after Rome.</p>
        </div>
      </aside>
    </div>
  </div>;
}
