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
  return <aside className={styles.register} aria-label="Litecoin Register, mNAV and Bitbo research links">
    <div><p className={styles.kicker}>The evidence connection / External research sources</p><h2>Litecoin Register <span aria-hidden="true">↗</span></h2><p>Explore reported holdings, treasuries and investment products. Follow each figure back to its source.</p><nav className={styles.researchLinks} aria-label="External treasury research sources"><a href="https://litecoinregister.com/">Litecoin Register ↗</a><a href="https://www.mnav.com/">mNAV · Bitcoin treasuries ↗</a><a href="https://bitbo.io/treasuries/latest-changes/">Bitbo · Latest treasury changes ↗</a></nav><small>Independent third-party research links, not live data feeds. Reporting dates and definitions vary; holdings are not fund flows. Verify changes against issuer disclosures. No affiliation claimed.</small></div>
    <div className={styles.numbers}><p className={styles.kicker}>Protocol context / Not register totals</p><div><p><strong>84<span>M</span></strong><small>Litecoin maximum supply</small></p><p><strong>21<span>M</span></strong><small>Bitcoin maximum supply</small></p></div><a href="/conversations/start/">Understand the networks →</a></div>
  </aside>;
}
