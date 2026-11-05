import {blockClock,borrowingExample} from '../../app/data/open-money-math.ts';
const root=document.querySelector('[data-open-money]');
if(root){
 const text=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
 const fmt=v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(v);
 if(root.dataset.openMoney==='learning'){
  root.querySelectorAll('[data-lesson-control]').forEach(el=>{el.hidden=false;});
  root.addEventListener('change',()=>text('[data-lesson-status]',`${root.querySelectorAll('[data-lesson-done]:checked').length} of 7 steps marked complete.`));
 }
 if(root.dataset.openMoney==='timechain'){
  const input=root.querySelector('[data-clock-input]'),slider=root.querySelector('[data-clock-slider]');
  const render=value=>{try{
   if(String(value).trim()==='')throw Error('Enter a whole block height.');
   const m=blockClock(Number(value));
   text('[data-clock-error]','');text('[data-clock-height]',fmt(m.height));
   text('[data-clock-mode]',`${m.height===Number(root.dataset.checkpointHeight)?'Provider checkpoint':'Educational replay · hypothetical selection'} · subsidy epoch ${m.epoch+1}`);
   text('[data-clock-subsidy]',`${m.subsidy} LTC`);text('[data-clock-remaining]',fmt(m.blocksToHalving));text('[data-clock-retarget]',fmt(m.blocksToRetarget));
   text('[data-clock-explainer]',`At this selected height, the next ${m.subsidy===0?'840,000-block':'halving'} boundary is block ${fmt(m.nextHalving)}. This selection does not change the dated source checkpoint.`);
   root.querySelector('[data-clock-ring]').setAttribute('stroke-dashoffset',String(100-m.halvingProgress*100));input.value=String(m.height);slider.value=String(Math.min(Number(slider.max),m.height));
  }catch(error){text('[data-clock-error]',error.message);text('[data-clock-mode]','Invalid selection · previous results retained.');}};
  input.addEventListener('input',()=>render(input.value));slider.addEventListener('input',()=>render(slider.value));
  root.querySelectorAll('[data-clock-preset]').forEach(button=>button.addEventListener('click',()=>render(button.dataset.clockPreset)));
  root.querySelector('[data-clock-controls]').hidden=false;
 }
 if(root.dataset.openMoney==='finance'){
  const fields=[...root.querySelectorAll('[data-borrow-input]')],result=root.querySelector('[data-borrow-result]');
  const render=()=>{try{
   if(fields.some(f=>f.value.trim()===''))throw Error('Complete every fictional input to update the example.');
   const values=Object.fromEntries(fields.map(f=>[f.dataset.borrowInput,Number(f.value)]));const m=borrowingExample(values);
   const money=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
   text('[data-borrow-error]','');text('[data-borrow-state]',m.state);text('[data-borrow-debt]',money(m.totalDebt)+' USDC');text('[data-borrow-collateral]',money(m.stressedCollateral)+' USDC');text('[data-borrow-ltv]',Number.isFinite(m.ltv)?(m.ltv*100).toFixed(2)+'%':'Unbounded · collateral value is zero');text('[data-borrow-health]',Number.isFinite(m.health)?m.health.toFixed(2):'No debt');text('[data-borrow-threshold]',money(m.thresholdValue)+' USDC');result.dataset.boundary=String(m.health<=1);root.querySelector('[data-borrow-meter]').style.width=`${Math.min(100,m.ltv/0.625*100)}%`;
  }catch(error){text('[data-borrow-error]',error.message);text('[data-borrow-state]','Invalid inputs · previous example retained.');}};
  fields.forEach(f=>f.addEventListener('input',render));root.querySelector('[data-borrow-controls]').hidden=false;render();
 }
}
