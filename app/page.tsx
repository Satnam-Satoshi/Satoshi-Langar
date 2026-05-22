const pillars = [
  {
    title: 'Satoshi Langar',
    text: 'A Bitcoin-first seva system where people can eat free, donate groceries, give time, and keep the community fed with dignity.',
  },
  {
    title: 'AI Sevadars',
    text: 'Human volunteers and AI agents working together to coordinate food, education, treasury transparency, and community support.',
  },
  {
    title: 'Bitcoin Education',
    text: 'Simple lessons that teach families, youth, and local communities how time, truth, value, and Bitcoin fit together.',
  },
];

const actions = [
  'Donate Food',
  'Donate Time',
  'Become a Sevadar',
  'Learn Bitcoin',
  'Join the Sangat',
];

const roadmap = [
  'Launch public website',
  'Add BTC and LTC treasury addresses',
  'Open Satoshi Langar volunteer intake',
  'Integrate Lightning donations and sats rewards',
  'Publish the first Bitcoin education series',
];

export default function Home() {
  return (
    <main>
      <section className="hero-shell">
        <nav className="nav">
          <div className="brand-mark">☬₿</div>
          <div className="brand-copy">
            <strong>Satnam Satoshi</strong>
            <span>Time is Chain</span>
          </div>
          <div className="nav-links">
            <a href="#mission">Mission</a>
            <a href="#langar">Langar</a>
            <a href="#treasury">Treasury</a>
            <a href="#join">Join</a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-content">
            <p className="eyebrow">Bitcoin-powered seva infrastructure for humanity</p>
            <h1>Time is Chain. Truth is Value. Love is Currency.</h1>
            <p className="hero-text">
              Satnam Satoshi unites Guru Nanak’s wisdom with Bitcoin’s truth to build open-source tools, AI sevadars, education, and community-powered langar for the global sangat.
            </p>
            <div className="button-row">
              <a className="primary-button" href="#join">Join the Movement</a>
              <a className="secondary-button" href="#langar">Explore Satoshi Langar</a>
            </div>
          </div>

          <div className="sigil-card" aria-label="Satnam Satoshi identity card">
            <div className="sunburst">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div className="guru-icon">☬</div>
            <div className="bitcoin-orbit">₿</div>
            <h2>Satnam Satoshi</h2>
            <p>Serve. Learn. Stack Sats.</p>
          </div>
        </div>
      </section>

      <section id="mission" className="section split-section">
        <div>
          <p className="eyebrow">The mission</p>
          <h2>A digital gurudwara for the Bitcoin age.</h2>
        </div>
        <p>
          We are building a community system where anyone can contribute money, food, time, knowledge, or code. Satoshi Langar begins locally in Hicksville, New York and scales globally through open-source software, transparent Bitcoin treasuries, and AI-assisted coordination.
        </p>
      </section>

      <section className="section cards-grid">
        {pillars.map((pillar) => (
          <article className="glass-card" key={pillar.title}>
            <div className="card-dot" />
            <h3>{pillar.title}</h3>
            <p>{pillar.text}</p>
          </article>
        ))}
      </section>

      <section id="langar" className="section feature-panel">
        <div>
          <p className="eyebrow">First live product</p>
          <h2>Satoshi Langar</h2>
          <p>
            Langar is free. The system invites people to donate groceries, sponsor meals, serve as volunteers, teach Bitcoin, or support logistics. AI sevadars help coordinate proof-of-seva and future Lightning rewards.
          </p>
        </div>
        <div className="action-stack">
          {actions.map((action) => (
            <a href="#join" key={action}>{action}</a>
          ))}
        </div>
      </section>

      <section id="treasury" className="section treasury-section">
        <p className="eyebrow">Transparent treasury</p>
        <h2>BTC and LTC reserve dashboard coming next.</h2>
        <p>
          Treasury addresses will be published here once confirmed. The reserve system will show donations, sats accumulated, litoshis accumulated, and how funds support food, education, software, and community operations.
        </p>
        <div className="treasury-boxes">
          <div><span>BTC</span><strong>Pending</strong></div>
          <div><span>LTC</span><strong>Pending</strong></div>
          <div><span>Lightning</span><strong>Planned</strong></div>
        </div>
      </section>

      <section className="section roadmap-section">
        <p className="eyebrow">Execution roadmap</p>
        <h2>From live website to living movement.</h2>
        <div className="roadmap-list">
          {roadmap.map((item, index) => (
            <div className="roadmap-item" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="join" className="section final-cta">
        <p className="eyebrow">Join the sangat</p>
        <h2>Eat free. Serve humanity. Stack sats.</h2>
        <p>
          The first public action layer will collect volunteers, food donors, educators, developers, artists, and community builders. The next update will add live forms and wallet addresses.
        </p>
        <div className="button-row center">
          <a className="primary-button" href="mailto:edwireless@aol.com?subject=Join Satnam Satoshi">Join by Email</a>
          <a className="secondary-button" href="#mission">Read the Mission</a>
        </div>
      </section>
    </main>
  );
}
