import styles from './community-journey.module.css';

export function CommunityJourney() {
  return <nav className={styles.journey} aria-label="Learn, read, verify and contribute">
    <a href="/conversations/start/"><span>01</span><strong>Start with understanding</strong><small>Bitcoin, Litecoin and your own keys</small></a>
    <a href="/conversations/"><span>02</span><strong>Follow the conversation</strong><small>Reporting, explainers and people</small></a>
    <a href="https://litecoinregister.com/"><span>03</span><strong>Inspect the evidence ↗</strong><small>Litecoin Register · external tracker</small></a>
    <a href="/join/"><span>04</span><strong>Turn curiosity into action</strong><small>Bring a skill. Make a contribution.</small></a>
  </nav>;
}

export function RegisterInvitation() {
  return <aside className={styles.register} aria-label="Litecoin Register research link">
    <div><p className={styles.kicker}>The evidence connection / External resource</p><h2>Litecoin Register <span aria-hidden="true">↗</span></h2><p>Explore reported holdings, treasuries and investment products. Follow each figure back to its source.</p><a href="https://litecoinregister.com/">Open Litecoin Register ↗</a><small>Independent third-party tracker. Reporting dates and definitions vary; holdings are not fund flows. No affiliation claimed.</small></div>
    <div className={styles.numbers}><p className={styles.kicker}>Protocol context / Not register totals</p><div><p><strong>84<span>M</span></strong><small>Litecoin maximum supply</small></p><p><strong>21<span>M</span></strong><small>Bitcoin maximum supply</small></p></div><a href="/conversations/start/">Understand the networks →</a></div>
  </aside>;
}
