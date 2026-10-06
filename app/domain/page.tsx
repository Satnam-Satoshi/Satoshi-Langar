import { PageIntro } from '../components/PageIntro';

export const metadata={title:'Website access · Satnam.x and preserved IPFS releases',description:'Learn how the HTTPS website, satnam.x domain and preserved IPFS releases differ, and how to check which publication version you are reading.'};

const website = 'https://https-github-com-satnam-satoshi-sat.vercel.app/';
const sections = [
  { title: 'Read the latest publication', body: 'Our HTTPS website receives verified daily magazine releases. Use the link below for the latest published issue and its date. Reading and learning do not require a wallet.' },
  { title: 'Visit through satnam.x', body: 'satnam.x is a Web3 domain. Opening it depends on a compatible browser, extension or gateway; ordinary browsers may treat it as a search or fail to resolve it. The domain’s saved website record determines which IPFS release it opens.' },
  { title: 'Keep a copy on IPFS', body: 'An IPFS content address identifies a fixed release. That copy preserves the pages and issue dates available when it was published; it does not receive later daily editions automatically. Updating the domain’s saved content address requires the domain owner’s approval.' },
  { title: 'Independent by design', body: 'The public site can be exported and hosted without a ChatGPT account, database or proprietary application server. IPFS copies still need people or pinning services to retain and serve them. The HTTPS host and public gateways are third-party services, not guarantees of availability.' },
];

export default function Page() {
  return <main>
    <PageIntro eyebrow="Our address" title="Satnam.x, with an open door to the web." description="Choose the current website or a preserved IPFS release. Keep the publication date in view, wherever you read." />
    <section className="reading-content">
      <a className="launch-button" href={website}>Open the current website ↗</a>
      {sections.map(({ title, body }) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}
      <a className="launch-button" href={website + 'conversations/'}>Read the latest LTC publication ↗</a>
      <p><a href="https://docs.unstoppabledomains.com/web3/resolution/guides/browser-resolution/overview">How Unstoppable domain resolution works ↗</a></p>
      <a href="/join/">Find a contribution →</a>
    </section>
  </main>;
}
