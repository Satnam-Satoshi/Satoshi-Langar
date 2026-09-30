import type { Metadata } from 'next';
import { PageIntro } from '../components/PageIntro';
import sourceConfig from '../../config/ltc-sources.json';
import snapshotData from '../../public/data/ltc-snapshot.json';

export const metadata: Metadata = {
  title: 'LTC · Lunch Time Conversations',
  description: 'The Satnam Satoshi magazine: politics, Bitcoin and Litecoin networks, institutional research, and community service. Read the evidence behind the story.',
};

type Observation = { label: string; value: string; unit: string; effectiveAt: string; classification: string };
type SourceCheck = { id: string; status: string; sourceAsOf: string | null; freshness: string; observations: Observation[] | null };
type Snapshot = { generatedAt: string | null; sources: SourceCheck[]; failureCount: number; sourceCount: number };
const snapshot = snapshotData as Snapshot;
const desks = [
  { number: '01', title: 'Politics & the public record', body: 'What changed in policy, who made the decision, and whom it affects. Separate a political argument from a bill, a proposal from a final rule, and an allegation from a finding.', links: [['Congress.gov', 'https://www.congress.gov/'], ['SEC announcements', 'https://www.sec.gov/newsroom/press-releases'], ['CFTC announcements', 'https://www.cftc.gov/PressRoom/PressReleases']] },
  { number: '02', title: 'Bitcoin & Litecoin networks', body: 'Understand the work beneath the price: software releases, mining, fees, payment tools, privacy, and the tradeoffs of proof-of-work. Analysis begins with observable evidence.', links: [['Bitcoin Core', 'https://bitcoincore.org/en/releases/'], ['Litecoin Core', 'https://github.com/litecoin-project/litecoin/releases'], ['Lightning specifications', 'https://github.com/lightning/bolts']] },
  { number: '03', title: 'Markets & institutions', body: 'ETF and ETP holdings, treasury disclosures, and company-specific mNAV. Show the date, unit and formula, so readers can inspect a conclusion rather than borrow our confidence.', links: [['iShares IBIT', 'https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf'], ['CoinShares BITC', 'https://coinshares.com/etp/physical-bitcoin/'], ['Strategy definitions', 'https://www.strategy.com/notes']] },
  { number: '04', title: 'Service & the creative commons', body: 'Report on real kitchens, artists, local meetups, learning, and useful human–AI collaboration. A community story starts with consent and an accountable person.', links: [['Satoshi Langar', '/langar/'], ['Kalakar.x', '/kalakar/'], ['Join the community', '/join/']] },
];
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
function displayValue(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return value;
  const [integer, fraction] = value.split('.');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}
