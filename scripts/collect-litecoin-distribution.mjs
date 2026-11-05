import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildDistribution} from './lib/litecoin-distribution.mjs';

export const SOURCE = 'https://litecoinregister.com/ltc_data.json';
export async function collectDistribution({fetchImpl=fetch, now=()=>new Date().toISOString()}={}) {
  const response=await fetchImpl(SOURCE,{redirect:'error',signal:AbortSignal.timeout(7500),headers:{Accept:'application/json'}});
  if(!response.ok || response.redirected || !response.body || Number(response.headers.get('content-length')||0)>3000000) throw Error('register_source_unavailable');
  const chunks=[]; let length=0;
  for await (const chunk of response.body) {
    length+=chunk.byteLength;
    if(length>3000000) throw Error('register_source_too_large');
    chunks.push(chunk);
  }
  const bytes=Buffer.concat(chunks),collectedAt=now();
  const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(collectedAt));
  const record=buildDistribution(JSON.parse(bytes.toString('utf8')),{asOf,collectedAt,sourceSha256:createHash('sha256').update(bytes).digest('hex')});
  if(record.rows.some(row=>row.current>84000000)) throw Error('invalid_register_balance');
  return {bytes,record};
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=='--output' || !args[1] || args[1].startsWith('--')) throw Error('invalid_arguments');
  const {bytes,record}=await collectDistribution();
  await writeFile(path.resolve(args[1]),bytes,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({source:SOURCE,checkedAt:record.collectedAt,sourceSha256:record.sourceSha256,records:record.rows.length,published:false}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main().catch(()=>{console.error('Register collection withheld');process.exitCode=1;});
