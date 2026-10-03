import { ProgramJourney } from '../components/ProgramJourney';
import { PageIntro } from '../components/PageIntro';
const sections = [{"title": "The idea", "body": "Community savings circles, including chit fund traditions, raise useful questions: how should contributions, turns, records, disputes and accountability work? We want to study these with communities before designing a service."}, {"title": "What we are doing now", "body": "Collecting documented examples, asking about real needs and comparing governance approaches. You can help with plain-language education, accounting design, accessibility and research."}, {"title": "What this page offers", "body": "Information and an invitation to contribute research. No fund is operating here. We are not accepting deposits, collecting contributions, making loans, allocating payouts or promising returns."}, {"title": "Before any financial pilot", "body": "A specific jurisdiction, qualified legal review, named human operators, participant protections, custody controls, accounting and dispute processes must be established. An AI agent will not hold or manage community funds."}];
const firstStep = {
  "path": "research",
  "title": "Learn from one mutual-aid example.",
  "time": "30 MINUTES · RESEARCH NOTE",
  "description": "Help the community understand how cooperation works by documenting one public example. This path is for learning and governance research.",
  "steps": [
    {
      "title": "Choose a documented question",
      "body": "Find a public case study about community cooperation or savings governance. Ask one narrow question about decisions, records, access or disputes."
    },
    {
      "title": "Separate evidence from opinion",
      "body": "Use the research note to record the source, place, date, reported experience and unknowns. Do not recruit participants or ask anyone for funds."
    },
    {
      "title": "Write one useful learning",
      "body": "Explain what the source supports and what would need further review. Keep the note privately or offer a public-safe summary for discussion."
    }
  ],
  "toolkits": [
    {
      "href": "/toolkits/mutual-aid-research-starter.md",
      "label": "Mutual-aid research note"
    }
  ],
  "completion": "You have one cited example, a clear question, an honest statement of uncertainty and a useful follow-up. No financial account or contribution is involved.",
  "next": "Compare another documented model or request a review of your note. A financial pilot would require a separate jurisdiction-specific proposal and qualified human review. No fund, loan or payout begins through this path.",
  "proposalTitle": "Crypto Kitty: mutual-aid research note",
  "proposalBody": "Research question:\n\nPublic example and source:\n\nPlace/date described:\n\nWhat the source establishes:\n\nLimitations and open questions:\n\nOne useful next research step:\n"
} satisfies Parameters<typeof ProgramJourney>[0];

export default function Page() { return <main><PageIntro eyebrow={"Crypto Kitty \u00b7 Research"} title={"Explore how communities can support each other."} description={"A research space for community savings circles, mutual aid and the responsibilities that make shared resources trustworthy."} />
<ProgramJourney {...firstStep} />
<section className="reading-content">{sections.map(({title,body}) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}<a className="launch-button" href="/join/?path=research">Make my research plan →</a></section></main>; }
