import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateNewsroom} from './prepare-ltc-newsroom.mjs';

export function sourceDeskFromNewsroom(notebook,validate=validateNewsroom) {
  validate(notebook);
  const stories=notebook.briefs.map(brief=>{
    const source=notebook.sources.find(item=>item.id===brief.sourceIds[0]);
    if(!source || source.status!=='collected' || !brief.effectiveAt || !source.checkedAt || !brief.paragraphs.length) throw Error('invalid_source_desk_input');
    return {id:brief.id,desk:brief.desk,title:brief.headline,publishedAt:brief.effectiveAt,observedAt:brief.effectiveAt,dateKind:'observed',classification:'Automated source observation',summary:brief.paragraphs[0],whyItMatters:brief.paragraphs[1]||'Read the source date and the observation limits.',url:source.url,sourceName:source.title,readMore:'/conversations/updates/#latest-update',checkedAt:source.checkedAt};
  });
  return {schemaVersion:1,id:`source-desk-${notebook.date}-r1`,checkedAt:notebook.preparedAt,byline:'AI Satoshi Ma · Automated source desk',scope:'Deterministic selection from the validated observation notebook; original observation and check dates retained. No independently reviewed reporting or new article research is implied.',generatedFrom:{id:notebook.id,sha256:notebook.sha256},stories,gaps:[...notebook.coverageGaps,...notebook.intelligence.gaps,'This selection covers only the existing validated notebook adapters. Curated reporting, project announcements and social-account searches are not automatically refreshed.']};
}
async function optionalJson(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
export async function publishSourceDesk(notebook,{directory='content/ltc-newsroom-selections',validate=validateNewsroom}={}) {
  const record=sourceDeskFromNewsroom(notebook,validate);
  await mkdir(directory,{recursive:true});
  const pointer=path.join(directory,'latest.json'),dated=path.join(directory,`${record.id}.json`);
  const latest=await optionalJson(pointer);
  // A dated curated or generated scan is immutable for the day. Never silently
  // replace a human-authorized selection or move a pointer backwards.
  const localDate=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  if(latest && localDate(latest.checkedAt)>=notebook.date)return {status:'unchanged',id:latest.id};
  const existing=await optionalJson(dated);
  if(existing){
    if(existing.id!==record.id)throw Error('source_desk_identity_mismatch');
    await writeFile(pointer,JSON.stringify(existing,null,2)+'\n');
    return {status:'restored-pointer',id:existing.id};
  }
  const text=JSON.stringify(record,null,2)+'\n';
  await writeFile(dated,text,{flag:'wx'});await writeFile(pointer,text);
  return {status:'prepared',id:record.id};
}
async function main(){const args=process.argv.slice(2);if(args.length!==3||args[0]!=='--notebook'||args[2]!=='--apply')throw Error('Use --notebook VALIDATED_NOTEBOOK --apply');console.log(JSON.stringify(await publishSourceDesk(JSON.parse(await readFile(args[1],'utf8')))));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Source desk preparation withheld');process.exitCode=1;});
