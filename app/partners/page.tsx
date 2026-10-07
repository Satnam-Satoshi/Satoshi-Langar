import { ProgramJourney } from '../components/ProgramJourney';
import { PageIntro } from '../components/PageIntro';
export const metadata={title:'Build with us · AI and Bitcoin collaborators',description:'Prepare a scoped collaboration proposal for Bitcoin education, open tools, art or local service, with a human sponsor, clear permissions and review evidence.'};
const firstStep = {
  "path": "partners",
  "title": "Propose one useful collaboration.",
  "time": "30 MINUTES · SCOPED PROPOSAL",
  "description": "Bring a team, a tool or a skill. A small, reviewable contribution is a practical place to begin a relationship.",
  "steps": [
    {
      "title": "Choose a concrete need",
      "body": "Pick a lesson review, translation, accessible format, source check or open-source tool. Describe the person it would help."
    },
    {
      "title": "Define the contribution",
      "body": "Name a human sponsor, deliverable, license, sources, data boundary and any costs. Keep access narrow and make the work easy for someone else to review."
    },
    {
      "title": "Share only what can be public",
      "body": "Use the collaboration brief. Keep contacts, credentials and private proposals out of GitHub. A public issue invites discussion; it does not establish a partnership."
    }
  ],
  "toolkits": [
    {
      "href": "/toolkits/collaboration-starter.md",
      "label": "Collaboration proposal"
    }
  ],
  "completion": "Your proposal states a need, one deliverable, an accountable human, dependencies and a way to tell whether it helped.",
  "next": "If there is mutual interest, agree scope, review and permissions before work begins. Names, logos, funding and announcements each need the relevant human agreement. You can continue a public-source draft without waiting for a partnership.",
  "proposalTitle": "Collaboration: scoped first contribution",
  "proposalBody": "Project/team and optional public reference:\n\nHuman sponsor (public name/pseudonym):\n\nNeed and proposed deliverable:\n\nLicense, sources and data boundary:\n\nTime/cost limits:\n\nReview evidence and next decision:\n"
} satisfies Parameters<typeof ProgramJourney>[0];

export default function Page(){return <main><PageIntro eyebrow="An open invitation · No partnership implied" title="Bring your tools. Build for people." description="Bitcoin projects, AI teams, universities, artists and local organizers are welcome to contribute to a shared public good."/>
<ProgramJourney {...firstStep} />
<section className="reading-content wide-content"><div className="task-grid">{[['Bitcoin builders','Help us test self-hosted payments, wallet education, independent verification and recovery.'],['AI companies & open models','Contribute a model adapter, source checker, accessibility tool or language review—under a named human steward.'],['Educators & researchers','Turn a difficult idea into a clear lesson. Reproduce a report, challenge a method or improve a translation.'],['Local community organizations','Co-design a kitchen or meetup with people who know their own community. No organization is listed without consent.']].map(([title,body])=><article className="task-card" key={title}><h2>{title}</h2><p>{body}</p></article>)}</div><h2>One useful contribution beats a logo wall</h2><p>Start with a small public task. State your human owner, relevant experience, proposed output, license, dependencies and any costs. Review should be possible without buying a service or exposing private data.</p><p>For agent work, define sources, permission limits, data retention, a cost ceiling, review evidence and a stop mechanism. Agents may draft and test; people retain responsibility for publication and money.</p><a href="#get-started">Use the first-step toolkit ↑</a><p><a href="/agents/">Read the agent contribution model</a> · <a href="/technology/">Explore the technology direction</a></p></section></main>}
