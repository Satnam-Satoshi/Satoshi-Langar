// Evidence only, never authority. Native owner approval remains mandatory.
import {createHash} from 'node:crypto';
const repo='Satnam-Satoshi/Satoshi-Langar',marker='ltc-f33-local-stop-v1';
const check=(v,c)=>{if(!v)throw Error('f33_stop_'+c);};
const sha=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const hash=v=>createHash('sha256').update(v).digest('hex');
const keys=['schema','runId','attempt','jobId','workflowSha','sourceSha','observedAt','observationSha256','scheduler','schedulerDisabled','publisherProcesses','otherKnownDirectWriters','ownerMaintainsStop'].sort();
export function selectStopAttestation({comments,config:c,admission:a,now}){
 check(Array.isArray(comments)&&comments.length<=299&&Number.isFinite(now),'input');
 check(a.runId===c.runId&&Number.isSafeInteger(a.productionJobId)&&a.productionJobId>0&&Number.isFinite(a.productionJobStartedAt)&&a.productionJobStartedAt<=now&&Number.isFinite(a.stopStepStartedAt)&&a.stopStepStartedAt>=a.productionJobStartedAt&&a.stopStepStartedAt<=now,'job');
 const matches=[];
 for(const comment of comments){
  if(comment.user?.id!==268053325||comment.user.type!=='User')continue;
  if(typeof comment.body!=='string'||!comment.body.includes(marker))continue;
  let b;try{b=JSON.parse(comment.body);}catch{throw Error('f33_stop_malformed');}
  if(b.schema!==marker||b.runId!==c.runId)continue;
  matches.push({comment,b});
 }
 check(matches.length<=1,'duplicate');if(!matches.length)return null;
 const {comment:q,b}=matches[0];
 check(Object.keys(b).sort().join('|')===keys.join('|')&&q.body===JSON.stringify(b)&&q.body.length<=2048,'schema');
 check(q.user?.id===268053325&&q.user.type==='User'&&Number.isSafeInteger(q.id)&&q.id>0,'principal');
 check(q.created_at===q.updated_at&&typeof q.created_at==='string','edited');
 const created=Date.parse(q.created_at);
 check(Number.isFinite(created)&&created>=a.stopStepStartedAt&&created<=now,'created');
 check(b.attempt===1&&b.jobId===String(a.productionJobId)&&b.workflowSha===c.workflowSha&&b.sourceSha===c.sourceSha&&sha(b.workflowSha,40)&&sha(b.sourceSha,40),'binding');
 check(Number.isSafeInteger(b.observedAt)&&b.observedAt>=a.stopStepStartedAt&&b.observedAt<=now&&now-b.observedAt<300000&&b.observedAt<created+1000,'fresh');
 check(b.scheduler==='satnam-satoshi-foundation-and-launch-follow-up'&&b.schedulerDisabled===true&&b.publisherProcesses===0&&b.otherKnownDirectWriters===0&&b.ownerMaintainsStop===true&&sha(b.observationSha256,64),'stop');
 const localMaintenance=Object.fromEntries(['scheduler','schedulerDisabled','publisherProcesses','otherKnownDirectWriters','ownerMaintainsStop','observationSha256','observedAt'].map(k=>[k,b[k]]));
 return Object.freeze({commentId:q.id,bodySha256:hash(q.body),localMaintenance:Object.freeze(localMaintenance)});
}
export function createStopAttestationReader({config,readAdmission,token,fetchImpl=fetch,clock=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),timeoutMs=10000}){
 const c=Object.freeze({...config});check(typeof token==='string'&&token.length>0&&typeof readAdmission==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=10000,'config');
 async function page(number){
  const controller=new AbortController();let timer,reader;
  try{return await Promise.race([(async()=>{
   const r=await fetchImpl(`https://api.github.com/repos/${repo}/issues/153/comments?per_page=100&page=${number}`,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{accept:'application/vnd.github+json'}});
   check(r.status===200&&!r.redirected&&/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')??''),'response');reader=r.body?.getReader();check(reader,'body');let bytes=0;const chunks=[];
   for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'timeout');if(done)break;bytes+=value.length;check(bytes<=524288,'size');chunks.push(Buffer.from(value));}
   const rows=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));check(Array.isArray(rows)&&rows.length<=100,'page');return rows;
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);})]);}
  catch{throw Error('f33_stop_read_unconfirmed');}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 async function read(){const start=clock(),a=await readAdmission(),comments=[];
  for(let n=1;n<=3;n++){const rows=await page(n);comments.push(...rows);check(clock()>=start&&clock()-start<30000,'read_window');if(rows.length<100)return selectStopAttestation({comments,config:c,admission:a,now:clock()});check(n<3,'pagination');}
 }
 return Object.freeze({read,async wait(){const start=clock();for(;;){check(clock()>=start&&clock()-start<600000,'wait_expired');const p=await read();check(clock()>=start&&clock()-start<600000,'wait_expired');if(p)return p;await sleep(15000);}},async revalidate(expected){const p=await read();check(p&&p.commentId===expected.commentId&&p.bodySha256===expected.bodySha256&&JSON.stringify(p.localMaintenance)===JSON.stringify(expected.localMaintenance),'changed');return p;}});
}
// Await evidence read before each mutation; the existing synchronous provider
// authority/barrier callback still checks expiry at the actual network send.
export function withStopRevalidation(factory,revalidate,revoke){return async options=>{check(typeof revoke==='function','revoke');const p=await factory(options);const verify=async()=>{try{await revalidate();}catch{revoke();throw Error('f33_stop_revoked');}};return Object.freeze({...p,async reserveReceipt(...args){await verify();return p.reserveReceipt(...args);},async compareAndSwap(...args){await verify();return p.compareAndSwap(...args);},async finishReceipt(...args){await verify();return p.finishReceipt(...args);}});};}
