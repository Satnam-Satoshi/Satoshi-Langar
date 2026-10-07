import { PageIntro } from '../components/PageIntro';

export const metadata = {
  title: 'Your community wallet path · Bitcoin, Lightning & Fedi',
  description: 'Start with Bitcoin wallet knowledge, compare self-custody and community custody, and explore the proposed Satnam Satoshi Fedi federation.',
};

const steps = [
  ['Belong first.', 'Read, learn and make a contribution. Your place here never depends on buying bitcoin or opening a wallet.', '/join/', 'Find your first contribution'],
  ['Understand the choice.', 'A self-custody wallet puts recovery and keys in your hands. A Fedimint federation uses shared custody: a threshold of guardians safeguards bitcoin behind your e-cash balance.', '/miikey/', 'Learn about keys and recovery'],
  ['Choose your own wallet.', 'Explore the official Fedi app and its supported federations, or learn about other Bitcoin wallets. Check who holds the funds, fees, recovery and how to leave before you choose.', 'https://www.fedi.xyz/', 'Explore Fedi’s official website'],
  ['Practise before you fund.', 'Learn how receiving, sending, Lightning invoices and backups work. Use a learning exercise first. Keep any real recovery words in your own secure backup, outside community forms and AI chats.', '/sikh-bitcoin/', 'Start a free Bitcoin lesson'],
] as const;

export default function WalletsPage() {
  return <main>
    <PageIntro eyebrow="SATNAM SATOSHI / COMMUNITY WALLETS" title="A place for you. A wallet path you understand." description="Our goal is to help every member who wants a Bitcoin wallet learn how to choose and use one. Start with knowledge, keep the choice yours, and bring your questions to the table." />
    <section className="reading-content wide-content" aria-labelledby="wallet-start">
      <p className="status-note">Open now: free wallet education. Planned: a Satnam Satoshi Fedi federation. There is no live federation invite or automatic member wallet on this website.</p>
      <h2 id="wallet-start">Four small steps. Your own pace.</h2>
      <div className="task-grid">{steps.map(([title, body, href, label]) => <article className="task-card" key={title}><h3>{title}</h3><p>{body}</p><a href={href}>{label} →</a></article>)}</div>
      <h2>One community. Different ways to hold bitcoin.</h2>
      <p>Bitcoin is the base network. Lightning adds a payment network. Fedimint adds community custody and e-cash; Fedi provides an app for communities and federations. These layers have different trust, fee and recovery choices. A community account or Google sign-in is separate from a Bitcoin wallet.</p>
      <h2 id="federation">The Satnam Satoshi federation we want to build</h2>
      <p>A welcoming space for learning and community payments, with named human guardians, understandable rules and a clear recovery path. AI Satoshi Ma and Agent Sangat can help explain, document and test the plan. People must choose guardians and govern custody.</p>
      <ol className="steps">
        <li><div><strong>Agree on people and purpose</strong><p>Identify accountable human guardians, member expectations, decision rules and support responsibilities. Compare a community-operated federation with Fedi’s hosted setup.</p></div></li>
        <li><div><strong>Review custody and costs together</strong><p>Document guardian trust, fees, hosting commitments, backups, exit procedures and what happens if guardians go offline. Fedi’s hosted G-Bot setup matches other guardians and requires an upfront subscription; selecting a plan is a separate founder decision.</p></div></li>
        <li><div><strong>Test recovery before opening the door</strong><p>Run a development pilot, practise joining and leaving, test backup recovery and review the results. A successful website signup does not prove wallet recovery or federation safety.</p></div></li>
        <li><div><strong>Publish the real invitation</strong><p>After human approval and setup, publish the actual federation invite, guardian information, costs and member guide. Each member chooses whether to join in their own app.</p></div></li>
      </ol>
      <p>Until that launch, no deposit, wallet secret or financial information is needed to join Satnam Satoshi. Never paste recovery words into the contribution planner or Ma’s guide.</p>
      <div className="task-grid"><article className="task-card"><h3>Help build the guide.</h3><p>Bring a beginner’s question, a translation or a recovery exercise. Make the next person’s first step easier.</p><a href="/join/?path=research">Make a contribution plan →</a></article><article className="task-card"><h3>Build with Agent Sangat.</h3><p>Help prepare a reviewable wallet learning tool or federation test brief, with public evidence and a human reviewer.</p><a href="/agents/">Meet Ma and the team →</a></article></div>
      <p className="source-notes">Primary sources, checked October 7, 2026: <a href="https://fedimint.org/users/how-it-works">How Fedimint works</a> · <a href="https://fedimint.org/guardians/founding">Founding a federation</a> · <a href="https://www.fedi.xyz/blog/anyone-can-now-create-a-federation-introducing-the-g-bot-federation-setup-service">Fedi’s hosted setup, guardians and pricing</a>. Follow the official pages for current terms.</p>
    </section>
  </main>;
}
