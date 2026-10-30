// Root: provide the listed attributes on existing saved cards; never mutate historical editions.
const hostOK=['satnamsatoshi.com','ltcmagazine.org','localhost','127.0.0.1'].includes(location.hostname);
const roots=[...document.querySelectorAll('[data-live-morpho="true"]')];
if(hostOK&&roots.length){
 let busy=false,stopped=false,lastAttempt=0,poll=null,tick=null,expires=0,inflight=null;
 const cards=()=>roots.flatMap(root=>[...root.querySelectorAll('[data-morpho-route]')]);
 const write=(card,selector,value)=>card.querySelectorAll(selector).forEach(node=>{node.textContent=value;});
 const unavailable=label=>{expires=0;for(const card of cards()){write(card,'[data-morpho-supply]','Withheld');write(card,'[data-morpho-borrow]','Withheld');write(card,'[data-morpho-state]',label);}};
 const validTime=(value,max,now)=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now&&now-Date.parse(value)<=max;
 const percentage=value=>{if(typeof value!=='string'||!/^\d+(?:\.\d+)?$/.test(value)||!Number.isFinite(Number(value))||Number(value)>1000)return 'Withheld';return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(value)*100)+'%';};
 const expire=()=>{if(expires&&Date.now()>expires)unavailable('Source observation expired · refreshing when available');};
 const refresh=async()=>{
  if(busy||stopped||document.hidden)return;busy=true;lastAttempt=Date.now();const c=new AbortController();inflight=c;const timeout=setTimeout(()=>c.abort(),6500);
  try{
   const r=await fetch('/api/morpho-markets',{credentials:'omit',cache:'no-store',signal:c.signal});if(!r.ok)throw Error();const raw=await r.text();if(raw.length>30000)throw Error();const d=JSON.parse(raw),now=Date.now();
   if(d.schemaVersion!==1||d.source!=='Morpho GraphQL'||!['fresh','partial','unavailable'].includes(d.status)||!validTime(d.checkedAt,180000,now)||!Array.isArray(d.markets)||d.markets.length!==4)throw Error();
   const seen=new Set();for(const m of d.markets){if(!m||typeof m.routeId!=='string'||seen.has(m.routeId))throw Error();seen.add(m.routeId);}
   if(stopped)return;
   const deadlines=[Date.parse(d.checkedAt)+180000];
   for(const card of cards()){
    const found=d.markets.filter(m=>m.routeId===card.dataset.morphoRoute&&m.marketId===card.dataset.morphoMarket&&String(m.chainId)===card.dataset.morphoChain);
    const m=found.length===1?found[0]:null,state=m?.state;
    const fresh=m?.status==='fresh'&&state?.freshness==='fresh'&&validTime(state.asOf,900000,now)&&Date.parse(state.asOf)<=Date.parse(d.checkedAt);
    write(card,'[data-morpho-supply]',fresh?percentage(state.supplyApy):'Withheld');write(card,'[data-morpho-borrow]',fresh?percentage(state.borrowApy):'Withheld');
    write(card,'[data-morpho-state]',fresh?`Source state ${state.asOf} · fetched ${d.checkedAt} · variable snapshot`:'Source state unavailable or older than 15 minutes · rates withheld');
    if(fresh)deadlines.push(Date.parse(state.asOf)+900000);
   }
   expires=Math.min(...deadlines);
  }catch{if(!stopped)unavailable('Automatic source unavailable · rates withheld');}
  finally{clearTimeout(timeout);busy=false;if(inflight===c)inflight=null;}
 };
 const start=()=>{if(poll===null)poll=setInterval(refresh,120000);if(tick===null)tick=setInterval(expire,1000);};
 // Saved content is not relabelled live before a validated response arrives.
 refresh();start();
 document.addEventListener('visibilitychange',()=>{expire();if(!document.hidden&&Date.now()-lastAttempt>60000)refresh();});
 window.addEventListener('pagehide',()=>{stopped=true;inflight?.abort();clearInterval(poll);clearInterval(tick);poll=null;tick=null;});
 window.addEventListener('pageshow',e=>{if(e.persisted){stopped=false;start();expire();refresh();}});
}
