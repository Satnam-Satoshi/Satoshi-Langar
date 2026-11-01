import {paths,normalizePath,createPlan,planText,issueUrl} from '../community-core.mjs';
const root=document.querySelector('[data-community]');
const base=new URL(root.dataset.home,location.href);
const key='satnam-contribution-v1';
const message=root.querySelector('[data-message]');
function load(){try {const value=JSON.parse(sessionStorage.getItem(key)||localStorage.getItem(key)||'null');return value && value.version===1 && Object.hasOwn(paths,value.path)?createPlan(value,new Date(value.createdAt)):null;}catch{return null;}}
function download(plan){const blob=new Blob([planText(plan)],{type:'text/markdown;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='satnam-first-contribution.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
const form=root.querySelector('[data-plan-form]');
if(form){
  form.hidden=false;root.querySelector('[data-no-js]').hidden=true;
  const saved=load();
  const query=new URL(location.href).searchParams.get('path');
  form.elements.path.value=normalizePath(query||saved?.path||'learn');
  if(saved){form.elements.time.value=saved.time;form.elements.note.value=saved.note;try{form.elements.remember.checked=!!localStorage.getItem(key);}catch{/* Session draft remains usable. */}}
  const describe=()=>{const p=paths[form.elements.path.value];root.querySelector('[data-first-task]').textContent=p.task;root.querySelector('[data-task-output]').textContent=p.output;};describe();form.elements.path.addEventListener('change',describe);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const plan=createPlan(Object.fromEntries(new FormData(form)));
    try {sessionStorage.setItem(key,JSON.stringify(plan)); if(form.elements.remember.checked)localStorage.setItem(key,JSON.stringify(plan));else localStorage.removeItem(key);location.assign(new URL('welcome/index.html',base));}
    catch {message.textContent='Your browser blocked saving. You can download your plan and use the program links below.';download(plan);}
  });
}
const summary=root.querySelector('[data-plan-summary]');
if(summary){const plan=load();if(plan){summary.hidden=false;root.querySelector('[data-empty-plan]').hidden=true;const p=paths[plan.path];root.querySelector('[data-plan-title]').textContent=p.title;root.querySelector('[data-plan-task]').textContent=p.task;root.querySelector('[data-plan-note]').textContent=plan.note||'You can add a note when you edit your plan.';root.querySelector('[data-plan-time]').textContent=plan.time;root.querySelector('[data-program-link]').href=new URL(p.href+'index.html',base).href;root.querySelector('[data-proposal-link]').href=issueUrl(plan);root.querySelector('[data-download]').addEventListener('click',()=>download(plan));root.querySelector('[data-clear]').addEventListener('click',()=>{try{sessionStorage.removeItem(key);localStorage.removeItem(key);summary.hidden=true;root.querySelector('[data-empty-plan]').hidden=false;message.textContent='Contribution draft removed from this browser. This does not delete anything you posted on GitHub.';}catch{message.textContent='Browser storage is unavailable. Use browser settings to clear local site data.';}});}}
