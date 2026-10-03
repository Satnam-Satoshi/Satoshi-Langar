import { PageIntro } from '../components/PageIntro';
import { ProgramGrid } from '../components/ProgramGrid';

export const metadata = { title: 'The ecosystem' };

const flow = [
  ['Learn', 'Sikh Bitcoin gives newcomers the knowledge to participate.', '/sikh-bitcoin/'],
  ['Create', 'Kalakar artists can turn ideas into stories, lessons and invitations.', '/kalakar/'],
  ['Gather', 'Meetup plans help people find a purpose and prepare a welcoming space.', '/meetups/'],
  ['Serve', 'Langar planning begins with a local need and a responsible human host.', '/langar/'],
  ['Verify', 'Humans review service evidence; agents help organize it.', '/agents/'],
  ['Share', 'LTC connects what we learn to sources, context and corrections.', '/conversations/'],
];

const firstResults = [
  { title: 'I want to learn', result: 'Read one lesson, try the exercise and check your understanding.', href: '/sikh-bitcoin/', label: 'Choose a lesson' },
  { title: 'I want to help a kitchen', result: 'Write a local-need brief or review a consent-safe service checklist.', href: '/langar/#get-started', label: 'Start a Langar brief' },
  { title: 'I create art or stories', result: 'Describe one work, its audience and how you want it to be used.', href: '/kalakar/#get-started', label: 'Make a creative brief' },
  { title: 'I want to bring people together', result: 'Prepare a meetup purpose, agenda and host-readiness checklist.', href: '/meetups/#get-started', label: 'Plan a gathering' },
  { title: 'I want to understand the news', result: 'Read an original article and inspect the sources behind a claim.', href: '/conversations/', label: 'Open the magazine' },
  { title: 'I work with an AI agent', result: 'Define a bounded task, human reviewer and evidence of completion.', href: '/agents/#get-started', label: 'Brief one agent' },
  { title: 'My team can contribute', result: 'Propose one deliverable, clear permissions and a way to review it.', href: '/partners/#get-started', label: 'Scope a collaboration' },
  { title: 'I can check a number', result: 'Trace one public treasury claim to its date, definition and original source.', href: '/treasury/#get-started', label: 'Create an evidence note' },
  { title: 'I study community cooperation', result: 'Document a mutual-aid example and its unanswered governance questions.', href: '/crypto-kitty/#get-started', label: 'Start a research note' },
];

export default function Page() {
  return (
    <main>
      <PageIntro eyebrow="One community · Connected programs" title="An ecosystem built around service." description="Knowledge becomes confidence. Creativity brings people together. Shared work can become a meal, a useful tool or a story that helps someone else.">
        <div className="launch-actions"><a className="launch-button" href="#choose-a-path">Choose one useful next step ↓</a><a href="/join/">Make a personal contribution plan →</a></div>
      </PageIntro>
      <section className="reading-content wide-content" id="choose-a-path" aria-labelledby="first-result-title">
        <span className="inline-tag">START WITH A RESULT · 0.1.26</span>
        <h2 id="first-result-title">Leave with something useful.</h2>
        <p>You can learn, plan or draft without joining a paid service or connecting a wallet. Each planning path includes an editable toolkit, a completion check and a choice about what to share.</p>
        <div className="task-grid">
          {firstResults.map(({ title, result, href, label }) => (
            <article className="task-card" key={href}><h3>{title}</h3><p>{result}</p><a href={href}>{label} →</a></article>
          ))}
        </div>
        <h3>Prepare → check → choose what to share</h3>
        <p>A private draft is a useful result. Download a template and keep it on your device, or choose to open a public GitHub proposal that you review and submit yourself. There is no automatic event booking, role assignment or promise of funding.</p>
      </section>
      <section className="launch-wrap story-section" aria-label="How the programs connect">
        <div className="ecosystem-flow">{flow.map(([name, body, href], index) => <a href={href} key={name}><span>{String(index + 1).padStart(2, '0')}</span><h2>{name}</h2><p>{body}</p><b aria-hidden="true">→</b></a>)}</div>
        <div className="purpose-note"><strong>At the center: human dignity.</strong><p>AI can support each stage. People decide what is needed, review the evidence and control resources. Taking part never requires buying a token or proving a belief.</p></div>
      </section>
      <section className="project-section"><div className="launch-wrap"><ProgramGrid /></div></section>
      <section className="reading-content">
        <h2>What one local pilot could look like</h2>
        <p>A volunteer reads a beginner lesson. An artist creates a kitchen poster with clear permission to use it. A local host plans a gathering. An agent drafts a checklist for an experienced human to review. After the local plan is approved, sevadars prepare and serve meals. Human stewards review the result, and an editor may propose a consented account for LTC.</p>
        <p>This is a proposed workflow, not a completed event. Every kitchen needs a real host, appropriate local safety review, resources and consent before it opens.</p>
        <h2>How resources move</h2>
        <p>Knowledge and code move openly. In the proposed payment flow, artist payments would go to the artist’s chosen wallet. Kitchen resources need a stated purpose and human-controlled budget. Any future grants would reimburse or recognize pre-agreed work; they remain separate from the free meal.</p>
        <p><a href="/donate/">See the current BTC/LTC support options and limits</a>. Donation requests do not establish an operating kitchen, an automated grant program or account-level fund monitoring.</p>
        <h2>Research beyond the first pilot</h2>
        <p><a href="/crypto-kitty/#get-started">Crypto Kitty</a> explores community savings governance. <a href="/treasury/#get-started">Treasury Intelligence</a> studies public data. Neither is an active pooled fund, lending service or autonomous portfolio manager.</p>
        <a className="launch-button" href="/roadmap/">See the delivery roadmap →</a>
      </section>
    </main>
  );
}
