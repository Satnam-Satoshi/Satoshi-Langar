import styles from './join.module.css';

const choices = [
  ['learn', 'Learn Bitcoin', '/sikh-bitcoin/', 'Read a lesson. Explain one idea. Bring a question.'],
  ['langar', 'Serve with Langar', '/langar/', 'Prepare a local-need brief and a thoughtful kitchen plan.'],
  ['kalakar', 'Create with Kalakar.x', '/kalakar/', 'Give an idea an audience, a purpose and clear permissions.'],
  ['ltc', 'Help the LTC newsroom', '/conversations/', 'Check a dated source, suggest a correction or develop a story.'],
  ['meetups', 'Plan a Bitcoin meetup', '/meetups/', 'Make a welcoming agenda with a responsible human host.'],
  ['build', 'Build open tools', '/technology/', 'Reproduce a small issue or propose one useful improvement.'],
  ['agents', 'Contribute with an agent', '/agents/', 'Define a bounded task with evidence and a human reviewer.'],
  ['partners', 'Collaborate as a team', '/partners/', 'Scope a small shared project and how it will be reviewed.'],
  ['treasury', 'Research sovereignty', '/treasury/', 'Trace a custody or protocol claim to its original source.'],
  ['research', 'Research community tools', '/crypto-kitty/', 'Explore a community need, a possible tool and its tradeoffs.'],
] as const;
const benefits = [
  ['01', '63 lessons. Your own pace.', 'Three free Bitcoin courses with exercises and self-checks, from foundations to self-custody.', '/sikh-bitcoin/', 'Choose a course'],
  ['02', 'A reading table that grows.', 'Read LTC’s latest published issue, original features and the dated archive.', '/conversations/', 'Open LTC Media'],
  ['03', 'Understand your keys.', 'Explore MiiKey’s explanations of wallets, recovery, multisig and custody choices.', '/miikey/', 'Explore MiiKey'],
  ['04', 'A first step you can keep.', 'Build a personal contribution plan, download it and decide when you want to share.', '#make-a-plan', 'Make a guest plan'],
  ['05', 'Useful work in the open.', 'Find community destinations and public ways to contribute questions, sources, art or code.', '/ecosystem/#contribute', 'Find a contribution'],
] as const;
export const metadata = { title: 'Join the open table · Your first contribution', description: 'Start free with 63 lessons, LTC Media, MiiKey and a personal contribution plan. No account or wallet required; optional sign-in is still being configured.' };