export default function ConversationsPage() {
  const observations = snapshot.sources.flatMap(source => (source.observations ?? []).map(item => ({ ...item, freshness: source.freshness, source: sourceConfig.sources.find(config => config.id === source.id) })));
  return <main className="ltc-magazine">
    <PageIntro eyebrow="LTC · A Satnam Satoshi magazine" title="Lunch Time Conversations." description="Politics, protocols, markets, and the people making a more useful world. A magazine to read closely, question freely, and discuss over a shared meal.">
      <div className="magazine-edition"><span>Founding edition · September 30, 2026</span><span>Daily magazine in development</span></div>
    </PageIntro>
    <section className="reading-content magazine-lead" aria-labelledby="lead-title">
      <article className="magazine-cover-story">
        <p className="eyebrow">The institutional lens · Explainer</p><h2 id="lead-title">What mNAV can—and cannot—tell us.</h2>
        <p className="magazine-deck">A company can hold Bitcoin. Its shares can still carry debt, dilution, operating risk, and a very different price. One ratio cannot tell the whole story.</p>
        <p>Our first explainer opens the calculation: what goes above the line, what goes below it, and why a change in method can break a chart. Start with the definition before comparing the number.</p>
        <a className="launch-button" href="/conversations/methodology/">Read the explainer →</a>
        <p className="fine-print">AI-assisted educational draft for community review. Sources checked September 30, 2026. No current mNAV or investment recommendation is asserted.</p>
      </article>
      <aside className="magazine-sidebar" aria-label="From the editorial desk">
        <p className="eyebrow">From the desk</p><h2>Ambition with a public record.</h2>
        <p>We are building toward the care and reproducibility expected of institutional research. That standard has to be demonstrated through sources, methods, corrections, and accountable review.</p>
        <p>Today: an original explainer, a source desk, and a working collector. A daily schedule and recurring human editorial review are still to be activated.</p>
        <a href="/conversations/methodology/#editorial-standard">Our editorial compact →</a>
      </aside>
    </section>
    <section className="reading-content" aria-labelledby="desks-heading">
      <p className="eyebrow">The magazine</p><h2 id="desks-heading">Four desks. One curious community.</h2>
      <div className="task-grid magazine-desks">{desks.map(desk => <article className="task-card" key={desk.number}>
        <p className="eyebrow">Desk {desk.number}</p><h3>{desk.title}</h3><p>{desk.body}</p>
        <ul className="source-links">{desk.links.map(([label, url]) => <li key={url}><a href={url}>{label} →</a></li>)}</ul>
      </article>)}</div>
    </section>
    <section className="reading-content" aria-labelledby="snapshot-heading">
      <p className="eyebrow">The evidence desk</p><h2 id="snapshot-heading">Dates belong beside the numbers.</h2>
      <p>{snapshot.generatedAt ? `This stored snapshot was collected ${dateLabel(snapshot.generatedAt)} (${snapshot.generatedAt}).` : 'The first source snapshot has not been collected.'} It is a read-only source check, not a continuously updating quote feed. Dates below are the source’s effective dates; source-age labels reflect the time of collection.</p>
      {observations.length > 0 ? <div className="task-grid snapshot-grid">{observations.map(item => <article className="task-card" key={`${item.label}-${item.effectiveAt}`}>
        <p className="eyebrow">{item.classification.replaceAll('-', ' ')}</p><h3>{item.label}</h3>
        <p className="snapshot-value">{displayValue(item.value)} <span>{item.unit}</span></p><p>As of {dateLabel(item.effectiveAt)} · {item.freshness.replaceAll('-', ' ')}</p>
        {item.source && <a href={item.source.referenceUrl}>Inspect the source →</a>}
      </article>)}</div> : <p className="status-note">No validated observations are available in this snapshot. Missing data is not zero.</p>}
      <p>ETF net flows and company mNAV are not calculated in this release. Holdings changes alone do not establish inflows; company ratios need matched dates and an explicit treatment of debt and dilution.</p>
      <p><a href="/data/ltc-snapshot.json">Download the source-check JSON</a> · <a href="/conversations/methodology/#freshness">How freshness works</a></p>
      <details className="source-register"><summary>Source coverage and current check status</summary><ul>{sourceConfig.sources.map(source => {
        const checked = snapshot.sources.find(item => item.id === source.id);
        return <li key={source.id}><a href={source.referenceUrl}>{source.title}</a> — {source.kind} source; {checked?.status.replaceAll('-', ' ') ?? 'not checked'}. {source.metricStatus.replaceAll('-', ' ')}.</li>;
      })}</ul><p>“Reference retrieved” only confirms a successful source retrieval. It does not mean its claims or financial figures were parsed or verified. Failed checks contain no new numerical observations.</p></details>
    </section>
    <section className="reading-content" aria-labelledby="register-heading">
      <p className="eyebrow">Litecoin research</p><h2 id="register-heading">A register needs context.</h2>
      <p>The independent <a href="https://www.litecoinregister.com/">Litecoin Register</a> is useful community research. It is a secondary source, with its own <a href="https://www.litecoinregister.com/help/">methodology and limitations</a>. It is not a Satnam Satoshi service or an announced partner.</p>
      <p>Our planned holdings desk separates company-owned coins from exchange custody, fund assets, and wrapped-asset reserves. A recent disclosure can describe old holdings; the same coins may appear in overlapping categories. We will trace rows back to their issuer or filing before presenting a verified institutional snapshot.</p>
    </section>
    <section className="reading-content magazine-invitation" aria-labelledby="invitation-heading">
      <p className="eyebrow">An open newsroom</p><h2 id="invitation-heading">Bring a question. Bring the evidence.</h2>
      <p>Writers, analysts, translators, technologists, artists, and careful readers can help. AI partners can collect sources, compare records, and draft within a defined task. Humans carry the editorial responsibility.</p>
      <p>We distinguish reported fact, calculated estimate, analysis, and opinion. We disclose meaningful AI assistance, keep corrections visible, and separate sponsors from editorial conclusions.</p>
      <div className="hero-actions"><a className="launch-button" href="/join/">Contribute to LTC →</a><a href="https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/new?title=LTC%20source%20or%20correction">Suggest a source or correction →</a></div>
      <p className="fine-print">GitHub submissions are public. Do not include confidential records or personal financial information. LTC is general education and research, not individualized investment advice.</p>
    </section>
  </main>;
}
