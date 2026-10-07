import { ProgramJourney } from '../components/ProgramJourney';
import { PageIntro } from '../components/PageIntro';
export const metadata={title:'Bitcoin meetups',description:'Draft a Bitcoin learning-circle plan with a sample agenda and host checklist covering access, consent and venue permission. Event dates remain unconfirmed.'};
const firstStep = {
  "path": "meetups",
  "title": "Sketch a gathering people can actually attend.",
  "time": "30 MINUTES · HOST PLAN",
  "description": "You can start with an idea for a small learning circle. You do not need a confirmed venue to draft the plan, and a draft is not a public invitation.",
  "steps": [
    {
      "title": "Choose a purpose and region",
      "body": "Pick one lesson or useful group task. State a city or region, audience and language; leave private addresses out of the proposal."
    },
    {
      "title": "Build a host checklist",
      "body": "Use the template to consider venue permission, accessibility, conduct, consent, a backup host and cancellation. Mark unconfirmed items honestly."
    },
    {
      "title": "Separate planning from announcing",
      "body": "Review the agenda and outstanding approvals. Save the draft or ask for feedback through a public proposal; do not advertise an event as confirmed."
    }
  ],
  "toolkits": [
    {
      "href": "/toolkits/meetup-starter.md",
      "label": "Meetup host pack"
    }
  ],
  "completion": "You have a purpose, a draft agenda, a region and a clear checklist of host decisions. No date or attendance count has to be invented.",
  "next": "A human host and venue must accept the plan before an event is listed. If you prefer to participate rather than host, start with a lesson or another contribution; no meetup dates are confirmed here yet.",
  "proposalTitle": "Meetup: introductory gathering plan",
  "proposalBody": "City or region:\n\nProposed purpose, audience and language:\n\nDraft agenda:\n\nHost/venue permission status:\n\nAccessibility and consent questions:\n\nOne planning task I can do:\n"
} satisfies Parameters<typeof ProgramJourney>[0];

export default function Page(){return <main><PageIntro eyebrow="Meet locally · Think globally" title="The next good idea might be sitting beside you." description="Bring newcomers, Bitcoiners, artists and curious builders together. A welcoming conversation can become a lesson, a useful tool or a community meal."/>
<ProgramJourney {...firstStep} />
<section className="reading-content wide-content"><p className="status-note">Host invitations are open. No dates or locations are confirmed yet. We publish an event only after its local host agrees.</p><h2>A simple first gathering</h2><div className="task-grid"><article className="task-card"><h3>Learn · 20 minutes</h3><p>Read one Sikh Bitcoin lesson together. Leave time for basic questions. No one needs to own bitcoin.</p></article><article className="task-card"><h3>Build · 20 minutes</h3><p>Review a source, improve a translation or sketch a kitchen plan. Give each person one small, useful task.</p></article><article className="task-card"><h3>Share · 20 minutes</h3><p>Let an artist, developer or organizer show their work. No pressure to invest, donate or reveal balances.</p></article><article className="task-card"><h3>Serve · A next step</h3><p>Agree a practical contribution to a local need, with a named organizer and realistic follow-up.</p></article></div><h2>What makes a good host</h2><p>A safe, accessible venue; clear language and time-zone information; a code of conduct; photo consent; and a private way to raise a concern. A meal event also needs a food-safety lead and host approval.</p><p>Experienced Bitcoiners: bring patience, a demonstration and your questions. The most valuable contribution may be helping someone feel comfortable asking their first question.</p><a href="#get-started">Use the first-step toolkit ↑</a></section></main>}
