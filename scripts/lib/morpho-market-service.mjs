import { intelligenceRequests, normalizeMorpho, readBoundedResponse } from './ltc-intelligence.mjs';
const ENDPOINT='https://api.morpho.org/graphql';
function response(body,status,method,cache=false){return new Response(method==='HEAD'?null:JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','vercel-cdn-cache-control':cache?'public, max-age=60':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'GET, HEAD'}:{})}});}
export async function morphoMarketsResponse(request,{fetcher=fetch,clock=Date.now,timeoutMs=4000}={}){
 if(!['GET','HEAD'].includes(request.method))return response({status:'unavailable',reason:'method_not_allowed'},405,request.method);
 if(new URL(request.url).search)return response({status:'unavailable',reason:'query_not_supported'},400,request.method);
 const c=new AbortController();let timer;
 try{
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{c.abort();reject(Error('timeout'));},timeoutMs);});
  const raw=await Promise.race([(async()=>{
   const fixed=intelligenceRequests(new Date(clock()).toISOString()).find(r=>r.id==='morpho-verified-markets');
   if(fixed.url!==ENDPOINT||fixed.method!=='POST')throw Error('source_configuration');
   const r=await fetcher(ENDPOINT,{method:'POST',body:fixed.body,redirect:'error',cache:'no-store',signal:c.signal,headers:{'content-type':'application/json',accept:'application/json'}});
   if(!r.ok||r.redirected)throw Error('source');return JSON.parse(await readBoundedResponse(r,100_000));
  })(),deadline]);
  const checkedAt=new Date(clock()).toISOString();const markets=normalizeMorpho(raw,{now:checkedAt});
  const fresh=markets.filter(m=>m.status==='fresh').length;
  return response({schemaVersion:1,status:fresh===4?'fresh':fresh?'partial':'unavailable',source:'Morpho GraphQL',checkedAt,maximumStateAgeSeconds:900,maximumFetchAgeSeconds:180,refreshAfterSeconds:120,markets},200,request.method,fresh===4);
 }catch{return response({schemaVersion:1,status:'unavailable',source:'Morpho GraphQL',checkedAt:new Date(clock()).toISOString(),reason:'source_unavailable'},503,request.method);}
 finally{clearTimeout(timer);c.abort();}
}
