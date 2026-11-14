const repo='Satnam-Satoshi/Satoshi-Langar';
const check=(v,c)=>{if(!v)throw Error('receipt_inventory_'+c);};
export function createPriorBootstrapInventoryReader({config,token,fetchImpl=fetch,clock=Date.now,timeoutMs=10000}){
 check(config?.workflowPath==='.github/workflows/receipt-bootstrap-once.yml'&&/^[1-9][0-9]{0,19}$/.test(config.runId??'')&&typeof token==='string'&&token.length>0&&typeof fetchImpl==='function'&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=30000,'config');
 const c=Object.freeze({...config}),fetcher=fetchImpl;
 async function get(suffix){
  const controller=new AbortController();let timer,reader;
  try{
   const pending=(async()=>{const response=await fetcher(`https://api.github.com/repos/${repo}/${suffix}`,{method:'GET',redirect:'error',cache:'no-store',signal:controller.signal,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json'}});
    check(response.status===200&&!response.redirected,'response');check(/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''),'type');
    reader=response.body?.getReader();check(reader,'body');let size=0;const chunks=[];
    for(;;){const {done,value}=await reader.read();check(!controller.signal.aborted,'timeout');if(done)break;size+=value.byteLength;check(size<=131072,'size');chunks.push(Buffer.from(value));}
    const bytes=Buffer.concat(chunks),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);return JSON.parse(text);
   })();
   return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},timeoutMs);})]);
  }catch{throw Error('bootstrap_github_read_unconfirmed');}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
 }
 return async()=>{
  const observedAt=clock();check(Number.isFinite(observedAt),'clock');
  const endpoint='actions/workflows/receipt-bootstrap-once.yml/runs?event=workflow_dispatch&per_page=100';
  const list=await get(endpoint);
  check(Number.isInteger(list?.total_count)&&list.total_count>0&&list.total_count<=100&&Array.isArray(list.workflow_runs)&&list.workflow_runs.length===list.total_count,'incomplete');
  const ids=list.workflow_runs.map(r=>r.id);check(ids.every(Number.isSafeInteger)&&new Set(ids).size===ids.length,'ids');
  const runs=[];
  for(const id of ids){const run=await get(`actions/runs/${id}`);check(run.id===id,'identity');const jobs=String(id)===c.runId?undefined:await get(`actions/runs/${id}/attempts/1/jobs?per_page=100`);runs.push({run,...(jobs?{jobs}:{})});check(clock()-observedAt<30000,'stale');}
  const again=await get(endpoint);check(again.total_count===list.total_count&&Array.isArray(again.workflow_runs)&&JSON.stringify(again.workflow_runs.map(r=>r.id).sort())===JSON.stringify([...ids].sort()),'inventory_changed');
  const ended=clock();check(Number.isFinite(ended)&&ended>=observedAt&&ended-observedAt<30000,'stale');
  return {observedAt,total_count:list.total_count,runs};
 };
}
