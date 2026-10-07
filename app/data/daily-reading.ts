import type { LtcEdition } from './editions';

const prompts = [
 ['The network notebook.', 'Which observation has a genuinely new effective date?'],
 ['Read the record slowly.', 'What changed in the evidence—and what was only checked again?'],
 ['Meet the maintenance crew.', 'What work keeps an open system useful after its launch?'],
 ['Follow the dependencies.', 'Which issuer, network and bridge does a claim depend on?'],
 ['Make the first step useful.', 'What could a newcomer learn without making a transaction?'],
 ['Show your working.', 'Could another reader retrace your conclusion to its source?'],
 ['Bring it to the table.', 'Which explanation would make someone else’s next step easier?'],
];
export function dailyReading(date: string, storyCount: number) {
 const day=Math.floor(Date.parse(`${date}T12:00:00Z`)/86400000);
 if(!Number.isFinite(day)||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date) throw new Error('Invalid reading date');
 const index=((day%prompts.length)+prompts.length)%prompts.length;
 return {title:prompts[index][0],question:prompts[index][1],leadIndex:storyCount>0?((day%storyCount)+storyCount)%storyCount:0};
}
export type ObservationChange = {id:string;title:string;status:'new observation'|'changed value'|'unchanged observation'|'unavailable'|'reference only';detail:string};
// Compare saved facts, not retrieval times or page hashes. A repeated retrieval is not new reporting.
export function observationChanges(current: Pick<LtcEdition,'sources'>, previous?: Pick<LtcEdition,'sources'>): ObservationChange[] {
 const old=new Map(previous?.sources.map(source=>[source.id,source])??[]);
 const rows:ObservationChange[]=[];
 for(const source of current.sources){
  const prior=old.get(source.id);
  if(source.status==='unavailable'){rows.push({id:source.id,title:source.title,status:'unavailable',detail:'No accepted observation in this issue. Missing does not mean zero.'});continue;}
  if(!source.observations?.length){rows.push({id:source.id,title:source.title,status:'reference only',detail:'A reference check does not establish a newly measured fact.'});continue;}
  for(const observation of source.observations){
   const before=prior?.observations?.find(item=>item.metric===observation.metric);
   const changed=!!before&&(before.value!==observation.value||before.unit!==observation.unit||before.classification!==observation.classification);
   const status=changed?'changed value':!before||before.effectiveAt!==observation.effectiveAt||before.timePrecision!==observation.timePrecision?'new observation':'unchanged observation';
   rows.push({id:`${source.id}:${observation.metric}`,title:observation.label,status,detail:`Source effective ${observation.effectiveAt}${before?`; previous ${before.effectiveAt}`:''}. ${!previous?'No earlier published issue to compare.':status==='unchanged observation'?'Rechecked context, not new news.':status==='changed value'?'A recorded value or definition differs; no cause is inferred.':'A new source timestamp does not necessarily mean the value changed.'}`});
  }
 }
 for(const source of previous?.sources??[]) if(!current.sources.some(item=>item.id===source.id)) rows.push({id:`missing:${source.id}`,title:source.title,status:'unavailable',detail:'This source is absent from the current saved record; no continuity is assumed.'});
 return rows;
}
