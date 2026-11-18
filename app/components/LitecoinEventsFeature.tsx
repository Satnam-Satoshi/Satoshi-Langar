import directory from '../../content/litecoin-events.json';
import { eventDateLabel, groupEvents } from '../../scripts/lib/litecoin-events.mjs';

export default function LitecoinEventsFeature() {
  const { upcoming } = groupEvents(directory.events, directory.checkedOn);
  return <section id="litecoin-events-feature" aria-labelledby="litecoin-events-feature-title">
    <style>{`
      #litecoin-events-feature{margin:0;padding:28px 36px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:24px;align-items:center;background:#345d9d;color:#fffefa;border-block:3px solid #171b1f;font-family:var(--font-sans,Arial,sans-serif)}
      #litecoin-events-feature .events-feature-mark{font-size:52px;line-height:1;color:#f7931a}
      #litecoin-events-feature p{margin:0;color:#fffefa;font-size:14px;line-height:1.6}
      #litecoin-events-feature .events-feature-kicker{font:10px/1.6 var(--font-mono,monospace);letter-spacing:.1em;text-transform:uppercase}
      #litecoin-events-feature h2{margin:5px 0;font:800 clamp(24px,3vw,36px)/1.1 var(--font-sans,Arial,sans-serif);letter-spacing:-.03em;color:#fffefa}
      #litecoin-events-feature a{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:12px 18px;background:#f7931a;border:2px solid #171b1f;color:#171b1f;font-size:14px;font-weight:800;white-space:nowrap;text-decoration:none}
      #litecoin-events-feature a:hover{text-decoration:underline;text-underline-offset:4px}
      #litecoin-events-feature a:focus-visible{outline:3px solid #fffefa;outline-offset:5px}
      @media(max-width:700px){#litecoin-events-feature{padding:24px 20px;grid-template-columns:1fr;gap:15px}#litecoin-events-feature .events-feature-mark{display:none}#litecoin-events-feature a{justify-self:start;white-space:normal}}
    `}</style>
    <span className="events-feature-mark" aria-hidden="true">↗</span>
    <div><p className="events-feature-kicker">Verified events directory · Checked <time dateTime={directory.checkedOn}>{eventDateLabel({startDate:directory.checkedOn})}</time></p>
      <h2 id="litecoin-events-feature-title">Find your next Litecoin conversation.</h2>
      <p>{upcoming.length ? `${upcoming.length} upcoming events in this snapshot · Online & around the world.` : 'No upcoming events verified in this snapshot. Explore the directory and official sources.'}</p></div>
    <a href="/conversations/events/">Explore events <span aria-hidden="true"> ↗</span></a>
  </section>;
}
