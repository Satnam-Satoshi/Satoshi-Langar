import { socialProfiles } from '../data/social';
import styles from './social-links.module.css';

function SocialIcon({ id }: { id: typeof socialProfiles[number]['id'] }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
    {id === 'x' ? <><path d="M4 3h4.5L20 21h-4.5L4 3Z"/><path d="m20 3-7 8M4 21l7-8"/></> : id === 'instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></> : <><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></>}
  </svg>;
}

export function SocialLinks({ mode = 'bar' }: { mode?: 'bar' | 'footer' | 'cards' }) {
  if (mode === 'cards') return <section className={`${styles.socials} ${styles.cards}`} aria-label="Follow LTC Magazine">
    <div className={styles.intro}><p>LTC MAGAZINE / OUR SOCIAL CHANNELS</p><h2>Good stories.<br/><em>Better conversations.</em></h2><span>Follow our project accounts. Bring a question, share an issue and help the next reader find their way.</span></div>
    <div className={styles.grid}>{socialProfiles.map(profile => <a key={profile.id} className={styles.card} href={profile.href}>
      <div className={styles.cardTop}><SocialIcon id={profile.id}/><strong>{profile.label}</strong><span aria-hidden="true">↗</span></div>
      <h3>{profile.title}</h3><p>{profile.description}</p><small>{profile.handle}</small><b>{profile.action} <span aria-hidden="true">↗</span></b>
    </a>)}</div>
  </section>;
  return <div className={`${styles.socials} ${mode === 'bar' ? styles.bar : styles.footer}`}>
    <div className={styles.inner}><span className={styles.label}>Follow LTC Magazine</span><nav className={styles.links} aria-label="LTC Magazine social channels">
      {socialProfiles.map(profile => <a key={profile.id} href={profile.href} aria-label={`LTC Magazine on ${profile.label}`}><SocialIcon id={profile.id}/><span>{profile.label}</span><span className={styles.arrow} aria-hidden="true">↗</span></a>)}
    </nav></div>
  </div>;
}
