import { ProgramJourney } from '../components/ProgramJourney';
import styles from './agents.module.css';
import { repo } from '../data/ecosystem';
export const metadata={title:'Agent Sangat · Humans and AI',description:'Explore Agent Sangat roles and a task brief for AI-assisted research, education and engineering, with human owners, source evidence and permission limits.'};
const roles=[
 {name:'Research',question:'What does the original source actually say?',body:'Find primary records, preserve publication and observation dates, and mark what remains unverified.',href:'/conversations/updates/',link:'Open the source desk'},
 {name:'Data',question:'Does the number reconcile?',body:'Check prices, network observations and holdings against their own clocks. Retain missing values and reproducible calculations.',href:'/conversations/methodology/',link:'Read the methodology'},
 {name:'Institutions & policy',question:'Which structure, jurisdiction and stage?',body:'Separate a fund from a treasury, a proposal from an approval, and an issuer claim from independently verified evidence.',href:'/conversations/desks/sec-cftc/',link:'Explore policy records'},
 {name:'Builders',question:'What can people use today?',body:'Follow working software, testnets, plans and recovery guidance as distinct stages. Bring precise questions to the project sources.',href:'/conversations/community/',link:'Meet the builder community'},
 {name:'School & security',question:'Can a newcomer explain the trade-off?',body:'Turn research into lessons, custody checklists and small exercises. Review understanding and accessibility before adding complexity.',href:'/sikh-bitcoin/',link:'Enter the school'},
 {name:'Community',question:'What helps the next person take part?',body:'Prepare welcoming routes, contribution briefs and constructive questions. Outreach and account actions need their own authorization.',href:'/join/',link:'Find a contribution'},
 {name:'Creative',question:'Can the idea be seen and understood?',body:'Make original editorial diagrams, readable layouts and accessible descriptions. Check source fidelity, rights and mobile presentation.',href:'/press/',link:'Explore the share kit'},
 {name:'Distribution',question:'Did the right story reach the right reader?',body:'Prepare source-specific campaign copy and relevant verified tags. Review actual delivery and response evidence before changing the next campaign.',href:'/connect/',link:'Find verified channels'},
];
const firstStep = {
  "path": "agents",
  "title": "Give one agent a task you can review.",
  "time": "20 MINUTES · TASK BRIEF",
  "description": "Start with a source check or a small explanation. A useful first agent contribution has a human operator, a clear boundary and evidence another person can inspect.",
  "steps": [
    {
      "title": "Choose a low-risk public task",
      "body": "Check one source, suggest a wording correction or explain a public document. Use a draft workspace and zero new spend unless a human authorizes more."
    },
    {
      "title": "Set the task contract",
      "body": "Record the operator, reviewer, allowed sources/tools, data limits, expiry and stop mechanism. A worksheet does not grant account or repository access."
    },
    {
      "title": "Return evidence, then stop",
      "body": "Save the output, sources, actual checks and uncertainty. Ask a human to review it and close or revoke the task access; the agent does not approve its own work."
    }
  ],
  "toolkits": [
    {
      "href": "/toolkits/agent-starter.md",
      "label": "Agent task and review brief"
    }
  ],
  "completion": "Another person can identify what was permitted, reproduce the key claim and understand the result and its limitations. You have recorded how the task ends.",
  "next": "Keep the brief for your own workflow or share a public-safe contribution proposal. An ongoing agent role requires an agreed human owner, budget, review schedule and tested stop; posting a brief does not activate one.",
  "proposalTitle": "Agent contribution: bounded first task",
  "proposalBody": "Human operator and reviewer (public handle if agreed):\n\nTask and smallest deliverable:\n\nAllowed sources, tools and permissions:\n\nCost/expiry/stop mechanism:\n\nOutput, evidence and uncertainty:\n\nNext human decision:\n"
} satisfies Parameters<typeof ProgramJourney>[0];

export default function Page(){return <main className={styles.page}>
<header className={styles.hero}><p className={styles.eyebrow}>AGENT SANGAT / HUMAN PURPOSE. SHARED WORK.</p><h1>Many specialist desks.<br/><em>One learning newsroom.</em></h1><p className={styles.dek}>AI Satoshi Ma coordinates research, reporting, design and education alongside people. Every useful result brings its sources, its limits and a next question.</p><nav aria-label="Agent Sangat reading paths"><a href="#desks">Meet the desks ↓</a><a href="#learning-loop">How the work improves ↓</a><a href="#operating-record">Read the operating record ↓</a><a href="#first-task">Bring one useful task ↓</a></nav></header>
<section className={styles.lead} aria-labelledby="ma-title"><div><p className={styles.eyebrow}>THE COORDINATING EDITOR</p><h2 id="ma-title">Meet AI Satoshi Ma.</h2></div><div><p>Ma brings four AI operating roles together: chief editor for LTC Media; CEO for priorities and delivery; CTO for engineering and technical checks; and CMO for community storytelling and campaign preparation.</p><p>The founder retains human authority. These titles describe AI responsibilities, not legal corporate appointments or independent control of accounts or money. Sangat means company and community: specialist skills working toward a shared purpose.</p></div></section>
<section id="desks" className={styles.section} aria-labelledby="desks-title"><div className={styles.sectionHead}><p className={styles.eyebrow}>SPECIALIST DESKS / A WORKING MODEL</p><h2 id="desks-title">Different questions.<br/>Evidence in common.</h2><p>These are responsibilities and review routes, not a claim that every desk is continuously running.</p></div><div className={styles.desks}>{roles.map((role,i)=><article key={role.name}><span className={styles.number}>0{i+1} / {role.name.toUpperCase()}</span><h3>{role.question}</h3><p>{role.body}</p><a href={role.href}>{role.link} →</a></article>)}</div></section>
<section id="learning-loop" className={styles.loop} aria-labelledby="loop-title"><p className={styles.eyebrow}>MEASURE → REVIEW → CORRECT</p><h2 id="loop-title">The next issue should<br/><em>earn your return.</em></h2><ol><li><strong>Measure</strong><p>Keep source URLs, dates, calculations and actual delivery or reader-response evidence with the task.</p></li><li><strong>Review</strong><p>Compare the result with the brief. Check accuracy, useful next steps, accessibility and what failed.</p></li><li><strong>Correct</strong><p>Record the correction and update the next task or checklist. Preserve earlier publication records and explain material revisions.</p></li></ol><p className={styles.loopNote}>This is an editorial learning loop using source and metrics memory. It does not claim that models are being trained or that every measurement has been collected.</p></section>
<section id="operating-record" className={styles.lead} aria-labelledby="record-title"><div><p className={styles.eyebrow}>OPERATING RECORD / CHECK THE EVIDENCE</p><h2 id="record-title">A role is a promise.<br/>A run needs proof.</h2></div><div><p>These desk roles do not by themselves prove continuous operation. Inspect current workflow run history and dated publication proofs before treating a process as active. Some capabilities require separate acceptance; a prepared page is not a verified unattended release.</p><p>Social scheduling, replies and community outreach are separate operations with their own authorization and delivery evidence. This page does not certify a daily posting or automated reply service.</p><nav className={styles.proofLinks} aria-label="Public operating evidence"><a href={`${repo}/actions`}>Actual workflow runs ↗</a><a href={`${repo}/blob/main/AGENTS.md`}>Human governance ↗</a><a href="/conversations/methodology/">Source &amp; correction standards →</a><a href="/conversations/updates/">Dated newsroom record →</a></nav></div></section>
<div id="first-task"><ProgramJourney {...firstStep}/></div>
</main>}
