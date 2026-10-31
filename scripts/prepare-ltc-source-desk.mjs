import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateNewsroom} from './prepare-ltc-newsroom.mjs';
import {validateBuilderNews} from './collect-ltc-builder-news.mjs';

export function sourceDeskFromNewsroom(notebook,validate=validateNewsroom,builders=null) {
  validate(notebook);
  const stories=notebook.briefs.map(brief=>{
    const source=notebook.sources.find(item=>item.id===brief.sourceIds[0]);
    if(!source || source.status!=='collected' || !brief.effectiveAt || !source.checkedAt || !brief.paragraphs.length) throw Error('invalid_source_desk_input');
    // Only an adapter's dated event can supply a publication clock. Holdings,
    // sampled prices and undated page checks remain observations.
    const published=source.freshness==='dated-event' && source.observations?.some(item=>item.metric==='software_release' && item.classification==='upstream-release' && item.effectiveAt===brief.effectiveAt);
    return {id:brief.id,desk:brief.desk,title:brief.headline,publishedAt:brief.effectiveAt,observedAt:brief.effectiveAt,dateKind:published?'published':'observed',classification:published?'Dated upstream release':'Automated source observation',summary:brief.paragraphs[0],whyItMatters:brief.paragraphs[1]||'Read the source date and the observation limits.',url:source.url,sourceName:source.title,readMore:'/conversations/updates/#latest-update',checkedAt:source.checkedAt};
  });
  const gaps=[...notebook.coverageGaps,...notebook.intelligence.gaps];
  if(builders){validateBuilderNews(builders,{now:notebook.preparedAt});const builderStories=builders.sources.flatMap(source=>{gaps.push(...source.gaps.map(gap=>`${source.publisher}: ${gap}`));return source.stories.map(story=>({id:story.id,desk:'Litecoin / Builders',title:story.title.split(/\s+/).slice(0,25).join(' '),publishedAt:story.publishedAt,dateKind:'published',classification:(Date.parse(notebook.date)-Date.parse(story.publishedAt))/86400000>7?'Carry-forward historical context':'Attributed publisher announcement',summary:`${story.publisher} published this linked announcement on ${story.publishedAt}. This card identifies the publisher record; its underlying claims have not been independently verified.`,whyItMatters:'Read the original terms, product stage and dependencies before drawing conclusions.',url:story.url,sourceName:story.publisher,readMore:story.url,checkedAt:story.checkedAt}));});stories.push(...builderStories);}
  // Publication priority uses original source dates, never retrieval time.
  // Explicit index ties preserve adapter order and observations keep their order.
  const ordered=stories.map((story,index)=>({story,index})).sort((a,b)=>{
    const aPublished=a.story.dateKind==='published',bPublished=b.story.dateKind==='published';
    if(aPublished!==bPublished)return aPublished?-1:1;
    return aPublished?(Date.parse(b.story.publishedAt)-Date.parse(a.story.publishedAt)||a.index-b.index):a.index-b.index;
  }).map(item=>item.story);
  return {schemaVersion:1,id:`source-desk-${notebook.date}-r1`,checkedAt:notebook.preparedAt,byline:'AI Satoshi Ma · Automated source desk',scope:'Deterministic source-dated selections; publisher announcements remain attributed and observations retain their clocks. No independent human review is claimed.',generatedFrom:{id:notebook.id,sha256:notebook.sha256},stories:ordered,gaps:[...gaps,'This is a bounded source selection, not complete reporting or a full social feed.']};
}
async function optionalJson(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
export async function publishSourceDesk(notebook,{directory='content/ltc-newsroom-selections',validate=validateNewsroom,builders=null}={}) {
  const record=sourceDeskFromNewsroom(notebook,validate,builders);
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
async function main(){const args=process.argv.slice(2);if(![3,5].includes(args.length)||args[0]!=='--notebook'||args.at(-1)!=='--apply'||(args.length===5&&args[2]!=='--builders'))throw Error('Use --notebook VALIDATED_NOTEBOOK [--builders SNAPSHOT] --apply');console.log(JSON.stringify(await publishSourceDesk(JSON.parse(await readFile(args[1],'utf8')),{builders:args.length===5?JSON.parse(await readFile(args[3],'utf8')):null})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Source desk preparation withheld');process.exitCode=1;});
