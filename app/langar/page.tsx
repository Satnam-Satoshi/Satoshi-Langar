import { ProgramJourney } from '../components/ProgramJourney';
import s from '../components/program-page.module.css';
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

export default function Page(){return <main className={s.page} data-program="langar"><div className={s.wrap}>
<section className={s.hero}><div><p className={s.eyebrow}>Satoshi Langar / The community kitchen idea</p><h1>A shared meal.<br/><em>An equal place.</em></h1><p>Langar is a free community kitchen rooted in the Sikh tradition of equality and seva. Our idea is simple: bring people together to share food with dignity, while open tools and AI help with the organizing work.</p><div className={s.actions}><a className={s.button} href="#the-idea">Understand the idea ↓</a><a href="#get-started">Help plan a kitchen →</a></div></div><figure><img src="/magazine/proof-of-birthday/long-table.jpg" width="1536" height="1024" fetchPriority="high" alt="Conceptual illustration of people sharing food, ideas and art at one long community table."/><figcaption>A vision of a shared table · Original conceptual artwork, not a photograph of an operating pilot.</figcaption></figure></section>
<div className={s.stage}><strong>Where we are / Pilot planning</strong><span>The planning toolkit is open. A kitchen event, volunteer shift or reward program is not active yet.</span></div>
<nav className={s.chapters} aria-label="Langar page navigation"><a href="#the-idea">The idea</a><a href="#how-it-works">How it would work</a><a href="#proof-of-service">Proof of service</a><a href="#sevadar-support">Sevadar support</a><a href="#get-started">Your first step ↗</a></nav>
<section id="the-idea" className={s.intro}><div><p className={s.eyebrow}>A tradition of welcome</p><h2>No price at the door.<br/>No one above another.</h2></div><div><p>Langar brings communal cooking, serving, eating and sharing together. A <strong>sevadar</strong> is someone who serves. Satoshi Langar is our proposed community effort inspired by that tradition, open to people of every background.</p><p>A guest would never need a wallet, a donation, a religious belief, a photograph or proof of need to eat. People provide the hospitality; technology helps with the plan.</p><p><a href="https://www.sikhcoalition.org/about-sikhs/faq/">Read the Sikh Coalition’s explanation of langar ↗</a> · <a href="https://www.sikhcoalition.org/about-sikhs/beliefs/">Learn about seva ↗</a></p></div></section>
<div className={s.cards}><article><b aria-hidden="true">◡</b><h3>People bring care.</h3><p>Local hosts, cooks and volunteers welcome guests, prepare food and take responsibility for the kitchen.</p></article><article><b aria-hidden="true">+</b><h3>AI lends a hand.</h3><p>Agents can draft shopping lists, translate instructions and organize records for a human to check.</p></article><article><b aria-hidden="true">↗</b><h3>The work stays accountable.</h3><p>Human stewards agree the plan, review evidence and explain how resources were used, while protecting guests’ privacy.</p></article></div>
<section className={s.flow} aria-labelledby="langar-flow-title"><h2 id="langar-flow-title">From a good intention to a useful plan.</h2><ol>{[['01','Listen','Start with a local need and a willing host.'],['02','Prepare','Agree food, access, people and resources.'],['03','Serve','People cook, welcome, share and clean.'],['04','Learn','Review the record and improve the next plan.']].map(([n,t,b])=><li key={n}><span>{n}</span><strong>{t}</strong><p>{b}</p></li>)}</ol><p>A proposed operating model. Local human approval and safety review come before an event.</p></section>
</div>
<section className="reading-content wide-content"><h2 id="how-it-works">From a local need to a shared meal</h2><ol className="steps">{steps.map(([title,body])=><li key={title}><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol><h2 id="proof-of-service">Proof of service, without surveillance</h2><p>Our proposed Proof of Seva record connects an agreed task to evidence and human review. It is an operational record, not a blockchain consensus mechanism or a claim that software can prove a meal was served.</p><div className="task-grid"><article className="task-card"><h3>A human contribution</h3><p>A task ID, consented contributor name or pseudonym, completion time, a brief outcome and two reviewer decisions. Keep guest identities and sensitive records out of the public record.</p></article><article className="task-card"><h3>An agent contribution</h3><p>A named human operator, a limited task, sources, output version, review result and actual cost if applicable. A reviewed translation is useful work; it is not a meal count.</p></article></div><p>Disputed evidence pauses a grant decision. A different human reviewer hears the appeal. Corrections stay visible; rejected claims do not become permanent public accusations.</p><h2 id="sevadar-support">How a sevadar could receive support</h2><p>Seva is voluntary and never requires payment. Alongside it, a future funded pilot may offer agreed expense reimbursement or fixed sats grants for specific work. The task, amount, budget and eligibility must be clear before work begins.</p><ol><li>A human steward approves an affordable task and its terms.</li><li>The contributor completes the task and submits minimal evidence privately where needed.</li><li>Independent human reviewers check completion and resolve disputes.</li><li>An authorized human pays an approved grant to the contributor’s verified destination and records the receipt.</li></ol><p className="status-note">No reward program or kitchen event is active yet. Agents cannot promise grants, approve payouts or control wallets. A grant never buys priority access to a meal.</p></section>
<ProgramJourney {...firstStep}/>
<div className={s.wrap}><aside className={s.bridge}><span aria-hidden="true">✳</span><div><h2>Art can help tell the story.</h2><p>A poster, a translated menu or a useful explanation can support a kitchen plan. Kalakar.x invites artists to define their contribution and terms; support for Langar is always a separate, voluntary choice.</p><a href="/kalakar/">Discover Kalakar.x →</a></div></aside></div></main>}
