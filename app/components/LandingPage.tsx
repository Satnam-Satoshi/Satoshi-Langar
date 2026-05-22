'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Transition, Variants } from 'framer-motion';
import { ArrowRight, Bitcoin, ChevronDown, Coins, Menu, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import {
  communityActions,
  ecosystemSections,
  navItems,
  platformModules,
  roadmap,
  treasuryArchitecture,
} from '../data/site';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const transition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.7, ease: [0.22, 1, 0.36, 1] };

  return (
    <main className="site-shell">
      <section className="hero-section" aria-labelledby="hero-title">
        <header className="site-header">
          <a className="brand-lockup" href="#" aria-label="Satnam Satoshi home">
            <span className="brand-mark" aria-hidden="true">☬</span>
            <span>
              <strong>Satnam Satoshi</strong>
              <small>Satoshi Langar</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <a href={item.href} key={item.href}>{item.label}</a>
            ))}
          </nav>

          <button
            className="icon-button menu-button"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
            ))}
          </nav>
        )}

        <div className="hero-grid">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={transition}
          >
            <p className="eyebrow">Bitcoin-first seva infrastructure</p>
            <h1 id="hero-title">Time is Chain. Truth is Value. Love is Currency.</h1>
            <p className="hero-text">
              Satnam Satoshi unites Guru Nanak's spirit of langar with Bitcoin, Litecoin, AI sevadars,
              transparent treasuries, and open-source tools for a global humanitarian movement.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#join">
                Join the Movement <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-button" href="#treasury">
                View Treasury Plan
              </a>
            </div>
          </motion.div>

          <motion.div
            className="sanctum-panel"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...transition, delay: reduceMotion ? 0 : 0.15 }}
            aria-label="Satnam Satoshi identity visualization"
          >
            <div className="geometry-ring" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="coin-track" aria-hidden="true">
              <span className="coin gold"><Bitcoin size={28} /></span>
              <span className="coin silver"><Coins size={26} /></span>
            </div>
            <div className="khanda-core" aria-hidden="true">☬</div>
            <div className="sanctum-copy">
              <strong>Satoshi Langar</strong>
              <span>Serve free meals. Teach sound money. Build in the open.</span>
            </div>
          </motion.div>
        </div>

        <a className="scroll-cue" href="#mission" aria-label="Scroll to mission">
          <ChevronDown size={22} />
        </a>
      </section>

      <section className="section intro-band" aria-label="Movement summary">
        <p>
          This is not a crypto campaign. It is a movement platform for seva: grounded in humility,
          organized with modern software, and accountable through public Bitcoin-first infrastructure.
        </p>
      </section>

      <section className="section ecosystem-grid" aria-label="Core ecosystem">
        {ecosystemSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.article
              id={section.id}
              className="feature-block"
              key={section.id}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-120px' }}
              variants={fadeUp}
              transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.08 }}
            >
              <div className="feature-icon"><Icon size={22} /></div>
              <p className="eyebrow">{section.kicker}</p>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              <span className="feature-stat">{section.stat}</span>
            </motion.article>
          );
        })}
      </section>

      <section className="section platform-section" aria-labelledby="platform-title">
        <div className="section-heading">
          <p className="eyebrow">Platform architecture</p>
          <h2 id="platform-title">Built as a scalable movement stack.</h2>
          <p>
            The landing page is the public front door. Behind it, each module can become a real product:
            treasury, donations, education, chapters, intake, and AI operations.
          </p>
        </div>
        <div className="module-grid">
          {platformModules.map((module) => {
            const Icon = module.icon;
            return (
              <article className="module-card" key={module.title}>
                <Icon size={24} />
                <h3>{module.title}</h3>
                <p>{module.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="treasury" className="section treasury-section" aria-labelledby="treasury-title">
        <div className="treasury-copy">
          <p className="eyebrow">Treasury transparency</p>
          <h2 id="treasury-title">Reserve dashboard architecture is ready for live addresses.</h2>
          <p>
            BTC, LTC, and Lightning flows will be presented with clean public accountability:
            what came in, what went out, and which seva purpose each movement supported.
          </p>
        </div>
        <div className="treasury-grid">
          {treasuryArchitecture.map((item) => (
            <div className={`treasury-tile ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="education" className="section learning-section" aria-labelledby="learning-title">
        <div className="section-heading compact">
          <p className="eyebrow">Bitcoin education</p>
          <h2 id="learning-title">Simple enough for families. Serious enough for builders.</h2>
        </div>
        <div className="roadmap-list">
          {roadmap.map((item, index) => (
            <div className="roadmap-item" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="join" className="section join-section" aria-labelledby="join-title">
        <div className="join-copy">
          <p className="eyebrow">Global sangat</p>
          <h2 id="join-title">Eat free. Serve humanity. Stack sats.</h2>
          <p>
            Satnam Satoshi needs volunteers, food donors, educators, engineers, designers,
            artists, local organizers, and long-term stewards.
          </p>
        </div>
        <div className="action-grid">
          {communityActions.map((action) => {
            const Icon = action.icon;
            return (
              <a href="mailto:edwireless@aol.com?subject=Join Satnam Satoshi" key={action.label}>
                <Icon size={20} />
                <span>{action.label}</span>
              </a>
            );
          })}
        </div>
        <a className="primary-button join-button" href="mailto:edwireless@aol.com?subject=Join Satnam Satoshi">
          Begin Seva <WalletCards size={18} aria-hidden="true" />
        </a>
      </section>

      <footer className="site-footer">
        <div>
          <strong>Satnam Satoshi</strong>
          <span>Time is Chain. Truth is Value. Love is Currency.</span>
        </div>
        <a href="mailto:edwireless@aol.com?subject=Satnam Satoshi">Contact</a>
      </footer>
    </main>
  );
}
