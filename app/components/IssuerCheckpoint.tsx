import register from '../../content/research/litecoin-distribution-latest.json';
import s from './MoonRouteMap.module.css';

export default function IssuerCheckpoint() {
  const lits = register.rows.find(row => row.id === 'lits');
  return <section className={s.map} id="issuer-checkpoint" aria-labelledby="issuer-checkpoint-title">
    <p>ISSUER RECORD / SOURCE REVIEW NOVEMBER 9, 2026</p>
    <h2 id="issuer-checkpoint-title">Same asset. Different dates.</h2>
    <p>A tracker observation, a balance-sheet date and a fund’s daily holdings answer different questions. Read the date beside each number.</p>
    <div className={s.scroll} tabIndex={0} role="region" aria-label="Dated issuer evidence table"><table>
      <caption>Issuer disclosures and tracker context · checked November 9, 2026</caption>
      <thead><tr><th scope="col">Record</th><th scope="col">Reported value</th><th scope="col">Effective date</th><th scope="col">What it establishes</th></tr></thead>
      <tbody>
        <tr><th scope="row"><a href="https://www.sec.gov/Archives/edgar/data/1262104/000119312526449764/lits-20260930.htm">Lite Strategy · SEC 10-Q</a></th><td>751,798 LTC total</td><td>September 30, 2026</td><td>687,098 held plus 64,700 receivable, net, including collateral at GSR. A quarter-end disclosure, not a November 9 balance.</td></tr>
        {lits && <tr><th scope="row"><a href={lits.profile}>Lite Strategy · Register</a></th><td>{lits.current.toLocaleString('en-US')} LTC</td><td>{lits.observedAt}</td><td>Secondary tracker record, checked {register.asOf}. Different dates and scope prevent treating this as an issuer reconciliation.</td></tr>}
        <tr><th scope="row"><a href="https://canaryetfs.com/LTCC/">Canary LTCC · holdings table</a></th><td>221,204.377217 LTC<br/>910,000 shares</td><td>November 9, 2026</td><td>Issuer-labeled holdings and shares. These do not establish the day’s closing fund flow.</td></tr>
        <tr><th scope="row"><a href="https://canaryetfs.com/LTCC/">Canary LTCC · NAV panel</a></th><td>$12.81 NAV<br/>$11,657,258.86 net assets</td><td>November 6, 2026</td><td>The NAV panel has an earlier date than the holdings table. Asset-value changes are not automatically inflows.</td></tr>
      </tbody>
    </table></div>
    <p>The Register aggregate remains the source’s compiled series. We do not silently replace a historical tracker row with a later filing or add custody, fund backing and company holdings as unique coins.</p>
    <nav><a href="/conversations/litecoin-distribution/">Explore the distribution record →</a><a href="/conversations/updates/">Read the dated source desk →</a></nav>
  </section>;
}
