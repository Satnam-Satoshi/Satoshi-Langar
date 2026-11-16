// Read-only, bounded source retrieval. No publisher imports, credentials or effects.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const allowedHosts=new Set(["aibc.world", "api.github.com", "blog.digitalasset.com", "canaryetfs.com", "canton.foundation", "docs.litvm.com", "explorer.testnet.liteforge.zeeve.net", "f2pool.io", "github.com", "greywick.digital", "investor.litestrategy.com", "litecoin.com", "litecoinregister.com", "litestrategy.gcs-web.com", "luxxfolio.com", "luxxpool.luxxlabs.ca", "strike.me", "testnet.litvm.com", "website-prod.nadex.com", "www.binance.com", "www.cftc.gov", "www.dtcc.com", "www.fidelitydigitalassets.com", "www.grayscale.com", "www.lithiumlend.com", "www.litvm.com"]);
const digest=b=>createHash('sha256').update(b).digest('hex');
export function validateRegistry(registry){
 if(registry?.schemaVersion!==1||registry.generation!=='cloud-newsroom-v2'||!Array.isArray(registry.sources)||registry.sources.length>100)throw Error('invalid_registry');
 const ids=new Set();for(const source of registry.sources){const u=new URL(source.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!/^[a-z0-9.-]+$/.test(u.hostname)||!allowedHosts.has(u.hostname)||ids.has(source.id)||!source.id)throw Error('invalid_source');ids.add(source.id);}return registry;
}
export async function scanSource(source,{fetchImpl=fetch,now=()=>new Date().toISOString(),maximumBytes=2_000_000}={}){
 const checkedAt=now();try{
  // No automatic redirects: each new destination must be independently reviewed.
  const r=await fetchImpl(source.url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'LTC-Newsroom-v2-research/0.1','Accept':'text/html,application/json,text/plain,application/xml'}});
  if(r.status>=300&&r.status<400)return {sourceId:source.id,url:source.url,checkedAt,status:'redirect-needs-review',httpStatus:r.status};
  if(!r.ok)return{sourceId:source.id,url:source.url,checkedAt,status:'unavailable',httpStatus:r.status};
  const type=r.headers.get('content-type')??'';if(!/text\/|application\/(json|xml)/i.test(type))return{sourceId:source.id,url:source.url,checkedAt,status:'unsupported-media'};
  let total=0;const chunks=[];for await(const chunk of r.body){total+=chunk.length;if(total>maximumBytes)throw Error('size_limit');chunks.push(Buffer.from(chunk));}
  const body=Buffer.concat(chunks);return{sourceId:source.id,url:source.url,checkedAt,status:'retrieved-uninterpreted',httpStatus:r.status,contentType:type,bytes:total,sha256:digest(body),sourceEffectiveAt:null,publishableClaim:false};
 }catch(e){return{sourceId:source.id,url:source.url,checkedAt,status:'unavailable',reason:e.message==='size_limit'?'size-limit':'fetch-failed'};}
}
export async function scanRegistry(registry,options={}){validateRegistry(registry);const observations=[];for(let i=0;i<registry.sources.length;i+=4)observations.push(...await Promise.all(registry.sources.slice(i,i+4).map(s=>scanSource(s,options))));return{schemaVersion:1,generation:'cloud-newsroom-v2',mode:'read-only-source-scan',registrySha256:digest(JSON.stringify(registry)),sourceBaseline:registry.sourceBaseline,checkedAt:(options.now??(()=>new Date().toISOString()))(),observations,coverage:{attempted:observations.length,retrieved:observations.filter(x=>x.status==='retrieved-uninterpreted').length,gaps:observations.filter(x=>x.status!=='retrieved-uninterpreted').map(x=>({sourceId:x.sourceId,status:x.status})),scopeLimit:registry.coverageLimit},publication:{performed:false,reason:'Raw retrieval is not verified editorial evidence; no production adapter installed'}};}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--output')throw Error('usage: --output NEW_DIRECTORY');const out=path.resolve(args[1]);if(!out.startsWith(path.resolve(process.env.RUNNER_TEMP??'/tmp')+path.sep))throw Error('output_must_be_new_runner_temp_directory');await mkdir(out,{recursive:false});const registry=JSON.parse(await readFile(new URL('../config/cloud-newsroom-v2-sources.json',import.meta.url),'utf8'));const result=await scanRegistry(registry);await writeFile(path.join(out,'coverage.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode:result.mode,coverage:result.coverage,publication:result.publication}));}
