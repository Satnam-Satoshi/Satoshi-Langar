import {createHash} from 'node:crypto';
import {buildDistribution} from './litecoin-distribution.mjs';
export const registerSource='https://litecoinregister.com/ltc_data.json';
export async function registerResponse(request,{fetchImpl=fetch,now=()=>new Date().toISOString()}={}){
 const headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(new URL(request.url).search)return new Response(null,{status:400,headers});
 try{
 const response=await fetchImpl(registerSource,{redirect:'error',signal:AbortSignal.timeout(7500),headers:{Accept:'application/json'}});
 if(!response.ok||response.redirected||Number(response.headers.get('content-length')||0)>3000000||!response.body)throw Error('Source unavailable');
 let length=0;const chunks=[];for await(const chunk of response.body){length+=chunk.byteLength;if(length>3000000)throw Error('Source too large');chunks.push(chunk);}
 const bytes=Buffer.concat(chunks),collectedAt=now();const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(collectedAt));
 const record=buildDistribution(JSON.parse(bytes.toString('utf8')),{asOf,collectedAt,sourceSha256:createHash('sha256').update(bytes).digest('hex')});
 if(record.rows.some(row=>row.current>84000000)||record.rows.length>1000)throw Error('Invalid register');
 const result={schemaVersion:1,source:registerSource,checkedAt:collectedAt,asOf,baselineDate:record.baselineDate,total:record.total,records:record.rows.length,missingNumericalRecords:record.missingNumericalRecords,method:record.method,license:record.license,rows:record.rows.slice(0,10).map(({id,name,current,observedAt,baseline,change})=>({id,name,current,observedAt,baseline,change}))};
 return new Response(request.method==='HEAD'?null:JSON.stringify(result),{headers:{...headers,'Cache-Control':'public, max-age=0, s-maxage=300'}});
 }catch{return new Response(request.method==='HEAD'?null:JSON.stringify({schemaVersion:1,status:'unavailable',source:registerSource,checkedAt:now()}),{status:503,headers});}
}
