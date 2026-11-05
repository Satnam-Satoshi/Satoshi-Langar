import snapshot from '../../public/data/ltc-snapshot.json';
import styles from './market-checkpoint.module.css';

export default function MarketCheckpoint() {
 const quotes = snapshot.sources.filter(source => ['coinbase-btc-usd','coinbase-ltc-usd'].includes(source.id));
 return <aside className={styles.checkpoint} aria-label="Current market observations with source times" data-live-market="true">
  <span className={styles.label}><span data-market-state>Market checkpoint</span><br/><small>Coinbase Exchange · USD</small></span>
  {quotes.map(source => <div key={source.id}><strong>{source.id==='coinbase-btc-usd'?'BTC':'LTC'} / USD <b data-market-price={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'}>{source.status==='collected'&&source.observations?.[0]?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(source.observations[0].value)):'Unavailable'}</b></strong><small>{source.sourceAsOf?<time data-market-time={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'} dateTime={source.sourceAsOf}>{source.sourceAsOf} UTC</time>:'No accepted source observation'}</small></div>)}
  <a href="/conversations/updates/"><span data-market-note>Dated samples, not live prices.</span><br/><small>Open the data &amp; newsroom record ↗</small></a>
 </aside>;
}
