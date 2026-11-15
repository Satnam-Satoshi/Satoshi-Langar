import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectEcosystemNews, ecosystemEventKey, ecosystemDate, validateEcosystemHistory } from './lib/ltc-ecosystem-news.mjs';
import { validateFlagshipRecord } from './lib/ltc-flagship-record.mjs';
export { collectEcosystemNews } from './lib/ltc-ecosystem-news.mjs';
export async function readEcosystemHistory({ reportDirectory='content/ltc-ecosystem', editionIndex='content/ltc/index.json', now=new Date().toISOString() }={}) {
  const date=ecosystemDate(now),previousReports=[],coveredEvents=[];
  async function files(directory){try{return(await readdir(directory)).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)&&name.slice(0,10)<date).sort().slice(-30);}catch(error){if(error.code==='ENOENT')return[];throw error;}}
  for(const name of await files(reportDirectory)){const record=JSON.parse(await readFile(path.join(reportDirectory,name),'utf8'));validateEcosystemHistory(record);if(record.date!==name.slice(0,10))throw Error('ecosystem_history_identity_mismatch');previousReports.push(record);}
  let editions=[];
  try{editions=JSON.parse(await readFile(editionIndex,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!Array.isArray(editions))throw Error('invalid_edition_history');
  for(const edition of editions.filter(e=>e.status==='published'&&e.date<date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30)){
    validateFlagshipRecord(edition);
    const record=edition.features;if(!record)continue;
    const used=new Set(record.stories.flatMap(story=>story.sourceIds));
    for(const source of record.sources.filter(source=>used.has(source.id)&&source.publishedAt)){
      try{coveredEvents.push(ecosystemEventKey(source.url,source.publishedAt));}catch{/* Relative/internal sources are not primary dated event identities. */}
    }
  }
  return{previousReports,coveredEvents:[...new Set(coveredEvents)]};
}
async function main(){
  const args=process.argv.slice(2),files={};
  for(let i=0;i<args.length;i+=2){if(!['--builders','--community','--policy','--output','--evidence-dir'].includes(args[i])||!args[i+1]||files[args[i]])throw Error('invalid_ecosystem_arguments');files[args[i]]=path.resolve(args[i+1]);}
  if(Object.keys(files).length!==5)throw Error('all_ecosystem_inputs_required');
  const relative=path.relative(process.cwd(),files['--evidence-dir']);if(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))throw Error('raw_evidence_must_be_outside_checkout');
  const json=async file=>JSON.parse(await readFile(file,'utf8'));const now=new Date().toISOString();
  const history=await readEcosystemHistory({now});await mkdir(files['--evidence-dir'],{mode:0o700});
  const report=await collectEcosystemNews({builders:await json(files['--builders']),community:await json(files['--community']),policyRecords:await json(files['--policy']),now,...history,onEvidence:async record=>{
    await writeFile(path.join(files['--evidence-dir'],record.name),record.bytes,{flag:'wx',mode:0o600});
    await writeFile(path.join(files['--evidence-dir'],record.name+'.receipt.json'),JSON.stringify({sourceId:record.sourceId,url:record.url,checkedAt:record.checkedAt,sha256:record.sha256,bytes:record.bytes.length})+'\n',{flag:'wx',mode:0o600});
  }});
  await writeFile(files['--output'],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({agent:report.agent,date:report.date,sources:report.sources.length,retrieved:report.sources.filter(s=>s.status==='retrieved').length,candidates:report.candidateEventIds.length,publicationPerformed:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Ecosystem research failed. No publication performed; retain partial evidence and do not blindly overwrite the run.');process.exitCode=1;});
