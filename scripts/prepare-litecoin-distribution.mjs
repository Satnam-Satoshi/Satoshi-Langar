import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {editionDate} from './prepare-ltc-edition.mjs';
import {buildDistribution} from './lib/litecoin-distribution.mjs';
export {buildDistribution} from './lib/litecoin-distribution.mjs';
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
