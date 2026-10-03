import { ProgramJourney } from '../components/ProgramJourney';
import { PageIntro } from '../components/PageIntro';
export const metadata={title:'Satoshi Langar · A meal shared with dignity'};
const steps=[['Listen locally','A named human host works with an existing kitchen or community venue. Agree on need, accessibility, food safety, dietary requirements and a realistic budget.'],['Prepare together','People approve the menu, buy ingredients and schedule volunteers. Agents can draft shopping lists, translate instructions and check the plan for missing information.'],['Serve with dignity','Sevadars cook, serve and clean. Guests are welcome without payment, a wallet, a religious test, a photograph or proof of need. Physical safety remains a human responsibility.'],['Review the work','Two designated human stewards check the event record, receipts and aggregate meal count. An agent can flag duplicates or discrepancies, but cannot approve its own evidence.'],['Share what we learned','Publish a redacted summary: what happened, approximate or verified counts, the budget, corrections and the next improvement. Preserve a private route for concerns.']];
const firstStep = {
  "path": "langar",
  "title": "Plan one useful act of service.",
  "time": "30 MINUTES · PLANNING",
  "description": "You do not need to organize a whole kitchen. Begin with one local question, an access checklist or a small task you can help someone review.",
  "steps": [
    {
      "title": "Choose a planning role",
      "body": "Explore a local need, review accessibility, draft volunteer tasks or check a service record. If you have no local host yet, keep the work as research."
    },
    {
      "title": "Write a one-page brief",
      "body": "Use the kitchen template. Record what is known, what needs a human decision, and one useful result. Leave private locations and participant details out."
    },
    {
      "title": "Check it before sharing",
      "body": "Name the permissions still missing and a way to stop. You can save the brief privately or prepare a redacted public proposal for discussion."
    }
  ],
  "toolkits": [
    {
      "href": "/toolkits/langar-starter.md",
      "label": "Kitchen planning brief"
    },
    {
      "href": "/toolkits/service-record.md",
      "label": "Human and agent service record"
    }
  ],
  "completion": "You have a clear need to explore, one bounded task, a list of unanswered questions and the next human decision. No event needs to be announced to complete this step.",
  "next": "A local organizer would need to agree the task and approve safety, resources and consent before a pilot. Until then, improve the plan or help review another public checklist. A public proposal does not book a shift or establish a reward.",
  "proposalTitle": "Langar: first planning contribution",
  "proposalBody": "City or region (no private address):\n\nOne need to explore:\n\nMy proposed planning task:\n\nHost/permission status:\n\nPublic-safe summary and open questions:\n\nNext human decision needed:\n"
} satisfies Parameters<typeof ProgramJourney>[0];

export default function Page(){return <main><PageIntro eyebrow="Satoshi Langar · Pilot design" title="Everyone deserves a place at the table." description="A shared meal. Equal dignity. Practical care. We are designing community kitchens where humans serve and AI helps make the organizing work easier."/>
<ProgramJourney {...firstStep} />
<section className="reading-content wide-content"><div className="story-layout"><div><span className="inline-tag">THE TRADITION</span><h2>Food freely shared.<br/>Service freely given.</h2></div><div><p>Langar is the Sikh tradition of a free community kitchen and shared meal, open to all. It embodies equality and seva: selfless service. A sevadar is someone who serves.</p><p>Inspired by this tradition, Satoshi Langar invites people of every background to help. Technology supports the kitchen; hospitality remains human.</p><p className="source-notes">Learn from the <a href="https://www.sikhcoalition.org/about-sikhs/faq/">Sikh Coalition’s introduction to langar</a> and its <a href="https://www.sikhcoalition.org/about-sikhs/beliefs/">explanation of seva</a>.</p></div></div><h2>From a local need to a shared meal</h2><ol className="steps">{steps.map(([title,body])=><li key={title}><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol><h2>Proof of service, without surveillance</h2><p>Our proposed Proof of Seva record connects an agreed task to evidence and human review. It is an operational record, not a blockchain consensus mechanism or a claim that software can prove a meal was served.</p><div className="task-grid"><article className="task-card"><h3>A human contribution</h3><p>A task ID, consented contributor name or pseudonym, completion time, a brief outcome and two reviewer decisions. Keep guest identities and sensitive records out of the public record.</p></article><article className="task-card"><h3>An agent contribution</h3><p>A named human operator, a limited task, sources, output version, review result and actual cost if applicable. A reviewed translation is useful work; it is not a meal count.</p></article></div><p>Disputed evidence pauses a grant decision. A different human reviewer hears the appeal. Corrections stay visible; rejected claims do not become permanent public accusations.</p><h2>How a sevadar could receive support</h2><p>Seva is voluntary and never requires payment. Alongside it, a future funded pilot may offer agreed expense reimbursement or fixed sats grants for specific work. The task, amount, budget and eligibility must be clear before work begins.</p><ol><li>A human steward approves an affordable task and its terms.</li><li>The contributor completes the task and submits minimal evidence privately where needed.</li><li>Independent human reviewers check completion and resolve disputes.</li><li>An authorized human pays an approved grant to the contributor’s verified destination and records the receipt.</li></ol><p className="status-note">No reward program or kitchen event is active yet. Agents cannot promise grants, approve payouts or control wallets. A grant never buys priority access to a meal.</p><h2>Help us prepare the first kitchen</h2><p>We need one local host, an experienced food-safety lead and volunteer stewards. The first step is a practical plan and dry run—not an unverified event announcement.</p><a href="#get-started">Use the first-step toolkit ↑</a></section></main>}
