import type { Metadata } from 'next';
// Preserve this existing route's stylesheet dependency and shared chunk order.
import '../magazine.module.css';
import directory from '../../../content/litecoin-events.json';
import { eventDateLabel, eventStatus, groupEvents, validateEvents } from '../../../scripts/lib/litecoin-events.mjs';
import { eventsStyles } from './styles';

export const metadata: Metadata = {
  title: 'Litecoin events — Meet the people behind the network',
  description: `A verified Litecoin events directory: online conversations and in-person gatherings, with dates, timezones and organizer sources. Last checked ${eventDateLabel({startDate:directory.checkedOn})}.`,
  alternates: { canonical: 'https://ltcmagazine.org/conversations/events/' },
};

type Event = typeof directory.events[number];

function NetworkArt() {
  return <svg viewBox="0 0 640 510" role="img" aria-label="Original conceptual illustration: a globe, shared conversations and a path to a gathering. Not a map of event coverage.">
    <rect width="640" height="510" fill="#e8eef8"/>
    <g stroke="#345d9d" opacity=".13" fill="none">{[80,160,240,320,400,480,560].map(x=><path key={x} d={`M${x} 0v510`}/>)}{[80,160,240,320,400,480].map(y=><path key={y} d={`M0 ${y}h640`}/>)}</g>
    <circle cx="330" cy="245" r="169" fill="#fffefa" stroke="#171b1f" strokeWidth="3"/>
    <g fill="none" stroke="#345d9d" strokeWidth="2"><ellipse cx="330" cy="245" rx="89" ry="169"/><ellipse cx="330" cy="245" rx="169" ry="58"/><path d="M161 245h338M330 76v338M191 149h278M191 341h278"/></g>
    <path d="M75 375C142 293 223 458 367 312S533 208 577 97" fill="none" stroke="#171b1f" strokeWidth="12"/>
    <path d="M75 375C142 293 223 458 367 312S533 208 577 97" fill="none" stroke="#f7931a" strokeWidth="7"/>
    <path d="m550 109 29-17 8 32" stroke="#171b1f" strokeWidth="4" fill="none"/>
    <g transform="translate(49 68) rotate(-7)"><path d="M0 0h170v105H84l-34 27v-27H0Z" fill="#345d9d" stroke="#171b1f" strokeWidth="3"/><circle cx="44" cy="51" r="7" fill="#fffefa"/><circle cx="83" cy="51" r="7" fill="#fffefa"/><circle cx="122" cy="51" r="7" fill="#fffefa"/></g>
    <g transform="translate(434 300) rotate(8)"><rect width="150" height="143" fill="#fffefa" stroke="#171b1f" strokeWidth="3"/><path d="M0 35h150" stroke="#171b1f" strokeWidth="3"/><path d="M38-10v25M112-10v25" stroke="#171b1f" strokeWidth="8"/>{[40,75,110].map(x=><g key={x} fill="#345d9d"><circle cx={x} cy="66" r="7"/><circle cx={x} cy="105" r="7"/></g>)}<circle cx="110" cy="105" r="19" fill="#f7931a" stroke="#171b1f" strokeWidth="2"/></g>
    <circle cx="276" cy="279" r="49" fill="#f7931a" stroke="#171b1f" strokeWidth="3"/><text x="276" y="300" fill="#171b1f" fontSize="65" fontWeight="700" textAnchor="middle">Ł</text>
    <path d="M67 447h180M67 458h100" stroke="#171b1f" strokeWidth="3"/>
    <text x="366" y="49" fill="#345d9d" fontFamily="monospace" fontSize="13">PEOPLE MAKE A NETWORK.</text>
  </svg>;
}

