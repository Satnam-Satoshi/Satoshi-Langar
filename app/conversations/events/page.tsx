import type { Metadata } from 'next';
import snapshot from '../../../content/ltc-events/latest.json';
import styles from '../magazine.module.css';
export const metadata: Metadata = {
  title: 'LTC · Global Bitcoin events',
  description: 'Organizer-confirmed Bitcoin event dates, with upcoming and past announcements, last-confirmed times and direct official sources.',
};
type EventRecord = (typeof snapshot.events)[number];
function EventList({events}:{events:EventRecord[]}) {
  return <ol className={styles.archiveList}>{events.map(event => <li key={event.id}>
    <div><p className={styles.kicker}>{event.region} · {event.phase === 'ongoing' ? 'Announced dates in progress' : event.phase === 'past' ? 'Past announced dates' : 'Upcoming dates'}</p><p><time dateTime={event.start}>{event.start}</time> to <time dateTime={event.end}>{event.end}</time></p><p className={styles.small}>{event.timeZone} · local dates</p></div>
    <article><h2><a className={styles.headlineLink} href={event.url}>{event.name} ↗</a></h2><p><strong>{event.location}</strong></p><p>{event.venue}</p>
      <p className={styles.small}>{event.checkStatus === 'confirmed' ? 'Organizer details confirmed' : 'Latest check unavailable; earlier details retained'} · <time dateTime={event.checkedAt}>{event.checkedAt}</time></p>
      <p className={styles.small}>Last confirmed: {event.lastConfirmedAt ?? 'No successful confirmation recorded'}. {event.phase === 'past' ? 'The listed dates have passed. This is not a report of attendance or proof the event occurred.' : 'Attendance is not arranged. Check the organizer for cancellations, day-specific venues, access and accessibility.'}</p>
      <a className={styles.readLink} href={event.url}>Read the official event page</a>
    </article>
  </li>)}</ol>;
}
export default function EventsPage() {
  const current = snapshot.events.filter(event => event.phase !== 'past');
  const past = snapshot.events.filter(event => event.phase === 'past');
  return <main className={styles.paper}>
    <nav className={styles.articleNav} aria-label="Magazine navigation"><a className={styles.articleBrand} href="/conversations/" aria-label="LTC magazine home">LTC</a><a href="/conversations/">Today’s magazine</a><a href="/meetups/">Local community gatherings →</a></nav>
    <header className={styles.articleHeader}><p className={styles.kicker}>Community &amp; the world · Events desk</p><h1>Meet the people<br/>doing the work.</h1><p className={styles.dek}>A small, sourced window into the global Bitcoin calendar. Follow the organizer, check the dates, and make room for a local gathering too.</p><div className={styles.articleMeta}><span>Source checks completed <time dateTime={snapshot.checkedAt}>{snapshot.checkedAt}</time></span><span>Organizer announced · Attendance not arranged</span></div></header>
    <section aria-labelledby="announced-events"><div className={styles.sectionHead}><h2 id="announced-events">Upcoming and ongoing</h2><p>Dates classified at the source check · {snapshot.asOf} New York edition day</p></div><p className={styles.small}>The daily publisher rechecks these three reviewed organizer pages. Each event is classified using its own local calendar. A failed check keeps the last-confirmed date visible; new or changed event details require review. This is a selected directory, not a complete calendar.</p>{current.length ? <EventList events={current}/> : <p>No upcoming dates in the reviewed directory. Follow the organizer links for later announcements.</p>}</section>
    <section aria-labelledby="past-events"><div className={styles.sectionHead}><h2 id="past-events">Past announcements</h2><p>History stays dated</p></div>{past.length ? <EventList events={past}/> : <p>No listed dates have passed at this check.</p>}</section>
    <section className={styles.eventsDirectory} aria-labelledby="organizer-directory"><div className={styles.sectionHead}><h2 id="organizer-directory">Keep exploring</h2><p>Organizer links · No dates confirmed here</p></div><div className={styles.readingShelf}><article><p className={styles.kicker}>Africa · Organizer website</p><h3><a href="https://afrobitcoin.org/">Africa Bitcoin Conference ↗</a></h3><p>A reference for further discovery. This organizer is outside the current daily collector; no upcoming date or venue is asserted here.</p></article><article><p className={styles.kicker}>Senegal · Organizer website</p><h3><a href="https://dakarbitcoindays.com/">Dakar Bitcoin Days ↗</a></h3><p>Explore the organizer’s information. Details need source verification and review before an event is added to the daily directory.</p></article><article><p className={styles.kicker}>Your neighborhood</p><h3><a href="/meetups/">Start at a shared table →</a></h3><p>A gathering can begin with a lesson and an act of service. Propose a local meetup with a responsible human host.</p></article></div></section>
    <aside className={styles.tableQuestion}><h2>Before<br/>you go.</h2><div><p>Choose the conversation, then confirm the details.</p><small>Check the current venue, local schedule, accessibility, costs and cancellation terms with the organizer. No Satnam Satoshi attendance, sponsorship or partnership is announced.</small></div></aside>
    <footer className={styles.articleFoot}><p>Share an official announcement with the <a href="/join/?path=ltc">events desk</a>, including its organizer URL, date and location.</p><p><a href="/conversations/read/a-global-movement-needs-a-local-table/">Read: A global movement needs a local table</a> · <a href="/conversations/">Return to the magazine</a></p></footer>
  </main>;
}
