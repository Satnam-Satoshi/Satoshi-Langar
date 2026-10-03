import {createClient} from '@supabase/supabase-js';
import {validateAuthConfig} from '../community-core.mjs';
const root=document.querySelector('[data-community-auth]');
const status=root.querySelector('[data-auth-status]');
const buttons=[...root.querySelectorAll('[data-provider]')];
const consent=root.querySelector('[data-auth-consent]');
let client;
const responseParams=new URL(location.href).searchParams;
if(root.dataset.callback==='true') history.replaceState(null,'',location.pathname);
async function start(){
  let config;
  try {const res=await fetch(new URL(root.dataset.config,location.href),{credentials:'omit'});if(!res.ok)throw new Error();config=validateAuthConfig(await res.json());}
  catch {status.textContent='Account service could not be loaded. Guest learning and contribution plans still work.';return;}
  if(!config.enabled){status.textContent='Community accounts are being configured. You can start learning and prepare a contribution without signing in.';return;}
  if(location.origin!==config.siteOrigin){status.textContent='Sign-in is available only on our configured community website. Your local draft stays on this browser.';const a=document.createElement('a');a.href=config.siteOrigin+'/sign-in/';a.textContent='Open community sign-in →';status.after(a);return;}
  try {sessionStorage.setItem('satnam-auth-storage-test','1');sessionStorage.removeItem('satnam-auth-storage-test');}
  catch {status.textContent='Sign-in needs session storage in this tab. Enable it or continue as a guest.';return;}
  client=createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',storage:sessionStorage,storageKey:'satnam-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const contact=root.querySelector('[data-privacy-contact]');if(contact){contact.href='mailto:'+config.privacyEmail;contact.textContent=config.privacyEmail;contact.hidden=false;}
  const params=responseParams;
  const code=params.get('code');
  if(params.has('error') || params.has('error_code')){history.replaceState(null,'',location.pathname);status.textContent='Sign-in was canceled or declined. Nothing was submitted. You can try again or continue as a guest.';return;}
  if(root.dataset.callback==='true'){
    history.replaceState(null,'',location.pathname);
    if(!code){status.textContent='No sign-in response was received. Start again from the sign-in page in this same tab.';return;}
    const {error}=await client.auth.exchangeCodeForSession(code);
    if(error){status.textContent='The sign-in link expired or belongs to a different browser tab. Please start again in this tab.';return;}
  }
  const {data:{user},error}=await client.auth.getUser();
  if(user && !error){
    status.textContent='Signed in'+(user.email?' as '+user.email:'')+'. Your contribution plan and lesson progress are still stored only on this device.';
    buttons.forEach(b=>b.hidden=true);if(consent)consent.closest('label').hidden=true;
    const signout=root.querySelector('[data-sign-out]');if(signout){signout.hidden=false;signout.addEventListener('click',async()=>{signout.disabled=true;const {error:failure}=await client.auth.signOut({scope:'local'});if(failure){status.textContent='Sign-out could not finish. Please try again.';signout.disabled=false;return;}location.assign(new URL(root.dataset.signIn,location.href));});}
    return;
  }
  if(root.dataset.callback==='true'){status.textContent='We could not verify your account session. Return to sign-in and try again in this tab.';return;}
  status.textContent='Choose a provider. It may ask you to sign in and approve sharing your basic profile and email. No wallet is needed.';
  const update=()=>buttons.forEach(b=>{b.disabled=!(consent?.checked&&config.providers.includes(b.dataset.provider));});
  consent?.addEventListener('change',update);update();
  for(const b of buttons){if(!config.providers.includes(b.dataset.provider)){b.textContent+=' · not yet available';continue;}
    b.addEventListener('click',async()=>{buttons.forEach(x=>x.disabled=true);status.textContent='Opening your identity provider…';try{const {data,error}=await client.auth.signInWithOAuth({provider:b.dataset.provider,options:{redirectTo:config.siteOrigin+'/auth/callback/index.html',skipBrowserRedirect:true}});if(error||!data.url)throw new Error();const next=new URL(data.url);if(next.origin!==config.url || next.pathname!=='/auth/v1/authorize')throw new Error();location.assign(next.href);}catch{status.textContent='Sign-in could not start. Try again or continue as a guest.';update();}});
  }
}
start().catch(()=>{status.textContent='The account service is unavailable. Please try again later or continue as a guest.';});
