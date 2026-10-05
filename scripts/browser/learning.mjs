import {satChallenges,balanceTransaction,signingThreshold,trustChallenges} from '../lib/learning-lab.mjs';
/* Optional local learning notes. No network requests, wallet access, or third-party code. */
(() => {
  'use strict';
  const prefix = 'satnam-satoshi-learning-v1:';
  document.querySelectorAll('[data-learning-progress]').forEach((root) => {
    const courseId = root.dataset.courseId;
    if (!['foundations', 'deep-dive', 'sovereignty'].includes(courseId)) return;
    let lessons;
    try { lessons = JSON.parse(root.dataset.lessons || '[]'); } catch { return; }
    if (!Array.isArray(lessons) || lessons.length !== 21 || lessons.some((item) => !item || typeof item.slug !== 'string' || typeof item.title !== 'string')) return;
    const known = new Set(lessons.map((item) => item.slug));
    const key = prefix + courseId;
    const current = root.dataset.lessonSlug;
    const controls = root.querySelector('[data-learning-controls]');
    const fallback = root.querySelector('[data-learning-fallback]');
    const status = root.querySelector('[data-learning-status]');
    const meter = root.querySelector('[data-learning-meter]');
    const toggle = root.querySelector('[data-learning-toggle]');
    const reset = root.querySelector('[data-learning-reset]');
    const confirmation = root.querySelector('[data-learning-confirm]');
    const confirm = root.querySelector('[data-learning-reset-confirm]');
    const cancel = root.querySelector('[data-learning-reset-cancel]');
    const exporter = root.querySelector('[data-learning-export]');
    const storageNote = root.querySelector('[data-learning-storage-note]');
    if (!controls || !status || !meter || !reset || !confirmation || !confirm || !cancel || !exporter || !storageNote) return;
    let completed = new Set();
    let savedAt = null;
    let warning = '';
    function read() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const value = JSON.parse(raw);
          if (value.version !== 1 || !Array.isArray(value.completed)) throw new Error('Invalid progress data');
          completed = new Set(value.completed.filter((slug) => known.has(slug)));
          savedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
        } else { completed = new Set(); savedAt = null; }
      } catch {
        warning = 'Saved progress could not be read. New marks stay in this page until browser storage is available.';
      }
    }
    function render() {
      status.textContent = `${completed.size} of ${lessons.length} lessons marked complete.${warning ? ' ' + warning : ''}`;
      meter.value = completed.size;
      const next=lessons.find(l=>!completed.has(l.slug));
      const continueLink=root.querySelector('[data-learning-continue]');
      if(continueLink){continueLink.href=next?new URL('../'.repeat(location.pathname.includes('/course/')?2:1)+next.slug+'/index.html',location.href).href:new URL(location.pathname.includes('/course/')?'../../index.html':'../index.html',location.href).href;continueLink.textContent=next?'Continue: '+next.title+' →':'All 21 marked complete — explore another course →';}

      if (toggle && known.has(current)) {
        const done = completed.has(current);
        toggle.textContent = done ? 'Mark this lesson incomplete' : 'Mark this lesson complete';
        toggle.setAttribute('aria-pressed', String(done));
      }
      document.querySelectorAll('[data-learning-completed]').forEach((label) => {
        if (known.has(label.dataset.learningCompleted)) label.hidden = !completed.has(label.dataset.learningCompleted);
      });
    }
    function persist() {
      savedAt = new Date().toISOString();
      try {
        localStorage.setItem(key, JSON.stringify({ version: 1, completed: [...completed], updatedAt: savedAt }));
        warning = '';
      } catch {
        warning = 'Browser storage is unavailable. These marks are temporary; export them before leaving.';
      }
      render();
    }
    read();
    render();
    controls.hidden = false;
    if (fallback) fallback.hidden = true;
    if (toggle && known.has(current)) toggle.addEventListener('click', () => {
      if (completed.has(current)) completed.delete(current); else completed.add(current);
      persist();
    });
    reset.addEventListener('click', () => { confirmation.hidden = false; confirm.focus(); });
    cancel.addEventListener('click', () => { confirmation.hidden = true; reset.focus(); });
    confirm.addEventListener('click', () => {
      completed.clear();
      persist();
      confirmation.hidden = true;
      reset.focus();
    });
    exporter.addEventListener('click', () => {
      try {
        const record = {
          format: 'Satnam Satoshi local learning notes', version: 1, courseId,
          exportedAt: new Date().toISOString(), updatedAt: savedAt,
          note: 'Self-reported completion, not a credential. Local record only; this site does not import exports.',
          completed: lessons.filter(({ slug }) => completed.has(slug)),
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `satnam-satoshi-${courseId}-progress.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = `${completed.size} of ${lessons.length} lessons marked complete. Progress export prepared; check your browser downloads.`;
      } catch {
        status.textContent = 'The browser could not create the export. Your current marks are still shown on this page.';
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key === key || event.key === null) { warning = ''; completed = new Set(); read(); render(); }
    });
  });
})();

/* Progressive enhancements keep every lesson and answer available without JavaScript. */
const learningRoot=document.querySelector('[data-learning-hub]');
const labels={foundations:'Bitcoin Foundations','deep-dive':'Bitcoin Deep Dive',sovereignty:'Sovereignty & Self-Custody'};
const linkWithinSchool=(suffix)=>new URL(suffix,document.querySelector('[data-learning-hub]')?location.href:new URL('../',location.href)).href;
if(learningRoot){
 const picker=learningRoot.querySelector('[data-path-picker]'),controls=picker?.querySelector('[data-path-controls]'),result=picker?.querySelector('[data-path-result]');
 if(controls&&result){controls.hidden=false;controls.querySelectorAll('[data-path]').forEach(button=>button.addEventListener('click',()=>{controls.querySelectorAll('[data-path]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const id=button.dataset.path;if(!labels[id])return;result.replaceChildren(document.createTextNode('A good starting point: '));const a=document.createElement('a');a.href=linkWithinSchool(`course/${id}/index.html`);a.textContent=labels[id]+' →';result.append(a,document.createTextNode(' All paths stay open; this is a suggestion, not a prerequisite.'));result.hidden=false;}));}
 try{let latest=null,total=0;for(const id of Object.keys(labels)){const raw=localStorage.getItem('satnam-satoshi-learning-v1:'+id);if(!raw)continue;const v=JSON.parse(raw);if(v.version!==1||!Array.isArray(v.completed))continue;const n=new Set(v.completed.filter(x=>typeof x==='string')).size;total+=Math.min(n,21);if(n&&(!latest||Date.parse(v.updatedAt)>Date.parse(latest.updatedAt)))latest={id,updatedAt:v.updatedAt};}if(latest){const box=learningRoot.querySelector('[data-learning-resume]');box.querySelector('[data-resume-message]').textContent=`Your local learning notes: ${total} lessons marked. Return to ${labels[latest.id]}.`;box.querySelector('[data-resume-link]').href=linkWithinSchool(`course/${latest.id}/index.html`);box.hidden=false;}}catch{/* Reading never depends on saved notes. */}
}
for(const quiz of document.querySelectorAll('[data-learning-quiz]')){
 const options=quiz.querySelector('[data-quiz-options]'),check=quiz.querySelector('[data-quiz-check]'),feedback=quiz.querySelector('[data-quiz-feedback]'),explanation=quiz.querySelector('[data-quiz-explanation]');
 if(!options||!check||!feedback||!explanation)continue;options.hidden=false;check.hidden=false;quiz.querySelector('[data-quiz-fallback]').hidden=true;
 // Rotate presentation deterministically; answer labels are not used as shortcuts.
 const rows=[...options.children],offset=Number(quiz.dataset.answer)+quiz.querySelector('input').name.length%rows.length;rows.slice(offset%rows.length).concat(rows.slice(0,offset%rows.length)).forEach(row=>options.append(row));
 options.addEventListener('change',()=>{feedback.hidden=true;feedback.textContent='';explanation.open=false;check.textContent='Check my answer';});
 check.addEventListener('click',()=>{const chosen=options.querySelector('input:checked');feedback.hidden=false;if(!chosen){feedback.textContent='Choose an answer first. There is no time limit.';feedback.dataset.result='retry';return;}const correct=Number(chosen.value)===Number(quiz.dataset.answer);feedback.dataset.result=correct?'correct':'retry';feedback.textContent=(correct?'That matches the lesson. ':'A useful moment to pause. ')+explanation.querySelector('p').textContent;explanation.open=true;check.textContent='Check again';});
}
for(const el of document.querySelectorAll('[data-learning-lab] [data-lab-controls]'))el.hidden=false;
const sats=document.querySelector('[data-sats-game]');
if(sats){let current=0;const question=sats.querySelector('[data-sats-question]'),choices=sats.querySelector('[data-sats-options]'),feedback=sats.querySelector('[data-sats-feedback]');const render=()=>{const c=satChallenges[current];question.textContent=`${current+1} / ${satChallenges.length} — How many sats are in ${c.btc} BTC?`;choices.replaceChildren();c.options.forEach((value,i)=>{const button=document.createElement('button');button.type='button';button.textContent=value+' sats';button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));feedback.textContent=(i===c.answer?'You’ve got it. ':'Try the multiplication: ')+`${c.btc} × 100,000,000 = ${c.sats.toLocaleString('en-US')} sats. The quantity stays the same when the unit changes.`;});choices.append(button);});feedback.textContent='Choose an answer to see the explanation.';sats.querySelector('[data-sats-next]').textContent=current===satChallenges.length-1?'Start these examples again ↺':'Next example →';};render();sats.querySelector('[data-sats-next]').addEventListener('click',()=>{current=(current+1)%satChallenges.length;render();});}
const tx=document.querySelector('[data-transaction-game]');
if(tx){const selected=new Set();const render=()=>{const b=balanceTransaction([...selected]);tx.querySelector('[data-tx-input]').textContent=b.input.toLocaleString('en-US')+' sats';tx.querySelector('[data-tx-change]').textContent=b.funded?b.change.toLocaleString('en-US')+' sats':'—';tx.querySelector('[data-tx-feedback]').textContent=b.funded?`Balanced illustration: ${b.input.toLocaleString('en-US')} = 7,000 recipient + ${b.change.toLocaleString('en-US')} change + 500 fee. No transaction was created.`:`Need ${b.shortfall.toLocaleString('en-US')} more fictional sats to cover the recipient and fixed example fee.`;tx.querySelectorAll('[data-utxo]').forEach(b=>b.setAttribute('aria-pressed',String(selected.has(Number(b.dataset.utxo)))));};tx.querySelectorAll('[data-utxo]').forEach(button=>button.addEventListener('click',()=>{const n=Number(button.dataset.utxo);selected.has(n)?selected.delete(n):selected.add(n);render();}));tx.querySelector('[data-tx-reset]').addEventListener('click',()=>{selected.clear();render();});render();}
const signing=document.querySelector('[data-signing-game]');
if(signing){const selected=new Set();const render=()=>{const r=signingThreshold([...selected]);signing.querySelector('[data-signing-feedback]').textContent=`${r.count} of 3 selected. `+(r.met?'Threshold met in this counting model, assuming valid distinct signatures. Human authorization and recovery still need their own checks.':'Threshold not met. Two distinct valid signatures are required.');signing.querySelectorAll('[data-signer]').forEach(b=>b.setAttribute('aria-pressed',String(selected.has(b.dataset.signer))));};signing.querySelectorAll('[data-signer]').forEach(button=>button.addEventListener('click',()=>{const k=button.dataset.signer;selected.has(k)?selected.delete(k):selected.add(k);render();}));signing.querySelector('[data-signing-reset]').addEventListener('click',()=>{selected.clear();render();});render();}
const trust=document.querySelector('[data-trust-game]');
if(trust){let current=0;const feedback=trust.querySelector('[data-trust-feedback]');const render=()=>{trust.querySelector('[data-trust-question]').textContent=`${current+1} / ${trustChallenges.length} — ${trustChallenges[current].prompt}`;feedback.textContent='Choose a response to explore why.';trust.querySelectorAll('[data-trust-choice]').forEach(b=>b.setAttribute('aria-pressed','false'));trust.querySelector('[data-trust-next]').textContent=current===trustChallenges.length-1?'Start these situations again ↺':'Next situation →';};trust.querySelectorAll('[data-trust-choice]').forEach(button=>button.addEventListener('click',()=>{const c=trustChallenges[current];trust.querySelectorAll('[data-trust-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));feedback.textContent=(button.dataset.trustChoice===c.answer?'Good distinction. ':'Consider this: ')+c.explanation;}));trust.querySelector('[data-trust-next]').addEventListener('click',()=>{current=(current+1)%trustChallenges.length;render();});render();}
