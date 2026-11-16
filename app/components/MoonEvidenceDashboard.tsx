import s from './MoonEvidenceDashboard.module.css';

const holdings = [
  { name: 'Exchanges', value: 10869946 },
  { name: 'Investment products', value: 2471045 },
  { name: 'Ecosystem protocols', value: 1420122 },
  { name: 'Company treasuries', value: 800680 },
  { name: 'Miners', value: 336170 },
  { name: 'Governments', value: 10765 },
];
const reportedTotal = 15908728;
const subtotal = holdings.reduce((total, category) => total + category.value, 0);
const number = (value: number) => value.toLocaleString('en-US');
const rails = [
  { asset: 'LTC', place: 'Native Litecoin', stage: 'Base-chain asset', note: 'Native LTC is not a claim on a separate issuer. Wallet and network checks still matter.', mark: 'native' },
  { asset: 'cbLTC', place: 'Base', stage: 'Issuer representation', note: 'Coinbase representation with its own custody, redemption and contract dependencies.', mark: 'base' },
  { asset: 'cLTC', place: 'Canton', stage: 'In build', note: 'Greywick’s current label. Operational launch and independent reserve verification are not established here.', mark: 'canton' },
  { asset: 'zkLTC', place: 'LitVM / LiteForge', stage: 'Testnet', note: 'Test gas is not native LTC. Full V2 issuance and redemption availability requires release evidence.', mark: 'testOrbit' },
];

export default function MoonEvidenceDashboard() {
  return <section className={s.dashboard} aria-labelledby="moon-evidence-title">
    <header className={s.header}>
      <p className={s.eyebrow}>THE EVIDENCE PANEL / NOVEMBER 16, 2026</p>
      <h2 id="moon-evidence-title">Big numbers.<br/><em>Precise boundaries.</em></h2>
      <p className={s.dek}>An inventory is not a flow. An address is not a person. A roadmap is not a launch.</p>
      <span className={s.edition}>04 / RESEARCH REVISION</span>
    </header>

    <section className={s.inventory} aria-labelledby="moon-inventory-title">
      <div className={s.sectionHead}><div><p className={s.eyebrow}>01 / THE HOLDINGS INVENTORY</p><h3 id="moon-inventory-title">Where the Register<br/>places the estimates.</h3></div><p className={s.sourceDate}>Homepage retrieved<br/><time dateTime="2026-11-16">November 16, 2026</time></p></div>
      <div className={s.totals}><div><span>Reported estimated inventory</span><strong>{number(reportedTotal)} <small>LTC</small></strong></div><div><span>Reported holder entries</span><strong>100</strong></div></div>
      <p className={s.warning}>Mixed-date records with possible custody overlap. Not a reconciled count of unique coins, unique beneficial owners, purchases or fund flows.</p>
      <div className={s.tableWrap}>
        <table className={s.chart}>
          <caption>Litecoin Register category estimates. Bars share a zero baseline and are scaled to the largest category, not Litecoin’s total supply.</caption>
          <thead><tr><th scope="col">Category</th><th scope="col">Relative scale</th><th scope="col">Estimated LTC</th></tr></thead>
          <tbody>{holdings.map((category, index) => <tr key={category.name}><th scope="row"><span className={s.rowNumber}>{String(index + 1).padStart(2, '0')}</span>{category.name}</th><td className={s.barCell}><span className={s.barTrack} aria-hidden="true"><span className={s.bar} style={{ width: `${category.value / holdings[0].value * 100}%` }}/></span></td><td className={s.value}>{number(category.value)}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={2}>Category subtotal</th><td className={s.value}>{number(subtotal)}</td></tr></tfoot>
        </table>
      </div>
      <p className={s.note}>The six categories sum to {number(subtotal)} LTC, matching the displayed total. Matching arithmetic does not remove overlap or reconcile underlying source dates, which span November 2013 to November 2026.</p>
      <a className={s.sourceLink} href="https://litecoinregister.com/">Inspect the Litecoin Register inventory ↗</a>
    </section>

    <section className={s.testnet} aria-labelledby="moon-testnet-title">
      <div className={s.sectionHead}><div><p className={s.eyebrow}>02 / EXPLORER COUNTERS</p><h3 id="moon-testnet-title">A testnet can count.<br/>We still ask what counts.</h3></div><span className={s.testnetTag}>LITEFORGE TESTNET</span></div>
      <div className={s.counterGrid}>
        <article className={s.counter}><span className={s.counterIndex}>A / TRANSACTIONS</span><strong>532,276,000</strong><p>Total transactions returned by the explorer.</p></article>
        <article className={s.counter}><span className={s.counterIndex}>B / ADDRESSES</span><strong>15,394,431</strong><p>Addresses returned by the explorer, not distinct people.</p></article>
      </div>
      <p className={s.counterNote}>Zeeve explorer API retrieved November 16, 2026 at approximately 18:42 UTC. The response supplied no explicit observation timestamp for these counters. This is a dated retrieval, not a live display or an independent replay of chain history.</p>
      <p className={s.counterNote}>These testnet totals do not establish organic demand, economic value, production adoption or comparable counting across the infrastructure migration.</p>
      <a className={s.sourceLink} href="https://explorer.testnet.liteforge.zeeve.net/api/v2/stats">Inspect the explorer statistics endpoint ↗</a>
    </section>

    <section className={s.readiness} aria-labelledby="moon-readiness-title">
      <div className={s.sectionHead}><div><p className={s.eyebrow}>03 / FOUR ENVIRONMENTS, FOUR QUESTIONS</p><h3 id="moon-readiness-title">Same family.<br/>Different flight checks.</h3></div></div>
      <p className={s.note}>A comparison of asset types and reviewed readiness, not a bridge diagram. No connecting line implies a working transfer route.</p>
      <div className={s.railGrid}>{rails.map((rail, index) => <article className={s.rail} key={rail.asset}>
        <div className={`${s.orbit} ${s[rail.mark]}`} aria-hidden="true"><span className={s.orbitRing}/><span className={s.orbitCore}>{String(index + 1).padStart(2, '0')}</span><i/></div>
        <p className={s.environment}>{rail.place}</p><h4>{rail.asset}</h4><p className={s.stage}>{rail.stage}</p><p className={s.railNote}>{rail.note}</p>
      </article>)}</div>
      <nav className={s.sources} aria-label="Readiness primary sources"><a href="https://greywick.digital/">Greywick product status ↗</a><a href="https://docs.litvm.com/other-resources/network-status">LitVM network status ↗</a><a href="https://help.coinbase.com/en/exchange/crypto-transfers/wrapped-assets">Coinbase wrapped-asset guidance ↗</a></nav>
    </section>
    <footer className={s.footer}><span>KEEP THE AMBITION.</span><strong>Keep the evidence closer.</strong><p>Source checks and observation dates are different clocks. This November 16 panel supplements the preserved, source-dated editorial record.</p></footer>
  </section>;
}