function EventArt({ online }: { online: boolean }) {
  return <svg viewBox="0 0 400 240" aria-hidden="true" focusable="false">
    {online ? <><circle cx="200" cy="118" r="94" fill="none" stroke="#fffefa" strokeWidth="2" strokeDasharray="5 8"/><path d="M42 184 201 47l155 138M42 184h314" fill="none" stroke="#f7931a" strokeWidth="3"/>{[[42,184],[201,47],[356,185]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="23" fill="#fffefa"/><circle cx={x} cy={y-5} r="7" fill="#345d9d"/><path d={`M${x-12} ${y+12}q12-21 24 0`} fill="#345d9d"/></g>)}<rect x="126" y="84" width="148" height="94" rx="8" fill="#fffefa" stroke="#171b1f" strokeWidth="3"/><path d="M184 115v-10a16 16 0 0 1 32 0v10" fill="none" stroke="#171b1f" strokeWidth="4"/><rect x="178" y="115" width="44" height="37" rx="3" fill="#f7931a"/><circle cx="200" cy="130" r="4" fill="#171b1f"/><path d="M200 132v10" stroke="#171b1f" strokeWidth="3"/></> : <><circle cx="302" cy="64" r="35" fill="#f7931a"/><path d="M25 194h350M25 208h350M67 222h256" stroke="#345d9d" strokeWidth="3"/><path d="M53 180Q117 160 129 94l54 86M123 180Q199 142 201 48l77 132M208 180Q281 160 299 100l48 80" fill="#fffefa" stroke="#171b1f" strokeWidth="3"/><path d="M129 94 161 180M201 48l48 132M299 100l30 80" stroke="#345d9d" strokeWidth="2"/><path d="M47 182h308" stroke="#171b1f" strokeWidth="7"/></>}
  </svg>;
}

function EventCard({ event, number }: { event: Event; number: number }) {
  const online = event.format === 'Online';
  return <article className={`event-record ${online ? 'event-online' : 'event-place'}`} id={event.id} aria-labelledby={`${event.id}-title`}>
    <div className="event-poster"><span className="event-number">{String(number).padStart(2, '0')} / {event.format}</span><EventArt online={online}/><p className="event-poster-word">{online ? <>Across<br/>the network.</> : <>Meet in<br/>Sydney.</>}</p><p className="event-art-note">Conceptual editorial illustration</p></div>
    <div className="event-copy"><p className="event-kicker">{eventStatus(event, directory.checkedOn)} as of {directory.checkedOn} · {event.format}</p>
      <h3 id={`${event.id}-title`}>{event.title}</h3><p className="event-date"><time dateTime={event.startDate}>{eventDateLabel(event)}</time></p>
      <p className="event-summary">{event.summary}</p>
      <dl className="event-facts"><div><dt>{online ? 'Start time' : 'Local timezone'}</dt><dd>{event.startTime ? <><time dateTime={`${event.startDate}T${event.startTime}:00Z`}>{event.startTime} UTC</time><small>{event.alternateTime}</small></> : <>{event.timeZoneLabel}<small>{event.timeZone}</small></>}</dd></div><div><dt>{online ? 'Where to join' : 'Venue'}</dt><dd>{event.location}{event.address && <small>{event.address}</small>}</dd></div></dl>
      <p className="event-planning">{event.planningNote}</p>
      <a className="event-button" href={event.organizerUrl}>{online ? 'Read Nym’s event details' : 'Plan with the organizer'} <span aria-hidden="true">↗</span></a>
      <details className="event-sources"><summary>Sources &amp; verification <span>{event.sources.length} {event.sources.length === 1 ? 'source' : 'sources'}</span></summary><p>Last checked <time dateTime={event.checkedOn}>{eventDateLabel({startDate:event.checkedOn})}</time>. {event.participation}</p><ul>{event.sources.map(source=><li key={source.url}><a href={source.url}>{source.label} ↗</a><p>{source.supports}</p></li>)}</ul></details>
    </div>
  </article>;
}

