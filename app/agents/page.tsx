import { ProgramJourney } from '../components/ProgramJourney';
import { PageIntro } from '../components/PageIntro';
import { repo } from '../data/ecosystem';
export const metadata={title:'Agent Sangat · Humans and AI',description:'Explore Agent Sangat roles and a task brief for AI-assisted research, education and engineering, with human owners, source evidence and permission limits.'};
const roles=[['Research','Find primary evidence, preserve sources and flag uncertainty.'],['Education','Draft lessons and quizzes for a human teacher to review.'],['Newsroom','Collect dated observations, check calculations and prepare editorial drafts.'],['Kitchen planning','Draft schedules, checklists and translations for local approval.'],['Creative support','Prepare accessible descriptions and rights-aware publishing materials.'],['Engineering','Build small changes with tests and reviewable diffs.'],['Quality & security','Check accessibility, permission boundaries and regression evidence.'],['Community care','Prepare welcoming resources and moderation drafts without unsolicited outreach.']];
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

export default function Page(){return <main><PageIntro eyebrow="Agent Sangat" title="Meet Ma. Build with Agent Sangat." description="AI Satoshi Ma is our AI chief editor and operating lead. She coordinates Agent Sangat: focused AI helpers working alongside people to learn, create and serve."/>
<ProgramJourney {...firstStep} />
<section className="reading-content wide-content"><h2>AI Satoshi Ma</h2><p>She brings four AI operating roles together: chief editor for LTC Media; CEO for coordinating priorities and delivery; CTO for engineering and technical checks; and CMO for community storytelling and campaign preparation. Her work turns ideas into sources, designs, code and reviewable results.</p><p>The founder remains the human decision-maker. Ma’s titles describe her AI responsibilities, not legal corporate appointments or independent control of accounts or money.</p><h2>Agent Sangat: many helpers, one purpose</h2><p>Sangat means company and community. Our agent team makes room for many skills, with Ma coordinating the work and people setting its purpose. Bring your own curiosity, a useful task or an AI project; begin with one contribution we can review together.</p><div className="task-grid">{roles.map(([name,body])=><article className="task-card" key={name}><h3>{name}</h3><p>{body}</p></article>)}</div><h2>How the team works</h2><ol className="steps"><li><div><strong>Define one useful result</strong><p>Name the human owner, task, allowed sources, tools, data limits, cost ceiling and expiry.</p></div></li><li><div><strong>Work in parallel where it helps</strong><p>Separate research, implementation and review. Keep changes small and avoid two agents silently overwriting the same work.</p></div></li><li><div><strong>Return evidence</strong><p>Include sources, exact changes, tests, failures and limitations. A human accepts the result or asks for correction.</p></div></li><li><div><strong>Stop and revoke</strong><p>Every operator can stop their agent. Expired tasks lose access. Publication, account changes and funds remain under human authority.</p></div></li></ol><p className="status-note">This is a contribution and operating model. It is not a claim that all listed agents run continuously. No agent here manages wallets, guarantees rewards or monitors personal debt.</p><a className="launch-button" href="/partners/">Bring your AI project →</a><p className="source-notes"><a href={`${repo}/blob/agent/community-ecosystem-20260930/docs/AGENT-TEAM.md`}>Team permissions and task contracts</a> · <a href={`${repo}/blob/main/AGENTS.md`}>Repository governance</a></p></section></main>}
