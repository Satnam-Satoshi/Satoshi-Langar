import { SatnamMark } from './SatnamMark';
const links = [['Our story', '/mission/'], ['Projects', '/projects/'], ['Humans + AI', '/agents/'], ['Open source', '/open-source/']];
export function SiteHeader() {
 return <header className="launch-header"><div className="launch-wrap header-row"><a href="/" className="launch-brand" aria-label="Satnam Satoshi home"><span><SatnamMark title="" /></span><strong>Satnam Satoshi<small>In service of humanity</small></strong></a><nav className="desktop-nav" aria-label="Primary navigation">{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav><a href="/join/" className="header-join">Join the beginning <span aria-hidden="true">↗</span></a><details className="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation">{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}<a href="/join/">Join the beginning</a></nav></details></div></header>;
}
