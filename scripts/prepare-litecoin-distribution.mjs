import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {editionDate} from './prepare-ltc-edition.mjs';
const SOURCE='https://litecoinregister.com/ltc_data.json';
const method='Last observation on or before each cutoff; carry forward across missing days. Missing baseline is null, not zero. Secondary register classifications; no independent wallet, liability or issuer audit. Observed balance changes are not net inflows or purchases. Potential overlapping custody and protocol records prevent a unique-coin census.';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d).toISOString().slice(0,10)===d;
export function buildDistribution(raw,{asOf,collectedAt,sourceSha256}){
 if(!validDate(asOf)||editionDate(collectedAt)!==asOf||!/^[a-f0-9]{64}$/.test(sourceSha256)||!raw||Array.isArray(raw)||Object.keys(raw).length>1000)throw Error('Invalid dated source');
 const baselineDate=new Date(Date.parse(asOf)-30*86400000).toISOString().slice(0,10);
 const entries=Object.entries(raw);if(!entries.length)throw Error('Empty register');
 for(const [id,e] of entries){if(!/^[a-z0-9_-]+$/.test(id)||!['name','sector','subsector','region'].every(k=>typeof e[k]==='string'&&e[k].length<300)||!Array.isArray(e.events)||e.events.some(v=>!Array.isArray(v)||v.length!==2||!validDate(v[0])))throw Error('Invalid entity');}
 const observation=(e,date)=>e.events.filter(([d,v])=>d<=date&&typeof v==='number'&&Number.isFinite(v)&&v>=0).sort((a,b)=>b[0].localeCompare(a[0]))[0]??null;
 const rows=entries.flatMap(([id,e])=>{const a=observation(e,asOf),b=observation(e,baselineDate);return a?[{id,name:e.name,sector:e.sector,type:e.subsector,region:e.region,current:a[1],observedAt:a[0],baseline:b?.[1]??null,baselineObservedAt:b?.[0]??null,change:b?a[1]-b[1]:null,profile:`https://litecoinregister.com/profile/${id}/`}]:[]}).sort((a,b)=>b.current-a.current);
 if(!rows.length)throw Error('No eligible numerical records');
 const sectors=[...new Set(rows.map(r=>r.sector))].sort().map(name=>{const rr=rows.filter(r=>r.sector===name);return {name,current:rr.reduce((s,r)=>s+r.current,0),change:rr.reduce((s,r)=>s+(r.change??0),0),missingBaseline:rr.filter(r=>r.baseline===null).length,holders:rr.length};});
 const series=Array.from({length:31},(_,i)=>{const date=new Date(Date.parse(baselineDate)+i*86400000).toISOString().slice(0,10);const records=entries.map(([,e])=>observation(e,date)).filter(Boolean);return {date,value:records.reduce((s,r)=>s+r[1],0),holders:records.length};});
 const total=rows.reduce((s,r)=>s+r.current,0);if(Math.abs(series.at(-1).value-total)>1e-6)throw Error('Unreconciled series');
 return {schemaVersion:1,asOf,baselineDate,collectedAt,source:SOURCE,sourceSha256,license:'CC BY 4.0',total,sectors,series,rows,method,sourceRecordCount:entries.length,missingNumericalRecords:entries.length-rows.length};
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==3||args[0]!=='--snapshot'||args[2]!=='--publish')throw Error('Use --snapshot PRIVATE_RAW_SOURCE --publish');
 const bytes=await readFile(args[1]);if(bytes.length>3000000)throw Error('Source too large');
 const collectedAt=new Date().toISOString(),asOf=editionDate(collectedAt),sourceSha256=createHash('sha256').update(bytes).digest('hex');
 const record=buildDistribution(JSON.parse(bytes),{asOf,collectedAt,sourceSha256}),stamp=asOf.replaceAll('-',''),text=JSON.stringify(record,null,2)+'\n';
 // A dated derivative is immutable. A later same-day check must not overwrite it.
 const dated=`content/research/litecoin-distribution-${stamp}.json`;
 let prior;try{prior=await readFile(dated,'utf8')}catch(e){if(e.code!=='ENOENT')throw e;}
 if(prior){if(await readFile(`public/data/litecoin-distribution-${stamp}.json`,'utf8')!==prior)throw Error('Existing derivative mismatch');const latest=JSON.parse(await readFile('content/research/litecoin-distribution-latest.json','utf8'));if(latest.asOf!==asOf)throw Error('Existing latest pointer mismatch');console.log(JSON.stringify({asOf,status:'already-recorded',deployed:false}));return;}
 await writeFile(dated,text,{flag:'wx'});await writeFile(`public/data/litecoin-distribution-${stamp}.json`,text,{flag:'wx'});await writeFile('content/research/litecoin-distribution-latest.json',text);
 console.log(JSON.stringify({asOf,baseline:record.baselineDate,trackedLTC:record.total,records:record.rows.length,deployed:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
