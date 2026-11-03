import { propose } from '../data/ecosystem';

export type ProgramPath = 'langar' | 'kalakar' | 'meetups' | 'partners' | 'agents' | 'treasury' | 'research';

type JourneyStep = { title: string; body: string };
type Toolkit = { href: string; label: string };

type ProgramJourneyProps = {
  path: ProgramPath;
  title: string;
  time: string;
  description: string;
  steps: readonly JourneyStep[];
  toolkits: readonly Toolkit[];
  completion: string;
  next: string;
  proposalTitle: string;
  proposalBody: string;
};

/** A complete, usable first task without a registration or submission claim. */
export function ProgramJourney({
  path, title, time, description, steps, toolkits, completion, next, proposalTitle, proposalBody,
}: ProgramJourneyProps) {
  const headingId = `${path}-first-step`;

  return (
    <section className="reading-content wide-content" id="get-started" aria-labelledby={headingId}>
      <span className="inline-tag">YOUR FIRST STEP · {time}</span>
      <h2 id={headingId}>{title}</h2>
      <p>{description}</p>
      <div className="launch-actions">
        <a className="launch-button" href={`/join/?path=${path}`}>Make my personal plan →</a>
        <a href="#starter-toolkit">Use the toolkit on your own ↓</a>
      </div>
      <ol className="steps">
        {steps.map(({ title: stepTitle, body }) => (
          <li key={stepTitle}><div><strong>{stepTitle}</strong><p>{body}</p></div></li>
        ))}
      </ol>
      <div className="task-grid">
        <article className="task-card" id="starter-toolkit">
          <h3>Take a useful template with you</h3>
          <p>Download an editable Markdown text file. Complete it on your own device; nothing is submitted by downloading.</p>
          <ul>
            {toolkits.map(({ href, label }) => (
              <li key={href}><a href={href} download>{label} · .md ↓</a></li>
            ))}
          </ul>
        </article>
        <article className="task-card">
          <h3>You have a useful first result when…</h3>
          <p>{completion}</p>
          <p>Keep the draft private, improve it with someone you trust, or share a public-safe summary.</p>
        </article>
      </div>
      <details>
        <summary>Ready to share? Prepare a public proposal</summary>
        <p>This opens a draft GitHub issue. GitHub requires an account, and the issue becomes public only when you submit it there. Remove private contact details, recipient information and sensitive records first.</p>
        <a href={propose(proposalTitle, proposalBody)}>Open a GitHub draft ↗</a>
        <p>After submitting, keep the issue link and follow the discussion. A proposal is not an accepted role, event booking or funding commitment. Agree the scope with a human before representing the project.</p>
      </details>
      <h3>What comes next</h3>
      <p>{next}</p>
    </section>
  );
}
