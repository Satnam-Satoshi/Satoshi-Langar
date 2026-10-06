export const paths = {
  learn: {title:'Learn Bitcoin', task:'Complete a lesson and explain one idea in your own words.', href:'sikh-bitcoin/', output:'A short explanation and one question', subject:'Sikh Bitcoin: lesson feedback'},
  langar: {title:'Serve with Langar', task:'Use the kitchen planning kit to describe one local need without identifying guests.', href:'langar/', output:'An anonymized service proposal', subject:'Langar: service proposal'},
  kalakar: {title:'Create with Kalakar.x', task:'Prepare a small creative brief with authorship, permission and payment expectations.', href:'kalakar/', output:'A creative brief, with no wallet secrets', subject:'Kalakar.x: creative proposal'},
  ltc: {title:'Help the LTC newsroom', task:'Check one dated primary source and separate its facts from your interpretation.', href:'conversations/', output:'A source note or correction with a date and link', subject:'LTC: source review'},
  meetups: {title:'Plan a Bitcoin meetup', task:'Draft an accessible gathering plan with a responsible host and an unconfirmed venue.', href:'meetups/', output:'A proposal, not a confirmed event listing', subject:'Meetups: host proposal'},
  build: {title:'Build open tools', task:'Read the contributor guide and reproduce one small issue or propose a focused improvement.', href:'technology/', output:'A reproducible issue or draft pull request', subject:'Engineering: first contribution'},
  agents: {title:'Contribute with an agent', task:'Describe one bounded task, its human owner, permissions, evidence and stop condition.', href:'agents/', output:'An agent charter and reviewable sample', subject:'Agent Sangat: bounded task proposal'},
  partners: {title:'Collaborate as a team', task:'Propose one small open collaboration and identify the human responsible for review.', href:'partners/', output:'A scoped collaboration proposal', subject:'Collaboration: open project proposal'},
  treasury: {title:'Research sovereignty', task:'Trace one public custody, collateral or protocol claim back to its original dated source using the evidence worksheet.', href:'treasury/', output:'An evidence-backed claim review; no transactions', subject:'Treasury: research contribution'},
  research: {title:'Research community tools', task:'Compare a community need with a proposed tool and document who bears the risks.', href:'crypto-kitty/', output:'A research note with assumptions and open questions', subject:'Research: community tools'},
};
export function normalizePath(value) {
  const aliases={education:'learn',magazine:'ltc',general:'learn'};
  const key=aliases[value] || value;
  return Object.hasOwn(paths,key) ? key : 'learn';
}
export function createPlan(input, now=new Date()) {
  const path=normalizePath(input.path);
  const time=['15 minutes','45 minutes','2 hours'].includes(input.time)?input.time:'15 minutes';
  const note=String(input.note||'').trim().slice(0,1200);
  return {version:1,path,time,note,createdAt:now.toISOString()};
}
export function planText(plan) {
  const p=paths[normalizePath(plan.path)];
  return `# My first Satnam Satoshi contribution\n\nPath: ${p.title}\nTime: ${plan.time}\nPrepared: ${plan.createdAt.slice(0,10)}\n\nFirst step: ${p.task}\n\nEvidence: ${p.output}\n\nMy idea:\n${plan.note || '(Add your idea here.)'}\n\nThis is a personal draft, not a submitted application or accepted assignment.\nKeep personal details, beneficiary records, credentials and wallet secrets out of public posts.\n`;
}
export function issueUrl(plan) {
  const url=new URL('https://github.com/Satnam-Satoshi/Satoshi-Langar/issues/new');
  url.searchParams.set('title',paths[normalizePath(plan.path)].subject);
  url.searchParams.set('body',planText(plan));
  return url.href;
}
export const providerNames={google:'Google',github:'GitHub',apple:'Apple',facebook:'Facebook'};
// These settings are public. A saved release must not lose sign-in on the next
// daily magazine build; an explicit environment override remains the stop switch.
export function resolveAuthConfig(saved, env={}) {
  const input={...saved};
  if(Object.hasOwn(env,'COMMUNITY_AUTH_ENABLED')) {
    if(!['true','false'].includes(env.COMMUNITY_AUTH_ENABLED))throw new Error('COMMUNITY_AUTH_ENABLED must be true or false.');
    input.enabled=env.COMMUNITY_AUTH_ENABLED==='true';
  }
  for(const [key,name] of Object.entries({url:'COMMUNITY_AUTH_URL',publishableKey:'COMMUNITY_AUTH_PUBLISHABLE_KEY',siteOrigin:'COMMUNITY_SITE_ORIGIN',privacyEmail:'COMMUNITY_PRIVACY_EMAIL'}))if(Object.hasOwn(env,name))input[key]=env[name];
  if(Object.hasOwn(env,'COMMUNITY_AUTH_PROVIDERS'))input.providers=env.COMMUNITY_AUTH_PROVIDERS.split(',').filter(Boolean);
  return validateAuthConfig(input);
}
export function validateAuthConfig(input) {
  if(!input || input.enabled!==true) return {enabled:false,providers:[]};
  const auth=new URL(input.url), site=new URL(input.siteOrigin);
  if(auth.protocol!=='https:' || site.protocol!=='https:' || auth.username || auth.password || site.username || site.password || auth.pathname!=='/' || auth.search || auth.hash || site.pathname!=='/' || site.search || site.hash) throw new Error('Authentication requires exact HTTPS origins.');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(input.publishableKey)) throw new Error('Use a public Supabase publishable key, never a secret or service-role key.');
  const providers=[...new Set(input.providers)];
  if(!providers.length || providers.some(p=>!Object.hasOwn(providerNames,p))) throw new Error('Choose supported, tested identity providers.');
  if(typeof input.privacyEmail!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.privacyEmail)) throw new Error('A monitored privacy contact is required before accounts open.');
  return {enabled:true,url:auth.origin,siteOrigin:site.origin,publishableKey:input.publishableKey,providers,privacyEmail:input.privacyEmail};
}
