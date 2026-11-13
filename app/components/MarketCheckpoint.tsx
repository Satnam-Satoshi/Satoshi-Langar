import snapshot from '../../public/data/ltc-snapshot.json';
import styles from './market-checkpoint.module.css';

export default function MarketCheckpoint() {
 const quotes = snapshot.sources.filter(source => ['coinbase-btc-usd','coinbase-ltc-usd'].includes(source.id));
 const savedPrices = ['coinbase-btc-usd','coinbase-ltc-usd'].map(id => {
  const source = quotes.find(item => item.id === id);
  const price = Number(source?.observations?.[0]?.value);
  return source?.status === 'collected' && source.sourceAsOf && Number.isFinite(Date.parse(source.sourceAsOf)) && Number.isFinite(price) && price > 0 ? price : null;
 });
 const [btc, ltc] = savedPrices;
 const rates = btc !== null && ltc !== null ? [btc / ltc, ltc / btc] : null;
 const acceptedRates = rates?.every(rate => Number.isFinite(rate) && rate > 0) ? rates : null;
 const conversion = (isBtc: boolean) => acceptedRates
  ? `1 ${isBtc ? 'BTC' : 'LTC'} ≈ ${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(acceptedRates[isBtc ? 0 : 1])} ${isBtc ? 'LTC' : 'BTC'}`
  : 'BTC / LTC conversion unavailable';
 return <aside className={styles.checkpoint} aria-label="Current market observations with source times" data-live-market="true">
  <span className={styles.label}><span data-market-state>Market checkpoint</span><br/><small>Coinbase Exchange · USD</small></span>
  {quotes.map(source => <div key={source.id}><strong>{source.id==='coinbase-btc-usd'?'BTC':'LTC'} / USD <b data-market-price={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'}>{source.status==='collected'&&source.observations?.[0]?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(source.observations[0].value)):'Unavailable'}</b></strong><span className={styles.conversion} data-market-conversion={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'}>{conversion(source.id==='coinbase-btc-usd')}</span><small>{source.sourceAsOf?<time data-market-time={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'} dateTime={source.sourceAsOf}>{source.sourceAsOf} UTC</time>:'No accepted source observation'}</small></div>)}
  <a href="/conversations/updates/"><span data-market-note>Dated price samples and USD-implied conversions.</span><br/><small>Not a tradable BTC/LTC quote; fees and spread excluded.<br/>Open the data &amp; newsroom record ↗</small></a>
 </aside>;
}
