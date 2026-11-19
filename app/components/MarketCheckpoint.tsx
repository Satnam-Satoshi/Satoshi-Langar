import snapshot from '../../public/data/ltc-snapshot.json';
import styles from './market-checkpoint.module.css';

export default function MarketCheckpoint() {
 const quotes = ['coinbase-btc-usd','coinbase-ltc-usd'].map(id => snapshot.sources.find(source => source.id===id) ?? {id,status:'unavailable',sourceAsOf:null,observations:null});
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
 return <aside className={styles.checkpoint} aria-label="Market observations with verified source times" data-live-market="true">
  <span className={styles.label}><span data-market-state>{savedPrices.some(price=>price!==null)?'Saved source observations · checking live source':'Fresh quote unavailable · checking live source'}</span><br/><small>Coinbase Exchange · USD</small></span>
  {quotes.map((source,index) => <div key={source.id}><strong>{source.id==='coinbase-btc-usd'?'BTC':'LTC'} / USD <b data-market-price={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'}>{savedPrices[index]!==null?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(savedPrices[index]!):'Unavailable'}</b></strong><span className={styles.conversion} data-market-conversion={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'}>{conversion(source.id==='coinbase-btc-usd')}</span><small><time data-market-time={source.id==='coinbase-btc-usd'?'BTC-USD':'LTC-USD'} dateTime={savedPrices[index]!==null?source.sourceAsOf??undefined:undefined}>{savedPrices[index]!==null?source.sourceAsOf:'No accepted source observation'}</time></small></div>)}
  <a href="/conversations/updates/"><span data-market-note>Saved observations retain their source times and are not live. Live quotes appear only after source verification.</span><br/><small>Not a tradable BTC/LTC quote; fees and spread excluded.<br/>Open the data &amp; newsroom record ↗</small></a>
 </aside>;
}