export default function EventsPage() {
  validateEvents(directory);
  const { upcoming, past } = groupEvents(directory.events, directory.checkedOn);
  return <main className="events-page" data-site="events">
    <style>{eventsStyles}</style>
    <nav className="events-breadcrumb" aria-label="Events breadcrumb"><a href="/conversations/">LTC Magazine</a><span aria-hidden="true">/</span><span aria-current="page">Events</span><a className="events-community" href="https://satnamsatoshi.com/">Satnam Satoshi ↗</a></nav>
    <header className="events-hero"><div className="events-hero-copy"><p className="event-kicker">The gathering place / A verified events directory</p><h1>Meet the people<br/>behind <em>the network.</em></h1><p className="events-deck">A shared question. A new connection.<br/>Find Litecoin conversations online and around the world.</p><p className="events-scope">{directory.scope}</p><a className="event-button" href="#upcoming">Explore the calendar <span aria-hidden="true">↓</span></a></div><figure><NetworkArt/><figcaption>Open money. Real conversations.</figcaption></figure></header>
    <div className="events-checkline"><span>Last checked <time dateTime={directory.checkedOn}>{eventDateLabel({startDate:directory.checkedOn})}</time></span><span>{upcoming.length} upcoming {upcoming.length === 1 ? 'event' : 'events'} verified</span><a href="#how-we-check">How we check →</a></div>
    <section className="events-list" id="upcoming" aria-labelledby="upcoming-title"><div className="events-section-heading"><div><p className="event-kicker">01 / On the calendar</p><h2 id="upcoming-title">Next conversations.</h2></div><p>Dates and status reflect the check above.<br/>Confirm plans with the organizer.</p></div>
      {upcoming.length ? upcoming.map((event,index)=><EventCard event={event} number={index+1} key={event.id}/>) : <div className="events-empty"><h3>No upcoming events verified in this snapshot.</h3><p>We add gatherings when dates and Litecoin participation can be checked against primary sources.</p><a href="https://litecoin.com/events">Explore the Foundation’s calendar ↗</a></div>}
    </section>
    {past.length > 0 && <section className="events-list events-past" aria-labelledby="past-title"><div className="events-section-heading"><div><p className="event-kicker">From the record</p><h2 id="past-title">Past gatherings.</h2></div><p>Historical listings. These are no longer upcoming.</p></div>{past.map((event,index)=><EventCard key={event.id} event={event} number={index+1}/>)}</section>}
    <section className="events-method" id="how-we-check" aria-labelledby="method-title"><div><p className="event-kicker">02 / Follow the evidence</p><h2 id="method-title">A date.<br/>A place.<br/><em>A source.</em></h2><p>Useful plans start with details you can check.</p></div><div className="events-method-steps"><article><span>01</span><div><h3>Start with the organizer.</h3><p>Every entry links to primary event information. For an in-person gathering, we also check the venue where possible.</p></div></article><article><span>02</span><div><h3>Keep the clock visible.</h3><p>Times carry a timezone. A missing end time stays unknown. The directory is a dated editorial snapshot; organizer details can change.</p></div></article><article><span>03</span><div><h3>Keep the scope honest.</h3><p>A listing shows a verified Litecoin connection, not an endorsement by LTC Magazine. We do not organize these events. Past gatherings are separate from upcoming dates.</p></div></article></div></section>
    <section className="events-invitation" aria-labelledby="contribute-title"><span className="events-invitation-mark" aria-hidden="true">↗</span><div><p className="event-kicker">03 / Help the next person find their way</p><h2 id="contribute-title">Know a gathering<br/>we should check?</h2><p>Bring an organizer link, date, timezone and a clear Litecoin connection to our existing editorial contribution route.</p><a className="event-button" href="/conversations/about/#editorial-standard">Editorial standards &amp; contribution links →</a><p className="events-small">Source and correction drafts use GitHub. Submitting one makes it public; publication is subject to editorial review.</p></div><aside><h3>Keep exploring.</h3><a href="https://litecoin.com/events">Foundation events &amp; past gatherings ↗</a><a href="/conversations/litecoin/">The Litecoin fieldbook →</a><a href="/conversations/">Back to LTC Magazine →</a><a href="https://satnamsatoshi.com/">Back to Satnam Satoshi ↗</a></aside></section>
  </main>;
}
