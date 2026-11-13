import {blockClock} from '../../app/data/open-money-math.ts';
import {acceptChainObservation} from '../../app/data/timechain-observation.ts';
const root=document.querySelector('[data-live-timechain="true"]');
if(root){
 const text=(selector,value)=>{root.querySelectorAll(selector).forEach(e=>e.textContent=value);};
 const number=(n,d=0)=>n.toLocaleString('en-US',{maximumFractionDigits:d});
 let current=null,busy=false,lastAttempt=0,stopped=false,poll=null,tick=null,inflight=null;
 const setStatus=message=>text('[data-live-status]',message);
 const expiry=()=>{if(!current)return false;try{acceptChainObservation({...current,schemaVersion:1,chain:'LTC.main'});return true;}catch{return false;}};
 const countdown=()=>{
  if(!expiry()){text('[data-live-countdown]','Awaiting a fresh observation');if(current&&root.dataset.liveState!=='stale'){root.querySelector('[data-live-use-height]')?.setAttribute('hidden','');root.dataset.liveState='stale';setStatus('Last observation is stale · refreshing when available');}return;}
  const m=blockClock(current.height),end=Date.parse(current.blockTimestamp)+m.blocksToHalving*150000;
  let seconds=Math.max(0,Math.floor((end-Date.now())/1000));const days=Math.floor(seconds/86400);seconds%=86400;const hours=Math.floor(seconds/3600);seconds%=3600;
  text('[data-live-countdown]',`${number(days)}d ${String(hours).padStart(2,'0')}h ${String(Math.floor(seconds/60)).padStart(2,'0')}m ${String(seconds%60).padStart(2,'0')}s`);
 };
 const render=d=>{
  current=d;const m=blockClock(d.height);root.dataset.liveState='fresh';
  setStatus(`Auto-refreshed · provider observed ${d.observedAt}`);
  text('[data-live-height]',number(m.height));text('[data-live-subsidy]',`${m.subsidy} LTC`);text('[data-live-epoch]',`Subsidy epoch ${m.epoch+1}`);
  text('[data-live-remaining]',number(m.blocksToHalving));text('[data-live-retarget]',number(m.blocksToRetarget));text('[data-live-progress]',`${(m.halvingProgress*100).toFixed(2)}%`);
  text('[data-live-issued]',number(m.issued,2));text('[data-live-unissued]',number(m.remainingSupply,2));text('[data-live-supply-percent]',`${(m.supplyProgress*100).toFixed(2)}%`);
  text('[data-live-projected]',new Date(Date.parse(d.blockTimestamp)+m.blocksToHalving*150000).toISOString().slice(0,10)+' UTC');
  text('[data-live-provenance]',`Block timestamp ${d.blockTimestamp} · fetched ${d.checkedAt} · source: BlockCypher. This provider observation is not our own full node.`);
  root.querySelector('[data-live-halving-ring]')?.setAttribute('stroke-dashoffset',String(100-m.halvingProgress*100));
  root.querySelector('[data-live-supply-ring]')?.setAttribute('stroke-dashoffset',String(100-m.supplyProgress*100));
  const bar=root.querySelector('[data-live-supply-bar]');if(bar)bar.style.width=`${m.supplyProgress*100}%`;
  const link=root.querySelector('[data-live-block-source]');if(link)link.href=`https://api.blockcypher.com/v1/ltc/main/blocks/${d.hash}`;
  const use=root.querySelector('[data-live-use-height]');if(use)use.hidden=false;
  countdown();
 };
 const supported=['satnamsatoshi.com','ltcmagazine.org','localhost','127.0.0.1'].includes(location.hostname);
 const refresh=async()=>{
  if(!supported||busy||stopped||document.hidden)return;busy=true;lastAttempt=Date.now();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6500);inflight=controller;
  try{
   const response=await fetch('/api/litecoin-chain',{method:'GET',credentials:'omit',cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Source unavailable');const body=await response.text();if(body.length>20000)throw Error('Invalid response');
   if(!stopped)render(acceptChainObservation(JSON.parse(body)));
  }catch{if(stopped)return;root.querySelector('[data-live-use-height]')?.setAttribute('hidden','');current=null;root.dataset.liveState='unavailable';setStatus('Automatic source update unavailable · values below retain their displayed checkpoint');text('[data-live-countdown]','Awaiting a fresh observation');}
  finally{clearTimeout(timeout);busy=false;if(inflight===controller)inflight=null;}
 };
 root.querySelector('[data-live-use-height]')?.addEventListener('click',()=>{if(!expiry())return;const input=root.querySelector('[data-clock-input]');if(!input)return;input.value=String(current.height);input.dispatchEvent(new Event('input',{bubbles:true}));});
 if(supported){setStatus('Saved checkpoint · checking the cloud source…');refresh();}else{setStatus('Portable copy · saved checkpoint; automatic source refresh is available on the two official domains.');}
 const startTimers=()=>{if(poll===null)poll=setInterval(refresh,120000);if(tick===null)tick=setInterval(countdown,1000);};
 startTimers();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastAttempt>60000)refresh();});
 window.addEventListener('pagehide',()=>{stopped=true;inflight?.abort();clearInterval(poll);clearInterval(tick);poll=null;tick=null;});
 window.addEventListener('pageshow',event=>{if(event.persisted){stopped=false;startTimers();countdown();refresh();}});
}
