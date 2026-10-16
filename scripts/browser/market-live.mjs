const root=document.querySelector('[data-live-market="true"]');
if(root){
 const supported=['satnamsatoshi.com','ltcmagazine.org','localhost','127.0.0.1'].includes(location.hostname);
 let busy=false,stopped=false,lastAttempt=0,poll=null,tick=null,expires=0,inflight=null;
 const text=(selector,value)=>root.querySelectorAll(selector).forEach(e=>e.textContent=value);
 const stale=()=>{if(expires&&Date.now()>expires){text('[data-market-state]','Last price observation · refresh pending');expires=0;}};
 const refresh=async()=>{
  if(!supported||busy||stopped||document.hidden)return;busy=true;lastAttempt=Date.now();const c=new AbortController();inflight=c;const timer=setTimeout(()=>c.abort(),6500);
  try{
   const r=await fetch('/api/market-prices',{credentials:'omit',cache:'no-store',signal:c.signal});if(!r.ok)throw Error();const raw=await r.text();if(raw.length>12000)throw Error();const d=JSON.parse(raw),now=Date.now();
   const validTime=(v,max)=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=now+60000&&now-Date.parse(v)<=max;
   if(d.schemaVersion!==1||d.status!=='fresh'||d.source!=='Coinbase Exchange'||!validTime(d.checkedAt,180000)||!Array.isArray(d.quotes)||d.quotes.length!==2)throw Error();
   const quotes=['BTC-USD','LTC-USD'].map(product=>{const matches=d.quotes.filter(q=>q.product===product);if(matches.length!==1)throw Error();const q=matches[0];if(!Number.isFinite(q.price)||q.price<=0||!validTime(q.observedAt,300000)||Date.parse(q.observedAt)>Date.parse(d.checkedAt)+60000)throw Error();return q;});
   if(stopped)return;
   for(const q of quotes){text(`[data-market-price="${q.product}"]`,new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(q.price));const time=root.querySelector(`[data-market-time="${q.product}"]`);if(time){time.textContent=q.observedAt;time.dateTime=q.observedAt;}}
   expires=Math.min(Date.parse(d.checkedAt)+180000,...quotes.map(q=>Date.parse(q.observedAt)+300000));text('[data-market-state]','Auto-refreshed price observations');text('[data-market-note]','Coinbase Exchange observations · refresh every two minutes.');
  }catch{if(!stopped){expires=0;text('[data-market-state]','Dated prices · automatic refresh unavailable');text('[data-market-note]','Source times remain displayed. Open the data & newsroom record ↗');}}
  finally{clearTimeout(timer);busy=false;if(inflight===c)inflight=null;}
 };
 const start=()=>{if(poll===null)poll=setInterval(refresh,120000);if(tick===null)tick=setInterval(stale,1000);};
 if(supported){refresh();start();}
 document.addEventListener('visibilitychange',()=>{stale();if(!document.hidden&&Date.now()-lastAttempt>60000)refresh();});
 window.addEventListener('pagehide',()=>{stopped=true;inflight?.abort();clearInterval(poll);clearInterval(tick);poll=null;tick=null;});
 window.addEventListener('pageshow',event=>{if(event.persisted){stopped=false;start();stale();refresh();}});
}