export default function JoinPage() {
  return <main className={styles.page}>
    <header className={styles.intro}>
      <a className={styles.backLink} href="/ecosystem/">The open table</a>
      <div className={styles.introGrid}>
        <div><p className={styles.eyebrow}>SATNAM SATOSHI / START HERE</p><h1>A place for you.<br/><em>A first step that fits.</em></h1></div>
        <div className={styles.introNote}><p>Learn, create, build or serve. Bring a little curiosity and the time you have.</p><p className={styles.fine}>Free to begin. No account, wallet or payment required.</p><a className={styles.textLink} href="#member-benefits">See what is open to you</a></div>
      </div>
      <ol className={styles.progress} aria-label="Your contribution journey">
        <li><span>01</span><div><strong>Choose a path</strong><small>Follow your curiosity</small></div></li>
        <li><span>02</span><div><strong>Make a small plan</strong><small>Keep it on your device</small></div></li>
        <li><span>03</span><div><strong>Take the next step</strong><small>Share when you choose</small></div></li>
      </ol>
    </header>
    <section className={styles.workspace} id="make-a-plan" aria-labelledby="planner-title" data-community data-home="../index.html">
      <div className={styles.planner}>
        <div className={styles.panelHeading}><p className={styles.eyebrow}>YOUR GUEST WORKSPACE</p><h2 id="planner-title">Make a little room<br/>for something useful.</h2><p>Choose a direction. We’ll give you a first task and a plan to take with you.</p></div>
        <form data-plan-form hidden className={styles.form}>
          <fieldset className={styles.formStep}>
            <legend><span>01</span>Choose your path</legend>
            <label htmlFor="path">What would you like to do?</label>
            <select id="path" name="path">{choices.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
            <div className={styles.suggestedTask}><span className={styles.eyebrow}>A USEFUL FIRST TASK</span><p data-first-task/><p className={styles.output}><strong>You’ll make:</strong> <span data-task-output/></p></div>
          </fieldset>
          <fieldset className={styles.formStep}>
            <legend><span>02</span>Give it a little shape</legend>
            <label htmlFor="time">How much time would you like to start with?</label>
            <select id="time" name="time"><option>15 minutes</option><option>45 minutes</option><option>2 hours</option></select>
            <label htmlFor="note">One idea or question <small>Optional</small></label>
            <textarea id="note" name="note" rows={4} maxLength={1200} placeholder="I’d like to help with…" aria-describedby="draft-privacy"/>
            <p id="draft-privacy" className={styles.fine}>This stays in your browser. Leave out contact details, guest records, passwords and wallet secrets. This form sends nothing to the community.</p>
          </fieldset>
          <fieldset className={styles.formStep}>
            <legend><span>03</span>Keep the next step yours</legend>
            <label className={styles.checkLabel}><input type="checkbox" name="remember"/><span>Keep this draft on this device after I close the tab</span></label>
            <p className={styles.fine}>Leave this unchecked for a tab-only draft. On the next page, you can download, edit or remove your plan.</p>
            <button type="submit" className={styles.primary}>Create my first-step plan</button>
            <p className={styles.submitNote}>You are creating a personal draft. Sharing it is a separate choice.</p>
          </fieldset>
        </form>
        <div data-no-js className={styles.fallback}><h3>You can still start here.</h3><p>JavaScript enables the local planner. Without it, open a guide below and write down your chosen task, available time and one question.</p><div className={styles.actions}><a className={styles.primary} href="/sikh-bitcoin/">Start a free lesson</a><a className={styles.textLink} href="#explore-paths">Browse all ten paths</a></div></div>
        <p data-message role="status" aria-live="polite" className={styles.message}/>
      </div>
      <aside className={styles.aside}>
        <div className={styles.invitation}><img src="/images/community/open-table.jpg" width="1672" height="941" alt="An imagined open table for learning, creative work and shared service."/><div><p className={styles.eyebrow}>YOUR PLACE IS ALREADY OPEN</p><h2>Belong through<br/><em>what you bring.</em></h2><p>A question. A source check. A clearer explanation. A generous hour. You can contribute before you create an account.</p><a href="#member-benefits">Explore the free community benefits</a></div></div>
        <section className={styles.accountCard} aria-labelledby="account-title"><span className={styles.status}>OPTIONAL / SETUP IN PROGRESS</span><h3 id="account-title">An account can wait.</h3><p>Apple and Google sign-in are not available yet. Account setup is still being configured; the learning and planning tools are open now.</p><a className={styles.secondary} href="#make-a-plan">Continue as a guest</a><a className={styles.textLink} href="/sign-in/">Check optional sign-in status</a></section>
        <section className={styles.helpCard}><span className={styles.ma}>Ma</span><div><h3>A little help choosing?</h3><p>AI Satoshi Ma’s prepared guide can point you toward a lesson, community or first contribution.</p><a className={styles.textLink} href="/ecosystem/#ask-ma">Open the free community guide</a></div></section>
        <p className={styles.asideNote}>You choose what becomes public. A GitHub proposal requires a separate account and your own submission. <a href="/privacy/">Read how drafts are handled.</a></p>
      </aside>
    </section>
    <section className={styles.benefits} id="member-benefits" aria-labelledby="benefits-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>COMMUNITY BENEFITS / OPEN NOW</p><h2 id="benefits-title">A good place to begin.<br/><em>Free to keep exploring.</em></h2></div><p>These resources are available to guests today. No paid membership or sign-in is needed to unlock them.</p></div><div className={styles.benefitGrid}>{benefits.map(([number, title, body, href, label]) => <article key={number}><span className={styles.benefitNumber}>{number}</span><h3>{title}</h3><p>{body}</p><a href={href}>{label}</a></article>)}</div><a className={styles.textLink} href="/conversations/archive/">Revisit the issue archive</a></section>
    <section className={styles.paths} id="explore-paths" aria-labelledby="paths-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>TEN PATHS / ONE OPEN TABLE</p><h2 id="paths-title">Explore first.<br/><em>Decide in your own time.</em></h2></div><p>Every path has a guide and a useful starting point. Plans for kitchens, gatherings and creative work remain proposals until the people involved agree.</p></div><div className={styles.pathGrid}>{choices.map(([id, title, href, body], i) => <a key={id} href={href}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{body}</p></div></a>)}</div></section>
    <footer className={styles.pageFooter}><p>Come back with a question.<br/><strong>We can start there.</strong></p><div><a href="/ecosystem/#ask-ma">Help me choose, Ma</a><a href="/ecosystem/">Return to the community</a><a href="/conversations/">Read LTC Media</a></div></footer>
  </main>;
}
