const groups = [
  { id: 'footer-read', title: 'Read & learn', links: [['Sikh Bitcoin', '/sikh-bitcoin/'], ['MiiKey · self-custody', '/miikey/'], ['LTC magazine', '/conversations/'], ['Proof of Birthday special', '/conversations/specials/proof-of-birthday/'], ['Past issues', '/conversations/archive/'], ['Follow LTC by RSS', '/conversations/feed.xml'], ['About LTC Media', '/conversations/about/']] },
  { id: 'footer-participate', title: 'Take part', links: [['Find your first task', '/join/'], ['Satoshi Langar', '/langar/'], ['Kalakar.x', '/kalakar/'], ['Bitcoin meetups', '/meetups/'], ['Humans + AI', '/agents/']] },
  { id: 'footer-build', title: 'Build together', links: [['Collaborate', '/partners/'], ['Open technology', '/technology/'], ['Community channels', '/connect/'], ['Roadmap', '/roadmap/'], ['GitHub ↗', 'https://github.com/Satnam-Satoshi/Satoshi-Langar']] },
  { id: 'footer-project', title: 'Project & help', links: [['Our story', '/mission/'], ['Transparency', '/transparency/'], ['Shop · concept collection', '/shop/'], ['Donate BTC / LTC', '/donate/'], ['My contribution plan', '/welcome/'], ['Account setup status', '/sign-in/'], ['Privacy', '/privacy/']] },
];

export function SiteFooter() {
  return <footer className="launch-footer"><div className="launch-wrap">
    <div className="footer-main">
      <div className="footer-identity"><strong>Satnam Satoshi</strong><p>Open tools. Shared knowledge.<br />Human dignity.</p><small>Rooted in seva. Built in the open.</small></div>
      <nav className="footer-groups" aria-label="Footer navigation">
        {groups.map(group => <section key={group.id} aria-labelledby={group.id}>
          <h2 id={group.id}>{group.title}</h2>
          <ul>{group.links.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
        </section>)}
      </nav>
    </div>
    <div className="footer-bottom"><span>© 2026 Satnam Satoshi contributors · v0.1.26</span><a href="/domain/">Website access &amp; mirrors</a><span>Humans govern. AI assists.</span></div>
  </div></footer>;
}
